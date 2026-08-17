"use client";

import React, { useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import LocationSelector, { LocationValue } from "./LocationSelector";

interface NewBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBusinessCreated: () => void;
}

export default function NewBusinessModal({
  isOpen,
  onClose,
  onBusinessCreated,
}: NewBusinessModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Block Factory");
  const [location, setLocation] = useState<LocationValue>({
    region: "Ashanti",
    district: "Kumasi Metropolitan",
    town: "Kumasi",
  });
  const [managerName, setManagerName] = useState("Ebenezer Mensah");
  const [contactPhone, setContactPhone] = useState("+233 24 500 6000");
  const [initialCapitalGhs, setInitialCapitalGhs] = useState(250000);
  const [monthlyTargetRevenueGhs, setMonthlyTargetRevenueGhs] = useState(120000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Mina Kumasi Block & Concrete",
          code: `BIZ-${Math.floor(100 + Math.random() * 900)}`,
          category,
          region: location.region,
          district: location.district,
          town: location.town,
          managerName,
          contactPhone,
          initialCapitalGhs: Number(initialCapitalGhs),
          monthlyTargetRevenueGhs: Number(monthlyTargetRevenueGhs),
        }),
      });

      if (res.ok) {
        onBusinessCreated();
        onClose();
      }
    } catch (err) {
      console.error("Error creating business:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Create New Business / Branch
              </h3>
              <p className="text-xs text-slate-400">
                Expand the GoMina 360 enterprise footprint in Ghana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Business Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mina Kumasi Block & Concrete Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="Poultry Farm">Poultry Farm</option>
              <option value="Block Factory">Block Factory</option>
              <option value="Aquaculture">Aquaculture</option>
              <option value="Livestock">Livestock</option>
              <option value="Restaurant & Food">Restaurant & Food</option>
              <option value="Electronic Shop">Electronic Shop</option>
              <option value="Car Wash">Car Wash</option>
            </select>
          </div>

          <div className="pt-1 border-t border-slate-800">
            <LocationSelector
              value={location}
              onChange={setLocation}
              compact
              required
              headingLabel="Branch Location (Ghana)"
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
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Business Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
