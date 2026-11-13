/* core: helpers, units, RFQ cart, shared components. Exposes window.APP */
(() => {
"use strict";
const A = window.APP = { pages: {}, binds: {}, DB: null, S: window.SITE };
const $ = A.$ = (s, el = document) => el.querySelector(s);
A.$$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = A.esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = A.money = n => "$" + Math.round(n).toLocaleString("en-US");
A.track = (event, params = {}) => { (window.dataLayer = window.dataLayer || []).push({ event, ...params }); };

/* units: values stored in SI/catalog units; imperial = metric × factor */
A.UNITS = localStorage.getItem("units") || "metric";
const U = A.U = {
  mass: ["kg", "lb", 2.20462], len: ["mm", "in", 1 / 25.4], force: ["N", "lbf", 0.224809], torque: ["N·m", "lb·in", 8.85075],
  inertia: ["kg·cm²", "lb·in²", 0.341717], none: ["", "", 1]
};
A.ul = t => U[t][A.UNITS === "metric" ? 0 : 1];
A.toDisp = (v, t) => A.UNITS === "metric" ? v : v * U[t][2];
A.fromDisp = (v, t) => A.UNITS === "metric" ? v : v / U[t][2];
A.fmtU = (v, t, d = 2) => {
  if (v == null || v === "") return "—";
  const f = x => (+x).toLocaleString("en-US", { maximumFractionDigits: d });
  const m = `${f(v)} ${U[t][0]}`, i = `${f(v * U[t][2])} ${U[t][1]}`;
  return A.UNITS === "metric" ? `${m} <span class="note">(${i})</span>` : `${i} <span class="note">(${m})</span>`;
};

/* RFQ cart in localStorage: {sku: qty} */
A.cart = {
  get() { try { return JSON.parse(localStorage.getItem("rfq") || "{}"); } catch { return {}; } },
  set(c) { localStorage.setItem("rfq", JSON.stringify(c)); A.badge(); },
  add(sku, q = 1) { const c = this.get(); c[sku] = (c[sku] || 0) + q; this.set(c); A.track("add_to_rfq", { sku, qty: q }); }
};
A.badge = () => { const n = Object.values(A.cart.get()).reduce((a, b) => a + b, 0); const el = $("#rfqCount"); if (el) { el.hidden = !n; el.textContent = n; } };

/* product helpers */
A.kit = sku => A.DB.kits.find(k => k.kit_sku === sku);
A.unitPrice = (k, q) => q >= 50 ? k.price_50_199 : q >= 10 ? k.price_10_49 : k.list_price_usd;
A.inStock = k => /In stock/.test(k.stock_status);
A.stockHtml = k => A.inStock(k) ? `<span class="stock in">● In stock in the USA — ships in ${k.lead_time_days} business days</span>`
  : `<span class="stock out">● ${esc(k.stock_status)} — about ${k.lead_time_days} days</span>`;
A.certChips = k => [k.ul ? `<span class="chip ${k.ul === "UL Recognized" ? "green" : "amber"}">${esc(k.ul)}</span>` : "", k.ce ? `<span class="chip green">CE</span>` : "", k.sto ? `<span class="chip blue">STO</span>` : ""].join("");
A.img = (label, h) => `<div class="pimg" style="height:${h || 150}px">[ product photo: ${esc(label)} ]</div>`;
A.pageHead = (title, sub, crumb) => `<div class="page-head"><div class="wrap">${crumb ? `<div class="crumb">${crumb}</div>` : ""}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div></div>`;
A.pcard = k => `<div class="pcard">${A.img(k.power_w + "W " + k.comm, 150)}
  <h3><a href="#/product/${encodeURIComponent(k.kit_sku)}">${esc(k.title_en)}</a></h3>
  <div class="note">${esc(k.kit_sku)}</div>
  <div class="specs-mini"><span class="chip blue">${esc(k.comm)}</span><span class="chip">${k.power_w} W</span><span class="chip">${esc(k.flange_mm)} mm</span><span class="chip">${esc(String(k.encoder).split(" ")[0])}</span>${k.with_brake === "Y" ? '<span class="chip">Brake</span>' : ""}${A.certChips(k)}</div>
  <div class="price">${money(k.list_price_usd)} <small>/ kit, 1–9 pcs</small></div>
  <div class="note">${money(k.price_50_199)} at 50+ · motor + drive + 3 m cables</div>
  ${A.stockHtml(k)}
  <div class="acts"><button class="sm" data-add="${esc(k.kit_sku)}">Add to RFQ</button>${k.sample_eligible === "Y" ? `<a class="btn sm ghost" href="#/rfq?type=sample&sku=${encodeURIComponent(k.kit_sku)}">Request sample</a>` : ""}</div></div>`;

/* delegated "Add to RFQ" buttons */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  A.cart.add(b.dataset.add, 1); const t = b.textContent; b.textContent = "Added ✓"; setTimeout(() => b.textContent = t, 1200);
});
})();
