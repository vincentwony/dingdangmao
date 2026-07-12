# 《天地玄黄·日月更替》UI 升级指导方案

> **版本**：v1.0  
> **基准**：当前 v4.0 代码审计结果  
> **目标**：对标 2025-2026 专业 Web 应用 UI 趋势，输出可落地的改进清单  
> **原则**：不改核心历算逻辑，仅优化界面层

---

## 一、现状审计摘要

### 1.1 代码质量扫描

| 指标 | 当前值 | 目标值 | 优先级 |
|------|--------|--------|--------|
| `aria-*` 属性数 | **0** | ≥50 | 🔴 P0 |
| `role` 属性数 | **0** | ≥10 | 🔴 P0 |
| `tabindex` 使用 | **0** | ≥15 | 🔴 P0 |
| `focus-visible` 使用 | **0** | 全交互元素 | 🔴 P0 |
| `alert()` 调用 | **36** | 0 | 🔴 P0 |
| 内联 `onclick` | **78** | 0 | 🟡 P1 |
| 内联 `style` | **260** | <30 | 🟡 P1 |
| `innerHTML` 赋值 | **62** | <10 | 🟡 P1 |
| 最小字号 | **6px** | ≥12px | 🔴 P0 |
| `line-height:100` | 5处（bug） | 删除 | 🔴 P0 |
| Container Query | **0** | 关键组件 | 🟢 P2 |
| `clamp()` 流式字号 | **0** | 全局 | 🟡 P1 |
| Logical Properties | **0** | 全局替换 | 🟢 P2 |
| `color-mix()` | **0** | 主题色派生 | 🟢 P2 |
| `IntersectionObserver` | **0** | 按需加载 | 🟡 P1 |
| `requestAnimationFrame` | **0** | 动画/滚动 | 🟡 P1 |
| `matchMedia` | **0** | 主题/动效 | 🟡 P1 |
| Service Worker | **0** | 离线缓存 | 🟢 P2 |

### 1.2 十大核心问题

1. **零无障碍支持** — 屏幕阅读器完全无法使用
2. **alert() 泛滥** — 36 处原生弹窗，破坏体验流
3. **字号过小** — 最小 6px，大量 9-11px，移动端不可读
4. **line-height:100** — 明显 bug（应为 1.0 或 100%）
5. **内联样式 260 处** — 维护困难，主题切换不一致
6. **无焦点管理** — 键盘用户无法操作
7. **无手势支持** — 移动端无左右滑动切换月份
8. **无骨架屏** — 数据加载时白屏
9. **无 View Transitions** — 页面切换生硬
10. **无现代 CSS 特性** — 容器查询、:has()、@layer 全部缺失

---

## 二、无障碍（Accessibility）— P0 最高优先级

### 2.1 ARIA 地标角色

```html
<!-- 当前：无语义 -->
<div class="top-nav">...</div>
<div class="wrap">...</div>

<!-- 升级后 -->
<header role="banner" aria-label="天地玄黄日历">
  <nav role="navigation" aria-label="主导航">
    <button role="tab" aria-selected="true" aria-controls="panel-calendar" id="tab-calendar">
      萬历
    </button>
    <!-- ... -->
  </nav>
</header>

<main role="main" aria-label="日历内容">
  <section id="panel-calendar" role="tabpanel" aria-labelledby="tab-calendar">
    <!-- 日历区 -->
  </section>
  <section id="panel-bazi" role="tabpanel" aria-labelledby="tab-bazi" hidden>
    <!-- 八字区 -->
  </section>
</main>

<footer role="contentinfo" aria-label="版权与来源信息">
  <!-- 页脚 -->
</footer>
```

### 2.2 卡片折叠语义

```html
<!-- 当前：div + onclick -->
<div class="card-header" onclick="toggleCardCollapse(this)">
  <span><i class="ti ti-leaf"></i> 节气信息</span>
  <i class="ti ti-chevron-down card-collapse-icon"></i>
</div>

<!-- 升级后：details/summary 原生折叠 -->
<details class="card" open>
  <summary class="card-header">
    <i class="ti ti-leaf" aria-hidden="true"></i>
    <span>节气信息</span>
  </summary>
  <div class="card-body">
    <!-- 内容 -->
  </div>
</details>
```

### 2.3 日历表格语义

```html
<!-- 当前：无语义的 table -->
<table class="cal-col">
  <tr><td class="cal-th">日</td>...</tr>
  <tr><td>1</td>...</tr>
</table>

<!-- 升级后 -->
<table class="cal-col" role="grid" aria-label="2026年5月 农历日历">
  <thead>
    <tr>
      <th scope="col" abbr="日">日曜</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td role="gridcell" tabindex="0" aria-label="5月1日 星期四 农历四月初四" aria-selected="false">
        <span class="solar-num">1</span>
        <span class="lr">初四</span>
      </td>
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

### 2.4 焦点管理

```css
/* 当前：无焦点样式 */
/* 升级后 */
:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 仅键盘操作时显示焦点，鼠标点击不显示 */
:focus:not(:focus-visible) {
  outline: none;
}

/* 日历格子焦点 */
.cal-col td:focus-visible {
  box-shadow: inset 0 0 0 2px var(--color-gold-bright);
  background: rgba(201, 169, 110, 0.15);
}
```

### 2.5 键盘导航

```javascript
// 日历表格键盘导航
function setupCalendarKeyboard() {
  const grid = document.querySelector('.cal-col');
  grid.addEventListener('keydown', (e) => {
    const current = document.activeElement;
    if (!current.matches('td[role="gridcell"]')) return;

    const cells = [...grid.querySelectorAll('td[role="gridcell"]')];
    const idx = cells.indexOf(current);
    let target;

    switch (e.key) {
      case 'ArrowRight':  target = cells[idx + 1]; break;
      case 'ArrowLeft':   target = cells[idx - 1]; break;
      case 'ArrowDown':   target = cells[idx + 7]; break;
      case 'ArrowUp':     target = cells[idx - 7]; break;
      case 'Home':        target = cells[0]; break;
      case 'End':         target = cells[cells.length - 1]; break;
      case 'Enter':
      case ' ':
        current.click();
        e.preventDefault();
        return;
      default: return;
    }

    if (target) {
      e.preventDefault();
      target.focus();
      target.setAttribute('tabindex', '0');
      current.setAttribute('tabindex', '-1');
    }
  });
}
```

### 2.6 无障碍文案

```html
<!-- 日期详情气泡 -->
<div id="Cal_pan" role="tooltip" aria-live="polite">
  <div id="Cal_pan_in">
    <!-- 内容由 JS 动态填充 -->
  </div>
</div>

<!-- 跳过链接（屏幕阅读器专用） -->
<a href="#main-content" class="sr-only sr-only-focusable">
  跳转到主要内容
</a>
```

```css
/* 屏幕阅读器专用 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 三、消灭 alert() — P0

### 3.1 替代方案：Toast 通知

```css
/* Toast 容器 */
.toast-container {
  position: fixed;
  top: calc(var(--nav-height) + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: toast-in 0.3s ease, toast-out 0.3s ease 2.7s forwards;
  max-width: 360px;
  text-align: center;
}

.toast--info    { background: #5A8FA8; }
.toast--warn    { background: #D98A20; }
.toast--error   { background: #DC2626; }
.toast--success { background: #5D8A7C; }

@keyframes toast-in {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes toast-out {
  from { opacity: 1; }
  to   { opacity: 0; transform: translateY(-8px); }
}
```

```javascript
// Toast API
function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (!container.children.length) container.remove();
  }, duration);
}

// 替换 alert() 示例
// 原: alert('本年没有闰' + m + '月')
// 新: showToast('本年没有闰' + m + '月', 'warn')
```

### 3.2 替代方案：确认对话框

```html
<!-- 替代 confirm() 的自定义确认框 -->
<dialog id="confirmDialog" class="confirm-dialog" aria-labelledby="confirmTitle" aria-describedby="confirmBody">
  <div class="confirm-dialog-inner">
    <h2 id="confirmTitle" class="confirm-title">确认操作</h2>
    <p id="confirmBody" class="confirm-body">确定要执行此操作吗？</p>
    <div class="confirm-actions">
      <button class="confirm-cancel" value="cancel">取消</button>
      <button class="confirm-ok" value="confirm">确定</button>
    </div>
  </div>
</dialog>
```

```javascript
// 原生 <dialog> 替代 confirm()
function showConfirm(message, title = '确认') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmBody').textContent = message;

    dialog.showModal();

    dialog.querySelector('.confirm-ok').onclick = () => {
      dialog.close();
      resolve(true);
    };
    dialog.querySelector('.confirm-cancel').onclick = () => {
      dialog.close();
      resolve(false);
    };
  });
}
```

### 3.3 全部 36 处 alert() 替换清单

| 行号 | 原文 | 替换为 |
|------|------|--------|
| 6383 | `alert('本年没有闰'+m+'月')` | `showToast('本年没有闰'+m+'月', 'warn')` |
| 6399 | `alert("超出范围"+days+'天')` | `showToast('超出范围'+days+'天', 'warn')` |
| 6412 | `alert("不存在这个"+...)` | `showToast('不存在'+...+'柱', 'error')` |
| 7457 | `alert('通用纪法的公元前...')` | `showToast('公元前纪法从B.C.1年开始', 'info')` |
| 7460 | `alert('不得小于B.C. 4713')` | `showToast('不得小于B.C. 4713', 'error')` |
| 7461 | `alert('超过9999年...')` | `showToast('超过9999年计算不准', 'warn')` |
| 9004 | `alert('无法获取数据')` | `showToast('无法获取'+y+'年'+m+'月'+d+'日数据', 'error')` |
| 9721 | `alert('到顶了！')` | `showToast('已是最早记录', 'info', 1500)` |
| 9783-9785 | 日期范围校验 | `showToast(...)` |
| 10323 | `alert('请先排盘')` | `showToast('请先在八字排盘中填入信息', 'warn')` |
| ... | 其余 26 处 | 同理替换 |

---

## 四、字号与排版 — P0

### 4.1 字号下限

```css
/* 当前：最小 6px，大量 9-11px */
/* 升级后：最小 12px，使用 clamp() 流式缩放 */

:root {
  /* 流式字号体系 — 基于视口宽度在 320px~1200px 之间平滑缩放 */
  --text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem);  /* 12~13px */
  --text-sm:   clamp(0.8125rem, 0.75rem + 0.3vw, 0.875rem);  /* 13~14px */
  --text-base: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);       /* 14~16px */
  --text-lg:   clamp(1rem, 0.9rem + 0.5vw, 1.125rem);        /* 16~18px */
  --text-xl:   clamp(1.125rem, 1rem + 0.6vw, 1.25rem);       /* 18~20px */
  --text-2xl:  clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);      /* 20~24px */
  --text-3xl:  clamp(1.5rem, 1.3rem + 1vw, 1.875rem);        /* 24~30px */
}
```

### 4.2 全局替换

```css
/* 当前代码中的字号 → 升级后 */
.cal-col .solar-num  { font-size: var(--text-lg); }   /* 原 1.05rem */
.cal-col .gz         { font-size: var(--text-xs); }   /* 原 0.6rem → 过小 */
.cal-col .lr         { font-size: var(--text-xs); }   /* 原 0.65rem → 过小 */
.cal-col .ns         { font-size: var(--text-xs); }   /* 原 0.55rem → 过小 */
.cal-col .xiu        { font-size: var(--text-xs); }   /* 原 0.55rem → 过小 */
.cal-col .jc         { font-size: var(--text-xs); }   /* 原 0.5rem → 过小 */
.bt-shensha          { font-size: var(--text-xs); }   /* 原 10px → 过小 */
.bt-hidden-star      { font-size: var(--text-sm); }   /* 原 11px */
```

### 4.3 修复 line-height:100 bug

```css
/* 当前 5 处 line-height:100（明显 bug，应为 1.0 或 100%） */
/* 全局搜索替换 line-height:100 → line-height:1.5 */
```

---

## 五、弹窗/面板系统重构 — P1

### 5.1 日期详情面板

```html
<!-- 当前：绝对定位的浮动气泡（pointer-events:none，无法交互） -->
<div id="Cal_pan" style="display:none;">
  <div id="Cal_pan_in">...</div>
</div>

<!-- 升级后：Bottom Sheet（移动端）/ Sidebar（桌面端） -->
<div class="detail-panel" id="detailPanel" role="dialog" aria-label="日期详情" aria-hidden="true">
  <div class="detail-panel-scrim" aria-hidden="true"></div>
  <div class="detail-panel-content">
    <div class="detail-panel-handle" aria-hidden="true"></div>
    <button class="detail-panel-close" aria-label="关闭详情">
      <i class="ti ti-x"></i>
    </button>
    <div class="detail-panel-body">
      <!-- 日期详情内容 -->
    </div>
  </div>
</div>
```

```css
/* Bottom Sheet — 移动端 */
.detail-panel {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.detail-panel.open {
  pointer-events: auto;
  opacity: 1;
}

.detail-panel-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.detail-panel-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 85vh;
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  padding: 0 16px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.detail-panel.open .detail-panel-content {
  transform: translateY(0);
}

.detail-panel-handle {
  width: 36px;
  height: 4px;
  background: var(--border-gold);
  border-radius: 2px;
  margin: 12px auto 8px;
}

/* 桌面端：侧边栏 */
@media (min-width: 769px) {
  .detail-panel-content {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    max-height: none;
    width: 380px;
    border-radius: 16px 0 0 16px;
    transform: translateX(100%);
  }

  .detail-panel.open .detail-panel-content {
    transform: translateX(0);
  }
}
```

### 5.2 设置面板

```html
<!-- 当前：直接嵌入页面的 div -->
<!-- 升级后：使用原生 <dialog> -->
<dialog id="settingsDialog" class="settings-dialog" aria-label="设置">
  <div class="settings-dialog-inner">
    <header class="settings-header">
      <h2>设置</h2>
      <button class="settings-close" aria-label="关闭设置">
        <i class="ti ti-x"></i>
      </button>
    </header>
    <div class="settings-body">
      <!-- 设置内容 -->
    </div>
  </div>
</dialog>
```

---

## 六、现代 CSS 升级 — P1

### 6.1 流式布局字号（clamp）

```css
/* 当前：固定像素字号，在不同屏幕上要么太小要么太大 */
/* 升级后：使用 clamp() 实现流式缩放 */

/* 所有字号统一使用 CSS 变量 */
.cal-col td        { font-size: var(--text-sm); }
.card-header       { font-size: var(--text-lg); }
.bazi-title        { font-size: var(--text-2xl); }
.head h1           { font-size: var(--text-3xl); }
```

### 6.2 Container Query（组件级响应式）

```css
/* 当前：仅靠 @media 全局断点 */
/* 升级后：组件自身感知容器宽度 */

.cal-col {
  container-type: inline-size;
  container-name: calendar;
}

@container calendar (max-width: 400px) {
  .cal-col .solar-num { font-size: var(--text-base); }
  .cal-col .lr,
  .cal-col .gz        { display: none; } /* 窄屏隐藏次要信息 */
}

@container calendar (min-width: 600px) {
  .cal-col td { padding: 0.6rem 0.3rem; }
}
```

### 6.3 :has() 选择器（父元素感知子元素状态）

```css
/* 当前：需要 JS 添加 class 来控制样式 */
/* 升级后：纯 CSS 实现 */

/* 有闰月标记的日期格子加高亮 */
.cal-col td:has(.lr:contains('闰')) {
  background: rgba(212, 168, 83, 0.1);
}

/* 有节气的日期格子 */
.cal-col td:has(.ns) {
  border-left: 2px solid var(--color-jade);
}

/* 选中日期的卡片变化 */
.card:has(.card-body [aria-selected="true"]) {
  border-color: var(--color-gold);
}
```

### 6.4 @layer（样式优先级管理）

```css
/* 当前：样式优先级靠选择器权重和 !important */
/* 升级后：使用 @layer 明确优先级 */

@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
}

@layer base {
  body { font-family: var(--font-body); line-height: 1.7; }
}

@layer components {
  .card { background: var(--bg-card); border-radius: var(--radius-md); }
  .cal-col td { text-align: center; }
}

@layer utilities {
  .sr-only { /* ... */ }
  .hidden { display: none !important; }
}
```

### 6.5 color-mix()（主题色自动派生）

```css
/* 当前：每个主题色都需要手动定义亮/暗变体 */
/* 升级后：用 color-mix() 自动派生 */

:root {
  --color-gold: #B8944A;
  --color-gold-light: color-mix(in oklch, var(--color-gold) 80%, white);
  --color-gold-dark:  color-mix(in oklch, var(--color-gold) 80%, black);
  --color-gold-muted: color-mix(in oklch, var(--color-gold) 30%, transparent);
}
```

### 6.6 Logical Properties（逻辑属性）

```css
/* 当前：物理属性（margin-left, padding-right） */
/* 升级后：逻辑属性（margin-inline-start, padding-inline-end） */
/* 好处：天然支持 RTL 语言，代码更一致 */

.card {
  padding-inline: var(--space-md);
  padding-block: var(--space-sm);
  border-inline-start: 4px solid var(--color-gold);
  margin-block-end: var(--space-md);
}
```

---

## 七、手势与交互 — P1

### 7.1 左右滑动切换月份

```javascript
// 日历手势：左右滑动切换月份
function setupCalendarSwipe() {
  const cal = document.getElementById('Cal62');
  if (!cal) return;

  let startX = 0, startY = 0, startTime = 0;

  cal.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  cal.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startTime;

    // 水平滑动距离 > 50px，垂直距离 < 30px，时间 < 500ms
    if (Math.abs(dx) > 50 && Math.abs(dy) < 30 && dt < 500) {
      if (dx > 0) {
        // 右滑 → 上个月
        withViewTransition(() => changeMonth(-1));
      } else {
        // 左滑 → 下个月
        withViewTransition(() => changeMonth(1));
      }
    }
  }, { passive: true });
}
```

### 7.2 View Transitions（页面切换动画）

```javascript
// 使用 View Transitions API 平滑切换月份/页面
function withViewTransition(callback) {
  if (document.startViewTransition) {
    document.startViewTransition(callback);
  } else {
    callback();
  }
}

// 月份切换时使用
function changeMonth(delta) {
  withViewTransition(() => {
    // 原有的月份切换逻辑
    Cal_m.value = parseInt(Cal_m.value) + delta;
    if (Cal_m.value > 12) { Cal_m.value = 1; Cal_y.value++; }
    if (Cal_m.value < 1)  { Cal_m.value = 12; Cal_y.value--; }
    showCal();
  });
}
```

```css
/* View Transition 动画 */
::view-transition-old(calendar) {
  animation: fade-out 0.2s ease;
}

::view-transition-new(calendar) {
  animation: fade-in 0.2s ease;
}

@keyframes fade-out {
  to { opacity: 0; transform: translateX(-20px); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateX(20px); }
}
```

### 7.3 骨架屏（加载态）

```css
/* 日历骨架屏 */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border-ink) 25%,
    var(--bg-card-raised) 50%,
    var(--border-ink) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-cell {
  width: 100%;
  height: 64px;
}
```

```html
<!-- 日历加载时显示骨架屏 -->
<div id="calendarSkeleton" class="cal-col" aria-hidden="true" aria-label="日历加载中">
  <div class="cal-th skeleton" style="height:32px"></div>
  <!-- 6 行 × 7 列骨架 -->
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;">
    <div class="skeleton skeleton-cell" style="height:64px"></div>
    <!-- 重复 42 个 -->
  </div>
</div>
```

---

## 八、性能优化 — P1

### 8.1 requestAnimationFrame 滚动节流

```javascript
// 当前：直接在 scroll 事件中计算
// 升级后：用 rAF 节流

function setupScrollOptimization() {
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // 滚动相关计算
        updateScrollIndicators();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
```

### 8.2 IntersectionObserver 按需渲染

```javascript
// 八字排盘内容：仅在可见时渲染
function setupLazyBazi() {
  const baziPanel = document.getElementById('bzppxt');
  if (!baziPanel) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !baziPanel.dataset.rendered) {
        renderBaziPanel();
        baziPanel.dataset.rendered = 'true';
      }
    });
  }, { rootMargin: '200px' });

  observer.observe(baziPanel);
}
```

### 8.3 content-visibility（跳过屏外渲染）

```css
/* 折叠的卡片不参与渲染计算 */
.card.collapsed {
  content-visibility: auto;
  contain-intrinsic-size: 0 48px; /* 仅标题高度 */
}

/* 页脚区域 */
.foot-body {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

---

## 九、主题系统升级 — P2

### 9.1 系统主题跟随

```javascript
// 当前：手动切换 body.dark
// 升级后：支持 prefers-color-scheme 自动跟随

function setupTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  // 初始化
  if (saved === 'dark' || (!saved && prefersDark.matches)) {
    document.body.classList.add('dark');
  }

  // 监听系统主题变化
  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.body.classList.toggle('dark', e.matches);
    }
  });
}

// 用户手动切换时保存偏好
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
```

### 9.2 高对比度模式

```css
/* 放大镜/高对比度用户 */
@media (prefers-contrast: high) {
  :root {
    --text-primary: #000;
    --text-secondary: #333;
    --border-ink: #666;
    --border-gold: #999;
  }

  body.dark {
    --text-primary: #fff;
    --text-secondary: #ddd;
    --border-ink: #999;
    --border-gold: #bbb;
  }

  /* 增大点击区域 */
  .cal-col td { min-height: 72px; }
  button, select, input { min-height: 44px; }
}

/* 强制减少动画 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 9.3 字体大小用户可控

```html
<!-- 设置面板中添加字体大小选项 -->
<div class="font-size-control">
  <label>字体大小</label>
  <div class="font-size-buttons">
    <button onclick="setFontSize('small')" aria-label="小字号">A-</button>
    <button onclick="setFontSize('medium')" aria-label="标准字号" class="active">A</button>
    <button onclick="setFontSize('large')" aria-label="大字号">A+</button>
  </div>
</div>
```

```javascript
function setFontSize(size) {
  const sizes = { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.setProperty('--base-font-size', sizes[size]);
  localStorage.setItem('fontSize', size);
}
```

---

## 十、导航与信息架构 — P1

### 10.1 底部导航栏改进

```css
/* 当前：固定顶部导航，在移动端占用过多空间 */
/* 升级后：移动端底部导航，桌面端保持顶部 */

/* 移动端底部导航 */
@media (max-width: 600px) {
  .top-nav {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-bottom: none;
    border-top: 1px solid var(--border-gold);
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.15);
  }

  .top-nav-head { display: none; } /* 移动端隐藏标题 */

  .top-nav-tabs {
    justify-content: space-around;
    padding: 0.3rem 0;
  }

  .tab-item {
    min-width: 0;
    flex: 1;
    padding: 0.4rem 0;
  }

  .tab-item .tab-label {
    font-size: 0.7rem;
    letter-spacing: 0;
  }

  /* 主内容区底部留出导航空间 */
  .wrap {
    margin-bottom: 70px;
  }
}
```

### 10.2 快速日期跳转

```html
<!-- 当前：年月下拉选择，操作繁琐 -->
<!-- 升级后：添加日期跳转快捷入口 -->

<div class="quick-jump">
  <button class="quick-jump-btn" onclick="jumpToToday()" aria-label="回到今天">
    <i class="ti ti-calendar-event"></i>
    <span>今天</span>
  </button>
  <button class="quick-jump-btn" onclick="showDatePicker()" aria-label="选择日期">
    <i class="ti ti-map-pin"></i>
    <span>跳转</span>
  </button>
</div>
```

```html
<!-- 日期选择器弹窗 -->
<dialog id="datePickerDialog" class="date-picker-dialog" aria-label="选择日期">
  <div class="date-picker-inner">
    <h3>跳转到指定日期</h3>
    <div class="date-picker-row">
      <label>
        <span>年份</span>
        <input type="number" id="jumpYear" min="-4712" max="9999" value="2026">
      </label>
      <label>
        <span>月份</span>
        <select id="jumpMonth">
          <option value="1">1月</option>
          <!-- ... -->
        </select>
      </label>
    </div>
    <div class="date-picker-actions">
      <button onclick="closeDatePicker()">取消</button>
      <button onclick="executeJump()" class="primary">跳转</button>
    </div>
  </div>
</dialog>
```

---

## 十一、数据可视化增强 — P2

### 11.1 五行力量雷达图

```html
<!-- 当前：纯文字显示五行力量 -->
<!-- 升级后：Canvas/SVG 雷达图 -->

<canvas id="wuxingRadar" width="200" height="200" aria-label="五行力量分布图"></canvas>
```

```javascript
function drawWuxingRadar(canvas, data) {
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.min(cx, cy) * 0.8;
  const labels = ['木', '火', '土', '金', '水'];
  const angle = (2 * Math.PI) / 5;

  // 绘制五边形背景
  ctx.strokeStyle = 'rgba(184, 148, 74, 0.3)';
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a = angle * j - Math.PI / 2;
      const x = cx + (r * i / 5) * Math.cos(a);
      const y = cy + (r * i / 5) * Math.sin(a);
      j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 绘制数据区域
  const max = Math.max(...data);
  ctx.fillStyle = 'rgba(196, 30, 10, 0.2)';
  ctx.strokeStyle = 'rgba(196, 30, 10, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let j = 0; j < 5; j++) {
    const a = angle * j - Math.PI / 2;
    const v = (data[j] / max) * r;
    const x = cx + v * Math.cos(a);
    const y = cy + v * Math.sin(a);
    j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 绘制标签
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
  ctx.font = '14px var(--font-display)';
  ctx.textAlign = 'center';
  for (let j = 0; j < 5; j++) {
    const a = angle * j - Math.PI / 2;
    const x = cx + (r + 20) * Math.cos(a);
    const y = cy + (r + 20) * Math.sin(a);
    ctx.fillText(labels[j], x, y + 5);
  }
}
```

### 11.2 大运时间轴

```html
<!-- 当前：表格展示大运 -->
<!-- 升级后：可视化时间轴 -->

<div class="dayun-timeline" role="list" aria-label="大运时间轴">
  <div class="dayun-item" role="listitem" aria-label="2026-2036 丙午大运">
    <div class="dayun-year">2026</div>
    <div class="dayun-node"></div>
    <div class="dayun-info">
      <span class="dayun-gz">丙午</span>
      <span class="dayun-ss">偏财</span>
    </div>
  </div>
  <!-- ... -->
</div>
```

```css
.dayun-timeline {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  padding: 16px 0;
  -webkit-overflow-scrolling: touch;
}

.dayun-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
  position: relative;
}

.dayun-item::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -50%;
  width: 100%;
  height: 2px;
  background: var(--border-gold);
}

.dayun-item:last-child::after { display: none; }

.dayun-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-gold);
  border: 2px solid var(--bg-card);
  z-index: 1;
}

.dayun-item.active .dayun-node {
  background: var(--color-cinnabar);
  box-shadow: 0 0 0 4px rgba(196, 30, 10, 0.2);
}
```

---

## 十二、打印样式优化 — P2

### 12.1 打印友好布局

```css
@media print {
  /* 隐藏非打印内容 */
  .top-nav, .bar, .trial-banner, .settings-fab,
  .right-fabs, .toast-container, #trialBanner {
    display: none !important;
  }

  /* 重置背景 */
  body, body.dark {
    background: #fff !important;
    color: #000 !important;
  }

  /* 卡片样式简化 */
  .card {
    box-shadow: none;
    border: 1px solid #ccc;
    page-break-inside: avoid;
  }

  /* 八字命盘打印优化 */
  .bt-table {
    min-width: auto;
    font-size: 10pt;
  }

  /* 确保日历不跨页 */
  .cal-col {
    page-break-inside: avoid;
  }
}
```

---

## 十三、实施路线图

### 阶段一：紧急修复（1-2 天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 修复 `line-height:100` | CSS | 5 分钟 |
| 字号下限提升至 12px | CSS | 30 分钟 |
| 添加 `:focus-visible` 样式 | CSS | 15 分钟 |
| 替换 36 处 `alert()` | JS | 2 小时 |

### 阶段二：无障碍基础（3-5 天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 添加 ARIA 地标角色 | HTML | 2 小时 |
| 日历表格 `role="grid"` + 键盘导航 | HTML+JS | 4 小时 |
| 卡片折叠改为 `<details>` | HTML+CSS | 3 小时 |
| 添加 `.sr-only` 工具类 | CSS | 15 分钟 |
| 表单 `<label>` 关联 | HTML | 1 小时 |

### 阶段三：交互升级（5-7 天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 手势滑动切换月份 | JS | 3 小时 |
| Bottom Sheet 详情面板 | CSS+JS | 4 小时 |
| View Transitions 月份切换 | JS+CSS | 2 小时 |
| 骨架屏加载态 | CSS+HTML | 2 小时 |
| Toast 通知系统 | CSS+JS | 2 小时 |
| `<dialog>` 替代 confirm/prompt | HTML+JS | 2 小时 |

### 阶段四：现代 CSS（3-5 天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| `clamp()` 流式字号体系 | CSS | 2 小时 |
| `@layer` 样式分层 | CSS | 3 小时 |
| `color-mix()` 主题色派生 | CSS | 1 小时 |
| Container Query 组件响应式 | CSS | 2 小时 |
| Logical Properties 替换 | CSS | 2 小时 |

### 阶段五：进阶功能（5-7 天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 五行雷达图 | JS+Canvas | 4 小时 |
| 大运时间轴 | CSS+JS | 3 小时 |
| 移动端底部导航 | CSS | 2 小时 |
| 日期快速跳转 | HTML+JS | 2 小时 |
| 系统主题跟随 | JS | 1 小时 |
| 字体大小用户可控 | JS+CSS | 1 小时 |
| 打印样式 | CSS | 2 小时 |

---

## 十四、兼容性说明

| 特性 | Chrome | Safari | Firefox | Edge | 备注 |
|------|--------|--------|---------|------|------|
| `clamp()` | 79+ | 13.1+ | 75+ | 79+ | ✅ 全支持 |
| Container Query | 105+ | 16+ | 110+ | 105+ | ✅ 主流支持 |
| `:has()` | 105+ | 15.4+ | 121+ | 105+ | ✅ 主流支持 |
| `@layer` | 99+ | 15.4+ | 97+ | 99+ | ✅ 全支持 |
| `color-mix()` | 111+ | 16.2+ | 113+ | 111+ | ✅ 主流支持 |
| View Transitions | 111+ | ❌ | ❌ | 111+ | ⚠️ 渐进增强 |
| `<dialog>` | 37+ | 15.4+ | 98+ | 79+ | ✅ 全支持 |
| `popover` | 114+ | 17+ | 125+ | 114+ | ⚠️ 渐进增强 |
| `details/summary` | ✅ | ✅ | ✅ | ✅ | ✅ 全支持 |

**降级策略**：所有现代特性均采用渐进增强模式，不支持的浏览器回退到基础体验。

---

*文档完*
