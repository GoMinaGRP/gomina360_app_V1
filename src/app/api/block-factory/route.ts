import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  blockFactoryLogs,
  blockFactoryOrders,
  blockFactoryDeliveries,
  blockFactoryChecklists,
  inventoryItems,
  transactions,
  businesses,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = Number(searchParams.get("businessId"));
    if (!businessId) {
      return NextResponse.json({ success: false, error: "businessId required" }, { status: 400 });
    }

    const [production, orders, deliveries, inventory, checklists] = await Promise.all([
      db.select().from(blockFactoryLogs).where(eq(blockFactoryLogs.businessId, businessId)),
      db.select().from(blockFactoryOrders).where(eq(blockFactoryOrders.businessId, businessId)),
      db.select().from(blockFactoryDeliveries).where(eq(blockFactoryDeliveries.businessId, businessId)),
      db.select().from(inventoryItems).where(eq(inventoryItems.businessId, businessId)),
      db.select().from(blockFactoryChecklists).where(eq(blockFactoryChecklists.businessId, businessId)),
    ]);

    return NextResponse.json({
      success: true,
      production: production.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      orders: orders.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      deliveries: deliveries.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      inventory,
      checklists: checklists.sort((a: any, b: any) => (a.id || 0) - (b.id || 0)),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, data } = body;
    const businessId = Number(data?.businessId);
    if (!entity || !businessId) {
      return NextResponse.json({ success: false, error: "entity and businessId required" }, { status: 400 });
    }

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    const branchCode = data.branchCode || biz?.code || null;
    const branchName = data.branchName || biz?.name || null;
    const today = new Date().toISOString().split("T")[0];

    if (entity === "PRODUCTION") {
      const blocksMolded = Number(data.blocksMolded) || 0;
      const blocksBroken = Number(data.blocksBroken) || 0;
      const goodBlocks = Math.max(0, blocksMolded - blocksBroken);
      const blockType = data.blockType || "6-INCH-SOLID";
      const [row] = await db.insert(blockFactoryLogs).values({
        businessId,
        batchId: data.batchId || `BLK-PROD-${Date.now().toString().slice(-5)}`,
        blockType,
        bagsCementUsed: Number(data.bagsCementUsed) || 0,
        blocksMolded,
        blocksBroken,
        qualityGrade: data.qualityGrade || "GRADE_A_STANDARD",
        recordedDate: data.recordedDate || today,
      }).returning();

      // Increase finished block inventory if an inventory SKU matches block type
      const inv = await db.select().from(inventoryItems).where(eq(inventoryItems.businessId, businessId));
      const target = inv.find((i: any) => i.sku?.includes("BLK") && i.name?.toUpperCase().includes(blockType.split("-")[0]));
      if (target) {
        const newQty = (target.quantity || 0) + goodBlocks;
        await db.update(inventoryItems).set({
          quantity: newQty,
          status: newQty <= 0 ? "OUT_OF_STOCK" : newQty <= target.minStockThreshold ? "LOW_STOCK" : "IN_STOCK",
        }).where(eq(inventoryItems.id, target.id));
      }

      return NextResponse.json({ success: true, item: row });
    }

    if (entity === "ORDER") {
      const qty = Number(data.quantity) || 0;
      const price = Number(data.unitPriceGhs) || 0;
      const [row] = await db.insert(blockFactoryOrders).values({
        businessId, branchCode,
        orderNumber: data.orderNumber || `ORD-BLK-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        customerName: data.customerName || "Walk-in Customer",
        customerPhone: data.customerPhone || null,
        blockType: data.blockType || "6-INCH-SOLID",
        quantity: qty,
        unitPriceGhs: price,
        totalGhs: qty * price,
        status: data.status || "PENDING",
        dueDate: data.dueDate || null,
        notes: data.notes || null,
        createdByName: data.createdByName || "Block Factory User",
        createdByRole: data.createdByRole || null,
      }).returning();
      return NextResponse.json({ success: true, item: row });
    }

    if (entity === "DELIVERY") {
      const [row] = await db.insert(blockFactoryDeliveries).values({
        businessId, branchCode,
        deliveryNumber: data.deliveryNumber || `DLV-BLK-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        orderNumber: data.orderNumber || null,
        customerName: data.customerName || "Customer",
        blockType: data.blockType || null,
        quantity: Number(data.quantity) || 0,
        vehicleNumber: data.vehicleNumber || null,
        driverName: data.driverName || null,
        status: data.status || "SCHEDULED",
        deliveryDate: data.deliveryDate || today,
        notes: data.notes || null,
        createdByName: data.createdByName || "Block Factory User",
      }).returning();
      return NextResponse.json({ success: true, item: row });
    }

    if (entity === "EXPENSE") {
      const trxNum = `TRX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const [row] = await db.insert(transactions).values({
        transactionNumber: trxNum,
        businessId,
        branchCode,
        branchName,
        type: "EXPENSE",
        category: data.category || "BLOCK_FACTORY_EXPENSE",
        amountGhs: Number(data.amountGhs) || 0,
        paymentMethod: data.paymentMethod || "CASH",
        description: data.description || "Block factory expense",
        date: data.date || today,
        createdAt: new Date(),
        status: "COMPLETED",
        recordedBy: data.recordedBy || "Block Factory User",
        recordedByRole: data.recordedByRole || null,
        recordedByUserId: data.recordedByUserId ? Number(data.recordedByUserId) : null,
      }).returning();
      return NextResponse.json({ success: true, item: row });
    }

    // ── CHECKLIST (create a day's task list; idempotent per business+branch+date) ──
    if (entity === "CHECKLIST") {
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const targetDate = data.checklistDate || today;
      const existing = await db
        .select()
        .from(blockFactoryChecklists)
        .where(
          and(
            eq(blockFactoryChecklists.businessId, businessId),
            eq(blockFactoryChecklists.branchCode, branchCode),
            eq(blockFactoryChecklists.checklistDate, targetDate),
          ),
        );
      if (existing.length > 0) {
        return NextResponse.json({ success: true, items: existing, alreadyExists: true });
      }
      const rows = [];
      for (const t of tasks) {
        const [row] = await db
          .insert(blockFactoryChecklists)
          .values({
            businessId,
            branchCode,
            checklistDate: data.checklistDate || today,
            taskKey: t.taskKey,
            taskLabel: t.taskLabel,
            category: t.category || "GENERAL",
            isCompleted: false,
            notes: t.notes || null,
          })
          .returning();
        rows.push(row);
      }
      return NextResponse.json({ success: true, items: rows });
    }

    // ── RESTOCK (receive purchased materials/finished goods) ───────
    // Increments the inventory item, refreshes its stock status and — when a
    // cost is provided — books the purchase as an EXPENSE transaction so the
    // finance module, command center and reports all update automatically.
    if (entity === "RESTOCK") {
      const inventoryId = Number(data.inventoryId);
      if (!inventoryId) {
        return NextResponse.json({ success: false, error: "inventoryId is required" }, { status: 400 });
      }
      const qty = Number(data.quantity) || 0;
      if (qty <= 0) {
        return NextResponse.json({ success: false, error: "quantity must be greater than 0" }, { status: 400 });
      }
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, inventoryId));
      if (!item || item.businessId !== businessId) {
        return NextResponse.json({ success: false, error: "Inventory item not found for this branch" }, { status: 404 });
      }

      const newQty = (item.quantity || 0) + qty;
      const newStatus =
        newQty <= 0 ? "OUT_OF_STOCK" : newQty <= item.minStockThreshold ? "LOW_STOCK" : "IN_STOCK";
      const [updated] = await db
        .update(inventoryItems)
        .set({ quantity: newQty, status: newStatus })
        .where(eq(inventoryItems.id, inventoryId))
        .returning();

      let expenseRow = null;
      const totalCost = Number(data.totalCostGhs) || 0;
      if (data.recordExpense && totalCost > 0) {
        const trxNum = `TRX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        [expenseRow] = await db
          .insert(transactions)
          .values({
            transactionNumber: trxNum,
            businessId,
            branchCode,
            branchName,
            type: "EXPENSE",
            category: data.category || "Stock Purchase",
            amountGhs: totalCost,
            paymentMethod: data.paymentMethod || "CASH",
            description: data.description || `Restock: ${qty}× ${item.name} (${item.sku})`,
            date: data.date || today,
            createdAt: new Date(),
            status: "COMPLETED",
            recordedBy: data.recordedBy || "Block Factory User",
            recordedByRole: data.recordedByRole || null,
            recordedByUserId: data.recordedByUserId ? Number(data.recordedByUserId) : null,
          })
          .returning();
      }

      return NextResponse.json({ success: true, item: updated, expense: expenseRow });
    }

    return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/block-factory
 * Toggle a daily checklist task completed/uncompleted.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, id, data } = body;

    if (entity === "CHECKLIST" && id) {
      const [existing] = await db
        .select()
        .from(blockFactoryChecklists)
        .where(eq(blockFactoryChecklists.id, Number(id)));
      if (!existing) {
        return NextResponse.json({ success: false, error: "Checklist task not found" }, { status: 404 });
      }
      const nowCompleted = !existing.isCompleted;
      const [row] = await db
        .update(blockFactoryChecklists)
        .set({
          isCompleted: nowCompleted,
          completedByName: nowCompleted ? data?.completedByName || "Staff" : null,
          completedByRole: nowCompleted ? data?.completedByRole || null : null,
          completedAt: nowCompleted ? new Date() : null,
        })
        .where(eq(blockFactoryChecklists.id, Number(id)))
        .returning();
      return NextResponse.json({ success: true, item: row });
    }

    return NextResponse.json({ success: false, error: "Unknown entity" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
