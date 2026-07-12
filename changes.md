# 优化改动记录

文件：`index.html`（日历黄历详情页）
日期：2026-05-30

---

## 一、CSS 统一规范

### 1. 卡片样式统一

将 `.duty12-item`（建除十二神）和 `.shichen-cell`（时辰黄黑道）合并为同一套基础样式：

- 统一 `padding: 0.5rem 0.2rem`、`min-height: 3rem`、`border-radius: var(--radius-md)`
- 统一边框 `1.5px solid var(--border-ink)`（之前是 `transparent`，吉凶卡片边界感不同）
- 吉/黄道卡片共享 `#fdf8ee` + `#dcc89a`
- 凶/黑道卡片共享 `#f5f3ef` + `#d5cfc5`

### 2. 选中态强化

`.active` 卡片从仅 `rgba` 背景改为：

- `linear-gradient` 渐变背景
- `2px` 加粗边框 + `box-shadow` 发光
- `transform: scale(1.05)` 微放大，与普通卡片拉开区分度

### 3. 文字层级规范

- `.section h4` 标题：`0.8rem`、`line-height: 1.5`、`letter-spacing: 0.08em`
- `.duty12-desc`：新增独立 CSS 规则（之前无定义），`var(--text-sm)`、上边框分隔、`margin-top: 0.5rem`
- 副标题（日黄道神）：`0.6rem`、`opacity: 0.75`、去掉上边框，视觉退后

### 4. 间距统一

- 网格 `gap: 8px`（之前 `0.25rem`≈4px 偏紧）
- `.section` 容器统一 `padding: 0.8rem 1rem`、`border-radius: var(--radius-md)`
- `.full-detail-body` 左右 padding `1.2rem`（桌面端 `1.4rem`）
- `.sticky-date-info` 左右 padding `1.2rem`
- 移除各处 inline `style` 覆盖，全部走 CSS 规范

### 5. 清理

- 删除 duplicate 的 `body.dark .sticky-date-info` 规则

---

## 二、九星改为 3×3 表格

### CSS 新增

```css
.ninestar-grid     — 3列网格，gap: 8px
.ninestar-item     — 卡片基础样式
.ninestar-item.good — 吉星绿色系 (#eef7f3 / #a8d5c2)
.ninestar-item.bad  — 凶星红色系 (#fdf2f0 / #e8b4b0)
.ninestar-item.active — 高亮态：2.5px 边框 + box-shadow + scale(1.06) + 渐变背景
.ninestar-item .ns-label — "★ 今日" 标签
```

### JS 改动

- `getNineStar2()` 返回值新增 `idx` 字段（0-8），用于匹配当前星在表格中的位置
- 九星 section 从单行文字改为 3×3 网格，遍历 `NINE_STARS2` 全部 9 颗星
- 当日之星加 `.active` 类高亮，底部显示描述文字（`.duty12-desc`）

---

## 三、神煞改为全量表格展示

### CSS 新增

```css
.shensha-section       — 外层容器
.shensha-group-title   — 分组标题（"吉神"/"凶神"），带虚线分隔
.shensha-group-title.good-title — 绿色
.shensha-group-title.bad-title  — 红色
.shensha-grid          — 3列网格，gap: 5px
.shensha-item          — 卡片基础样式，0.65rem 字号
.shensha-item.inactive — 灰色淡化
.shensha-item.active-good — 绿色高亮 + 粗体 + 微投影
.shensha-item.active-bad  — 红色高亮 + 粗体 + 微投影
```

### JS 改动

- 吉神列表 27 项（日祿、天乙貴人、喜神、紅鸞、天喜、天德、月德、三合、驛馬、歲德 等）
- 凶神列表 26 项（五不遇、劫煞、災煞、月煞、月刑、月害、歲破、白虎、吊客、病符 等）
- 同时包含简繁两种写法（如 `天乙貴人` / `天乙贵人`），通过 `uniqueName()` 去重，优先显示繁体
- 遍历全部神煞名称，用 `gSet` / `bSet` 判断是否命中当日，命中则高亮

---

## 四、响应式适配

```css
@media (max-width: 400px) {
  .shichen-table, .duty12-strip { grid-template-columns: repeat(4, 1fr); }
  .shensha-grid { grid-template-columns: repeat(2, 1fr); }
  .ninestar-grid { grid-template-columns: repeat(3, 1fr); }
}
```

---

## 五、JS 内联样式清理

| 位置 | 改动 |
|------|------|
| 时辰值神 section | 移除 `style="text-align:center;"` |
| 日值神 section | 移除 `style="text-align:center;"` |
| 日值神副标题 | `margin-top:-0.15rem` → `0.15rem`，加 `opacity:0.75;border-top:none` |
| 九星 section | 从单行 `<p style="...">` 改为网格渲染 |
| 神煞 section | 从 `flex` 双列布局改为 3 列网格 |
| 五行分布 section | 移除 `style="padding:0.3rem 0.5rem;"`，字号改用 CSS 变量 |
| 日期信息区 | padding 从 `0.3rem 0.5rem` → `0.4rem 0.6rem`，字号改用 `var(--text-sm)` |
