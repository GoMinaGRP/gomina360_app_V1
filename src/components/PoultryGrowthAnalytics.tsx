"use client";

import React, { useMemo, useState } from "react";
import {
  Activity, Bird, Egg, Wheat, TrendingUp, TrendingDown, HeartPulse,
  Target, Sliders, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart,
} from "recharts";
import {
  computePoultryPerformance,
  type PoultryPerfFilters,
} from "@/lib/poultryPerformance";

interface Props {
  flocks: any[];
  feedLogs: any[];
  healthRecords: any[];
  production: any[];
  /** Parent dashboard quick filters (date range + product type). */
  dateFilter: string;
  productFilter: string;
}

const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", fontSize: 11 };

function Empty({ tid, children }: { tid: string; children: React.ReactNode }) {
  return (
    <p data-testid={tid} className="text-xs text-slate-500 text-center py-10">
      {children}
    </p>
  );
}

function ChartCard({
  title, icon: Icon, tid, children,
}: { title: string; icon: any; tid: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl overflow-hidden min-w-0" data-testid={tid}>
      <div className="px-4 py-2.5 border-b border-slate-700/60 flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-400" />
        <h4 className="text-xs font-bold text-white">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/**
 * Production & Growth Analytics panel for the Poultry dashboard: daily
 * weight/growth vs target, feed consumption, FCR, mortality, broiler output,
 * lay target-vs-actual, average weight by age + KPI chips — with Batch,
 * Flock and Branch filters on top of the dashboard's date/product filters.
 */
export default function PoultryGrowthAnalytics({
  flocks, feedLogs, healthRecords, production, dateFilter, productFilter,
}: Props) {
  const [batch, setBatch] = useState("ALL");
  const [flockId, setFlockId] = useState<number | null>(null);
  const [branch, setBranch] = useState("ALL");

  const filters: PoultryPerfFilters = useMemo(
    () => ({ dateFilter, productFilter, batchNumber: batch, flockId, branchCode: branch }),
    [dateFilter, productFilter, batch, flockId, branch],
  );

  const perf = useMemo(
    () => computePoultryPerformance({ flocks, feedLogs, healthRecords, production }, filters),
    [flocks, feedLogs, healthRecords, production, filters],
  );

  const batchOptions = useMemo(
    () => [...new Set(flocks.map((f) => f.batchNumber).filter(Boolean))].sort(),
    [flocks],
  );
  const flockOptions = useMemo(
    () =>
      flocks
        .filter((f) => batch === "ALL" || f.batchNumber === batch)
        .map((f) => ({ id: f.id, label: f.flockName || f.batchNumber, code: f.batchNumber })),
    [flocks, batch],
  );
  const branchOptions = useMemo(
    () => [...new Set(flocks.map((f) => f.branchCode).filter(Boolean))].sort(),
    [flocks],
  );

  const sel =
    "w-full sm:w-auto min-w-0 max-w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500";
  const Lab = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] text-slate-500 mb-1">{children}</label>
  );
  const hasCustom = batch !== "ALL" || flockId != null || branch !== "ALL";

  const Chip = ({ label, value, sub, tone = "emerald", tid }: any) => (
    <div className="bg-slate-900/70 border border-slate-700/70 rounded-lg px-3 py-2" data-testid={tid}>
      <div className="text-[9px] uppercase font-bold text-slate-500">{label}</div>
      <div className={`text-sm font-extrabold text-${tone}-400`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
    </div>
  );
  const k = perf.kpis;

  return (
    <div
      data-testid="poa-root"
      className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="px-5 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white">Production &amp; Growth Analytics</h3>
            <p className="text-[10px] text-slate-400">
              Weight &amp; growth, feed, FCR, mortality, broiler output and lay targets — filtered with the dashboard date/product range.
            </p>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          {perf.growthTrend.length + perf.feedDaily.length + perf.fcrTrend.length + perf.mortalityDaily.length + perf.broilerDaily.length + perf.layTrend.length + perf.eggDaily.length} series points
        </div>
      </div>

      {/* Scope filters: Batch / Flock / Branch */}
      <div className="px-4 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <Lab>Batch</Lab>
          <select data-testid="poa-filter-batch" value={batch} onChange={(e) => { setBatch(e.target.value); setFlockId(null); }} className={sel}>
            <option value="ALL">All Batches</option>
            {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <Lab>Flock</Lab>
          <select data-testid="poa-filter-flock" value={flockId ?? "ALL"} onChange={(e) => setFlockId(e.target.value === "ALL" ? null : Number(e.target.value))} className={sel}>
            <option value="ALL">All Flocks</option>
            {flockOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <Lab>Branch</Lab>
          <select data-testid="poa-filter-branch" value={branch} onChange={(e) => setBranch(e.target.value)} className={sel}>
            <option value="ALL">All Branches</option>
            {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {hasCustom && (
          <button
            onClick={() => { setBatch("ALL"); setFlockId(null); setBranch("ALL"); }}
            data-testid="poa-filter-reset"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* KPI chips */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2" data-testid="poa-kpis">
        <Chip tid="poa-kpi-gain" label="Avg Daily Gain" value={k.avgDailyGainG != null ? `${k.avgDailyGainG} g` : "—"} sub="from weight samples" icon={TrendingUp} />
        <Chip tid="poa-kpi-feed-bird" label="Feed / Bird / Day" value={k.feedPerBirdG != null ? `${k.feedPerBirdG} g` : "—"} sub={`${k.totalFeedKg} kg in range`} tone="amber" />
        <Chip tid="poa-kpi-fcr" label="Avg FCR" value={k.avgFcr ?? "—"} sub="kg feed per kg gain" tone="cyan" />
        <Chip tid="poa-kpi-livability" label="Livability" value={k.livabilityPct != null ? `${k.livabilityPct.toFixed(2)}%` : "—"} sub={`${k.totalDeaths} deaths`} tone={k.livabilityPct != null && k.livabilityPct < 95 ? "rose" : "emerald"} />
        <Chip tid="poa-kpi-peaklay" label="Peak Lay" value={k.peakLayPct != null ? `${k.peakLayPct}%` : "—"} sub="actual in range" tone="purple" />
        <Chip tid="poa-kpi-eggs-hen" label="Eggs / Hen / Day" value={k.eggsPerHenDay != null ? k.eggsPerHenDay.toFixed(2) : "—"} sub={`${k.eggs.toLocaleString()} eggs`} tone="amber" />
        <Chip tid="poa-kpi-harvest" label="Harvested" value={k.birdsHarvested.toLocaleString()} sub="broilers (birds)" tone="cyan" />
        <Chip tid="poa-kpi-placed" label="Birds Placed" value={k.placed.toLocaleString()} sub="in selected scope" />
      </div>

      {/* Charts */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1 — Daily bird weight / growth trend */}
        <ChartCard title="Daily Bird Weight & Growth Trend" icon={TrendingUp} tid="poa-chart-growth">
          {perf.growthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={perf.growthTrend}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} tickFormatter={(v: number) => `${v}kg`} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="avgWeightKg" name="Actual weight (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="targetKg" name="Breed target (kg)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-growth">No live-weight samples in this scope — log Broiler Weight records to see growth.</Empty>}
        </ChartCard>

        {/* 2 — Average weight by flock age */}
        <ChartCard title="Average Weight by Age (weekly)" icon={Bird} tid="poa-chart-weight-age">
          {perf.weightByAge.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={perf.weightByAge}>
                <XAxis dataKey="age" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} tickFormatter={(v: number) => `${v}kg`} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="avgWeightKg" name="Actual (kg)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="targetKg" name="Target (kg)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-weight-age">No age-bucketed weights yet.</Empty>}
        </ChartCard>

        {/* 3 — Daily feed consumption */}
        <ChartCard title="Daily Feed Consumption (kg)" icon={Wheat} tid="poa-chart-feed">
          {perf.feedDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={perf.feedDaily}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="kg" name="Feed (kg)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-feed">No feed consumption entries in this scope.</Empty>}
        </ChartCard>

        {/* 4 — FCR trend */}
        <ChartCard title="Feed Conversion Ratio (FCR)" icon={Sliders} tid="poa-chart-fcr">
          {perf.fcrTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={perf.fcrTrend}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} domain={[0, "auto"]} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="fcr" name="FCR (kg feed / kg gain)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-fcr">No FCR records yet — record broiler weight with feed intake to track FCR.</Empty>}
        </ChartCard>

        {/* 5 — Mortality rate trend */}
        <ChartCard title="Mortality Rate Trend" icon={HeartPulse} tid="poa-chart-mortality"
        >
          {perf.mortalityDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={perf.mortalityDaily}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis yAxisId="l" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis yAxisId="r" orientation="right" stroke="#fda4af" style={{ fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="deaths" name="Deaths / day" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="r" type="monotone" dataKey="cumMortPct" name="Cumulative %" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-mortality">No mortality events logged in this scope.</Empty>}
        </ChartCard>

        {/* 6 — Broiler production trend */}
        <ChartCard title="Broiler Production Trend (harvests)" icon={Bird} tid="poa-chart-broiler">
          {perf.broilerDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={perf.broilerDaily}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="harvested" name="Birds harvested" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="weightKg" name="Total weight (kg)" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-broiler">No broiler harvests recorded in this scope.</Empty>}
        </ChartCard>

        {/* 7 — Lay: target vs actual */}
        <ChartCard title="Production Targets vs Actual (Lay %)" icon={Target} tid="poa-chart-targets">
          {perf.layTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={perf.layTrend}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="layPct" name="Actual lay %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="targetPct" name="Target lay %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-targets">No lay % entries in this scope.</Empty>}
        </ChartCard>

        {/* 8 — Egg output trend (same scope) */}
        <ChartCard title="Egg Output Trend (pieces/day)" icon={Egg} tid="poa-chart-eggs">
          {perf.eggDaily.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={perf.eggDaily}>
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 9 }} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="eggs" name="Eggs (pieces)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty tid="poa-empty-eggs">No egg collections recorded in this scope.</Empty>}
        </ChartCard>
      </div>
    </div>
  );
}
