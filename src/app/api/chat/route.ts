import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  Tool,
} from "@google/generative-ai";
import { db } from "@/db";
import { quotes, transactions, dollarRates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { searchNews, getMarketNews, NewsArticle } from "@/lib/news/finnhub";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Tool definitions for Gemini
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "search_stock_news",
        description:
          "Busca noticias recientes sobre una acción o ticker específico. Usa esta herramienta cuando el usuario pregunte sobre una empresa o acción específica.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticker: {
              type: SchemaType.STRING,
              description:
                "El símbolo del ticker (ej: AAPL, MSFT, GOOGL, TSLA, YPF, GGAL)",
            },
          },
          required: ["ticker"],
        },
      },
      {
        name: "get_market_news",
        description:
          "Obtiene noticias generales del mercado financiero. Usa esta herramienta cuando el usuario pregunte sobre el mercado en general, tendencias, o la situación económica.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            category: {
              type: SchemaType.STRING,
              format: "enum",
              description:
                "Categoría de noticias: 'general' para mercado general, 'crypto' para criptomonedas",
              enum: ["general", "crypto"],
            },
          },
          required: ["category"],
        },
      },
    ],
  },
];

// Function to format news for display
function formatNewsResult(news: NewsArticle[], source: string): string {
  if (news.length === 0) {
    return `No se encontraron noticias recientes para ${source}.`;
  }

  const formatted = news
    .map((n, i) => {
      const date = new Date(n.datetime * 1000).toLocaleDateString("es-AR");
      return `${i + 1}. [${n.headline}](${n.url}) (${date})\n   Fuente: ${n.source}\n   ${n.summary?.slice(0, 150) || ""}...`;
    })
    .join("\n\n");

  return formatted;
}

// Execute tool calls
async function executeToolCall(
  functionName: string,
  args: Record<string, string>
): Promise<string> {
  console.log(`[TOOL] Ejecutando: ${functionName}`, args);

  if (functionName === "search_stock_news") {
    const ticker = args.ticker?.toUpperCase();
    console.log(`[TOOL] Buscando noticias para ticker: ${ticker}`);
    const news = await searchNews(ticker);
    console.log(`[TOOL] ${ticker}: ${news.length} noticias encontradas`);
    return formatNewsResult(news, ticker);
  }

  if (functionName === "get_market_news") {
    const category = args.category || "general";
    console.log(`[TOOL] Buscando noticias de: ${category}`);
    const news = await getMarketNews(category);
    console.log(`[TOOL] ${category}: ${news.length} noticias encontradas`);
    return formatNewsResult(
      news,
      category === "crypto" ? "Crypto" : "Mercado General"
    );
  }

  return "Herramienta no encontrada";
}

async function getPortfolioContext(userId: string) {
  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: { asset: true },
    orderBy: [desc(transactions.date)],
  });

  const holdingsMap: Record<
    string,
    {
      ticker: string;
      name: string;
      type: string;
      currency: string;
      quantity: number;
      totalCost: number;
      currentPrice: number | null;
    }
  > = {};

  for (const tx of userTransactions) {
    const key = `${tx.asset.ticker}-${tx.asset.type}`;
    if (!holdingsMap[key]) {
      const [latestQuote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.assetId, tx.assetId))
        .orderBy(desc(quotes.date))
        .limit(1);

      holdingsMap[key] = {
        ticker: tx.asset.ticker,
        name: tx.asset.name,
        type: tx.asset.type,
        currency: tx.asset.currency,
        quantity: 0,
        totalCost: 0,
        currentPrice: latestQuote ? Number(latestQuote.price) : null,
      };
    }

    const qty = Number(tx.quantity);
    const price = Number(tx.unitPrice);

    if (tx.type === "buy") {
      holdingsMap[key].quantity += qty;
      holdingsMap[key].totalCost += qty * price;
    } else {
      holdingsMap[key].quantity -= qty;
    }
  }

  const holdings = Object.values(holdingsMap).filter((h) => h.quantity > 0);

  const rates = await db.query.dollarRates.findMany({
    orderBy: [desc(dollarRates.date)],
    limit: 4,
  });

  const latestRates: Record<string, number> = {};
  for (const rate of rates) {
    if (!latestRates[rate.type]) {
      latestRates[rate.type] = Number(rate.sellPrice);
    }
  }

  return {
    holdings,
    dollarRates: latestRates,
    transactionCount: userTransactions.length,
  };
}

function buildSystemPrompt(
  portfolioContext: Awaited<ReturnType<typeof getPortfolioContext>>
) {
  const holdingsText =
    portfolioContext.holdings.length > 0
      ? portfolioContext.holdings
          .map((h) => {
            const avgCost = h.totalCost / h.quantity;
            const pnl = h.currentPrice
              ? (((h.currentPrice - avgCost) / avgCost) * 100).toFixed(1)
              : null;
            return `- ${h.ticker} (${h.type}): ${h.quantity.toFixed(4)} unidades | Costo prom: ${h.currency} ${avgCost.toFixed(2)} | Precio actual: ${h.currentPrice ? `${h.currency} ${h.currentPrice}` : "N/A"} | P&L: ${pnl ? `${pnl}%` : "N/A"}`;
          })
          .join("\n")
      : "El usuario no tiene posiciones activas.";

  const dollarRatesText =
    Object.entries(portfolioContext.dollarRates)
      .map(([type, rate]) => `- ${type}: $${rate}`)
      .join("\n") || "No disponibles";

  return `Sos un asesor financiero experto especializado en el mercado argentino e inversiones internacionales.

PORTFOLIO DEL USUARIO:
${holdingsText}

Cotizaciones del dólar:
${dollarRatesText}

Transacciones históricas: ${portfolioContext.transactionCount}

HERRAMIENTAS DISPONIBLES:
- search_stock_news: Buscar noticias de un ticker específico (ej: AAPL, TSLA, YPF)
- get_market_news: Obtener noticias del mercado general o crypto

INSTRUCCIONES:
1. SIEMPRE usa las herramientas para buscar noticias cuando el usuario pregunte sobre acciones o el mercado
2. Cuando menciones noticias, INCLUÍ los links en formato markdown [título](url) para que el usuario pueda leerlas
3. Sé DIRECTO con recomendaciones: COMPRAR 🟢, VENDER 🔴, o MANTENER 🟡
4. Formato de recomendación:

📊 **[TICKER]** - [COMPRAR/VENDER/MANTENER]
**Por qué**: [2-3 razones, citando noticias con links]
**Riesgos**: [1-2 riesgos]
**Horizonte**: [corto/mediano/largo plazo]

5. Para CEDEARs, considerá el tipo de cambio
6. Respondé siempre en español, sé conciso
7. Al final, aclarás brevemente que la decisión final es del usuario`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages } = (await req.json()) as { messages: Message[] };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Get portfolio context
    const portfolioContext = await getPortfolioContext(session.user.id);
    const systemPrompt = buildSystemPrompt(portfolioContext);

    // Build chat history for Gemini
    const chatHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: msg.content }],
    }));

    // Initialize Gemini model with tools
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      tools: tools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      },
    });

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    console.log("[CHAT] Enviando mensaje:", lastUserMessage);

    // Send message and handle tool calls
    let response = await chat.sendMessage(lastUserMessage);
    let responseText = "";
    const usedTools: string[] = [];

    // Loop to handle multiple tool calls
    while (true) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts || [];

      // Check for function calls
      const functionCalls = parts.filter((part) => part.functionCall);

      if (functionCalls.length === 0) {
        // No more function calls, get the text response
        responseText = parts
          .filter((part) => part.text)
          .map((part) => part.text)
          .join("");
        break;
      }

      // Execute function calls
      const functionResponses = [];
      for (const part of functionCalls) {
        if (part.functionCall) {
          const { name, args } = part.functionCall;
          console.log(`[CHAT] Tool call: ${name}`, args);
          usedTools.push(name);

          const result = await executeToolCall(
            name,
            args as Record<string, string>
          );

          functionResponses.push({
            functionResponse: {
              name: name,
              response: { result },
            },
          });
        }
      }

      // Send function responses back to the model
      response = await chat.sendMessage(functionResponses);
    }

    console.log("[CHAT] Tools usados:", usedTools);
    console.log("[CHAT] Respuesta generada, longitud:", responseText.length);

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send tools info first
          if (usedTools.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ newsSources: usedTools })}\n\n`
              )
            );
          }

          // Send response in chunks for streaming effect
          const chunkSize = 20;
          for (let i = 0; i < responseText.length; i += chunkSize) {
            const chunk = responseText.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
            // Small delay for streaming effect
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[CHAT] Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);

    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 429
    ) {
      return new Response(
        JSON.stringify({
          error: "Demasiadas solicitudes. Esperá unos segundos.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Error al generar respuesta." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
