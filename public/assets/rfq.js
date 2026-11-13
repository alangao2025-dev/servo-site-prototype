/* RFQ / sample / engineering request page. Prototype: no network submit — shows the payload that would go to HubSpot. */
(() => {
"use strict";
const A = window.APP, { $, $$, esc, money } = A, S = A.S;
const TYPES = { quote: "Request a quote", sample: `${S.sampleDays}-day evaluation sample`, engineering: "Ask an engineer" };

A.pages.rfq = q => {
  const type = TYPES[q.get("type")] ? q.get("type") : "quote";
  const sku = q.get("sku"); if (sku && A.kit(sku) && !A.cart.get()[sku]) A.cart.add(sku, 1);
  const sizing = q.get("from") === "sizing" ? sessionStorage.getItem("lastSizing") : null;
  return A.pageHead("Request a Quote, Sample or Engineering Review", `We reply within 4 business hours (${esc(S.hours)}).`, '<a href="#/">Home</a> / RFQ') + `
  <div class="wrap" style="padding:28px 20px 60px"><div class="grid" style="grid-template-columns:1.1fr 1fr;gap:30px">
  <div><h3>Your RFQ list</h3><div id="cartBox"></div>
    ${sizing ? `<div class="alert info"><b>Sizing result attached.</b><pre style="white-space:pre-wrap;margin:6px 0 0;font-size:12px">${esc(sizing)}</pre></div>` : ""}
    <p class="note">Unit prices follow the volume tiers on each product page. Final quote confirms delivery terms and lead time.</p></div>
  <form id="rfqForm" novalidate>
    <fieldset><legend>Request type</legend><div class="radio-cards">${Object.entries(TYPES).map(([k, v]) => `<label><input type="radio" name="request_type" value="${k}" ${k === type ? "checked" : ""}>${v}</label>`).join("")}</div></fieldset>
    <fieldset><legend>Contact</legend><div class="form-grid">
      <div><label for="firstname">First name *</label><input id="firstname" name="firstname" autocomplete="given-name" required></div>
      <div><label for="lastname">Last name *</label><input id="lastname" name="lastname" autocomplete="family-name" required></div>
      <div><label for="email">Business email *</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
      <div><label for="company">Company *</label><input id="company" name="company" autocomplete="organization" required></div>
      <div><label for="jobtitle">Job title</label><input id="jobtitle" name="jobtitle" autocomplete="organization-title"></div>
      <div><label for="state">State *</label><input id="state" name="state" autocomplete="address-level1" required placeholder="e.g. OH"></div>
      <div><label for="zip">ZIP code</label><input id="zip" name="zip" autocomplete="postal-code"></div>
    </div></fieldset>
    <fieldset><legend>Project</legend><div class="form-grid">
      <div><label for="company_type">Company type *</label><select id="company_type" name="company_type" required><option value="">Select…</option><option>Machine builder / OEM</option><option>System integrator</option><option>Distributor</option><option>End user / plant</option><option>Robotics / AGV company</option><option>Other</option></select></div>
      <div><label for="industry">Application</label><select id="industry" name="industry"><option value="">Select…</option><option>Packaging</option><option>Material handling</option><option>CNC / laser</option><option>Robotics / AGV</option><option>Lab / electronics</option><option>Other</option></select></div>
      <div><label for="annual_axes">Estimated servo axes per year *</label><select id="annual_axes" name="annual_axes" required><option value="">Select…</option><option>1–9</option><option>10–49</option><option>50–299</option><option>300–999</option><option>1,000+</option></select></div>
      <div><label for="current_brand">Servo brand used today</label><input id="current_brand" name="current_brand" placeholder="e.g. Yaskawa Σ-7"></div>
      <div><label for="timeline">Timeline</label><select id="timeline" name="timeline"><option value="">Select…</option><option>Immediate need</option><option>1–3 months</option><option>3–6 months</option><option>Evaluating options</option></select></div>
      <div><label for="plc">Controller / PLC</label><input id="plc" name="plc" placeholder="e.g. Beckhoff TwinCAT, Rockwell"></div>
      <div class="full"><label for="message">Details</label><textarea id="message" name="message" rows="4" placeholder="Axis data, quantities, special requirements…"></textarea></div>
      <div class="full"><label style="display:flex;gap:8px;font-weight:400"><input type="checkbox" name="consent" required style="width:auto;margin-top:4px">I agree to be contacted about this request. See our Privacy Policy. *</label></div>
    </div></fieldset>
    <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <button type="submit" style="width:100%">Submit request</button>
    <div id="rfqMsg"></div>
  </form></div></div>`;
};

function drawCart() {
  const c = A.cart.get(), skus = Object.keys(c).filter(A.kit);
  if (!skus.length) { $("#cartBox").innerHTML = `<div class="empty">Your RFQ list is empty. <a href="#/products">Browse products</a> or <a href="#/sizing">size a motor</a>.</div>`; return; }
  let total = 0;
  $("#cartBox").innerHTML = skus.map(s => { const k = A.kit(s), q = c[s], up = A.unitPrice(k, q); total += up * q;
    return `<div class="cart-row"><div><a href="#/product/${encodeURIComponent(s)}"><b>${esc(s)}</b></a><div class="note">${esc(k.title_en)}</div></div>
      <input type="number" min="1" value="${q}" data-q="${esc(s)}" aria-label="Quantity for ${esc(s)}"><div class="num"><b>${money(up * q)}</b><div class="note">${money(up)} ea</div></div>
      <button type="button" class="sm ghost" data-rm="${esc(s)}" aria-label="Remove ${esc(s)}">✕</button></div>`; }).join("") +
    `<div style="display:flex;justify-content:space-between;padding:12px 0;font-size:16px"><span>Estimated total (list)</span><b>${money(total)}</b></div>`;
  $$("[data-q]").forEach(i => i.addEventListener("change", () => { const c2 = A.cart.get(); c2[i.dataset.q] = Math.max(1, Math.floor(+i.value) || 1); A.cart.set(c2); drawCart(); }));
  $$("[data-rm]").forEach(b => b.addEventListener("click", () => { const c2 = A.cart.get(); delete c2[b.dataset.rm]; A.cart.set(c2); drawCart(); }));
}

const FREEMAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|proton(mail)?|gmx)\./i;
A.binds.rfq = q => {
  drawCart();
  $("#rfqForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), v = Object.fromEntries(fd.entries()), errs = [];
    if (v.website) return; // honeypot
    $$("[required]", f).forEach(el => { const ok = el.type === "checkbox" ? el.checked : el.value.trim(); el.setAttribute("aria-invalid", ok ? "false" : "true"); if (!ok) errs.push(el.labels[0] ? el.labels[0].textContent.replace(" *", "") : el.name); });
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) errs.push("Valid email");
    const cart = A.cart.get(), items = Object.keys(cart).filter(A.kit).map(s => ({ sku: s, qty: cart[s], unit_price: A.unitPrice(A.kit(s), cart[s]) }));
    if (v.request_type === "sample" && !items.length) errs.push("Add at least one kit for a sample request");
    if (errs.length) { $("#rfqMsg").innerHTML = `<div class="alert err">Please complete: ${errs.map(esc).join(", ")}</div>`; return; }
    const sizing = q.get("from") === "sizing" ? JSON.parse(sessionStorage.getItem("lastSizing") || "null") : null;
    const axes = { "1–9": 5, "10–49": 20, "50–299": 35, "300–999": 45, "1,000+": 50 }[v.annual_axes] || 0;
    const fit = axes + (/(OEM|integrator|Robotics)/.test(v.company_type) ? 15 : 5) + (FREEMAIL.test(v.email) ? -10 : 0);
    const intent = (v.request_type === "sample" ? 20 : v.request_type === "quote" ? 15 : 10) + (sizing ? 10 : 0) + (/Immediate|1–3/.test(v.timeline || "") ? 10 : 0);
    const payload = {
      hubspot_form: S.hubspot.formGuid || "(not configured — prototype)",
      fields: { ...Object.fromEntries(Object.entries(v).filter(([k]) => !["consent", "website"].includes(k))), rfq_items: items, sizing_result: sizing },
      lead_score: { fit, intent, total: fit + intent, route: fit + intent >= 60 ? "MQL → sales (SLA 4 business hours)" : "nurture sequence" },
      context: { page: location.hash, utm: new URLSearchParams(location.search).toString() || "(none)", submitted_at: new Date().toISOString() }
    };
    A.track("generate_lead", { request_type: v.request_type, items: items.length, score: fit + intent });
    $("#rfqMsg").innerHTML = `<div class="alert ok"><b>Thank you, ${esc(v.firstname)}.</b> An application engineer will reply within 4 business hours.${v.request_type === "sample" ? " Sample requests are reviewed for fit before shipping." : ""}</div>
      <details class="calc" open><summary>Prototype only — data that would be sent to HubSpot</summary><pre>${esc(JSON.stringify(payload, null, 2))}</pre></details>`;
  });
};
})();
