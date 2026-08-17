"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes, Package, Truck, Wallet, AlertTriangle, CheckCircle, Settings,
  Users, Plus, X, Calendar, Filter, TrendingUp, TrendingDown, Loader2,
  Building2, Wrench, Activity, ShoppingCart,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { CurrencyCode, formatMoney } from "@/lib/currency";

interface Props {
  currentUser: any;
  businessInfo: any;
  businessMetrics: any;
  inventory: any[];
  transactions: any[];
  assets: any[];
  employees: any[];
  currentCurrency: CurrencyCode;
  onRefreshData: () => void;
}

type FormType = "PRODUCTION" | "ORDER" | "DELIVERY" | "EXPENSE" | null;

const BLOCK_TYPES = ["6-INCH-SOLID", "6-INCH-HOLLOW", "5-INCH-SOLID", "PAVING-BRICKS"];

export default function BlockFactoryModule({
  currentUser, businessInfo, businessMetrics, inventory, transactions, assets,
  employees, currentCurrency, onRefreshData,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [production, setProduction] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState<FormType>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [dateFilter, setDateFilter] = useState("ALL");
  const [blockTypeFilter, setBlockTypeFilter] = useState("ALL");

  const bizId = businessInfo?.id;
  const today = new Date().toISOString().split("T")[0];

  const refresh = useCallback(async () => {
    if (!bizId) return;
    try {
      const res = await fetch(`/api/block-factory?businessId=${bizId}`);
      const d = await res.json();
      if (d.success) {
        setProduction(d.production || []);
        setOrders(d.orders || []);
        setDeliveries(d.deliveries || []);
      }
    } finally {
      setLoading(false);
    }
  }, [bizId]);

  useEffect(() => { refresh(); }, [refresh]);

  const branchInventory = inventory.filter((i) => i.businessId === bizId);
  const branchAssets = assets.filter((a) => a.businessId === bizId);
  const branchEmployees = employees.filter((e) => e.businessId === bizId);
  const branchTransactions = transactions.filter((t) => t.businessId === bizId);

  const filterByDate = (date?: string) => {
    if (!dateFilter || dateFilter === "ALL") return true;
    return date === dateFilter;
  };

  const filteredProduction = production.filter((p) =>
    filterByDate(p.recordedDate) && (blockTypeFilter === "ALL" || p.blockType === blockTypeFilter)
  );
  const filteredTransactions = branchTransactions.filter((t) =>
    filterByDate(t.date) && (blockTypeFilter === "ALL" || (t.description || "").includes(blockTypeFilter))
  );

  // KPI calculations
  const blocksToday = production
    .filter((p) => p.recordedDate === today)
    .reduce((s, p) => s + (p.blocksMolded || 0) - (p.blocksBroken || 0), 0);
  const blockStock = branchInventory
    .filter((i) => /block|brick|paving/i.test(`${i.name} ${i.category}`))
    .reduce((s, i) => s + (i.quantity || 0), 0);
  const salesToday = branchTransactions.filter((t) => t.type === "INCOME" && t.date === today);
  const revenueToday = salesToday.reduce((s, t) => s + (t.amountGhs || 0), 0);
  const expensesToday = branchTransactions
    .filter((t) => t.type === "EXPENSE" && t.date === today)
    .reduce((s, t) => s + (t.amountGhs || 0), 0);
  const netProfit = revenueToday - expensesToday;
  const pendingOrders = orders.filter((o) => ["PENDING", "IN_PROGRESS"].includes(o.status)).length;
  const activeDeliveries = deliveries.filter((d) => ["SCHEDULED", "IN_TRANSIT"].includes(d.status)).length;
  const workersPresent = branchEmployees.filter((e) => e.status === "ACTIVE").length;

  const rawMaterials = {
    cement: branchInventory.find((i) => /cement/i.test(`${i.name} ${i.category}`)),
    sand: branchInventory.find((i) => /sand/i.test(`${i.name} ${i.category}`)),
    quarry: branchInventory.find((i) => /quarry/i.test(`${i.name} ${i.category}`)),
    water: branchInventory.find((i) => /water/i.test(`${i.name} ${i.category}`)),
  };

  const machines = branchAssets.filter((a) => /MACHINERY|GENERATOR|TECH/i.test(a.assetType || ""));
  const machinesOk = machines.filter((m) => ["EXCELLENT", "GOOD"].includes(m.condition)).length;
  const maintenanceDue = machines.filter((m) =>
    m.condition === "NEEDS_MAINTENANCE" || (m.nextMaintenanceDate && m.nextMaintenanceDate <= today)
  );

  const lowStock = branchInventory.filter((i) => i.status !== "IN_STOCK" || i.quantity <= i.minStockThreshold);
  const breakageRate = filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0), 0) > 0
    ? filteredProduction.reduce((s, p) => s + (p.blocksBroken || 0), 0) /
      filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0), 0) * 100
    : 0;

  const alerts = [
    ...lowStock.map((i) => ({ level: i.status === "OUT_OF_STOCK" ? "critical" : "warning", msg: `${i.name} is ${i.status} (${i.quantity} ${i.unit})` })),
    ...maintenanceDue.map((m) => ({ level: "warning", msg: `Maintenance due: ${m.name}` })),
    ...(breakageRate > 2 ? [{ level: "critical", msg: `High block breakage rate: ${breakageRate.toFixed(1)}%` }] : []),
    ...(pendingOrders > 3 ? [{ level: "warning", msg: `${pendingOrders} pending orders need scheduling` }] : []),
    ...(netProfit < 0 ? [{ level: "critical", msg: `Today is loss-making: ${formatMoney(netProfit, currentCurrency)}` }] : []),
  ];

  const byDate = (rows: any[], getVal: (r: any) => number, dateKey = "recordedDate") => {
    const map: Record<string, number> = {};
    rows.forEach((r) => { const d = r[dateKey] || r.date; map[d] = (map[d] || 0) + getVal(r); });
    return Object.entries(map).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  };

  const productionChart = byDate(filteredProduction, (p) => (p.blocksMolded || 0) - (p.blocksBroken || 0));
  const salesChart = byDate(filteredTransactions.filter((t) => t.type === "INCOME"), (t) => t.amountGhs || 0, "date");
  const expenseChart = byDate(filteredTransactions.filter((t) => t.type === "EXPENSE"), (t) => t.amountGhs || 0, "date");
  const profitChart = (() => {
    const allDates = new Set([...salesChart.map((d) => d.date), ...expenseChart.map((d) => d.date)]);
    return Array.from(allDates).sort().map((date) => ({
      date,
      value: (salesChart.find((x) => x.date === date)?.value || 0) - (expenseChart.find((x) => x.date === date)?.value || 0),
    })).slice(-14);
  })();

  const submit = async (entity: FormType, data: any) => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/block-factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          data: {
            ...data,
            businessId: bizId,
            branchCode: businessInfo?.code,
            branchName: businessInfo?.name,
            createdByName: currentUser?.name,
            createdByRole: currentUser?.role,
            recordedBy: currentUser?.name,
            recordedByRole: currentUser?.role,
            recordedByUserId: currentUser?.id,
          },
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Failed to save");
      setShowForm(null);
      await refresh();
      onRefreshData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const Stat = ({ label, value, sub, color = "emerald", icon: Icon }: any) => (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4">
      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
        <span>{label}</span>{Icon && <Icon className={`w-4 h-4 text-${color}-400`} />}
      </div>
      <div className={`text-xl font-black text-${color}-400 mt-1`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );

  const Card = ({ title, icon: Icon, children, action }: any) => (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">{Icon && <Icon className="w-5 h-5 text-cyan-400" />}<h3 className="text-base font-bold text-white">{title}</h3></div>
        {action}
      </div>
      {children}
    </div>
  );

  const chartTooltip = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">BLOCK FACTORY MANAGEMENT</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">{businessInfo?.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Building2 className="w-3 h-3" />{businessInfo?.code} • {[businessInfo?.town, businessInfo?.district, businessInfo?.region].filter(Boolean).join(", ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowForm("PRODUCTION")} className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Production</button>
          <button onClick={() => setShowForm("ORDER")} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" />Order</button>
          <button onClick={() => setShowForm("DELIVERY")} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5" />Delivery</button>
          <button onClick={() => setShowForm("EXPENSE")} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />Expense</button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs"><AlertTriangle className="w-4 h-4 inline mr-1" />{error}</div>}

      {/* Filters */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300"><Filter className="w-4 h-4 text-cyan-400" /><span className="font-bold">Filters</span></div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Date</label>
          <input type="date" value={dateFilter === "ALL" ? "" : dateFilter} onChange={(e) => setDateFilter(e.target.value || "ALL")} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Block Type</label>
          <select value={blockTypeFilter} onChange={(e) => setBlockTypeFilter(e.target.value)} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs">
            <option value="ALL">All Block Types</option>{BLOCK_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {(dateFilter !== "ALL" || blockTypeFilter !== "ALL") && <button onClick={() => { setDateFilter("ALL"); setBlockTypeFilter("ALL"); }} className="self-end px-3 py-2 rounded-lg bg-slate-700 text-xs font-semibold">Clear</button>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Blocks Produced Today" value={blocksToday.toLocaleString()} sub="good blocks" color="cyan" icon={Boxes} />
        <Stat label="Blocks in Stock" value={blockStock.toLocaleString()} sub="finished goods" color="emerald" icon={Package} />
        <Stat label="Sales Today" value={salesToday.length} sub={`${formatMoney(revenueToday, currentCurrency, true)} revenue`} color="emerald" icon={TrendingUp} />
        <Stat label="Revenue Today" value={formatMoney(revenueToday, currentCurrency, true)} color="emerald" icon={Wallet} />
        <Stat label="Expenses Today" value={formatMoney(expensesToday, currentCurrency, true)} color="rose" icon={TrendingDown} />
        <Stat label="Net Profit" value={formatMoney(netProfit, currentCurrency, true)} color={netProfit >= 0 ? "emerald" : "rose"} icon={Activity} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending Orders" value={pendingOrders} sub={`${orders.length} total orders`} color="amber" icon={ShoppingCart} />
        <Stat label="Deliveries" value={activeDeliveries} sub={`${deliveries.length} total`} color="blue" icon={Truck} />
        <Stat label="Machine Status" value={`${machinesOk}/${machines.length}`} sub={maintenanceDue.length ? `${maintenanceDue.length} due` : "all good"} color={maintenanceDue.length ? "amber" : "emerald"} icon={Wrench} />
        <Stat label="Workers Present" value={workersPresent} sub="active staff" color="purple" icon={Users} />
      </div>

      {/* Raw materials + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Raw Material Stock" icon={Package}>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { key: "cement", label: "Cement", data: rawMaterials.cement, unit: "bags" },
              { key: "sand", label: "Sand", data: rawMaterials.sand, unit: "m³" },
              { key: "quarry", label: "Quarry Dust", data: rawMaterials.quarry, unit: "m³" },
              { key: "water", label: "Water", data: rawMaterials.water, unit: "L" },
            ].map((m) => {
              const warn = m.data && m.data.quantity <= m.data.minStockThreshold;
              return <div key={m.key} className={`p-3 rounded-xl border bg-slate-900/70 ${warn ? "border-amber-500/40" : "border-slate-700"}`}>
                <div className="text-[10px] text-slate-400 uppercase font-bold">{m.label}</div>
                <div className={`text-xl font-black ${warn ? "text-amber-400" : "text-cyan-400"}`}>{m.data ? Number(m.data.quantity).toLocaleString() : "—"}</div>
                <div className="text-[10px] text-slate-500">{m.data?.unit || m.unit}</div>
              </div>;
            })}
          </div>
        </Card>
        <div className="xl:col-span-2">
          <Card title="Low Stock & Important Alerts" icon={AlertTriangle}>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {alerts.length > 0 ? alerts.map((a, i) => <div key={i} className={`p-3 rounded-lg border text-xs ${a.level === "critical" ? "bg-rose-500/15 border-rose-500/40 text-rose-200" : "bg-amber-500/15 border-amber-500/40 text-amber-200"}`}>
                <AlertTriangle className="w-4 h-4 inline mr-1" />{a.msg}
              </div>) : <div className="p-4 text-center text-emerald-400 text-sm"><CheckCircle className="w-5 h-5 inline mr-2" />All systems normal</div>}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Production Trend" icon={Boxes}><ChartBar data={productionChart} color="#06b6d4" currency={currentCurrency} /></Card>
        <Card title="Sales Trend" icon={TrendingUp}><ChartBar data={salesChart} color="#10b981" currency={currentCurrency} money /></Card>
        <Card title="Expenses Trend" icon={TrendingDown}><ChartArea data={expenseChart} color="#f43f5e" currency={currentCurrency} /></Card>
        <Card title="Profit Trend" icon={Wallet}><ChartLine data={profitChart} color={netProfit >= 0 ? "#10b981" : "#f43f5e"} currency={currentCurrency} /></Card>
      </div>

      {/* Operational tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Recent Production Batches" icon={Boxes}>
          <DataTable headers={["Date", "Batch", "Type", "Molded", "Broken", "Good", "Quality"]} rows={production.slice(0, 8).map((p) => [p.recordedDate, p.batchId, p.blockType, p.blocksMolded, p.blocksBroken, (p.blocksMolded || 0) - (p.blocksBroken || 0), p.qualityGrade])} />
        </Card>
        <Card title="Orders & Deliveries" icon={Truck}>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MiniList title="Pending Orders" items={orders.filter((o) => ["PENDING", "IN_PROGRESS"].includes(o.status)).slice(0, 5)} render={(o: any) => `${o.orderNumber} • ${o.customerName} • ${o.quantity.toLocaleString()} ${o.blockType}`} />
            <MiniList title="Deliveries" items={deliveries.slice(0, 5)} render={(d: any) => `${d.deliveryNumber} • ${d.status} • ${d.quantity.toLocaleString()} blocks`} />
          </div>
        </Card>
      </div>

      {showForm && <BlockFactoryForm type={showForm} busy={busy} onClose={() => { setShowForm(null); setError(""); }} onSubmit={submit} orders={orders} />}
    </div>
  );
}

function ChartBar({ data, color, currency, money }: any) {
  return <div className="p-4"><ResponsiveContainer width="100%" height={220}><BarChart data={data}><XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 10 }} /><YAxis stroke="#94a3b8" style={{ fontSize: 10 }} /><Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} formatter={(v: any) => money ? formatMoney(Number(v), currency) : Number(v).toLocaleString()} /><Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
function ChartArea({ data, color, currency }: any) {
  return <div className="p-4"><ResponsiveContainer width="100%" height={220}><AreaChart data={data}><XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 10 }} /><YAxis stroke="#94a3b8" style={{ fontSize: 10 }} /><Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} formatter={(v: any) => formatMoney(Number(v), currency)} /><Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.25} /></AreaChart></ResponsiveContainer></div>;
}
function ChartLine({ data, color, currency }: any) {
  return <div className="p-4"><ResponsiveContainer width="100%" height={220}><LineChart data={data}><XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 10 }} /><YAxis stroke="#94a3b8" style={{ fontSize: 10 }} /><Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} formatter={(v: any) => formatMoney(Number(v), currency)} /><Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>;
}
function DataTable({ headers, rows }: any) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]"><tr>{headers.map((h: string) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-700/60">{rows.length ? rows.map((r: any[], i: number) => <tr key={i} className="hover:bg-slate-700/40">{r.map((c, j) => <td key={j} className="px-4 py-3 text-slate-300">{c}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">No records</td></tr>}</tbody></table></div>;
}
function MiniList({ title, items, render }: any) {
  return <div><div className="text-[10px] uppercase text-slate-500 font-bold mb-2">{title}</div><div className="space-y-2">{items.length ? items.map((item: any) => <div key={item.id} className="p-2 rounded-lg bg-slate-900/70 border border-slate-700 text-xs text-slate-300">{render(item)}</div>) : <p className="text-xs text-slate-500">No records</p>}</div></div>;
}

function BlockFactoryForm({ type, busy, onClose, onSubmit, orders }: any) {
  const [f, setF] = useState<any>({ blockType: "6-INCH-SOLID", qualityGrade: "GRADE_A_STANDARD", status: "PENDING", paymentMethod: "CASH", deliveryDate: new Date().toISOString().split("T")[0], date: new Date().toISOString().split("T")[0] });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const I = ({ label, k, t = "text", ...rest }: any) => <div><label className="block text-[10px] text-slate-400 font-semibold mb-1">{label}</label><input type={t} value={f[k] ?? ""} onChange={(e) => set(k, t === "number" ? Number(e.target.value) : e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs" {...rest} /></div>;
  const S = ({ label, k, opts }: any) => <div><label className="block text-[10px] text-slate-400 font-semibold mb-1">{label}</label><select value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs">{opts.map((o: any) => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select></div>;
  const title = type === "PRODUCTION" ? "Record Block Production" : type === "ORDER" ? "Create Customer Order" : type === "DELIVERY" ? "Record Delivery" : "Record Expense";
  const handle = (e: React.FormEvent) => { e.preventDefault(); onSubmit(type, f); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"><div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"><div className="flex items-center justify-between p-5 border-b border-slate-800"><h3 className="text-lg font-bold text-white">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div><form onSubmit={handle} className="p-5 space-y-3">
    {type === "PRODUCTION" && <><div className="grid grid-cols-2 gap-3"><I label="Batch ID" k="batchId" placeholder="auto if blank" /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Bags Cement Used" k="bagsCementUsed" t="number" required min={1} /><I label="Blocks Molded" k="blocksMolded" t="number" required min={1} /><I label="Blocks Broken" k="blocksBroken" t="number" min={0} /><S label="Quality" k="qualityGrade" opts={["GRADE_A_STANDARD", "GRADE_B_MINOR_DEFECT", "REJECTED"]} /><I label="Date" k="recordedDate" t="date" /></div></>}
    {type === "ORDER" && <><div className="grid grid-cols-2 gap-3"><I label="Customer Name" k="customerName" required /><I label="Customer Phone" k="customerPhone" /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Quantity" k="quantity" t="number" required min={1} /><I label="Unit Price (GH₵)" k="unitPriceGhs" t="number" step="0.01" required /><S label="Status" k="status" opts={["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]} /><I label="Due Date" k="dueDate" t="date" /></div><I label="Notes" k="notes" /></>}
    {type === "DELIVERY" && <><div className="grid grid-cols-2 gap-3"><S label="Order" k="orderNumber" opts={[{ v: "", l: "— No linked order —" }, ...orders.map((o: any) => ({ v: o.orderNumber, l: `${o.orderNumber} • ${o.customerName}` }))]} /><I label="Customer" k="customerName" required /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Quantity" k="quantity" t="number" required min={1} /><I label="Vehicle #" k="vehicleNumber" /><I label="Driver" k="driverName" /><S label="Status" k="status" opts={["SCHEDULED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]} /><I label="Delivery Date" k="deliveryDate" t="date" /></div><I label="Notes" k="notes" /></>}
    {type === "EXPENSE" && <><div className="grid grid-cols-2 gap-3"><I label="Category" k="category" placeholder="Fuel, Cement, Payroll..." required /><I label="Amount (GH₵)" k="amountGhs" t="number" step="0.01" required /><S label="Payment" k="paymentMethod" opts={["CASH", "MTN_MOMO", "TELECEL_CASH", "BANK_TRANSFER", "POS_CARD"]} /><I label="Date" k="date" t="date" /></div><I label="Description" k="description" /></>}
    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800"><button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-xs text-slate-300">Cancel</button><button disabled={busy} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
  </form></div></div>;
}
