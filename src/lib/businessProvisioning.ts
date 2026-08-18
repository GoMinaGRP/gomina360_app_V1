import { db } from "@/db";
import {
  businessMetrics,
  checklistTemplates,
  inventoryItems,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeStockStatus } from "@/lib/stock";
import { tasksForBusiness } from "@/lib/checklistDefaults";

/**
 * New-business auto-provisioning.
 *
 * Every business created through “New Branch / Unit” gets a complete,
 * immediately-usable operating workspace so its dashboard is NEVER blank:
 *   • zero-based live financial metrics (they grow from real activity)
 *   • a category starter inventory kit (raw materials + sellable products)
 *     booked as an opening EXPENSE against the unit’s initial capital
 *   • the full specialized daily-checklist template set for its type
 */

export const CATEGORY_PREFIX: Record<string, string> = {
  "Poultry Farm": "POULTRY",
  "Block Factory": "BLOCK",
  Aquaculture: "AQUA",
  Livestock: "LIVESTOCK",
  "Restaurant & Food": "FOOD",
  "Electronic Shop": "TECH",
  "Car Wash": "WASH",
};

export const CATEGORY_ICON: Record<string, string> = {
  "Poultry Farm": "Egg",
  "Block Factory": "Boxes",
  Aquaculture: "Fish",
  Livestock: "Beef",
  "Restaurant & Food": "Utensils",
  "Electronic Shop": "Cpu",
  "Car Wash": "Droplets",
};

export interface StarterItem {
  name: string;
  skuSuffix: string;
  category: string;
  quantity: number;
  unit: string;
  costPriceGhs: number;
  sellingPriceGhs: number;
  minStockThreshold: number;
}

const KITS: Record<string, StarterItem[]> = {
  "Poultry Farm": [
    { name: "Layer Feed 50kg Bag", skuSuffix: "FEED-50KG", category: "Feed & Consumables", quantity: 40, unit: "Bags", costPriceGhs: 320, sellingPriceGhs: 360, minStockThreshold: 10 },
    { name: "Grade A Egg Trays (30 Eggs/Tray)", skuSuffix: "EGG-TRAY", category: "Poultry Products", quantity: 120, unit: "Trays", costPriceGhs: 38, sellingPriceGhs: 55, minStockThreshold: 40 },
    { name: "Vitamins & Poultry Supplements", skuSuffix: "VIT-PACK", category: "Feed & Consumables", quantity: 15, unit: "Packs", costPriceGhs: 85, sellingPriceGhs: 110, minStockThreshold: 5 },
  ],
  "Block Factory": [
    { name: "Portland Cement 50kg Bag", skuSuffix: "CEMENT-50KG", category: "Raw Materials", quantity: 100, unit: "Bags", costPriceGhs: 105, sellingPriceGhs: 118, minStockThreshold: 30 },
    { name: "6-Inch Solid Blocks (Grade A)", skuSuffix: "BLK-6IN", category: "Concrete Blocks", quantity: 2000, unit: "Units", costPriceGhs: 9.5, sellingPriceGhs: 14.5, minStockThreshold: 800 },
    { name: "Fine River Sand (Cubic Metre)", skuSuffix: "SAND-M3", category: "Raw Materials", quantity: 30, unit: "m³", costPriceGhs: 180, sellingPriceGhs: 220, minStockThreshold: 8 },
  ],
  Aquaculture: [
    { name: "Floating Fish Feed 25kg Bag", skuSuffix: "FEED-25KG", category: "Feed & Consumables", quantity: 35, unit: "Bags", costPriceGhs: 410, sellingPriceGhs: 460, minStockThreshold: 10 },
    { name: "Fresh Harvested Tilapia (Avg 800g)", skuSuffix: "TILAPIA-KG", category: "Fresh Aquaculture", quantity: 400, unit: "Kg", costPriceGhs: 38, sellingPriceGhs: 62, minStockThreshold: 100 },
    { name: "Aerator Spare Parts Kit", skuSuffix: "AERATOR-KIT", category: "Equipment Supplies", quantity: 5, unit: "Kits", costPriceGhs: 650, sellingPriceGhs: 780, minStockThreshold: 2 },
  ],
  Livestock: [
    { name: "Cattle Concentrate Feed 50kg", skuSuffix: "CATTLE-FEED", category: "Feed & Consumables", quantity: 25, unit: "Bags", costPriceGhs: 290, sellingPriceGhs: 340, minStockThreshold: 8 },
    { name: "Fresh Beef (Dressed, per Kg)", skuSuffix: "BEEF-KG", category: "Meat & Livestock Products", quantity: 150, unit: "Kg", costPriceGhs: 58, sellingPriceGhs: 85, minStockThreshold: 40 },
    { name: "Goat (Live Weight, per Kg)", skuSuffix: "GOAT-KG", category: "Meat & Livestock Products", quantity: 80, unit: "Kg", costPriceGhs: 45, sellingPriceGhs: 68, minStockThreshold: 25 },
  ],
  "Restaurant & Food": [
    { name: "Jollof Rice (Standard Plate)", skuSuffix: "JOLLOF-PLT", category: "Cooked Meals", quantity: 60, unit: "Plates", costPriceGhs: 22, sellingPriceGhs: 45, minStockThreshold: 20 },
    { name: "Grilled Tilapia with Banku", skuSuffix: "TILAPIA-BANKU", category: "Cooked Meals", quantity: 40, unit: "Plates", costPriceGhs: 38, sellingPriceGhs: 75, minStockThreshold: 15 },
    { name: "Cooking Oil 5L Bottle", skuSuffix: "OIL-5L", category: "Kitchen Ingredients", quantity: 20, unit: "Bottles", costPriceGhs: 165, sellingPriceGhs: 190, minStockThreshold: 6 },
    { name: "Rice Bag 25kg (Jasmine)", skuSuffix: "RICE-25KG", category: "Kitchen Ingredients", quantity: 12, unit: "Bags", costPriceGhs: 380, sellingPriceGhs: 430, minStockThreshold: 4 },
  ],
  "Electronic Shop": [
    { name: "Smartphone (Mid-Range 4G)", skuSuffix: "PHONE-4G", category: "Phones & Devices", quantity: 8, unit: "Units", costPriceGhs: 1450, sellingPriceGhs: 1950, minStockThreshold: 3 },
    { name: "Bluetooth Earbuds", skuSuffix: "EARBUDS", category: "Accessories", quantity: 20, unit: "Units", costPriceGhs: 90, sellingPriceGhs: 160, minStockThreshold: 6 },
    { name: "Phone Charging Cable (Type-C)", skuSuffix: "CABLE-USBC", category: "Accessories", quantity: 35, unit: "Units", costPriceGhs: 18, sellingPriceGhs: 40, minStockThreshold: 10 },
  ],
  "Car Wash": [
    { name: "Executive Wash & Wax", skuSuffix: "WASH-EXEC", category: "Wash Services", quantity: 999, unit: "Jobs", costPriceGhs: 8, sellingPriceGhs: 40, minStockThreshold: 50 },
    { name: "Interior Detailing Package", skuSuffix: "DETAIL-INT", category: "Wash Services", quantity: 999, unit: "Jobs", costPriceGhs: 15, sellingPriceGhs: 70, minStockThreshold: 50 },
    { name: "Car Wash Shampoo 25L Drum", skuSuffix: "SHAMPOO-25L", category: "Chemicals & Supplies", quantity: 4, unit: "Drums", costPriceGhs: 320, sellingPriceGhs: 380, minStockThreshold: 2 },
  ],
};

const GENERIC_KIT: StarterItem[] = [
  { name: "General Retail Stock", skuSuffix: "GEN-STOCK", category: "General Stock", quantity: 50, unit: "Units", costPriceGhs: 20, sellingPriceGhs: 35, minStockThreshold: 15 },
  { name: "Consumable Supplies", skuSuffix: "GEN-SUPPLY", category: "Consumables", quantity: 20, unit: "Units", costPriceGhs: 45, sellingPriceGhs: 65, minStockThreshold: 8 },
];

/** Next sequential code for a category: BLOCK-02, BLOCK-03, … (race-tolerant). */
export function nextBusinessCode(existingCodes: string[], category: string): string {
  const prefix = CATEGORY_PREFIX[category] || "BIZ";
  let max = 0;
  for (const code of existingCodes) {
    const m = /^([A-Z]+)-(\d+)$/.exec(code || "");
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  }
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}

/**
 * Provision a freshly-created business. Idempotent per area: skips whatever
 * already exists (so it can also repair a unit whose kit was removed).
 */
export async function provisionBusiness(biz: {
  id: number;
  code: string;
  name: string;
  category: string;
  initialCapitalGhs?: number | null;
}) {
  const businessId = biz.id;

  // 1. Zero-based Q1 metrics — grow purely from real recorded activity.
  //    (Created first so the starter-kit value can be folded straight in.)
  const existingMetrics = await db
    .select()
    .from(businessMetrics)
    .where(eq(businessMetrics.businessId, businessId));
  if (existingMetrics.length === 0) {
    await db.insert(businessMetrics).values({
      businessId,
      period: "2026-Q1",
      revenueGhs: 0,
      expensesGhs: 0,
      netProfitGhs: 0,
      roiPercent: 0,
      cashFlowGhs: 0,
      assetsValueGhs: Number(biz.initialCapitalGhs) || 100000,
      inventoryValueGhs: 0,
      growthRatePercent: 0,
      riskScore: 20,
    });
  }

  // 2. Category starter inventory kit. Its cost value is folded into the
  //    metrics row (expenses / inventory value) — NOT booked as a transaction —
  //    so GoMinaApp's live layering never double-counts it; the module surfaces
  //    it as "Starter kit funded from initial capital".
  const existingInv = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.businessId, businessId));
  let kitCost = 0;
  const createdItems: any[] = [];
  if (existingInv.length === 0) {
    const kit = KITS[biz.category] || GENERIC_KIT;
    for (const item of kit) {
      const qty = Number(item.quantity) || 0;
      const [row] = await db
        .insert(inventoryItems)
        .values({
          name: item.name,
          sku: `${biz.code}-${item.skuSuffix}`,
          businessId,
          category: item.category,
          quantity: qty,
          unit: item.unit,
          costPriceGhs: item.costPriceGhs,
          sellingPriceGhs: item.sellingPriceGhs,
          minStockThreshold: item.minStockThreshold,
          status: computeStockStatus(qty, item.minStockThreshold),
        })
        .returning();
      kitCost += qty * (Number(item.costPriceGhs) || 0);
      createdItems.push(row);
    }
    if (kitCost > 0) {
      const [metric] = await db
        .select()
        .from(businessMetrics)
        .where(eq(businessMetrics.businessId, businessId));
      if (metric) {
        await db
          .update(businessMetrics)
          .set({
            expensesGhs: Math.round(kitCost * 100) / 100,
            netProfitGhs: Math.round(-kitCost * 100) / 100,
            cashFlowGhs: Math.round(-kitCost * 100) / 100,
            inventoryValueGhs: Math.round(kitCost * 100) / 100,
          })
          .where(eq(businessMetrics.id, metric.id));
      }
    }
  }

  // 3. Full specialized daily-checklist template set for the business type.
  const existingTpl = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.businessId, businessId));
  let templateCount = 0;
  if (existingTpl.length === 0) {
    const seeds = tasksForBusiness(biz.code, biz.category);
    for (let i = 0; i < seeds.length; i++) {
      const t = seeds[i];
      await db.insert(checklistTemplates).values({
        businessId,
        branchCode: biz.code,
        taskKey: t.taskKey,
        taskLabel: t.taskLabel,
        category: t.category,
        sortOrder: i + 1,
        isActive: true,
      });
    }
    templateCount = seeds.length;
  }

  return {
    metricsCreated: existingMetrics.length === 0,
    starterItems: createdItems.length,
    starterKitCostGhs: Math.round(kitCost * 100) / 100,
    checklistTemplates: templateCount,
  };
}

/**
 * Re-provision a business after the OWNER changes its type (category).
 *
 * Keeps every existing row (history is never destroyed), then makes the unit
 * fully operational as the NEW type:
 *   • inserts any missing starter-kit SKUs for the new category (per-SKU
 *     idempotent — existing stock rows are never touched) and folds the added
 *     kit cost incrementally into the live metrics row (expenses / inventory
 *     value / net profit / cash flow)
 *   • re-points daily checklists at the new type: templates whose taskKey is
 *     not part of the new type's set are deactivated (kept in history), and
 *     missing new-type templates are created active with the unit's branch code
 */
export async function reprovisionForTypeChange(biz: {
  id: number;
  code: string;
  name: string;
  category: string; // NEW category
}) {
  const businessId = biz.id;

  // 1. Starter kit: add only the SKUs of the new category that do not exist yet.
  const kit = KITS[biz.category] || GENERIC_KIT;
  const existingInv = await db
    .select({ sku: inventoryItems.sku })
    .from(inventoryItems)
    .where(eq(inventoryItems.businessId, businessId));
  const existingSkus = new Set(existingInv.map((r) => r.sku));
  const addedItems: any[] = [];
  let addedKitCost = 0;
  for (const item of kit) {
    const sku = `${biz.code}-${item.skuSuffix}`;
    if (existingSkus.has(sku)) continue;
    const qty = Number(item.quantity) || 0;
    const [row] = await db
      .insert(inventoryItems)
      .values({
        name: item.name,
        sku,
        businessId,
        category: item.category,
        quantity: qty,
        unit: item.unit,
        costPriceGhs: item.costPriceGhs,
        sellingPriceGhs: item.sellingPriceGhs,
        minStockThreshold: item.minStockThreshold,
        status: computeStockStatus(qty, item.minStockThreshold),
      })
      .returning();
    addedKitCost += qty * (Number(item.costPriceGhs) || 0);
    addedItems.push(row);
  }

  // Fold the added kit cost incrementally into the metrics row (exactly like
  // creation does, but as a delta instead of an absolute set).
  if (addedKitCost > 0) {
    const [metric] = await db
      .select()
      .from(businessMetrics)
      .where(eq(businessMetrics.businessId, businessId));
    if (metric) {
      await db
        .update(businessMetrics)
        .set({
          expensesGhs: Math.round((metric.expensesGhs + addedKitCost) * 100) / 100,
          netProfitGhs: Math.round((metric.netProfitGhs - addedKitCost) * 100) / 100,
          cashFlowGhs: Math.round((metric.cashFlowGhs - addedKitCost) * 100) / 100,
          inventoryValueGhs: Math.round((metric.inventoryValueGhs + addedKitCost) * 100) / 100,
        })
        .where(eq(businessMetrics.id, metric.id));
    }
  }

  // 2. Checklist templates: point the unit at its new type's task set.
  const wanted = tasksForBusiness(undefined, biz.category);
  const wantedKeys = new Set(wanted.map((t) => t.taskKey));
  const existingTpls = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.businessId, businessId));
  const existingKeys = new Set(existingTpls.map((t) => t.taskKey));

  let deactivated = 0;
  for (const tpl of existingTpls) {
    if (!wantedKeys.has(tpl.taskKey) && tpl.isActive) {
      await db
        .update(checklistTemplates)
        .set({ isActive: false })
        .where(eq(checklistTemplates.id, tpl.id));
      deactivated++;
    } else if (wantedKeys.has(tpl.taskKey) && !tpl.isActive) {
      await db
        .update(checklistTemplates)
        .set({ isActive: true, branchCode: biz.code })
        .where(eq(checklistTemplates.id, tpl.id));
    }
  }

  let createdTpls = 0;
  for (let i = 0; i < wanted.length; i++) {
    const t = wanted[i];
    if (existingKeys.has(t.taskKey)) continue;
    await db.insert(checklistTemplates).values({
      businessId,
      branchCode: biz.code,
      taskKey: t.taskKey,
      taskLabel: t.taskLabel,
      category: t.category,
      sortOrder: i + 1,
      isActive: true,
    });
    createdTpls++;
  }

  return {
    kitItemsAdded: addedItems.length,
    kitCostAddedGhs: Math.round(addedKitCost * 100) / 100,
    checklistTemplatesCreated: createdTpls,
    checklistTemplatesDeactivated: deactivated,
  };
}
