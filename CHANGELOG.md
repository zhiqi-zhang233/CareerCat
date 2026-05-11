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
