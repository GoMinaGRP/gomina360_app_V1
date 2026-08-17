"use client";

import React, { useState } from "react";
import {
  Globe,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  Shield,
  Bell,
  ChevronDown,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { CurrencyCode, CURRENCIES } from "@/lib/currency";
import { synchronizeOfflineQueue, getOfflineQueue } from "@/lib/offlineSync";

interface NavbarProps {
  currentCurrency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  offlineQueueCount: number;
  onSyncComplete: () => void;
  currentUser: any;
  usersList: any[];
  onUserSelect: (user: any) => void;
}

export default function Navbar({
  currentCurrency,
  onCurrencyChange,
  isOnline,
  onToggleOnline,
  offlineQueueCount,
  onSyncComplete,
  currentUser,
  usersList,
  onUserSelect,
}: NavbarProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await synchronizeOfflineQueue();
    setIsSyncing(false);
    onSyncComplete();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Left Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-lg shadow-md border border-emerald-400/30">
            360
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-yellow-300 bg-clip-text text-transparent">
                GoMina 360
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                Ghana Enterprise Command Center
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              All-In-One Enterprise Management & Decision-Support System
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-medium transition"
              title="Switch currency for future international expansion"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{CURRENCIES[currentCurrency].symbol}</span>
              <span className="hidden sm:inline">{currentCurrency}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showCurrencyDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 mb-1">
                  Operating Currency
                </div>
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                  const curr = CURRENCIES[code];
                  return (
                    <button
                      key={code}
                      onClick={() => {
                        onCurrencyChange(code);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/70 transition ${
                        currentCurrency === code
                          ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                          : "text-slate-200"
                      }`}
                    >
                      <div>
                        <span className="font-bold mr-2">{curr.symbol}</span>
                        <span>{curr.name}</span>
                      </div>
                      {currentCurrency === code && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Online / Offline Mode Toggle & Sync Button */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <button
              onClick={onToggleOnline}
              className={`flex items-center space-x-1.5 text-xs font-medium px-2 py-0.5 rounded-md transition ${
                isOnline
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
              title="Toggle online / offline rural data collection simulation"
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Offline Mode</span>
                </>
              )}
            </button>

            {offlineQueueCount > 0 && (
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                title="Synchronize offline queued items to server"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                />
                <span>Sync ({offlineQueueCount})</span>
              </button>
            )}
          </div>

          {/* User Account & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                {currentUser?.name ? currentUser.name.charAt(0) : "K"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold leading-none text-slate-100">
                  {currentUser?.name || "Kwame Mina"}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">
                  {currentUser?.role || "OWNER"}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-700/80 mb-1">
                  <div className="text-xs font-semibold text-slate-300">
                    Switch User / Role
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Test role-based permissions across branches
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {usersList.map((usr) => (
                    <button
                      key={usr.id}
                      onClick={() => {
                        onUserSelect(usr);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/80 transition ${
                        currentUser?.id === usr.id
                          ? "bg-emerald-500/15 border-l-2 border-emerald-400 text-emerald-300 font-semibold"
                          : "text-slate-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {usr.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{usr.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {usr.role}
                          </div>
                        </div>
                      </div>
                      {currentUser?.id === usr.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
