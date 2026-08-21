"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Landmark,
  RefreshCw,
  Plus,
  X,
  Users,
  Wallet,
  Clock,
  MinusCircle,
  CheckCircle,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  BarChart3,
  LayoutDashboard,
  PlayCircle,
  Eye,
  ThumbsUp,
  Banknote,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AiSectionGuide from "./AiSectionGuide";

/**
 * Payroll Command Center — the complete payroll management system behind the
 * "Employees & Payroll" dashboard. Employees, salaries, allowances, overtime
 * and deductions roll into runs (DRAFT → REVIEWED → APPROVED → PAID); paying
 * posts real EXPENSE transactions, linking Employee → Business → Branch →
 * Finance → Reports automatically. Includes attendance/leave/overtime
 * tracking, payslips (printable) and payroll reports & charts.
 */

const fmt = (n: number) =>
  "GH₵ " + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHODS: [string, string][] = [
  ["CASH", "Cash"],
  ["MTN_MOMO", "MTN MoMo"],
  ["BANK_TRANSFER", "Bank Transfer"],
  ["OTHER", "Other"],
];

const RUN_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-600/40 text-slate-300 border-slate-500/40",
  REVIEWED: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  APPROVED: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  PAID: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const ATT_STYLE: Record<string, string> = {
  PRESENT: "text-emerald-300",
  HALF_DAY: "text-amber-300",
  ABSENT: "text-rose-400",
  LEAVE: "text-cyan-300",
  OFF_DAY: "text-slate-400",
};

const TABS: [string, string, any][] = [
  ["OVERVIEW", "Overview", LayoutDashboard],
  ["RUNS", "Payroll Runs", Banknote],
  ["ATTENDANCE", "Attendance & OT", CalendarClock],
  ["REPORTS", "Reports & Charts", BarChart3],
];

const MONTH_NAME = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const periodLabel = (p: string) => {
  const [y, m] = p.split("-");
  return `${MONTH_NAME[Number(m)] || m} ${y}`;
};

interface Props {
  currentUser: any;
  businesses: any[];
  employees: any[];
  onChanged: () => void;
  onClose: () => void;
}

export default function PayrollCenter({ currentUser, businesses, employees, onChanged, onClose }: Props) {
  const [tab, setTab] = useState("OVERVIEW");
  const [runs, setRuns] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [report, setReport] = useState<any>({ byMonth: [], byBusiness: [], composition: {} });
  const [scope, setScope] = useState<{ isOwner: boolean; canManage: boolean; businessIds: number[] | null }>({
    isOwner: false, canManage: false, businessIds: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bizFilter, setBizFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [runFormOpen, setRunFormOpen] = useState(false);
  const [runForm, setRunForm] = useState({ businessId: "", period: new Date().toISOString().slice(0, 7), branchCode: "", notes: "" });
  const [runFormErr, setRunFormErr] = useState("");
  const [payTarget, setPayTarget] = useState<{ kind: "RUN" | "ENTRY"; id: number } | null>(null);
  const [slip, setSlip] = useState<any | null>(null); // {entry, run}
  const [attForm, setAttForm] = useState<any>({ employeeId: "", date: new Date().toISOString().slice(0, 10), status: "PRESENT", hoursWorked: "8", overtimeHours: "0", leaveType: "ANNUAL", note: "" });
  const [attErr, setAttErr] = useState("");
  const [confirmDelRun, setConfirmDelRun] = useState<number | null>(null);

  const load = async (bid = bizFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll${bid !== "ALL" ? `?businessId=${bid}` : ""}`);
      const d = await res.json();
      if (d?.success) {
        setRuns(d.runs || []);
        setAttendance(d.attendance || []);
        setReport(d.report || { byMonth: [], byBusiness: [], composition: {} });
        setScope(d.scope);
      } else setError(d?.error || "Failed to load payroll.");
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const canManageBiz = (bid: number) =>
    scope.isOwner || (scope.canManage && (scope.businessIds === null ? true : (scope.businessIds ?? []).includes(bid)));

  const scopedBusinesses = useMemo(() => {
    const list = scope.businessIds === null ? businesses : businesses.filter((b) => (scope.businessIds ?? []).includes(b.id));
    return [...list].sort((a, b) => a.id - b.id);
  }, [businesses, scope]);

  const scopedEmployees = useMemo(
    () => employees.filter((e) => (e.status || "ACTIVE") === "ACTIVE" && (scope.businessIds === null || (scope.businessIds ?? []).includes(e.businessId))),
    [employees, scope]
  );

  const kpis = useMemo(() => {
    const k = { net: 0, paid: 0, outstanding: 0, headcount: new Set<number>(), otHours: 0, deductions: 0, base: 0, allowances: 0 };
    for (const r of runs) for (const e of r.entries) {
      k.net += e.netPayGhs; k.base += e.baseSalaryGhs; k.allowances += e.allowancesGhs;
      k.deductions += e.deductionsGhs; k.otHours += e.overtimeHours; k.headcount.add(e.employeeId);
      if (e.status === "PAID") k.paid += e.netPayGhs; else k.outstanding += e.netPayGhs;
    }
    return k;
  }, [runs]);

  const api = async (method: string, body: any) => {
    const res = await fetch("/api/payroll", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const runAction = async (runId: number, action: string) => {
    setBusy(true); setNotice(""); setError("");
    try {
      const r = await api("PATCH", { runId, action });
      if (r.status === 200 && r.body?.success) {
        setNotice(`Run ${action === "REVIEW" ? "marked REVIEWED" : action === "APPROVE" ? "APPROVED" : "returned to DRAFT"}.`);
        await load(); onChanged();
      } else setError(r.body?.error || `Failed to ${action} the run.`);
    } catch (e: any) { setError(e?.message || "Network error."); }
    finally { setBusy(false); }
  };

  const doPay = async (method: string) => {
    if (!payTarget) return;
    setBusy(true); setNotice(""); setError("");
    try {
      const r = payTarget.kind === "RUN"
        ? await api("PATCH", { runId: payTarget.id, action: "PAY_RUN", method })
        : await api("PATCH", { entryId: payTarget.id, action: "PAY_ENTRY", method });
      if (r.status === 200 && r.body?.success) {
        setNotice(`Payroll paid via ${METHODS.find(([k]) => k === method)?.[1]} — recorded as EXPENSE in Transactions & Finance.`);
        setPayTarget(null);
        await load(); onChanged();
      } else setError(r.body?.error || "Payment failed.");
    } catch (e: any) { setError(e?.message || "Network error."); }
    finally { setBusy(false); }
  };

  const createRun = async () => {
    if (!runForm.businessId) return setRunFormErr("Choose the business to run payroll for.");
    setBusy(true); setRunFormErr("");
    try {
      const r = await api("POST", {
        data: { businessId: Number(runForm.businessId), period: runForm.period, branchCode: runForm.branchCode || undefined, notes: runForm.notes || undefined },
      });
      if (r.status === 200 && r.body?.success) {
        setNotice(`Draft payroll created for ${r.body.run.branchName || r.body.run.branchCode} — ${r.body.run.totals.headcount} employee(s), net ${fmt(r.body.run.totals.net)}. Review it under Payroll Runs.`);
        setRunFormOpen(false);
        setTab("RUNS");
        await load();
      } else setRunFormErr(r.body?.error || "Failed to create the run.");
    } catch (e: any) { setRunFormErr(e?.message || "Network error."); }
    finally { setBusy(false); }
  };

  const addAttendance = async () => {
    if (!attForm.employeeId) return setAttErr("Choose an employee.");
    setBusy(true); setAttErr("");
    try {
      const r = await api("POST", {
        action: "ADD_ATTENDANCE",
        data: {
          employeeId: Number(attForm.employeeId), date: attForm.date, status: attForm.status,
          hoursWorked: Number(attForm.hoursWorked) || 0, overtimeHours: Number(attForm.overtimeHours) || 0,
          leaveType: attForm.status === "LEAVE" ? attForm.leaveType : undefined, note: attForm.note || undefined,
        },
      });
      if (r.status === 200 && r.body?.success) {
        setNotice(`Attendance recorded for ${r.body.attendance.employeeName} (${r.body.attendance.date}). Overtime here flows into the next payroll run.`);
        setAttForm((f: any) => ({ ...f, overtimeHours: "0", note: "" }));
        await load();
      } else setAttErr(r.body?.error || "Failed to record attendance.");
    } catch (e: any) { setAttErr(e?.message || "Network error."); }
    finally { setBusy(false); }
  };

  const delAttendance = async (id: number) => {
    const r = await api("DELETE", { attendanceId: id });
    if (r.status === 200) { setNotice("Attendance row removed."); await load(); }
    else setError(r.body?.error || "Remove failed.");
  };

  const deleteRun = async (runId: number) => {
    const r = await api("DELETE", { runId });
    if (r.status === 200) { setNotice("Draft run discarded."); setConfirmDelRun(null); await load(); }
    else { setError(r.body?.error || "Discard failed."); setConfirmDelRun(null); }
  };

  const downloadCsv = () => {
    const head = "Period,Business,Branch,Employee,Role,Base GH₵,Allowances GH₵,OT Hours,OT Pay GH₵,Deductions GH₵,Net Pay GH₵,Status,Method,Paid At,Ledger";
    const rows = runs.flatMap((r) =>
      r.entries.map((e: any) =>
        [r.period, r.branchName || "", r.branchCode, e.employeeName, e.employeeRole || "", e.baseSalaryGhs, e.allowancesGhs, e.overtimeHours, e.overtimePayGhs, e.deductionsGhs, e.netPayGhs, e.status, e.paymentMethod || "", e.paidAt ? new Date(e.paidAt).toLocaleString() : "", e.transactionId ? `#${e.transactionId}` : ""]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
      )
    );
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-report-${bizFilter === "ALL" ? "all" : bizFilter}.csv`;
    a.click();
  };

  const printSlip = (run: any, e: any) => {
    const biz = businesses.find((b) => b.id === e.businessId);
    const html = `<!doctype html><html><head><title>Payslip — ${e.employeeName} — ${periodLabel(run.period)}</title>
      <style>body{font-family:Arial,sans-serif;color:#0f172a;padding:32px;max-width:640px;margin:auto}
      h1{font-size:20px;margin:0}h2{font-size:14px;color:#475569;margin:4px 0 16px}
      table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #cbd5e1;padding:8px;font-size:13px;text-align:left}
      .num{text-align:right}.net{background:#ecfdf5;font-weight:bold}.muted{color:#64748b;font-size:12px}
      .badge{display:inline-block;padding:2px 10px;border:1px solid #0f172a;border-radius:999px;font-size:11px}</style></head><body>
      <h1>GoMina 360 — Payslip</h1>
      <h2>${biz?.name || ""} · Branch ${e.branchCode} · ${periodLabel(run.period)}</h2>
      <p><b>${e.employeeName}</b> — ${e.employeeRole || "Staff"} <span class="badge">${e.status}</span></p>
      <table><tr><th>Earnings</th><th class="num">GH₵</th></tr>
      <tr><td>Base salary</td><td class="num">${fmt(e.baseSalaryGhs)}</td></tr>
      <tr><td>Allowances${e.allowanceNote ? ` (${e.allowanceNote})` : ""}</td><td class="num">${fmt(e.allowancesGhs)}</td></tr>
      <tr><td>Overtime (${e.overtimeHours} hrs)</td><td class="num">${fmt(e.overtimePayGhs)}</td></tr>
      <tr><th>Deductions</th><th class="num"></th></tr>
      <tr><td>Deductions${e.deductionNote ? ` (${e.deductionNote})` : ""}</td><td class="num">−${fmt(e.deductionsGhs)}</td></tr>
      <tr class="net"><td>NET PAY</td><td class="num">${fmt(e.netPayGhs)}</td></tr></table>
      <p class="muted">Payment: ${e.status === "PAID" ? `${METHODS.find(([k]) => k === e.paymentMethod)?.[1]} on ${new Date(e.paidAt).toLocaleString()} by ${e.paidByName}` : "PENDING"}${e.transactionId ? ` · Ledger ref #${e.transactionId}` : ""}</p>
      <p class="muted">Generated by GoMina 360 · ${new Date().toLocaleString()}</p></body></html>`;
    const w = window.open("", "_blank", "width=720,height=840");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
    else {
      let area = document.getElementById("prl-print-area");
      if (!area) { area = document.createElement("div"); area.id = "prl-print-area"; document.body.appendChild(area); }
      area.innerHTML = html;
      const style = document.createElement("style");
      style.id = "prl-print-style";
      style.textContent = "@media print { body * { visibility: hidden; } #prl-print-area, #prl-print-area * { visibility: visible; } #prl-print-area { position: absolute; inset: 0; } }";
      document.head.appendChild(style);
      window.print();
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500";
  const labelCls = "block text-[11px] font-semibold text-slate-400 mb-1";

  const Kpi = ({ label, value, sub, tint }: any) => (
    <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-lg font-extrabold mt-0.5 ${tint || "text-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5" data-testid="prl-root">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-7xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">Payroll Command Center</h3>
            <p className="text-[11px] text-slate-400">Employee → Business → Branch → Finance → Reports • salaries, allowances, overtime, deductions, net pay</p>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={bizFilter}
              onChange={(e) => { setBizFilter(e.target.value); load(e.target.value); }}
              className="px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
              data-testid="prl-biz-filter"
            >
              <option value="ALL">All businesses</option>
              {scopedBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <AiSectionGuide moduleKey="PAYROLL" section="DEFAULT" variant="header" />
            <button onClick={() => load()} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title="Refresh" data-testid="prl-refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {(scope.isOwner || scope.canManage) && (
              <button
                onClick={() => { setRunForm({ ...runForm, businessId: bizFilter !== "ALL" ? bizFilter : scopedBusinesses[0]?.id || "" }); setRunFormErr(""); setRunFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow"
                data-testid="prl-run-new"
              >
                <Plus className="w-4 h-4" /> New Payroll Run
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" aria-label="Close" data-testid="prl-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {notice && <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" data-testid="prl-notice">{notice}</div>}
        {error && <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300" data-testid="prl-error">{error}</div>}

        {/* KPI strip */}
        <div className="px-5 pt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi label="Total Net Pay" value={fmt(kpis.net)} sub={`${kpis.headcount.size} employee(s)`} />
          <Kpi label="Paid Out" value={fmt(kpis.paid)} tint="text-emerald-400" />
          <Kpi label="Outstanding Payroll" value={fmt(kpis.outstanding)} tint="text-rose-400" />
          <Kpi label="Base Salaries" value={fmt(kpis.base)} sub={`allowances ${fmt(kpis.allowances)}`} />
          <Kpi label="Overtime" value={`${Number(kpis.otHours.toFixed(1))} hrs`} tint="text-cyan-300" />
          <Kpi label="Deductions" value={fmt(kpis.deductions)} tint="text-amber-300" />
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex items-center gap-1.5 flex-wrap" data-testid="prl-tabs">
          {TABS.map(([key, labelTxt, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                tab === key ? "bg-teal-600 text-white shadow" : "bg-slate-800/70 text-slate-300 hover:bg-slate-700"
              }`}
              data-testid={`prl-tab-${key}`}
            >
              <Icon className="w-4 h-4" />
              <span>{labelTxt}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {tab === "OVERVIEW" && (
            <div className="space-y-4">
              {runs.length === 0 && !loading && (
                <div className="text-center py-14 space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl" data-testid="prl-empty">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-sm">No payroll runs yet in this scope.</p>
                  {(scope.isOwner || scope.canManage) && (
                    <button onClick={() => setRunFormOpen(true)} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold">
                      <Plus className="w-3.5 h-3.5 inline mr-1" /> Create the first payroll run
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="prl-overview-runs">
                {runs.slice(0, 6).map((r) => (
                  <button key={r.id} onClick={() => { setTab("RUNS"); setExpanded(r.id); }}
                    className="text-left bg-slate-900 border border-slate-700/80 rounded-xl p-4 hover:border-teal-500/50 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{r.branchName} — {periodLabel(r.period)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RUN_STYLE[r.status]}`}>{r.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-[10px] text-slate-500 uppercase">Net</div><div className="text-sm font-bold text-white">{fmt(r.totals.net)}</div></div>
                      <div><div className="text-[10px] text-slate-500 uppercase">Paid</div><div className="text-sm font-bold text-emerald-400">{fmt(r.totals.paid)}</div></div>
                      <div><div className="text-[10px] text-slate-500 uppercase">Outstanding</div><div className="text-sm font-bold text-rose-400">{fmt(r.totals.outstanding)}</div></div>
                    </div>
                    <div className="text-[11px] text-slate-500">{r.totals.headcount} employee(s) · OT {r.totals.overtimeHours} hrs · deductions {fmt(r.totals.deductions)}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Payments post EXPENSE transactions (category “Staff Payroll”) — Finance dashboards, the central Financial Report and business reports update the moment someone is paid.</p>
            </div>
          )}

          {/* ── RUNS ─────────────────────────────────────────────── */}
          {tab === "RUNS" && (
            <div className="space-y-3">
              {runs.map((r) => {
                const manageable = canManageBiz(r.businessId);
                const open = expanded === r.id;
                return (
                  <div key={r.id} className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden" data-testid={`prl-run-${r.id}`}>
                    <div className="p-4 flex flex-wrap items-center gap-3">
                      <button onClick={() => setExpanded(open ? null : r.id)} className="flex items-center gap-2 text-left min-w-0" data-testid={`prl-run-toggle-${r.id}`}>
                        {open ? <ChevronUp className="w-4 h-4 text-teal-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        <div>
                          <div className="font-bold text-white text-sm">{r.branchName} — {periodLabel(r.period)}</div>
                          <div className="text-[11px] text-slate-500">{r.totals.headcount} employees · net {fmt(r.totals.net)} · outstanding {fmt(r.totals.outstanding)}</div>
                        </div>
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RUN_STYLE[r.status]}`}>{r.status}</span>
                      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                        {manageable && r.status === "DRAFT" && (
                          <>
                            <button onClick={() => runAction(r.id, "REVIEW")} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold" data-testid={`prl-run-review-${r.id}`}>
                              <Eye className="w-3.5 h-3.5" /> Mark Reviewed
                            </button>
                            {confirmDelRun === r.id ? (
                              <>
                                <button onClick={() => deleteRun(r.id)} className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold" data-testid={`prl-run-del-confirm-${r.id}`}>Discard?</button>
                                <button onClick={() => setConfirmDelRun(null)} className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[11px]">Keep</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDelRun(r.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300" title="Discard draft" data-testid={`prl-run-delete-${r.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        {manageable && r.status === "REVIEWED" && (
                          <>
                            <button onClick={() => runAction(r.id, "APPROVE")} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[11px] font-bold" data-testid={`prl-run-approve-${r.id}`}>
                              <ThumbsUp className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => runAction(r.id, "REVERT")} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[11px]">Back to Draft</button>
                          </>
                        )}
                        {manageable && r.status === "APPROVED" && (
                          <button onClick={() => setPayTarget({ kind: "RUN", id: r.id })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow" data-testid={`prl-run-pay-${r.id}`}>
                            <PlayCircle className="w-3.5 h-3.5" /> Pay All ({fmt(r.totals.outstanding)})
                          </button>
                        )}
                        {r.status === "PAID" && <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Fully paid {r.paidAt ? `· ${new Date(r.paidAt).toLocaleDateString()}` : ""}</span>}
                      </div>
                    </div>
                    {payTarget?.kind === "RUN" && payTarget.id === r.id && (
                      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap" data-testid={`prl-paymethods-${r.id}`}>
                        <span className="text-[11px] text-slate-400">Pay every pending entry via:</span>
                        {METHODS.map(([k, v]) => (
                          <button key={k} onClick={() => doPay(k)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold" data-testid={`prl-paymethod-${k}-${r.id}`}>{v}</button>
                        ))}
                        <button onClick={() => setPayTarget(null)} className="px-2 py-1.5 text-slate-500 text-[11px]">Cancel</button>
                      </div>
                    )}
                    {open && (
                      <table className="w-full text-left text-xs border-t border-slate-800">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-2">Employee</th><th className="px-3 py-2 text-right">Base</th><th className="px-3 py-2 text-right">Allowances</th>
                            <th className="px-3 py-2 text-right">Overtime</th><th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net Pay</th>
                            <th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {r.entries.map((e: any) => (
                            <tr key={e.id} className="text-slate-300" data-testid={`prl-entry-${e.id}`}>
                              <td className="px-4 py-2.5"><div className="font-bold text-slate-100">{e.employeeName}</div><div className="text-[10px] text-slate-500">{e.employeeRole}</div></td>
                              <td className="px-3 py-2.5 text-right">{fmt(e.baseSalaryGhs)}</td>
                              <td className="px-3 py-2.5 text-right text-cyan-300">{fmt(e.allowancesGhs)}</td>
                              <td className="px-3 py-2.5 text-right text-cyan-300">{e.overtimeHours}h · {fmt(e.overtimePayGhs)}</td>
                              <td className="px-3 py-2.5 text-right text-amber-300">{fmt(e.deductionsGhs)}</td>
                              <td className="px-3 py-2.5 text-right font-extrabold text-white">{fmt(e.netPayGhs)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${e.status === "PAID" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{e.status}</span>
                                {e.status === "PAID" && <div className="text-[9px] text-slate-500 mt-0.5">{METHODS.find(([k]) => k === e.paymentMethod)?.[1]}</div>}
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <button onClick={() => setSlip({ entry: e, run: r })} className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 mr-1" title="Payslip" data-testid={`prl-entry-slip-${e.id}`}>
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                {manageable && e.status !== "PAID" && r.status === "APPROVED" && (
                                  <button onClick={() => setPayTarget({ kind: "ENTRY", id: e.id })} className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300" title="Pay this employee" data-testid={`prl-entry-pay-${e.id}`}>
                                    <Wallet className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {payTarget?.kind === "ENTRY" && payTarget.id === e.id && (
                                  <span className="inline-flex gap-1 ml-1">
                                    {METHODS.map(([k, v]) => (
                                      <button key={k} onClick={() => doPay(k)} disabled={busy} className="px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-200 text-[9px] font-bold" data-testid={`prl-paymethod-${k}-e${e.id}`}>{v}</button>
                                    ))}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ATTENDANCE ───────────────────────────────────────── */}
          {tab === "ATTENDANCE" && (
            <div className="space-y-4">
              {(scope.isOwner || scope.canManage) && (
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3" data-testid="prl-att-form">
                  <div className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Record attendance, leave & overtime</div>
                  {attErr && <div className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2" data-testid="prl-att-error">{attErr}</div>}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                    <div className="col-span-2">
                      <label className={labelCls}>Employee</label>
                      <select className={inputCls} value={attForm.employeeId} onChange={(e) => setAttForm({ ...attForm, employeeId: e.target.value })} data-testid="prl-att-employee">
                        <option value="">Select employee…</option>
                        {scopedEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name} — {businesses.find((b) => b.id === emp.businessId)?.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Date</label>
                      <input type="date" className={inputCls} value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} data-testid="prl-att-date" />
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select className={inputCls} value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })} data-testid="prl-att-status">
                        <option value="PRESENT">Present</option><option value="HALF_DAY">Half day</option><option value="ABSENT">Absent</option><option value="LEAVE">Leave</option><option value="OFF_DAY">Off day</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Hours worked</label>
                      <input type="number" className={inputCls} value={attForm.hoursWorked} onChange={(e) => setAttForm({ ...attForm, hoursWorked: e.target.value })} data-testid="prl-att-hours" />
                    </div>
                    <div>
                      <label className={labelCls}>Overtime (hrs)</label>
                      <input type="number" className={inputCls} value={attForm.overtimeHours} onChange={(e) => setAttForm({ ...attForm, overtimeHours: e.target.value })} data-testid="prl-att-ot" />
                    </div>
                    {attForm.status === "LEAVE" && (
                      <div>
                        <label className={labelCls}>Leave type</label>
                        <select className={inputCls} value={attForm.leaveType} onChange={(e) => setAttForm({ ...attForm, leaveType: e.target.value })} data-testid="prl-att-leave">
                          <option value="ANNUAL">Annual</option><option value="SICK">Sick</option><option value="MATERNITY">Maternity</option><option value="UNPAID">Unpaid</option>
                        </select>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className={labelCls}>Note</label>
                      <input className={inputCls} value={attForm.note} onChange={(e) => setAttForm({ ...attForm, note: e.target.value })} placeholder="optional" data-testid="prl-att-note" />
                    </div>
                    <button onClick={addAttendance} disabled={busy} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold h-fit" data-testid="prl-att-save">Save</button>
                  </div>
                </div>
              )}
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Date</th><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Business · Branch</th>
                      <th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-right">OT</th>
                      <th className="px-3 py-2">Leave</th><th className="px-3 py-2">Recorded by</th><th className="px-3 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70" data-testid="prl-att-rows">
                    {attendance.slice(0, 30).map((a) => (
                      <tr key={a.id} className="text-slate-300" data-testid={`prl-att-row-${a.id}`}>
                        <td className="px-4 py-2 font-mono">{a.date}</td>
                        <td className="px-3 py-2 font-semibold text-slate-100">{a.employeeName}{a.note ? <span className="block text-[10px] font-normal italic text-slate-500" data-testid={`prl-att-note-${a.id}`}>{a.note}</span> : null}</td>
                        <td className="px-3 py-2">{businesses.find((b) => b.id === a.businessId)?.name} · <span className="font-mono text-[10px] text-cyan-300">{a.branchCode}</span></td>
                        <td className={`px-3 py-2 font-bold ${ATT_STYLE[a.status] || ""}`}>{a.status}</td>
                        <td className="px-3 py-2 text-right">{a.hoursWorked}</td>
                        <td className="px-3 py-2 text-right text-cyan-300">{a.overtimeHours}</td>
                        <td className="px-3 py-2">{a.leaveType || "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{a.recordedByName}</td>
                        <td className="px-3 py-2 text-center">
                          {canManageBiz(a.businessId) && (
                            <button onClick={() => delAttendance(a.id)} className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300" data-testid={`prl-att-del-${a.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTS ──────────────────────────────────────────── */}
          {tab === "REPORTS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-400" /> Payroll cost, salaries, deductions, overtime & trends</h4>
                <button onClick={downloadCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold" data-testid="prl-csv">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Download CSV
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="prl-chart-trend">
                  <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Monthly payroll trend (GH₵)</div>
                  <div className="h-60">
                    <ResponsiveContainer>
                      <BarChart data={report.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="period" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="base" name="Base salaries" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="allowances" name="Allowances" stackId="a" fill="#22d3ee" />
                        <Bar dataKey="overtime" name="Overtime" stackId="a" fill="#818cf8" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="deductions" name="Deductions" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="prl-chart-mix">
                  <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Cost composition (all-time, scoped)</div>
                  <div className="h-60">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Base salaries", value: report.composition.base || 0 },
                            { name: "Allowances", value: report.composition.allowances || 0 },
                            { name: "Overtime", value: report.composition.overtime || 0 },
                            { name: "Deductions", value: report.composition.deductions || 0 },
                          ]}
                          dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}
                        >
                          {["#0d9488", "#22d3ee", "#818cf8", "#f59e0b"].map((c) => <Cell key={c} fill={c} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 lg:col-span-2" data-testid="prl-chart-biz">
                  <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Payroll cost by business — paid vs outstanding (GH₵)</div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <BarChart data={report.byBusiness} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={150} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="outstanding" name="Outstanding" fill="#f43f5e" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden" data-testid="prl-report-table">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr><th className="px-4 py-2">Business</th><th className="px-3 py-2 text-right">Employees paid</th><th className="px-3 py-2 text-right">Net payroll</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Outstanding</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {report.byBusiness.map((b: any) => (
                      <tr key={b.businessId} className="text-slate-300">
                        <td className="px-4 py-2 font-semibold text-slate-100">{b.name}</td>
                        <td className="px-3 py-2 text-right">{b.headcount}</td>
                        <td className="px-3 py-2 text-right font-bold text-white">{fmt(b.net)}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{fmt(b.paid)}</td>
                        <td className="px-3 py-2 text-right text-rose-400">{fmt(b.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Run modal ─────────────────────────────────────────── */}
      {runFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4" data-testid="prl-run-form">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2"><Banknote className="w-4 h-4 text-teal-400" /> New Payroll Run</h4>
              <button onClick={() => setRunFormOpen(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white" data-testid="prl-run-cancel"><X className="w-4 h-4" /></button>
            </div>
            {runFormErr && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2.5 rounded-lg text-xs" data-testid="prl-run-error">{runFormErr}</div>}
            <div>
              <label className={labelCls}>Business <span className="text-rose-400">*</span></label>
              <select className={inputCls} value={runForm.businessId} onChange={(e) => {
                const biz = businesses.find((b) => b.id === Number(e.target.value));
                setRunForm({ ...runForm, businessId: e.target.value, branchCode: biz?.code || "" });
              }} data-testid="prl-run-business">
                <option value="">Select business…</option>
                {scopedBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Payroll month <span className="text-rose-400">*</span></label>
                <input type="month" className={inputCls} value={runForm.period} onChange={(e) => setRunForm({ ...runForm, period: e.target.value })} data-testid="prl-run-period" />
              </div>
              <div>
                <label className={labelCls}>Branch / register</label>
                <input className={`${inputCls} font-mono`} value={runForm.branchCode} onChange={(e) => setRunForm({ ...runForm, branchCode: e.target.value.toUpperCase() })} data-testid="prl-run-branch" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input className={inputCls} value={runForm.notes} onChange={(e) => setRunForm({ ...runForm, notes: e.target.value })} placeholder="e.g. August salary cycle" data-testid="prl-run-notes" />
            </div>
            <p className="text-[11px] text-slate-500">Drafts every ACTIVE employee of the business with their base salary and pulls this month's overtime hours from attendance automatically.</p>
            <button onClick={createRun} disabled={busy} className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow disabled:opacity-50" data-testid="prl-run-create">
              {busy ? "Creating…" : "Create Draft Run"}
            </button>
          </div>
        </div>
      )}

      {/* ── Payslip modal ─────────────────────────────────────────── */}
      {slip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" data-testid="prl-slip">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold">GoMina 360 — Payslip</h4>
                <p className="text-[11px] text-slate-300">{businesses.find((b) => b.id === slip.entry.businessId)?.name} · {slip.entry.branchCode} · {periodLabel(slip.run.period)}</p>
              </div>
              <button onClick={() => setSlip(null)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700" aria-label="Close" data-testid="prl-slip-close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div><div className="font-extrabold text-base">{slip.entry.employeeName}</div><div className="text-xs text-slate-500">{slip.entry.employeeRole}</div></div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${slip.entry.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{slip.entry.status}</span>
              </div>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <tbody>
                  <tr className="bg-slate-50 font-bold"><td className="px-3 py-2">Earnings</td><td className="px-3 py-2 text-right">GH₵</td></tr>
                  <tr><td className="px-3 py-2 border-t border-slate-200">Base salary</td><td className="px-3 py-2 border-t border-slate-200 text-right">{fmt(slip.entry.baseSalaryGhs)}</td></tr>
                  <tr><td className="px-3 py-2 border-t border-slate-200">Allowances{slip.entry.allowanceNote ? ` (${slip.entry.allowanceNote})` : ""}</td><td className="px-3 py-2 border-t border-slate-200 text-right">{fmt(slip.entry.allowancesGhs)}</td></tr>
                  <tr><td className="px-3 py-2 border-t border-slate-200">Overtime ({slip.entry.overtimeHours} hrs)</td><td className="px-3 py-2 border-t border-slate-200 text-right">{fmt(slip.entry.overtimePayGhs)}</td></tr>
                  <tr className="bg-slate-50 font-bold"><td className="px-3 py-2">Deductions</td><td></td></tr>
                  <tr><td className="px-3 py-2 border-t border-slate-200">Deductions{slip.entry.deductionNote ? ` (${slip.entry.deductionNote})` : ""}</td><td className="px-3 py-2 border-t border-slate-200 text-right">−{fmt(slip.entry.deductionsGhs)}</td></tr>
                  <tr className="bg-emerald-50 font-extrabold"><td className="px-3 py-2.5 border-t border-slate-200">NET PAY</td><td className="px-3 py-2.5 border-t border-slate-200 text-right" data-testid="prl-slip-net">{fmt(slip.entry.netPayGhs)}</td></tr>
                </tbody>
              </table>
              <p className="text-[11px] text-slate-500">
                {slip.entry.status === "PAID"
                  ? `Paid via ${METHODS.find(([k]) => k === slip.entry.paymentMethod)?.[1]} on ${new Date(slip.entry.paidAt).toLocaleString()} by ${slip.entry.paidByName}${slip.entry.transactionId ? ` · Ledger ref #${slip.entry.transactionId}` : ""}`
                  : "Payment pending."}
              </p>
              <button onClick={() => printSlip(slip.run, slip.entry)} className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2" data-testid="prl-slip-print">
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
