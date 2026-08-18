import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  businesses,
  businessMetrics,
  customers,
  employees,
  assets,
  assetAuditLogs,
  inventoryItems,
  universalExports,
  transactions,
  expenseCategories,
  salesDocuments,
  poultryLogs,
  poultryFlocks,
  poultryFeedLogs,
  poultryWaterLogs,
  poultryHealthRecords,
  poultryProduction,
  poultryChecklists,
  blockFactoryLogs,
  blockFactoryOrders,
  blockFactoryDeliveries,
  blockFactoryChecklists,
  blockTypes,
  aquacultureLogs,
  aquaculturePonds,
  aquacultureBatches,
  aquacultureFeedLogs,
  aquacultureWaterQualityLogs,
  aquacultureHarvests,
  aquacultureChecklists,
  livestockLogs,
  restaurantLogs,
  electronicsLogs,
  carWashLogs,
  aiInsights,
  scenarioSimulations,
  checklistTemplates,
  checklistEntries,
  electronicsOrders,
  electronicsSerials,
  electronicsWarranties,
  electronicsPurchases,
  restaurantOrders,
  restaurantMenuItems,
  restaurantWaste,
  restaurantPurchases,
  users,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  CATEGORY_ICON,
  reprovisionForTypeChange,
} from "@/lib/businessProvisioning";

const VALID_CATEGORIES = [
  "Poultry Farm",
  "Block Factory",
  "Aquaculture",
  "Livestock",
  "Restaurant & Food",
  "Electronic Shop",
  "Car Wash",
];

const VALID_STATUSES = ["ACTIVE", "EXPANDING", "MAINTENANCE", "INACTIVE"];

async function loadBusiness(id: number) {
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, id));
  return biz;
}

/** Count every operational record owned by the business — used by the Owner
 *  console to preview exactly what a deletion will remove. */
async function relatedCounts(businessId: number) {
  const count = async (table: any, col: any) => {
    const rows = await db.select({ id: table.id }).from(table).where(eq(col, businessId));
    return rows.length;
  };

  const groups: Record<string, number> = {
    inventoryItems: await count(inventoryItems, inventoryItems.businessId),
    employees: await count(employees, employees.businessId),
    customers: await count(customers, customers.businessId),
    assets: await count(assets, assets.businessId),
    transactions: await count(transactions, transactions.businessId),
    salesDocuments:
      (await count(salesDocuments, salesDocuments.businessId)) +
      (await count(blockFactoryOrders, blockFactoryOrders.businessId)) +
      (await count(blockFactoryDeliveries, blockFactoryDeliveries.businessId)) +
      (await count(electronicsOrders, electronicsOrders.businessId)) +
      (await count(electronicsSerials, electronicsSerials.businessId)) +
      (await count(electronicsWarranties, electronicsWarranties.businessId)) +
      (await count(electronicsPurchases, electronicsPurchases.businessId)) +
      (await count(restaurantOrders, restaurantOrders.businessId)),
    productionAndOps:
      (await count(poultryLogs, poultryLogs.businessId)) +
      (await count(poultryFlocks, poultryFlocks.businessId)) +
      (await count(poultryFeedLogs, poultryFeedLogs.businessId)) +
      (await count(poultryWaterLogs, poultryWaterLogs.businessId)) +
      (await count(poultryHealthRecords, poultryHealthRecords.businessId)) +
      (await count(poultryProduction, poultryProduction.businessId)) +
      (await count(poultryChecklists, poultryChecklists.businessId)) +
      (await count(blockFactoryLogs, blockFactoryLogs.businessId)) +
      (await count(blockFactoryChecklists, blockFactoryChecklists.businessId)) +
      (await count(blockTypes, blockTypes.businessId)) +
      (await count(aquacultureLogs, aquacultureLogs.businessId)) +
      (await count(aquaculturePonds, aquaculturePonds.businessId)) +
      (await count(aquacultureBatches, aquacultureBatches.businessId)) +
      (await count(aquacultureFeedLogs, aquacultureFeedLogs.businessId)) +
      (await count(aquacultureWaterQualityLogs, aquacultureWaterQualityLogs.businessId)) +
      (await count(aquacultureHarvests, aquacultureHarvests.businessId)) +
      (await count(aquacultureChecklists, aquacultureChecklists.businessId)) +
      (await count(livestockLogs, livestockLogs.businessId)) +
      (await count(restaurantLogs, restaurantLogs.businessId)) +
      (await count(restaurantMenuItems, restaurantMenuItems.businessId)) +
      (await count(restaurantWaste, restaurantWaste.businessId)) +
      (await count(restaurantPurchases, restaurantPurchases.businessId)) +
      (await count(electronicsLogs, electronicsLogs.businessId)) +
      (await count(carWashLogs, carWashLogs.businessId)),
    checklists:
      (await count(checklistTemplates, checklistTemplates.businessId)) +
      (await count(checklistEntries, checklistEntries.businessId)),
    metrics: await count(businessMetrics, businessMetrics.businessId),
    expenseCategories: await count(expenseCategories, expenseCategories.businessId),
    exports: await count(universalExports, universalExports.businessId),
  };
  const totalRecords = Object.values(groups).reduce((a, b) => a + b, 0);
  return { groups, totalRecords };
}

/** GET /api/businesses/[id] — single business + related-record counts. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = parseInt(id, 10);
    if (!Number.isFinite(businessId)) {
      return NextResponse.json({ success: false, error: "Invalid business id." }, { status: 400 });
    }
    const biz = await loadBusiness(businessId);
    if (!biz) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }
    const counts = await relatedCounts(businessId);
    return NextResponse.json({ success: true, business: biz, counts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/businesses/[id] — OWNER edit: rename, change location, change
 * business type, change manager/phone, adjust capital & targets, activate /
 * deactivate (status). A category change automatically re-provisions the
 * unit (starter stock kit + checklist templates for the new type) so every
 * dashboard, inventory, finance and report view stays correct.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const businessId = parseInt(id, 10);
    if (!Number.isFinite(businessId)) {
      return NextResponse.json({ success: false, error: "Invalid business id." }, { status: 400 });
    }
    const biz = await loadBusiness(businessId);
    if (!biz) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Business name cannot be empty." }, { status: 400 });
      }
      if (name !== biz.name) {
        const clash = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.name, name));
        if (clash.some((r) => r.id !== businessId)) {
          return NextResponse.json(
            { success: false, error: `Another unit is already named "${name}".` },
            { status: 409 }
          );
        }
      }
      updates.name = name;
    }

    let categoryChanged = false;
    if (typeof body.category === "string" && body.category !== biz.category) {
      const category = body.category.trim();
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { success: false, error: `Unknown business type "${category}".` },
          { status: 400 }
        );
      }
      updates.category = category;
      updates.iconName = CATEGORY_ICON[category] || "Building2";
      categoryChanged = true;
    }

    // Standardized Ghana location — branchLocation derived when not explicit.
    const region = typeof body.region === "string" ? body.region.trim() : undefined;
    const district = typeof body.district === "string" ? body.district.trim() : undefined;
    const town = typeof body.town === "string" ? body.town.trim() : undefined;
    if (region) updates.region = region;
    if (district !== undefined) updates.district = district || null;
    if (town !== undefined) updates.town = town || null;
    if (typeof body.branchLocation === "string" && body.branchLocation.trim()) {
      updates.branchLocation = body.branchLocation.trim();
    } else if (region || district !== undefined || town !== undefined) {
      const effRegion = region ?? biz.region;
      const effDistrict = district !== undefined ? district : biz.district;
      const effTown = town !== undefined ? town : biz.town;
      updates.branchLocation =
        [effTown, effDistrict].filter(Boolean).join(", ") || effRegion || biz.branchLocation;
    }

    if (typeof body.managerName === "string" && body.managerName.trim()) {
      updates.managerName = body.managerName.trim();
    }
    if (typeof body.contactPhone === "string" && body.contactPhone.trim()) {
      updates.contactPhone = body.contactPhone.trim();
    }
    if (typeof body.status === "string") {
      const status = body.status.trim().toUpperCase();
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: `Invalid status "${status}".` }, { status: 400 });
      }
      updates.status = status;
    }
    if (body.initialCapitalGhs !== undefined) {
      const v = Number(body.initialCapitalGhs);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ success: false, error: "Initial capital must be a positive number." }, { status: 400 });
      }
      updates.initialCapitalGhs = v;
    }
    if (body.monthlyTargetRevenueGhs !== undefined) {
      const v = Number(body.monthlyTargetRevenueGhs);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ success: false, error: "Monthly target must be a positive number." }, { status: 400 });
      }
      updates.monthlyTargetRevenueGhs = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update." }, { status: 400 });
    }

    const [updated] = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, businessId))
      .returning();

    // Business type changed → re-provision so the unit mounts its new flagship
    // module with the right starter stock kit + checklist templates.
    let typeChange: any = null;
    if (categoryChanged) {
      typeChange = await reprovisionForTypeChange({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        category: updated.category,
      });
    }

    return NextResponse.json({ success: true, business: updated, typeChange });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/businesses/[id] — OWNER permanent deletion with mandatory
 * confirmation. Removes the unit AND every related operational record
 * (inventory, production, sales, customers, orders, finance/transactions,
 * employees, assets, checklists, metrics, exports) so all dashboards and
 * reports update automatically. Assigned user accounts are un-assigned
 * (never deleted). Body: { confirmCode: "<BUSINESS-CODE>" }.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const businessId = parseInt(id, 10);
    if (!Number.isFinite(businessId)) {
      return NextResponse.json({ success: false, error: "Invalid business id." }, { status: 400 });
    }
    const biz = await loadBusiness(businessId);
    if (!biz) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    // Mandatory confirmation gate — the caller must echo the exact unit code.
    if (body.confirmCode !== biz.code) {
      return NextResponse.json(
        { success: false, error: `Deletion requires confirmation: send confirmCode "${biz.code}".` },
        { status: 400 }
      );
    }

    const counts = await relatedCounts(businessId);

    // 1. Asset audit history keys off assetId (not businessId) — purge first.
    const assetRows = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.businessId, businessId));
    const assetIds = assetRows.map((a) => a.id);
    if (assetIds.length > 0) {
      await db.delete(assetAuditLogs).where(inArray(assetAuditLogs.assetId, assetIds));
    }

    // 2. Every operational table scoped by businessId.
    const scoped: Array<[any, any]> = [
      [businessMetrics, businessMetrics.businessId],
      [customers, customers.businessId],
      [employees, employees.businessId],
      [assets, assets.businessId],
      [inventoryItems, inventoryItems.businessId],
      [universalExports, universalExports.businessId],
      [transactions, transactions.businessId],
      [expenseCategories, expenseCategories.businessId],
      [salesDocuments, salesDocuments.businessId],
      [poultryLogs, poultryLogs.businessId],
      [poultryFlocks, poultryFlocks.businessId],
      [poultryFeedLogs, poultryFeedLogs.businessId],
      [poultryWaterLogs, poultryWaterLogs.businessId],
      [poultryHealthRecords, poultryHealthRecords.businessId],
      [poultryProduction, poultryProduction.businessId],
      [poultryChecklists, poultryChecklists.businessId],
      [blockFactoryLogs, blockFactoryLogs.businessId],
      [blockFactoryOrders, blockFactoryOrders.businessId],
      [blockFactoryDeliveries, blockFactoryDeliveries.businessId],
      [blockFactoryChecklists, blockFactoryChecklists.businessId],
      [blockTypes, blockTypes.businessId],
      [aquacultureLogs, aquacultureLogs.businessId],
      [aquaculturePonds, aquaculturePonds.businessId],
      [aquacultureBatches, aquacultureBatches.businessId],
      [aquacultureFeedLogs, aquacultureFeedLogs.businessId],
      [aquacultureWaterQualityLogs, aquacultureWaterQualityLogs.businessId],
      [aquacultureHarvests, aquacultureHarvests.businessId],
      [aquacultureChecklists, aquacultureChecklists.businessId],
      [livestockLogs, livestockLogs.businessId],
      [restaurantLogs, restaurantLogs.businessId],
      [electronicsLogs, electronicsLogs.businessId],
      [carWashLogs, carWashLogs.businessId],
      [aiInsights, aiInsights.businessId],
      [checklistTemplates, checklistTemplates.businessId],
      [checklistEntries, checklistEntries.businessId],
      [electronicsOrders, electronicsOrders.businessId],
      [electronicsSerials, electronicsSerials.businessId],
      [electronicsWarranties, electronicsWarranties.businessId],
      [electronicsPurchases, electronicsPurchases.businessId],
      [restaurantOrders, restaurantOrders.businessId],
      [restaurantMenuItems, restaurantMenuItems.businessId],
      [restaurantWaste, restaurantWaste.businessId],
      [restaurantPurchases, restaurantPurchases.businessId],
    ];
    for (const [table, col] of scoped) {
      await db.delete(table).where(eq(col, businessId));
    }

    // 3. Scenarios targeting only this unit no longer make sense.
    await db
      .delete(scenarioSimulations)
      .where(eq(scenarioSimulations.targetBusinessId, businessId));

    // 4. User accounts are NEVER deleted — staff assigned to the deleted unit
    //    are simply un-assigned so they can be re-deployed by the Owner.
    await db
      .update(users)
      .set({ assignedBusinessId: null })
      .where(eq(users.assignedBusinessId, businessId));

    // 5. Finally remove the unit itself.
    await db.delete(businesses).where(eq(businesses.id, businessId));

    return NextResponse.json({
      success: true,
      deleted: { id: biz.id, code: biz.code, name: biz.name },
      removedRecords: counts.totalRecords,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
