"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes, Package, Truck, Wallet, AlertTriangle, CheckCircle, Settings,
  Users, Plus, X, Calendar, Filter, TrendingUp, TrendingDown, Loader2,
  Building2, Wrench, Activity, ShoppingCart, LayoutDashboard, ClipboardCheck,
  BadgeDollarSign, PackagePlus, CircleDot, CheckCircle2,
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

type FormType = "PRODUCTION" | "ORDER" | "DELIVERY" | "EXPENSE" | "SALE" | "RESTOCK" | "ITEM" | null;
type Tab = "DASHBOARD" | "INVENTORY" | "FINANCE" | "CHECKLIST";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "DASHBOARD", label: "Dashboard", icon: LayoutDashboard },
  { key: "INVENTORY", label: "Inventory", icon: Boxes },
  { key: "FINANCE", label: "Finance", icon: Wallet },
  { key: "CHECKLIST", label: "Daily Checklist", icon: ClipboardCheck },
];

const BLOCK_TYPES = ["6-INCH-SOLID", "6-INCH-HOLLOW", "5-INCH-SOLID", "PAVING-BRICKS"];

// Daily activity template for the block factory yard
const DEFAULT_TASKS = [
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
];

export default function BlockFactoryModule({
  currentUser, businessInfo, businessMetrics, inventory, transactions, assets,
  employees, currentCurrency, onRefreshData,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("DASHBOARD");
  const [production, setProduction] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [checklistDate, setChecklistDate] = useState<string>(new Date().toISOString().split("T")[0]);
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
        setChecklists(d.checklists || []);
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
  const machinesUnderRepair = machines.filter((m) => m.condition === "UNDER_REPAIR");

  const lowStock = branchInventory.filter((i) => i.status !== "IN_STOCK" || i.quantity <= i.minStockThreshold);
  const breakageRate = filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0), 0) > 0
    ? filteredProduction.reduce((s, p) => s + (p.blocksBroken || 0), 0) /
      filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0), 0) * 100
    : 0;

  // Overdue operational items (orders past due date, deliveries past delivery date)
  const overdueOrders = orders.filter(
    (o) => o.dueDate && o.dueDate < today && ["PENDING", "IN_PROGRESS"].includes(o.status)
  );
  const lateDeliveries = deliveries.filter(
    (d) => d.deliveryDate && d.deliveryDate < today && ["SCHEDULED", "IN_TRANSIT"].includes(d.status)
  );

  const alerts = [
    ...lowStock.map((i) => ({ level: i.status === "OUT_OF_STOCK" ? "critical" : "warning", msg: `${i.name} is ${i.status} (${i.quantity} ${i.unit})` })),
    ...maintenanceDue.map((m) => ({ level: "warning", msg: `Maintenance due: ${m.name}` })),
    ...machinesUnderRepair.map((m) => ({ level: "critical", msg: `Machine under repair: ${m.name}` })),
    ...(breakageRate > 2 ? [{ level: "critical", msg: `High block breakage rate: ${breakageRate.toFixed(1)}%` }] : []),
    ...(pendingOrders > 3 ? [{ level: "warning", msg: `${pendingOrders} pending orders need scheduling` }] : []),
    ...overdueOrders.map((o) => ({ level: "warning", msg: `Overdue order: ${o.orderNumber} • ${o.customerName} (due ${o.dueDate})` })),
    ...lateDeliveries.map((d) => ({ level: "warning", msg: `Delayed delivery: ${d.deliveryNumber} • ${d.customerName} (${d.deliveryDate})` })),
    ...(netProfit < 0 ? [{ level: "critical", msg: `Today is loss-making: ${formatMoney(netProfit, currentCurrency)}` }] : []),
  ];

  // Production & sales summary for the current filter scope
  const summary = useMemo(() => {
    const goodBlocks = filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0) - (p.blocksBroken || 0), 0);
    const molded = filteredProduction.reduce((s, p) => s + (p.blocksMolded || 0), 0);
    const broken = filteredProduction.reduce((s, p) => s + (p.blocksBroken || 0), 0);
    const cementBags = filteredProduction.reduce((s, p) => s + (p.bagsCementUsed || 0), 0);
    const income = filteredTransactions.filter((t) => t.type === "INCOME");
    const expense = filteredTransactions.filter((t) => t.type === "EXPENSE");
    const revenue = income.reduce((s, t) => s + (t.amountGhs || 0), 0);
    const expenses = expense.reduce((s, t) => s + (t.amountGhs || 0), 0);
    const orderQty = orders.reduce((s, o) => s + (o.quantity || 0), 0);
    const orderValue = orders.reduce((s, o) => s + (o.totalGhs || 0), 0);
    return {
      goodBlocks, molded, broken, cementBags,
      salesCount: income.length, revenue,
      expenseCount: expense.length, expenses,
      profit: revenue - expenses,
      orderQty, orderValue,
      avgOrderPrice: orderQty > 0 ? orderValue / orderQty : 0,
    };
  }, [filteredProduction, filteredTransactions, orders]);

  // Finance tab aggregates (respect the same filters → always in sync with dashboard)
  const finance = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === "INCOME");
    const expense = filteredTransactions.filter((t) => t.type === "EXPENSE");
    const revenue = income.reduce((s, t) => s + (t.amountGhs || 0), 0);
    const expenses = expense.reduce((s, t) => s + (t.amountGhs || 0), 0);
    const profit = revenue - expenses;
    const group = (rows: any[]) => {
      const map: Record<string, number> = {};
      rows.forEach((t) => { const k = t.category || "Uncategorised"; map[k] = (map[k] || 0) + (t.amountGhs || 0); });
      return Object.entries(map).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
    };
    const payMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => { const k = t.paymentMethod || "CASH"; payMap[k] = (payMap[k] || 0) + (t.amountGhs || 0); });
    return {
      revenue, expenses, profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      incomeByCategory: group(income),
      expenseByCategory: group(expense),
      byPaymentMethod: Object.entries(payMap).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
      recent: [...filteredTransactions].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 12),
    };
  }, [filteredTransactions]);

  // Checklist for the selected date
  const dayChecklist = useMemo(
    () => checklists.filter((c) => c.checklistDate === checklistDate),
    [checklists, checklistDate]
  );
  const checklistDone = dayChecklist.filter((c) => c.isCompleted).length;
  const checklistPct = dayChecklist.length > 0 ? Math.round((checklistDone / dayChecklist.length) * 100) : 0;
  const checklistDates = useMemo(
    () => Array.from(new Set(checklists.map((c) => c.checklistDate))).sort().reverse(),
    [checklists]
  );

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
      let d: any;
      if (entity === "SALE") {
        // Shared sales pipeline: validates & decrements inventory, creates the
        // INCOME transaction + receipt — every module updates from it.
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: bizId,
            branchCode: businessInfo?.code,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
            discount: Number(data.discount) || 0,
            cartItems: [
              {
                inventoryId: Number(data.inventoryId),
                quantity: Number(data.quantity),
                sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : undefined,
                originalPrice: data.sellingPrice ? Number(data.sellingPrice) : undefined,
                customPriceReason: data.customPriceReason,
              },
            ],
            createdByUserId: currentUser?.id,
            createdByName: currentUser?.name,
            createdByRole: currentUser?.role,
          }),
        });
        d = await res.json();
      } else if (entity === "ITEM") {
        // Shared enterprise entity route → appears in the global Inventory module too
        const res = await fetch("/api/enterprise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType: "inventory", data: { ...data, businessId: bizId } }),
        });
        d = await res.json();
      } else {
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
        d = await res.json();
      }
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

  const createChecklist = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/block-factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "CHECKLIST",
          data: { businessId: bizId, branchCode: businessInfo?.code, checklistDate, tasks: DEFAULT_TASKS },
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Failed to create checklist");
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task: any) => {
    setError("");
    try {
      const res = await fetch("/api/block-factory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "CHECKLIST",
          id: task.id,
          data: { completedByName: currentUser?.name, completedByRole: currentUser?.role },
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Failed to update task");
      await refresh();
    } catch (e: any) {
      setError(e.message);
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
          <button onClick={() => setShowForm("SALE")} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1"><BadgeDollarSign className="w-3.5 h-3.5" />Sale</button>
          <button onClick={() => setShowForm("RESTOCK")} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"><PackagePlus className="w-3.5 h-3.5" />Restock</button>
          <button onClick={() => setShowForm("ORDER")} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" />Order</button>
          <button onClick={() => setShowForm("DELIVERY")} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5" />Delivery</button>
          <button onClick={() => setShowForm("EXPENSE")} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />Expense</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-800/90 border border-slate-700/80 p-1.5 rounded-xl">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.key ? "bg-cyan-600 text-white shadow" : "text-slate-300 hover:bg-slate-700/70"}`}>
            <t.icon className="w-4 h-4" />
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
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

      {/* ══════════════ DASHBOARD ══════════════ */}
      {tab === "DASHBOARD" && (
        <div className="space-y-5">
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

          {/* Production & Sales Summary (current filter scope) */}
          <Card title="Production & Sales Summary" icon={Activity}
            action={<span className="text-[10px] text-slate-400">{dateFilter === "ALL" ? "All recorded history" : `Date: ${dateFilter}`} • {blockTypeFilter === "ALL" ? "all block types" : blockTypeFilter}</span>}>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <MiniStat label="Good Blocks Produced" value={summary.goodBlocks.toLocaleString()} sub={`${summary.molded.toLocaleString()} molded • ${summary.broken.toLocaleString()} broken`} color="cyan" />
              <MiniStat label="Cement Used" value={`${summary.cementBags.toLocaleString()} bags`} sub={summary.molded > 0 ? `${(summary.cementBags / summary.molded * 1000).toFixed(0)} blocks/bag…` : "no production"} color="amber" />
              <MiniStat label="Breakage Rate" value={`${breakageRate.toFixed(2)}%`} sub={breakageRate > 2 ? "above 2% target" : "within target"} color={breakageRate > 2 ? "rose" : "emerald"} />
              <MiniStat label="Sales" value={summary.salesCount.toLocaleString()} sub={`${formatMoney(summary.revenue, currentCurrency, true)} revenue`} color="emerald" />
              <MiniStat label="Expenses" value={summary.expenseCount.toLocaleString()} sub={`${formatMoney(summary.expenses, currentCurrency, true)} spent`} color="rose" />
              <MiniStat label="Profit" value={formatMoney(summary.profit, currentCurrency, true)} sub={summary.revenue > 0 ? `${((summary.profit / summary.revenue) * 100).toFixed(1)}% margin` : "—"} color={summary.profit >= 0 ? "emerald" : "rose"} />
            </div>
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-700/60 pt-3">
              <div className="text-xs text-slate-400">Order pipeline: <span className="text-white font-bold">{orders.length}</span> orders • <span className="text-cyan-300 font-bold">{summary.orderQty.toLocaleString()}</span> blocks • <span className="text-emerald-300 font-bold">{formatMoney(summary.orderValue, currentCurrency, true)}</span> value</div>
              <div className="text-xs text-slate-400">Avg order price: <span className="text-white font-bold">{formatMoney(summary.avgOrderPrice, currentCurrency, true)}</span>/block</div>
              <div className="text-xs text-slate-400">Quarter balance: <span className="text-emerald-300 font-bold">{formatMoney(businessMetrics?.netProfitGhs ?? 0, currentCurrency)}</span> net profit (Q1 baseline)</div>
              <div className="text-xs text-slate-400">Month target: <span className="text-white font-bold">{formatMoney(businessInfo?.monthlyTargetRevenueGhs ?? 0, currentCurrency)}</span></div>
            </div>
          </Card>

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
              <Card title="Low Stock & Operational Alerts" icon={AlertTriangle}>
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
        </div>
      )}

      {/* ══════════════ INVENTORY ══════════════ */}
      {tab === "INVENTORY" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Stock Items" value={branchInventory.length} sub="SKUs at this branch" color="cyan" icon={Boxes} />
            <Stat label="Units on Hand" value={branchInventory.reduce((s, i) => s + (i.quantity || 0), 0).toLocaleString()} sub="all materials & goods" color="emerald" icon={Package} />
            <Stat label="Stock Cost Value" value={formatMoney(branchInventory.reduce((s, i) => s + (i.quantity || 0) * (i.costPriceGhs || 0), 0), currentCurrency, true)} sub="at cost price" color="amber" icon={Wallet} />
            <Stat label="Low / Out of Stock" value={lowStock.length} sub={lowStock.length ? "restock required" : "all healthy"} color={lowStock.length ? "rose" : "emerald"} icon={AlertTriangle} />
          </div>

          <Card title="Inventory & Stock" icon={Boxes}
            action={<div className="flex gap-2">
              <button onClick={() => setShowForm("RESTOCK")} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"><PackagePlus className="w-3.5 h-3.5" />Receive Stock</button>
              <button onClick={() => setShowForm("ITEM")} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" />New Item</button>
            </div>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]">
                  <tr>{["Product", "SKU", "Category", "Qty", "Unit", "Cost", "Price", "Stock Value", "Status", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {branchInventory.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No inventory items at this branch yet — use “New Item”.</td></tr>
                  )}
                  {branchInventory.map((i) => {
                    const warn = i.status !== "IN_STOCK" || i.quantity <= i.minStockThreshold;
                    return (
                      <tr key={i.id} className="hover:bg-slate-700/40">
                        <td className="px-4 py-3 text-white font-semibold">{i.name}</td>
                        <td className="px-4 py-3 text-slate-400">{i.sku}</td>
                        <td className="px-4 py-3 text-slate-300">{i.category}</td>
                        <td className="px-4 py-3"><span className={`font-black ${warn ? "text-amber-300" : "text-cyan-300"}`}>{Number(i.quantity).toLocaleString()}</span><span className="text-slate-500"> / {i.minStockThreshold}</span></td>
                        <td className="px-4 py-3 text-slate-300">{i.unit}</td>
                        <td className="px-4 py-3 text-slate-300">{formatMoney(i.costPriceGhs, currentCurrency, true)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatMoney(i.sellingPriceGhs, currentCurrency, true)}</td>
                        <td className="px-4 py-3 text-emerald-300 font-semibold">{formatMoney((i.quantity || 0) * (i.costPriceGhs || 0), currentCurrency, true)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${i.status === "OUT_OF_STOCK" ? "bg-rose-500/15 text-rose-300 border-rose-500/40" : warn ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"}`}>{i.status}</span></td>
                        <td className="px-4 py-3"><button onClick={() => setShowForm("RESTOCK")} className="px-2 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-bold">Restock</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-4 pb-4 pt-2 text-[10px] text-slate-500">Production entries automatically add finished blocks to stock; sales deduct stock; restocks add purchased materials and can book the expense to Finance in one step.</p>
          </Card>
        </div>
      )}

      {/* ══════════════ FINANCE ══════════════ */}
      {tab === "FINANCE" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Revenue" value={formatMoney(finance.revenue, currentCurrency, true)} sub={`${finance.incomeByCategory.reduce((s, c) => s + 1, 0)} categories`} color="emerald" icon={TrendingUp} />
            <Stat label="Expenses" value={formatMoney(finance.expenses, currentCurrency, true)} sub={`${finance.expenseByCategory.reduce((s, c) => s + 1, 0)} categories`} color="rose" icon={TrendingDown} />
            <Stat label="Net Profit" value={formatMoney(finance.profit, currentCurrency, true)} color={finance.profit >= 0 ? "emerald" : "rose"} icon={Wallet} />
            <Stat label="Profit Margin" value={`${finance.margin.toFixed(1)}%`} sub="of revenue" color={finance.margin >= 0 ? "cyan" : "rose"} icon={Activity} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowForm("SALE")} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1"><BadgeDollarSign className="w-3.5 h-3.5" />Record Sale / Payment</button>
            <button onClick={() => setShowForm("EXPENSE")} className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />Record Expense</button>
            <button onClick={() => setShowForm("RESTOCK")} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"><PackagePlus className="w-3.5 h-3.5" />Purchase Stock</button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card title="Income by Category" icon={TrendingUp}>
              <div className="p-4 space-y-2">
                {finance.incomeByCategory.length === 0 && <p className="text-xs text-slate-500">No income recorded in this scope.</p>}
                {finance.incomeByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                    <span className="text-slate-300">{c.category}</span>
                    <span className="text-emerald-300 font-bold">{formatMoney(c.total, currentCurrency, true)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Expenses by Category" icon={TrendingDown}>
              <div className="p-4 space-y-2">
                {finance.expenseByCategory.length === 0 && <p className="text-xs text-slate-500">No expenses recorded in this scope.</p>}
                {finance.expenseByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                    <span className="text-slate-300">{c.category}</span>
                    <span className="text-rose-300 font-bold">{formatMoney(c.total, currentCurrency, true)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Payment Methods" icon={Wallet}>
              <div className="p-4 space-y-2">
                {finance.byPaymentMethod.length === 0 && <p className="text-xs text-slate-500">No transactions yet.</p>}
                {finance.byPaymentMethod.map((p) => (
                  <div key={p.method} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/70 border border-slate-700">
                    <span className="text-slate-300">{p.method.replace(/_/g, " ")}</span>
                    <span className="text-cyan-300 font-bold">{formatMoney(p.total, currentCurrency, true)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Branch Transactions" icon={Activity}>
            <DataTable
              headers={["Date", "Reference", "Type", "Category", "Method", "Amount", "Recorded By"]}
              rows={finance.recent.map((t) => [
                t.date,
                t.transactionNumber,
                <span key={`t${t.id}`} className={`font-bold ${t.type === "INCOME" ? "text-emerald-300" : "text-rose-300"}`}>{t.type}</span>,
                t.category,
                (t.paymentMethod || "").replace(/_/g, " "),
                <span key={`a${t.id}`} className={t.type === "INCOME" ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>{formatMoney(t.amountGhs, currentCurrency, true)}</span>,
                t.recordedBy,
              ])}
            />
          </Card>
        </div>
      )}

      {/* ══════════════ DAILY CHECKLIST ══════════════ */}
      {tab === "CHECKLIST" && (
        <div className="space-y-5">
          <Card title="Daily Activity Checklist" icon={ClipboardCheck}
            action={
              <div className="flex items-center gap-2">
                <input type="date" value={checklistDate} onChange={(e) => setChecklistDate(e.target.value)} className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
                {dayChecklist.length === 0 && (
                  <button onClick={createChecklist} disabled={busy} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                    <Plus className="w-3.5 h-3.5" />{busy ? "Creating..." : `Create Checklist (${checklistDate})`}
                  </button>
                )}
              </div>
            }>
            {/* Progress */}
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-semibold">{checklistDone} of {dayChecklist.length} tasks completed</span>
                <span className={`font-black ${checklistPct === 100 ? "text-emerald-300" : "text-cyan-300"}`}>{checklistPct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${checklistPct === 100 ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${checklistPct}%` }} />
              </div>
            </div>

            <div className="p-4 space-y-2">
              {dayChecklist.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No checklist for {checklistDate} yet.
                  {checklistDates.length > 0 && (
                    <span className="block text-[11px] mt-1 text-slate-500">Existing checklists: {checklistDates.slice(0, 5).join(", ")}</span>
                  )}
                </div>
              )}
              {dayChecklist.map((task) => (
                <button key={task.id} onClick={() => toggleTask(task)}
                  className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition ${
                    task.isCompleted
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-900/70 border-slate-700 text-slate-200 hover:border-cyan-500/40"}`}>
                  {task.isCompleted
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    : <CircleDot className="w-5 h-5 text-slate-500 shrink-0" />}
                  <div className="flex-1">
                    <div className={`font-semibold ${task.isCompleted ? "line-through opacity-70" : ""}`}>{task.taskLabel}</div>
                    {task.isCompleted && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Done by {task.completedByName || "Staff"}{task.completedByRole ? ` (${task.completedByRole})` : ""}{task.completedAt ? ` • ${new Date(task.completedAt).toLocaleTimeString()}` : ""}
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-[10px] font-bold text-slate-300">{task.category}</span>
                </button>
              ))}
            </div>
            <p className="px-4 pb-4 text-[10px] text-slate-500">Tasks track machine, material, production, quality, delivery and security duties per day. Completion stamps the user, role and time.</p>
          </Card>
        </div>
      )}

      {showForm && <BlockFactoryForm type={showForm} busy={busy} onClose={() => { setShowForm(null); setError(""); }} onSubmit={submit} orders={orders} inventory={branchInventory} />}
    </div>
  );
}

function MiniStat({ label, value, sub, color = "cyan" }: any) {
  return (
    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
      <div className="text-[10px] uppercase text-slate-500 font-bold">{label}</div>
      <div className={`text-lg font-black text-${color}-300 mt-0.5`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
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

function BlockFactoryForm({ type, busy, onClose, onSubmit, orders, inventory }: any) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [f, setF] = useState<any>({ blockType: "6-INCH-SOLID", qualityGrade: "GRADE_A_STANDARD", status: "PENDING", paymentMethod: "CASH", deliveryDate: todayStr, date: todayStr, recordExpense: true });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const I = ({ label, k, t = "text", ...rest }: any) => <div><label className="block text-[10px] text-slate-400 font-semibold mb-1">{label}</label><input type={t} value={f[k] ?? ""} onChange={(e) => set(k, t === "number" ? Number(e.target.value) : e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs" {...rest} /></div>;
  const S = ({ label, k, opts }: any) => <div><label className="block text-[10px] text-slate-400 font-semibold mb-1">{label}</label><select value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs">{opts.map((o: any) => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select></div>;
  const title =
    type === "PRODUCTION" ? "Record Block Production" :
    type === "ORDER" ? "Create Customer Order" :
    type === "DELIVERY" ? "Record Delivery" :
    type === "SALE" ? "Record Sale / Payment" :
    type === "RESTOCK" ? "Receive Stock (Purchase)" :
    type === "ITEM" ? "Add Inventory Item" :
    "Record Expense";

  const selectedItem = (inventory || []).find((i: any) => String(i.id) === String(f.inventoryId));
  const saleQty = Number(f.quantity) || 0;
  const salePrice = f.sellingPrice ? Number(f.sellingPrice) : selectedItem?.sellingPriceGhs || 0;
  const saleTotal = saleQty * salePrice;
  const restockCost = Number(f.unitCostGhs) || 0;
  const restockTotal = (Number(f.quantity) || 0) * restockCost;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...f };
    if (type === "RESTOCK") payload.totalCostGhs = restockTotal;
    onSubmit(type, payload);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"><div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10"><h3 className="text-lg font-bold text-white">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div><form onSubmit={handle} className="p-5 space-y-3">
    {type === "PRODUCTION" && <><div className="grid grid-cols-2 gap-3"><I label="Batch ID" k="batchId" placeholder="auto if blank" /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Bags Cement Used" k="bagsCementUsed" t="number" required min={1} /><I label="Blocks Molded" k="blocksMolded" t="number" required min={1} /><I label="Blocks Broken" k="blocksBroken" t="number" min={0} /><S label="Quality" k="qualityGrade" opts={["GRADE_A_STANDARD", "GRADE_B_MINOR_DEFECT", "REJECTED"]} /><I label="Date" k="recordedDate" t="date" /></div></>}
    {type === "ORDER" && <><div className="grid grid-cols-2 gap-3"><I label="Customer Name" k="customerName" required /><I label="Customer Phone" k="customerPhone" /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Quantity" k="quantity" t="number" required min={1} /><I label="Unit Price (GH₵)" k="unitPriceGhs" t="number" step="0.01" required /><S label="Status" k="status" opts={["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]} /><I label="Due Date" k="dueDate" t="date" /></div><I label="Notes" k="notes" /></>}
    {type === "DELIVERY" && <><div className="grid grid-cols-2 gap-3"><S label="Order" k="orderNumber" opts={[{ v: "", l: "— No linked order —" }, ...orders.map((o: any) => ({ v: o.orderNumber, l: `${o.orderNumber} • ${o.customerName}` }))]} /><I label="Customer" k="customerName" required /><S label="Block Type" k="blockType" opts={BLOCK_TYPES} /><I label="Quantity" k="quantity" t="number" required min={1} /><I label="Vehicle #" k="vehicleNumber" /><I label="Driver" k="driverName" /><S label="Status" k="status" opts={["SCHEDULED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]} /><I label="Delivery Date" k="deliveryDate" t="date" /></div><I label="Notes" k="notes" /></>}
    {type === "EXPENSE" && <><div className="grid grid-cols-2 gap-3"><I label="Category" k="category" placeholder="Fuel, Cement, Payroll..." required list="blk-exp-cats" /><I label="Amount (GH₵)" k="amountGhs" t="number" step="0.01" required /><S label="Payment" k="paymentMethod" opts={["CASH", "MTN_MOMO", "TELECEL_CASH", "BANK_TRANSFER", "POS_CARD"]} /><I label="Date" k="date" t="date" /></div><I label="Description" k="description" /><datalist id="blk-exp-cats">{["Fuel & Diesel", "Cement Purchase", "Sand & Aggregates", "Payroll", "Machine Repair", "Transport", "Utilities", "Pallets", "Rent", "Miscellaneous"].map((c) => <option key={c} value={c} />)}</datalist></>}
    {type === "SALE" && <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-[10px] text-slate-400 font-semibold mb-1">Product (from inventory)</label>
          <select required value={f.inventoryId ?? ""} onChange={(e) => set("inventoryId", e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs">
            <option value="" disabled>— Select product —</option>
            {(inventory || []).map((i: any) => <option key={i.id} value={i.id}>{i.name} • {i.quantity} {i.unit} in stock • {i.sellingPriceGhs} GH₵</option>)}
          </select>
        </div>
        <I label="Quantity" k="quantity" t="number" required min={1} max={selectedItem?.quantity} />
        <I label={`Unit Price (GH₵)${selectedItem ? ` — default ${selectedItem.sellingPriceGhs}` : ""}`} k="sellingPrice" t="number" step="0.01" placeholder={selectedItem ? String(selectedItem.sellingPriceGhs) : ""} />
        <I label="Customer Name" k="customerName" placeholder="Walk-in Customer" />
        <I label="Customer Phone" k="customerPhone" />
        <S label="Payment" k="paymentMethod" opts={["CASH", "MTN_MOMO", "TELECEL_CASH", "BANK_TRANSFER", "POS_CARD"]} />
        <I label="Price Override Reason" k="customPriceReason" placeholder="only if price changed" />
      </div>
      {selectedItem && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">Total due: <span className="font-black">GH₵ {saleTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> — sells {saleQty} {selectedItem.unit} of “{selectedItem.name}”. Stock after sale: {Math.max(0, (selectedItem.quantity || 0) - saleQty).toLocaleString()}.</div>}
      <I label="Notes" k="notes" />
    </>}
    {type === "RESTOCK" && <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-[10px] text-slate-400 font-semibold mb-1">Inventory Item</label>
          <select required value={f.inventoryId ?? ""} onChange={(e) => { set("inventoryId", e.target.value); const it = (inventory || []).find((x: any) => String(x.id) === e.target.value); if (it) setF((prev: any) => ({ ...prev, inventoryId: e.target.value, unitCostGhs: it.costPriceGhs })); }} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs">
            <option value="" disabled>— Select item —</option>
            {(inventory || []).map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.sku}) • {i.quantity} {i.unit} on hand</option>)}
          </select>
        </div>
        <I label="Quantity Received" k="quantity" t="number" required min={1} />
        <I label="Unit Cost (GH₵)" k="unitCostGhs" t="number" step="0.01" />
        <I label="Date" k="date" t="date" />
        <S label="Payment" k="paymentMethod" opts={["CASH", "MTN_MOMO", "TELECEL_CASH", "BANK_TRANSFER", "POS_CARD"]} />
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/70 border border-slate-700 text-xs">
        <input id="recordExpense" type="checkbox" checked={!!f.recordExpense} onChange={(e) => set("recordExpense", e.target.checked)} className="w-4 h-4 accent-indigo-500" />
        <label htmlFor="recordExpense" className="text-slate-300">Book purchase as expense ({restockTotal > 0 ? `GH₵ ${restockTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "no cost set"}) in Finance</label>
      </div>
      <I label="Description / Supplier note" k="description" placeholder="e.g. 200 bags Ghacem cement from Tema depot" />
    </>}
    {type === "ITEM" && <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><I label="Item Name" k="name" required placeholder="e.g. Ghacem Cement 50kg Bag" /></div>
        <I label="SKU" k="sku" placeholder="auto if blank" />
        <I label="Category" k="category" placeholder="Raw Material / Concrete Blocks" list="blk-item-cats" />
        <I label="Opening Quantity" k="quantity" t="number" min={0} />
        <S label="Unit" k="unit" opts={["Units", "Bags", "Tons", "Kg", "Drums", "Litres", "m³"]} />
        <I label="Cost Price (GH₵)" k="costPriceGhs" t="number" step="0.01" />
        <I label="Selling Price (GH₵)" k="sellingPriceGhs" t="number" step="0.01" />
        <I label="Low-Stock Threshold" k="minStockThreshold" t="number" min={0} />
      </div>
      <datalist id="blk-item-cats">{["Raw Materials", "Concrete Blocks", "Paving & Bricks", "Spare Parts", "Consumables", "Finished Goods"].map((c) => <option key={c} value={c} />)}</datalist>
    </>}
    <div className="flex justify-end gap-3 pt-3 border-t border-slate-800"><button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-xs text-slate-300">Cancel</button><button disabled={busy} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
  </form></div></div>;
}
