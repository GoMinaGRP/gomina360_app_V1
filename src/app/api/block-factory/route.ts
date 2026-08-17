import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  blockFactoryLogs,
  blockFactoryOrders,
  blockFactoryDeliveries,
  blockFactoryChecklists,
  blockTypes,
  inventoryItems,
  transactions,
  businesses,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Original factory block types — master list seeds with exactly these keys so
// all existing production records, orders and filters stay unchanged.
const DEFAULT_BLOCK_TYPES = [
  { typeKey: "6-INCH-SOLID", name: "6-Inch Solid Blocks", dimensions: "6in x 9in x 18in", style: "SOLID" },
  { typeKey: "6-INCH-HOLLOW", name: "6-Inch Hollow Blocks", dimensions: "6in x 8in x 16in", style: "HOLLOW" },
  { typeKey: "5-INCH-SOLID", name: "5-Inch Solid Blocks", dimensions: "5in x 6in x 16in", style: "SOLID" },
  { typeKey: "PAVING-BRICKS", name: "Paving Bricks", dimensions: "4in x 8in pavers", style: "PAVING" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = Number(searchParams.get("businessId"));
    if (!businessId) {
      return NextResponse.json({ success: false, error: "businessId required" }, { status: 400 });
    }

    const [production, orders, deliveries, inventory, checklists, existingTypes] = await Promise.all([
      db.select().from(blockFactoryLogs).where(eq(blockFactoryLogs.businessId, businessId)),
      db.select().from(blockFactoryOrders).where(eq(blockFactoryOrders.businessId, businessId)),
      db.select().from(blockFactoryDeliveries).where(eq(blockFactoryDeliveries.businessId, businessId)),
      db.select().from(inventoryItems).where(eq(inventoryItems.businessId, businessId)),
      db.select().from(blockFactoryChecklists).where(eq(blockFactoryChecklists.businessId, businessId)),
      db.select().from(blockTypes).where(eq(blockTypes.businessId, businessId)),
    ]);

    // Seed the block type master list once with the factory's original types
    let types = existingTypes;
    if (types.length === 0) {
      for (const t of DEFAULT_BLOCK_TYPES) {
        const [row] = await db.insert(blockTypes).values({ businessId, ...t }).returning();
        types.push(row);
      }
    }

    return NextResponse.json({
      success: true,
      production: production.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      orders: orders.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      deliveries: deliveries.sort((a: any, b: any) => (b.id || 0) - (a.id || 0)),
      inventory,
      checklists: checklists.sort((a: any, b: any) => (a.id || 0) - (b.id || 0)),
      blockTypes: types.sort((a: any, b: any) => (a.id || 0) - (b.id || 0)),
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

    // ── BLOCK_TYPE (extend the block production master list) ──────────
    if (entity === "BLOCK_TYPE") {
      const rawName = String(data.name || data.typeKey || "").trim();
      if (!rawName) {
        return NextResponse.json({ success: false, error: "Block type name is required" }, { status: 400 });
      }
      const typeKey = String(data.typeKey || rawName)
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9&-]/g, "");
      if (!typeKey) {
        return NextResponse.json({ success: false, error: "Enter a valid block type name" }, { status: 400 });
      }

      // Make sure the master list exists (seeded) before duplicate-checking
      let existing = await db.select().from(blockTypes).where(eq(blockTypes.businessId, businessId));
      if (existing.length === 0) {
        for (const t of DEFAULT_BLOCK_TYPES) {
          const [seeded] = await db.insert(blockTypes).values({ businessId, ...t }).returning();
          existing.push(seeded);
        }
      }
      if (existing.some((t: any) => String(t.typeKey).toUpperCase() === typeKey)) {
        return NextResponse.json(
          { success: false, error: `"${typeKey}" is already in the block type master list` },
          { status: 409 },
        );
      }

      const upper = (rawName + " " + (data.style || "")).toUpperCase();
      const style = ["SOLID", "HOLLOW", "PAVING", "INTERLOCKING", "OTHER"].includes(String(data.style || "").toUpperCase())
        ? String(data.style).toUpperCase()
        : upper.includes("HOLLOW") ? "HOLLOW"
        : upper.includes("PAV") ? "PAVING"
        : upper.includes("INTERLOCK") ? "INTERLOCKING"
        : upper.includes("SOLID") ? "SOLID"
        : "OTHER";

      const unitPrice = Number(data.defaultUnitPriceGhs) || 0;

      // Optionally register a finished-goods inventory item so the new type is
      // tracked in stock, sellable in Sales, and visible in reports.
      let linkedSku: string | null = null;
      if (data.createInventoryItem !== false) {
        const baseSku = `BLK-${typeKey}`;
        const taken = new Set(
          (await db.select({ sku: inventoryItems.sku }).from(inventoryItems)).map((r: any) => r.sku),
        );
        let sku = baseSku;
        let n = 2;
        while (taken.has(sku)) sku = `${baseSku}-${n++}`;
        await db.insert(inventoryItems).values({
          name: rawName,
          sku,
          businessId,
          category: "Concrete Blocks",
          quantity: 0,
          unit: "Units",
          costPriceGhs: unitPrice ? Math.round(unitPrice * 0.66 * 100) / 100 : 0,
          sellingPriceGhs: unitPrice,
          minStockThreshold: 100,
          status: "OUT_OF_STOCK",
        });
        linkedSku = sku;
      }

      const [row] = await db.insert(blockTypes).values({
        businessId,
        branchCode,
        typeKey,
        name: rawName,
        dimensions: data.dimensions || null,
        style,
        defaultUnitPriceGhs: unitPrice || null,
        sku: linkedSku,
        isActive: true,
        createdByName: data.createdByName || null,
        createdByRole: data.createdByRole || null,
      }).returning();
      return NextResponse.json({ success: true, item: row });
    }

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

      // Increase finished block inventory: prefer the master list SKU link for
      // the block type, then fall back to the original name-prefix heuristic.
      const inv = await db.select().from(inventoryItems).where(eq(inventoryItems.businessId, businessId));
      const [masterType] = await db
        .select()
        .from(blockTypes)
        .where(and(eq(blockTypes.businessId, businessId), eq(blockTypes.typeKey, blockType)))
        .limit(1);
      const target =
        (masterType?.sku ? inv.find((i: any) => i.sku === masterType.sku) : undefined) ||
        inv.find((i: any) => i.sku?.includes("BLK") && i.name?.toUpperCase().includes(blockType.split("-")[0]));
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
