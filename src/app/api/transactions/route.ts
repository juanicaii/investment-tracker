import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createTransactionSchema = z.object({
  assetId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  fee: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [result] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        assetId: parsed.data.assetId,
        date: parsed.data.date,
        type: parsed.data.type,
        quantity: String(parsed.data.quantity),
        unitPrice: String(parsed.data.unitPrice),
        fee: String(parsed.data.fee ?? 0),
        notes: parsed.data.notes,
      })
      .returning({ id: transactions.id });

    return NextResponse.json({ id: result.id, success: true });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db.query.transactions.findMany({
      where: eq(transactions.userId, session.user.id),
      with: { asset: true },
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [result] = await db
      .update(transactions)
      .set({
        assetId: parsed.data.assetId,
        date: parsed.data.date,
        type: parsed.data.type,
        quantity: String(parsed.data.quantity),
        unitPrice: String(parsed.data.unitPrice),
        fee: String(parsed.data.fee ?? 0),
        notes: parsed.data.notes,
      })
      .where(eq(transactions.id, id))
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    });

    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
