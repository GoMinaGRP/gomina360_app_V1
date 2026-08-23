"use client";

import React from "react";
import {
  Beef,
  LayoutDashboard,
  Building2,
  Egg,
  Boxes,
  Fish,
  Utensils,
  Cpu,
  Droplets,
  Users,
  Truck,
  UserCheck,
  Wrench,
  Package,
  CreditCard,
  Sparkles,
  Sliders,
  Share2,
  BarChart3,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  HardHat,
  Landmark,
  Wifi,
} from "lucide-react";

export type ActiveTab =
  | "COMMAND_CENTER"
  | "POULTRY-01"
  | "BLOCK-01"
  | "AQUA-01"
  | "LIVESTOCK-01"
  | "FOOD-01"
  | "TECH-01"
  | "WASH-01"
  | "CUSTOMERS"
  | "SUPPLIERS"
  | "EMPLOYEES"
  | "ASSETS"
  | "INVENTORY"
  | "TRANSACTIONS"
  | "FINANCE"
  | "AI_ADVISOR"
  | "SCENARIO_PLANNER"
  | "INTEGRATIONS"
  | "WORKERS_MANAGE"
  | "BRANCH_SALES"
  | "USERS_MANAGE"
  | "SALES_CENTER"
  | "BRANCH_ASSETS"
  // Allows any dynamically created business code (new branch units)
  | (string & {});

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  businesses: any[];
  currentUser: any;
  auditEligible?: boolean;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  businesses,
  currentUser,
  auditEligible,
}: SidebarProps) {
  const isBusinessManager = currentUser?.role === "BRANCH_MANAGER";
  const isWorker = currentUser?.role === "WORKER";
  const isExecutive =
    currentUser?.role === "OWNER" || currentUser?.role === "GENERAL_MANAGER";
  const assignedBusinessId = currentUser?.assignedBusinessId;

  const businessIcons: Record<string, any> = {
    "POULTRY-01": Egg,
    "BLOCK-01": Boxes,
    "AQUA-01": Fish,
    "LIVESTOCK-01": Building2,
    "FOOD-01": Utensils,
    "TECH-01": Cpu,
    "WASH-01": Droplets,
  };

  const CATEGORY_ICONS: Record<string, any> = {
    "Poultry Farm": Egg,
    "Block Factory": Boxes,
    "Aquaculture": Fish,
    "Livestock": typeof Beef !== "undefined" ? Beef : Building2,
    "Restaurant & Food": Utensils,
    "Electronic Shop": Cpu,
    "Car Wash": Droplets,
    "Hardware Store": HardHat,
    "Telecom & Digital Services": Wifi,
  };

  const isAccessible = (biz: any) => {
    // WORKER can only see their assigned branch
    if (isWorker && assignedBusinessId) return biz.id === assignedBusinessId;
    // BRANCH_MANAGER can only see their assigned branch
    if (isBusinessManager && assignedBusinessId) return biz.id === assignedBusinessId;
    // Owner/GM can see all
    return true;
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-65px)] sticky top-[65px] text-slate-300 overflow-y-auto shrink-0 select-none">
      {/* Top section: Executive Command Center (Owner / General Manager only) */}
      {isExecutive && (
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => onSelectTab("COMMAND_CENTER")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition ${
              activeTab === "COMMAND_CENTER"
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/30 font-bold"
                : "hover:bg-slate-800/80 text-slate-200"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <LayoutDashboard
                className={`w-4 h-4 ${
                  activeTab === "COMMAND_CENTER" ? "text-white" : "text-emerald-400"
                }`}
              />
              <span>Command Center</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
              360° HQ
            </span>
          </button>
        </div>
      )}

      {/* Businesses — executives see all 7; branch managers see only their branch */}
      {!isWorker && (
      <div className="px-3 py-2 border-b border-slate-800/70">
        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {isExecutive ? `${businesses.length} Ghana Businesses` : "My Branch"}
        </div>
        <div className="space-y-1 mt-1">
          {businesses.map((biz) => {
            const IconComp = businessIcons[biz.code] || CATEGORY_ICONS[biz.category] || Building2;
            const accessible = isAccessible(biz);

            return (
              <button
                key={biz.code}
                onClick={() => {
                  if (accessible) onSelectTab(biz.code as ActiveTab);
                }}
                disabled={!accessible}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  activeTab === biz.code
                    ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                    : accessible
                    ? "hover:bg-slate-800/70 text-slate-300"
                    : "opacity-40 cursor-not-allowed text-slate-500"
                }`}
                title={
                  accessible
                    ? `${biz.name} (${biz.branchLocation})`
                    : "Restricted to assigned branch manager"
                }
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <IconComp
                    className={`w-4 h-4 ${
                      activeTab === biz.code
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{biz.name}</span>
                  {(biz.status || "").toUpperCase() === "INACTIVE" && (
                    <span className="text-[9px] font-black text-rose-300 bg-rose-500/15 border border-rose-500/40 px-1 py-0.5 rounded shrink-0">
                      INACTIVE
                    </span>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Shared Enterprise Management Modules — Owner / General Manager only */}
      {isExecutive && (
        <div className="px-3 py-2 border-b border-slate-800/70">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Shared Enterprise Modules
          </div>
          <div className="space-y-1 mt-1">
            <button
              onClick={() => onSelectTab("SALES_CENTER")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "SALES_CENTER"
                  ? "bg-cyan-500/15 text-cyan-400 font-bold border-l-2 border-cyan-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShoppingCart className="w-4 h-4 text-cyan-400" />
                <span>Sales & Payments</span>
              </div>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold border border-cyan-500/30">ALL</span>
            </button>

            <button
              onClick={() => onSelectTab("FINANCE")}
              data-testid="sidebar-tab-finance"
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "FINANCE"
                  ? "bg-cyan-500/15 text-cyan-400 font-bold border-l-2 border-cyan-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Landmark className="w-4 h-4 text-cyan-400" />
                <span>Finance & Reports</span>
              </div>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold border border-cyan-500/30">ALL</span>
            </button>

            <button
              onClick={() => onSelectTab("CUSTOMERS")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "CUSTOMERS"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400/80" />
              <span>Customers & CRM</span>
            </button>

            <button
              onClick={() => onSelectTab("SUPPLIERS")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "SUPPLIERS"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-400/80" />
              <span>Suppliers & Vendors</span>
            </button>

            <button
              onClick={() => onSelectTab("EMPLOYEES")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "EMPLOYEES"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400/80" />
              <span>Employees & Payroll</span>
            </button>

            <button
              onClick={() => onSelectTab("ASSETS")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "ASSETS"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <Wrench className="w-4 h-4 text-emerald-400/80" />
              <span>Assets & Equipment</span>
            </button>

            <button
              onClick={() => onSelectTab("INVENTORY")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "INVENTORY"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <Package className="w-4 h-4 text-emerald-400/80" />
              <span>Inventory & Stock</span>
            </button>

            <button
              onClick={() => onSelectTab("TRANSACTIONS")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "TRANSACTIONS"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-400/80" />
              <span>Transactions & MoMo</span>
            </button>
          </div>
        </div>
      )}

      {/* WORKER workspace note — all tools live inside the Sales Workspace tabs */}
      {isWorker && (
        <div className="px-3 py-2 border-b border-slate-800/70">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            My Sales Workspace
          </div>
          <div className="space-y-1 mt-1">
            <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
              Use the workspace tabs to record sales, receive payments, add
              customers, view branch inventory, and track your activity.
            </div>
          </div>
        </div>
      )}

      {/* BRANCH_MANAGER: Worker Management panel */}
      {isBusinessManager && (
        <div className="px-3 py-2 border-b border-slate-800/70">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            Branch Management
          </div>
          <div className="space-y-1 mt-1">
            <button
              onClick={() => onSelectTab("BRANCH_SALES")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "BRANCH_SALES"
                  ? "bg-cyan-500/15 text-cyan-400 font-bold border-l-2 border-cyan-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShoppingCart className="w-4 h-4 text-cyan-400" />
                <span>Sales & Payments</span>
              </div>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold border border-cyan-500/30">SALES</span>
            </button>
            <button
              onClick={() => onSelectTab("BRANCH_ASSETS")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "BRANCH_ASSETS"
                  ? "bg-purple-500/15 text-purple-300 font-bold border-l-2 border-purple-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Wrench className="w-4 h-4 text-purple-400" />
                <span>Branch Assets</span>
              </div>
            </button>
            <button
              onClick={() => onSelectTab("WORKERS_MANAGE")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "WORKERS_MANAGE"
                  ? "bg-cyan-500/15 text-cyan-400 font-bold border-l-2 border-cyan-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Manage Sales Persons</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Oversight & Assurance — Supervisors & Auditors. Executives and
          managers act as supervisors inside their scope; any user the OWNER
          (or a delegated manager) granted Auditor access to also sees this —
          strictly limited to their authorized businesses & modules. */}
      {(isExecutive || isBusinessManager || currentUser?.role === "SUPERVISOR" || currentUser?.canManageAuditors || auditEligible) && (
        <div className="px-3 py-2">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Oversight & Assurance
          </div>
          <button
            onClick={() => onSelectTab("AUDIT")}
            data-testid="audit-tab"
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "AUDIT"
                ? "bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 font-bold border-l-2 border-teal-400"
                : "hover:bg-slate-800/70 text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Audit & Review</span>
            </div>
            <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1 py-0.5 rounded font-bold">
              QA
            </span>
          </button>
        </div>
      )}

      {/* Strategic Decision Support & Integrations — Owner / General Manager only.
          Managers the OWNER has trusted with CCTV management also see this
          section, strictly for the Integrations Hub (their CCTV scope). */}
      {(isExecutive || currentUser?.canManageCctv) && (
        <div className="px-3 py-2">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Decision Support & Hub
          </div>
          <div className="space-y-1 mt-1">
            {isExecutive && (
            <button
              onClick={() => onSelectTab("AI_ADVISOR")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "AI_ADVISOR"
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI Strategic Advisor</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">
                AI
              </span>
            </button>
            )}

            {isExecutive && (
            <button
              onClick={() => onSelectTab("SCENARIO_PLANNER")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "SCENARIO_PLANNER"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Scenario Planning</span>
            </button>
            )}

            <button
              onClick={() => onSelectTab("INTEGRATIONS")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "INTEGRATIONS"
                  ? "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400"
                  : "hover:bg-slate-800/70 text-slate-300"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Integrations Hub</span>
              </div>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold">
                CCTV/MoMo
              </span>
            </button>

            {/* OWNER or GENERAL_MANAGER User & Branch Assignment Management */}
            {(currentUser?.role === "OWNER" || currentUser?.role === "GENERAL_MANAGER") && (
              <button
                onClick={() => onSelectTab("USERS_MANAGE")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  activeTab === "USERS_MANAGE"
                    ? "bg-cyan-500/15 text-cyan-400 font-bold border-l-2 border-cyan-400"
                    : "hover:bg-slate-800/70 text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Enterprise Users</span>
                </div>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold border border-cyan-500/30">HQ</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-auto p-3.5 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center space-x-2.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-300 font-medium">
            Command Center Active
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          GH₵ Base Currency • Multi-Branch Ready
        </p>
      </div>
    </aside>
  );
}
