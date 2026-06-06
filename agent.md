# Agent Notes: OhMyCanvas 二开维护指南

本仓库是基于上游 `mcnxiaoyu-ctrl/Infinite-Canvas` 的二开项目。后续合并上游更新时，先把本文件当作冲突解决参考：上游改动优先吸收，但下列二开行为属于本仓库当前保留项，除非用户明确要求，不要在冲突中误删或改回上游默认。

## 仓库关系

- 当前 fork：`https://github.com/jingjie1135/OhMyCanvas.git`
- 上游仓库：`https://github.com/mcnxiaoyu-ctrl/Infinite-Canvas.git`
- 默认分支：`main`
- 合并上游前建议新建临时分支，先读 `git diff upstream/main...main` 和近期提交，再处理冲突。

## 二开保留项

### 1. Firefly / Adobe 生图路由

- `firefly-*` 图像模型走 `chat-completions` 是有意设计，不是 bug。
- 不要因为看到 `image_generation_endpoint` 或旧 404 记录，就把 Firefly 自动改回 `/v1/images/generations`。
- 如果上游改动触碰 `main.py` 中这些函数，合并时必须人工复核：
  - `image_generation_uses_chat_completions`
  - `is_chat_completions_endpoint`
  - `image_chat_completions_url`
  - `generate_ai_image`

### 2. 参考图与公网媒体请求修复

本仓库保留了参考图/API 调用相关修复：

- chat-completions 图片内容使用结构化 `messages[].content`：文本块 + `image_url` 块。
- 发送给上游的参考图必须是公网 URL 或 data URL，不应把 `/assets/...`、`/output/...`、`file:`、`blob:`、Windows 本地绝对路径直接交给上游。
- APIMart 包装响应需要兼容类似 `{"code": 200, "data": {"choices": [...]}}` 的结构。
- GPT-Image-2 / 参考图相关分支如果冲突，合并后必须重新验证参考图 payload 和响应解析。

### 3. Zeabur / Docker 部署适配

本仓库加入了 Zeabur 部署模板和 Docker 部署适配，合并上游时不要误改回上游仓库信息：

- `zeabur-template.yaml` 应指向 `jingjie1135/OhMyCanvas`。
- repo ID 应保持为当前 fork 的仓库 ID：`1257591912`。
- 图标 raw URL 应使用当前 fork 的 `赞赏.png`。
- `PUBLIC_BASE_URL` / `PUBLIC_MEDIA_BASE_URL` 需要是真实公网域名；不要配置成不可解析的占位域名。

### 4. 静态资源版本与缓存破坏

本仓库通过 `VERSION` 和静态 HTML 里的 query string 做缓存破坏。

- 当前 `VERSION` 与 `static/*.html` 资源 query 应保持同步。
- 合并上游如触碰 `static/index.html`、`static/create.html`、`static/tools.html`、`static/settings.html` 或其它入口 HTML，要检查 `?v=` 是否仍和 `VERSION` 一致。

### 5. 本地运行态与敏感文件忽略

`.gitignore` 中保留了本地运行态和敏感文件忽略规则：

- `.env`、`API/.env`
- `data/`、`output/`、`history.json`、`global_config.json`
- `assets/input/`、`assets/output/`、`assets/library/`
- `workflows/custom/`
- `.omo/`、`.opencode/`
- 嵌入式 Python 运行目录：`python/Lib/`、`python/Scripts/`

合并上游时不要把这些本地状态文件重新纳入版本控制。

## 常见冲突热点

### `main.py`

重点关注 API provider、图像生成、参考图、任务队列和错误处理相关冲突。

合并原则：

1. 上游新增平台或协议可以吸收。
2. 本仓库 Firefly 走 chat-completions 的设计必须保留。
3. 参考图转公网/data URL、APIMart 包装响应解析等二开修复必须保留。

### `static/`

重点关注：

- `static/js/canvas.js`
- `static/js/smart-canvas.js`
- `static/gpt-chat.html`
- `static/js/api-settings.js`
- 各入口 HTML 的版本 query

合并原则：保留上游 UI/功能更新，并检查静态资源版本 query 是否与 `VERSION` 同步。

### 部署文件

重点关注：

- `Dockerfile`
- `zeabur-template.yaml`
- `requirements.txt`
- `run.bat` / macOS 启动脚本

合并原则：上游依赖升级可以吸收，但 Zeabur 指向当前 fork 的信息必须保留。

## 合并上游建议流程

```powershell
$env:GIT_MASTER='1'; git fetch upstream
$env:GIT_MASTER='1'; git checkout -b merge-upstream-YYYYMMDD
$env:GIT_MASTER='1'; git merge upstream/main
```

冲突解决后至少运行：

```powershell
python\python.exe -m py_compile main.py
$env:GIT_MASTER='1'; git diff --check
```

若冲突涉及图像生成，还要手动验证：

- Firefly / Adobe 模型仍走 chat-completions。
- 参考图请求体不会把本地路径直接交给上游。
- APIMart 包装响应仍能提取图片。
