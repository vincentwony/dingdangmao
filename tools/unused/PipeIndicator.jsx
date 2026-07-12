// 管道感知标签 — 八字分析结果来源可视化锚点
import PropTypes from 'prop-types';

const PIPE_CONFIG = {
  modern: {
    label: '🔥 新·调候引擎',
    bg: '#FF6B35',
    hint: (r) => {
      if (r?.tiaoHou?.enabled) return `调候用神${r.tiaoHou.element || ''}已激活`;
      if (r?.pattern?.includes('调候')) return '格局路径含调候优先';
      return 'MD对齐+五条件体系';
    },
  },
  legacy: {
    label: '📜 旧·经验模型',
    bg: '#4A90E2',
    hint: () => '无调候逻辑，回退旧模型',
  },
};

function detectPipe(analysisResult) {
  if (!analysisResult) return 'legacy';
  if (analysisResult.tiaoHou?.enabled === true) return 'modern';
  if (analysisResult.tiaoHouOverride) return 'modern';
  if (typeof analysisResult.pattern === 'string' && analysisResult.pattern.includes('调候')) return 'modern';
  if (analysisResult.classicRef && analysisResult.classicRef !== 'N/A') return 'modern';
  return 'legacy';
}

export default function PipeIndicator({ bazi, analysisResult }) {
  const pipe = detectPipe(analysisResult);
  const cfg = PIPE_CONFIG[pipe];

  return (
    <span
      className="pipe-indicator"
      style={{
        display: 'inline-block',
        background: cfg.bg,
        color: '#fff',
        borderRadius: 4,
        padding: '4px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'default',
        transition: 'box-shadow 0.2s',
      }}
      title={cfg.hint(analysisResult)}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 8px ${cfg.bg}`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {cfg.label}
    </span>
  );
}

PipeIndicator.propTypes = {
  bazi: PropTypes.string,
  analysisResult: PropTypes.shape({
    tiaoHou: PropTypes.shape({
      enabled: PropTypes.bool,
      element: PropTypes.string,
    }),
    tiaoHouOverride: PropTypes.object,
    pattern: PropTypes.string,
    classicRef: PropTypes.string,
  }),
};
