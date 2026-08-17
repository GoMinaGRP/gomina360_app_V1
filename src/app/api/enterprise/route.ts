import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  employees,
  assets,
  assetAuditLogs,
  inventoryItems,
  customers,
  suppliers,
  businesses,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, data } = body;

    // Standardized Ghana location shared by every enterprise entity
    const loc = {
      region: data?.region || null,
      district: data?.district || null,
      town: data?.town || null,
    };

    if (entityType === "employee") {
      const [inserted] = await db
        .insert(employees)
        .values({
          name: data.name || "New Employee",
          role: data.role || "Staff",
          businessId: Number(data.businessId) || 1,
          branch: data.branch || "Accra Main",
          ...loc,
          salaryGhs: Number(data.salaryGhs) || 3000,
          phone: data.phone || "+233 24 000 0000",
          hireDate: data.hireDate || new Date().toISOString().split("T")[0],
          status: "ACTIVE",
        })
        .returning();
      return NextResponse.json({ success: true, item: inserted });
    }

    if (entityType === "asset") {
      // Business + Branch are REQUIRED for every asset. This ties the asset
      // value into that business and branch's dashboards, reports and analytics.
      const businessIdNum = Number(data.businessId);
      if (!businessIdNum) {
        return NextResponse.json(
          { success: false, error: "Business is required to register an asset." },
          { status: 400 }
        );
      }

      const [parentBiz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessIdNum));

      if (!parentBiz) {
        return NextResponse.json(
          { success: false, error: `Business #${businessIdNum} not found.` },
          { status: 400 }
        );
      }

      // Branch defaults to the parent business code when not explicitly passed
      // (single-branch business). Multi-branch businesses must send branchCode.
      const branchCode = String(data.branchCode || parentBiz.code || "").trim();
      if (!branchCode) {
        return NextResponse.json(
          { success: false, error: "Branch is required to register an asset." },
          { status: 400 }
        );
      }

      // A BRANCH_MANAGER may only register assets against their own branch.
      if (
        data.requestingUserRole === "BRANCH_MANAGER" &&
        Number(data.requestingUserBusinessId) !== businessIdNum
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Branch Managers can only register assets for their own assigned branch.",
          },
          { status: 403 }
        );
      }

      // ── Unique Asset Code ────────────────────────────────────────────────
      // Use the supplied code, or auto-generate the next sequential code for
      // this branch (e.g. TECH-01-AST-0003). Enforce uniqueness before insert.
      let assetCode = String(data.assetCode || "").trim().toUpperCase();

      if (assetCode) {
        const [dupe] = await db
          .select()
          .from(assets)
          .where(eq(assets.assetCode, assetCode));
        if (dupe) {
          return NextResponse.json(
            {
              success: false,
              error: `Asset Code "${assetCode}" is already in use. Please enter a unique code.`,
            },
            { status: 409 }
          );
        }
      } else {
        const branchAssets = await db
          .select()
          .from(assets)
          .where(eq(assets.branchCode, branchCode));
        let seq = branchAssets.length + 1;
        // Guard against gaps/collisions by probing until a free code is found
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const candidate = `${branchCode}-AST-${String(seq).padStart(4, "0")}`;
          const [exists] = await db
            .select()
            .from(assets)
            .where(eq(assets.assetCode, candidate));
          if (!exists) {
            assetCode = candidate;
            break;
          }
          seq += 1;
        }
      }

      const [inserted] = await db
        .insert(assets)
        .values({
          assetCode,
          name: data.name || "Enterprise Equipment",
          description: data.description || null,
          businessId: businessIdNum,
          branchCode,
          branchName: data.branchName || parentBiz.name,
          assetType: data.assetType || "MACHINERY",
          purchasePriceGhs: Number(data.purchasePriceGhs) || 15000,
          currentValueGhs:
            Number(data.currentValueGhs) ||
            Number(data.purchasePriceGhs) * 0.9 ||
            14000,
          condition: data.condition || "EXCELLENT",
          location: data.location || "Main Site",
          // Auto-copy the branch's standardized Ghana location (Region → District → Town)
          // unless the caller provided explicit overrides.
          region: loc.region || parentBiz.region || null,
          district: loc.district || parentBiz.district || null,
          town: loc.town || parentBiz.town || null,
          nextMaintenanceDate:
            data.nextMaintenanceDate ||
            new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
          registeredByUserId: data.registeredByUserId
            ? Number(data.registeredByUserId)
            : null,
          recorderName: data.recorderName || data.requestedByName || "Unknown Recorder",
          recordedAt: new Date(),
          assetImages: Array.isArray(data.assetImages) ? data.assetImages : [],
        })
        .returning();

      await db.insert(assetAuditLogs).values({
        assetId: inserted.id,
        assetCode: inserted.assetCode,
        action: "CREATE",
        status: "COMPLETED",
        requestedByUserId: data.registeredByUserId
          ? Number(data.registeredByUserId)
          : null,
        requestedByName: data.recorderName || data.requestedByName || "Unknown Recorder",
        requestedByRole: data.requestingUserRole || null,
        detailsJson: {
          name: inserted.name,
          businessId: inserted.businessId,
          branchCode: inserted.branchCode,
          currentValueGhs: inserted.currentValueGhs,
          imageCount: Array.isArray(data.assetImages) ? data.assetImages.length : 0,
        },
      });

      return NextResponse.json({ success: true, item: inserted });
    }

    if (entityType === "inventory") {
      const [inserted] = await db
        .insert(inventoryItems)
        .values({
          name: data.name || "New Inventory Item",
          sku: data.sku || `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
          businessId: Number(data.businessId) || 1,
          category: data.category || "General Stock",
          quantity: Number(data.quantity) || 100,
          unit: data.unit || "Units",
          costPriceGhs: Number(data.costPriceGhs) || 20,
          sellingPriceGhs: Number(data.sellingPriceGhs) || 35,
          minStockThreshold: Number(data.minStockThreshold) || 10,
          status: "IN_STOCK",
          expiryDate: data.expiryDate || null,
        })
        .returning();
      return NextResponse.json({ success: true, item: inserted });
    }

    if (entityType === "customer") {
      const [inserted] = await db
        .insert(customers)
        .values({
          name: data.name || "New Client",
          type: data.type || "WHOLESALE",
          phone: data.phone || "+233 24 000 0000",
          email: data.email || "client@domain.gh",
          address:
            data.address ||
            [data?.town, data?.district, data?.region].filter(Boolean).join(", ") ||
            "Ghana",
          ...loc,
          totalSpentGhs: 0,
          loyaltyPoints: 0,
          businessId: data.businessId ? Number(data.businessId) : null,
        })
        .returning();
      return NextResponse.json({ success: true, item: inserted });
    }

    if (entityType === "supplier") {
      const [inserted] = await db
        .insert(suppliers)
        .values({
          name: data.name || "New Supplier",
          category: data.category || "Materials",
          contactPerson: data.contactPerson || "Contact Officer",
          phone: data.phone || "+233 24 000 0000",
          email: data.email || "supplier@domain.gh",
          paymentTerms: data.paymentTerms || "NET_30",
          ...loc,
          totalSuppliedGhs: 0,
        })
        .returning();
      return NextResponse.json({ success: true, item: inserted });
    }

    return NextResponse.json(
      { success: false, error: `Unknown entityType: ${entityType}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
