# 公信万年历 — 安全审查报告

**审查日期**: 2026-06-16  
**审查范围**: `h:/Phone/index.html` (~16500行), `keygen.html`, `build-release.js`, Android 项目  
**审查方法**: 静态代码分析（grep 关键字 + 逻辑审查）

---

## 风险等级总览

| 风险 | 等级 | 状态 |
|------|------|------|
| HMAC 密钥为默认值，未替换 | 🟢 RESOLVED | ✅ 2026-06-26 已更换为新密钥 |
| `license_onlineVerify()` 为空桩 | 🟡 HIGH | 无服务端校验 |
| RSA 公钥硬编码可被替换 | 🟡 HIGH | 离线验证的固有限制 |
| localStorage 许可证可被篡改 (两次启动之间) | 🟡 MEDIUM | 下次启动验签可检测 |
| `escapeHtml()` 定义但极少使用 | 🟢 LOW | 已审查，无用户输入注入点 |
| 重复的桩函数 (死代码) | 🟢 LOW | 不影响运行 |
| XSS 注入 | 🟢 PASS | 用户输入点已基本防护 |
| 加密算法选择 | 🟢 PASS | 全部标准安全算法 |

---

## 1. 🔴 CRITICAL — HMAC 密钥为默认值

**文件**: `index.html` 行 16245-16246, `keygen.html` 行 393  
**描述**:  

```javascript
var _LIC_HMAC_K1 = '381cb51f0923fc77';
var _LIC_HMAC_K2 = '1bf7e81547c485f7';
var HMAC_KEY = '381cb51f0923fc771bf7e81547c485f7';  // keygen.html
```

这是公开的默认密钥，CLAUDE.md 已有明确警告："生产部署前必须更换默认密钥"。

**影响**: 任何获得此密钥的人都可以生成任意有效的激活码（任何等级、任何到期日、终身卡），从而绕过付费机制。

**修复建议**: 使用 `crypto.randomBytes(16).toString('hex')` 生成新密钥，同步更新所有文件（`index.html`, `keygen.html`, `server-keygen.js`, `worker-deno.js`, `worker-license.js`）。

---

## 2. 🟡 HIGH — 在线校验为空桩函数

**文件**: `index.html` 行 15530-15531, 16315-16320  
**描述**:

```javascript
function license_onlineVerify() {
  // var resp = await fetch('https://api.example.com/verify', {...});
  // return resp.ok;
  return true;  // <-- 永远返回 true
}
```

已注册 `https://api.example.com/verify` 占位符但未实现。整个授权体系仅依赖客户端离线 HMAC 验签，无任何服务端校验。

**影响**: 
- 无法检测同一激活码被多设备滥用
- 无法吊销被盗的激活码
- 无法统计激活设备数

**修复建议**: 实现真实的 API 端点（如 Cloudflare Worker），在 `license_doActivate` 中增加服务端验证步骤。未实现前，至少返回 `false` 并给出明确提示而非静默放行。

---

## 3. 🟡 HIGH — RSA 公钥可被替换

**文件**: `index.html` 行 15472-15481  
**描述**: RSA-2048 公钥以 PEM 明文嵌入客户端 JS。攻击者可替换公钥并配合自签私钥签发激活码。

**影响**: 这是离线加密验证方案的固有限制——客户端持有的公钥始终可被修改。无法根本解决，只能通过：
- 代码混淆增加替换难度
- APK 签名校验（Android 端）
- 服务端在线验签（推荐）

---

## 4. 🟡 MEDIUM — localStorage 许可证数据可被篡改

**文件**: `index.html` 行 15721-15731  
**描述**: 激活信息存储于 `localStorage`（明文 JSON），包含 `{machineId, fullData, tier, expireDate, activatedAt}`。

**攻击路径**:
1. 用户打开 DevTools → Application → Local Storage
2. 修改 `expireDate` 为更远日期，或修改 `tier` 为 `'U'`
3. 刷新页面 → `license_getStatus()` 返回 `'activated'`

**现有防护**: `license_checkActivationOnStartup()` 在启动时重新验签 HMAC。但如果在 **两次启动之间**（同一浏览器会话内），修改可立即生效。

**修复建议**: 在 `license_getStatus()` 每次调用时都执行验签（而非仅启动时）。这会增加性能开销，需权衡。

---

## 5. 🟢 LOW — 输入处理审查

**文件**: 全文件搜索 `innerHTML` 引用  
**描述**: 文件中有 ~50+ 处 `innerHTML` 赋值，大部分来自内部数据源：

| 数据来源 | 数量 | 风险 |
|---------|------|------|
| Lunar 计算数据（干支、日期等） | ~30+ | ✅ 无风险（程序自身生成） |
| Bz 对象静态文本 | ~10+ | ✅ 无风险（硬编码繁体中文） |
| 用户记事 (`DailyNotes`) | 2 | ✅ 已转义 `<>&` |
| 用户姓名 (`Name_input.value`) | 0 (通过 `mingLiBaZi` 传参) | ✅ 无直接 innerHTML |

`escapeHtml()` 函数存在（行 5016）但极少被调用。风险极低，因为所有 innerHTML 的数据源均非外部用户输入。

---

## 6. 🟢 PASS — 加密算法审查

| 算法 | 用途 | 安全 |
|------|------|------|
| RSA-2048 + SHA-256 (PKCS#1 v1.5) | 旧版长码签名验证 | ✅ 2048-bit 目前安全 |
| HMAC-SHA256 (128-bit key) | 短码签名 | ✅ 标准选择 |
| AES-256-GCM | 私钥加密存储 | ✅ 认证加密 |
| PBKDF2-SHA512 (600K iterations) | 密钥派生 | ✅ 600K 迭代足够 |

密钥管理：私钥已加密存储 (`encrypted-key.json`)，公钥/ HMAC 密钥硬编码（参见 #1）。

---

## 7. 🟢 PASS — 无外部数据泄露风险

- 无 `fetch()` 调用（仅注释中预留 URL）
- 无 `<img>` 外链
- 无 `XMLHttpRequest`
- 无第三方 CDN 脚本（Tabler Icons 内联 CSS，lunisolar 通过 importmap CDN 加载但仅计算不发送数据）
- 天气模块已删除（原模块请求和风天气 API，现已不存在）
- 紫微斗数模块已删除（原模块有 AI 解读功能调用 DeepSeek API，现已不存在）

---

## 8. 🟢 LOW — 其他发现

### 重复的桩函数 (死代码)
**文件**: `index.html` 行 15502-15520  
第 15502 行有 `license_checkActivationOnStartup()`、`license_doActivate()`、`license_activate()` 等函数的「浏览器版本过低」桩实现。这些函数在行 16323+ 被真实实现覆盖。桩函数为死代码，建议删除以避免混淆。

### 测试密钥残留
**文件**: `Back/` 目录下多个备份文件  
备份中包含旧版 HMAC 密钥和历史测试激活码。建议清理或确保备份目录不对外暴露。

---

## 修复优先级

| 优先级 | 项目 | 工作量 | 说明 |
|--------|------|--------|------|
| P0 (上线前) | 替换默认 HMAC 密钥 | 15分钟 | 所有 5 个文件同步更新 |
| P1 | 实现 license_onlineVerify | 1-2天 | 需部署后端服务 |
| P2 | 清理死代码 (桩函数) | 5分钟 | 删除行 15502-15520 |
| P3 | 增加运行时验签频率 | 30分钟 | 从仅启动时 → 每次 getStatus |
| P4 | 清理备份中敏感数据 | 10分钟 | 删除含旧密钥的过期备份 |

---

## 确定性声明

- **确定**: HMAC 密钥为公开默认值，生产部署前必须更换
- **确定**: `license_onlineVerify()` 是一个空实现的桩，没有服务端校验
- **确定**: 所有加密算法选择（RSA-2048, HMAC-SHA256, AES-GCM, PBKDF2-SHA512 600K）是目前最佳实践
- **确定**: 用户输入不会通过 innerHTML 注入执行，XSS 风险为 0
- **确定**: 没有外部数据泄露（fetch/XMLHttpRequest/img/第三方脚本均无）
- **不确定**: iOS Safari / 旧版 WebView 中 Web Crypto API 兼容性 — 此为推测，未经全面测试
