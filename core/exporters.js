/**
 * core/exporters.js — 八字分析结果统一导出抽象层
 *
 * 将六种输出格式封装为统一接口的适配器模式：
 *   - JSON: 完整结构化数据导出
 *   - CSV: 扁平表格数据（兼容 Excel/数据分析）
 *   - Markdown: 人类可读的报告文档
 *   - API: 服务端 API 响应格式（规范格式）
 *   - Props: 前端 UI 组件消费格式
 *   - Cache: localStorage 持久化精简格式
 *
 * 接口: { export(AnalysisResult) → string|object }
 * 工厂: createExporter(type) → Exporter
 *
 * 所有导出器向后兼容：不影响现有代码，仅新增统一抽象层。
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// 类型定义 (JSDoc, 非运行时)
// ═══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} AnalysisResult
 * @property {string} dayMaster - 日干 (甲-癸)
 * @property {string} dayMasterWx - 日主五行 (木/火/土/金/水)
 * @property {string} strengthLevel - 力量等级 (极旺/偏旺/中和/偏弱/极弱)
 * @property {string|null} strengthTilt - 中和区间倾向 (偏强/偏弱/null)
 * @property {number} strengthPct - 日主五行百分比
 * @property {number} strengthScore - 日主力量分数
 * @property {number} selfPct - 自党百分比
 * @property {Object} pattern - 格局信息 {type, isCong, status, grade, ...}
 * @property {Object} xiyong - 喜用神 {useGod, likeGod, fearGod, path, tiaoHou}
 * @property {Object} zhengge - 正格详情 {type, source, geSS, isSpecial}
 * @property {Object} verify - 验证结果 {passed, issues[], confidence}
 * @property {Object} wxData - 五行分布 {scores, pct, levels, details}
 */

// ═══════════════════════════════════════════════════════════════
// 1. JsonExporter — 完整 JSON 序列化
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果序列化为格式化 JSON 字符串
 * 用途: 数据交换、API 调试、文件导出 (.json)
 */
function JsonExporter() {
  return {
    /**
     * @param {AnalysisResult} data
     * @param {Object} [opts]
     * @param {boolean} [opts.pretty=true] — 是否缩进美化
     * @returns {string} JSON 字符串
     */
    export: function(data, opts) {
      var pretty = !opts || opts.pretty !== false;
      return JSON.stringify(data, null, pretty ? 2 : 0);
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. CsvExporter — 扁平 CSV 表格
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果导出为 CSV 格式
 * 用途: Excel 导入、数据分析、批量八字对比
 * 输出: 两行 CSV — 表头行 + 数据行（单条记录）
 *       支持批量模式: data[] 数组 → 每条一行
 */
function CsvExporter() {
  /**
   * 将值转为 CSV 安全格式（含逗号或引号时包裹）
   */
  function csvEscape(val) {
    if (val === null || val === undefined) return '';
    var s = String(val);
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /** 展平嵌套对象为 CSV 友好的一级键 */
  function flatten(obj, prefix) {
    var result = {};
    prefix = prefix || '';
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      var v = obj[k];
      var fullKey = prefix ? prefix + '.' + k : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        // 递归一层
        var nested = flatten(v, fullKey);
        for (var nk in nested) {
          if (nested.hasOwnProperty(nk)) result[nk] = nested[nk];
        }
      } else if (Array.isArray(v)) {
        // 数组处理: 基本类型用分号连接，对象数组跳过（避免 [object Object]）
        if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
          // 对象数组 → 仅记录数量
          result[fullKey + '.count'] = v.length;
        } else {
          result[fullKey] = v.join('; ');
        }
      } else {
        result[fullKey] = v;
      }
    }
    return result;
  }

  return {
    /**
     * @param {AnalysisResult|AnalysisResult[]} data — 单条或批量
     * @param {Object} [opts]
     * @param {string[]} [opts.fields] — 指定导出字段（默认全部）
     * @returns {string} CSV 字符串
     */
    export: function(data, opts) {
      var items = Array.isArray(data) ? data : [data];
      if (items.length === 0) return '';

      // 展平每条记录
      var flatItems = items.map(function(item) { return flatten(item); });

      // 收集所有键（保持顺序稳定）
      var keys = [];
      var seen = {};
      flatItems.forEach(function(item) {
        Object.keys(item).forEach(function(k) {
          if (!seen[k]) { seen[k] = true; keys.push(k); }
        });
      });

      // 如果指定了 fields，按指定顺序过滤
      if (opts && opts.fields) {
        var fieldSet = {};
        opts.fields.forEach(function(f) { fieldSet[f] = true; });
        keys = keys.filter(function(k) { return fieldSet[k]; });
      }

      // 构建 CSV
      var lines = [keys.map(csvEscape).join(',')];
      flatItems.forEach(function(item) {
        lines.push(keys.map(function(k) { return csvEscape(item[k]); }).join(','));
      });

      return lines.join('\n');
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. MarkdownExporter — Markdown 报告文档
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果导出为 Markdown 格式的人类可读报告
 * 用途: 分享、存档、AI 进一步分析
 */
function MarkdownExporter() {
  var WX = ['木','火','土','金','水'];

  function mdH1(text) { return '# ' + text + '\n\n'; }
  function mdH2(text) { return '## ' + text + '\n\n'; }
  function mdH3(text) { return '### ' + text + '\n\n'; }
  function mdBold(text) { return '**' + text + '**'; }
  function mdTable(headers, rows) {
    var h = '| ' + headers.join(' | ') + ' |\n';
    h += '|' + headers.map(function() { return '---'; }).join('|') + '|\n';
    rows.forEach(function(row) {
      h += '| ' + row.join(' | ') + ' |\n';
    });
    return h + '\n';
  }

  return {
    /**
     * @param {AnalysisResult} data
     * @param {Object} [opts]
     * @param {string} [opts.title='八字命理分析报告'] — 文档标题
     * @returns {string} Markdown 字符串
     */
    export: function(data, opts) {
      var title = (opts && opts.title) || '八字命理分析报告';
      var md = '';

      md += mdH1(title);
      md += '> 生成时间: ' + new Date().toISOString().slice(0, 10) + '\n\n';

      // §1 日主信息
      md += mdH2('一、日主信息');
      md += '| 项目 | 内容 |\n|---|---|\n';
      md += '| 日主 | ' + data.dayMaster + '（' + data.dayMasterWx + '）|\n';
      md += '| 力量等级 | ' + data.strengthLevel + (data.strengthTilt ? '（' + data.strengthTilt + '）' : '') + ' |\n';
      md += '| 日主占比 | ' + data.strengthPct + '% |\n';
      md += '| 自党占比 | ' + data.selfPct + '% |\n';
      md += '\n';

      // §2 格局分析
      if (data.pattern) {
        var p = data.pattern;
        md += mdH2('二、格局分析');
        md += '| 项目 | 内容 |\n|---|---|\n';
        md += '| 格局 | ' + (p.huaType || p.type || p.congType || '—') + ' |\n';
        md += '| 状态 | ' + (p.status || '—') + ' |\n';
        md += '| 等级 | ' + (p.grade || '—') + ' |\n';
        if (p.source) md += '| 判定依据 | ' + p.source + ' |\n';
        if (p.isHua) md += '| 化气格 | ✅ 成立 — ' + (p.huaType || '') + ' |\n';
        if (p.breaks && p.breaks.length) md += '| 破格原因 | ' + p.breaks.join('；') + ' |\n';
        md += '\n';
      }

      // §3 喜用神
      if (data.xiyong) {
        var xy = data.xiyong;
        md += mdH2('三、喜用神');
        md += '| 角色 | 十神类别 | 说明 |\n|---|---|---|\n';
        if (xy.useGod) md += '| 🔴 用神 | ' + xy.useGod.element + ' | ' + (xy.useGod.reason || '') + ' |\n';
        if (xy.likeGod) md += '| 🟢 喜神 | ' + xy.likeGod.element + ' | ' + (xy.likeGod.reason || '') + ' |\n';
        if (xy.fearGod) md += '| ⚫ 忌神 | ' + xy.fearGod.element + ' | ' + (xy.fearGod.reason || '') + ' |\n';
        md += '| 📐 路径 | ' + (xy.path || '—') + ' | — |\n';
        if (xy.tiaoHou && xy.tiaoHou.needed) {
          md += '| 🌡 调候 | ' + xy.tiaoHou.element + ' | ' + xy.tiaoHou.reason + ' |\n';
        }
        md += '\n';
      }

      // §4 五行分布
      if (data.wxData) {
        var wx = data.wxData;
        md += mdH2('四、五行力量分布');
        var wxHeaders = ['五行', '百分比', '等级', '分数'];
        var wxRows = WX.map(function(name, i) {
          var keys = ['mu','huo','tu','jin','shui'];
          return [
            name,
            (wx.pct && wx.pct[keys[i]] != null ? wx.pct[keys[i]] + '%' : '—'),
            (wx.levels && wx.levels[keys[i]] ? wx.levels[keys[i]] : '—'),
            (wx.scores && wx.scores[keys[i]] != null ? String(wx.scores[keys[i]]) : '—')
          ];
        });
        md += mdTable(wxHeaders, wxRows);
      }

      // §5 验算
      if (data.verify) {
        var v = data.verify;
        md += mdH2('五、自洽验算');
        md += '| 项目 | 结果 |\n|---|---|\n';
        md += '| 验算状态 | ' + (v.passed ? '✅ 通过' : '❌ 未通过') + ' |\n';
        md += '| 置信度 | ' + (v.confidence || '—') + '% |\n';
        if (v.issues && v.issues.length) {
          md += '\n**问题清单：**\n';
          v.issues.forEach(function(issue) { md += '- ' + issue + '\n'; });
        }
        md += '\n';
      }

      md += '---\n*本报告由公信万年历 AI 格局分析引擎自动生成*\n';
      return md;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. ApiExporter — 服务端 API 响应格式
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果封装为 API 响应格式
 * 委托自 server/routes/bazi.js 的 result 对象构建逻辑
 * 用途: 保证 API 响应格式一致性，所有端点使用同一序列化器
 */
function ApiExporter() {
  return {
    /**
     * @param {Object} data — 完整的 bazi 计算结果（含 ob 原始数据 + mdAnalysis + wxCalc）
     * @param {Object} [opts]
     * @param {string} [opts.name] — 姓名
     * @param {number} [opts.sex] — 性别 (1=男, 0=女)
     * @returns {Object} API 响应对象 (不含 ok/took 外层包装)
     */
    export: function(data, opts) {
      var wx = data.wxCalc || {};
      var cd = (data.ob && data.ob._congGeData) || {};
      var name = (opts && opts.name) || '';
      var sex = (opts && opts.sex === 0) ? '女' : '男';

      return {
        name: name,
        sex: sex,
        // 五行分布
        wuxingScores:  wx.scores || null,
        wuxingPct:     wx.pct || null,
        wuxingLevels:  wx.levels || null,
        wuxingDetails: wx.details || null,
        // 旧管道兼容
        geName:        (data.ob && data.ob._geName) || '',
        congGe:        { isCong: cd.isCong || false, congType: cd.congType || '非从格', shengPct: cd.shengPct || 0, keXiePct: cd.keXiePct || 0, detail: cd.result || '' }
      };
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 5. PropsExporter — 前端 UI 组件消费格式
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果转换为前端 renderResult() 所需的 props 格式
 * 委托自 web/js/bazi-ui.js 的 data 消费逻辑
 * 用途: 将后端响应规范化，确保 UI 组件数据契约一致
 */
function PropsExporter() {
  return {
    /**
     * @param {Object} data — API 响应 data 对象
     * @param {Object} [opts]
     * @returns {Object} 前端 props 对象（可直接传入 renderResult）
     */
    export: function(data, opts) {
      return {
        // 五行分布
        wuxingScores: data.wuxingScores || null,
        wuxingPct: data.wuxingPct || null,
        wuxingLevels: data.wuxingLevels || null,
        wuxingDetails: data.wuxingDetails || null,
        // 八字基础
        pillars: data.pillars || null,
        bzInfo: data.bzInfo || '',
        lunarDate: data.lunarDate || '',
        jieQi: data.jieQi || '',
        zhenTaiYang: data.zhenTaiYang || '',
        jiShi: data.jiShi || '',
        // 旧字段兼容
        geName: data.geName || '',
        congGe: data.congGe || null,
        // 卡片数组
        cards: data.cards || [],
        // 大运数据
        dayun: data.dayun || null,
        // 原始索引
        b1: data.b1, b2: data.b2, b3: data.b3, b4: data.b4,
        MGxh: data.MGxh,
        // 日标信息
        riBiao: data.riBiao || null
      };
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 6. CacheExporter — localStorage 持久化精简格式
// ═══════════════════════════════════════════════════════════════

/**
 * 将分析结果精简为 localStorage 安全存储的格式
 * 委托自 web/js/bazi-ui.js _lastResult + web/js/archive-ui.js saveCurrent
 * 用途: 离线存档、页面恢复、减少存储空间
 */
function CacheExporter() {
  /**
   * 移除 HTML 富文本（bzinfo/cards body 等大字段），仅保留结构化数据
   */
  function stripHtml(data) {
    var clone = JSON.parse(JSON.stringify(data));
    // 移除 cards 中的 HTML body（保留 id 和 title 元数据）
    if (clone.cards) {
      clone.cards = clone.cards.map(function(c) {
        return { id: c.id, title: c.title, _bodyLen: c.body ? c.body.length : 0 };
      });
    }
    // 移除大型 HTML 字符串
    delete clone.bzinfo;
    delete clone._wuxingBreakdown;
    return clone;
  }

  return {
    /**
     * @param {Object} data — API 响应 data 对象
     * @param {Object} [opts]
     * @param {boolean} [opts.stripHtml=true] — 是否移除 HTML 富文本（减小体积）
     * @param {number} [opts.maxSizeKB=500] — 大小警告阈值
     * @returns {Object} 适合 localStorage 的轻量对象
     */
    export: function(data, opts) {
      var strip = !opts || opts.stripHtml !== false;
      var result = strip ? stripHtml(data) : JSON.parse(JSON.stringify(data));

      // 添加缓存元数据
      result._cached = true;
      result._cachedAt = new Date().toISOString();

      // 大小检查
      var sizeKB = JSON.stringify(result).length / 1024;
      if (sizeKB > (opts && opts.maxSizeKB || 500)) {
        result._sizeWarning = '缓存对象过大 (' + sizeKB.toFixed(1) + 'KB)，建议启用 stripHtml';
      }

      return result;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 工厂函数
// ═══════════════════════════════════════════════════════════════

/**
/**
 * @typedef {'json'|'csv'|'markdown'|'api'|'props'|'cache'} ExportType
 */

/** 合法导出类型白名单 — 防止非法格式注入 */
var VALID_EXPORT_TYPES = ['json', 'csv', 'markdown', 'api', 'props', 'cache'];

/**
 * 类型守卫 — 断言导出类型在白名单内
 * @param {string} type — 待验证的导出类型
 * @throws {TypeError} 非法的导出类型
 */
function assertExporterType(type) {
  if (VALID_EXPORT_TYPES.indexOf(type) === -1) {
    throw new TypeError(
      '非法导出类型: "' + type + '"。' +
      '支持: ' + VALID_EXPORT_TYPES.join(', ') + '。' +
      '若需新增类型，请先在 VALID_EXPORT_TYPES 白名单中注册。'
    );
  }
}

/**
 * 导出器工厂 — 根据类型返回对应的 Exporter 实例
 *
 * @param {ExportType} type — 导出格式类型
 * @returns {{ export: Function }} Exporter 实例
 * @throws {Error} 未知导出类型
 *
 * @example
 *   var jsonExp = createExporter('json');
 *   var jsonStr = jsonExp.export(analysisResult, { pretty: true });
 *
 *   var mdExp = createExporter('markdown');
 *   var report = mdExp.export(analysisResult, { title: '张三命理报告' });
 */
function createExporter(type) {
  assertExporterType(type);  // 类型守卫 — 防止非法格式注入
  switch (type) {
    case 'json':     return JsonExporter();
    case 'csv':      return CsvExporter();
    case 'markdown': return MarkdownExporter();
    case 'api':      return ApiExporter();
    case 'props':    return PropsExporter();
    case 'cache':    return CacheExporter();
    default:
      throw new Error('未知导出类型: ' + type + '。支持: json, csv, markdown, api, props, cache');
  }
}

// ═══════════════════════════════════════════════════════════════
// 便捷批量导出
// ═══════════════════════════════════════════════════════════════

/**
 * 批量导出 — 对同一条数据生成所有六种格式
 * @param {Object} data — 分析结果数据
 * @param {Object} [opts] — 传递给各导出器的选项
 * @returns {{ json:string, csv:string, markdown:string, api:Object, props:Object, cache:Object }}
 */
function exportAll(data, opts) {
  return {
    json:     createExporter('json').export(data, opts),
    csv:      createExporter('csv').export(data, opts),
    markdown: createExporter('markdown').export(data, opts),
    api:      createExporter('api').export(data, opts),
    props:    createExporter('props').export(data, opts),
    cache:    createExporter('cache').export(data, opts)
  };
}

// ═══════════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════════

module.exports = {
  createExporter: createExporter,
  assertExporterType: assertExporterType,  // 类型守卫（供外部校验）
  VALID_EXPORT_TYPES: VALID_EXPORT_TYPES,  // 白名单（供外部扩展检查）
  exportAll: exportAll,
  // 直接暴露各构造器（高级用法）
  JsonExporter: JsonExporter,
  CsvExporter: CsvExporter,
  MarkdownExporter: MarkdownExporter,
  ApiExporter: ApiExporter,
  PropsExporter: PropsExporter,
  CacheExporter: CacheExporter
};
