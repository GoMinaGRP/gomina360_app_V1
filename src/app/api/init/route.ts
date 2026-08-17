import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  businesses,
  businessMetrics,
  customers,
  suppliers,
  employees,
  assets,
  inventoryItems,
  transactions,
  poultryLogs,
  blockFactoryLogs,
  aquacultureLogs,
  livestockLogs,
  restaurantLogs,
  electronicsLogs,
  carWashLogs,
  aiInsights,
  scenarioSimulations,
  integrations,
  checklistTemplates,
  checklistEntries,
} from "@/db/schema";
import { seedDatabase } from "@/db/seed";

export async function GET() {
  try {
    // Run seed if database is empty
    await seedDatabase();

    const allBusinesses = await db.select().from(businesses).orderBy(businesses.id);
    const allMetrics = await db.select().from(businessMetrics);
    const allUsers = await db.select().from(users).orderBy(users.id);
    const allCustomers = await db.select().from(customers);
    const allSuppliers = await db.select().from(suppliers);
    const allEmployees = await db.select().from(employees);
    const allAssets = await db.select().from(assets);
    const allInventory = await db.select().from(inventoryItems);
    const allTransactions = await db.select().from(transactions);
    const allAiInsights = await db.select().from(aiInsights);
    const allScenarios = await db.select().from(scenarioSimulations);
    const allIntegrations = await db.select().from(integrations);
    // Unified enterprise daily checklists (master items + dated completions)
    const allChecklistTemplates = await db.select().from(checklistTemplates);
    const allChecklistEntries = await db.select().from(checklistEntries);

    // Specialized logs
    const poultry = await db.select().from(poultryLogs);
    const blockFactory = await db.select().from(blockFactoryLogs);
    const aquaculture = await db.select().from(aquacultureLogs);
    const livestock = await db.select().from(livestockLogs);
    const restaurant = await db.select().from(restaurantLogs);
    const electronics = await db.select().from(electronicsLogs);
    const carWash = await db.select().from(carWashLogs);

    return NextResponse.json({
      success: true,
      businesses: allBusinesses,
      metrics: allMetrics,
      users: allUsers,
      customers: allCustomers,
      suppliers: allSuppliers,
      employees: allEmployees,
      assets: allAssets,
      inventory: allInventory,
      transactions: allTransactions,
      aiInsights: allAiInsights,
      scenarios: allScenarios,
      integrations: allIntegrations,
      checklists: {
        templates: allChecklistTemplates,
        entries: allChecklistEntries,
      },
      specializedLogs: {
        poultry,
        blockFactory,
        aquaculture,
        livestock,
        restaurant,
        electronics,
        carWash,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/init:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize database" },
      { status: 500 }
    );
  }
}
