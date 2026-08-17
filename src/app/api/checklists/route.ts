import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  checklistTemplates,
  checklistEntries,
  businesses,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Roles allowed to manage checklist templates and generate daily checklists.
const MANAGE_ROLES = ["OWNER", "GENERAL_MANAGER", "BRANCH_MANAGER"];

type TaskSeed = { taskKey: string; taskLabel: string; category: string };

// Default daily tasks per business — these mirror the lists each module
// historically used so existing behaviour stays exactly the same, and new
// modules get sensible operations checklists out of the box.
const DEFAULT_TASKS_BY_BUSINESS: Record<string, TaskSeed[]> = {
  "POULTRY-01": [
    { taskKey: "FEED_MORNING", taskLabel: "Morning feeding (all houses)", category: "FEEDING" },
    { taskKey: "WATER_CHECK", taskLabel: "Check & refill drinkers", category: "WATER" },
    { taskKey: "EGG_COLLECT_AM", taskLabel: "Morning egg collection", category: "PRODUCTION" },
    { taskKey: "MORTALITY_CHECK", taskLabel: "Remove & record mortalities", category: "HEALTH" },
    { taskKey: "FEED_EVENING", taskLabel: "Evening feeding (all houses)", category: "FEEDING" },
    { taskKey: "EGG_COLLECT_PM", taskLabel: "Afternoon egg collection", category: "PRODUCTION" },
    { taskKey: "HOUSE_CLEAN", taskLabel: "Clean houses & remove litter", category: "CLEANING" },
    { taskKey: "BIOSECURITY", taskLabel: "Footbath refresh & gate check", category: "SECURITY" },
  ],
  "BLOCK-01": [
    { taskKey: "MACHINE_STARTUP", taskLabel: "Start up & warm block molding machine", category: "MACHINERY" },
    { taskKey: "MIXER_INSPECTION", taskLabel: "Inspect mixer blades, belts & pallets", category: "MACHINERY" },
    { taskKey: "MATERIAL_COUNT", taskLabel: "Count cement, sand, quarry & water stock", category: "MATERIALS" },
    { taskKey: "FIRST_BATCH", taskLabel: "Start first production batch of the day", category: "PRODUCTION" },
    { taskKey: "QUALITY_SPOT_CHECK", taskLabel: "Quality spot-check on fresh blocks", category: "QUALITY" },
    { taskKey: "CURING_WATERING", taskLabel: "Water the curing yard & stacks", category: "PRODUCTION" },
    { taskKey: "DISPATCH_CONFIRM", taskLabel: "Confirm today's delivery dispatch plan", category: "DELIVERIES" },
    { taskKey: "YARD_CLEANING", taskLabel: "Clean yard & clear broken blocks", category: "CLEANING" },
    { taskKey: "GENERATOR_CHECK", taskLabel: "Generator fuel & oil level check", category: "MACHINERY" },
    { taskKey: "SITE_LOCKDOWN", taskLabel: "End-of-day store & site security lockdown", category: "SECURITY" },
  ],
  "AQUA-01": [
    { taskKey: "AERATION_CHECK", taskLabel: "Check aerators and oxygen meters", category: "WATER" },
    { taskKey: "DO_PH_TEST", taskLabel: "Test DO/pH in all ponds and cages", category: "WATER" },
    { taskKey: "FEED_MORNING", taskLabel: "Morning feeding (all ponds and cages)", category: "FEEDING" },
    { taskKey: "MORTALITY_CHECK", taskLabel: "Count and log mortalities", category: "HEALTH" },
    { taskKey: "FILTER_CLEAN", taskLabel: "Clean water filters", category: "CLEANING" },
    { taskKey: "SECURITY_CHECK", taskLabel: "Inspect moorings and biosecurity", category: "SECURITY" },
  ],
  "LIVESTOCK-01": [
    { taskKey: "HERD_COUNT", taskLabel: "Morning herd count & head check", category: "PRODUCTION" },
    { taskKey: "WATER_TROUGHS", taskLabel: "Fill & clean water troughs", category: "WATER" },
    { taskKey: "FEED_CONCENTRATE", taskLabel: "Feed concentrate & mineral licks", category: "FEEDING" },
    { taskKey: "HEALTH_SPOT", taskLabel: "Spot-check animals for illness/injury", category: "HEALTH" },
    { taskKey: "KRAAL_CLEAN", taskLabel: "Clean kraal & milking shed", category: "CLEANING" },
    { taskKey: "PASTURE_MOVE", taskLabel: "Move herds to pasture / grazing plan", category: "PRODUCTION" },
    { taskKey: "VACCINE_CHECK", taskLabel: "Check vaccination & deworming schedule", category: "HEALTH" },
    { taskKey: "NIGHT_PEN", taskLabel: "Pen & secure animals for the night", category: "SECURITY" },
  ],
  "FOOD-01": [
    { taskKey: "KITCHEN_SANITIZE", taskLabel: "Sanitize kitchen surfaces & utensils", category: "HYGIENE" },
    { taskKey: "FRIDGE_TEMPS", taskLabel: "Record fridge & freezer temperatures", category: "HEALTH" },
    { taskKey: "STOCK_CHECK", taskLabel: "Check ingredient stock & flag shortages", category: "STOCK" },
    { taskKey: "PREP_STATIONS", taskLabel: "Set up prep stations for service", category: "PRODUCTION" },
    { taskKey: "GAS_FIRE_CHECK", taskLabel: "Gas, burner & fire-safety check", category: "SECURITY" },
    { taskKey: "WASTE_DISPOSAL", taskLabel: "Dispose of waste & clean bins", category: "CLEANING" },
    { taskKey: "CASH_RECONCILE", taskLabel: "Reconcile cash & MoMo till", category: "FINANCE" },
    { taskKey: "CLOSING_CLEAN", taskLabel: "Closing deep clean & equipment shutdown", category: "CLEANING" },
  ],
  "TECH-01": [
    { taskKey: "SHOP_OPEN", taskLabel: "Open shop & switch on displays", category: "ADMIN" },
    { taskKey: "POS_FLOAT", taskLabel: "Verify POS & cash/MoMo float", category: "FINANCE" },
    { taskKey: "REPAIR_QUEUE", taskLabel: "Review repair queue & update customers", category: "PRODUCTION" },
    { taskKey: "PICKUP_FOLLOWUP", taskLabel: "Follow up pending customer pickups", category: "SALES" },
    { taskKey: "STOCK_FAST_MOVERS", taskLabel: "Count fast-moving stock (phones, accessories)", category: "STOCK" },
    { taskKey: "DEMO_WIPE", taskLabel: "Wipe & charge demo units", category: "CLEANING" },
    { taskKey: "ALARM_LOCKUP", taskLabel: "Activate alarm & lock up at close", category: "SECURITY" },
  ],
  "WASH-01": [
    { taskKey: "EQUIPMENT_CHECK", taskLabel: "Check pressure washers & vacuum units", category: "MACHINERY" },
    { taskKey: "CHEMICAL_STOCK", taskLabel: "Check shampoo, wax & chemical stock", category: "MATERIALS" },
    { taskKey: "WATER_TANK", taskLabel: "Verify water tank level & pump", category: "WATER" },
    { taskKey: "BAY_SETUP", taskLabel: "Set up & clean washing bays", category: "CLEANING" },
    { taskKey: "MOMO_FLOAT", taskLabel: "Record cash & MoMo opening float", category: "FINANCE" },
    { taskKey: "QC_FINISH", taskLabel: "Quality check finished vehicles before handover", category: "QUALITY" },
    { taskKey: "YARD_CLOSING", taskLabel: "Close bays, drain lines & store equipment", category: "SECURITY" },
  ],
};

const GENERIC_TASKS: TaskSeed[] = [
  { taskKey: "OPEN_SITE", taskLabel: "Open site & equipment check", category: "ADMIN" },
  { taskKey: "STOCK_CHECK", taskLabel: "Stock & materials count", category: "STOCK" },
  { taskKey: "SALES_RECON", taskLabel: "Reconcile sales & payments", category: "FINANCE" },
  { taskKey: "CLEAN_CLOSE", taskLabel: "Clean & secure site at close", category: "CLEANING" },
];

// Seed the template master list for a business exactly once.
async function ensureTemplates(businessId: number, branchCode: string | null, bizCode: string | undefined) {
  const existing = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.businessId, businessId));
  if (existing.length > 0) return existing;
  const seeds = (bizCode && DEFAULT_TASKS_BY_BUSINESS[bizCode]) || GENERIC_TASKS;
  const rows = [];
  for (let i = 0; i < seeds.length; i++) {
    const t = seeds[i];
    const [row] = await db
      .insert(checklistTemplates)
      .values({
        businessId,
        branchCode,
        taskKey: t.taskKey,
        taskLabel: t.taskLabel,
        category: t.category,
        sortOrder: i + 1,
        isActive: true,
      })
      .returning();
    rows.push(row);
  }
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = Number(searchParams.get("businessId"));
    if (!businessId) {
      return NextResponse.json({ success: false, error: "businessId required" }, { status: 400 });
    }
    const branchCode = searchParams.get("branchCode");
    const date = searchParams.get("date");

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    const templates = await ensureTemplates(businessId, branchCode || biz?.code || null, biz?.code);

    let entryQuery = db.select().from(checklistEntries).where(eq(checklistEntries.businessId, businessId));
    let entries = await entryQuery;
    if (date) entries = entries.filter((e: any) => e.checklistDate === date);

    return NextResponse.json({
      success: true,
      templates: templates
        .slice()
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.id || 0) - (b.id || 0)),
      entries: entries.slice().sort((a: any, b: any) => (a.id || 0) - (b.id || 0)),
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
    const role = String(data?.createdByRole || data?.role || "").toUpperCase();
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    const branchCode = data.branchCode || biz?.code || null;
    const today = new Date().toISOString().split("T")[0];

    const needsManage = entity === "TEMPLATE" || entity === "GENERATE";
    if (needsManage && !MANAGE_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Only the Owner or an authorized manager can create or change checklists" },
        { status: 403 },
      );
    }

    // ── TEMPLATE: add a new checklist item to the master list ─────────
    if (entity === "TEMPLATE") {
      const label = String(data.taskLabel || "").trim();
      if (!label) {
        return NextResponse.json({ success: false, error: "Task label is required" }, { status: 400 });
      }
      const templates = await ensureTemplates(businessId, branchCode, biz?.code);
      const taskKey =
        String(data.taskKey || label)
          .toUpperCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^A-Z0-9_&-]/g, "") || `TASK_${Date.now()}`;
      if (templates.some((t: any) => t.taskKey === taskKey)) {
        return NextResponse.json({ success: false, error: `"${taskKey}" already exists in this checklist` }, { status: 409 });
      }
      const maxSort = Math.max(0, ...templates.map((t: any) => t.sortOrder || 0));
      const [row] = await db
        .insert(checklistTemplates)
        .values({
          businessId,
          branchCode,
          taskKey,
          taskLabel: label,
          category: data.category || "GENERAL",
          sortOrder: maxSort + 1,
          isActive: true,
          assignedToUserId: data.assignedToUserId ? Number(data.assignedToUserId) : null,
          assignedToName: data.assignedToName || null,
          assignedToRole: data.assignedToRole || null,
          createdByName: data.createdByName || null,
          createdByRole: data.createdByRole || null,
        })
        .returning();
      return NextResponse.json({ success: true, item: row });
    }

    // ── GENERATE: build the checklist for a date from ACTIVE templates ─
    if (entity === "GENERATE") {
      const targetDate = data.checklistDate || today;
      await ensureTemplates(businessId, branchCode, biz?.code);
      const existing = await db
        .select()
        .from(checklistEntries)
        .where(
          and(
            eq(checklistEntries.businessId, businessId),
            eq(checklistEntries.checklistDate, targetDate),
          ),
        );
      if (existing.length > 0) {
        return NextResponse.json({ success: true, items: existing, alreadyExists: true });
      }
      const active = (
        await db.select().from(checklistTemplates).where(eq(checklistTemplates.businessId, businessId))
      )
        .filter((t: any) => t.isActive !== false)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.id || 0) - (b.id || 0));
      const rows = [];
      for (const t of active) {
        const [row] = await db
          .insert(checklistEntries)
          .values({
            businessId,
            branchCode,
            checklistDate: targetDate,
            templateId: t.id,
            taskKey: t.taskKey,
            taskLabel: t.taskLabel,
            category: t.category || "GENERAL",
            assignedToUserId: t.assignedToUserId || null,
            assignedToName: t.assignedToName || null,
            assignedToRole: t.assignedToRole || null,
            isCompleted: false,
          })
          .returning();
        rows.push(row);
      }
      return NextResponse.json({ success: true, items: rows });
    }

    return NextResponse.json({ success: false, error: `Unknown entity: ${entity}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, id, data } = body;
    if (!entity || !id) {
      return NextResponse.json({ success: false, error: "entity and id required" }, { status: 400 });
    }

    // ── ENTRY: toggle task completion, stamping user / role / time ─────
    if (entity === "ENTRY") {
      const [existing] = await db
        .select()
        .from(checklistEntries)
        .where(eq(checklistEntries.id, Number(id)));
      if (!existing) {
        return NextResponse.json({ success: false, error: "Checklist task not found" }, { status: 404 });
      }
      const nowCompleted = !existing.isCompleted;
      const [row] = await db
        .update(checklistEntries)
        .set({
          isCompleted: nowCompleted,
          completedByName: nowCompleted ? data?.completedByName || "Staff" : null,
          completedByRole: nowCompleted ? data?.completedByRole || null : null,
          completedAt: nowCompleted ? new Date() : null,
          notes: data?.notes !== undefined ? data.notes : existing.notes,
        })
        .where(eq(checklistEntries.id, Number(id)))
        .returning();
      return NextResponse.json({ success: true, item: row });
    }

    // ── TEMPLATE: edit label/category/assignment or activate/deactivate ─
    if (entity === "TEMPLATE") {
      const role = String(data?.role || data?.updatedByRole || "").toUpperCase();
      if (!MANAGE_ROLES.includes(role)) {
        return NextResponse.json(
          { success: false, error: "Only the Owner or an authorized manager can edit checklist items" },
          { status: 403 },
        );
      }
      const [existing] = await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, Number(id)));
      if (!existing) {
        return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
      }
      const [row] = await db
        .update(checklistTemplates)
        .set({
          taskLabel: data.taskLabel !== undefined ? String(data.taskLabel).trim() || existing.taskLabel : existing.taskLabel,
          category: data.category !== undefined ? data.category : existing.category,
          sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : existing.sortOrder,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
          assignedToUserId: data.assignedToUserId !== undefined ? (data.assignedToUserId ? Number(data.assignedToUserId) : null) : existing.assignedToUserId,
          assignedToName: data.assignedToName !== undefined ? data.assignedToName : existing.assignedToName,
          assignedToRole: data.assignedToRole !== undefined ? data.assignedToRole : existing.assignedToRole,
          updatedAt: new Date(),
        })
        .where(eq(checklistTemplates.id, Number(id)))
        .returning();
      return NextResponse.json({ success: true, item: row });
    }

    return NextResponse.json({ success: false, error: `Unknown entity: ${entity}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    const role = String(searchParams.get("role") || "").toUpperCase();
    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }
    if (!MANAGE_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Only the Owner or an authorized manager can remove checklist items" },
        { status: 403 },
      );
    }
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
