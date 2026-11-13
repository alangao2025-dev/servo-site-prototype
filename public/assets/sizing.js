/* sizing: pure calculation engine (A.size) + sizing page. All internal values in SI. */
(() => {
"use strict";
const A = window.APP, { $, $$, esc, money } = A;

/* ---- engine ----
 in: {mech, p:{...mechanism params in SI/catalog units}, tm, af, dw, vert, gr, geff, comm, stockOnly, high}
 out: {req, detail, results:[...], shown:[...]} */
A.size = (inp, kits, R) => {
  const G = 9.80665, rho = R.steel_density || 7850, p = inp.p;
  const gr = Math.max(1, inp.gr || 1), geff = Math.min(1, Math.max(0.3, inp.geff || 1));
  const tm = inp.tm, ta = tm * inp.af, tc = Math.max(0, tm - 2 * ta), dw = Math.max(0, inp.dw || 0), vert = !!inp.vert;
  let JL, TLrun, TLhold, nLoad, detail = [];
  if (inp.mech === "screw" || inp.mech === "belt") {
    const m = p.m, s = p.stroke / 1000, v = s / (tm - ta);
    let k;
    if (inp.mech === "screw") {
      const P = p.lead / 1000, D = p.dia / 1000, L = p.slen / 1000, Js = Math.PI * rho * L * D ** 4 / 32;
      k = P; JL = Js + m * (P / (2 * Math.PI)) ** 2;
      detail.push(`Screw inertia Js = πρLD⁴/32 = ${(Js * 1e4).toFixed(4)} kg·cm²`, `Load inertia m·(P/2π)² = ${(m * (P / 2 / Math.PI) ** 2 * 1e4).toFixed(4)} kg·cm²`);
    } else {
      const D = p.pd / 1000, jp = p.jp / 1e4;
      k = Math.PI * D; JL = (m + p.mb) * (D / 2) ** 2 + 2 * jp;
      detail.push(`Load + belt inertia (m+mb)·(D/2)² = ${((m + p.mb) * (D / 2) ** 2 * 1e4).toFixed(3)} kg·cm²; pulleys 2 × ${p.jp} kg·cm²`);
    }
    const Fg = vert ? m * G : 0, Ff = vert ? 0 : p.mu * m * G, F = Fg + Ff + (p.fext || 0);
    TLrun = F * k / (2 * Math.PI * p.eff); TLhold = vert ? Fg * k / (2 * Math.PI) : 0; nLoad = v / k;
    detail.push(`Peak linear speed v = s/(t−ta) = ${(v * 1000).toFixed(1)} mm/s`, `Axial force F = ${F.toFixed(2)} N → load torque ${TLrun.toFixed(4)} N·m (η = ${p.eff})`);
  } else if (inp.mech === "rotary") {
    const D = p.td / 1000;
    JL = 0.5 * p.tm * (D / 2) ** 2 + (p.jx || 0) / 1e4; TLrun = p.tf || 0; TLhold = 0; nLoad = (p.ang / 360) / (tm - ta);
    detail.push(`Table inertia ½·m·r² = ${(0.5 * p.tm * (D / 2) ** 2 * 1e4).toFixed(3)} kg·cm² + additional ${p.jx || 0} kg·cm²`);
  } else {
    JL = p.jl / 1e4; TLrun = p.tl || 0; TLhold = vert ? TLrun : 0; nLoad = (p.ang / 360) / (tm - ta);
    detail.push("Generic rotary load (inertia and torque entered at load shaft)");
  }
  const rpm = nLoad * gr * 60, w = nLoad * gr * 2 * Math.PI, alpha = w / ta;
  const JLm = JL / gr ** 2, TLm = TLrun / (gr * geff), THm = TLhold / gr;
  detail.push(`Gear ratio ${gr}:1 (η = ${geff}) → reflected inertia ${(JLm * 1e4).toFixed(4)} kg·cm², reflected load torque ${TLm.toFixed(4)} N·m`,
    `Motor peak speed ${rpm.toFixed(0)} rpm; accel time ta = ${ta.toFixed(3)} s; α = ${alpha.toFixed(0)} rad/s²`,
    `For each motor: T_acc = (J_L + J_m)·α + T_L; T_dec = |T_L − (J_L + J_m)·α|; T_rms = √(ΣT²·t / (t_move + t_dwell))`);
  const high = !!inp.high, recMax = high ? Math.min(5, R.inertia_ratio_recommended_max) : R.inertia_ratio_recommended_max;
  const allowMax = high ? R.inertia_ratio_recommended_max : R.inertia_ratio_allowed_max;
  const hasBrakeKits = kits.some(k => k.with_brake === "Y");
  const cands = kits.filter(k => (!inp.comm || k.comm === inp.comm) && (!inp.stockOnly || /In stock/.test(k.stock_status)) && (!vert || !hasBrakeKits || k.with_brake === "Y"));
  const results = cands.map(k => {
    const Jm = k.rotor_inertia_kgcm2 / 1e4, Jt = JLm + Jm;
    const Tacc = Jt * alpha + TLm, Tdec = Math.abs(TLm - Jt * alpha);
    const Trms = Math.sqrt((Tacc ** 2 * ta + TLm ** 2 * tc + Tdec ** 2 * ta + THm ** 2 * dw) / (tm + dw));
    const ratio = JLm / Jm;
    const uPk = Tacc / (k.peak_torque_nm * R.peak_torque_utilization_max), uRms = Trms / (k.rated_torque_nm * R.rms_torque_utilization_max), uN = rpm / (k.max_speed_rpm * R.speed_utilization_max);
    const fails = [];
    if (uPk > 1) fails.push("peak torque"); if (uRms > 1) fails.push("RMS torque"); if (uN > 1) fails.push("speed"); if (ratio > allowMax) fails.push("inertia ratio");
    const level = fails.length ? "no" : ratio <= recMax ? "rec" : "use";
    return { k, Tacc, Trms, ratio, uPk, uRms, uN, level, fails, aboveRated: rpm > k.rated_speed_rpm };
  });
  const rank = x => (x.level === "rec" ? 0 : 1);
  const pass = results.filter(x => x.level !== "no").sort((a, b) => rank(a) - rank(b) || a.k.power_w - b.k.power_w || a.k.list_price_usd - b.k.list_price_usd);
  const shown = pass.slice(0, R.results_shown || 3);
  const near = shown.length ? [] : results.slice().sort((a, b) => Math.max(a.uPk, a.uRms, a.uN) - Math.max(b.uPk, b.uRms, b.uN)).slice(0, 2);
  return { req: { rpm, Tpk: JLm * alpha + TLm, JLm: JLm * 1e4, TLm, vert, recMax, allowMax, cands: cands.length }, detail, results, shown, near };
};

/* ---- page ---- */
const MECH = {
  screw: { name: "Ball screw", e: "🔩", f: [["m", "Load mass (incl. carriage)", "mass", 20], ["lead", "Screw lead", "len", 10], ["dia", "Screw diameter", "len", 16], ["slen", "Screw length", "len", 600],
    ["stroke", "Move distance", "len", 300], ["eff", "Screw efficiency", "none", "screw"], ["mu", "Guide friction coefficient", "none", "fric"], ["fext", "External thrust force", "force", 0]] },
  belt: { name: "Belt / pulley", e: "〰", f: [["m", "Load mass (incl. carriage)", "mass", 8], ["pd", "Pulley pitch diameter", "len", 40], ["jp", "Pulley inertia (each, ×2)", "inertia", 0.5], ["mb", "Belt mass", "mass", 0.3],
    ["stroke", "Move distance", "len", 800], ["eff", "Belt efficiency", "none", "belt"], ["mu", "Guide friction coefficient", "none", "fric"], ["fext", "External force", "force", 0]] },
  rotary: { name: "Rotary table", e: "◎", f: [["tm", "Table mass", "mass", 10], ["td", "Table diameter", "len", 300], ["jx", "Additional load inertia", "inertia", 0], ["ang", "Index angle (deg)", "none", 90], ["tf", "Friction torque at table", "torque", 0.5]] },
  direct: { name: "Generic rotary", e: "↻", f: [["jl", "Load inertia (at load shaft)", "inertia", 5], ["ang", "Move angle (deg)", "none", 360], ["tl", "Load torque (at load shaft)", "torque", 0.3]] }
};
let mech = "screw";

A.pages.sizing = () => {
  const r = A.DB.rules;
  return `${A.pageHead("Servo Sizing Tool", "Enter your axis data. We check peak torque, RMS torque, speed and inertia ratio against every kit and recommend the smallest one that fits.", '<a href="#/">Home</a> / Sizing Tool')}
  <div class="wrap sz"><form id="szForm" novalidate>
    <div class="mech">${Object.entries(MECH).map(([k, v]) => `<button type="button" data-m="${k}" class="${k === mech ? "on" : ""}"><span class="e">${v.e}</span>${v.name}</button>`).join("")}</div>
    <fieldset><legend>Mechanism</legend><div class="fgrid" id="mechFields"></div></fieldset>
    <fieldset><legend>Motion profile</legend><div class="fgrid">
      <div><label>Move time <span class="u">s</span></label><input name="tm" type="number" step="any" value="0.6" min="0.01"></div>
      <div><label>Accel / decel time <span class="u">each, share of move</span></label><select name="af"><option value="0.1">10%</option><option value="0.2">20%</option><option value="0.25" selected>25%</option><option value="0.333">33%</option></select></div>
      <div><label>Dwell time <span class="u">s</span></label><input name="dw" type="number" step="any" value="0.4" min="0"></div>
      <div><label>Orientation</label><select name="ori"><option value="h">Horizontal</option><option value="v">Vertical (lifting)</option></select></div>
      <div><label>Gear ratio <span class="u">motor : load</span></label><input name="gr" type="number" step="any" value="1" min="1"></div>
      <div><label>Gearbox efficiency</label><input name="geff" type="number" step="any" value="${r.default_gear_efficiency}" min="0.3" max="1"></div>
    </div><p class="note" style="margin:8px 0 0">Gearbox efficiency is only applied when gear ratio &gt; 1.</p></fieldset>
    <fieldset><legend>Preferences</legend><div class="fgrid">
      <div><label>Communication</label><select name="comm"><option value="">Any</option>${[...new Set(A.DB.kits.map(k => k.comm))].map(c => `<option>${esc(c)}</option>`).join("")}</select></div>
      <div><label>Response</label><select name="dyn"><option value="std">Standard</option><option value="high">High dynamic / rigid coupling</option></select></div>
      <div class="full"><label style="display:flex;gap:6px;font-weight:400"><input type="checkbox" name="stockOnly" style="width:auto">Only kits in stock in the USA</label></div>
    </div></fieldset>
    <button type="submit" style="width:100%">Calculate &amp; recommend</button>
    <p class="note">Engineering estimate. Margins: peak ≤ ${Math.round(r.peak_torque_utilization_max * 100)}% of motor peak torque, RMS ≤ ${Math.round(r.rms_torque_utilization_max * 100)}% of rated torque, speed ≤ ${Math.round(r.speed_utilization_max * 100)}% of max, inertia ratio ≤ ${r.inertia_ratio_recommended_max}:1 recommended (≤ ${r.inertia_ratio_allowed_max}:1 usable). An application engineer reviews every sample request.</p>
  </form><div id="szOut"><div class="empty">Enter your axis data and press <b>Calculate</b>.<br><br>Tip: switch Metric / Imperial in the top bar — inputs convert automatically.</div></div></div>`;
};
function mechFields() {
  const r = A.DB.rules, defs = { screw: r.default_screw_efficiency, belt: r.default_belt_efficiency, fric: r.default_friction_coeff };
  $("#mechFields").innerHTML = MECH[mech].f.map(([k, l, t, v]) => {
    const val = typeof v === "string" ? defs[v] : +A.toDisp(v, t).toFixed(4);
    return `<div><label for="f_${k}">${l} ${A.ul(t) ? `<span class="u">${A.ul(t)}</span>` : ""}</label><input id="f_${k}" name="${k}" data-ut="${t}" type="number" step="any" value="${val}" min="0"></div>`;
  }).join("");
}
A.binds.sizing = () => {
  mechFields();
  $$(".mech button").forEach(b => b.addEventListener("click", () => { mech = b.dataset.m; $$(".mech button").forEach(x => x.classList.toggle("on", x === b)); mechFields(); $("#szOut").innerHTML = '<div class="empty">Press <b>Calculate</b>.</div>'; }));
  $("#szForm").addEventListener("submit", e => { e.preventDefault(); run(); });
};
A.onUnits = A.onUnits || [];
A.onUnits.push((from, to) => { // convert sizing inputs in place when units change
  A.$$("#mechFields input[data-ut]").forEach(i => {
    const t = i.dataset.ut, v = parseFloat(i.value); if (t === "none" || isNaN(v)) return;
    const si = from === "metric" ? v : v / A.U[t][2]; i.value = +(to === "metric" ? si : si * A.U[t][2]).toFixed(4);
  });
  A.$$("#mechFields .u").forEach((s, idx) => { const t = MECH[mech].f[idx] && MECH[mech].f[idx][2]; if (t) s.textContent = A.ul(t); });
});

function run() {
  const f = $("#szForm"), num = n => parseFloat(f.elements[n].value);
  const p = {}, bad = [];
  MECH[mech].f.forEach(([k, l, t]) => { const v = num(k); if (!(v >= 0) || isNaN(v)) bad.push(l); p[k] = A.fromDisp(v, t); });
  const inp = { mech, p, tm: num("tm"), af: parseFloat(f.elements.af.value), dw: num("dw") || 0, vert: f.elements.ori.value === "v", gr: num("gr") || 1, geff: num("gr") > 1 ? num("geff") : 1,
    comm: f.elements.comm.value, stockOnly: f.elements.stockOnly.checked, high: f.elements.dyn.value === "high" };
  if (!(inp.tm > 0)) bad.push("Move time");
  if ((mech === "screw" || mech === "belt") && !(p.eff > 0 && p.eff <= 1)) bad.push("Efficiency (0–1)");
  if (mech === "screw" && !(p.lead > 0)) bad.push("Screw lead > 0");
  if (mech === "belt" && !(p.pd > 0)) bad.push("Pulley diameter > 0");
  if (bad.length) { $("#szOut").innerHTML = `<div class="alert err">Please check: ${bad.map(esc).join(", ")}</div>`; return; }
  const out = A.size(inp, A.DB.kits, A.DB.rules);
  const q = out.req;
  sessionStorage.setItem("lastSizing", JSON.stringify({ mechanism: MECH[mech].name, motor_peak_speed_rpm: Math.round(q.rpm), reflected_inertia_kgcm2: +q.JLm.toFixed(4),
    reflected_load_torque_nm: +q.TLm.toFixed(4), recommended: out.shown.map(x => x.k.kit_sku) }));
  A.track("sizing_calculated", { mechanism: mech, results: out.shown.length });
  const meter = (lb, u) => { const pct = Math.min(130, u * 100), col = u > 1 ? "#e03131" : u > 0.85 ? "#f59f00" : "#2b8a3e";
    return `<div class="meter"><div class="lb"><span>${lb}</span><b>${Math.round(u * 100)}%</b></div><div class="bar"><i style="width:${Math.min(100, pct)}%;background:${col}"></i></div></div>`; };
  const card = (x, i) => {
    const k = x.k, b = { rec: ["rec", "Recommended"], use: ["use", "Usable — tuning required"], no: ["no", "Not suitable: " + x.fails.join(", ")] }[x.level];
    return `<div class="res ${i === 0 && x.level !== "no" ? "best" : ""}"><div>
      <span class="badge ${b[0]}">${esc(b[1])}</span>${i === 0 && x.level !== "no" ? ' <span class="chip blue">Best fit</span>' : ""}
      <h3 style="margin:8px 0 2px"><a href="#/product/${encodeURIComponent(k.kit_sku)}">${esc(k.title_en)}</a></h3><div class="note">${esc(k.kit_sku)} · ${money(k.list_price_usd)} · ${A.inStock(k) ? "In stock (US)" : esc(k.stock_status)}</div>
      ${meter(`Peak torque ${A.fmtU(x.Tacc, "torque", 3)} vs ${Math.round(A.DB.rules.peak_torque_utilization_max * 100)}% of ${k.peak_torque_nm} N·m`, x.uPk)}
      ${meter(`RMS torque ${A.fmtU(x.Trms, "torque", 3)} vs ${Math.round(A.DB.rules.rms_torque_utilization_max * 100)}% of ${k.rated_torque_nm} N·m`, x.uRms)}
      ${meter(`Speed ${Math.round(q.rpm)} rpm vs ${k.max_speed_rpm} rpm max`, x.uN)}
      <div class="note">Inertia ratio <b>${x.ratio.toFixed(1)} : 1</b> (recommended ≤ ${q.recMax}, usable ≤ ${q.allowMax})${x.aboveRated ? " · runs above rated speed — check torque-speed curve" : ""}</div>
    </div><div style="display:flex;flex-direction:column;gap:8px;justify-content:center">
      <button class="sm" data-add="${esc(k.kit_sku)}">Add to RFQ</button>
      ${k.sample_eligible === "Y" ? `<a class="btn sm ghost" href="#/rfq?type=sample&sku=${encodeURIComponent(k.kit_sku)}&from=sizing">Request sample with this sizing</a>` : ""}
      <a class="btn sm ghost" href="#/rfq?type=engineering&sku=${encodeURIComponent(k.kit_sku)}&from=sizing">Ask an engineer to review</a></div></div>`;
  };
  $("#szOut").innerHTML = `<div class="req-box">
      <div><b>${Math.round(q.rpm).toLocaleString()} rpm</b><span>motor peak speed</span></div>
      <div><b>${A.fmtU(q.Tpk, "torque", 3)}</b><span>peak torque (excl. rotor)</span></div>
      <div><b>${A.fmtU(q.TLm, "torque", 3)}</b><span>load torque at motor</span></div>
      <div><b>${A.fmtU(q.JLm, "inertia", 4)}</b><span>reflected load inertia</span></div>
      <div><b>${q.cands}</b><span>kits checked${q.vert ? " (brake kits only)" : ""}</span></div></div>
    ${out.shown.length ? out.shown.map(card).join("") : `<div class="alert warn"><b>No stocked kit meets all criteria.</b> Closest options are shown below. Consider a gearbox, a longer accel time, or <a href="#/rfq?type=engineering&from=sizing">ask an engineer</a> — larger frames are available made-to-order.</div>${out.near.map(card).join("")}`}
    ${q.vert ? '<div class="alert info">Vertical axis: a holding brake is required. Only brake kits are evaluated; holding torque during dwell is included in RMS.</div>' : ""}
    <details class="calc"><summary>Show calculation</summary><pre>${esc(out.detail.join("\n"))}</pre></details>`;
}
})();
