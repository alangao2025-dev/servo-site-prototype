/* router + shell: loads data, hash routing, units toggle, demo banner, internal review drawer (Chinese) */
(() => {
"use strict";
const A = window.APP, { $, $$, esc } = A, S = A.S;

const NOTES = {
  _all: { src: "全站", todo: ["品牌名、Logo、域名、联系方式：改 assets/config.js 一处即可", "正式版改为独立 URL（/products/xxx）以利 SEO；原型用 # 路由", "隐私政策、Cookie 同意、无障碍声明需法务出稿", "GA4 / LinkedIn Insight / HubSpot 追踪代码：上线前接入（事件已按 dataLayer 预留）"] },
  home: { src: "Kits 表（role = 利润款 的前 4 个作为推荐）", todo: ["首屏主张与 3 个证明点需要和营销计划的品牌屋保持一致", "客户案例、工厂视频、创始人/工程师照片待拍摄（不得用素材图）", "“48h 样机”“4 小时响应”是对外承诺，上线前需销售与供应链确认能做到"] },
  products: { src: "Kits 表（launch_batch = Y），关联 Motors / Drives", todo: ["产品白底图（每个系列至少 3 张）", "筛选项由数据自动生成；新增通讯方式无需改代码"] },
  product: { src: "Kits + Motors + Drives + Cables；“可替换”来自 Cross_Reference", todo: ["规格书 PDF、2D/3D、ESI/GSDML 上传后把 coming soon 换成链接（见 Files_Checklist）", "价格阶梯：Kits 表未填时按 Selector_Rules 的默认折扣计算", "UL：只有 Motors 和 Drives 的 ul_status 都为“已取得”才显示 UL Recognized"] },
  sizing: { src: "Kits 的扭矩/转速/惯量 + Selector_Rules 阈值", todo: ["判定阈值（惯量比、扭矩余量）须研发负责人在 Selector_Rules 表确认", "上线前请 2 位工程师用 5–10 个真实案例与内部选型软件对比，误差 ≤ 5%", "后续可加：转矩-转速曲线校核、减速机型号库、竖直轴配重"] },
  "cross-reference": { src: "Cross_Reference 表", todo: ["原型显示了“演示-未核对”的行；正式发布时 xlsx_to_json.py 不加 --include-unverified，只输出“工程已核对”的行", "每行须有核对依据（竞品样本+页码）、工程师和日期", "比较广告须真实可证实（FTC）；不使用竞品 Logo"] },
  downloads: { src: "Kits + Files_Checklist", todo: ["文件放在 Cloudflare R2；CAD 下载只要邮箱、不强制注册，下载记录进 CRM 作为意向信号"] },
  quality: { src: "手写内容（占位）", todo: ["认证状态与证书编号以实际为准", "质检流程、ISO 9001 证书待工厂提供", "UFLPA 溯源声明需法务审核"] },
  support: { src: "config.js（质保年限、样机天数、退货天数）", todo: ["质保、样机、退货、RMA 条款需法务与财务确认后定稿"] },
  about: { src: "占位", todo: ["公司介绍、创始人/CTO 简介、美国地址与电话"] },
  rfq: { src: "浏览器本地询价单 + 表单", todo: ["正式版提交到 HubSpot Forms API（填 config.js 的 portalId / formGuid）", "加 Cloudflare Turnstile 防垃圾询盘（原型只有隐藏字段 honeypot）", "线索评分规则与营销计划 ⑤ 一致：ICP 匹配度 + 意向度，≥ 60 分为 MQL", "提交后自动回复邮件、Slack/邮件通知销售"] }
};

function setUnits(u) {
  const from = A.UNITS; if (u === from) return;
  A.UNITS = u; localStorage.setItem("units", u);
  $$(".units button").forEach(b => b.classList.toggle("on", b.dataset.u === u));
  (A.onUnits || []).forEach(fn => fn(from, u));
  if (!/^#\/sizing/.test(location.hash)) route(); // other pages just re-render
}

function parse() {
  const h = location.hash.replace(/^#\/?/, ""), [path, qs] = h.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "home", arg: parts[1] ? decodeURIComponent(parts[1]) : null, q: new URLSearchParams(qs || "") };
}
function route() {
  const { name, arg, q } = parse(), fn = A.pages[name] || A.pages.notfound;
  $("#app").innerHTML = fn(q, arg);
  if (A.binds[name] && A.pages[name]) A.binds[name](q, arg);
  $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.r === name || (name === "product" && a.dataset.r === "products")));
  $("#nav").classList.remove("open");
  const n = NOTES[name] || NOTES._all;
  $("#reviewBody").innerHTML = `<h3>原型说明（仅内部可见）</h3><p>当前页面：<b>${esc(name)}</b></p><h4>数据来源</h4><p>${esc(n.src)}</p>
    <h4>上线前待办</h4><ul>${n.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul><h4>全站待办</h4><ul>${NOTES._all.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    <h4>数据状态</h4><p>${A.DB.demo ? "⚠ 当前为演示数据（型号以 DEMO- 开头）" : "真实数据"}；生成时间 ${esc(A.DB.generated_at)}；来源文件 ${esc(A.DB.source_file)}</p>`;
  document.title = `${name === "home" ? "Industrial AC Servo Motors & Drives" : $("#app h1") ? $("#app h1").textContent : name} | ${S.brand} (prototype)`;
  window.scrollTo(0, 0);
  A.track("page_view", { page: name });
}

async function init() {
  $("#logo").innerHTML = `<span>⚙</span><span class="ph">${esc(S.brand)}</span>`;
  $("#flogo").innerHTML = `⚙ ${esc(S.brand)}`;
  $("#ftag").textContent = S.tagline;
  $("#fcontact").innerHTML = `${esc(S.phone)}<br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br>${esc(S.address)}`;
  $("#fcopy").textContent = `© ${new Date().getFullYear()} ${S.brand}. All rights reserved.`;
  if (S.demoBanner && !sessionStorage.getItem("demoClosed")) $("#demoBar").hidden = false;
  $("#demoClose").addEventListener("click", () => { $("#demoBar").hidden = true; sessionStorage.setItem("demoClosed", "1"); });
  $$(".units button").forEach(b => { b.classList.toggle("on", b.dataset.u === A.UNITS); b.addEventListener("click", () => setUnits(b.dataset.u)); });
  $("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
  $("#reviewBtn").addEventListener("click", () => $("#review").classList.add("open"));
  $("#reviewClose").addEventListener("click", () => $("#review").classList.remove("open"));
  try {
    const r = await fetch("data/products.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    A.DB = await r.json();
  } catch (e) {
    $("#app").innerHTML = `<div class="wrap" style="padding:60px 20px"><div class="alert err">Could not load product data (${esc(e.message)}).</div></div>`; return;
  }
  A.badge();
  window.addEventListener("hashchange", route);
  route();
}
init();
})();
