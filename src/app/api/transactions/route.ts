import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, businesses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get("businessId");

    if (businessIdParam && businessIdParam !== "ALL") {
      const bId = parseInt(businessIdParam, 10);
      if (!isNaN(bId)) {
        const results = await db
          .select()
          .from(transactions)
          .where(eq(transactions.businessId, bId))
          .orderBy(desc(transactions.id));
        return NextResponse.json({ success: true, transactions: results });
      }
    }

    const allTrx = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.id));
    return NextResponse.json({ success: true, transactions: allTrx });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      businessId,
      type,
      category,
      amountGhs,
      paymentMethod,
      description,
      recordedBy,
      recordedByRole,
      recordedByUserId,
      customerId,
      supplierId,
      status,
      branchCode,
      branchName,
    } = body;

    const now = new Date();
    const trxNum = `TRX-${now.getFullYear()}-${now.getTime().toString().slice(-6)}`;
    const dateStr = now.toISOString().split("T")[0];

    // Auto-resolve branch details from business if not provided
    let resolvedBranchCode = branchCode || null;
    let resolvedBranchName = branchName || null;
    if (!resolvedBranchCode && businessId) {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, Number(businessId)));
      if (biz) {
        resolvedBranchCode = biz.code;
        resolvedBranchName = biz.name;
      }
    }

    const [newTrx] = await db
      .insert(transactions)
      .values({
        transactionNumber: trxNum,
        businessId: Number(businessId),
        branchCode: resolvedBranchCode,
        branchName: resolvedBranchName,
        type: type || "INCOME",
        category: category || "General Sales",
        amountGhs: Number(amountGhs) || 0,
        paymentMethod: paymentMethod || "MTN_MOMO",
        customerId: customerId ? Number(customerId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
        description: description || "Transaction logged in GoMina 360",
        date: dateStr,
        createdAt: now,
        status: status || "COMPLETED",
        recordedBy: recordedBy || "Command Center User",
        recordedByRole: recordedByRole || null,
        recordedByUserId: recordedByUserId ? Number(recordedByUserId) : null,
        receiptImage: body?.receiptImage || null,
        receiptImages: body?.receiptImages || null,
      })
      .returning();

    return NextResponse.json({ success: true, transaction: newTrx });
  } catch (error: any) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
