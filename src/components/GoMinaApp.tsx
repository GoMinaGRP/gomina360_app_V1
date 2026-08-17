"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Navbar from "./Navbar";
import Sidebar, { ActiveTab } from "./Sidebar";
import CommandCenterDashboard from "./CommandCenterDashboard";
import SpecializedBusinessView from "./SpecializedBusinessView";
import SharedEnterpriseModule from "./SharedEnterpriseModule";
import AiAdvisorView from "./AiAdvisorView";
import ScenarioPlannerView from "./ScenarioPlannerView";
import IntegrationsHubView from "./IntegrationsHubView";
import NewBusinessModal from "./NewBusinessModal";
import WorkerDashboard from "./WorkerDashboard";
import BranchManagerWorkerPanel from "./BranchManagerWorkerPanel";
import BranchManagerSalesView from "./BranchManagerSalesView";
import EnterpriseUserPanel from "./EnterpriseUserPanel";
import PoultryFarmModule from "./PoultryFarmModule";
import BlockFactoryModule from "./BlockFactoryModule";
import AquacultureModule from "./AquacultureModule";
import UniversalExportCenter from "./UniversalExportCenter";
import { CurrencyCode } from "@/lib/currency";
import { getOfflineQueue } from "@/lib/offlineSync";
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
  });

  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>("COMMAND_CENTER");
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>("GHS");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [isNewBusinessModalOpen, setIsNewBusinessModalOpen] = useState(false);

  // Baseline snapshot of the highest transaction id at first load. Any transaction
  // created after this point (a new in-app sale/expense) is layered onto the seeded
  // quarter-to-date metrics so dashboards update live without double-counting.
  const baselineMaxTxnId = useRef<number | null>(null);

  const refreshAllData = useCallback(async () => {
    try {
      const res = await fetch("/api/init");
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.businesses || []);
        setMetrics(data.metrics || []);
        setUsersList(data.users || []);
        if (!currentUser && data.users?.length > 0) {
          // Default to Kwame Mina (Owner)
          setCurrentUser(data.users[0]);
        }
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
          }
        );
      } else {
        setError(data.error || "Failed to load enterprise data.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Command Center.");
    } finally {
      setLoading(false);
      setOfflineQueueCount(getOfflineQueue().length);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

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
        setSpecializedLogs((prev) => {
          const next = { ...prev };
          if (upper.startsWith("POULTRY")) next.poultry = data.logs;
          else if (upper.startsWith("BLOCK")) next.blockFactory = data.logs;
          else if (upper.startsWith("AQUA")) next.aquaculture = data.logs;
          else if (upper.startsWith("LIVESTOCK")) next.livestock = data.logs;
          else if (upper.startsWith("FOOD")) next.restaurant = data.logs;
          else if (upper.startsWith("TECH")) next.electronics = data.logs;
          else if (upper.startsWith("WASH")) next.carWash = data.logs;
          return next;
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

      let logs: any[] = [];
      if (bizCode === "POULTRY-01") logs = specializedLogs.poultry || [];
      else if (bizCode === "BLOCK-01") logs = specializedLogs.blockFactory || [];
      else if (bizCode === "AQUA-01") logs = specializedLogs.aquaculture || [];
      else if (bizCode === "LIVESTOCK-01") logs = specializedLogs.livestock || [];
      else if (bizCode === "FOOD-01") logs = specializedLogs.restaurant || [];
      else if (bizCode === "TECH-01") logs = specializedLogs.electronics || [];
      else if (bizCode === "WASH-01") logs = specializedLogs.carWash || [];

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

    // BRANCH_MANAGER: Worker Management panel
    if (activeTab === "WORKERS_MANAGE") {
      const bizInfo = businesses.find((b) => b.id === currentUser?.assignedBusinessId);
      return (
        <BranchManagerWorkerPanel
          currentUser={currentUser}
          businessInfo={bizInfo}
          onRefreshData={refreshAllData}
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
          checklists={checklistData}
        />
      );
    }

    // 7 Specialized Business Views
    const bizCodes = [
      "POULTRY-01",
      "BLOCK-01",
      "AQUA-01",
      "LIVESTOCK-01",
      "FOOD-01",
      "TECH-01",
      "WASH-01",
    ];
    if (bizCodes.includes(activeTab)) {
      const bizInfo = businesses.find((b) => b.code === activeTab);
      const bizMetric = liveMetrics.find((m) => m.businessId === bizInfo?.id);

      // Poultry Farm gets a full dedicated management module
      if (activeTab === "POULTRY-01") {
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
      if (activeTab === "BLOCK-01") {
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

      // Aquaculture / Fish Farm gets a dedicated real-time management dashboard
      if (activeTab === "AQUA-01") {
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

      // Note: Poultry and Aquaculture now have dedicated real-time modules.
      let logs: any[] = [];
      if (activeTab === "LIVESTOCK-01") logs = specializedLogs.livestock || [];
      else if (activeTab === "FOOD-01") logs = specializedLogs.restaurant || [];
      else if (activeTab === "TECH-01") logs = specializedLogs.electronics || [];
      else if (activeTab === "WASH-01") logs = specializedLogs.carWash || [];

      return (
        <SpecializedBusinessView
          businessCode={activeTab}
          businessInfo={bizInfo}
          businessMetrics={bizMetric}
          specializedLogs={logs}
          currentCurrency={currentCurrency}
          isOnline={isOnline}
          onRefreshLogs={() => handleRefreshLogsForBusiness(activeTab)}
          currentUser={currentUser}
          employees={employees}
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-rose-900/30 border border-rose-500/40 rounded-2xl p-6 max-w-md text-center space-y-3">
          <h2 className="text-xl font-bold text-rose-400">Connection Notice</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={refreshAllData}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
          >
            Retry Connection
          </button>
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
        onToggleOnline={() => setIsOnline(!isOnline)}
        offlineQueueCount={offlineQueueCount}
        onSyncComplete={refreshAllData}
        currentUser={currentUser}
        usersList={usersList}
        onUserSelect={setCurrentUser}
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
        onBusinessCreated={refreshAllData}
      />
    </div>
  );
}
