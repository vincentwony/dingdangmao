// 强度呼吸动画 — 捕获管道切换引起的异常波动
// 用法: animateStrength(el, oldVal, newVal, caseId)

const VIBE_THRESHOLD = 15;
const CSS = `
.strength-vibe-pulse {
  animation: vibe-breathe 1.2s ease-in-out;
}
@keyframes vibe-breathe {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}`;

let _injected = false;

function injectCSS() {
  if (_injected) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  _injected = true;
}

export function animateStrength(element, oldValue, newValue, caseId) {
  if (Math.abs(newValue - oldValue) <= VIBE_THRESHOLD) return;
  injectCSS();

  console.warn(
    `⚠️ VIBE ALERT [${caseId}]: ${oldValue}% → ${newValue}% | 检查通根/调候覆盖`
  );

  element.classList.add('strength-vibe-pulse');
  element.addEventListener('animationend', () => {
    element.classList.remove('strength-vibe-pulse');
  }, { once: true });
}
