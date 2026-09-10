# 专题带教②：HMAC 安全 —— 共享库审计与实战

> 带教人：吴八哥（高级开发工程师） ｜ 日期：2026-07-15
> 代码基准：`server/lib/hmac.js` · `server/middleware/auth.js` · `web/js/hmac-spec.js` · `web/js/api.js`

---

## 0. 这一课的价值

HMAC 是本项目 API 的**唯一认证闸门**。它看起来简单（拼串 → 哈希 → 比对），但「拼串」「比对」两处最容易被写出**能跑、单测能过、线上却可被攻破**的代码。这一课抓出的时序侧信道缺陷，就是典型——它通过了此前所有测试，却在生产环境可被时序攻击。

**铁律：认证代码的单测，测的是「代码行为」，不是「安全强度」。安全缺陷往往藏在「行为正确但不够安全」的灰色地带。**

---

## 1. 协议速览（三端必须完全一致）

```
待签消息 = mid + ts + nonce + path        // 无分隔拼接，server/client 一致
签名     = HMAC-SHA256(消息, 密钥).hex 前 8 位   // = 4 字节 = 8 hex 字符
请求头   = x-machine-id / x-timestamp / x-nonce / x-signature
校验链   = 时间窗(±5min) → nonce 去重 → 签名比对
```

| 端 | 文件 | 关键点 |
|---|---|---|
| 服务端算法 | `server/lib/hmac.js` | 单一事实源（sign/verify/genNonce/buildMessage） |
| 服务端闸门 | `server/middleware/auth.js` | 时间窗 + nonce + 调 hmac |
| 浏览器规范 | `web/js/hmac-spec.js` | 仅常量/格式（不可写第二份） |
| 浏览器签名 | `web/js/api.js` | Web Crypto（无法与 Node 共用实现） |

---

## 2. 审计发现与处理

### 🔴 Finding A：签名比较非时序安全（已修复，真实缺陷）

**缺陷代码**（修复前 `hmac.js:51` / `auth.js:34`）：
```js
if (expected !== String(sig).toLowerCase()) { ... 401 ... }
```
`!==` 是**短路比较**：第一个字符不同就提前返回，比较耗时随前缀匹配长度变化。攻击者（见 Finding B，客户端本就持有密钥 = 任意用户）可对每个字节做高精度计时，逐字节还原出合法签名。

**修复**：
```js
// hmac.js 新增
function constantTimeEqual(a, b) {
  var ba = Buffer.from(String(a).toLowerCase(), 'utf8');
  var bb = Buffer.from(String(b).toLowerCase(), 'utf8');
  if (ba.length !== bb.length) return false;        // 长度不等直接 false，不抛
  return crypto.timingSafeEqual(ba, bb);            // Node 内置时序安全比较
}
// verify() 与 auth.js 统一改用 hmac.constantTimeEqual(sig, expected)
```

**为什么这里尤其危险**：本产品密钥下放到浏览器（Finding B），「攻击者」= 任何能打开 DevTools 的用户。他能构造已知 `mid/ts/nonce/path` 的请求，只对签名做时序爆破。时序比较一旦关闭，爆破即不可行。

### 🟡 Finding B：客户端明文持有密钥（架构事实，写清威胁模型）

`web/js/hmac-spec.js:16` 把 `HMAC_KEY` 发到浏览器。这意味着：
- ✅ 能做的：**身份识别 / 防匿名扫描 / 防随手乱调**
- ❌ 不能做的：**保密（密钥公开）/ 防持有客户端的用户伪造**

这是「machine-id 体系」的有意设计，不是 bug。但**必须在文档里写清威胁模型**，否则团队会误以为「加了 HMAC 就安全了」。建议部署时通过 `HMAC_SECRET` 环境变量覆盖默认密钥（已支持），避免全网共用一个写死的值。

### 🟡 Finding C：8 hex（4 字节）签名前缀（设计权衡，仅文档化）

`SIGN_PREFIX_LEN = 8`。SHA256 前 4 字节 = 2³² 空间。在「nonce 一次性 + 时间戳 5 分钟窗 + 时序安全」三重控制下可接受。**但不可单改**：Android 端、keygen、worker 脚本全用同一契约，改长会全线失效。列为未来协议升级项，不在本次动。

### 🟡 Finding D：重放防护的内存局限（加固项，仅文档化）

`auth.js` 的 `nonceCache` 是**进程内存 Map**：
- 服务重启 → 缓存清空 → 5 分钟窗内的抓包请求可重放
- 无 TTL 清扫 → 过期 nonce 要等 FIFO 到 1万条才淘汰

本地单机应用风险低；若上云，建议：持久化 nonce 集合 或 给 nonce 加 TTL 清扫。

### 🟢 正面范例：nonce 用 `crypto.randomBytes`（已正确）

`hmac.js:29` 用 `crypto.randomBytes(4)`、`hmac-spec.js` 用 `crypto.getRandomValues`——**都是密码学安全随机源**。这正是 7/15 早些时候抽共享库时根除的 `Math.random()` 隐患。保留，作为团队随机源规范的正面样板。

---

## 3. 给团队的 5 条 HMAC 纪律

1. **签名比较永远用 `crypto.timingSafeEqual`**，绝不用 `===`/`!==`/字符串相等。
2. **密钥不在客户端当机密**：写清「这层只防匿名，不防持有者」。部署换 `HMAC_SECRET` 环境变量。
3. **待签消息格式三端一份**：改 `buildMessage` 必须同步 `hmac.js` + `hmac-spec.js`，并跑 `test:hmac`。
4. **nonce 必须密码学随机**（`randomBytes`/`getRandomValues`），禁用 `Math.random()`。
5. **认证代码要测「拒绝路径」**：合法过、篡改拒、缺头拒——三条都进 CI（见 `verify/_hmac_audit.mjs`）。

---

## 4. 本次交付与验证

- **修复**：`hmac.js` 加 `constantTimeEqual` 并用于 `verify()`；`auth.js` 改用 `hmac.constantTimeEqual`。
- **测试**：新增 `verify/_hmac_audit.mjs`（11 断言，CI 固化），`package.json` 加 `test:hmac` 并入主 `test` 链。
- **结果**：`npm test` 全绿；活跃验证 合法→200 / 篡改→401。
- **服务**：已重启，修复生效。备份 `Back/safe_20260715_140444/`、`Back/safe_20260715_140445/`。
