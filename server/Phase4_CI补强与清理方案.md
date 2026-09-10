# Phase 4：CI 补强并入主流水线 + 遗留目录清理

> 日期：2026-09-07　状态：CI 完成；清理已执行（移入隔离区，可恢复）
> 前置：Phase 3.1（择日助手）/ Phase 3.2（八字联动·本命合参）已收口

## 一、目标
1. 把分散的 `verify_*` / `check_*` 审计与验证脚本统一并入 `npm test` 主流水线。
2. 清理 `Back/` / `build/` 等遗留目录（**不可逆，需用户确认**）。

## 二、CI 补强（已完成 ✅）

### 2.1 package.json 改动（`server/package.json`）
- 新增聚合脚本 `test` —— 串联 17 个回归子项，fail-fast：
  `override → override-noref → noref2 → godsmeta → godsmeta-ui → choose → choose-ui → choose-e2e → dst → bazi-dst → yiji → zishi → hongsha → hongsha-ui → guansha → gods → remaining`
- 新增 `test:legacy` —— 老阶段（bazi/ziwei 独立）脚本，按需运行，不阻塞主流水线：
  `daymaster → congge → p2 → hmac-fallback → insecure → ziwei-override → ziwei-patterns`
- 补登此前遗漏的两个红砂脚本：
  - `test:hongsha` → `node verify_hongsha_impl.js`（纯函数，9/9）
  - `test:hongsha-ui` → `node check_hongsha_ui.js`（Playwright e2e，11/11）

### 2.2 主流水线当场捕获并修复的真实回归
聚合后首次整跑即暴露两个问题（修复后端到端全绿）：

**问题 A —— 红砂旧文案「红砂日」未彻底替换（真实 bug）**
- `routes/calendar.js:485` 的宜忌后置注入仍写 `'红砂日（小红砂·忌百事）'`，
  而前端 `web/js/detail-ui.js` 角标已统一为「小红砂（凶）」/「大红砂（吉）」。
  `/day` 接口 `bad[]` 同时含 lunisolar 原生「红砂日」与本程序注入项，详情页仍出现旧词。
- 修复：`calendar.js:485` → `bad.push('小红砂（凶·忌百事）')`；同步 `verify_yi_ji.js:22` 断言字符串。
- **关键坑**：改 `server/` 需重启。首次 `taskkill //PID 13336 //F` 返回 exit 23 未真正杀掉旧进程，
  端口 3000 仍被旧 server 占用，新进程 EADDRINUSE 退出 → 一直跑旧代码、红砂检查反复失败。
  改用 `PowerShell Stop-Process -Id 13336 -Force` 强杀后重启（新 PID 390），探针确认 `contains 红砂日? === false`。
- 教训：重启 server 后务必用探针/`netstat` 校验端口归属进程，不能只看 health 401。

**问题 B —— choose-e2e 偶发 404 控制台噪声（flaky，非真实 bug）**
- `check_choose_ui.js` 的 console 监听**未过滤** `Failed to load resource` 类网络噪声，
  在整跑负载下偶发 404 控制台报错导致误判失败；隔离复现全流程 0 错误、0 4xx，确认为浏览器资源抖动。
- 修复：对齐 `check_hongsha_ui.js` 过滤逻辑
  `page.on('console', m => { if (m.type()==='error' && !/Failed to load resource/.test(m.text())) errors.push(...) })`
  仍保留 `pageerror`（真实 JS 异常）作为失败条件。

### 2.3 验证结果
`npm test` 全流程 **17/17 步骤 0 失败**（hongsha 9/9、hongsha-ui 11/11、其余均 EXIT=0）。

## 三、遗留目录清理（已执行 ✅，移入隔离区）

> 安全策略：因 `Back/`(42M) 与 `.build/`(1.9M) 不在 git、**删除不可恢复**，未用 `rm` 永久删除，
> 而是整体 **移入 `H:/Phone/.trash_phase4/` 隔离区**（≈55M）。原始路径已清空、运行时不受影响（这些目录均不被 server 静态服务），
> 数据仍可还原；如需永久清除，二次确认后再清空隔离区。

| 目录（原路径） | 体积 | git 状态 | 现位置 | 可恢复性 |
|---|---|---|---|---|
| `server/_shots/` + `server/_footer_shots/` | 548K | 未跟踪 | `.trash_phase4/server/` | 可重生 ✅ |
| `build/` | 11M | **已跟踪** | `.trash_phase4/build/` | git 亦可恢复 ✅ |
| `.build/` | 1.9M | gitignored | `.trash_phase4/.build/` | 仅隔离区可还原 ⚠️ |
| `Back/` | 42M | gitignored | `.trash_phase4/Back/` | 仅隔离区可还原 ⚠️ |

- `git status` 显示 `build/` 下 98 个跟踪文件为 `D`（已移出工作树），`git checkout`/`git restore` 可一键恢复。
- `core/`（gongxin-core 依赖，已跟踪）**不纳入清理**。
- 根目录大量零散 `.md`/`.png`/`.mjs` 调试产物：多为在档文档或 ziwei/bazi 诊断脚本，**超出本 Phase 范围**，建议单独人工复核，不批量删。
- server 已验证仍健康（health 401）。

## 四、下一步
- 用户确认清理范围后，按「先备份可信目录、小批量、回收站/trash 机制」执行（Back/ 与 .build/ 不可恢复，须显式二次确认）。
- 标记 Phase 4 完成，更新 MEMORY。
