import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";

interface CSVRow {
  date: string;
  ticker: string;
  type: string;
  quantity: string;
  unit_price: string;
  fee?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    // Expected columns: date,ticker,type,quantity,unit_price,fee,notes
    const errors: string[] = [];
    let imported = 0;

    for (const [idx, row] of records.entries()) {
      const rowNum = idx + 2; // +2 because of header row and 1-based indexing

      try {
        // Validate required fields
        if (!row.date || !row.ticker || !row.type || !row.quantity || !row.unit_price) {
          errors.push(`Row ${rowNum}: Missing required fields`);
          continue;
        }

        // Validate type
        if (row.type !== "buy" && row.type !== "sell") {
          errors.push(`Row ${rowNum}: Invalid type "${row.type}" (must be "buy" or "sell")`);
          continue;
        }

        // Find asset
        const asset = await db.query.assets.findFirst({
          where: eq(assets.ticker, row.ticker.toUpperCase()),
        });

        if (!asset) {
          errors.push(`Row ${rowNum}: Asset "${row.ticker}" not found`);
          continue;
        }

        // Parse numbers
        const quantity = parseFloat(row.quantity);
        const unitPrice = parseFloat(row.unit_price);
        const fee = parseFloat(row.fee || "0");

        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${rowNum}: Invalid quantity`);
          continue;
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
          errors.push(`Row ${rowNum}: Invalid unit price`);
          continue;
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.date)) {
          errors.push(`Row ${rowNum}: Invalid date format (use YYYY-MM-DD)`);
          continue;
        }

        await db.insert(transactions).values({
          userId: session.user.id,
          assetId: asset.id,
          date: row.date,
          type: row.type,
          quantity: String(quantity),
          unitPrice: String(unitPrice),
          fee: String(fee),
          notes: row.notes || null,
        });

        imported++;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${message}`);
      }
    }

    return NextResponse.json({
      imported,
      total: records.length,
      errors,
      success: errors.length === 0,
    });
  } catch (error) {
    console.error("Failed to import CSV:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV file" },
      { status: 500 }
    );
  }
}
