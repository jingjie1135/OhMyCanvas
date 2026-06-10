# Agent Notes: OhMyCanvas 二开维护指南

本仓库是基于上游的二开项目。后续合并更新时，先把本文件当作冲突解决参考：上游改动优先吸收，但下列二开行为属于本仓库当前保留项，除非用户明确要求，不要在冲突中误删或改回上游默认。

## 仓库关系

- 当前 fork：`https://github.com/jingjie1135/OhMyCanvas.git`
- upstream 仓库：`https://github.com/mcnxiaoyu-ctrl/Infinite-Canvas`
- 默认分支：`main`

## 二开保留项

### 1. OhMyCanvas 品牌、链接与推荐入口

本仓库已从上游 Infinite Canvas 重品牌为 OhMyCanvas / 镜界-无限画布。合并上游或批量替换链接时，不要把这些值改回上游默认：

- 项目维护标识：`OhMyCanvas`
- 页面标题 / 中文项目名：`镜界-无限画布`
- 当前项目主页：`https://github.com/jingjie1135/OhMyCanvas`
- README 原项目署名保留为：`https://github.com/hero8152/Infinite-Canvas`
- 作者/维护者：`小雨小面@wuli大雄`
- B站主页：`https://space.bilibili.com/1499434734`
- 抖音主页：`https://v.douyin.com/p4UBiAsIVdI`
- 小红书 / YouTube / X 目前是字面占位：`占位`

推荐 API 与商业链接也属于本仓库二开保留项：

- 推荐 API 1：`镜界AI`
  - Base URL：`https://mirror.zeabur.app`
  - 默认保存协议：`openai`
  - `model_protocols` 中保留 Gemini / 即梦逐模型协议覆盖。
- 推荐 API 2：`Agnes AI`
  - Base URL：`https://apihub.agnes-ai.com`
  - 默认保存协议：`openai`；图片请求模式：`openai-json`。
- 推荐 API 3/4：`占位（广告位招租）`
- RunningHub RH 币国内链接：`https://www.runninghub.cn/?inviteCode=55fa0e9e`
- RunningHub RH 币国外链接：`https://www.runninghub.ai/?inviteCode=q0ozo24o`
- RunningHub 账户余额国内/国外链接目前是字面占位：`占位`
- AI 账号订阅链接：`https://bewild.ai?code=LSAOCVPC`

更新源策略：

- GitHub 更新源指向当前 fork：`jingjie1135/OhMyCanvas`。
- ModelScope 更新源当前没有真实替代地址，相关 URL 保持字面值 `占位`。
- ModelScope LoRA / 模型 ID 不要重品牌，保留：`Daniel8152/film`、`Daniel8152/Qwen-Image-2512-Film`、`Daniel8152/Klein-enhance`。
- 内置一键更新保持禁用；文案应提示 OhMyCanvas 使用 Git 手动同步，避免远程更新覆盖二开改动。

### 2. Firefly / Adobe 生图路由

- `firefly-*` 图像模型走 `chat-completions` 是有意设计，不是 bug。
- 不要因为看到 `image_generation_endpoint` 或旧 404 记录，就把 Firefly 自动改回 `/v1/images/generations`。
- 如果上游改动触碰 `main.py` 中这些函数，合并时必须人工复核：
  - `image_generation_uses_chat_completions`
  - `is_chat_completions_endpoint`
  - `image_chat_completions_url`
  - `generate_ai_image`

### 3. 参考图与公网媒体请求修复

本仓库保留了参考图/API 调用相关修复：

- chat-completions 图片内容使用结构化 `messages[].content`：文本块 + `image_url` 块。
- 发送给上游的参考图必须是公网 URL 或 data URL，不应把 `/assets/...`、`/output/...`、`file:`、`blob:`、Windows 本地绝对路径直接交给上游。
- APIMart 包装响应需要兼容类似 `{"code": 200, "data": {"choices": [...]}}` 的结构。
- GPT-Image-2 / 参考图相关分支如果冲突，合并后必须重新验证参考图 payload 和响应解析。

### 4. Zeabur / Docker 部署适配

本仓库加入了 Zeabur 部署模板和 Docker 部署适配，合并上游时不要误改回上游仓库信息：

- `zeabur-template.yaml` 应指向 `jingjie1135/OhMyCanvas`。
- repo ID 应保持为当前 fork 的仓库 ID：`1257591912`。
- 图标 raw URL 应使用当前 fork 的 `赞赏.png`。
- `PUBLIC_BASE_URL` / `PUBLIC_MEDIA_BASE_URL` 需要是真实公网域名；不要配置成不可解析的占位域名。

### 5. 静态资源版本与缓存破坏

本仓库通过 `VERSION` 和静态 HTML 里的 query string 做缓存破坏。

- 当前 `VERSION` 与 `static/*.html` 资源 query 应保持同步。
- 合并上游如触碰 `static/index.html`、`static/api-settings.html`、`static/create.html`、`static/tools.html`、`static/settings.html` 或其它入口 HTML，要检查 `?v=` 是否仍和 `VERSION` 一致，并确认品牌/链接没有被上游覆盖。

### 6. 本地运行态与敏感文件忽略

`.gitignore` 中保留了本地运行态和敏感文件忽略规则：

- `.env`、`API/.env`
- `data/`、`output/`、`history.json`、`global_config.json`
- `assets/input/`、`assets/output/`、`assets/library/`
- `workflows/custom/`
- `.omo/`、`.opencode/`
- 嵌入式 Python 运行目录：`python/Lib/`、`python/Scripts/`

合并上游时不要把这些本地状态文件重新纳入版本控制。


### 7. Agent 执行纪律、验证优先级与服务命令规则

本节是给未来 Agent 的硬规则，不是变更日志。目标是防止无上下文乱改、过度浏览器 QA、服务命令傻等、静默失败和二开保留项被误删。

#### 7.1 先理解，再改动

- 改 `main.py` 前，先定位现有 provider、endpoint、响应解析、错误处理和任务队列逻辑；不得没读调用链就新增平行实现。
- 改 `static/js/canvas.js`、`static/js/smart-canvas.js`、`static/gpt-chat.html` 前，先搜索已有状态、DOM helper、画布节点/连线/资源处理逻辑。
- 改 API 设置或推荐入口时，必须同时核对 `static/js/api-settings.js`、`static/js/i18n/api-settings.js`、`static/api-settings.html` 和 `main.py` provider 默认值是否需要同步。
- 涉及上游合并时，先读本文件的二开保留项，再吸收上游；不要让上游默认值覆盖 OhMyCanvas 行为。

#### 7.2 复用优先，禁止重复造轮子

- 写新函数、弹窗、请求封装、响应解析、状态映射前，先 `rg` 搜索同类实现。
- 已有能力可扩展时优先扩展；稳定业务规则重复出现时必须收敛到单一入口。
- 少量尚未稳定的 UI 结构可暂时重复；但 API 协议、模型协议、错误解析、路径转换、品牌链接、推荐配置不得多处各写一套。

#### 7.3 无限画布热路径性能守则

- `mousemove`、`wheel`、拖拽、缩放、框选、节点移动、连线重绘、资源列表刷新属于热路径。
- 热路径中禁止无必要全量扫描、大对象/大数组反复创建、深拷贝、重复 JSON 序列化、批量 DOM 重排。
- 能用缓存、`Map` / `Set` / 索引表、局部更新、事件节流/防抖解决的，不保留每帧全量计算。

#### 7.4 交互红线与防误触

- 数值输入、seed、steps、cfg、宽高、强度、帧数等参数控件必须避免鼠标滚轮误改；滚轮应优先服务页面/画布滚动与缩放。
- 改动可见 UI 时，必须考虑桌面/移动、浅色/深色、遮挡/溢出/点击区域；但优先用静态断言和针对性检查，不能默认浏览器长时间巡检。

#### 7.5 错误处理与兼容边界

- 外部 API、参考图处理、任务队列、文件读写、RunningHub/ModelScope/ComfyUI/Firefly/APIMart 调用失败不得静默吞异常。
- 如需降级，必须有明确触发条件、日志或用户可见错误；禁止空 `catch`、返回 `None`/空对象后继续假装成功。
- 不加“以防万一”的旧字段、旧协议、旧 endpoint、polyfill 或影子参数；只有已存在的持久化配置、用户数据或外部接口契约才需要兼容。

#### 7.6 验证优先级与本地服务命令

- 验证优先级从轻到重：`py_compile` / LSP / `rg` 静态断言 / 小脚本断言 / `curl` API；浏览器或 Playwright 只作为最后手段。
- 只有改动真实用户浏览路径、DOM/iframe/交互、CSS 可见状态，或轻量断言无法覆盖时，才打开浏览器验证；不要每次修改后默认浏览器 QA。
- 普通命令等 exit code；`python\python.exe main.py`、`run.bat`、`uvicorn` 这类服务命令等 readiness。
- 不要把服务命令以前台普通命令运行后等待退出；成功启动后它会持续监听端口，不会主动结束。
- QA 需要启动服务时，用 `Start-Process` 后台启动并记录 PID，轮询 `http://127.0.0.1:3000/api/app-info` 返回 200 后再继续，QA 完必须 `Stop-Process -Id <pid> -Force` 并确认 3000 端口清空。

#### 7.7 输出证据与质量红线

- 最终回复必须列出：改动文件、关键改动、验证命令与结果、未验证项及原因、当前 git 状态；如启动过服务，还要说明 PID 已停止、3000 端口已清空、临时产物已清理。
- 禁止用“应该/看起来/可能好了”替代证据；无法验证就直说原因。
- 任一情况出现即视为未完成：二开品牌/链接被上游覆盖、Firefly 被改回 images endpoint、本地路径直接交给上游图片 API、APIMart 包装响应解析失效、前台服务命令傻等、默认浏览器 QA、留下服务进程或 `.playwright-mcp`、留下启动自动生成的无关 cache-bust 脏 diff。

## 常见冲突热点

### `main.py`

重点关注 API provider、图像生成、参考图、任务队列和错误处理相关冲突。

合并原则：

1. 上游新增平台或协议可以吸收。
2. 本仓库 Firefly 走 chat-completions 的设计必须保留。
3. 参考图转公网/data URL、APIMart 包装响应解析等二开修复必须保留。
4. 项目更新相关常量应指向 `jingjie1135/OhMyCanvas`；ModelScope 更新 URL 保持 `占位`，不要误改成旧上游或不存在的替代源。

### `static/`

重点关注：

- `static/js/canvas.js`
- `static/js/smart-canvas.js`
- `static/gpt-chat.html`
- `static/index.html`
- `static/api-settings.html`
- `static/js/api-settings.js`
- `static/js/i18n/api-settings.js`
- 各入口 HTML 的版本 query

合并原则：保留上游 UI/功能更新，但不要覆盖 OhMyCanvas 品牌、社媒链接、推荐 API、RunningHub 引导、Bewild 订阅链接、更新源禁用文案；同时检查静态资源版本 query 是否与 `VERSION` 同步。

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
