# Claude Code Skills 参考手册

> 生成日期：2026-05-29 | Superpowers v5.1.0
> 项目：公信万年历 (h:\Phone)

---

## 一、开发流程管控（Superpowers 核心套件）

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **superpowers:brainstorming** | 苏格拉底式需求对话，产出设计文档，禁止在批准前写代码 | 新功能/大改动前，需求不明确时 |
| **superpowers:writing-plans** | 将需求拆解为 2-5 分钟的 TDD 微任务，精确到文件路径和完整代码 | 需求明确后，开始编码前 |
| **superpowers:executing-plans** | 按计划逐任务执行，每批完成后设人工检查点 | 计划审批后，批量执行任务 |
| **superpowers:subagent-driven-development** | 每个任务派发给独立子 Agent，完成后经两阶段审查（规格合规→代码质量） | 多任务并行时，需严格质量把控 |
| **superpowers:test-driven-development** | 强制 RED-GREEN-REFACTOR 循环（先写测试→运行失败→写代码→通过→重构） | 需要 TDD 质量保障的功能开发 |
| **superpowers:finishing-a-development-branch** | 清理分支、更新文档、合并/PR/丢弃，完整收尾流程 | 开发分支完成，准备合入主干 |
| **superpowers:using-git-worktrees** | 创建隔离的 Git 工作树，保护主线不被误改 | 开始任何代码修改前 |

### 日常开发推荐工作流

```
/superpowers:brainstorming          → 需求分析，产出设计文档
        ↓
/superpowers:using-git-worktrees    → 创建隔离分支
        ↓
/superpowers:writing-plans          → 拆解为微任务计划
        ↓
/superpowers:executing-plans        → 逐批执行 + 检查点
        ↓
/superpowers:finishing-a-development-branch  → 清理合入
```

---

## 二、代码质量与审查

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **superpowers:requesting-code-review** | 提交前的自检清单，关键问题阻断合入 | 代码完成，提交 PR 前 |
| **superpowers:receiving-code-review** | 结构化处理审查反馈，系统应答每条意见 | 收到他人 Code Review 后 |
| **code-review** | 审查当前 diff 中的正确性 Bug + 复用/简化/效率清理 | 代码修改后，推送前自查 |
| **simplify** | `/code-review --fix` 的快捷方式，审查并直接修复 | 快速自审 + 自动修复 |
| **review** | 审查 GitHub PR 的 diff，分析代码质量和风险 | 审查其他人的 PR |
| **security-review** | 安全专项审查 | 涉及鉴权、加密、输入校验等敏感代码 |

---

## 三、调试与验证

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **superpowers:systematic-debugging** | 4 阶段根因分析：界定范围 → 隔离变量 → 定位根因 → 修复 | 遇到 Bug，原因不明 |
| **superpowers:verification-before-completion** | 验证修复是否真正解决问题，确保不回退 | Bug 修复后，关闭前 |
| **verify** | 运行 App 实际观察行为，确认改动生效 | 需要手动测试/截图验证时 |
| **loop** | 按间隔重复执行命令（如每 5 分钟检查部署状态） | 需要轮询、持续监控 |

---

## 四、UI 设计与前端

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **ui-ux-pro-max** | 设计智能数据库：67 风格、96 调色板、57 字体配对、99 UX 准则、25 图表、13 技术栈 | 设计 UI、选配色/字体、UX 审查 |
| **frontend-design** | 生产级前端界面生成，避免通用 AI 审美 | 创建网页/组件/落地页/Dashboard |

### UI 设计工作流

```
/ui-ux-pro-max <产品类型> <风格关键词>    → 生成设计系统
/frontend-design                          → 生成生产级代码
```

---

## 五、项目初始化与配置

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **init** | 扫描项目结构，生成 CLAUDE.md 代码库文档 | 新项目、现有项目首次接入 Claude Code |
| **update-config** | 管理 settings.json：权限、环境变量、Hook 配置 | 添加权限、配置自动化规则 |
| **keybindings-help** | 自定义键盘快捷键 | 改键绑定、添加快捷键 |
| **fewer-permission-prompts** | 扫描历史记录，自动生成权限白名单，减少弹窗 | 权限提示太多时 |

---

## 六、开发辅助

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **superpowers:writing-skills** | 创建新的自定义 Skill | 需要封装重复工作流为 Skill |
| **superpowers:dispatching-parallel-agents** | 并行调度多个子 Agent 执行独立任务 | 多个互不依赖的任务需同时推进 |
| **superpowers:using-superpowers** | Superpowers 使用指南和最佳实践 | 首次使用或查阅工作流 |
| **run** | 启动项目 App，驱动浏览器验证改动 | 需实际运行应用确认效果 |

---

## 七、API 与后端

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **claude-api** | Claude API / Anthropic SDK 开发、调试、模型迁移（含 Prompt Caching） | 代码中 import 了 `anthropic` SDK，或调优 API 参数 |

---

## 八、文件处理

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **pdf** | PDF 文件读取与生成 | 读取/生成 PDF |

---

## 九、专项分析

| Skill | 作业 | 触发时机 |
|-------|------|---------|
| **aihot** | AI 热度分析 | AI 趋势数据分析 |
| **hv-analysis** | HV 分析 | HV 相关分析任务 |
| **khazix-writer** | Khazix 写作 | 特定内容创作风格 |
| **neat-freak** | 代码整洁度检查和修复 | 清理/规范化代码 |

---

## 调用方式

所有 Skill 在 Claude Code 对话框中通过 `/<skill-name>` 调用：

```
/superpowers:brainstorming
/ui-ux-pro-max
/code-review
/systematic-debugging
```

Superpowers 系列需带命名空间前缀 `superpowers:`，内置 Skills 可直接调用。

## 自动触发（本项目配置）

本项目的 [CLAUDE.md](CLAUDE.md) 已配置自动调用规则，以下场景会自动触发对应 Skill：

| 场景 | 自动触发 |
|------|---------|
| 创建新功能/组件 | `brainstorming` |
| 遇到 Bug | `systematic-debugging` |
| UI 界面设计 | `ui-ux-pro-max` 或 `frontend-design` |
| 代码审查 | `requesting-code-review` |
| 任务完成 | `verification-before-completion` |
| 上下文 670% | 自动执行 `/compact` |
