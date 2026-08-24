import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customerTrackings, businesses, inventoryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  uniqueTrackingCode,
  linkCrmCustomer,
  notifyOnlineOrder,
} from "@/lib/trackingServer";

/**
 * PUBLIC online checkout — customers order WITHOUT logging in.
 *
 * Prices and availability are ALWAYS re-derived server-side from live
 * inventory (client numbers are never trusted). The order lands as an
 * ONLINE tracking (status RECEIVED, payment UNPAID or PENDING_CONFIRMATION),
 * chain-linked to Business → Branch → Customer → Product → Payment →
 * Delivery, and the branch team + owner get a bell notification. The
 * customer gets back their unique GM-* tracking code for the public /track
 * page — their only key to this order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = Number(body.businessId);
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Choose a business to order from." }, { status: 400 });
    }
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!biz || (biz.status || "").toUpperCase() === "INACTIVE") {
      return NextResponse.json({ success: false, error: "That business is not taking online orders." }, { status: 404 });
    }

    const customerName = String(body.customerName || "").trim().slice(0, 80);
    if (customerName.length < 2) {
      return NextResponse.json({ success: false, error: "Please enter your name." }, { status: 400 });
    }
    const customerPhone = String(body.customerPhone || "").trim().slice(0, 20);
    if (customerPhone.length < 6) {
      return NextResponse.json({ success: false, error: "Please enter a phone number we can reach you on." }, { status: 400 });
    }
    const fulfillmentType = body.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const destinationAddress = String(body.destinationAddress || "").trim().slice(0, 200);
    if (fulfillmentType === "DELIVERY" && destinationAddress.length < 3) {
      return NextResponse.json(
        { success: false, error: "Tell us where to deliver (area / landmark)." },
        { status: 400 },
      );
    }
    const paymentChoice = body.paymentChoice === "MOMO_NOW" ? "MOMO_NOW" : "ON_DELIVERY";
    const momoRef = String(body.momoRef || "").trim().slice(0, 40);
    const customerNote = String(body.note || "").trim().slice(0, 300);

    const cart: { inventoryId: number; quantity: number }[] = Array.isArray(body.items)
      ? body.items.slice(0, 50).map((li: any) => ({
          inventoryId: Number(li?.inventoryId),
          quantity: Number(li?.quantity),
        }))
      : [];
    if (cart.length === 0 || cart.some((li) => !li.inventoryId || !(li.quantity > 0))) {
      return NextResponse.json({ success: false, error: "Your cart is empty." }, { status: 400 });
    }

    // Re-price & validate every line against live inventory — never trust the client.
    const problems: string[] = [];
    const lines: any[] = [];
    for (const li of cart) {
      const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, li.inventoryId));
      if (!inv || inv.businessId !== businessId) {
        problems.push("One of the products is no longer sold by this branch — please refresh the menu.");
        continue;
      }
      if (inv.status === "OUT_OF_STOCK" || inv.quantity <= 0) {
        problems.push(`"${inv.name}" just went out of stock.`);
        continue;
      }
      if (li.quantity > inv.quantity) {
        problems.push(`"${inv.name}": only ${inv.quantity} ${inv.unit} available right now.`);
        continue;
      }
      lines.push({
        inventoryId: inv.id,
        description: `${inv.name} (${inv.sku})`,
        sku: inv.sku,
        quantity: li.quantity,
        unit: inv.unit,
        unitPrice: inv.sellingPriceGhs,
        total: inv.sellingPriceGhs * li.quantity,
      });
    }
    if (problems.length > 0) {
      return NextResponse.json({ success: false, error: problems.join(" "), errors: problems }, { status: 409 });
    }

    const totalGhs = lines.reduce((acc: number, li: any) => acc + li.total, 0);
    const code = await uniqueTrackingCode(biz.code);
    const now = new Date();
    const customerId = await linkCrmCustomer({
      name: customerName,
      phone: customerPhone,
      businessId,
      spendGhs: 0, // spend accumulates when payment is confirmed
    });

    const [row] = await db
      .insert(customerTrackings)
      .values({
        trackingCode: code,
        businessId,
        branchCode: biz.code,
        branchName: biz.branchLocation || biz.name,
        customerId,
        customerName,
        customerPhone,
        items: lines,
        totalGhs,
        currency: "GHS",
        fulfillmentType,
        destinationAddress: fulfillmentType === "DELIVERY" ? destinationAddress : null,
        status: "RECEIVED",
        statusHistory: [
          {
            status: "RECEIVED",
            at: now.toISOString(),
            by: customerName,
            byRole: "CUSTOMER",
            note: "Online order placed on the GoMina 360 customer storefront.",
          },
        ],
        orderSource: "ONLINE",
        paymentChoice,
        paymentStatus: paymentChoice === "MOMO_NOW" ? "PENDING_CONFIRMATION" : "UNPAID",
        paymentMethod: paymentChoice === "MOMO_NOW" ? "MTN_MOMO" : null,
        paymentRef: momoRef || null,
        customerNote: customerNote || null,
        createdByUserId: null,
        createdByName: customerName,
        createdByRole: "CUSTOMER",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await notifyOnlineOrder({
      businessId,
      code,
      customerName,
      totalGhs,
      itemsCount: lines.length,
    });

    return NextResponse.json({
      success: true,
      trackingCode: code,
      trackUrl: `/track?code=${encodeURIComponent(code)}`,
      order: {
        code,
        businessName: biz.name,
        branchName: biz.branchLocation,
        customerName,
        items: lines.map((li: any) => ({
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unitPrice: li.unitPrice,
          total: li.total,
        })),
        totalGhs,
        currency: "GHS",
        fulfillmentType,
        destinationAddress: fulfillmentType === "DELIVERY" ? destinationAddress : null,
        status: "RECEIVED",
        payment: paymentChoice === "MOMO_NOW" ? "PENDING_CONFIRMATION" : "UNPAID",
      },
    });
  } catch (error: any) {
    console.error("POST /api/order error:", error);
    return NextResponse.json({ success: false, error: "Could not place your order. Please try again." }, { status: 500 });
  }
}
