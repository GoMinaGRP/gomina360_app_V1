"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Store,
  Plus,
  Minus,
  Trash2,
  X,
  PackageCheck,
  Copy,
  Truck,
  Banknote,
  Smartphone,
  MapPin,
  User as UserIcon,
  Phone,
  ClipboardList,
} from "lucide-react";

function fmtMoney(amount: number | null | undefined, currency = "GHS") {
  if (amount == null) return "—";
  if (currency === "GHS") return `GH₵ ${Number(amount).toFixed(2)}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

interface CartLine {
  biz: any;
  product: any;
  qty: number;
}

function OrderInner() {
  const params = useSearchParams();
  const [menu, setMenu] = useState<any[] | null>(null);
  const [menuError, setMenuError] = useState("");
  const [bizId, setBizId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("ALL");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [destination, setDestination] = useState("");
  const [payChoice, setPayChoice] = useState<"ON_DELIVERY" | "MOMO_NOW">("ON_DELIVERY");
  const [momoRef, setMomoRef] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placed, setPlaced] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) {
          setMenu(data.businesses || []);
          const wanted = Number(params.get("biz") || 0);
          const first =
            (wanted && (data.businesses || []).find((b: any) => b.businessId === wanted)?.businessId) ||
            (data.businesses || [])[0]?.businessId ||
            null;
          setBizId(first);
        } else {
          setMenuError(data?.error || "Could not load the store.");
        }
      } catch {
        setMenuError("Could not reach the store. Check your connection and try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const biz = useMemo(() => (menu || []).find((b) => b.businessId === bizId) || null, [menu, bizId]);
  const categories: string[] = useMemo(
    () => ["ALL", ...Array.from(new Set<string>((biz?.products || []).map((p: any) => String(p.category))))],
    [biz],
  );
  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (biz?.products || []).filter(
      (p: any) => (cat === "ALL" || p.category === cat) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [biz, cat, search]);

  const cartTotal = cart.reduce((acc, l) => acc + l.product.price * l.qty, 0);
  const cartCount = cart.reduce((acc, l) => acc + l.qty, 0);
  const inCart = (id: number) => cart.find((l) => l.product.id === id)?.qty || 0;

  const add = (p: any, delta: number) => {
    setCart((c) => {
      const existing = c.find((l) => l.product.id === p.id);
      if (!existing && delta > 0) return [...c, { biz, product: p, qty: 1 }];
      if (!existing) return c;
      const qty = Math.max(0, Math.min(p.available, existing.qty + delta));
      if (qty === 0) return c.filter((l) => l.product.id !== p.id);
      return c.map((l) => (l.product.id === p.id ? { ...l, qty } : l));
    });
  };

  const pickBiz = (id: number) => {
    if (id === bizId) return;
    if (cart.length > 0 && typeof window !== "undefined" &&
        !window.confirm("Switching business will clear your cart. Continue?")) return;
    setCart([]);
    setBizId(id);
    setCat("ALL");
    setSearch("");
  };

  const placeOrder = async () => {
    setOrderError("");
    if (!biz) return setOrderError("Choose a business first.");
    if (cart.length === 0) return setOrderError("Your cart is empty.");
    if (name.trim().length < 2) return setOrderError("Please enter your name.");
    if (phone.trim().length < 6) return setOrderError("Please enter a phone number we can reach you on.");
    if (fulfillment === "DELIVERY" && destination.trim().length < 3)
      return setOrderError("Tell us where to deliver (area / landmark).");
    setPlacing(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: biz.businessId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          fulfillmentType: fulfillment,
          destinationAddress: destination.trim(),
          paymentChoice: payChoice,
          momoRef: momoRef.trim(),
          note: note.trim(),
          items: cart.map((l) => ({ inventoryId: l.product.id, quantity: l.qty })),
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setPlaced(data.order);
        setCart([]);
      } else {
        setOrderError(data?.error || "Could not place your order. Please try again.");
      }
    } catch {
      setOrderError("Could not reach the store. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-sm shadow-lg">
            360
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-white leading-tight">GoMina 360 · Order Online</div>
            <div className="text-[10px] text-emerald-300/90 leading-tight">Official customer storefront — no sign-in needed</div>
          </div>
          <a href="/track" className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/40" data-testid="oo-track-link">
            Track order →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-32 space-y-4" data-testid="oo-root">
        {menuError && (
          <div className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs" data-testid="oo-menu-error">
            {menuError}
          </div>
        )}
        {!menu && !menuError && <p className="text-center text-slate-400 text-sm py-10">Loading the store…</p>}

        {menu && !placed && (
          <>
            {/* How it works (customer-facing AI-style explainer) */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-cyan-300" /> Order from our branches — live stock
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">
                Pick products, place your order, and get a <span className="font-mono text-cyan-300">GM-*</span> tracking
                code instantly. Follow every step — confirmation, preparation, dispatch with a live map, delivery —
                on the <a href="/track" className="text-cyan-300 underline">tracking page</a>. No account, ever.
              </p>
            </section>

            {/* Business picker */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {menu.map((b) => (
                <button
                  key={b.businessId}
                  onClick={() => pickBiz(b.businessId)}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-left transition ${
                    bizId === b.businessId
                      ? "bg-cyan-500/15 border-cyan-500/60 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                  data-testid={`oo-biz-${b.businessId}`}
                >
                  <div className="text-[12px] font-extrabold whitespace-nowrap">{b.businessName}</div>
                  <div className="text-[9px] text-slate-400 whitespace-nowrap">
                    {b.branchName} · {b.products.length} product{b.products.length === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>

            {biz && (
              <>
                {/* Search + categories */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${biz.businessName}…`}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/60 rounded-xl text-sm text-white outline-none"
                      data-testid="oo-search"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCat(c)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                          cat === c
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                        data-testid={`oo-cat-${c}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products */}
                {products.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8" data-testid="oo-empty">No products match.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {products.map((p: any) => {
                      const q = inCart(p.id);
                      return (
                        <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col" data-testid={`oo-prod-${p.id}`}>
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-full h-20 object-cover rounded-xl mb-2 border border-slate-800" />
                          ) : (
                            <div className="w-full h-20 rounded-xl mb-2 bg-slate-800/70 border border-slate-800 flex items-center justify-center">
                              <PackageCheck className="w-6 h-6 text-slate-600" />
                            </div>
                          )}
                          <div className="text-[12px] font-extrabold text-white leading-tight flex-1">{p.name}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{p.category} · per {p.unit}</div>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="text-[13px] font-black text-emerald-300">{fmtMoney(p.price)}</div>
                            <div className="text-[9px] text-slate-500">{p.available} {p.unit} left</div>
                          </div>
                          {q === 0 ? (
                            <button
                              onClick={() => add(p, 1)}
                              className="mt-2 w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                              data-testid={`oo-add-${p.id}`}
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          ) : (
                            <div className="mt-2 flex items-center justify-between bg-slate-800 rounded-lg px-1 py-1">
                              <button onClick={() => add(p, -1)} className="p-1 rounded hover:bg-slate-700 text-slate-300" data-testid={`oo-minus-${p.id}`}>
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[12px] font-black text-white" data-testid={`oo-qty-${p.id}`}>{q}</span>
                              <button onClick={() => add(p, 1)} disabled={q >= p.available} className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30" data-testid={`oo-plus-${p.id}`}>
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Checkout */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-300" /> Your details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500/60 rounded-xl text-sm text-white outline-none"
                        data-testid="oo-name"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone (so we can reach you)"
                        inputMode="tel"
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500/60 rounded-xl text-sm text-white outline-none"
                        data-testid="oo-phone"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2" data-testid="oo-fulfillment">
                    <button
                      onClick={() => setFulfillment("PICKUP")}
                      className={`px-3 py-2.5 rounded-xl border text-left transition ${fulfillment === "PICKUP" ? "bg-emerald-500/15 border-emerald-500/60" : "bg-slate-800 border-slate-700"}`}
                      data-testid="oo-pickup"
                    >
                      <PackageCheck className={`w-4 h-4 ${fulfillment === "PICKUP" ? "text-emerald-300" : "text-slate-400"}`} />
                      <div className="text-[12px] font-extrabold mt-1">Pickup</div>
                      <div className="text-[9px] text-slate-400">Collect at {biz.branchName}</div>
                    </button>
                    <button
                      onClick={() => setFulfillment("DELIVERY")}
                      className={`px-3 py-2.5 rounded-xl border text-left transition ${fulfillment === "DELIVERY" ? "bg-emerald-500/15 border-emerald-500/60" : "bg-slate-800 border-slate-700"}`}
                      data-testid="oo-delivery"
                    >
                      <Truck className={`w-4 h-4 ${fulfillment === "DELIVERY" ? "text-emerald-300" : "text-slate-400"}`} />
                      <div className="text-[12px] font-extrabold mt-1">Delivery</div>
                      <div className="text-[9px] text-slate-400">Track the courier live on the map</div>
                    </button>
                  </div>
                  {fulfillment === "DELIVERY" && (
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Where should we deliver? (area / landmark)"
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500/60 rounded-xl text-sm text-white outline-none"
                        data-testid="oo-destination"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5" data-testid="oo-payment">
                    <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition ${payChoice === "ON_DELIVERY" ? "bg-emerald-500/15 border-emerald-500/60" : "bg-slate-800 border-slate-700"}`} data-testid="oo-pay-ondelivery">
                      <input type="radio" className="mt-0.5" checked={payChoice === "ON_DELIVERY"} onChange={() => setPayChoice("ON_DELIVERY")} />
                      <span>
                        <span className="flex items-center gap-1.5 text-[12px] font-extrabold"><Banknote className="w-3.5 h-3.5 text-emerald-300" /> Pay on {fulfillment === "DELIVERY" ? "delivery" : "pickup"}</span>
                        <span className="block text-[9px] text-slate-400">Cash or MoMo when the order reaches you.</span>
                      </span>
                    </label>
                    <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition ${payChoice === "MOMO_NOW" ? "bg-emerald-500/15 border-emerald-500/60" : "bg-slate-800 border-slate-700"}`} data-testid="oo-pay-momo">
                      <input type="radio" className="mt-0.5" checked={payChoice === "MOMO_NOW"} onChange={() => setPayChoice("MOMO_NOW")} />
                      <span className="flex-1">
                        <span className="flex items-center gap-1.5 text-[12px] font-extrabold"><Smartphone className="w-3.5 h-3.5 text-yellow-300" /> Pay now with MTN MoMo</span>
                        <span className="block text-[9px] text-slate-400">The branch shares the MoMo number and confirms your payment on your tracking page.</span>
                      </span>
                    </label>
                    {payChoice === "MOMO_NOW" && (
                      <input
                        value={momoRef}
                        onChange={(e) => setMomoRef(e.target.value)}
                        placeholder="MoMo reference (optional, after you send)"
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-yellow-500/60 rounded-xl text-sm text-white outline-none"
                        data-testid="oo-momo-ref"
                      />
                    )}
                  </div>

                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any note for the staff? (optional)"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500/60 rounded-xl text-sm text-white outline-none"
                    data-testid="oo-note"
                  />

                  {orderError && (
                    <div className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs" data-testid="oo-error">
                      {orderError}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* Success */}
        {placed && (
          <section className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-3" data-testid="oo-success">
            <PackageCheck className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Order received — thank you, {placed.customerName}!</h2>
            <p className="text-[12px] text-slate-400">
              {placed.businessName}{placed.branchName ? ` (${placed.branchName})` : ""} has your order.
              Keep this tracking code safe — it is your only key to the order:
            </p>
            <div className="font-mono text-2xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/40 rounded-xl px-4 py-3" data-testid="oo-code">
              {placed.code}
            </div>
            <div className="text-[11px] text-slate-400">
              Total: <span className="font-black text-emerald-300">{fmtMoney(placed.totalGhs, placed.currency)}</span> ·{" "}
              {placed.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
              {placed.payment === "PENDING_CONFIRMATION" ? "MoMo payment being confirmed" : "Pay on pickup/delivery"}
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(placed.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold"
                data-testid="oo-copy"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy code"}
              </button>
              <a
                href={`/track?code=${encodeURIComponent(placed.code)}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-[11px] font-bold"
                data-testid="oo-track-my-order"
              >
                Track my order live →
              </a>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              The page refreshes automatically — you will see Confirmed → Processing → Ready/Dispatched → Delivered, payment status, and a live map when the courier is on the way.
            </p>
            <button onClick={() => setPlaced(null)} className="text-[11px] text-slate-500 underline hover:text-slate-300" data-testid="oo-new-order">
              Place another order
            </button>
          </section>
        )}
      </main>

      {/* Cart bar */}
      {!placed && cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur" data-testid="oo-cart">
          <div className="max-w-3xl mx-auto px-4 py-2.5">
            {cartOpen && (
              <div className="max-h-56 overflow-y-auto mb-2 divide-y divide-slate-800" data-testid="oo-cart-lines">
                {cart.map((l) => (
                  <div key={l.product.id} className="py-1.5 flex items-center gap-2 text-[12px]" data-testid={`oo-cart-line-${l.product.id}`}>
                    <span className="flex-1 min-w-0 truncate text-slate-200">{l.qty}× {l.product.name}</span>
                    <span className="text-slate-400">{fmtMoney(l.product.price * l.qty)}</span>
                    <button onClick={() => add(l.product, -l.qty)} className="p-1 text-slate-500 hover:text-rose-300" data-testid={`oo-cart-rm-${l.product.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setCartOpen((o) => !o)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <ShoppingCart className="w-4 h-4 text-cyan-300" />
                {cartCount} item{cartCount === 1 ? "" : "s"} {cartOpen ? "▾" : "▴"}
              </button>
              <button onClick={() => { setCart([]); }} className="text-[10px] text-slate-500 hover:text-rose-300" data-testid="oo-clear">Clear</button>
              <span className="flex-1" />
              <span className="text-sm font-black text-emerald-300" data-testid="oo-cart-total">{fmtMoney(cartTotal)}</span>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg disabled:opacity-40"
                data-testid="oo-place"
              >
                {placing ? "Placing…" : "Place order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Loading the store…
        </div>
      }
    >
      <OrderInner />
    </Suspense>
  );
}
