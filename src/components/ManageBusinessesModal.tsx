"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import LocationSelector, { LocationValue } from "./LocationSelector";

const CATEGORIES = [
  "Poultry Farm",
  "Block Factory",
  "Aquaculture",
  "Livestock",
  "Restaurant & Food",
  "Electronic Shop",
  "Car Wash",
];

const STATUSES = ["ACTIVE", "EXPANDING", "MAINTENANCE", "INACTIVE"];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  EXPANDING: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  MAINTENANCE: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  INACTIVE: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

interface ManageBusinessesModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: any[];
  currentUser: any;
  onChanged: () => void | Promise<void>;
  onAddNew: () => void;
  onDeleted?: (code: string) => void;
}

type Mode = "list" | "edit" | "delete";

export default function ManageBusinessesModal({
  isOpen,
  onClose,
  businesses,
  currentUser,
  onChanged,
  onAddNew,
  onDeleted,
}: ManageBusinessesModalProps) {
  const isOwner = currentUser?.role === "OWNER";

  const [mode, setMode] = useState<Mode>("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Two-step arm for deactivate / reactivate
  const [armedCode, setArmedCode] = useState<string | null>(null);

  // Edit form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState<LocationValue>({
    region: "Greater Accra",
    district: "",
    town: "",
  });
  const [managerName, setManagerName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [initialCapitalGhs, setInitialCapitalGhs] = useState(0);
  const [monthlyTargetRevenueGhs, setMonthlyTargetRevenueGhs] = useState(0);
  const [status, setStatus] = useState("ACTIVE");

  // Delete-confirmation state
  const [deleteCounts, setDeleteCounts] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const sorted = useMemo(
    () => [...businesses].sort((a, b) => a.id - b.id),
    [businesses]
  );

  useEffect(() => {
    if (isOpen) {
      setMode("list");
      setSelected(null);
      setError("");
      setNotice("");
      setArmedCode(null);
      setConfirmText("");
      setDeleteCounts(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const openEdit = (biz: any) => {
    setSelected(biz);
    setName(biz.name || "");
    setCategory(CATEGORIES.includes(biz.category) ? biz.category : CATEGORIES[0]);
    setLocation({
      region: biz.region || "Greater Accra",
      district: biz.district || "",
      town: biz.town || "",
    });
    setManagerName(biz.managerName || "");
    setContactPhone(biz.contactPhone || "");
    setInitialCapitalGhs(Number(biz.initialCapitalGhs) || 0);
    setMonthlyTargetRevenueGhs(Number(biz.monthlyTargetRevenueGhs) || 0);
    setStatus((biz.status || "ACTIVE").toUpperCase());
    setError("");
    setNotice("");
    setMode("edit");
  };

  const openDelete = async (biz: any) => {
    setSelected(biz);
    setConfirmText("");
    setDeleteCounts(null);
    setError("");
    setNotice("");
    setMode("delete");
    try {
      const res = await fetch(`/api/businesses/${biz.id}`);
      const d = await res.json();
      if (res.ok && d?.success) setDeleteCounts(d.counts);
    } catch {
      /* counts are informational only */
    }
  };

  const resetToList = () => {
    setMode("list");
    setSelected(null);
    setArmedCode(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/businesses/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorUserId: currentUser?.id ?? null,
          name,
          category,
          region: location.region,
          district: location.district,
          town: location.town,
          managerName,
          contactPhone,
          initialCapitalGhs: Number(initialCapitalGhs),
          monthlyTargetRevenueGhs: Number(monthlyTargetRevenueGhs),
          status,
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.success) {
        await onChanged();
        const tc = d.typeChange;
        setNotice(
          tc
            ? `"${d.business.name}" updated — type changed to ${d.business.category}. New-type starter kit (${tc.kitItemsAdded} items) and checklists provisioned automatically across inventory, finance, dashboards & reports.`
            : `"${d.business.name}" updated — every dashboard, report and module now reflects the change.`
        );
        resetToList();
      } else {
        setError(d?.error || "Failed to update the business unit.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error while updating the unit.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (biz: any) => {
    // First click arms, second click confirms.
    if (armedCode !== biz.code) {
      setArmedCode(biz.code);
      return;
    }
    setArmedCode(null);
    const next = (biz.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/businesses/${biz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, actorUserId: currentUser?.id ?? null }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.success) {
        await onChanged();
        setNotice(
          next === "INACTIVE"
            ? `"${d.business.name}" deactivated — it is flagged INACTIVE everywhere (sidebar, dashboards, reports) but ALL data is preserved.`
            : `"${d.business.name}" re-activated and fully operational again.`
        );
      } else {
        setError(d?.error || "Failed to change status.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error while changing status.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || confirmText.trim() !== selected.code) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/businesses/${selected.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCode: confirmText.trim(), actorUserId: currentUser?.id ?? null }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.success) {
        await onChanged();
        onDeleted?.(selected.code);
        setNotice(
          `"${d.deleted.name}" (${d.deleted.code}) permanently deleted — ${d.removedRecords} related records removed; all dashboards and reports updated.`
        );
        resetToList();
      } else {
        setError(d?.error || "Failed to delete the business unit.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error while deleting the unit.");
    } finally {
      setBusy(false);
    }
  };

  const countRow = (label: string, value: number) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70 last:border-0">
      <span className="text-slate-300">{label}</span>
      <span className={`font-black ${value > 0 ? "text-rose-300" : "text-slate-500"}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      data-testid="manage-biz-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Manage Businesses & Branches
              </h3>
              <p className="text-xs text-slate-400">
                {mode === "list" &&
                  "Owner console — add, edit, rename, relocate, change type, deactivate or permanently delete any unit"}
                {mode === "edit" && `Editing ${selected?.name} (${selected?.code})`}
                {mode === "delete" && `Confirm permanent deletion of ${selected?.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {mode !== "list" && (
              <button
                onClick={resetToList}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Units</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!isOwner && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-lg text-xs">
              Only the OWNER can change business units. You are viewing this console read-only.
            </div>
          )}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2.5 rounded-lg text-xs">
              {error}
            </div>
          )}
          {notice && (
            <div
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-lg text-xs"
              data-testid="manage-biz-notice"
            >
              {notice}
            </div>
          )}

          {/* ============ LIST MODE ============ */}
          {mode === "list" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  <span className="font-black text-white">{sorted.length}</span> enterprise units
                  under management
                </div>
                {isOwner && (
                  <button
                    onClick={() => {
                      onClose();
                      onAddNew();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Branch / Unit</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {sorted.map((biz) => {
                  const inactive = (biz.status || "").toUpperCase() === "INACTIVE";
                  const armed = armedCode === biz.code;
                  return (
                    <div
                      key={biz.code}
                      data-testid={`manage-biz-row-${biz.code}`}
                      className={`rounded-xl border p-3.5 transition ${
                        inactive
                          ? "bg-slate-900/40 border-rose-500/25"
                          : "bg-slate-800/60 border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              inactive
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold text-sm truncate ${
                                  inactive ? "text-slate-400 line-through" : "text-white"
                                }`}
                              >
                                {biz.name}
                              </span>
                              <span className="text-[10px] font-black bg-slate-700/70 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                {biz.code}
                              </span>
                              <span
                                data-testid={`manage-status-${biz.code}`}
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                  STATUS_STYLE[(biz.status || "ACTIVE").toUpperCase()] ||
                                  STATUS_STYLE.ACTIVE
                                }`}
                              >
                                {(biz.status || "ACTIVE").toUpperCase()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>{biz.category}</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {biz.branchLocation}
                                {biz.region ? ` • ${biz.region}` : ""}
                              </span>
                              <span>Manager: {biz.managerName}</span>
                            </div>
                          </div>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => openEdit(biz)}
                              data-testid={`manage-biz-edit-${biz.code}`}
                              title="Edit / rename / relocate / change type"
                              className="p-2 rounded-lg bg-slate-700/70 hover:bg-indigo-500/30 text-slate-200 hover:text-indigo-300 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(biz)}
                              disabled={busy}
                              data-testid={`manage-biz-deactivate-${biz.code}`}
                              title={inactive ? "Re-activate unit" : "Deactivate unit"}
                              className={`px-2 py-2 rounded-lg text-[10px] font-black transition flex items-center gap-1 ${
                                armed
                                  ? "bg-amber-500/30 text-amber-200 border border-amber-400/50"
                                  : inactive
                                  ? "bg-slate-700/70 hover:bg-emerald-500/30 text-slate-200 hover:text-emerald-300"
                                  : "bg-slate-700/70 hover:bg-amber-500/30 text-slate-200 hover:text-amber-300"
                              }`}
                            >
                              <Power className="w-4 h-4" />
                              {armed
                                ? inactive
                                  ? "Confirm Re-activate"
                                  : "Confirm Deactivate"
                                : inactive
                                ? "Re-activate"
                                : "Deactivate"}
                            </button>
                            <button
                              onClick={() => openDelete(biz)}
                              data-testid={`manage-biz-delete-${biz.code}`}
                              title="Permanently delete unit"
                              className="p-2 rounded-lg bg-slate-700/70 hover:bg-rose-500/30 text-slate-200 hover:text-rose-300 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ============ EDIT MODE ============ */}
          {mode === "edit" && selected && (
            <form onSubmit={handleSaveEdit} className="space-y-3" data-testid="manage-biz-form">
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-3 text-[11px] text-indigo-200/90 leading-relaxed">
                Changes apply instantly across <b>inventory, production, sales, customers, orders,
                finance, dashboards and reports</b>. Changing the <b>business type</b> automatically
                provisions the new type's starter stock kit and daily-checklist templates while
                preserving all existing records.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Business Name (rename)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Unit Code (fixed identifier)
                  </label>
                  <input
                    type="text"
                    value={selected.code}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-lg text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Business Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    data-testid="manage-biz-category"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {category !== selected.category && (
                    <p className="text-[10px] text-amber-300 mt-1">
                      Type change: this unit will mount the {category} module; new-type starter
                      stock & checklists will be provisioned automatically.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <LocationSelector
                  value={location}
                  onChange={setLocation}
                  compact
                  required
                  headingLabel="Branch Location (Ghana) — change location"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Assigned Branch Manager
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Initial Capital (GH₵)
                  </label>
                  <input
                    type="number"
                    value={initialCapitalGhs}
                    onChange={(e) => setInitialCapitalGhs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Monthly Target Revenue (GH₵)
                  </label>
                  <input
                    type="number"
                    value={monthlyTargetRevenueGhs}
                    onChange={(e) => setMonthlyTargetRevenueGhs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetToList}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="manage-biz-save"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ============ DELETE MODE ============ */}
          {mode === "delete" && selected && (
            <div className="space-y-4" data-testid="manage-biz-delete-panel">
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 p-4">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Permanent deletion — this cannot be undone
                </div>
                <p className="text-[12px] text-rose-200/80 leading-relaxed">
                  Deleting <b>{selected.name}</b> ({selected.code}) removes the unit together with
                  every related record, and all dashboards, finance and reports update immediately.
                  Staff user accounts are preserved (un-assigned). Enterprise suppliers are shared
                  and are not affected.
                </p>
              </div>

              <div
                className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 text-[12px]"
                data-testid="manage-delete-counts"
              >
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">
                  Records that will be permanently removed
                </div>
                {deleteCounts ? (
                  <>
                    {countRow("Inventory / stock items", deleteCounts.groups.inventoryItems)}
                    {countRow("Sales documents & orders", deleteCounts.groups.salesDocuments)}
                    {countRow("Financial transactions", deleteCounts.groups.transactions)}
                    {countRow("Production & operations records", deleteCounts.groups.productionAndOps)}
                    {countRow("Employees", deleteCounts.groups.employees)}
                    {countRow("Customers", deleteCounts.groups.customers)}
                    {countRow("Assets", deleteCounts.groups.assets)}
                    {countRow("Checklist templates & entries", deleteCounts.groups.checklists)}
                    {countRow("Financial metric periods", deleteCounts.groups.metrics)}
                    {countRow("Custom expense categories", deleteCounts.groups.expenseCategories)}
                    {countRow("Export records", deleteCounts.groups.exports)}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-700">
                      <span className="font-bold text-white">TOTAL RECORDS</span>
                      <span className="font-black text-rose-300">
                        {deleteCounts.totalRecords}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 text-xs py-2">Counting related records…</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Type <span className="font-black text-rose-300">{selected.code}</span> to confirm
                  deletion
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={selected.code}
                  data-testid="manage-delete-confirm-input"
                  className="w-full px-3 py-2 bg-slate-800 border border-rose-500/40 rounded-lg text-white text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-1">
                <button
                  onClick={resetToList}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy || confirmText.trim() !== selected.code}
                  data-testid="manage-delete-confirm"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy ? "Deleting..." : "Permanently Delete Unit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
