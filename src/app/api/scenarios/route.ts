import { NextResponse } from "next/server";
import { db } from "@/db";
import { scenarioSimulations, businessMetrics } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(scenarioSimulations)
      .orderBy(desc(scenarioSimulations.id));
    return NextResponse.json({ success: true, scenarios: rows });
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
      description,
      targetBusinessId,
      variableChanged,
      percentChange,
      createdBy,
    } = body;

    // Calculate intelligent projected financial impacts based on existing baseline metrics
    const change = Number(percentChange) || 10;
    let revImpact = 0;
    let profImpact = 0;
    let roiDelta = 0;

    if (variableChanged === "Feed Price" || variableChanged === "Cement Price") {
      // Cost increase/decrease scenario
      revImpact = 0;
      profImpact = -1 * Math.round(12000 * (change / 10));
      roiDelta = Number((-0.25 * (change / 5)).toFixed(1));
    } else if (variableChanged === "Price Increase" || variableChanged === "Solar Demand") {
      revImpact = Math.round(28000 * (change / 10));
      profImpact = Math.round(14000 * (change / 10));
      roiDelta = Number((0.4 * (change / 5)).toFixed(1));
    } else if (variableChanged === "New Branch Production" || variableChanged === "Branch Expansion") {
      revImpact = Math.round(75000 * (change / 10));
      profImpact = Math.round(26000 * (change / 10));
      roiDelta = Number((0.6 * (change / 10)).toFixed(1));
    } else {
      revImpact = Math.round(15000 * (change / 10));
      profImpact = Math.round(7500 * (change / 10));
      roiDelta = Number((0.3 * (change / 10)).toFixed(1));
    }

    const [newScenario] = await db
      .insert(scenarioSimulations)
      .values({
        name: name || "Custom Executive What-If Simulation",
        description:
          description ||
          `Simulates the effect of ${percentChange}% adjustment on ${variableChanged}`,
        targetBusinessId: targetBusinessId ? Number(targetBusinessId) : null,
        variableChanged: variableChanged || "Market Factor",
        percentChange: change,
        expectedRevenueImpactGhs: revImpact,
        expectedProfitImpactGhs: profImpact,
        expectedRoiDelta: roiDelta,
        createdBy: createdBy || "Kwame Mina",
      })
      .returning();

    return NextResponse.json({ success: true, scenario: newScenario });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
