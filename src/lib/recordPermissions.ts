import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Shared-record access control for Transactions & MoMo, Suppliers & Vendors
 * and Employees & Payroll.
 *
 * Rules:
 *  • The OWNER can ALWAYS add, edit and delete records.
 *  • Any other user (GENERAL_MANAGER / BRANCH_MANAGER / …) may only manage or
 *    delete when the OWNER has granted the `canManageRecords` flag on their
 *    account.
 *
 * The actor is ALWAYS resolved from the database by id — client-supplied role
 * or permission flags are never trusted.
 */
export async function resolveRecordActor(actorUserId: number | null | undefined) {
  const id = Number(actorUserId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export function canManageSharedRecords(user: any): boolean {
  if (!user) return false;
  return user.role === "OWNER" || user.canManageRecords === true;
}
