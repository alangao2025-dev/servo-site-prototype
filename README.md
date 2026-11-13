# 英文官网与选型器原型（演示数据）

## 目录
- `data/产品数据模板_空白版.xlsx`：发给研发、产品、定价填写的模板
- `data/产品数据模板_演示数据.xlsx`：带演示数据的版本（行以 DEMO- 开头，浅黄色），用于理解每一列怎么填
- `tools/make_template.py`：重新生成模板（`--blank` 为空白版）
- `tools/xlsx_to_json.py`：校验 Excel 并生成网站数据 `public/data/products.json`
- `public/`：网站本体（纯静态，无需编译）
  - `assets/config.js`：品牌名、联系方式、质保年限等，**定下来后只改这里**
  - `assets/sizing.js`：选型计算（丝杠、同步带、转盘、通用旋转负载）
  - `assets/rfq.js`：询价单与表单（原型不联网提交，只显示将发往 HubSpot 的数据）

## 换成真实数据
```bash
# 1. 研发填好 Excel 后校验并生成数据（有错误会列出“表名 行号 字段 原因”，不会覆盖旧数据）
python3 -I tools/xlsx_to_json.py data/产品数据_v1.xlsx public/data/products.json
# 原型演示阶段如需显示未核对的竞品对照，加 --include-unverified；正式上线不要加
# 2. 发布
bash ~/.agents/skills/site-builder/scripts/publish.sh -m "update product data" .
```

## 校验规则（xlsx_to_json.py）
- 必填项、数字列、型号唯一
- 峰值扭矩 ≥ 额定扭矩，最高转速 ≥ 额定转速
- 套装引用的电机、驱动、线缆必须存在；电机功率不超过驱动上限；带刹车套装的电机必须有刹车选项
- 竞品对照：标为“工程已核对”的行必须有核对依据、工程师、日期；未核对的行默认不发布
- UL：电机和驱动都“已取得”才显示 UL Recognized，任一“申请中”显示 UL pending
- 没有 `launch_batch = Y` 的套装时报错

## 选型计算口径
- 梯形速度曲线：加速、减速时间各占移动时间的 10–33%
- 峰值扭矩 T_acc = (J_负载折算 + J_转子)·α + T_负载；有效扭矩按加速、匀速、减速、停留（竖直轴含保持扭矩）加权求均方根
- 判定：峰值 ≤ 电机峰值 × 80%，有效值 ≤ 额定 × 85%，转速 ≤ 最高 × 95%，惯量比 ≤ 10 推荐 / ≤ 30 可用（高动态时 ≤ 5 / ≤ 10）
- 以上阈值都在 Excel 的 Selector_Rules 表，研发确认后修改即可，不用改代码
