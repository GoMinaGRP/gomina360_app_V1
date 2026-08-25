import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, inventoryItems } from "@/db/schema";
import { asc, eq, gt, ne, and } from "drizzle-orm";

/**
 * PUBLIC online-ordering menu — NO login required.
 *
 * Every active business/branch with sellable stock: product name, category,
 * unit, selling price, live availability. Deliberately excludes cost prices,
 * margins, thresholds and any internal fields. Photos are passed through
 * when the branch registered one.
 */
export async function GET() {
  try {
    const [bizRows, itemRows] = await Promise.all([
      db.select().from(businesses).orderBy(asc(businesses.id)),
      db
        .select()
        .from(inventoryItems)
        .where(and(gt(inventoryItems.quantity, 0), ne(inventoryItems.status, "OUT_OF_STOCK")))
        .orderBy(asc(inventoryItems.name)),
    ]);

    const result = [];
    for (const b of bizRows) {
      if ((b.status || "").toUpperCase() === "INACTIVE") continue;
      // Units the OWNER / authorized staff switched OFF for online ordering
      // never reach the customer storefront at all.
      if (b.onlineOrderingEnabled === false) continue;
      const products = itemRows
        .filter((i) => i.businessId === b.id)
        .map((i) => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          category: i.category,
          unit: i.unit,
          price: i.sellingPriceGhs,
          available: Math.max(0, Math.floor(i.quantity)),
          photo: i.photo || null,
        }));
      if (products.length === 0) continue;
      result.push({
        businessId: b.id,
        businessName: b.name,
        businessCode: b.code,
        // Branch identity — the storefront unit the order is linked to
        // (Business → Branch → Products → Orders → Delivery → Tracking).
        branchCode: b.code,
        category: b.category,
        branchName: b.branchLocation,
        contactPhone: b.contactPhone || null,
        // Public shop coordinates — the customer's pickup point, and the
        // storefront's starting centre for the delivery map. (Never any
        // customer data.)
        gpsLat: b.gpsLat ?? null,
        gpsLng: b.gpsLng ?? null,
        // Service area & fulfilment switches — drive the storefront's
        // "serving my location" Google-Maps filter and the pickup/delivery
        // options shown to the customer.
        serviceRadiusKm: b.serviceRadiusKm ?? null,
        serviceNote: b.serviceNote || null,
        pickupEnabled: b.pickupEnabled !== false,
        deliveryEnabled: b.deliveryEnabled !== false,
        products,
      });
    }

    return NextResponse.json(
      { success: true, businesses: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json({ success: false, error: "Could not load the menu." }, { status: 500 });
  }
}
