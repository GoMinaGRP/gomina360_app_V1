import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, businessMetrics } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(businesses).orderBy(businesses.id);
    return NextResponse.json({ success: true, businesses: rows });
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
      name,
      code,
      category,
      branchLocation,
      region,
      district,
      town,
      managerName,
      contactPhone,
      initialCapitalGhs,
      monthlyTargetRevenueGhs,
      iconName,
    } = body;

    // Standardized Ghana location: Region → District/MMDA → Town.
    // branchLocation is a derived human-readable summary line.
    const derivedBranchLocation =
      branchLocation ||
      [town, district].filter(Boolean).join(", ") ||
      region ||
      "Accra, Ghana";

    const [newBiz] = await db
      .insert(businesses)
      .values({
        name: name || "New Enterprise Unit",
        code:
          code ||
          `BIZ-${Math.floor(100 + Math.random() * 900)}`,
        category: category || "Other",
        branchLocation: derivedBranchLocation,
        region: region || "Greater Accra",
        district: district || null,
        town: town || null,
        managerName: managerName || "Assigned Manager",
        contactPhone: contactPhone || "+233 24 000 0000",
        status: "ACTIVE",
        initialCapitalGhs: Number(initialCapitalGhs) || 100000,
        monthlyTargetRevenueGhs: Number(monthlyTargetRevenueGhs) || 50000,
        iconName: iconName || "Building2",
      })
      .returning();

    // Automatically create initial Q1 metrics for new business
    await db.insert(businessMetrics).values({
      businessId: newBiz.id,
      period: "2026-Q1",
      revenueGhs: 45000,
      expensesGhs: 29000,
      netProfitGhs: 16000,
      roiPercent: 16.0,
      cashFlowGhs: 11000,
      assetsValueGhs: Number(initialCapitalGhs) || 100000,
      inventoryValueGhs: 18000,
      growthRatePercent: 10.0,
      riskScore: 25,
    });

    return NextResponse.json({ success: true, business: newBiz });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
