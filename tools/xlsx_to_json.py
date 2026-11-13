"""校验产品数据 Excel 并生成网站数据 public/data/products.json。
用法：python3 -I tools/xlsx_to_json.py <产品数据.xlsx> <输出.json> [--include-unverified]
--include-unverified：竞品对照里未经工程核对的行也输出（仅原型演示用，正式上线不要加）。
有错误时不写文件，退出码 1，并列出“表名 行号 字段 原因”。
"""
import json
import sys
from datetime import datetime, timezone

from openpyxl import load_workbook

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) != 2:
    sys.exit(__doc__)
SRC, OUT = args
INCLUDE_UNVERIFIED = "--include-unverified" in sys.argv

REQ = {
    "Motors": ["motor_model", "series", "rated_power_w", "voltage_class", "flange_mm", "inertia_class", "rated_torque_nm",
               "peak_torque_nm", "rated_speed_rpm", "max_speed_rpm", "rotor_inertia_kgcm2", "rated_current_a", "encoder_type",
               "encoder_bits", "brake_option", "shaft_dia_mm", "shaft_type", "ip_rating", "weight_kg", "ul_status", "ce_status"],
    "Drives": ["drive_model", "series", "comm", "max_motor_power_w", "input_voltage", "input_phase", "rated_current_a",
               "peak_current_a", "sto", "encoder_support", "config_file", "ul_status", "ce_status"],
    "Cables": ["cable_model", "cable_type", "length_m", "flex_rated", "fits_flange_mm", "list_price_usd"],
    "Kits": ["kit_sku", "motor_model", "drive_model", "with_brake", "role", "list_price_usd", "stock_status", "lead_time_days",
             "launch_batch", "sample_eligible", "title_en"],
    "Cross_Reference": ["competitor_brand", "competitor_series", "competitor_model", "competitor_power_w", "competitor_flange_mm",
                        "our_motor_model", "flange_fit", "shaft_fit", "connector_fit", "torque_fit", "status"],
    "Selector_Rules": ["key", "value"],
}
NUM = {
    "Motors": ["rated_power_w", "rated_torque_nm", "peak_torque_nm", "rated_speed_rpm", "max_speed_rpm", "rotor_inertia_kgcm2",
               "rated_current_a", "encoder_bits", "brake_torque_nm", "rotor_inertia_brake_kgcm2", "shaft_dia_mm", "shaft_len_mm",
               "weight_kg", "length_mm"],
    "Drives": ["max_motor_power_w", "rated_current_a", "peak_current_a", "weight_kg", "list_price_usd"],
    "Cables": ["length_m", "list_price_usd"],
    "Kits": ["list_price_usd", "price_10_49", "price_50_199", "lead_time_days"],
    "Cross_Reference": ["competitor_power_w", "competitor_flange_mm", "competitor_rated_torque_nm", "competitor_shaft_dia_mm"],
    "Selector_Rules": ["value"],
}
KEY = {"Motors": "motor_model", "Drives": "drive_model", "Cables": "cable_model", "Kits": "kit_sku"}
errors, warnings = [], []


def read(wb, name):
    if name not in wb.sheetnames:
        errors.append(f"缺少工作表 {name}")
        return []
    ws = wb[name]
    keys = [c.value for c in ws[1]]
    out = []
    for r_idx, row in enumerate(ws.iter_rows(min_row=4, values_only=True), start=4):
        if all(v in (None, "") for v in row):
            continue
        rec = {k: (v.strip() if isinstance(v, str) else v) for k, v in zip(keys, row) if k}
        rec["_row"] = r_idx
        for k in REQ.get(name, []):
            if rec.get(k) in (None, ""):
                errors.append(f"{name} 第{r_idx}行 {k}：必填为空")
        for k in NUM.get(name, []):
            v = rec.get(k)
            if v in (None, ""):
                rec[k] = None
                continue
            try:
                rec[k] = float(v)
                if rec[k].is_integer():
                    rec[k] = int(rec[k])
            except (TypeError, ValueError):
                errors.append(f"{name} 第{r_idx}行 {k}：应为数字，实际为 {v!r}")
        out.append(rec)
    if name in KEY:
        seen = {}
        for rec in out:
            k = rec.get(KEY[name])
            if k in seen:
                errors.append(f"{name} 第{rec['_row']}行 {KEY[name]}：型号 {k} 与第{seen[k]}行重复")
            seen[k] = rec["_row"]
    return out


wb = load_workbook(SRC, data_only=True)
motors, drives, cables, kits = (read(wb, n) for n in ("Motors", "Drives", "Cables", "Kits"))
xref, rules_rows = read(wb, "Cross_Reference"), read(wb, "Selector_Rules")
M = {m["motor_model"]: m for m in motors}
D = {d["drive_model"]: d for d in drives}
C = {c["cable_model"]: c for c in cables}
K = {k["kit_sku"]: k for k in kits}

for m in motors:
    if m.get("peak_torque_nm") and m.get("rated_torque_nm") and m["peak_torque_nm"] < m["rated_torque_nm"]:
        errors.append(f"Motors 第{m['_row']}行：峰值扭矩小于额定扭矩")
    if m.get("max_speed_rpm") and m.get("rated_speed_rpm") and m["max_speed_rpm"] < m["rated_speed_rpm"]:
        errors.append(f"Motors 第{m['_row']}行：最高转速小于额定转速")
    if m.get("brake_option") == "Y" and not m.get("rotor_inertia_brake_kgcm2"):
        warnings.append(f"Motors 第{m['_row']}行：可选刹车但未填带刹车惯量，选型时按不带刹车计算")
for k in kits:
    r = k["_row"]
    m, d = M.get(k.get("motor_model")), D.get(k.get("drive_model"))
    if not m:
        errors.append(f"Kits 第{r}行 motor_model：{k.get('motor_model')} 不在 Motors 表")
    if not d:
        errors.append(f"Kits 第{r}行 drive_model：{k.get('drive_model')} 不在 Drives 表")
    if m and d and m.get("rated_power_w") and d.get("max_motor_power_w") and m["rated_power_w"] > d["max_motor_power_w"]:
        errors.append(f"Kits 第{r}行：电机 {m['rated_power_w']}W 超过驱动适配上限 {d['max_motor_power_w']}W")
    if m and k.get("with_brake") == "Y" and m.get("brake_option") != "Y":
        errors.append(f"Kits 第{r}行：选了带刹车，但电机 {m['motor_model']} 没有刹车选项")
    for f in ("power_cable", "encoder_cable"):
        if k.get(f) and k[f] not in C:
            errors.append(f"Kits 第{r}行 {f}：{k[f]} 不在 Cables 表")
for x in xref:
    if x.get("our_motor_model") not in M:
        errors.append(f"Cross_Reference 第{x['_row']}行 our_motor_model：{x.get('our_motor_model')} 不在 Motors 表")
    if x.get("our_kit_sku") and x["our_kit_sku"] not in K:
        errors.append(f"Cross_Reference 第{x['_row']}行 our_kit_sku：{x['our_kit_sku']} 不在 Kits 表")
    if x.get("status") in ("工程已核对", "已上线") and not (x.get("source_doc") and x.get("verified_by") and x.get("verified_date")):
        errors.append(f"Cross_Reference 第{x['_row']}行：标为已核对，但核对依据/工程师/日期不全")

rules = {r["key"]: r["value"] for r in rules_rows if r.get("key")}
for need in ("inertia_ratio_recommended_max", "inertia_ratio_allowed_max", "peak_torque_utilization_max",
             "rms_torque_utilization_max", "speed_utilization_max"):
    if need not in rules:
        errors.append(f"Selector_Rules 缺少 {need}")

if not any(k.get("launch_batch") == "Y" for k in kits):
    errors.append("Kits：没有 launch_batch = Y 的套装，网站将没有可展示的产品")
if errors:
    print(f"校验失败：{len(errors)} 个错误（未生成文件）")
    for e in errors:
        print("  ✗", e)
    for w in warnings:
        print("  !", w)
    sys.exit(1)


def clean(d):
    return {k: v for k, v in d.items() if not k.startswith("_") and v not in (None, "")}


def ul_public(status):  # 合规：未取得证书前对外只显示“申请中”或不显示
    return {"已取得": "UL Recognized", "申请中": "UL pending"}.get(status, "")


d10, d50 = float(rules.get("discount_10_49", 0.08)), float(rules.get("discount_50_199", 0.15))
out_kits = []
for k in kits:
    if k.get("launch_batch") != "Y":
        continue
    m, d = M[k["motor_model"]], D[k["drive_model"]]
    p = k["list_price_usd"]
    j = m.get("rotor_inertia_brake_kgcm2") if k.get("with_brake") == "Y" and m.get("rotor_inertia_brake_kgcm2") else m["rotor_inertia_kgcm2"]
    out_kits.append({
        **clean(k),
        "price_10_49": k.get("price_10_49") or round(p * (1 - d10)),
        "price_50_199": k.get("price_50_199") or round(p * (1 - d50)),
        "power_w": m["rated_power_w"], "flange_mm": str(m["flange_mm"]), "voltage": m["voltage_class"], "comm": d["comm"],
        "rated_torque_nm": m["rated_torque_nm"], "peak_torque_nm": m["peak_torque_nm"],
        "rated_speed_rpm": m["rated_speed_rpm"], "max_speed_rpm": m["max_speed_rpm"],
        "rotor_inertia_kgcm2": j, "encoder": f"{m['encoder_bits']}-bit {m['encoder_type']}", "ip": m["ip_rating"],
        "sto": d.get("sto") == "Y", "config_file": d.get("config_file"),
        "ul": ul_public(m.get("ul_status")) if ul_public(m.get("ul_status")) == ul_public(d.get("ul_status")) else ul_public("申请中") if "申请中" in (m.get("ul_status"), d.get("ul_status")) else "",
        "ce": m.get("ce_status") == "已取得" and d.get("ce_status") == "已取得",
    })
launched_motors = {k["motor_model"] for k in out_kits}
out_xref = []
for x in xref:
    ok = x.get("status") in ("工程已核对", "已上线")
    if not ok and not INCLUDE_UNVERIFIED:
        continue
    fits = [x.get(f) for f in ("flange_fit", "shaft_fit", "connector_fit", "torque_fit")]
    level = "incompatible" if "不兼容" in fits else "drop-in" if all(f == "直接替换" for f in fits) else "adapter" if ok else "unverified"
    out_xref.append({**clean(x), "match_level": level, "verified": ok,
                     "our_kit_sku": x.get("our_kit_sku") if x.get("our_kit_sku") in {k["kit_sku"] for k in out_kits} else None})
    if x["our_motor_model"] not in launched_motors:
        warnings.append(f"Cross_Reference 第{x['_row']}行：对应电机 {x['our_motor_model']} 不在首批上线套装里")

data = {
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "source_file": SRC.split("/")[-1],
    "demo": any(str(k["kit_sku"]).startswith("DEMO-") for k in out_kits),
    "rules": rules,
    "kits": out_kits,
    "motors": [clean(m) for m in motors if m["motor_model"] in launched_motors],
    "drives": [clean(d) for d in drives if d["drive_model"] in {k["drive_model"] for k in out_kits}],
    "cables": [clean(c) for c in cables],
    "xref": out_xref,
}
with open(OUT, "w", encoding="utf8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(f"OK：套装 {len(out_kits)}、电机 {len(data['motors'])}、驱动 {len(data['drives'])}、线缆 {len(cables)}、竞品对照 {len(out_xref)} → {OUT}")
for w in warnings:
    print("  !", w)
