"""生成《产品参数表与竞品替换对照表》Excel 模板（含演示数据）。
用法：python3 -I tools/make_template.py <输出.xlsx> [--blank]
--blank：只要表头和说明，不带演示数据（发给研发填写用）。
表结构约定（所有数据表一致）：第 1 行 = 字段键（英文，程序读取，不要改）；第 2 行 = 中文名称（单位）；
第 3 行 = 填写说明 / 示例；第 4 行起 = 数据。必填列表头为橙色。
"""
import sys
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

BLANK = "--blank" in sys.argv
OUT = [a for a in sys.argv[1:] if not a.startswith("--")][0]

NAVY, ORANGE, GREY, DEMO = "0D1B3D", "FFD8A8", "F1F3F5", "FFF9DB"
thin = Side(style="thin", color="D0D7E2")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

LISTS = {
    "yn": ["Y", "N"],
    "comm": ["Pulse", "Modbus RTU", "EtherCAT", "PROFINET", "CANopen", "EtherNet/IP"],
    "encoder": ["Incremental", "Absolute-Single", "Absolute-Multi"],
    "flange": ["40", "60", "80", "86", "110", "130", "180"],
    "voltage": ["24-48VDC", "110VAC", "220VAC", "380-480VAC"],
    "phase": ["1", "3", "1/3"],
    "stock": ["In stock (US)", "Ships from China", "Made to order", "Not launched"],
    "role": ["引流款", "利润款", "形象款", "大客户定制"],
    "inertia": ["Low", "Medium", "High"],
    "fit": ["直接替换", "需转接板/适配", "不兼容", "待核对"],
    "status": ["演示-未核对", "草稿", "工程已核对", "已上线"],
    "cert": ["已取得", "申请中", "未申请", "不适用"],
    "file": ["已有英文版", "仅中文", "待制作", "不适用"],
    "cable": ["Power", "Encoder", "Brake", "Power+Brake"],
}

# (key, 中文名（单位）, 说明, 必填, 下拉列表名, 列宽)
MOTORS = [
    ("motor_model", "电机型号", "唯一，网站和 URL 使用；只用字母数字和 -", 1, None, 18),
    ("series", "系列", "如 S1 / S3 / IS", 1, None, 8),
    ("rated_power_w", "额定功率（W）", "数字", 1, None, 10),
    ("voltage_class", "电压等级", "下拉", 1, "voltage", 12),
    ("flange_mm", "法兰尺寸（mm）", "下拉；方法兰边长", 1, "flange", 9),
    ("nema_equiv", "近似 NEMA 尺寸", "如 NEMA 23；没有对应填 —", 0, None, 11),
    ("inertia_class", "惯量等级", "下拉", 1, "inertia", 9),
    ("rated_torque_nm", "额定扭矩（N·m）", "数字", 1, None, 10),
    ("peak_torque_nm", "峰值扭矩（N·m）", "数字，通常为额定 3 倍", 1, None, 10),
    ("rated_speed_rpm", "额定转速（rpm）", "数字", 1, None, 10),
    ("max_speed_rpm", "最高转速（rpm）", "数字", 1, None, 10),
    ("rotor_inertia_kgcm2", "转子惯量（kg·cm²）", "不带刹车；选型计算关键参数，务必准确", 1, None, 12),
    ("rated_current_a", "额定电流（A rms）", "数字", 1, None, 10),
    ("encoder_type", "编码器类型", "下拉", 1, "encoder", 14),
    ("encoder_bits", "编码器位数（bit）", "如 17 / 23", 1, None, 9),
    ("brake_option", "可选刹车", "Y/N", 1, "yn", 8),
    ("brake_torque_nm", "刹车保持力矩（N·m）", "无刹车填空", 0, None, 10),
    ("rotor_inertia_brake_kgcm2", "带刹车转子惯量（kg·cm²）", "无刹车填空", 0, None, 12),
    ("shaft_dia_mm", "轴径（mm）", "数字", 1, None, 8),
    ("shaft_type", "轴型", "如 Keyed / Smooth / D-cut", 1, None, 10),
    ("shaft_len_mm", "轴伸长度（mm）", "数字", 0, None, 9),
    ("ip_rating", "防护等级", "如 IP65 / IP67（不含轴端注明）", 1, None, 8),
    ("weight_kg", "重量（kg）", "不带刹车", 1, None, 8),
    ("length_mm", "机身长度（mm）", "不带刹车", 0, None, 9),
    ("ul_status", "UL 状态", "下拉；未取得证书前网站不得写 UL listed", 1, "cert", 10),
    ("ce_status", "CE 状态", "下拉", 1, "cert", 10),
    ("notes_en", "英文备注", "网站可直接展示的一句话卖点", 0, None, 30),
]
DRIVES = [
    ("drive_model", "驱动型号", "唯一", 1, None, 16),
    ("series", "系列", "如 S1 / S3", 1, None, 8),
    ("comm", "通讯 / 控制方式", "下拉；一个型号一种主通讯", 1, "comm", 12),
    ("max_motor_power_w", "适配电机最大功率（W）", "数字", 1, None, 11),
    ("input_voltage", "输入电压", "下拉", 1, "voltage", 12),
    ("input_phase", "输入相数", "下拉", 1, "phase", 8),
    ("rated_current_a", "额定输出电流（A rms）", "数字", 1, None, 10),
    ("peak_current_a", "峰值输出电流（A rms）", "数字", 1, None, 10),
    ("sto", "STO 安全转矩关断", "Y/N", 1, "yn", 8),
    ("encoder_support", "支持的编码器", "如 17/23-bit absolute", 1, None, 16),
    ("io", "I/O 数量", "如 8DI/4DO", 0, None, 10),
    ("dimensions_mm", "外形尺寸 宽×高×深（mm）", "如 40×170×150", 0, None, 14),
    ("weight_kg", "重量（kg）", "数字", 0, None, 8),
    ("config_file", "配置文件", "EtherCAT 填 ESI，PROFINET 填 GSDML，其他填 —", 1, None, 10),
    ("ul_status", "UL 状态", "下拉", 1, "cert", 10),
    ("ce_status", "CE 状态", "下拉", 1, "cert", 10),
    ("list_price_usd", "单独销售美国标价（USD）", "不单卖填空", 0, None, 10),
]
CABLES = [
    ("cable_model", "线缆型号", "唯一", 1, None, 18),
    ("cable_type", "类型", "下拉", 1, "cable", 11),
    ("length_m", "长度（m）", "数字", 1, None, 8),
    ("flex_rated", "高柔拖链", "Y/N", 1, "yn", 8),
    ("fits_flange_mm", "适配法兰（mm）", "多个用 / 分隔，如 40/60/80", 1, None, 12),
    ("connector", "接头类型", "如 Molex / M23 / 航插", 0, None, 12),
    ("list_price_usd", "美国标价（USD）", "数字", 1, None, 10),
]
KITS = [
    ("kit_sku", "套装 SKU（网站销售单位）", "唯一；网站上加入询价单的就是这一行", 1, None, 22),
    ("motor_model", "电机型号", "必须在 Motors 表里存在", 1, None, 16),
    ("drive_model", "驱动型号", "必须在 Drives 表里存在", 1, None, 16),
    ("with_brake", "带刹车", "Y/N", 1, "yn", 8),
    ("power_cable", "默认动力线", "必须在 Cables 表里存在", 0, None, 16),
    ("encoder_cable", "默认编码器线", "必须在 Cables 表里存在", 0, None, 16),
    ("role", "产品角色", "下拉", 1, "role", 10),
    ("list_price_usd", "标价 1–9 套（USD）", "数字；含驱动和 3m 线缆", 1, None, 10),
    ("price_10_49", "10–49 套单价", "数字；空着则按 Selector_Rules 的默认折扣", 0, None, 10),
    ("price_50_199", "50–199 套单价", "同上", 0, None, 10),
    ("stock_status", "库存状态", "下拉", 1, "stock", 15),
    ("lead_time_days", "交期（天）", "美国仓现货填 2", 1, None, 8),
    ("launch_batch", "首批上线", "Y/N；只有 Y 的会出现在网站", 1, "yn", 8),
    ("sample_eligible", "可申请评估样机", "Y/N", 1, "yn", 8),
    ("title_en", "英文标题", "网站展示，如 400W EtherCAT AC Servo Kit, 1.27 N·m, 23-bit", 1, None, 40),
]
RULES = [
    ("key", "参数键", "程序读取，不要改", 1, None, 30),
    ("value", "取值", "研发确认后填写", 1, None, 10),
    ("unit", "单位", "", 0, None, 10),
    ("desc", "说明", "", 0, None, 60),
    ("owner", "确认人", "", 0, None, 10),
]
XREF = [
    ("competitor_brand", "竞品品牌", "如 Yaskawa / Delta / Panasonic / AutomationDirect", 1, None, 14),
    ("competitor_series", "竞品系列", "如 Σ-7 / ASDA-B3 / MINAS A6", 1, None, 12),
    ("competitor_model", "竞品电机型号", "以竞品样本为准，不要凭记忆", 1, None, 18),
    ("competitor_power_w", "竞品功率（W）", "", 1, None, 9),
    ("competitor_flange_mm", "竞品法兰（mm）", "", 1, None, 9),
    ("competitor_rated_torque_nm", "竞品额定扭矩（N·m）", "", 0, None, 10),
    ("competitor_shaft_dia_mm", "竞品轴径（mm）", "", 0, None, 9),
    ("our_motor_model", "我方对应电机", "必须在 Motors 表里存在", 1, None, 16),
    ("our_kit_sku", "我方推荐套装", "必须在 Kits 表里存在", 0, None, 20),
    ("flange_fit", "法兰/安装孔", "下拉", 1, "fit", 12),
    ("shaft_fit", "轴径/轴伸", "下拉", 1, "fit", 12),
    ("connector_fit", "接头/接线", "下拉", 1, "fit", 12),
    ("torque_fit", "扭矩/转速覆盖", "下拉", 1, "fit", 12),
    ("notes_en", "英文替换说明", "网站展示，如 Same 60mm flange and 14mm keyed shaft; requires adapter cable", 0, None, 40),
    ("source_doc", "核对依据", "竞品样本名称+页码", 1, None, 22),
    ("verified_by", "核对工程师", "", 1, None, 10),
    ("verified_date", "核对日期", "YYYY-MM-DD", 1, None, 11),
    ("status", "状态", "只有“工程已核对/已上线”会出现在网站", 1, "status", 12),
]
FILES = [
    ("model", "型号", "电机、驱动或套装型号", 1, None, 18),
    ("datasheet_pdf", "英文规格书 PDF", "下拉", 1, "file", 12),
    ("drawing_2d", "2D 图纸（PDF/DXF）", "下拉", 1, "file", 12),
    ("model_3d_step", "3D 模型（STEP）", "下拉", 1, "file", 12),
    ("config_file", "ESI / GSDML", "下拉", 1, "file", 12),
    ("manual", "使用手册", "下拉", 1, "file", 12),
    ("software", "调试软件", "下拉", 0, "file", 12),
    ("cert_files", "认证证书 / 测试报告", "下拉", 0, "file", 14),
    ("owner", "负责人", "", 1, None, 10),
    ("due", "截止日期", "YYYY-MM-DD", 1, None, 11),
]

# ---------------- 演示数据（全部为示意值，不是真实产品） ----------------
M = [  # model, series, W, V, flange, nema, inertia, Tn, Tpk, n, nmax, J, I, enc, bits, brake, Tb, Jb, shaft, type, len, ip, kg, L
    ("DEMO-M40-010", "S3", 100, "220VAC", "40", "NEMA 17 (approx.)", "Low", 0.32, 0.96, 3000, 6000, 0.051, 0.9, "Absolute-Multi", 23, "Y", 0.32, 0.054, 8, "Smooth", 25, "IP65", 0.5, 95),
    ("DEMO-M60-020", "S3", 200, "220VAC", "60", "NEMA 23 (approx.)", "Low", 0.64, 1.91, 3000, 6000, 0.18, 1.6, "Absolute-Multi", 23, "Y", 1.3, 0.21, 14, "Keyed", 30, "IP67", 0.9, 95),
    ("DEMO-M60-040", "S3", 400, "220VAC", "60", "NEMA 23 (approx.)", "Low", 1.27, 3.82, 3000, 6000, 0.29, 2.6, "Absolute-Multi", 23, "Y", 1.3, 0.32, 14, "Keyed", 30, "IP67", 1.2, 118),
    ("DEMO-M80-075", "S3", 750, "220VAC", "80", "NEMA 32 (approx.)", "Low", 2.39, 7.16, 3000, 6000, 1.26, 4.5, "Absolute-Multi", 23, "Y", 2.5, 1.36, 19, "Keyed", 35, "IP67", 2.3, 135),
    ("DEMO-M80-100", "S3", 1000, "220VAC", "80", "NEMA 32 (approx.)", "Low", 3.18, 9.55, 3000, 5000, 1.62, 5.8, "Absolute-Multi", 23, "Y", 3.2, 1.72, 19, "Keyed", 35, "IP67", 2.8, 155),
    ("DEMO-M130-150", "S3", 1500, "220VAC", "130", "—", "Medium", 7.16, 21.5, 2000, 3000, 13.4, 8.5, "Absolute-Multi", 23, "Y", 10, 14.5, 22, "Keyed", 55, "IP65", 7.5, 165),
    ("DEMO-M130-200", "S3", 2000, "220VAC", "130", "—", "Medium", 9.55, 28.6, 2000, 3000, 18.0, 11.0, "Absolute-Multi", 23, "Y", 10, 19.1, 22, "Keyed", 55, "IP65", 9.0, 190),
    ("DEMO-M130-300", "S3", 3000, "380-480VAC", "130", "—", "Medium", 14.3, 43.0, 2000, 3000, 25.0, 9.5, "Absolute-Multi", 23, "Y", 16, 26.5, 24, "Keyed", 55, "IP65", 12.0, 230),
    ("DEMO-M60-040P", "S1", 400, "220VAC", "60", "NEMA 23 (approx.)", "Low", 1.27, 3.82, 3000, 5000, 0.30, 2.6, "Incremental", 17, "N", None, None, 14, "Keyed", 30, "IP65", 1.2, 118),
]
D = [  # model, series, comm, Pmax, V, phase, I, Ipk, sto, enc, io, dim, kg, cfg, UL, CE, price
    ("DEMO-D1-04", "S1", "Pulse", 400, "220VAC", "1/3", 2.8, 8.4, "N", "17-bit incremental", "8DI/4DO", "40×170×150", 0.8, "—", "申请中", "已取得", 189),
    ("DEMO-D3E-04", "S3", "EtherCAT", 400, "220VAC", "1/3", 2.8, 9.0, "Y", "17/23-bit absolute", "6DI/3DO", "40×170×160", 0.9, "ESI", "申请中", "已取得", 259),
    ("DEMO-D3E-10", "S3", "EtherCAT", 1000, "220VAC", "1/3", 6.0, 18.0, "Y", "17/23-bit absolute", "6DI/3DO", "50×170×180", 1.2, "ESI", "申请中", "已取得", 329),
    ("DEMO-D3E-20", "S3", "EtherCAT", 2000, "220VAC", "3", 12.0, 33.0, "Y", "17/23-bit absolute", "6DI/3DO", "75×180×200", 1.9, "ESI", "申请中", "已取得", 459),
    ("DEMO-D3E-30", "S3", "EtherCAT", 3000, "380-480VAC", "3", 10.0, 28.0, "Y", "17/23-bit absolute", "6DI/3DO", "90×200×210", 2.6, "ESI", "申请中", "已取得", 589),
    ("DEMO-D3P-04", "S3", "PROFINET", 400, "220VAC", "1/3", 2.8, 9.0, "Y", "17/23-bit absolute", "6DI/3DO", "40×170×160", 0.9, "GSDML", "申请中", "已取得", 289),
    ("DEMO-D3P-10", "S3", "PROFINET", 1000, "220VAC", "1/3", 6.0, 18.0, "Y", "17/23-bit absolute", "6DI/3DO", "50×170×180", 1.2, "GSDML", "申请中", "已取得", 359),
]
C = [
    ("DEMO-CP-S-03", "Power", 3, "N", "40/60/80", "Molex", 19), ("DEMO-CP-S-05", "Power", 5, "N", "40/60/80", "Molex", 25),
    ("DEMO-CP-F-10", "Power", 10, "Y", "40/60/80", "Molex", 59), ("DEMO-CE-S-03", "Encoder", 3, "N", "40/60/80", "Molex", 22),
    ("DEMO-CE-S-05", "Encoder", 5, "N", "40/60/80", "Molex", 28), ("DEMO-CE-F-10", "Encoder", 10, "Y", "40/60/80", "Molex", 65),
    ("DEMO-CP-L-03", "Power", 3, "N", "130", "M23", 39), ("DEMO-CE-L-03", "Encoder", 3, "N", "130", "M23", 35),
]
K = [  # sku, motor, drive, brake, pc, ec, role, price, p10, p50, stock, lead, launch, sample, title
    ("DEMO-K3E-010", "DEMO-M40-010", "DEMO-D3E-04", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 349, None, None, "In stock (US)", 2, "Y", "Y", "100W EtherCAT AC Servo Kit, 0.32 N·m, 23-bit absolute, 40 mm"),
    ("DEMO-K3E-020", "DEMO-M60-020", "DEMO-D3E-04", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 389, None, None, "In stock (US)", 2, "Y", "Y", "200W EtherCAT AC Servo Kit, 0.64 N·m, 23-bit absolute, 60 mm"),
    ("DEMO-K3E-040", "DEMO-M60-040", "DEMO-D3E-04", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 429, 395, 365, "In stock (US)", 2, "Y", "Y", "400W EtherCAT AC Servo Kit, 1.27 N·m, 23-bit absolute, 60 mm"),
    ("DEMO-K3E-040B", "DEMO-M60-040", "DEMO-D3E-04", "Y", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 479, None, None, "In stock (US)", 2, "Y", "Y", "400W EtherCAT AC Servo Kit with Brake, 1.27 N·m, 23-bit, 60 mm"),
    ("DEMO-K3E-075", "DEMO-M80-075", "DEMO-D3E-10", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 529, 487, 450, "In stock (US)", 2, "Y", "Y", "750W EtherCAT AC Servo Kit, 2.39 N·m, 23-bit absolute, 80 mm"),
    ("DEMO-K3E-100", "DEMO-M80-100", "DEMO-D3E-10", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 589, None, None, "In stock (US)", 2, "Y", "Y", "1kW EtherCAT AC Servo Kit, 3.18 N·m, 23-bit absolute, 80 mm"),
    ("DEMO-K3E-200", "DEMO-M130-200", "DEMO-D3E-20", "N", "DEMO-CP-L-03", "DEMO-CE-L-03", "形象款", 890, None, None, "Ships from China", 21, "Y", "Y", "2kW EtherCAT AC Servo Kit, 9.55 N·m, 23-bit absolute, 130 mm"),
    ("DEMO-K3P-040", "DEMO-M60-040", "DEMO-D3P-04", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "利润款", 459, None, None, "In stock (US)", 2, "Y", "Y", "400W PROFINET AC Servo Kit, 1.27 N·m, 23-bit absolute, 60 mm"),
    ("DEMO-K1-040", "DEMO-M60-040P", "DEMO-D1-04", "N", "DEMO-CP-S-03", "DEMO-CE-S-03", "引流款", 249, None, None, "In stock (US)", 2, "Y", "N", "400W Pulse/Modbus AC Servo Kit, 1.27 N·m, 17-bit, 60 mm"),
    ("DEMO-K3E-150", "DEMO-M130-150", "DEMO-D3E-20", "N", "DEMO-CP-L-03", "DEMO-CE-L-03", "形象款", 790, None, None, "Not launched", 30, "N", "N", "1.5kW EtherCAT AC Servo Kit, 7.16 N·m, 23-bit absolute, 130 mm"),
]
R = [
    ("inertia_ratio_recommended_max", 10, "倍", "负载惯量 ÷ 转子惯量 ≤ 此值：判定“推荐”", "研发"),
    ("inertia_ratio_allowed_max", 30, "倍", "超过推荐值但 ≤ 此值：判定“可用，需调参”；超过则“不推荐”", "研发"),
    ("peak_torque_utilization_max", 0.8, "比例", "所需峰值扭矩 ≤ 电机峰值扭矩 × 此值", "研发"),
    ("rms_torque_utilization_max", 0.85, "比例", "所需有效扭矩（RMS）≤ 电机额定扭矩 × 此值", "研发"),
    ("speed_utilization_max", 0.95, "比例", "所需最高转速 ≤ 电机最高转速 × 此值", "研发"),
    ("default_screw_efficiency", 0.9, "比例", "滚珠丝杠默认效率", "研发"),
    ("default_belt_efficiency", 0.95, "比例", "同步带默认效率", "研发"),
    ("default_gear_efficiency", 0.9, "比例", "减速机默认效率", "研发"),
    ("default_friction_coeff", 0.05, "—", "直线导轨默认摩擦系数", "研发"),
    ("steel_density", 7850, "kg/m³", "计算丝杠惯量用", "研发"),
    ("discount_10_49", 0.08, "比例", "Kits 表未填阶梯价时的默认折扣", "定价委员会"),
    ("discount_50_199", 0.15, "比例", "同上", "定价委员会"),
    ("results_shown", 3, "个", "选型结果最多显示几个推荐型号", "市场"),
]
X = [  # 演示：竞品型号来自公开命名规则，规格和兼容性均“待核对”
    ("Yaskawa", "Σ-7 (SGM7J)", "SGM7J-02A", 200, 60, 0.637, 14, "DEMO-M60-020", "DEMO-K3E-020"),
    ("Yaskawa", "Σ-7 (SGM7J)", "SGM7J-04A", 400, 60, 1.27, 14, "DEMO-M60-040", "DEMO-K3E-040"),
    ("Yaskawa", "Σ-7 (SGM7J)", "SGM7J-08A", 750, 80, 2.39, 19, "DEMO-M80-075", "DEMO-K3E-075"),
    ("Delta", "ASDA-B3 (ECM-B3M)", "ECM-B3M-C20604", 400, 60, 1.27, 14, "DEMO-M60-040", "DEMO-K3E-040"),
    ("Delta", "ASDA-B3 (ECM-B3M)", "ECM-B3M-C20807", 750, 80, 2.39, 19, "DEMO-M80-075", "DEMO-K3E-075"),
    ("Panasonic", "MINAS A6 (MSMF)", "MSMF042", 400, 60, 1.27, 14, "DEMO-M60-040", "DEMO-K3E-040"),
    ("Panasonic", "MINAS A6 (MSMF)", "MSMF082", 750, 80, 2.39, 19, "DEMO-M80-075", "DEMO-K3E-075"),
    ("Mitsubishi", "MELSERVO-J4 (HG-KR)", "HG-KR43", 400, 60, 1.3, 14, "DEMO-M60-040", "DEMO-K3E-040"),
    ("AutomationDirect", "SureServo2", "SV2L-404N", 400, 60, 1.27, 14, "DEMO-M60-040", "DEMO-K3E-040"),
]


def header(ws, cols, title):
    ws.append([c[0] for c in cols])
    ws.append([c[1] for c in cols])
    ws.append([c[2] for c in cols])
    for i, c in enumerate(cols, 1):
        k, n, d = ws.cell(1, i), ws.cell(2, i), ws.cell(3, i)
        k.font = Font(color="FFFFFF", bold=True, size=9)
        k.fill = PatternFill("solid", fgColor=NAVY)
        n.font = Font(bold=True)
        n.fill = PatternFill("solid", fgColor=ORANGE if c[3] else GREY)
        d.font = Font(italic=True, color="666666", size=9)
        d.fill = PatternFill("solid", fgColor=GREY)
        for cell in (k, n, d):
            cell.alignment = Alignment(wrap_text=True, vertical="center")
            cell.border = BORDER
        ws.column_dimensions[get_column_letter(i)].width = c[5]
        if c[3]:
            n.comment = Comment("必填", "template")
    ws.row_dimensions[2].height = 32
    ws.row_dimensions[3].height = 42
    ws.freeze_panes = "B4"
    ws.sheet_properties.tabColor = "0B5CFF"
    # 下拉
    for i, c in enumerate(cols, 1):
        if c[4]:
            col = get_column_letter(i)
            n = len(LISTS[c[4]])
            ref = f"Lists!${get_column_letter(list(LISTS).index(c[4]) + 1)}$2:${get_column_letter(list(LISTS).index(c[4]) + 1)}${n + 1}"
            dv = DataValidation(type="list", formula1=ref, allow_blank=not c[3], showErrorMessage=True,
                                errorTitle="请从下拉选择", error=f"可选值：{' / '.join(LISTS[c[4]])}")
            dv.add(f"{col}4:{col}500")
            ws.add_data_validation(dv)


def rows(ws, data):
    if BLANK:
        return
    for r in data:
        ws.append(list(r))
        for cell in ws[ws.max_row]:
            cell.fill = PatternFill("solid", fgColor=DEMO)
            cell.border = BORDER


wb = Workbook()
# ---- 说明页 ----
ws = wb.active
ws.title = "填写说明"
ws.sheet_properties.tabColor = "FF7A1A"
lines = [
    ("产品参数表与竞品替换对照表（美国官网与选型器数据源）", "t"),
    ("版本：v0.1 模板｜用途：英文官网产品页、选型器、竞品替换查询、下载中心。网站数据由本表自动生成，请勿另建副本。", ""),
    ("", ""),
    ("一、填写规则", "h"),
    ("1. 第 1 行是程序读取的字段键，不要修改、删除或调换顺序；第 2 行是中文名称，第 3 行是说明。从第 4 行开始填写。", ""),
    ("2. 橙色表头为必填；带下拉的列只能从下拉中选择。数字列只填数字，不要带单位。", ""),
    ("3. 浅黄色行是【演示数据】（型号以 DEMO- 开头），不是真实产品，请整行删除后填写真实数据。", ""),
    ("4. 型号在各表之间互相引用（Kits → Motors/Drives/Cables；Cross_Reference → Motors/Kits），请保持完全一致。", ""),
    ("5. 转子惯量、扭矩、最高转速直接决定选型结果，必须以样本/测试值为准，填好后由第二位工程师复核。", ""),
    ("6. 合规：UL 证书未取得前，ul_status 只能填“申请中/未申请”，网站不会显示 UL 字样。", ""),
    ("", ""),
    ("二、各工作表与负责人", "h"),
    ("Motors 电机参数 —— 研发（电机）", ""),
    ("Drives 驱动参数 —— 研发（驱动）", ""),
    ("Cables 线缆 —— 研发 / 供应链", ""),
    ("Kits 套装 SKU、价格、库存、首批上线 —— 产品经理 + 定价委员会 + 供应链", ""),
    ("Selector_Rules 选型判定阈值与默认值 —— 研发负责人确认", ""),
    ("Cross_Reference 竞品替换对照（Yaskawa / Delta / Panasonic / Mitsubishi / AutomationDirect 等）—— 应用工程师，必须对照竞品官方样本逐项核对", ""),
    ("Files_Checklist 每个型号的下载资料准备进度 —— 产品经理", ""),
    ("", ""),
    ("三、竞品替换对照的特别要求", "h"),
    ("· 每一行都要写“核对依据”（竞品样本名称 + 页码）、核对工程师和日期；只有状态为“工程已核对/已上线”的行会出现在网站。", ""),
    ("· 四项兼容性（法兰、轴、接头、扭矩转速）任何一项是“不兼容”时，网站会显示为“近似替代”，不会写“drop-in replacement”。", ""),
    ("· 引用竞品型号属于比较广告，表述须真实、可证实（FTC）；不要使用竞品商标图形。", ""),
    ("", ""),
    ("四、交付", "h"),
    ("填写完成后交给市场部，运行 tools/xlsx_to_json.py 校验并生成网站数据；校验报错会列出表名、行号和原因。", ""),
    ("建议截止：产品参数 2 周内；竞品对照首批 20 行 3 周内；下载资料 6 周内。", ""),
]
for text, kind in lines:
    ws.append([text])
    c = ws.cell(ws.max_row, 1)
    if kind == "t":
        c.font = Font(bold=True, size=15, color=NAVY)
    elif kind == "h":
        c.font = Font(bold=True, size=12, color="0B5CFF")
    c.alignment = Alignment(wrap_text=True, vertical="top")
ws.column_dimensions["A"].width = 120

for name, cols, data in [
    ("Motors", MOTORS, M), ("Drives", DRIVES, D), ("Cables", CABLES, C), ("Kits", KITS, K)]:
    s = wb.create_sheet(name)
    header(s, cols, name)
    if name == "Motors":  # 演示电机：UL 申请中、CE 已取得
        data = [r + ("申请中", "已取得", "") for r in data]
    rows(s, [tuple("" if v is None else v for v in r) for r in data])

s = wb.create_sheet("Selector_Rules")
header(s, RULES, "rules")
for r in R:  # 规则表即使是空模板也保留默认值，便于研发修改
    s.append(list(r))
    for cell in s[s.max_row]:
        cell.border = BORDER

s = wb.create_sheet("Cross_Reference")
header(s, XREF, "xref")
rows(s, [(b, se, m, w, f, t, sh, om, ok, "待核对", "待核对", "待核对", "待核对", "", "（填写竞品样本名称+页码）", "", "", "演示-未核对")
         for b, se, m, w, f, t, sh, om, ok in X])

s = wb.create_sheet("Files_Checklist")
header(s, FILES, "files")
rows(s, [(k[0], "待制作", "待制作", "待制作", "待制作" if "K3" in k[0] else "不适用", "待制作", "待制作", "待制作", "产品经理", "")
         for k in K if k[12] == "Y"])

s = wb.create_sheet("Lists")
for i, (k, vals) in enumerate(LISTS.items(), 1):
    s.cell(1, i, k).font = Font(bold=True)
    for j, v in enumerate(vals, 2):
        s.cell(j, i, v)
s.sheet_state = "hidden"

wb.save(OUT)
print("saved", OUT, "blank" if BLANK else "with demo rows")
