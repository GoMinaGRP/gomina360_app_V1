import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  poultryLogs,
  blockFactoryLogs,
  aquacultureLogs,
  livestockLogs,
  restaurantLogs,
  electronicsLogs,
  carWashLogs,
  businesses,
  transactions,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { stockOut } from "@/lib/stock";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessCode: string }> }
) {
  try {
    const { businessCode } = await params;
    const upperCode = businessCode.toUpperCase();

    if (upperCode.startsWith("POULTRY")) {
      const rows = await db.select().from(poultryLogs).orderBy(desc(poultryLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("BLOCK")) {
      const rows = await db.select().from(blockFactoryLogs).orderBy(desc(blockFactoryLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("AQUA")) {
      const rows = await db.select().from(aquacultureLogs).orderBy(desc(aquacultureLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("LIVESTOCK")) {
      const rows = await db.select().from(livestockLogs).orderBy(desc(livestockLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("FOOD")) {
      const rows = await db.select().from(restaurantLogs).orderBy(desc(restaurantLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("TECH")) {
      const rows = await db.select().from(electronicsLogs).orderBy(desc(electronicsLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }
    if (upperCode.startsWith("WASH")) {
      const rows = await db.select().from(carWashLogs).orderBy(desc(carWashLogs.id));
      return NextResponse.json({ success: true, logs: rows });
    }

    return NextResponse.json(
      { success: false, error: `Unknown business code: ${upperCode}` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessCode: string }> }
) {
  try {
    const { businessCode } = await params;
    const upperCode = businessCode.toUpperCase();
    const body = await request.json();

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.code, upperCode));

    if (!biz) {
      return NextResponse.json(
        { success: false, error: "Business not found" },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    if (upperCode.startsWith("POULTRY")) {
      const [inserted] = await db
        .insert(poultryLogs)
        .values({
          businessId: biz.id,
          batchNumber: body.batchNumber || `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          birdType: body.birdType || "LAYERS",
          totalBirds: Number(body.totalBirds) || 3000,
          dailyEggsTrays: Number(body.dailyEggsTrays) || 100,
          feedConsumedKg: Number(body.feedConsumedKg) || 350,
          mortalityCount: Number(body.mortalityCount) || 0,
          healthStatus: body.healthStatus || "HEALTHY",
          recordedDate: today,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("BLOCK")) {
      const [inserted] = await db
        .insert(blockFactoryLogs)
        .values({
          businessId: biz.id,
          batchId: body.batchId || `BLK-PROD-${Math.floor(100 + Math.random() * 900)}`,
          blockType: body.blockType || "6-INCH-SOLID",
          bagsCementUsed: Number(body.bagsCementUsed) || 50,
          blocksMolded: Number(body.blocksMolded) || 1500,
          blocksBroken: Number(body.blocksBroken) || 8,
          qualityGrade: body.qualityGrade || "GRADE_A_STANDARD",
          recordedDate: today,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("AQUA")) {
      const [inserted] = await db
        .insert(aquacultureLogs)
        .values({
          businessId: biz.id,
          pondId: body.pondId || `CAGE-${Math.floor(10 + Math.random() * 90)}`,
          species: body.species || "VOLTA_TILAPIA",
          stockCount: Number(body.stockCount) || 5000,
          averageWeightGrams: Number(body.averageWeightGrams) || 750,
          phLevel: Number(body.phLevel) || 7.2,
          dissolvedOxygen: Number(body.dissolvedOxygen) || 6.5,
          fcr: Number(body.fcr) || 1.32,
          recordedDate: today,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("LIVESTOCK")) {
      const [inserted] = await db
        .insert(livestockLogs)
        .values({
          businessId: biz.id,
          tagNumber: body.tagNumber || `GH-TAG-${Math.floor(100 + Math.random() * 900)}`,
          animalType: body.animalType || "CATTLE",
          breed: body.breed || "SANGA",
          weightKg: Number(body.weightKg) || 380,
          vaccinationStatus: body.vaccinationStatus || "UP_TO_DATE",
          pregnantStatus: Boolean(body.pregnantStatus),
          recordedDate: today,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("FOOD")) {
      const [inserted] = await db
        .insert(restaurantLogs)
        .values({
          businessId: biz.id,
          shiftDate: today,
          totalOrders: Number(body.totalOrders) || 120,
          mostPopularDish: body.mostPopularDish || "Jollof Rice with Tilapia",
          foodCostPercent: Number(body.foodCostPercent) || 27.5,
          wastePercent: Number(body.wastePercent) || 2.5,
          momoReceiptsGhs: Number(body.momoReceiptsGhs) || 4500,
          cashReceiptsGhs: Number(body.cashReceiptsGhs) || 2100,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("TECH")) {
      const [inserted] = await db
        .insert(electronicsLogs)
        .values({
          businessId: biz.id,
          serialNumber: body.serialNumber || `SN-ELC-${Math.floor(10000 + Math.random() * 90000)}`,
          productName: body.productName || "5kVA Solar Hybrid Inverter",
          brand: body.brand || "Felicity Solar",
          warrantyMonths: Number(body.warrantyMonths) || 24,
          inStock: Boolean(body.inStock ?? true),
          retailPriceGhs: Number(body.retailPriceGhs) || 9500,
          lastCheckedDate: today,
        })
        .returning();
      return NextResponse.json({ success: true, log: inserted });
    }

    if (upperCode.startsWith("WASH")) {
      const [inserted] = await db
        .insert(carWashLogs)
        .values({
          businessId: biz.id,
          shiftDate: today,
          vehiclesWashed: Number(body.vehiclesWashed) || 40,
          chemicalUsedLiters: Number(body.chemicalUsedLiters) || 12.0,
          totalRevenueGhs: Number(body.totalRevenueGhs) || 2200,
          waterPressurePsi: Number(body.waterPressurePsi) || 3200,
          recordedDate: today,
        })
        .returning();

      // ── Finance linkage: wash revenue flows into Transactions so the
      // branch's revenue / profit / dashboards update immediately ──
      if ((inserted.totalRevenueGhs || 0) > 0) {
        await db.insert(transactions).values({
          transactionNumber: `TRX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          businessId: biz.id,
          branchCode: biz.code,
          branchName: biz.name,
          type: "INCOME",
          category: "CAR_WASH_REVENUE",
          amountGhs: inserted.totalRevenueGhs,
          paymentMethod: body.paymentMethod || "CASH",
          description: `Auto Wash shift ${inserted.shiftDate}: ${inserted.vehiclesWashed} vehicles washed`,
          date: today,
          createdAt: new Date(),
          status: "COMPLETED",
          recordedBy: body.recordedBy || body.createdByName || "Auto Wash Supervisor",
          recordedByRole: body.recordedByRole || body.createdByRole || null,
          recordedByUserId: body.recordedByUserId ? Number(body.recordedByUserId) : null,
        }).catch((e) => console.error("wash revenue txn warning:", e));
      }

      // ── Stock linkage: shampoo / chemical consumption deducts stock ──
      // Targets the seeded 50L chemical drum (liters ÷ 50 = drums); falls
      // back to a liters-priced shampoo product if the branch stocks one.
      if ((inserted.chemicalUsedLiters || 0) > 0) {
        try {
          let out = await stockOut({
            businessId: biz.id,
            sku: "WASH-CHEM-50L",
            quantity: Number((inserted.chemicalUsedLiters / 50).toFixed(2)),
          });
          if (!out.deducted) {
            out = await stockOut({
              businessId: biz.id,
              name: "Car Wash Shampoo (Liters)",
              quantity: inserted.chemicalUsedLiters,
            });
          }
        } catch (e) {
          console.error("wash chemical stock warning:", e);
        }
      }

      return NextResponse.json({ success: true, log: inserted });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported business log category" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST log error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
