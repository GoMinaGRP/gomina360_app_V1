import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customerTrackings, businesses, notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  getSessionInfo,
  accessibleBusinessIds,
  canAccessBusiness,
  filterByAccess,
  UNAUTHENTICATED,
  FORBIDDEN,
} from "@/lib/auth";
import {
  buildTrackingCode,
  isValidTransition,
  nextStatuses,
  TRACK_STATUS_LABELS,
  type TrackStatus,
} from "@/lib/tracking";

/**
 * Staff console API — Customer Order Tracking.
 *
 * VISIBILITY: every signed-in staff member, strictly scoped with the same
 * Business/Branch access rules as the rest of GoMina 360 (OWNER: all;
 * managers/workers: their assigned + owner-granted businesses only —
 * enforced server-side by accessibleBusinessIds/filterByAccess).
 *
 * ACTIONS (POST):
 *   CREATE     { businessId, customerName, customerPhone?, items?, totalGhs?,
 *                fulfillmentType?, destinationAddress?, note?, customerId?,
 *                saleDocumentId?, transactionId? }
 *              → mints a unique GM-* tracking code, status RECEIVED.
 *   SET_STATUS { id, status, note? }
 *              → validates the flow RECEIVED → CONFIRMED → PROCESSING →
 *                READY|DISPATCHED → COMPLETED|DELIVERED (CANCELLED any time
 *                before terminal); appends an immutable history entry and
 *                notifies the order's creator in-app (bell).
 *   LOCATION   { id, lat, lng, driverName?, vehicleNote? }
 *              → live dispatch ping; only while status = DISPATCHED.
 */

async function uniqueTrackingCode(bizCode: string | null | undefined): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = buildTrackingCode(bizCode);
    const clash = await db
      .select({ id: customerTrackings.id })
      .from(customerTrackings)
      .where(eq(customerTrackings.trackingCode, code));
    if (clash.length === 0) return code;
  }
  // Practically unreachable (26M+ combinations); still never collide.
  return buildTrackingCode(bizCode) + String(Date.now()).slice(-2);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionInfo(request);
    if (!session) return UNAUTHENTICATED();
    const me = session.user;

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const statusFilter = (url.searchParams.get("status") || "").trim().toUpperCase();
    const bizFilter = Number(url.searchParams.get("businessId") || 0) || null;

    const allowed = await accessibleBusinessIds(me);
    const scoped = filterByAccess(await db.select().from(customerTrackings), allowed);

    const bizRows = await db.select().from(businesses);
    const bizName = (id: number) => bizRows.find((b) => b.id === id);

    let rows = scoped;
    if (bizFilter) rows = rows.filter((r) => r.businessId === bizFilter);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (q) {
      rows = rows.filter((r) => {
        const items = Array.isArray(r.items) ? r.items : [];
        return (
          r.trackingCode.toLowerCase().includes(q) ||
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.customerPhone || "").toLowerCase().includes(q) ||
          items.some((li: any) => String(li?.description || "").toLowerCase().includes(q))
        );
      });
    }
    rows = [...rows].sort(
      (a, b) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime(),
    );

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const counts = {
      total: scoped.length,
      active: scoped.filter((r) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(r.status)).length,
      dispatched: scoped.filter((r) => r.status === "DISPATCHED").length,
      ready: scoped.filter((r) => r.status === "READY").length,
      doneThisWeek: scoped.filter(
        (r) => ["DELIVERED", "COMPLETED"].includes(r.status) && new Date(r.updatedAt as any).getTime() >= sevenDaysAgo,
      ).length,
    };

    return NextResponse.json({
      success: true,
      meta: {
        scope: allowed === null ? "ALL" : allowed,
        counts,
        statuses: Object.keys(TRACK_STATUS_LABELS),
      },
      trackings: rows.slice(0, 300).map((r) => ({
        ...r,
        businessName: bizName(r.businessId)?.name || `Business #${r.businessId}`,
        businessCode: bizName(r.businessId)?.code || r.branchCode || "",
        allowedNext: nextStatuses(r.status, r.fulfillmentType).map((s) => ({
          status: s,
          label: TRACK_STATUS_LABELS[s as TrackStatus],
        })),
        trackUrl: `/track?code=${encodeURIComponent(r.trackingCode)}`,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/tracking error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionInfo(request);
    if (!session) return UNAUTHENTICATED();
    const me = session.user;

    const body = await request.json();
    const action = body.action;

    if (action === "CREATE") {
      const businessId = Number(body.businessId);
      if (!businessId) {
        return NextResponse.json({ success: false, error: "businessId is required." }, { status: 400 });
      }
      if (!(await canAccessBusiness(me, businessId))) return FORBIDDEN();

      const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
      if (!biz) {
        return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
      }

      const fulfillmentType = body.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP";
      const items = Array.isArray(body.items)
        ? body.items
            .filter((li: any) => li && String(li.description || "").trim())
            .map((li: any) => ({
              description: String(li.description).trim(),
              sku: li.sku || null,
              quantity: Number(li.quantity) || 1,
              unit: li.unit || null,
              unitPrice: Number(li.unitPrice) || 0,
              total: (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
            }))
        : [];
      const totalGhs =
        body.totalGhs != null && !Number.isNaN(Number(body.totalGhs))
          ? Number(body.totalGhs)
          : items.reduce((acc: number, li: any) => acc + li.total, 0);
      const customerName = String(body.customerName || "").trim() || "Walk-in Customer";

      const code = await uniqueTrackingCode(biz.code);
      const now = new Date();
      const note = String(body.note || "").trim();
      const history = [
        {
          status: "RECEIVED",
          at: now.toISOString(),
          by: me.name || "Staff",
          byRole: me.role || "WORKER",
          note: note || "Order received and registered for tracking.",
        },
      ];

      const [row] = await db
        .insert(customerTrackings)
        .values({
          trackingCode: code,
          businessId,
          branchCode: body.branchCode || biz.code || null,
          branchName: body.branchName || biz.branchLocation || biz.name || null,
          customerId: body.customerId ? Number(body.customerId) : null,
          customerName,
          customerPhone: String(body.customerPhone || "").trim() || null,
          saleDocumentId: body.saleDocumentId ? Number(body.saleDocumentId) : null,
          transactionId: body.transactionId ? Number(body.transactionId) : null,
          items,
          totalGhs,
          currency: "GHS",
          fulfillmentType,
          destinationAddress:
            fulfillmentType === "DELIVERY"
              ? String(body.destinationAddress || "").trim() || null
              : null,
          status: "RECEIVED",
          statusHistory: history,
          notes: note || null,
          createdByUserId: me.id,
          createdByName: me.name || "Staff",
          createdByRole: me.role || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return NextResponse.json({
        success: true,
        tracking: { ...row, businessName: biz.name, businessCode: biz.code },
        trackUrl: `/track?code=${encodeURIComponent(code)}`,
      });
    }

    if (action === "SET_STATUS") {
      const id = Number(body.id);
      const target = String(body.status || "").toUpperCase();
      if (!id || !target) {
        return NextResponse.json({ success: false, error: "id and status are required." }, { status: 400 });
      }
      const [row] = await db.select().from(customerTrackings).where(eq(customerTrackings.id, id));
      if (!row) {
        return NextResponse.json({ success: false, error: "Tracking not found." }, { status: 404 });
      }
      if (!(await canAccessBusiness(me, row.businessId))) return FORBIDDEN();
      if (!isValidTransition(row.status, target, row.fulfillmentType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot move from ${TRACK_STATUS_LABELS[row.status as TrackStatus] || row.status} to ${
              TRACK_STATUS_LABELS[target as TrackStatus] || target
            }. Allowed next: ${
              nextStatuses(row.status, row.fulfillmentType)
                .map((s) => TRACK_STATUS_LABELS[s])
                .join(", ") || "none — order is closed"
            }.`,
          },
          { status: 400 },
        );
      }

      const note = String(body.note || "").trim();
      const now = new Date();
      const history = [
        ...(Array.isArray(row.statusHistory) ? (row.statusHistory as any[]) : []),
        {
          status: target,
          at: now.toISOString(),
          by: me.name || "Staff",
          byRole: me.role || "WORKER",
          note: note || null,
        },
      ];
      const [updated] = await db
        .update(customerTrackings)
        .set({ status: target, statusHistory: history, updatedAt: now })
        .where(eq(customerTrackings.id, id))
        .returning();

      // Staff notification (bell) for the order creator when someone else advanced it.
      try {
        if (row.createdByUserId && row.createdByUserId !== me.id) {
          await db.insert(notifications).values({
            userId: row.createdByUserId,
            type: "ORDER_TRACKING_STATUS",
            title: `Order ${row.trackingCode} → ${TRACK_STATUS_LABELS[target as TrackStatus]}`,
            body: `${me.name || "A colleague"} moved this order to ${
              TRACK_STATUS_LABELS[target as TrackStatus]
            }${note ? ` — "${note}"` : ""}. Customer can see it live at /track.`,
            recordType: "customer_trackings",
            recordId: row.id,
            recordRef: row.trackingCode,
            businessId: row.businessId,
            branchCode: row.branchCode,
            actorName: me.name || "Staff",
          });
        }
      } catch (notifErr) {
        console.error("/api/tracking notify warning:", notifErr);
      }

      return NextResponse.json({ success: true, tracking: updated });
    }

    if (action === "LOCATION") {
      const id = Number(body.id);
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!id || Number.isNaN(lat) || Number.isNaN(lng)) {
        return NextResponse.json({ success: false, error: "id, lat and lng are required." }, { status: 400 });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ success: false, error: "Coordinates out of range." }, { status: 400 });
      }
      const [row] = await db.select().from(customerTrackings).where(eq(customerTrackings.id, id));
      if (!row) {
        return NextResponse.json({ success: false, error: "Tracking not found." }, { status: 404 });
      }
      if (!(await canAccessBusiness(me, row.businessId))) return FORBIDDEN();
      if (row.status !== "DISPATCHED") {
        return NextResponse.json(
          { success: false, error: "Live location can only be shared while the order is DISPATCHED." },
          { status: 409 },
        );
      }
      const [updated] = await db
        .update(customerTrackings)
        .set({
          driverLat: lat,
          driverLng: lng,
          driverLocationAt: new Date(),
          driverName: String(body.driverName || "").trim() || row.driverName || me.name || null,
          vehicleNote: String(body.vehicleNote || "").trim() || row.vehicleNote,
          updatedAt: new Date(),
        })
        .where(eq(customerTrackings.id, id))
        .returning();
      return NextResponse.json({ success: true, tracking: updated });
    }

    return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/tracking error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
