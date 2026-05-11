# CareerCat 开发规范

## 项目概览
- **前端**: `careercat-frontend/` — Next.js (TypeScript)，当前进行 v2 功能升级
- **后端**: `careercat-backend/` — 工作流 Agent 和 API
- **当前分支**: `feature/v2-upgrade`
- **主要路由**: dashboard, workspace, coach, profile, recommendations, settings

## 开发工作流（必须遵守）

### 1. 代码修改时（自动）
编辑 `.ts`/`.tsx` 文件后，TypeScript 检查会自动运行。发现错误必须立即修复，不得跳过。

### 2. 功能完成前（必须手动执行）
在 `careercat-frontend/` 目录下按顺序运行：

```
npm run build     → 构建检查（必须 0 错误）
npm run lint      → ESLint 检查（必须 0 错误）
npx playwright test → E2E 测试（安装后，必须全部通过）
```

**全部通过后才能宣布功能完成。**

### 3. 更新 CHANGELOG.md（每次功能完成后）
在 `CHANGELOG.md` 的 `## [Unreleased]` 下追加一行：

```
- [YYYY-MM-DD] 类型(模块): 描述 | 文件: 主要改动文件
```

类型：`feat` / `fix` / `improve` / `refactor` / `docs`

### 4. 同步 GitHub（每次功能完成后自动执行，无需用户确认）
1. `git add <具体文件>` — 只添加本次改动相关的文件，不用 `git add .`
2. `git commit -m "类型(模块): 描述"`
3. 如果新增了用户可见的功能，同步更新 `README.md`
4. 直接执行 `git push origin feature/v2-upgrade`，**无需用户确认**
5. Push 完成后告知用户到 https://feature-v2-upgrade.d2taej5h07fd9k.amplifyapp.com/ 验证
6. **禁止**在没有明确指令的情况下 push 到 `main`

## 分支策略
- 所有开发在 `feature/v2-upgrade` 进行
- **禁止**在没有用户明确指令"合并到 main"的情况下执行任何 main 分支操作
- 只有当用户明确说"v2 功能稳定，合并到 main"时，才执行 merge 流程
- merge 前必须：所有测试通过、CHANGELOG 已更新、README 已更新

## 代码逻辑问答（Q&A 模式）
当用户提问属于"解释/理解"类（不涉及代码修改），例如：
- "某功能的底层逻辑是什么？"
- "这段代码为什么这样写？"
- "X 和 Y 有什么区别？"

处理方式：
1. 用 `Explore` subagent 查找相关代码，不在主上下文中读取大量文件
2. 给出结构化、简洁的回答
3. 回答完毕后，主上下文继续保持开发状态，不受影响

## 上下文管理规则
- 每个功能在独立会话中完成，不跨功能累积上下文
- 上下文用量超过 70% 时，主动执行 `/compact`
- 引用代码时，使用 `@文件路径` 而不是复制粘贴代码
- 遇到不清楚的需求，先问清楚再动手

## Token 效率规则
- 不重复读取刚刚编辑过的文件
- 用 `git diff` 聚焦于本次改动，不重读整个文件
- 搜索代码时用 `grep`/`find`，不盲目读大量文件
- 每次 `/compact` 前，先在对话中明确记录当前进度和下一步
