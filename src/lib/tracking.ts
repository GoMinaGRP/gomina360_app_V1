/**
 * Customer Order Tracking — shared domain logic.
 *
 * Every customer order carries a unique, unguessable tracking code
 * (GM-<BUSINESS>-<6 chars>). Staff manage the order through the
 * Customer Tracking console; customers follow ONLY their own order on the
 * public /track page (no login). The chain is anchored to
 * Business → Branch → Customer → Order (sale document/transaction) → Products.
 */

export const TRACK_STATUSES = [
  "RECEIVED",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TrackStatus = (typeof TRACK_STATUSES)[number];

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  RECEIVED: "Order Received",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY: "Ready for Pickup",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TERMINAL_STATUSES: TrackStatus[] = ["DELIVERED", "COMPLETED", "CANCELLED"];

/**
 * Allowed next statuses. Delivery orders flow …→ PROCESSING → DISPATCHED →
 * DELIVERED; pickup orders flow …→ PROCESSING → READY → COMPLETED. READY →
 * DISPATCHED covers orders switched to delivery after prep.
 */
export const ALLOWED_TRANSITIONS: Record<TrackStatus, TrackStatus[]> = {
  RECEIVED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY", "DISPATCHED", "CANCELLED"],
  READY: ["COMPLETED", "DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** Next statuses valid for THIS order (dispatching needs DELIVERY fulfillment). */
export function nextStatuses(status: string, fulfillmentType: string): TrackStatus[] {
  const opts = ALLOWED_TRANSITIONS[(status as TrackStatus) || "RECEIVED"] || [];
  return opts.filter((s) => s !== "DISPATCHED" || fulfillmentType === "DELIVERY");
}

export function isValidTransition(from: string, to: string, fulfillmentType: string): boolean {
  return nextStatuses(from, fulfillmentType).includes(to as TrackStatus);
}

/** Customer-facing 5-step journey index (0-based) for the public stepper. */
export function journeyStep(status: string): number {
  switch (status) {
    case "CONFIRMED":
      return 1;
    case "PROCESSING":
      return 2;
    case "READY":
    case "DISPATCHED":
      return 3;
    case "DELIVERED":
    case "COMPLETED":
      return 4;
    default:
      return 0; // RECEIVED
  }
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ2345679"; // no I/L/O/0/1 — hard to misread

export function randomCodePart(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** GM-<BUSINESSWORD>-<6RANDOM>, e.g. GM-POULTRY-4K7XQ2. */
export function buildTrackingCode(bizCode: string | null | undefined): string {
  const word = String(bizCode || "HQ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .trim()
    .split(/\s+/)[0]
    .slice(0, 8) || "HQ";
  return `GM-${word}-${randomCodePart(6)}`;
}

export function looksLikeTrackingCode(s: string): boolean {
  return /^GM-[A-Z0-9]{1,8}-[A-Z0-9]{4,10}$/.test(s);
}

/** Normalize customer-typed codes: trim, uppercase, drop inner spaces. */
export function normalizeTrackingCode(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  GENERAL_MANAGER: "General Manager",
  BRANCH_MANAGER: "Branch Manager",
  WORKER: "Branch staff",
};

/**
 * Public payload — ONLY what is linked to this one tracking code.
 * Never leaks: customer phone, internal ids, staff account ids, other
 * orders, or any business data beyond the name of the selling unit.
 */
export function publicTrackingPayload(row: any, businessName: string) {
  const live =
    row.status === "DISPATCHED" && row.driverLat != null && row.driverLng != null
      ? {
          lat: row.driverLat,
          lng: row.driverLng,
          at: row.driverLocationAt ? new Date(row.driverLocationAt).toISOString() : null,
          driverName: row.driverName || null,
          vehicleNote: row.vehicleNote || null,
        }
      : null;
  return {
    code: row.trackingCode,
    businessName,
    businessCode: row.branchCode || null,
    branchName: row.branchName || null,
    customerName: row.customerName,
    items: (row.items || []).map((li: any) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit || null,
      unitPrice: li.unitPrice ?? null,
      total: li.total ?? null,
    })),
    totalGhs: row.totalGhs ?? null,
    currency: row.currency || "GHS",
    fulfillmentType: row.fulfillmentType,
    destinationAddress:
      row.fulfillmentType === "DELIVERY" ? row.destinationAddress || null : null,
    status: row.status,
    statusLabel: TRACK_STATUS_LABELS[row.status as TrackStatus] || row.status,
    isTerminal: TERMINAL_STATUSES.includes(row.status),
    journeyStep: row.status === "CANCELLED" ? null : journeyStep(row.status),
    placedAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    history: (row.statusHistory || []).map((h: any) => ({
      status: h.status,
      label: TRACK_STATUS_LABELS[h.status as TrackStatus] || h.status,
      at: h.at,
      by: ROLE_LABELS[h.byRole] || "Staff",
      note: h.note || null,
    })),
    live,
    trackUrl: `/track?code=${encodeURIComponent(row.trackingCode)}`,
  };
}
