"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Navbar from "./Navbar";
import LoginScreen from "./LoginScreen";
import Sidebar, { ActiveTab } from "./Sidebar";
import CommandCenterDashboard from "./CommandCenterDashboard";
import SpecializedBusinessView from "./SpecializedBusinessView";
import SharedEnterpriseModule from "./SharedEnterpriseModule";
import AiAdvisorView from "./AiAdvisorView";
import ScenarioPlannerView from "./ScenarioPlannerView";
import IntegrationsHubView from "./IntegrationsHubView";
import NewBusinessModal from "./NewBusinessModal";
import ManageBusinessesModal from "./ManageBusinessesModal";
import UserAccessConsole from "./UserAccessConsole";
import ChangePasswordModal from "./ChangePasswordModal";
import WorkerDashboard from "./WorkerDashboard";
import BranchManagerWorkerPanel from "./BranchManagerWorkerPanel";
import BranchManagerSalesView from "./BranchManagerSalesView";
import EnterpriseUserPanel from "./EnterpriseUserPanel";
import PoultryFarmModule from "./PoultryFarmModule";
import BlockFactoryModule from "./BlockFactoryModule";
import AquacultureModule from "./AquacultureModule";
import ElectronicsShopModule from "./ElectronicsShopModule";
import RestaurantKitchenModule from "./RestaurantKitchenModule";
import HardwareStoreModule from "./HardwareStoreModule";
import CarWashModule from "./CarWashModule";
import BusinessDashboardModule from "./BusinessDashboardModule";
import UniversalExportCenter from "./UniversalExportCenter";
import { CurrencyCode } from "@/lib/currency";
import { getOfflineQueue } from "@/lib/offlineSync";
import { installSessionBridge, setSessionToken, clearSessionToken } from "@/lib/sessionBridge";
import { Loader2 } from "lucide-react";

export default function GoMinaApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application Data State
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [checklistData, setChecklistData] = useState<{ templates: any[]; entries: any[] }>({ templates: [], entries: [] });
  const [specializedLogs, setSpecializedLogs] = useState<Record<string, any[]>>({
    poultry: [],
    blockFactory: [],
    aquaculture: [],
    livestock: [],
    restaurant: [],
    electronics: [],
    carWash: [],
    hardware: [],
  });

  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>("COMMAND_CENTER");
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>("GHS");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [isNewBusinessModalOpen, setIsNewBusinessModalOpen] = useState(false);
  const [isManageBizOpen, setIsManageBizOpen] = useState(false);
  const [isUserAccessOpen, setIsUserAccessOpen] = useState(false);
  // Self-service password change (account menu → Change Password).
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  // Secure-session state (declared with the other UI state so the data
  // refresh callback below can safely bounce a dead session to sign-in).
  const [signedIn, setSignedIn] = useState(false);
  // One-line explanation shown on the sign-in screen when a login POST
  // succeeded but the browser refused to keep the session cookie.
  const [loginNotice, setLoginNotice] = useState("");

  // Baseline snapshot of the highest transaction id at first load. Any transaction
  // created after this point (a new in-app sale/expense) is layered onto the seeded
  // quarter-to-date metrics so dashboards update live without double-counting.
  const baselineMaxTxnId = useRef<number | null>(null);

  const refreshAllData = useCallback(async (): Promise<"ok" | "unauthorized" | "error"> => {
    try {
      const res = await fetch("/api/init");
      // Session gone (expired, revoked by the OWNER, or the server/database
      // was redeployed): NEVER strand the user on a dead-end "Connection
      // Notice — Sign in required" panel. Bounce straight back to the
      // sign-in screen so they can re-authenticate cleanly.
      if (res.status === 401) {
        setSignedIn(false);
        setCurrentUser(null);
        setError(null);
        return "unauthorized";
      }
      const data = await res.json();
      if (data.success) {
        // A healthy response must clear any previously displayed error —
        // otherwise a stale notice would keep covering the working app.
        setError(null);
        setBusinesses(data.businesses || []);
        setMetrics(data.metrics || []);
        setUsersList(data.users || []);
        // Keep the signed-in user object in sync with freshly fetched rows
        // (permission changes apply instantly) — never auto-pick users[0]:
        // identity comes from the secure login session only.
        setCurrentUser((prev: any) => {
          if (!prev) return prev;
          const fresh = (data.users || []).find((u: any) => u.id === prev.id);
          return fresh ? { ...fresh } : prev;
        });
        setCustomers(data.customers || []);
        setSuppliers(data.suppliers || []);
        setEmployees(data.employees || []);
        setAssets(data.assets || []);
        setInventory(data.inventory || []);
        const txns = data.transactions || [];
        if (baselineMaxTxnId.current === null) {
          baselineMaxTxnId.current = txns.reduce(
            (mx: number, t: any) => Math.max(mx, t.id || 0),
            0
          );
        }
        setTransactions(txns);
        setAiInsights(data.aiInsights || []);
        setScenarios(data.scenarios || []);
        setIntegrations(data.integrations || []);
        setChecklistData(data.checklists || { templates: [], entries: [] });
        setSpecializedLogs(
          data.specializedLogs || {
            poultry: [],
            blockFactory: [],
            aquaculture: [],
            livestock: [],
            restaurant: [],
            electronics: [],
            carWash: [],
            hardware: [],
          }
        );
        return "ok";
      } else {
        setError(data.error || "Failed to load enterprise data.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Command Center.");
    } finally {
      setLoading(false);
      setOfflineQueueCount(getOfflineQueue().length);
    }
    return "error";
  }, []);

  // Attach the bearer-token channel to every /api fetch before ANY fetch can
  // fire (the cookie stays primary; the header saves embedded contexts whose
  // browsers block third-party cookie storage).
  useEffect(() => { installSessionBridge(); }, []);

  // ── Secure login bootstrap ──────────────────────────────────────────────
  // Identity comes from the server session (httpOnly cookie). No session →
  // the app renders the sign-in screen and fetches NOTHING else.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const d = await res.json().catch(() => null);
        if (res.ok && d?.success) {
          setCurrentUser(d.user);
          setSignedIn(true);
          await refreshAllData();
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSuccess = async (user: any, sessionToken?: string) => {
    setError(null);
    setLoginNotice("");
    if (sessionToken) setSessionToken(sessionToken);
    setLoading(true);
    setCurrentUser(user);
    setSignedIn(true);
    baselineMaxTxnId.current = null;
    const status = await refreshAllData();
    if (status === "unauthorized") {
      // The login POST succeeded but the very next authenticated call came
      // back 401: the browser refused to store/send the session cookie
      // (third-party-cookie policy on an embedded/iframe preview). Do NOT
      // just blink back to a silent sign-in — explain precisely what to do.
      setSignedIn(false);
      setCurrentUser(null);
      setLoginNotice(
        "Signed in, but your browser would not keep the session cookie, so the session ended immediately. Allow cookies for this site (including third-party cookies when the app is embedded) — or open the app in its own browser tab — then sign in again."
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* best effort */ }
    clearSessionToken();
    setSignedIn(false);
    setCurrentUser(null);
    setLoginNotice("");
    setActiveTab("COMMAND_CENTER");
  };

  // Live metrics: seeded quarter-to-date baseline + newly recorded transactions
  // + the live sum of registered asset values per business. This keeps every
  // dashboard accurate and automatically in sync whenever a sale, expense, or
  // asset is recorded.
  const liveMetrics = useMemo(() => {
    const baseId = baselineMaxTxnId.current ?? 0;

    // Sum current asset value grouped by businessId
    const assetValueByBiz: Record<number, number> = {};
    for (const a of assets) {
      const bid = a.businessId;
      if (bid === undefined || bid === null) continue;
      assetValueByBiz[bid] = (assetValueByBiz[bid] || 0) + (a.currentValueGhs || 0);
    }

    return metrics.map((m) => {
      // Live asset value: prefer the sum of registered assets when available;
      // fall back to the seeded metric so the number is never blank.
      const liveAssetsValue = assetValueByBiz[m.businessId] || m.assetsValueGhs;

      const newTx = transactions.filter(
        (t) => t.businessId === m.businessId && (t.id || 0) > baseId
      );
      const income = newTx
        .filter((t) => t.type === "INCOME")
        .reduce((a, t) => a + (t.amountGhs || 0), 0);
      const expense = newTx
        .filter((t) => t.type === "EXPENSE")
        .reduce((a, t) => a + (t.amountGhs || 0), 0);

      const revenueGhs = m.revenueGhs + income;
      const expensesGhs = m.expensesGhs + expense;
      const netProfitGhs = revenueGhs - expensesGhs;
      const cashFlowGhs = m.cashFlowGhs + income - expense;
      const roiPercent =
        liveAssetsValue > 0
          ? Number(((netProfitGhs / liveAssetsValue) * 100).toFixed(1))
          : m.roiPercent;
      return {
        ...m,
        assetsValueGhs: liveAssetsValue,
        revenueGhs,
        expensesGhs,
        netProfitGhs,
        cashFlowGhs,
        roiPercent,
        // Lets the shared Financial Report recover the seeded Q1-2026 baseline
        // hidden inside this blended row (baselineTxId = highest txn id present
        // at session load, i.e. everything seeded/prior-session).
        baselineTxId: baseId,
      };
    });
  }, [metrics, transactions, assets]);

  // Reset to a role-appropriate landing tab whenever the active user changes.
  // Prevents a lower-privilege user from inheriting an executive tab (data leak).
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "BRANCH_MANAGER") {
      setActiveTab("BRANCH_SALES");
    } else if (currentUser.role === "WORKER") {
      // Worker view is self-contained; render layer intercepts regardless of tab.
      setActiveTab("COMMAND_CENTER");
    } else {
      setActiveTab("COMMAND_CENTER");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleRefreshLogsForBusiness = async (businessCode: string) => {
    try {
      const res = await fetch(`/api/logs/${businessCode}`);
      const data = await res.json();
      if (data.success) {
        const upper = businessCode.toUpperCase();
        // Merge by businessId: replace ONLY the refreshed unit's rows inside
        // its type bucket, leaving every other same-type unit's logs intact
        // (buckets are shared per type, e.g. WASH-01 and WASH-02 → carWash).
        const bucket = upper.startsWith("POULTRY")
          ? "poultry"
          : upper.startsWith("BLOCK")
          ? "blockFactory"
          : upper.startsWith("AQUA")
          ? "aquaculture"
          : upper.startsWith("LIVESTOCK")
          ? "livestock"
          : upper.startsWith("FOOD")
          ? "restaurant"
          : upper.startsWith("TECH")
          ? "electronics"
          : upper.startsWith("WASH")
          ? "carWash"
          : upper.startsWith("HARDWARE")
          ? "hardware"
          : null;
        setSpecializedLogs((prev) => {
          if (!bucket) return prev;
          return {
            ...prev,
            [bucket]: [
              ...(prev[bucket] || []).filter((r: any) => r.businessId !== data.businessId),
              ...(data.logs || []),
            ],
          };
        });
      }
      setOfflineQueueCount(getOfflineQueue().length);
    } catch (err) {
      console.error("Error refreshing logs:", err);
    }
  };

  const renderActiveView = () => {
    const isExecutive =
      currentUser?.role === "OWNER" || currentUser?.role === "GENERAL_MANAGER";
    const isBranchManager = currentUser?.role === "BRANCH_MANAGER";

    // WORKER role: self-contained workspace. All tools (record sale, create
    // customer, view branch inventory, my activity) live inside WorkerDashboard,
    // which is strictly scoped to the worker's own branch — no enterprise data.
    if (currentUser?.role === "WORKER") {
      const bizCode = businesses.find((b) => b.id === currentUser?.assignedBusinessId)?.code;
      const bizInfo = businesses.find((b) => b.id === currentUser?.assignedBusinessId);
      const bizMetric = liveMetrics.find((m) => m.businessId === bizInfo?.id);

      // Operations logs of the worker's OWN branch only — prefix-based so any
      // unit of the same type (original or created later) resolves correctly.
      const ownLogs = (bucket: any[]) =>
        bucket.filter((l: any) => !l.businessId || l.businessId === bizInfo?.id);
      const upperBiz = (bizCode || "").toUpperCase();
      let logs: any[] = [];
      if (upperBiz.startsWith("POULTRY")) logs = ownLogs(specializedLogs.poultry || []);
      else if (upperBiz.startsWith("BLOCK")) logs = ownLogs(specializedLogs.blockFactory || []);
      else if (upperBiz.startsWith("AQUA")) logs = ownLogs(specializedLogs.aquaculture || []);
      else if (upperBiz.startsWith("LIVESTOCK")) logs = ownLogs(specializedLogs.livestock || []);
      else if (upperBiz.startsWith("FOOD")) logs = ownLogs(specializedLogs.restaurant || []);
      else if (upperBiz.startsWith("TECH")) logs = ownLogs(specializedLogs.electronics || []);
      else if (upperBiz.startsWith("WASH")) logs = ownLogs(specializedLogs.carWash || []);
      else if (upperBiz.startsWith("HARDWARE")) logs = ownLogs(specializedLogs.hardware || []);

      return (
        <WorkerDashboard
          currentUser={currentUser}
          businessInfo={bizInfo}
          businessMetrics={bizMetric}
          specializedLogs={logs}
          inventory={inventory}
          customers={customers}
          transactions={transactions}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshData={refreshAllData}
        />
      );
    }

    // BRANCH_MANAGER: strictly scoped to their own branch. Any attempt to reach an
    // executive/enterprise tab falls back to their branch Sales & Payments center.
    if (isBranchManager) {
      const ownBranch = businesses.find((b) => b.id === currentUser?.assignedBusinessId);
      const allowed = new Set<string>([
        "BRANCH_SALES",
        "WORKERS_MANAGE",
        "BRANCH_ASSETS",
      ]);
      if (ownBranch?.code) allowed.add(ownBranch.code);
      if (!allowed.has(activeTab)) {
        const bizMetric = liveMetrics.find((m) => m.businessId === ownBranch?.id);
        return (
          <BranchManagerSalesView
            currentUser={currentUser}
            businessInfo={ownBranch}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            transactions={transactions}
            businesses={businesses}
            metrics={liveMetrics}
            currentCurrency={currentCurrency}
            isOnline={isOnline}
            onRefreshData={refreshAllData}
          />
        );
      }
    }

    // EXECUTIVE (Owner / General Manager): unified Sales Center across all branches.
    if (isExecutive && activeTab === "SALES_CENTER") {
      return (
        <BranchManagerSalesView
          currentUser={currentUser}
          businessInfo={businesses[0]}
          businessMetrics={undefined}
          inventory={inventory}
          customers={customers}
          transactions={transactions}
          businesses={businesses}
          metrics={liveMetrics}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshData={refreshAllData}
          isExecutive
        />
      );
    }

    // Executive-only tabs guard: block non-executives from enterprise surfaces.
    const executiveOnlyTabs: ActiveTab[] = [
      "COMMAND_CENTER",
      "SUPPLIERS",
      "EMPLOYEES",
      "ASSETS",
      "TRANSACTIONS",
      "CUSTOMERS",
      "INVENTORY",
      "AI_ADVISOR",
      "SCENARIO_PLANNER",
      "INTEGRATIONS",
      "USERS_MANAGE",
    ];
    if (!isExecutive && executiveOnlyTabs.includes(activeTab)) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-8 max-w-md text-center space-y-3">
            <h2 className="text-lg font-bold text-amber-300">Access Restricted</h2>
            <p className="text-sm text-slate-300">
              This enterprise module is available to Owners and General Managers only.
            </p>
          </div>
        </div>
      );
    }

    // BRANCH_MANAGER: Branch Asset Register (scoped to their own branch)
    if (activeTab === "BRANCH_ASSETS") {
      return (
        <SharedEnterpriseModule
          moduleType="ASSETS"
          customers={customers}
          suppliers={suppliers}
          employees={employees}
          assets={assets}
          inventory={inventory}
          transactions={transactions}
          businesses={businesses}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshData={refreshAllData}
          currentUser={currentUser}
          lockedBusinessId={currentUser?.assignedBusinessId ?? null}
        />
      );
    }

    // BRANCH_MANAGER: Worker Management panel. Delegated managers also get the
    // entry point to the full Users & Access console from here.
    if (activeTab === "WORKERS_MANAGE") {
      const bizInfo = businesses.find((b) => b.id === currentUser?.assignedBusinessId);
      return (
        <BranchManagerWorkerPanel
          currentUser={currentUser}
          businessInfo={bizInfo}
          onRefreshData={refreshAllData}
          onOpenUserAccess={() => setIsUserAccessOpen(true)}
        />
      );
    }

    // BRANCH_MANAGER: Sales & Payments Center
    if (activeTab === "BRANCH_SALES") {
      const bizInfo = businesses.find((b) => b.id === currentUser?.assignedBusinessId);
      const bizMetric = liveMetrics.find((m) => m.businessId === bizInfo?.id);
      return (
        <BranchManagerSalesView
          currentUser={currentUser}
          businessInfo={bizInfo}
          businessMetrics={bizMetric}
          inventory={inventory}
          customers={customers}
          transactions={transactions}
          businesses={businesses}
          metrics={liveMetrics}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshData={refreshAllData}
        />
      );
    }

    // OWNER & GENERAL_MANAGER: Enterprise User Directory & Transfer Hub
    if (activeTab === "USERS_MANAGE") {
      return (
        <EnterpriseUserPanel
          currentUser={currentUser}
          usersList={usersList}
          businesses={businesses}
          onRefreshData={refreshAllData}
        />
      );
    }

    if (activeTab === "COMMAND_CENTER") {
      return (
        <CommandCenterDashboard
          businesses={businesses}
          metrics={liveMetrics}
          transactions={transactions}
          inventory={inventory}
          currentCurrency={currentCurrency}
          onSelectTab={setActiveTab}
          onOpenNewBusinessModal={() => setIsNewBusinessModalOpen(true)}
          onOpenManageBusinesses={() => setIsManageBizOpen(true)}
          onOpenUserAccess={() => setIsUserAccessOpen(true)}
          canManageBusinesses={currentUser?.role === "OWNER"}
          canManageUsersConsole={currentUser?.role === "OWNER" || !!currentUser?.canManageUsers}
          checklists={checklistData}
        />
      );
    }

    // Specialized Business Views — EVERY business unit mounts the EXACT same
    // complete module as the original business of its type. Dispatch is driven
    // by the business category (code prefix as fallback), so a unit created
    // later via "New Branch / Unit" (POULTRY-02, BLOCK-02, WASH-02, …) renders
    // the identical flagship dashboard and features as POULTRY-01 / BLOCK-01 /
    // WASH-01 — wired entirely into its own scoped data.
    const MODULE_BY_CATEGORY: Record<string, string> = {
      "Poultry Farm": "POULTRY",
      "Block Factory": "BLOCK",
      "Electronic Shop": "TECH",
      "Restaurant & Food": "FOOD",
      Aquaculture: "AQUA",
      Livestock: "LIVESTOCK",
      "Car Wash": "WASH",
      "Hardware Store": "HARDWARE",
    };
    const KNOWN_PREFIXES = ["POULTRY", "BLOCK", "TECH", "FOOD", "AQUA", "LIVESTOCK", "WASH", "HARDWARE"];
    const tabBiz = businesses.find((b) => b.code === activeTab);
    if (tabBiz) {
      const bizInfo = tabBiz;
      const bizMetric = liveMetrics.find((m) => m.businessId === bizInfo?.id);
      const codePrefix = String(bizInfo.code || "").split("-")[0]?.toUpperCase();
      const moduleKey: string =
        MODULE_BY_CATEGORY[bizInfo.category] ||
        (KNOWN_PREFIXES.includes(codePrefix) ? codePrefix : "GENERIC");

      // Poultry Farm gets a full dedicated management module
      if (moduleKey === "POULTRY") {
        return (
          <PoultryFarmModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            transactions={transactions}
            assets={assets}
            employees={employees}
            businesses={businesses}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Block Factory gets a full dedicated real-time management dashboard
      if (moduleKey === "BLOCK") {
        return (
          <BlockFactoryModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Electronics shop gets its dedicated management dashboard
      if (moduleKey === "TECH") {
        return (
          <ElectronicsShopModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            suppliers={suppliers}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Restaurant & Kitchen gets its dedicated management dashboard
      if (moduleKey === "FOOD") {
        return (
          <RestaurantKitchenModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            suppliers={suppliers}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Aquaculture / Fish Farm gets a dedicated real-time management dashboard
      if (moduleKey === "AQUA") {
        return (
          <AquacultureModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Hardware & Building Materials store gets its dedicated management
      // dashboard (Inventory → Stock → Sales → Finance → Dashboard, with
      // orders, supplier purchases, site deliveries and goods-received logs).
      if (moduleKey === "HARDWARE") {
        return (
          <HardwareStoreModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            suppliers={suppliers}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Car Wash units get the full integrated Auto Wash module — daily
      // sales, services & pricing, bookings, active washes, staff, payments,
      // stock usage, expenses, profit, reports, alerts and activities, with
      // Customer → Vehicle → Service → Staff → Sale/Payment → Inventory →
      // Expenses → Profit → Reports all linked automatically.
      if (moduleKey === "WASH") {
        return (
          <CarWashModule
            currentUser={currentUser}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            inventory={inventory}
            customers={customers}
            transactions={transactions}
            assets={assets}
            employees={employees}
            currentCurrency={currentCurrency}
            onRefreshData={refreshAllData}
          />
        );
      }

      // Livestock units get the specialized ops-log dashboards.
      if (moduleKey === "LIVESTOCK") {
        const bucket = specializedLogs.livestock || [];
        // Only THIS unit's operations logs (bucket is shared per type).
        const logs = bucket.filter(
          (l: any) => !l.businessId || l.businessId === bizInfo.id
        );
        return (
          <SpecializedBusinessView
            businessCode={bizInfo.code}
            businessInfo={bizInfo}
            businessMetrics={bizMetric}
            specializedLogs={logs}
            currentCurrency={currentCurrency}
            isOnline={isOnline}
            onRefreshLogs={() => handleRefreshLogsForBusiness(bizInfo.code)}
            currentUser={currentUser}
            employees={employees}
            transactions={transactions}
            inventory={inventory}
            customers={customers}
          />
        );
      }

      // Any other category: complete auto-provisioned enterprise dashboard —
      // wired into sales, inventory, finance, activities, alerts, checklists
      // and reports; never a blank or plain view.
      return (
        <BusinessDashboardModule
          currentUser={currentUser}
          businessInfo={bizInfo}
          businessMetrics={{ ...bizMetric, monthlyTargetRevenueGhs: bizInfo.monthlyTargetRevenueGhs }}
          inventory={inventory}
          transactions={transactions}
          assets={assets}
          employees={employees}
          customers={customers}
          businesses={businesses}
          currentCurrency={currentCurrency}
          onRefreshData={refreshAllData}
          onSelectTab={setActiveTab}
        />
      );
    }

    // Shared Enterprise Modules
    const sharedModules: Record<
      string,
      "CUSTOMERS" | "SUPPLIERS" | "EMPLOYEES" | "ASSETS" | "INVENTORY" | "TRANSACTIONS"
    > = {
      CUSTOMERS: "CUSTOMERS",
      SUPPLIERS: "SUPPLIERS",
      EMPLOYEES: "EMPLOYEES",
      ASSETS: "ASSETS",
      INVENTORY: "INVENTORY",
      TRANSACTIONS: "TRANSACTIONS",
    };
    if (sharedModules[activeTab]) {
      return (
        <SharedEnterpriseModule
          moduleType={sharedModules[activeTab]}
          customers={customers}
          suppliers={suppliers}
          employees={employees}
          assets={assets}
          inventory={inventory}
          transactions={transactions}
          businesses={businesses}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshData={refreshAllData}
          currentUser={currentUser}
        />
      );
    }

    // Strategic Decision Support & Hub
    if (activeTab === "AI_ADVISOR") {
      return (
        <AiAdvisorView
          insights={aiInsights}
          businesses={businesses}
          currentCurrency={currentCurrency}
          onRefreshInsights={refreshAllData}
        />
      );
    }

    if (activeTab === "SCENARIO_PLANNER") {
      return (
        <ScenarioPlannerView
          scenarios={scenarios}
          businesses={businesses}
          currentCurrency={currentCurrency}
          onRefreshScenarios={refreshAllData}
        />
      );
    }

    if (activeTab === "INTEGRATIONS") {
      return (
        <IntegrationsHubView
          integrations={integrations}
          onRefreshIntegrations={refreshAllData}
        />
      );
    }

    // Every known business code was already dispatched above (each unit mounts
    // the full module of its type, or the complete generic dashboard).
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-xl border border-emerald-400/30 animate-pulse">
          <span className="text-2xl font-black">360</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Initializing GoMina 360 Command Center...</span>
        </div>
        <p className="text-xs text-slate-500 max-w-sm text-center">
          Loading consolidated Q1 financial records across 7 Ghanaian enterprise units...
        </p>
      </div>
    );
  }

  // No valid session → render ONLY the sign-in screen (no data is fetched).
  if (!signedIn || !currentUser) {
    return <LoginScreen onSuccess={handleLoginSuccess} notice={loginNotice} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-rose-900/30 border border-rose-500/40 rounded-2xl p-6 max-w-md text-center space-y-3">
          <h2 className="text-xl font-bold text-rose-400">Connection Notice</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={refreshAllData}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
            >
              Retry Connection
            </button>
            <button
              onClick={() => { setError(null); setSignedIn(false); setCurrentUser(null); }}
              data-testid="back-to-signin"
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs shadow-md transition"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Navbar
        currentCurrency={currentCurrency}
        onCurrencyChange={setCurrentCurrency}
        isOnline={isOnline}
        onToggleOnline={() => {
          const goingOnline = !isOnline;
          setIsOnline(goingOnline);
          // Reconnecting after offline mode: revalidate the session and data.
          // A dead session now bounces to the sign-in screen automatically
          // instead of dying on a dead-end "Connection Notice".
          if (goingOnline) refreshAllData();
        }}
        offlineQueueCount={offlineQueueCount}
        onSyncComplete={refreshAllData}
        currentUser={currentUser}
        usersList={usersList}
        onUserSelect={setCurrentUser}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePwOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          businesses={businesses}
          currentUser={currentUser}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950/95 pb-12">
          <div className="sticky top-0 z-30 flex items-center justify-end px-4 sm:px-6 py-2 bg-slate-950/90 backdrop-blur border-b border-slate-800/80">
            <UniversalExportCenter
              activeModule={activeTab}
              currentUser={currentUser}
              businesses={businesses}
              data={{
                metrics: liveMetrics,
                users: usersList,
                customers,
                suppliers,
                employees,
                assets,
                inventory,
                transactions,
                aiInsights,
                scenarios,
                integrations,
                specializedLogs,
              }}
            />
          </div>
          {renderActiveView()}
        </main>
      </div>

      <NewBusinessModal
        isOpen={isNewBusinessModalOpen}
        onClose={() => setIsNewBusinessModalOpen(false)}
        actorUserId={currentUser?.id ?? null}
        onBusinessCreated={async (biz?: any) => {
          await refreshAllData();
          if (biz?.code) setActiveTab(biz.code as ActiveTab);
        }}
      />

      {/* OWNER business management console — add / edit / rename / relocate /
          change type / deactivate / permanently delete any branch. */}
      <UserAccessConsole
        isOpen={isUserAccessOpen}
        onClose={() => setIsUserAccessOpen(false)}
        businesses={businesses}
        currentUser={currentUser}
        onChanged={refreshAllData}
      />

      {/* Self-service password change for the signed-in user (any role). */}
      <ChangePasswordModal
        isOpen={isChangePwOpen}
        onClose={() => setIsChangePwOpen(false)}
        currentUser={currentUser}
      />

      <ManageBusinessesModal
        isOpen={isManageBizOpen}
        onClose={() => setIsManageBizOpen(false)}
        businesses={businesses}
        currentUser={currentUser}
        onChanged={refreshAllData}
        onAddNew={() => setIsNewBusinessModalOpen(true)}
        onDeleted={(code) => {
          if (activeTab === code) setActiveTab("COMMAND_CENTER");
        }}
      />
    </div>
  );
}
