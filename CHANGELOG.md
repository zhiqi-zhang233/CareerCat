# CareerCat Changelog

所有重要功能变更、修复和改进均记录于此。

格式：`- [YYYY-MM-DD] 类型(模块): 描述 | 文件: 主要改动文件`

---

## [Unreleased]

- [2026-05-11] feat(auth): 重设计登录/注册 UI，与首页设计语言统一，使用设计 token 和 cc-* 组件类 | 文件: components/AuthGate.tsx
- [2026-05-11] feat(auth): 新增忘记密码 + 重置密码完整流程（Cognito forgotPassword / confirmPassword） | 文件: lib/AuthContext.tsx
- [2026-05-11] improve(auth): 邮箱验证步骤改为独立 verify view，显示目标邮箱，更清晰的说明文字 | 文件: components/AuthGate.tsx
- [2026-05-11] improve(auth): 新增密码显示/隐藏切换、密码强度提示、确认密码字段 | 文件: components/AuthGate.tsx
- [2026-05-11] feat(i18n): 扩充登录注册相关 i18n key，中英双语 | 文件: lib/i18n/dictionaries.ts
- [2026-05-11] improve(auth): 注册/登录页背景改为首页浅奶油色，文字改深色 | 文件: components/AuthGate.tsx
- [2026-05-11] improve(settings): 账号页移除技术性 ID 展示，改为仅显示邮箱；新增危险区注销功能 | 文件: app/(app)/settings/page.tsx
- [2026-05-11] feat(settings): 注销账号需邮箱验证码确认，提醒用户数据永久删除 | 文件: app/(app)/settings/page.tsx
- [2026-05-11] feat(backend): 新增用户注销 API（POST /user/request-deletion, DELETE /user），邮件验证码 + 永久删除 Cognito 用户及所有 DynamoDB 数据 | 文件: careercat-backend/app/routers/user.py, app/services/dynamodb_service.py
- [2026-05-11] feat(i18n): 补充 settings 模块 emailLabel、cancel、deleteCodeSentInfo 中英文 key | 文件: lib/i18n/dictionaries.ts
- [2026-05-11] improve(auth): 去除页面加载时的 loading 卡片，auth 检测期间返回 null，避免页面切换闪屏 | 文件: components/AuthGate.tsx
- [2026-05-11] feat(workspace): 工作台对话内嵌交互操作（inline actions）—— 文件上传、页面导航、快速选项、解析后确认/继续 | 文件: components/InlineActionWidget.tsx, app/(app)/workspace/page.tsx, lib/types.ts
- [2026-05-11] feat(backend): Orchestrator 新增 inline_actions 字段生成，含 fallback 逻辑；max_tokens 升至 1500 | 文件: careercat-backend/app/schemas/agent.py, app/services/agent_assist_service.py, app/services/workflow_agent_registry.py

---

## [v2.0.0-beta] - 2026-05-11

### 新增功能
- [2026-05-11] feat(workspace): v2 聊天式 Agent 工作区，支持建议操作、历史记录和 PaintingCanvas | 文件: app/(app)/workspace/
- [2026-05-11] feat(dashboard): Kanban 看板视图，支持列表/看板切换 | 文件: app/(app)/dashboard/
- [2026-05-11] feat(backend): 工作流 Agent、注册表和持久化工作流历史 | 文件: careercat-backend/

### 改进
- [2026-05-11] polish(nav): 应用导航和本地化优化 | 文件: components/, app/layout.tsx

### 文档
- [2026-05-11] docs(arch): v2 架构和实现指南 | 文件: docs/

---

## [v1.x] - 历史版本

*v2 升级前的历史版本，详见 git log*
