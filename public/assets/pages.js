/* pages: home, products, product detail, cross-reference, downloads, quality, support, about, 404 */
(() => {
"use strict";
const A = window.APP, { $, $$, esc, money } = A, S = A.S, P = A.pages, B = A.binds;

P.home = () => {
  const feat = A.DB.kits.filter(k => k.role === "利润款").slice(0, 4);
  return `<section class="hero"><div class="wrap">
    <h1>Industrial AC servo systems for machine builders — without the premium.</h1>
    <p>EtherCAT and PROFINET servo kits from 100 W to 3 kW, stocked in the USA, backed by US-based application engineers and a ${S.warrantyYears}-year warranty.</p>
    <div class="ctas"><a class="btn" href="#/sizing">Size a motor in 2 minutes</a><a class="btn ghost" href="#/cross-reference">Find a replacement for your current servo</a></div>
    <div class="proof"><div><b>${S.warrantyYears}-year</b><span>warranty on motors &amp; drives</span></div><div><b>48 h</b><span>evaluation samples from US stock</span></div><div><b>${S.sampleDays}-day</b><span>free evaluation for qualified OEMs</span></div><div><b>EtherCAT · PROFINET</b><span>ESI / GSDML files to download</span></div></div>
  </div></section>
  <section class="blk"><div class="wrap">
    <h2 class="t">Three ways to start</h2><p class="sub">Built for engineers who already know what they need — and for buyers looking for a qualified second source.</p>
    <div class="grid g3">
      <a class="card link" href="#/sizing"><div class="icon">⚙</div><h3>Sizing tool</h3><p>Ball screw, belt, rotary table or generic load. Peak torque, RMS torque, speed and inertia-ratio checks with a recommended kit.</p></a>
      <a class="card link" href="#/cross-reference"><div class="icon">⇄</div><h3>Cross-reference</h3><p>Enter a Yaskawa, Delta, Panasonic, Mitsubishi or AutomationDirect part number to see our engineer-checked equivalent.</p></a>
      <a class="card link" href="#/rfq?type=sample"><div class="icon">📦</div><h3>${S.sampleDays}-day evaluation sample</h3><p>Qualified OEMs test a kit in their own machine. The sample is credited against the first production order.</p></a>
    </div></div></section>
  <section class="blk alt"><div class="wrap"><h2 class="t">Popular servo kits</h2><p class="sub">Each kit includes motor, drive, 3 m power and encoder cables. Volume pricing is shown on every product.</p>
    <div class="plist">${feat.map(A.pcard).join("")}</div><p style="margin-top:18px"><a class="btn ghost" href="#/products">View all products →</a></p></div></section>
  <section class="blk"><div class="wrap"><h2 class="t">Built for OEM production</h2><p class="sub">Typical applications for 100 W – 3 kW servo axes.</p>
    <div class="grid g4">
      <div class="card"><div class="icon">📦</div><h3>Packaging</h3><p class="note">Flow wrappers, cartoners, labelers, fillers.</p></div>
      <div class="card"><div class="icon">🚚</div><h3>Material handling</h3><p class="note">Conveyors, AMR/AGV, pick-and-place, palletizers.</p></div>
      <div class="card"><div class="icon">🔩</div><h3>CNC &amp; laser</h3><p class="note">Routers, laser cutters, plasma tables.</p></div>
      <div class="card"><div class="icon">🧪</div><h3>Lab &amp; electronics</h3><p class="note">Liquid handling, test fixtures, assembly cells.</p></div>
    </div>
    <div class="grid g3" style="margin-top:22px">
      <div class="card"><h3>Second-source ready</h3><p>Frame sizes and shaft dimensions matched to common 60/80/130 mm servos, with documented differences.</p></div>
      <div class="card"><h3>Transparent total cost</h3><p>List prices online, DDP delivery from US stock, no surprise tariff charges on stocked items.</p></div>
      <div class="card"><h3>Engineers, not call scripts</h3><p>US-time-zone application engineers reply within 4 business hours.</p></div>
    </div>
    <div class="alert info" style="margin-top:20px">Customer case studies will appear after the first US installations. No logos or testimonials are shown without written permission.</div>
  </div></section>`;
};

P.products = q => A.pageHead("AC Servo Motor &amp; Drive Kits", "Motor + drive + 3 m cables. Prices in USD, delivered duty paid (DDP) from our US warehouse.", '<a href="#/">Home</a> / Products') + `
  <div class="wrap layout"><aside class="filters">
    <h4>Communication</h4>${[...new Set(A.DB.kits.map(k => k.comm))].map(c => `<label class="ck"><input type="checkbox" name="comm" value="${esc(c)}" ${q.get("comm") === c ? "checked" : ""}>${esc(c)}</label>`).join("")}
    <h4>Rated power</h4><select id="fPow" aria-label="Rated power"><option value="0-1e9">All</option><option value="0-200">≤ 200 W</option><option value="201-1000">400 W – 1 kW</option><option value="1001-1e9">&gt; 1 kW</option></select>
    <h4>Frame size</h4>${[...new Set(A.DB.kits.map(k => k.flange_mm))].sort((a, b) => a - b).map(f => `<label class="ck"><input type="checkbox" name="flange" value="${esc(f)}">${esc(f)} mm</label>`).join("")}
    <h4>Options</h4><label class="ck"><input type="checkbox" id="fBrake">With holding brake</label><label class="ck"><input type="checkbox" id="fStock">In stock in the USA</label>
    <p class="note" style="margin-top:18px">Not sure which size? <a href="#/sizing">Use the sizing tool</a>.</p>
  </aside><div><div class="note" id="pCount" style="margin-bottom:10px"></div><div class="plist" id="pList"></div></div></div>`;
B.products = () => {
  const draw = () => {
    const comm = $$("input[name=comm]:checked").map(i => i.value), fl = $$("input[name=flange]:checked").map(i => i.value), [a, b] = $("#fPow").value.split("-").map(Number);
    const list = A.DB.kits.filter(k => (!comm.length || comm.includes(k.comm)) && (!fl.length || fl.includes(k.flange_mm)) && k.power_w >= a && k.power_w <= b
      && (!$("#fBrake").checked || k.with_brake === "Y") && (!$("#fStock").checked || A.inStock(k)));
    $("#pCount").textContent = `${list.length} of ${A.DB.kits.length} kits`;
    $("#pList").innerHTML = list.length ? list.map(A.pcard).join("") : `<div class="empty">No kits match these filters. <a href="#/rfq?type=engineering">Ask an engineer</a> — other sizes are available made-to-order.</div>`;
  };
  $$(".filters input, .filters select").forEach(i => i.addEventListener("change", draw)); draw();
};

P.product = (q, sku) => {
  const k = A.kit(sku); if (!k) return P.notfound();
  const m = A.DB.motors.find(x => x.motor_model === k.motor_model) || {}, d = A.DB.drives.find(x => x.drive_model === k.drive_model) || {};
  const xr = A.DB.xref.filter(x => x.our_kit_sku === k.kit_sku);
  A.track("view_item", { sku: k.kit_sku });
  const rows = arr => arr.filter(r => r[1] != null && r[1] !== "").map(r => `<tr><th>${r[0]}</th><td>${r[2] ? A.fmtU(r[1], r[2], 3) : esc(r[1])}</td></tr>`).join("");
  return A.pageHead(esc(k.title_en), esc(k.kit_sku), `<a href="#/">Home</a> / <a href="#/products">Products</a> / ${esc(k.kit_sku)}`) + `
  <div class="wrap"><div class="pd"><div>${A.img(k.title_en, 340)}<div class="specs-mini" style="margin-top:12px">${A.certChips(k)}<span class="chip">${esc(k.ip)}</span></div></div>
  <div><div class="price">${money(k.list_price_usd)} <small>per kit, 1–9 pcs · USD · DDP</small></div>
    <div class="tiers"><div><b>${money(k.list_price_usd)}</b><span>1–9 pcs</span></div><div><b>${money(k.price_10_49)}</b><span>10–49 pcs</span></div><div><b>${money(k.price_50_199)}</b><span>50–199 pcs</span></div></div>
    <p class="note">200+ pcs per year: framework-agreement pricing. <a href="#/rfq?type=quote&sku=${encodeURIComponent(k.kit_sku)}">Request a volume quote</a>.</p>
    ${A.stockHtml(k)}
    <div class="qty"><input type="number" id="qty" min="1" value="1" aria-label="Quantity"><button id="addBtn" type="button">Add to RFQ list</button>${k.sample_eligible === "Y" ? `<a class="btn ghost" href="#/rfq?type=sample&sku=${encodeURIComponent(k.kit_sku)}">Request ${S.sampleDays}-day sample</a>` : ""}</div>
    <div class="note" id="qtyNote"></div>
    <h3 style="margin-top:22px">Kit contents</h3><ul><li>Motor: ${esc(k.motor_model)}${k.with_brake === "Y" ? " with 24 V holding brake" : ""}</li><li>Drive: ${esc(k.drive_model)} — ${esc(k.comm)}${k.sto ? ", Safe Torque Off" : ""}</li><li>Cables (3 m): ${esc(k.power_cable || "power")}, ${esc(k.encoder_cable || "encoder")}</li></ul>
    ${xr.length ? `<h3>Can replace</h3><p>${xr.map(x => `${esc(x.competitor_brand)} ${esc(x.competitor_model)}${x.verified ? "" : ' <span class="chip grey">demo · not verified</span>'}`).join(", ")} — <a href="#/cross-reference">details</a></p>` : ""}
  </div></div>
  <div class="grid g2" style="margin-bottom:50px">
    <div><h3>Motor specifications</h3><table class="spec">${rows([["Rated power", k.power_w + " W"], ["Rated torque", m.rated_torque_nm, "torque"], ["Peak torque", m.peak_torque_nm, "torque"],
      ["Rated / max speed", `${m.rated_speed_rpm} / ${m.max_speed_rpm} rpm`], ["Rotor inertia", k.rotor_inertia_kgcm2, "inertia"], ["Rated current", m.rated_current_a + " A rms"],
      ["Encoder", k.encoder], ["Frame size", m.flange_mm + " mm" + (m.nema_equiv && m.nema_equiv !== "—" ? ` · ${m.nema_equiv}` : "")], ["Shaft", `Ø${m.shaft_dia_mm} mm, ${m.shaft_type}`],
      ["Holding brake", k.with_brake === "Y" ? m.brake_torque_nm : "Not included", k.with_brake === "Y" ? "torque" : ""], ["Protection", m.ip_rating], ["Weight", m.weight_kg, "mass"]])}</table></div>
    <div><h3>Drive specifications</h3><table class="spec">${rows([["Communication", d.comm], ["Input", `${d.input_voltage}, ${d.input_phase}-phase`], ["Output current", `${d.rated_current_a} A rms (peak ${d.peak_current_a} A)`],
      ["Safe Torque Off", d.sto === "Y" ? "Yes" : "No"], ["Encoder support", d.encoder_support], ["I/O", d.io], ["Dimensions (W×H×D)", d.dimensions_mm ? d.dimensions_mm + " mm" : ""], ["Configuration file", d.config_file]])}</table>
      <h3>Downloads</h3><ul><li>Datasheet (PDF) <span class="chip grey">coming soon</span></li><li>2D drawing (PDF/DXF) &amp; 3D model (STEP) <span class="chip grey">coming soon</span></li>${d.config_file && d.config_file !== "—" ? `<li>${esc(d.config_file)} file <span class="chip grey">coming soon</span></li>` : ""}<li>User manual &amp; tuning software <span class="chip grey">coming soon</span></li></ul></div>
  </div></div>`;
};
B.product = (q, sku) => {
  const k = A.kit(sku); if (!k) return;
  const upd = () => { const n = Math.max(1, Math.floor(+$("#qty").value) || 1); $("#qtyNote").textContent = `${n} × ${money(A.unitPrice(k, n))} = ${money(n * A.unitPrice(k, n))} (estimate; your quote confirms delivery terms)`; };
  $("#qty").addEventListener("input", upd); upd();
  $("#addBtn").addEventListener("click", () => { A.cart.add(k.kit_sku, Math.max(1, Math.floor(+$("#qty").value) || 1)); $("#addBtn").textContent = "Added ✓"; setTimeout(() => $("#addBtn").textContent = "Add to RFQ list", 1500); });
};

const LV = { "drop-in": ["green", "Drop-in replacement"], adapter: ["amber", "Replacement with adapter"], incompatible: ["red", "Functional alternative — not mechanically compatible"], unverified: ["grey", "DEMO — not yet verified by engineering"] };
const FIT = { "直接替换": ["green", "Same"], "需转接板/适配": ["amber", "Adapter"], "不兼容": ["red", "Different"], "待核对": ["grey", "To verify"] };
P["cross-reference"] = q => A.pageHead("Servo Cross-Reference", "Find our equivalent for the servo you use today. Every match is checked by an application engineer against the manufacturer's published catalog.", '<a href="#/">Home</a> / Cross-Reference') + `
  <div class="wrap" style="padding:28px 20px 60px">
    <div class="grid" style="grid-template-columns:2fr 1fr auto;align-items:end;margin-bottom:16px">
      <div><label for="xq">Competitor part number</label><input id="xq" placeholder="e.g. SGM7J-04A, ECM-B3M-C20604, MSMF042" value="${esc(q.get("q") || "")}"></div>
      <div><label for="xb">Brand</label><select id="xb"><option value="">All brands</option>${[...new Set(A.DB.xref.map(x => x.competitor_brand))].map(b => `<option>${esc(b)}</option>`).join("")}</select></div>
      <div><button id="xgo" type="button">Search</button></div></div>
    <div id="xout"></div>
    <div class="alert info" style="margin-top:20px">Don't see your part number? <a href="#/rfq?type=engineering">Send us the model and nameplate photo</a> — we reply with a match and differences within one business day.</div>
    <p class="note">Brand names and part numbers are trademarks of their respective owners and are used only to identify compatible products. Specifications compared from publicly available catalogs; always verify in your application.</p>
  </div>`;
B["cross-reference"] = () => {
  const draw = () => {
    const t = $("#xq").value.trim().toUpperCase().replace(/[\s-]/g, ""), b = $("#xb").value;
    const list = A.DB.xref.filter(x => (!b || x.competitor_brand === b) && (!t || String(x.competitor_model).toUpperCase().replace(/[\s-]/g, "").includes(t)));
    if (t) A.track("xref_search", { q: t, results: list.length });
    $("#xout").innerHTML = list.length ? `<div class="tablewrap"><table class="data"><tr><th>Competitor</th><th>Model</th><th class="num">Power</th><th class="num">Frame</th><th>Our equivalent</th><th>Flange</th><th>Shaft</th><th>Connector</th><th>Torque/speed</th><th>Status</th><th></th></tr>
      ${list.map(x => { const k = x.our_kit_sku && A.kit(x.our_kit_sku), lv = LV[x.match_level] || LV.unverified, fit = v => { const f = FIT[v] || FIT["待核对"]; return `<span class="chip ${f[0]}">${f[1]}</span>`; };
        return `<tr><td>${esc(x.competitor_brand)}<div class="note">${esc(x.competitor_series)}</div></td><td><b>${esc(x.competitor_model)}</b></td><td class="num">${esc(x.competitor_power_w)} W</td><td class="num">${esc(x.competitor_flange_mm)} mm</td>
        <td>${k ? `<a href="#/product/${encodeURIComponent(k.kit_sku)}">${esc(k.kit_sku)}</a><div class="note">${money(k.list_price_usd)}</div>` : esc(x.our_motor_model)}</td>
        <td>${fit(x.flange_fit)}</td><td>${fit(x.shaft_fit)}</td><td>${fit(x.connector_fit)}</td><td>${fit(x.torque_fit)}</td><td><span class="chip ${lv[0]}">${lv[1]}</span>${x.notes_en ? `<div class="note">${esc(x.notes_en)}</div>` : ""}</td>
        <td>${k ? `<button class="sm" data-add="${esc(k.kit_sku)}">Add to RFQ</button>` : ""}</td></tr>`; }).join("")}</table></div>`
      : `<div class="empty">No match found for “${esc($("#xq").value)}”. <a href="#/rfq?type=engineering">Ask an engineer</a> — include the full model number from the nameplate.</div>`;
  };
  $("#xgo").addEventListener("click", draw); $("#xq").addEventListener("keydown", e => { if (e.key === "Enter") draw(); }); $("#xb").addEventListener("change", draw); draw();
};

P.downloads = () => A.pageHead("Downloads", "Datasheets, CAD models, EtherCAT ESI and PROFINET GSDML files, manuals and software.", '<a href="#/">Home</a> / Downloads') + `
  <div class="wrap" style="padding:28px 20px 60px"><div class="alert warn">Files are being prepared. Downloads go live with the official launch — <a href="#/rfq?type=engineering">request a file now</a> and an engineer will email it.</div>
  <div class="tablewrap"><table class="data"><tr><th>Kit</th><th>Datasheet</th><th>2D / 3D CAD</th><th>ESI / GSDML</th><th>Manual</th><th>Software</th></tr>
  ${A.DB.kits.map(k => `<tr><td><a href="#/product/${encodeURIComponent(k.kit_sku)}">${esc(k.kit_sku)}</a><div class="note">${esc(k.title_en)}</div></td>${["PDF", "DXF · STEP", k.config_file && k.config_file !== "—" ? esc(k.config_file) : "", "PDF", "Windows"].map(v => `<td>${v ? `<span class="chip grey">${v} · soon</span>` : "—"}</td>`).join("")}</tr>`).join("")}
  </table></div><p class="note">Production version: CAD downloads require only an email address (no account); each download is logged to CRM as an intent signal.</p></div>`;

P.quality = () => A.pageHead("Quality &amp; Compliance", "Certifications, testing and supply-chain transparency.", '<a href="#/">Home</a> / Quality &amp; Compliance') + `
  <div class="wrap" style="padding:28px 20px 60px"><div class="grid g3">
    <div class="card"><h3>Certifications</h3><table class="spec"><tr><th>CE (EMC &amp; LVD)</th><td><span class="chip green">Certified (demo)</span></td></tr><tr><th>RoHS</th><td><span class="chip green">Compliant (demo)</span></td></tr><tr><th>UL 1004-1 / UL 61800-5-1</th><td><span class="chip amber">In progress</span></td></tr><tr><th>ISO 9001 factory</th><td><span class="chip grey">[to confirm]</span></td></tr></table>
      <p class="note">We only display “UL Recognized” after the certificate is issued and the file number is listed in UL Product iQ.</p></div>
    <div class="card"><h3>Testing</h3><ul><li>100% end-of-line test: back-EMF, encoder, insulation, run-in</li><li>Batch sampling: thermal rise, vibration, IP rating</li><li>Third-party EMC and life testing — reports on request</li></ul><p class="note">[Replace with the factory's actual QC procedure]</p></div>
    <div class="card"><h3>Supply chain &amp; origin</h3><p>Designed and manufactured in China; stocked, supported and serviced in the USA.</p><p>Material traceability declarations (incl. UFLPA due diligence for magnets and copper) available to customers under NDA.</p></div>
  </div></div>`;

P.support = () => A.pageHead("Support, Warranty &amp; Returns", "", '<a href="#/">Home</a> / Support') + `
  <div class="wrap" style="padding:28px 20px 60px"><div class="grid g2">
    <div class="card"><h3>${S.warrantyYears}-year warranty</h3><p>Motors and drives are covered for ${S.warrantyYears} years from shipment against defects in materials and workmanship. Advance replacement from US stock for production-down situations.</p></div>
    <div class="card"><h3>${S.sampleDays}-day evaluation program</h3><p>Qualified OEMs and integrators receive an evaluation kit free of charge for ${S.sampleDays} days. Keep it and the cost is credited to your first production order, or return it prepaid.</p></div>
    <div class="card"><h3>Shipping &amp; pricing</h3><p>Stocked items ship DDP from our US warehouse within 2 business days. Prices include import duties for stocked items. Made-to-order items are quoted with delivery terms.</p></div>
    <div class="card"><h3>Returns &amp; RMA</h3><p>Unused products in original packaging may be returned within ${S.returnDays} days. Contact support with your order number to receive an RMA.</p></div>
    <div class="card"><h3>Engineering support</h3><p>${esc(S.hours)}. First response within 4 business hours. Email <a href="mailto:${esc(S.supportEmail)}">${esc(S.supportEmail)}</a> or <a href="#/rfq?type=engineering">submit a request</a>.</p></div>
    <div class="card"><h3>Legal (placeholders)</h3><p class="note">Terms of Sale · Website Terms · Privacy Policy (CCPA) · Cookie settings · Accessibility statement — to be drafted by counsel.</p></div>
  </div></div>`;

P.about = () => A.pageHead(`About ${esc(S.brand)}`, "", '<a href="#/">Home</a> / About') + `
  <div class="wrap" style="padding:28px 20px 60px"><div class="grid g2">
    <div class="card"><h3>Who we are</h3><p>[Company story: years in motion control, production volume, engineering team size, markets served.]</p><p>[Founder / CTO profile and photo — B2B buyers trust people, not logos.]</p></div>
    <div class="card"><h3>In the USA</h3><p>US warehouse: ${esc(S.address)}</p><p>Phone: ${esc(S.phone)} · ${esc(S.hours)}</p><p>Email: <a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p></div>
  </div><div class="alert info" style="margin-top:18px">[Factory tour video and photos of real production lines go here — no stock imagery.]</div></div>`;

P.notfound = () => `<div class="wrap" style="padding:80px 20px;text-align:center"><h1>Page not found</h1><p><a class="btn" href="#/">Back to home</a></p></div>`;
})();
