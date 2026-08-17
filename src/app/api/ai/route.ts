import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiInsights } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(aiInsights).orderBy(desc(aiInsights.id));
    return NextResponse.json({ success: true, insights: rows });
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
    const { prompt, targetBusinessId } = body;

    // Intelligent AI Decision Advisor logic tailored for Ghanaian business dynamics
    let generatedTitle = "AI Strategic Recommendation: Operational Synergy";
    let generatedCategory = "EFFICIENCY";
    let generatedImpact = "HIGH";
    let generatedRecommendation = "";
    let generatedMetric = "Net Profit (+GH₵ 18,500)";
    let projectedGain = 18500;

    const lower = (prompt || "").toLowerCase();
    if (lower.includes("feed") || lower.includes("poultry") || lower.includes("maize")) {
      generatedTitle = "Maize & Concentrate Supply Hedge Strategy";
      generatedCategory = "EFFICIENCY";
      generatedImpact = "CRITICAL";
      generatedRecommendation =
        "AI Analysis indicates upcoming dry season feed price volatility. Establish a direct supply agreement with Eastern Region maize farmers and store 15 tons in Nsawam silos.";
      generatedMetric = "Feed Cost Margin (+14% savings)";
      projectedGain = 24000;
    } else if (lower.includes("block") || lower.includes("cement") || lower.includes("tema") || lower.includes("spintex")) {
      generatedTitle = "Spintex & Tema Bulk Aggregates Procurement Optimization";
      generatedCategory = "OPPORTUNITY";
      generatedImpact = "HIGH";
      generatedRecommendation =
        "Consolidate sand and quarry aggregate transport using 20-ton tipper trucks rather than daily deliveries to reduce Spintex freight costs by 18.5%.";
      generatedMetric = "Block Unit Profit (+GH₵ 1.80/block)";
      projectedGain = 31000;
    } else if (lower.includes("solar") || lower.includes("inverter") || lower.includes("tech") || lower.includes("electronic")) {
      generatedTitle = "Commercial Solar Hybrid Lease-to-Own Program";
      generatedCategory = "OPPORTUNITY";
      generatedImpact = "CRITICAL";
      generatedRecommendation =
        "Launch a 6-month MoMo-based installment payment plan for small restaurants and offices in Accra for 5kVA Solar Inverters. Projected conversion rate: 32%.";
      generatedMetric = "Quarterly Revenue (+GH₵ 110,000)";
      projectedGain = 45000;
    } else if (lower.includes("tilapia") || lower.includes("fish") || lower.includes("aqua") || lower.includes("water")) {
      generatedTitle = "Volta Basin Automated Solar Aeration Integration";
      generatedCategory = "EFFICIENCY";
      generatedImpact = "HIGH";
      generatedRecommendation =
        "Deploy solar-powered surface aerators in Akosombo Cages 1-4 during 3am-6am low-oxygen cycles. Predicts FCR drop from 1.32 to 1.22.";
      generatedMetric = "Biomass Yield (+11%)";
      projectedGain = 28500;
    } else if (lower.includes("expand") || lower.includes("branch") || lower.includes("kumasi") || lower.includes("takoradi")) {
      generatedTitle = "Strategic Multi-City Expansion Matrix";
      generatedCategory = "FORECAST";
      generatedImpact = "CRITICAL";
      generatedRecommendation =
        "Cross-business data shows Kumasi market ready for an integrated Block Factory & Express Car Wash hub. Expected break-even timeline is 7.2 months.";
      generatedMetric = "Enterprise ROI (+4.8% annually)";
      projectedGain = 85000;
    } else {
      generatedTitle = "Enterprise-Wide Working Capital Re-allocation";
      generatedCategory = "OPPORTUNITY";
      generatedImpact = "HIGH";
      generatedRecommendation =
        `Based on query '${prompt}': Allocate surplus weekend cash receipts from Mina Heritage Kitchen and Auto Wash to settle high-volume supplier invoices early for a 3% early-payment discount.`;
      generatedMetric = "Net Margin Enhancement (+GH₵ 19,200)";
      projectedGain = 19200;
    }

    const [newInsight] = await db
      .insert(aiInsights)
      .values({
        businessId: targetBusinessId ? Number(targetBusinessId) : null,
        title: generatedTitle,
        category: generatedCategory,
        impactLevel: generatedImpact,
        recommendation: generatedRecommendation,
        metricAffected: generatedMetric,
        projectedGainGhs: projectedGain,
        status: "NEW",
      })
      .returning();

    return NextResponse.json({ success: true, insight: newInsight });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
