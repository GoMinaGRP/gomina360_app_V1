import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const businessIdFilter = searchParams.get("businessId");

    let query = db.select().from(users).orderBy(desc(users.id));

    // If filtering by role and businessId, apply both
    if (roleFilter && businessIdFilter) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.assignedBusinessId, Number(businessIdFilter)))
        .orderBy(desc(users.id));
      const filtered = rows.filter((u) => u.role === roleFilter);
      return NextResponse.json({ success: true, users: filtered });
    }

    if (roleFilter) {
      const rows = await query;
      const filtered = rows.filter((u) => u.role === roleFilter);
      return NextResponse.json({ success: true, users: filtered });
    }

    if (businessIdFilter) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.assignedBusinessId, Number(businessIdFilter)))
        .orderBy(desc(users.id));
      return NextResponse.json({ success: true, users: rows });
    }

    const rows = await query;
    return NextResponse.json({ success: true, users: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      role,
      assignedBusinessId,
      phone,
      avatarUrl,
      region,
      district,
      town,
      createdByUserId,
      canRecordSales,
      canRecordExpenses,
      canManageStock,
      canExportData,
    } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    // WORKER must have an assigned business
    if (role === "WORKER" && !assignedBusinessId) {
      return NextResponse.json(
        { success: false, error: "WORKER must be assigned to a business branch" },
        { status: 400 }
      );
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        role,
        assignedBusinessId: assignedBusinessId ? Number(assignedBusinessId) : null,
        phone: phone || "+233 24 000 0000",
        avatarUrl:
          avatarUrl ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
        region: region || null,
        district: district || null,
        town: town || null,
        isActive: true,
        isWorkerEnabled: role === "WORKER" ? true : undefined,
        createdByUserId: createdByUserId ? Number(createdByUserId) : null,
        canRecordSales: role === "WORKER" ? (canRecordSales ?? true) : undefined,
        canRecordExpenses: role === "WORKER" ? (canRecordExpenses ?? false) : undefined,
        canManageStock: role === "WORKER" ? (canManageStock ?? false) : undefined,
        canExportData: ["OWNER", "GENERAL_MANAGER"].includes(role)
          ? true
          : Boolean(canExportData ?? false),
      })
      .returning();

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      requestingUserRole,
      name,
      email,
      phone,
      role,
      assignedBusinessId,
      region,
      district,
      town,
      isActive,
      isWorkerEnabled,
      canRecordSales,
      canRecordExpenses,
      canManageStock,
      canExportData,
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Security check: GENERAL_MANAGER cannot modify OWNER accounts or OWNER permissions
    if (requestingUserRole === "GENERAL_MANAGER" && targetUser.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "GENERAL_MANAGER is unauthorized to modify the OWNER account or permissions" },
        { status: 403 }
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name !== undefined ? name : targetUser.name,
        email: email !== undefined ? email : targetUser.email,
        phone: phone !== undefined ? phone : targetUser.phone,
        role: role !== undefined ? role : targetUser.role,
        assignedBusinessId: assignedBusinessId !== undefined ? (assignedBusinessId ? Number(assignedBusinessId) : null) : targetUser.assignedBusinessId,
        region: region !== undefined ? region || null : targetUser.region,
        district: district !== undefined ? district || null : targetUser.district,
        town: town !== undefined ? town || null : targetUser.town,
        isActive: isActive !== undefined ? Boolean(isActive) : targetUser.isActive,
        isWorkerEnabled: isWorkerEnabled !== undefined ? Boolean(isWorkerEnabled) : targetUser.isWorkerEnabled,
        canRecordSales: canRecordSales !== undefined ? Boolean(canRecordSales) : targetUser.canRecordSales,
        canRecordExpenses: canRecordExpenses !== undefined ? Boolean(canRecordExpenses) : targetUser.canRecordExpenses,
        canManageStock: canManageStock !== undefined ? Boolean(canManageStock) : targetUser.canManageStock,
        canExportData: canExportData !== undefined ? Boolean(canExportData) : targetUser.canExportData,
      })
      .where(eq(users.id, Number(userId)))
      .returning();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const requestingUserRole = searchParams.get("requestingUserRole");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Security check: GENERAL_MANAGER cannot delete OWNER accounts
    if (requestingUserRole === "GENERAL_MANAGER" && targetUser.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "GENERAL_MANAGER cannot delete OWNER accounts" },
        { status: 403 }
      );
    }

    await db.delete(users).where(eq(users.id, Number(userId)));
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
