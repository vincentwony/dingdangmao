# 紫微斗数单宫面板组件

## 产物
- `web/ziwei-palace-panel.html`：独立可复用组件。
- `ziwei_palace_panel_preview.png`：迁移宫渲染预览。

## 结构还原
1. 外层白色边框容器（黑底）。
2. 顶部星耀网格：7 列 × 3 行，严格按附图配色：
   - 行1：天天（红）、地地（蓝）、红（红）、大、龙
   - 行2：相（红）、钺（紫）、劫、空、鸾（蓝）、耗、德
   - 行3：得、旺、不、庙、旺、陷（灰）
3. 容器正中：流年 / 小限 / 加粗年龄范围。
4. 左侧竖排：飞廉、亡神、龙德。
5. 右侧竖排：长生、乙、巳。
6. 底部居中红色：迁移宫。

## 使用方式
打开 `web/ziwei-palace-panel.html`，修改 `<script>` 中的 `palaceData` 对象即可切换为其他宫位（命宫、财帛宫等），无需改动 CSS。

## 技术要点
- 全部定位采用 `absolute` + `flex`。
- 左右竖排使用 `writing-mode: vertical-rl; text-orientation: upright;`。
- 顶部星耀用 flex 行/列快速对齐，配色通过 `c-red`、`c-blue`、`c-purple`、`c-gray` 类控制。
