"use client";

// Supervisor & Auditor Control Center — reviews EXISTING worker records
// (operations & activities, sales, finance, inventory, production, payroll,
// attendance, assets, CCTV) in place: verify, flag, comment, request
// corrections and attach evidence without ever duplicating checklists.
// Who can see what is enforced by the API: OWNER → everything and controls
// Auditor permissions; delegated managers → grant/revoke Auditor access
// inside their branches; auditors → strictly the businesses + modules granted.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, RefreshCw, Flag, MessageSquare, PencilLine, BadgeCheck, History,
  KeyRound, ScrollText, BarChart3, Rows3, X, FileSpreadsheet, UserCheck, Ban, Search, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import AiSectionGuide from "./AiSectionGuide";

const MODULES = ["OPERATIONS", "FINANCE", "INVENTORY", "EMPLOYEES", "PAYROLL", "ATTENDANCE", "ASSETS", "CCTV"];
const MODULE_LABEL: Record<string, string> = {
  OPERATIONS: "Operations · Production", FINANCE: "Sales · Finance", INVENTORY: "Inventory",
  EMPLOYEES: "Employees", PAYROLL: "Payroll", ATTENDANCE: "Attendance", ASSETS: "Assets", CCTV: "CCTV",
};
const MODULE_TINT: Record<string, string> = {
  OPERATIONS: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  FINANCE: "text-teal-300 bg-teal-500/15 border-teal-500/30",
  INVENTORY: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  EMPLOYEES: "text-violet-300 bg-violet-500/15 border-violet-500/30",
  PAYROLL: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  ATTENDANCE: "text-sky-300 bg-sky-500/15 border-sky-500/30",
  ASSETS: "text-orange-300 bg-orange-500/15 border-orange-500/30",
  CCTV: "text-rose-300 bg-rose-500/15 border-rose-500/30",
};
const ACTION_TINT: Record<string, string> = {
  VERIFIED: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  FLAGGED: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  COMMENT: "text-slate-300 bg-slate-600/25 border-slate-500/30",
  CORRECTION_REQUESTED: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  RESOLVED: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  INFO: "text-slate-300 bg-slate-600/25 border-slate-500/30",
};
const STATE_TINT: Record<string, string> = {
  OPEN: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  RESOLVED: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  VERIFIED: "text-teal-300 bg-teal-500/15 border-teal-500/30",
  INFO: "text-slate-300 bg-slate-600/25 border-slate-500/30",
  UNREVIEWED: "text-slate-500 bg-slate-800/60 border-slate-700",
};
const DONUT_COLORS = ["#34d399", "#f87171", "#fbbf24", "#94a3b8"];
const money = (n: number) => `GH₵ ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtTs = (v: any) => (v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const dayOnly = (v: any) => String(v ?? "").slice(0, 10);

type Rec = any;
type Rev = any;

export default function AuditCommandCenter({ currentUser, businesses }: { currentUser: any; businesses: any[] }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"RECORDS" | "ISSUES" | "REPORTS" | "ACCESS" | "LOG">("RECORDS");
  const [filters, setFilters] = useState({ businessId: "", module: "", recordType: "", branchCode: "", worker: "", status: "", q: "", from: "", to: "" });
  const [histKey, setHistKey] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ rec: Rec; action: string } | null>(null);
  const [actionForm, setActionForm] = useState({ reason: "", comment: "", evidence: "" });
  const [actError, setActError] = useState("");
  const [resolveModal, setResolveModal] = useState<Rev | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [issuesView, setIssuesView] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const [grantForm, setGrantForm] = useState({ userId: "", businessId: "", branchCode: "", note: "", modules: [] as string[] });
  const [accessMsg, setAccessMsg] = useState("");
  const [accessErr, setAccessErr] = useState("");
  const [busy, setBusy] = useState(false);

  const bizSource = data?.bizList?.length ? data.bizList : businesses;
  const bizName = useCallback((id: number) => bizSource.find((b: any) => b.id === id)?.name || `Business #${id}`, [bizSource]);
  const bizCode = useCallback((id: number) => bizSource.find((b: any) => b.id === id)?.code || "", [bizSource]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
      const res = await fetch(`/api/audit${p.size ? `?${p.toString()}` : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load the audit workspace");
      setData(body);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, filters.q || filters.worker ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q, filters.worker]);

  const scope = data?.scope;
  const records: Rec[] = data?.records || [];
  const reviews: Rev[] = data?.reviews || [];
  const log: any[] = data?.log || [];
  const report = data?.report;
  const allowedModules: string[] = useMemo(() => {
    if (!scope) return [];
    if (scope.businessIds === null) return MODULES;
    const set = new Set<string>();
    Object.values(scope.moduleByBusiness || {}).forEach((mods: any) => (mods as string[]).forEach((m) => set.add(m)));
    return MODULES.filter((m) => set.has(m));
  }, [scope]);
  const allowedBusinessIds: number[] | null = scope?.businessIds ?? null;
  const visibleBusinesses = useMemo(
    () => (allowedBusinessIds === null || allowedBusinessIds === undefined ? bizSource : bizSource.filter((b: any) => (allowedBusinessIds as number[]).includes(b.id))),
    [bizSource, allowedBusinessIds]
  );
  const workerOptions = useMemo(() => [...new Set(records.map((r) => r.workerName).filter(Boolean))].sort() as string[], [records]);
  const issues = useMemo(() => {
    const rows = reviews.filter((r: Rev) => r.status === "OPEN" || r.status === "RESOLVED");
    if (issuesView === "ALL") return rows;
    return rows.filter((r: Rev) => r.status === issuesView);
  }, [reviews, issuesView]);
  const reviewsFor = useCallback((rec: Rec) => reviews.filter((r: Rev) => `${r.recordType}:${r.recordSource || ""}:${r.recordId}` === rec.key), [reviews]);

  const submitAction = async () => {
    if (!actionModal) return;
    setBusy(true); setActError("");
    try {
      const res = await fetch("/api/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionModal.action, recordType: actionModal.rec.recordType,
          recordSource: actionModal.rec.recordSource, recordId: actionModal.rec.recordId,
          reason: actionForm.reason, comment: actionForm.comment, evidence: actionForm.evidence,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Review failed");
      setNotice(`${actionModal.action === "VERIFIED" ? "Record verified" : actionModal.action === "FLAGGED" ? "Issue flagged" : actionModal.action === "CORRECTION_REQUESTED" ? "Correction requested" : "Comment added"} — ${actionModal.rec.ref}. It is on the audit trail.`);
      setActionModal(null); setActionForm({ reason: "", comment: "", evidence: "" });
      await load();
    } catch (e: any) { setActError(e.message); } finally { setBusy(false); }
  };

  const submitResolve = async () => {
    if (!resolveModal) return;
    setBusy(true); setResolveError("");
    try {
      const res = await fetch("/api/audit", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE", reviewId: resolveModal.id, resolution: resolveNote }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not resolve");
      setNotice(`Issue on ${resolveModal.recordRef} marked RESOLVED.`);
      setResolveModal(null); setResolveNote("");
      await load();
    } catch (e: any) { setResolveError(e.message); } finally { setBusy(false); }
  };

  const submitGrant = async () => {
    setBusy(true); setAccessErr(""); setAccessMsg("");
    try {
      const res = await fetch("/api/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GRANT", userId: Number(grantForm.userId), businessId: Number(grantForm.businessId), modules: grantForm.modules, branchCode: grantForm.branchCode || undefined, note: grantForm.note || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Grant failed");
      setAccessMsg(body.updated ? "Auditor access updated — modules & scope replaced." : "Auditor access granted. They can now sign in and audit that scope only.");
      setGrantForm({ userId: "", businessId: "", branchCode: "", note: "", modules: [] });
      await load();
    } catch (e: any) { setAccessErr(e.message); } finally { setBusy(false); }
  };

  const revokeGrant = async (grantId: number) => {
    setBusy(true); setAccessErr(""); setAccessMsg("");
    try {
      const res = await fetch("/api/audit", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE_GRANT", grantId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Revoke failed");
      setAccessMsg("Auditor access revoked — effective immediately.");
      await load();
    } catch (e: any) { setAccessErr(e.message); } finally { setBusy(false); }
  };

  const toggleDelegation = async (u: any) => {
    setBusy(true); setAccessErr(""); setAccessMsg("");
    try {
      const res = await fetch("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, canManageAuditors: !u.canManageAuditors }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not update delegation");
      setAccessMsg(!u.canManageAuditors ? `${u.name} may now manage Auditor access for their assigned branches.` : `${u.name}'s Auditor-access delegation removed.`);
      await load();
    } catch (e: any) { setAccessErr(e.message); } finally { setBusy(false); }
  };

  const downloadCsv = () => {
    const head = ["Date", "Time", "Reviewer", "Reviewer Role", "Action", "Status", "Module", "Record", "Record Ref", "Business", "Branch", "Worker", "Reason", "Comment", "Evidence", "Resolution", "Resolved By", "Resolved At"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = reviews.map((r: Rev) => [dayOnly(r.createdAt), fmtTs(r.createdAt).split(", ").pop(), r.reviewerName, r.reviewerRole, r.action, r.status, r.module, r.recordTitle, r.recordRef, bizName(r.businessId), r.branchCode || "", r.workerName || "", r.reason || "", r.comment || "", r.evidence || "", r.resolutionNote || "", r.resolvedByName || "", r.resolvedAt ? fmtTs(r.resolvedAt) : ""].map(esc).join(","));
    const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gomina-audit-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500";
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1";
  const tabs = [
    { key: "RECORDS", label: "Records", icon: Rows3, testid: "aud-tab-RECORDS" },
    { key: "ISSUES", label: `Issues${report ? ` (${report.totals.openIssues} open)` : ""}`, icon: Flag, testid: "aud-tab-ISSUES" },
    { key: "REPORTS", label: "Reports & Charts", icon: BarChart3, testid: "aud-tab-REPORTS" },
    ...(scope?.canGrant ? [{ key: "ACCESS", label: "Auditor Access", icon: KeyRound, testid: "aud-tab-ACCESS" }] : []),
    { key: "LOG", label: "Audit Log", icon: ScrollText, testid: "aud-tab-LOG" },
  ] as any[];

  const kpis = report ? [
    { label: "Records in scope", value: report.totals.records.toLocaleString(), sub: `${visibleBusinesses.length} business(es)` },
    { label: "Reviews logged", value: report.totals.reviews.toLocaleString(), sub: `${report.totals.reviewedRecords} record(s) covered`, tint: "text-teal-300" },
    { label: "Verified", value: report.totals.verified.toLocaleString(), sub: "records confirmed", tint: "text-emerald-300" },
    { label: "Open issues", value: report.totals.openIssues.toLocaleString(), sub: "flags & corrections", tint: "text-amber-300" },
    { label: "Resolved", value: report.totals.resolvedIssues.toLocaleString(), sub: report.avgResolveHrs != null ? `avg ${report.avgResolveHrs}h cycle` : "—", tint: "text-emerald-300" },
    { label: "Flagged amount", value: money(report.totals.flaggedAmount), sub: "open financial flags", tint: "text-rose-300" },
  ] : [];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto" data-testid="aud-root">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-xl font-black text-white">Supervisor & Auditor Control Center</h2>
          <p className="text-[11px] text-slate-400">Review the records workers already keep — verify, flag, comment, request corrections, attach evidence · every action is on the audit trail</p>
        </div>
        {scope && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${scope.level === "OWNER" ? "text-amber-300 bg-amber-500/15 border-amber-500/30" : scope.level === "SUPERVISOR" ? "text-cyan-300 bg-cyan-500/15 border-cyan-500/30" : "text-teal-300 bg-teal-500/15 border-teal-500/30"}`} data-testid="aud-scope">
            {scope.level === "OWNER" ? "OWNER · full control" : scope.level === "SUPERVISOR" ? `SUPERVISOR · ${scope.businessIds?.length ?? 0} business(es)` : `AUDITOR · authorized scope only`}
          </span>
        )}
        <AiSectionGuide moduleKey="AUDIT" section="DEFAULT" variant="header" />
        <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" data-testid="aud-refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs px-4 py-2.5" data-testid="aud-notice">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs px-4 py-2.5" data-testid="aud-error">{error}</div>}

      {/* KPIs */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3" data-testid="aud-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="bg-slate-900 border border-slate-700/80 rounded-xl p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</div>
              <div className={`text-lg font-black ${k.tint || "text-white"}`}>{k.value}</div>
              <div className="text-[10px] text-slate-500">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={t.testid}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition ${tab === t.key ? "bg-teal-500/15 text-teal-300 border-teal-500/40" : "bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters (records / issues / log) */}
      {(tab === "RECORDS" || tab === "ISSUES" || tab === "LOG") && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-2" data-testid="aud-filters">
          <div>
            <label className={labelCls}>Business</label>
            <select className={inputCls} value={filters.businessId} onChange={(e) => setFilters({ ...filters, businessId: e.target.value })} data-testid="aud-f-business">
              <option value="">All in scope</option>
              {visibleBusinesses.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {tab === "RECORDS" && (<>
            <div>
              <label className={labelCls}>Activity / module</label>
              <select className={inputCls} value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value, recordType: "" })} data-testid="aud-f-module">
                <option value="">All modules</option>
                {allowedModules.map((m) => <option key={m} value={m}>{MODULE_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Record type</label>
              <select className={inputCls} value={filters.recordType} onChange={(e) => setFilters({ ...filters, recordType: e.target.value })} data-testid="aud-f-type">
                <option value="">All types</option>
                {[...new Set(records.map((r) => r.recordType))].sort().map((t: any) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input className={inputCls} value={filters.branchCode} placeholder="e.g. POULTRY-01" onChange={(e) => setFilters({ ...filters, branchCode: e.target.value })} data-testid="aud-f-branch" />
            </div>
            <div>
              <label className={labelCls}>Worker</label>
              <input className={inputCls} list="aud-workers" value={filters.worker} placeholder="who recorded it" onChange={(e) => setFilters({ ...filters, worker: e.target.value })} data-testid="aud-f-worker" />
              <datalist id="aud-workers">{workerOptions.map((w) => <option key={w} value={w} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Review status</label>
              <select className={inputCls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} data-testid="aud-f-status">
                <option value="">All</option>
                <option value="UNREVIEWED">Unreviewed</option>
                <option value="VERIFIED">Verified</option>
                <option value="OPEN">Open issues</option>
                <option value="RESOLVED">Resolved</option>
                <option value="INFO">Commented</option>
              </select>
            </div>
          </>)}
          <div>
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} data-testid="aud-f-from" />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input type="date" className={inputCls} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} data-testid="aud-f-to" />
          </div>
          <div>
            <label className={labelCls}>Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input className={`${inputCls} pl-8`} value={filters.q} placeholder="ref, title, person…" onChange={(e) => setFilters({ ...filters, q: e.target.value })} data-testid="aud-f-q" />
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDS ─────────────────────────────────────────────── */}
      {tab === "RECORDS" && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2">Record</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Business · Branch</th>
                <th className="px-3 py-2">Worker</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Review state</th>
                <th className="px-3 py-2 text-right">Audit actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70" data-testid="aud-rec-rows">
              {records.map((r) => (
                <>
                  <tr key={r.key} className="text-slate-300 hover:bg-slate-800/40" data-testid={`aud-rec-row-${r.key}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-[10px] text-cyan-300">{r.ref}</div>
                      <div className="font-semibold text-slate-100">{r.title}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{r.detail}</div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${MODULE_TINT[r.module] || MODULE_TINT.OPERATIONS}`}>{r.module}</span></td>
                    <td className="px-3 py-2.5">{bizName(r.businessId)} · <span className="font-mono text-[10px] text-cyan-300">{r.branchCode || bizCode(r.businessId)}</span></td>
                    <td className="px-3 py-2.5">{r.workerName || <span className="text-slate-600">—</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px]">{r.date || "—"}</td>
                    <td className="px-3 py-2.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATE_TINT[r.reviewState] || STATE_TINT.UNREVIEWED}`} data-testid={`aud-rec-state-${r.key}`}>{r.reviewState}</span></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Review history" onClick={() => setHistKey(histKey === r.key ? null : r.key)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400" data-testid={`aud-hist-${r.key}`}><History className="w-3.5 h-3.5" /></button>
                        <button title="Verify record" onClick={() => { setActionModal({ rec: r, action: "VERIFIED" }); setActionForm({ reason: "", comment: "", evidence: "" }); setActError(""); }} className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30" data-testid={`aud-verify-${r.key}`}><BadgeCheck className="w-3.5 h-3.5" /></button>
                        <button title="Flag issue" onClick={() => { setActionModal({ rec: r, action: "FLAGGED" }); setActionForm({ reason: "", comment: "", evidence: "" }); setActError(""); }} className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30" data-testid={`aud-flag-${r.key}`}><Flag className="w-3.5 h-3.5" /></button>
                        <button title="Request correction" onClick={() => { setActionModal({ rec: r, action: "CORRECTION_REQUESTED" }); setActionForm({ reason: "", comment: "", evidence: "" }); setActError(""); }} className="p-1.5 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30" data-testid={`aud-correct-${r.key}`}><PencilLine className="w-3.5 h-3.5" /></button>
                        <button title="Add comment" onClick={() => { setActionModal({ rec: r, action: "COMMENT" }); setActionForm({ reason: "", comment: "", evidence: "" }); setActError(""); }} className="p-1.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600" data-testid={`aud-comment-${r.key}`}><MessageSquare className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {histKey === r.key && (
                    <tr key={`${r.key}-hist`} className="bg-slate-950/60">
                      <td colSpan={7} className="px-6 py-3" data-testid={`aud-hist-panel-${r.key}`}>
                        {reviewsFor(r).length === 0 ? (
                          <div className="text-[11px] text-slate-500">No reviews yet — this record is unreviewed.</div>
                        ) : (
                          <div className="space-y-2">
                            {reviewsFor(r).map((v: Rev) => (
                              <div key={v.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_TINT[v.action]}`}>{v.action}</span>
                                <span className="text-slate-400">{fmtTs(v.createdAt)}</span>
                                <span className="font-bold text-slate-200">{v.reviewerName}</span>
                                <span className="text-slate-500">({v.reviewerRole})</span>
                                {v.reason && <span className="text-amber-300">reason: {v.reason}</span>}
                                {v.comment && <span className="text-slate-400">“{v.comment}”</span>}
                                {v.evidence && <span className="text-cyan-300 break-all">evidence: {v.evidence}</span>}
                                {v.status === "RESOLVED" && <span className="text-emerald-300">resolved by {v.resolvedByName} · {fmtTs(v.resolvedAt)} · {v.resolutionNote}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {records.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">No records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ISSUES ──────────────────────────────────────────────── */}
      {tab === "ISSUES" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["OPEN", "RESOLVED", "ALL"] as const).map((v) => (
              <button key={v} onClick={() => setIssuesView(v)} data-testid={`aud-issues-${v}`}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${issuesView === v ? "bg-teal-500/15 text-teal-300 border-teal-500/40" : "bg-slate-900 text-slate-400 border-slate-700/80"}`}>
                {v === "OPEN" ? "Open" : v === "RESOLVED" ? "Resolved" : "All"}
              </button>
            ))}
          </div>
          {issues.length === 0 && <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-8 text-center text-slate-500 text-sm">{issuesView === "OPEN" ? "No open issues — everything raised has been resolved." : "Nothing here yet."}</div>}
          {issues.map((i: Rev) => (
            <div key={i.id} className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-2" data-testid={`aud-issue-${i.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_TINT[i.action]}`}>{i.action}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${MODULE_TINT[i.module]}`}>{i.module}</span>
                <span className="font-mono text-[10px] text-cyan-300">{i.recordRef}</span>
                <span className="font-bold text-slate-100 text-xs">{i.recordTitle}</span>
                <span className="text-[10px] text-slate-500">{bizName(i.businessId)} · {i.branchCode || bizCode(i.businessId)}</span>
                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${i.status === "OPEN" ? STATE_TINT.OPEN : STATE_TINT.RESOLVED}`}>{i.status}</span>
              </div>
              {i.reason && <div className="text-xs text-amber-200 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Reason: {i.reason}</div>}
              {i.comment && <div className="text-xs text-slate-300">“{i.comment}”</div>}
              {i.evidence && <div className="text-[11px] text-cyan-300 break-all">Evidence: {i.evidence}</div>}
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span>Raised by <span className="font-bold text-slate-300">{i.reviewerName}</span> ({i.reviewerRole}) · {fmtTs(i.createdAt)}</span>
                {i.workerName && <span>· worker: {i.workerName}</span>}
                {i.status === "OPEN" && (
                  <button onClick={() => { setResolveModal(i); setResolveNote(""); setResolveError(""); }} className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold" data-testid={`aud-issue-resolve-${i.id}`}>
                    Resolve
                  </button>
                )}
              </div>
              {i.status === "RESOLVED" && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-200">
                  Resolved by <span className="font-bold">{i.resolvedByName}</span> · {fmtTs(i.resolvedAt)} — {i.resolutionNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── REPORTS ─────────────────────────────────────────────── */}
      {tab === "REPORTS" && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-400" /> Performance, compliance, financial discrepancies & issues</h4>
            <button onClick={downloadCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold" data-testid="aud-csv">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Reviews CSV
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="aud-chart-module">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Reviews & issues by module</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.byModule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="module" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="verified" name="Verified" stackId="a" fill="#34d399" />
                  <Bar dataKey="openIssues" name="Open issues" stackId="a" fill="#f87171" />
                  <Bar dataKey="reviews" name="Reviews" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="aud-chart-actions">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Review action mix</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}
                    data={[
                      { name: "Verified", value: reviews.filter((r: Rev) => r.action === "VERIFIED").length },
                      { name: "Flagged", value: reviews.filter((r: Rev) => r.action === "FLAGGED").length },
                      { name: "Corrections", value: reviews.filter((r: Rev) => r.action === "CORRECTION_REQUESTED").length },
                      { name: "Comments", value: reviews.filter((r: Rev) => r.action === "COMMENT").length },
                    ].filter((d) => d.value > 0)}>
                    {[0, 1, 2, 3].map((i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="aud-chart-trend">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Review activity — last 6 months</div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={report.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="reviews" name="Reviews" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="issues" name="Issues raised" stroke="#f87171" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="aud-chart-biz">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Open vs resolved issues per business</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={report.byBusiness.map((b: any) => ({ ...b, name: bizCode(b.businessId) || bizName(b.businessId) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} width={90} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="openIssues" name="Open" fill="#f87171" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="resolvedIssues" name="Resolved" fill="#34d399" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance + performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4" data-testid="aud-compliance">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Compliance — review coverage by module</div>
              <div className="space-y-2.5">
                {report.byModule.map((m: any) => (
                  <div key={m.module}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">{MODULE_LABEL[m.module] || m.module}</span>
                      <span className="text-slate-400">{m.reviews} reviews · {m.records} records · {m.openIssues} open</span>
                    </div>
                    <div className="h-1.5 rounded bg-slate-800 overflow-hidden mt-1">
                      <div className="h-full rounded bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${m.reviewedPct}%` }} />
                    </div>
                    <div className="text-right text-[9px] text-slate-500">{m.reviewedPct}% of records reviewed</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 overflow-x-auto" data-testid="aud-perf">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Reviewer performance</div>
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 uppercase text-[9px] tracking-wider">
                  <tr><th className="py-1.5 pr-2">Reviewer</th><th className="py-1.5 pr-2">Role</th><th className="py-1.5 pr-2 text-right">Reviews</th><th className="py-1.5 pr-2 text-right">Verified</th><th className="py-1.5 pr-2 text-right">Flags</th><th className="py-1.5 pr-2 text-right">Corrections</th><th className="py-1.5 text-right">Resolved</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {report.performance.map((p: any, i: number) => (
                    <tr key={i} className="text-slate-300">
                      <td className="py-1.5 pr-2 font-semibold text-slate-100">{p.name}</td>
                      <td className="py-1.5 pr-2">{p.role}</td>
                      <td className="py-1.5 pr-2 text-right">{p.reviews}</td>
                      <td className="py-1.5 pr-2 text-right text-emerald-300">{p.verifications}</td>
                      <td className="py-1.5 pr-2 text-right text-rose-300">{p.flags}</td>
                      <td className="py-1.5 pr-2 text-right text-amber-300">{p.corrections}</td>
                      <td className="py-1.5 text-right text-teal-300">{p.resolved || 0}</td>
                    </tr>
                  ))}
                  {report.performance.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-slate-500">No review activity yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial discrepancies */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden" data-testid="aud-disc">
            <div className="px-4 py-3 flex items-center justify-between bg-slate-950/60 border-b border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Financial discrepancies — open flags & corrections on the books</div>
              <div className="text-rose-300 font-black text-sm" data-testid="aud-disc-total">{money(report.totals.flaggedAmount)}</div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 uppercase text-[9px] tracking-wider bg-slate-950/40">
                <tr><th className="px-4 py-2">Record</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Business</th><th className="px-3 py-2">Raised by</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70" data-testid="aud-disc-rows">
                {report.discrepancies.map((d: any) => (
                  <tr key={d.reviewId} className="text-slate-300">
                    <td className="px-4 py-2"><span className="font-mono text-[10px] text-cyan-300">{d.ref}</span> · {d.title}</td>
                    <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_TINT[d.action]}`}>{d.action}</span></td>
                    <td className="px-3 py-2 text-amber-200">{d.reason || "—"}</td>
                    <td className="px-3 py-2">{bizName(d.businessId)}</td>
                    <td className="px-3 py-2">{d.raisedBy} · {fmtTs(d.raisedAt)}</td>
                    <td className="px-3 py-2 text-right font-bold text-rose-300">{d.amountGhs != null ? money(d.amountGhs) : "—"}</td>
                  </tr>
                ))}
                {report.discrepancies.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No open discrepancies — clean books.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACCESS ──────────────────────────────────────────────── */}
      {tab === "ACCESS" && scope?.canGrant && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3" data-testid="aud-grant-form">
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-400" /> Grant Auditor access</h4>
              <p className="text-[10px] text-slate-500">Choose a user, the business they may audit, and exactly what modules they can see and review. Re-saving the same pair updates the grant.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Auditor (existing user)</label>
                  <select className={inputCls} value={grantForm.userId} onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })} data-testid="aud-grant-user">
                    <option value="">Select user…</option>
                    {(data?.grantUsers || []).map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Business to audit</label>
                  <select className={inputCls} value={grantForm.businessId} onChange={(e) => setGrantForm({ ...grantForm, businessId: e.target.value })} data-testid="aud-grant-business">
                    <option value="">Select business…</option>
                    {visibleBusinesses.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Branch (optional)</label>
                  <input className={inputCls} value={grantForm.branchCode} placeholder="blank = all branches" onChange={(e) => setGrantForm({ ...grantForm, branchCode: e.target.value })} data-testid="aud-grant-branch" />
                </div>
                <div>
                  <label className={labelCls}>Note (optional)</label>
                  <input className={inputCls} value={grantForm.note} placeholder="e.g. Q3 books review" onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })} data-testid="aud-grant-note" />
                </div>
              </div>
              <div>
                <label className={labelCls}>What may they audit?</label>
                <div className="flex flex-wrap gap-1.5">
                  {MODULES.map((m) => (
                    <button key={m} type="button" onClick={() => setGrantForm({ ...grantForm, modules: grantForm.modules.includes(m) ? grantForm.modules.filter((x) => x !== m) : [...grantForm.modules, m] })}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${grantForm.modules.includes(m) ? MODULE_TINT[m] : "bg-slate-800/60 text-slate-500 border-slate-700"}`}
                      data-testid={`aud-grant-mod-${m}`}>
                      {MODULE_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
              {accessErr && <div className="text-[11px] text-rose-300" data-testid="aud-access-error">{accessErr}</div>}
              {accessMsg && <div className="text-[11px] text-emerald-300" data-testid="aud-access-notice">{accessMsg}</div>}
              <button onClick={submitGrant} disabled={busy || !grantForm.userId || !grantForm.businessId || grantForm.modules.length === 0} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold" data-testid="aud-grant-save">
                Save auditor access
              </button>
            </div>

            {currentUser?.role === "OWNER" && (
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-2" data-testid="aud-delegation">
                <h4 className="text-sm font-bold text-white flex items-center gap-2"><UserCheck className="w-4 h-4 text-cyan-400" /> Manager delegation</h4>
                <p className="text-[10px] text-slate-500">Authorize a manager to manage Auditor access for their assigned branches. Grant/revoke here is OWNER-only; managers work strictly inside their own scope.</p>
                {(data?.grantUsers || []).filter((u: any) => ["GENERAL_MANAGER", "BRANCH_MANAGER"].includes(u.role)).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-slate-800/70 last:border-0">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-100">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.role} · {u.assignedBusinessId ? bizName(u.assignedBusinessId) : "All branches"}</div>
                    </div>
                    <button onClick={() => toggleDelegation(u)} disabled={busy}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${u.canManageAuditors ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}
                      data-testid={`aud-delegate-toggle-${u.id}`}>
                      {u.canManageAuditors ? "May manage auditors ✓" : "No delegation"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden h-fit">
            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">Active auditor grants{(data?.grants || []).filter((g: any) => g.isActive).length > 0 ? ` — ${(data?.grants || []).filter((g: any) => g.isActive).length}` : ""}</div>
            <div className="divide-y divide-slate-800/70">
              {(data?.grants || []).map((g: any) => (
                <div key={g.id} className={`px-4 py-3 space-y-1.5 ${g.isActive ? "" : "opacity-50"}`} data-testid={`aud-grant-${g.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100 text-xs">{g.userName}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{g.userRole}</span>
                    <span className="text-[10px] text-slate-400">→ {bizName(g.businessId)}{g.branchCode ? ` · ${g.branchCode}` : " · all branches"}</span>
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${g.isActive ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" : "text-slate-500 bg-slate-800 border-slate-700"}`}>{g.isActive ? "ACTIVE" : "REVOKED"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(g.modules || []).map((m: string) => <span key={m} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${MODULE_TINT[m]}`}>{m}</span>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <span>Granted by {g.grantedByName} · {fmtTs(g.createdAt)}</span>
                    {g.note && <span>· {g.note}</span>}
                    {g.isActive && (
                      <button onClick={() => revokeGrant(g.id)} disabled={busy} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[10px] font-bold" data-testid={`aud-grant-revoke-${g.id}`}>
                        <Ban className="w-3 h-3" /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(data?.grants || []).length === 0 && <div className="px-4 py-8 text-center text-slate-500 text-xs">No auditor grants yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ───────────────────────────────────────────── */}
      {tab === "LOG" && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr><th className="px-4 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Business</th><th className="px-3 py-2">Reason / detail</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70" data-testid="aud-log-rows">
              {log.map((l: any) => (
                <tr key={l.id} className="text-slate-300" data-testid={`aud-log-row-${l.id}`}>
                  <td className="px-4 py-2 font-mono text-[10px] whitespace-nowrap">{fmtTs(l.createdAt)}</td>
                  <td className="px-3 py-2"><span className="font-semibold text-slate-100">{l.actorName}</span> <span className="text-[9px] text-slate-500">({l.actorRole})</span></td>
                  <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_TINT[l.action] || (l.action.includes("GRANT") || l.action === "DELEGATE" ? "text-cyan-300 bg-cyan-500/15 border-cyan-500/30" : l.action === "RESOLVE" ? ACTION_TINT.RESOLVED : "text-slate-300 bg-slate-700/40 border-slate-600")}`}>{l.action}</span></td>
                  <td className="px-3 py-2">{l.targetLabel}</td>
                  <td className="px-3 py-2">{l.businessId ? bizName(l.businessId) : "—"}{l.branchCode ? ` · ${l.branchCode}` : ""}</td>
                  <td className="px-3 py-2 text-slate-400">{l.reason || ""}{l.reason && l.detail ? " — " : ""}{l.detail || ""}</td>
                </tr>
              ))}
              {log.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">Nothing on the audit trail yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Action modal ────────────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-3" data-testid="aud-action">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  {actionModal.action === "VERIFIED" ? "Verify record" : actionModal.action === "FLAGGED" ? "Flag an issue" : actionModal.action === "CORRECTION_REQUESTED" ? "Request a correction" : "Add a comment"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5"><span className="font-mono text-cyan-300">{actionModal.rec.ref}</span> · {actionModal.rec.title}</p>
                <p className="text-[10px] text-slate-500">{bizName(actionModal.rec.businessId)} · {actionModal.rec.branchCode || bizCode(actionModal.rec.businessId)}{actionModal.rec.workerName ? ` · worker: ${actionModal.rec.workerName}` : ""}</p>
              </div>
              <button onClick={() => setActionModal(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400" data-testid="aud-action-close"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className={labelCls}>{actionModal.action === "VERIFIED" ? "Verification basis (optional)" : actionModal.action === "COMMENT" ? "Topic (optional)" : "Reason *"}</label>
              <input className={inputCls} value={actionForm.reason} placeholder={actionModal.action === "FLAGGED" ? "e.g. Amount does not match the MoMo statement" : actionModal.action === "CORRECTION_REQUESTED" ? "e.g. Wrong quantity received" : "e.g. Matched against the MoMo statement"} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} data-testid="aud-action-reason" />
            </div>
            <div>
              <label className={labelCls}>Comment</label>
              <textarea className={`${inputCls} h-20`} value={actionForm.comment} placeholder="Notes for the worker / next reviewer…" onChange={(e) => setActionForm({ ...actionForm, comment: e.target.value })} data-testid="aud-action-comment" />
            </div>
            <div>
              <label className={labelCls}>Evidence (photo / document link or note)</label>
              <input className={inputCls} value={actionForm.evidence} placeholder="e.g. photos drive link, receipt number…" onChange={(e) => setActionForm({ ...actionForm, evidence: e.target.value })} data-testid="aud-action-evidence" />
            </div>
            {actError && <div className="text-[11px] text-rose-300" data-testid="aud-action-error">{actError}</div>}
            <button onClick={submitAction} disabled={busy} className={`w-full py-2.5 rounded-lg text-white text-xs font-bold ${actionModal.action === "VERIFIED" ? "bg-emerald-600 hover:bg-emerald-500" : actionModal.action === "FLAGGED" ? "bg-rose-600 hover:bg-rose-500" : actionModal.action === "CORRECTION_REQUESTED" ? "bg-amber-600 hover:bg-amber-500" : "bg-teal-600 hover:bg-teal-500"}`} data-testid="aud-action-submit">
              {actionModal.action === "VERIFIED" ? "Mark verified" : actionModal.action === "FLAGGED" ? "Raise flag" : actionModal.action === "CORRECTION_REQUESTED" ? "Request correction" : "Post comment"}
            </button>
          </div>
        </div>
      )}

      {/* ── Resolve modal ───────────────────────────────────────── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-3" data-testid="aud-resolve">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Resolve issue</h3>
                <p className="text-[11px] text-slate-400 mt-0.5"><span className="font-mono text-cyan-300">{resolveModal.recordRef}</span> — {resolveModal.reason}</p>
              </div>
              <button onClick={() => setResolveModal(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400" data-testid="aud-resolve-close"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className={labelCls}>Resolution — how was it fixed? *</label>
              <textarea className={`${inputCls} h-20`} value={resolveNote} placeholder="e.g. Deposit slip received and matched; books stand." onChange={(e) => setResolveNote(e.target.value)} data-testid="aud-resolve-note" />
            </div>
            {resolveError && <div className="text-[11px] text-rose-300">{resolveError}</div>}
            <button onClick={submitResolve} disabled={busy || !resolveNote.trim()} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold" data-testid="aud-resolve-submit">
              Mark resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
