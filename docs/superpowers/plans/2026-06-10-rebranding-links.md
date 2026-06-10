# OhMyCanvas Rebranding and Link Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible project branding, author/social links, recommendation links, update-source links, and README/About wording with the supplied OhMyCanvas / 镜界-无限画布 information while preserving upstream attribution and current functional behavior.

**Architecture:** This is a surgical rebrand/link pass. Keep existing UI structure, provider storage format, update-disabled behavior, ModelScope LoRA IDs, Zeabur template, and license text intact; change only the literal strings, links, and documentation sections identified below.

**Tech Stack:** Python FastAPI (`main.py`), static HTML/CSS/JavaScript under `static/`, Studio i18n dictionaries under `static/js/i18n/`, Markdown/text documentation.

---

## Scope

### In scope

- Browser tab title for the main shell becomes `镜界-无限画布`.
- Visible main project/fork identity becomes `镜界-无限画布` / `OhMyCanvas` where appropriate.
- Left sidebar project button text stays controlled by existing i18n: `项目主页` / `Project`.
- Left sidebar project button target becomes `https://github.com/jingjie1135/OhMyCanvas`.
- Author display name becomes `小雨小面@wuli大雄`.
- Social links are replaced with the supplied links or the literal requested value `占位`.
- Recommended API cards are updated so API 1 is `镜界AI`; API 2 and API 3 become explicit advertising placeholders.
- Account subscription invite becomes `https://bewild.ai?code=LSAOCVPC`; title/description stay unchanged.
- RunningHub guide links become the supplied invite URLs or the literal requested value `占位`.
- GitHub update source points at the current fork repository.
- ModelScope update source no longer points at the original project; use a literal placeholder URL string because no real ModelScope replacement was provided.
- README title becomes `OhMyCanvas`, top recommended API section stays, screenshots stay, bottom attribution heading and original repository URL are added.
- README/About content is reorganized in Chinese and reflects the fork identity.

### Out of scope / do not touch

- Do not modify `zeabur-template.yaml`; the user explicitly said the Zeabur template is newly added and should not be touched.
- Do not modify `LICENSE`; keep the original author attribution requirement.
- Do not change ModelScope LoRA IDs:
  - `Daniel8152/film`
  - `Daniel8152/Qwen-Image-2512-Film`
  - `Daniel8152/Klein-enhance`
- Do not remove the existing one-click update disabled guard. Update URLs may be changed, but update execution remains disabled.
- Do not change README screenshots.

## Supplied replacement map

| Item | New value |
|---|---|
| Product display name | `镜界-无限画布` |
| Browser title | `镜界-无限画布` |
| Repository / project homepage | `https://github.com/jingjie1135/OhMyCanvas` |
| Original attribution repository | `https://github.com/hero8152/Infinite-Canvas` |
| Fork/maintenance wording | `OhMyCanvas` |
| Author display name | `小雨小面@wuli大雄` |
| B站 | `https://space.bilibili.com/1499434734` |
| 小红书 | `占位` |
| YouTube | `占位` |
| X | `占位` |
| 抖音 | `https://v.douyin.com/p4UBiAsIVdI` |
| README detailed tutorial | Keep current link unchanged |
| B站无限画布教程 | Keep current link unchanged |
| B站智能画布教程 | Keep current link unchanged |
| API 使用教程 | `占位`; if a clickable URL is required, use the B站主页 as the temporary target |
| 联系/反馈 | `占位`; if a clickable URL is required, use the B站主页 as the temporary target |
| API 1 name | `镜界AI` |
| API 1 base URL | `https://mirror.zeabur.app` |
| API 1 protocols | `openai / gemini / jimeng` |
| API 1 invite/register link | No invite link; see Task 4 handling |
| API 1 summary | `模型种类齐全，图像、视频、LLM 一站覆盖，支持每日签到送积分，适合想低成本尝鲜各类模型的用户。` |
| API 2 | `占位（广告位招租）` |
| API 3 | `占位（广告位招租）` |
| Account subscription link | `https://bewild.ai?code=LSAOCVPC` |
| RunningHub 国内 RH币 Key | `https://www.runninghub.cn/?inviteCode=55fa0e9e` |
| RunningHub 国外 RH币 Key | `https://www.runninghub.ai/?inviteCode=q0ozo24o` |
| RunningHub 国内账户余额 Key | `占位` |
| RunningHub 国外账户余额 Key | `占位` |
| GitHub update source | `https://github.com/jingjie1135/OhMyCanvas` and matching raw/API URLs |
| ModelScope update source | Use placeholder values; do not keep original Infinite-Canvas source |

## Tutorial/contact link locations to explain to the user

The four non-README tutorial/contact items appear in these files:

1. `B站无限画布教程`
   - `运行说明.txt:1`
   - `新手运行与使用教程.md:7`
   - Current behavior: documentation-only links for users reading local setup instructions.
   - Plan: keep unchanged.
2. `B站智能画布教程`
   - `运行说明.txt:2`
   - `新手运行与使用教程.md:8`
   - Current behavior: documentation-only links for users reading local setup instructions.
   - Plan: keep unchanged.
3. `API 使用教程`
   - `运行说明.txt:29`
   - Current behavior: documentation-only helper link for API setup.
   - Plan: replace the old API tutorial reference with the literal text `占位`. If the line must remain clickable, point it at `https://space.bilibili.com/1499434734` as the temporary homepage target.
4. `联系/反馈`
   - `README.md:12`
   - Current behavior: README contact sentence points to the old B站 profile.
   - Plan: change the sentence to say contact/feedback is `占位`; if a clickable URL is needed, use `https://space.bilibili.com/1499434734` until a final contact target exists.

---

## Files to modify

| File | Responsibility in this change |
|---|---|
| `static/index.html` | Main browser title, sidebar project link target, author name/social links, frontend update-source fallback URLs and disabled-update wording. |
| `main.py` | Backend app-info/update constants returned to the frontend. |
| `static/api-settings.html` | Static RunningHub onboarding links rendered before JavaScript takes over. |
| `static/js/api-settings.js` | Recommended API card definitions, account subscription invite link, RunningHub onboarding guide URLs. |
| `static/js/i18n/api-settings.js` | Recommended API summaries/perks and any visible copy needed for placeholder cards. |
| `README.md` | Chinese About/rebrand documentation, top recommended API links, preserved screenshots, bottom upstream attribution. |
| `运行说明.txt` | Documentation-only API registration/base URL/tutorial references. |
| `新手运行与使用教程.md` | Documentation-only project name/API recommendation wording. |
| `agent.md` | Maintenance notes should reflect the user-specified upstream attribution URL if this repo’s documentation is expected to use that source consistently. |

## Files to inspect but not modify

| File | Reason |
|---|---|
| `zeabur-template.yaml` | User explicitly said not to touch it. It already references `jingjie1135/OhMyCanvas`. |
| `LICENSE` | Preserve original attribution/legal requirements. |
| `static/enhance.html`, `static/klein.html`, `main.py` LoRA list | Preserve `Daniel8152/...` ModelScope LoRA IDs. |

---

## Implementation tasks

### Task 1: Main shell title, project link, author block

**Files:**
- Modify: `static/index.html:8`
- Modify: `static/index.html:1461-1504`
- Modify: `static/index.html:1648-1656`
- Modify: `static/index.html:2105-2109`
- Modify: `static/index.html:2185-2186`

- [ ] **Step 1: Change the main browser tab title**

Replace:

```html
<title>AI Studio</title>
```

with:

```html
<title>镜界-无限画布</title>
```

- [ ] **Step 2: Keep the project button label and update its target**

Leave this existing label unchanged:

```html
<span class="side-pill-text" data-i18n="common.project">项目主页</span>
```

Change the JavaScript project URL constant from:

```js
const PROJECT_URL = 'https://github.com/hero8152/Infinite-Canvas';
```

to:

```js
const PROJECT_URL = 'https://github.com/jingjie1135/OhMyCanvas';
```

- [ ] **Step 3: Update the author display name**

Replace:

```html
<div class="author-name-lite">wuli大雄</div>
```

with:

```html
<div class="author-name-lite">小雨小面@wuli大雄</div>
```

- [ ] **Step 4: Replace social links**

Update existing anchors in the sidebar author block as follows:

```html
<a href="https://space.bilibili.com/1499434734" target="_blank" class="social-icon-lite">
```

```html
<a href="占位" target="_blank" class="social-icon-lite">
```

```html
<a href="占位" target="_blank" class="social-icon-lite">
```

```html
<a href="占位" target="_blank" class="social-icon-lite">
```

Add a fifth social anchor for 抖音 after the X anchor, reusing the same `social-icon-lite` class:

```html
<a href="https://v.douyin.com/p4UBiAsIVdI" target="_blank" class="social-icon-lite" aria-label="抖音">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.5 2c.35 2.1 1.64 3.9 3.5 4.83V10c-1.24-.04-2.45-.38-3.5-.98v5.56A5.42 5.42 0 1 1 11.08 9.17c.33 0 .66.03.97.09v3.26a2.18 2.18 0 1 0 1.2 1.95V2h3.25Z" />
    </svg>
</a>
```

- [ ] **Step 5: Update frontend update-source fallbacks**

Replace the `appInfo` default with:

```js
let appInfo = {
    version:'',
    repo_url:PROJECT_URL,
    version_url:'https://raw.githubusercontent.com/jingjie1135/OhMyCanvas/main/VERSION'
};
```

Replace GitHub connectivity fallback URLs with:

```js
{ name:'GitHub 更新列表', url:github.tree_url || appInfo.tree_url || 'https://api.github.com/repos/jingjie1135/OhMyCanvas/git/trees/main?recursive=1', source:'github', required:true },
{ name:'GitHub 版本文件', url:github.version_url || appInfo.version_url || 'https://raw.githubusercontent.com/jingjie1135/OhMyCanvas/main/VERSION', source:'github', required:true },
{ name:'GitHub 主页', url:'https://github.com/', source:'github' },
```

Replace ModelScope fallback URLs with literal placeholder URLs that no longer point at the original project:

```js
{ name:'ModelScope 版本文件', url:ms.version_url || '占位', source:'modelscope', required:true },
{ name:'ModelScope 空间页面', url:ms.repo_url || '占位', source:'modelscope' },
```

- [ ] **Step 6: Update disabled-update copy to current fork wording**

Replace the existing disabled-update Chinese and English strings with:

```js
const PROJECT_UPDATE_DISABLED_ZH = 'OhMyCanvas 已禁用内置一键更新，请通过 Git 手动同步更新，避免覆盖本地二开改动。';
const PROJECT_UPDATE_DISABLED_EN = 'Built-in one-click update is disabled for OhMyCanvas. Sync updates manually with Git to avoid overwriting local fork customizations.';
```

Replace the later “upstream version is available” message with wording that does not imply the original project is the current source:

```js
`已检测到远程版本信息，但内置一键更新已禁用，以免覆盖 OhMyCanvas 二开改动。当前 ${versionLabel(localVersion)}，远程 ${versionLabel(remoteVersion || localVersion)}。如需同步，请使用 Git 手动合并。`,
`A remote version is available, but built-in one-click update is disabled to avoid overwriting OhMyCanvas fork customizations. Current ${versionLabel(localVersion)}, remote ${versionLabel(remoteVersion || localVersion)}. Sync manually with Git.`
```

- [ ] **Step 7: Verify title and project link by browser surface**

Run the app, open `http://127.0.0.1:3000/static/index.html`, and verify:

```text
document.title === "镜界-无限画布"
```

Click `项目主页`; expected browser behavior: it opens `https://github.com/jingjie1135/OhMyCanvas` in a new tab/window.

---

### Task 2: Backend app-info/update constants

**Files:**
- Modify: `main.py:163-175`

- [ ] **Step 1: Replace GitHub update constants**

Replace:

```python
GITHUB_REPO_URL = "https://github.com/hero8152/Infinite-Canvas"
GITHUB_VERSION_URL = "https://raw.githubusercontent.com/hero8152/Infinite-Canvas/main/VERSION"
GITHUB_TREE_URL = "https://api.github.com/repos/hero8152/Infinite-Canvas/git/trees/main?recursive=1"
GITHUB_RAW_ROOT = "https://raw.githubusercontent.com/hero8152/Infinite-Canvas/main"
```

with:

```python
GITHUB_REPO_URL = "https://github.com/jingjie1135/OhMyCanvas"
GITHUB_VERSION_URL = "https://raw.githubusercontent.com/jingjie1135/OhMyCanvas/main/VERSION"
GITHUB_TREE_URL = "https://api.github.com/repos/jingjie1135/OhMyCanvas/git/trees/main?recursive=1"
GITHUB_RAW_ROOT = "https://raw.githubusercontent.com/jingjie1135/OhMyCanvas/main"
```

- [ ] **Step 2: Replace ModelScope update constants with placeholders**

Because no replacement ModelScope project URL was supplied, replace only the update-source constants with literal placeholder values and keep LoRA IDs unchanged elsewhere:

```python
MODELSCOPE_REPO_URL = "占位"
MODELSCOPE_RAW_ROOT = "占位"
MODELSCOPE_FILE_API_ROOT = "占位"
MODELSCOPE_VERSION_URL = "占位"
MODELSCOPE_TREE_URL = "占位"
```

Also replace the two ModelScope comments above these constants with:

```python
# ModelScope update source has no replacement URL yet; keep placeholders so the app no longer points at the original project.
```

- [ ] **Step 3: Update backend disabled-update detail**

Replace:

```python
PROJECT_UPDATE_DISABLED_DETAIL = "OhMyCanvas 二开版本已禁用内置一键更新，请通过 Git 手动同步上游，避免覆盖本地二开改动。"
```

with:

```python
PROJECT_UPDATE_DISABLED_DETAIL = "OhMyCanvas 已禁用内置一键更新，请通过 Git 手动同步更新，避免覆盖本地二开改动。"
```

- [ ] **Step 4: Verify backend app info surface**

Run the app and call:

```powershell
curl.exe http://127.0.0.1:3000/api/app-info
```

Expected JSON includes:

```json
{
  "repo_url": "https://github.com/jingjie1135/OhMyCanvas",
  "version_url": "https://raw.githubusercontent.com/jingjie1135/OhMyCanvas/main/VERSION"
}
```

If the endpoint includes ModelScope metadata, it must not contain `hero8152/Infinite-Canvas`, `daniel8152/Infinite-Canvas`, or `Daniel8152/Infinite-Canvas` as update-source URLs.

---

### Task 3: RunningHub guide links

**Files:**
- Modify: `static/api-settings.html:108-130`
- Modify: `static/js/api-settings.js:91-101`

- [ ] **Step 1: Update static HTML RunningHub links**

Replace RH币 Key links with:

```html
<a href="https://www.runninghub.cn/?inviteCode=55fa0e9e" target="_blank" rel="noopener"><i data-lucide="external-link" class="w-3 h-3"></i><span data-i18n="api.cnKey">国内 Key</span></a>
<a href="https://www.runninghub.ai/?inviteCode=q0ozo24o" target="_blank" rel="noopener"><i data-lucide="external-link" class="w-3 h-3"></i><span data-i18n="api.globalKey">国外 Key</span></a>
```

Replace account-balance Key links with:

```html
<a href="占位" target="_blank" rel="noopener"><i data-lucide="external-link" class="w-3 h-3"></i><span data-i18n="api.cnKey">国内 Key</span></a>
<a href="占位" target="_blank" rel="noopener"><i data-lucide="external-link" class="w-3 h-3"></i><span data-i18n="api.globalKey">国外 Key</span></a>
```

- [ ] **Step 2: Update JavaScript onboarding guide URLs**

Replace the `runninghub` entry inside `ONBOARDING_GUIDES` with:

```js
runninghub:{
    titleKey:'api.rhOnboardingTitle',
    descKey:'api.rhOnboardingDesc',
    primaryLabelKey:'api.rhGetKeyCn',
    secondaryLabelKey:'api.rhGetKeyGlobal',
    primaryUrl:'https://www.runninghub.cn/?inviteCode=55fa0e9e',
    secondaryUrl:'https://www.runninghub.ai/?inviteCode=q0ozo24o',
    walletPrimaryLabelKey:'api.rhGetWalletKeyCn',
    walletSecondaryLabelKey:'api.rhGetWalletKeyGlobal',
    walletPrimaryUrl:'占位',
    walletSecondaryUrl:'占位'
}
```

- [ ] **Step 3: Verify through API settings UI**

Open `http://127.0.0.1:3000/static/api-settings.html`, select RunningHub, and inspect/click the guide buttons:

```text
国内 RH币 Key -> https://www.runninghub.cn/?inviteCode=55fa0e9e
国外 RH币 Key -> https://www.runninghub.ai/?inviteCode=q0ozo24o
国内账户余额 Key -> 占位
国外账户余额 Key -> 占位
```

---

### Task 4: Recommended API cards and account invite

**Files:**
- Modify: `static/js/api-settings.js:108-145`
- Modify: `static/js/api-settings.js:1916-1967`
- Modify: `static/js/i18n/api-settings.js:133-152`

- [ ] **Step 1: Replace `RECOMMENDED_APIS` definitions**

Replace the current three entries with:

```js
const RECOMMENDED_APIS = [
    {
        name:'镜界AI',
        base_url:'https://mirror.zeabur.app',
        protocol:'openai',
        register_url:'',
        tagKeys:['api.tagImageModels','api.tagVideoModels','api.tagLlmModels','api.tagGemini','api.tagJimeng'],
        icons:['IMG','VID','LLM'],
        summaryKey:'api.recommendMirrorSummary',
        perkKey:'api.recommendMirrorPerk',
        advantages:['模型种类齐全', '图像/视频/LLM 一站覆盖', '支持每日签到送积分'],
        image_models:['gpt-image-2', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview', '5.0'],
        chat_models:['gpt-5.5'],
        video_models:['veo3.1-fast', 'seedance2.0fast_vip'],
        model_protocols:{
            'gemini-3.1-flash-image-preview':'gemini',
            'gemini-3-pro-image-preview':'gemini',
            '5.0':'jimeng',
            'seedance2.0fast_vip':'jimeng'
        }
    },
    {
        name:'占位（广告位招租）',
        base_url:'https://api.example.com/v1',
        protocol:'openai',
        register_url:'占位',
        tagKeys:['api.adSlotTag'],
        icons:['AD'],
        summaryKey:'api.recommendAdSlotSummary',
        advantages:['广告位招租']
    },
    {
        name:'占位（广告位招租）',
        base_url:'https://api.example.com/v1',
        protocol:'openai',
        register_url:'占位',
        tagKeys:['api.adSlotTag'],
        icons:['AD'],
        summaryKey:'api.recommendAdSlotSummary',
        advantages:['广告位招租']
    }
];
```

Design note: the current provider object stores one default `protocol`. Use `openai` as the saved default for `镜界AI`, and use `model_protocols` to preserve Gemini/即梦 per-model overrides. Do not add a new multi-protocol UI in this pass.

- [ ] **Step 2: Prevent the empty 镜界AI register link from rendering as a broken link**

Replace the register anchor inside `renderRecommendApi()`:

```js
<a class="onboarding-key-btn recommend-guide-key-btn" href="${escapeAttr(api.register_url)}" target="_blank" rel="noopener noreferrer"><i data-lucide="key-round" class="w-3.5 h-3.5"></i><span>${escapeHtml(tr('api.getKey'))}</span></a>
```

with a conditional button/link:

```js
${api.register_url ? `<a class="onboarding-key-btn recommend-guide-key-btn" href="${escapeAttr(api.register_url)}" target="_blank" rel="noopener noreferrer"><i data-lucide="key-round" class="w-3.5 h-3.5"></i><span>${escapeHtml(tr('api.getKey'))}</span></a>` : `<span class="onboarding-key-btn recommend-guide-key-btn is-disabled" aria-disabled="true"><i data-lucide="key-round" class="w-3.5 h-3.5"></i><span>${escapeHtml(tr('api.noInviteLink'))}</span></span>`}
```

- [ ] **Step 3: Update account subscription link only**

Replace:

```html
href="https://bewild.ai?code=WULIDX"
```

with:

```html
href="https://bewild.ai?code=LSAOCVPC"
```

Do not change `api.recommendAccountTitle` or `api.recommendAccountDesc`.

- [ ] **Step 4: Add i18n strings for mirror and ad slot cards**

Replace the recommendation-specific i18n entries at the bottom of `static/js/i18n/api-settings.js` with:

```js
"api.recommendMirrorSummary": { zh: "模型种类齐全，图像、视频、LLM 一站覆盖，支持每日签到送积分，适合想低成本尝鲜各类模型的用户。", en: "Full coverage of image, video, and LLM models with daily check-in credits — great for low-cost access to a wide model lineup." },
"api.recommendMirrorPerk": { zh: "签到送积分", en: "Daily check-in credits" },
"api.recommendAdSlotSummary": { zh: "占位（广告位招租）", en: "Placeholder advertising slot" },
"api.noInviteLink": { zh: "暂无邀请链接", en: "No invite link" },
"api.adSlotTag": { zh: "广告位招租", en: "Ad slot" },
"api.recommendFeatured": { zh: "首选推荐", en: "Top Pick" },
"api.tagImageModels": { zh: "图像模型", en: "Image Models" },
"api.tagVideoModels": { zh: "视频模型", en: "Video Models" },
"api.tagLlmModels": { zh: "LLM模型", en: "LLM Models" },
"api.tagGemini": { zh: "Gemini 协议", en: "Gemini Protocol" },
"api.tagJimeng": { zh: "即梦协议", en: "Jimeng Protocol" },
"api.tagGptImage2": { zh: "GPT image 2模型", en: "GPT image 2 Models" }
```

- [ ] **Step 5: Verify by using the recommendation surface**

Open `http://127.0.0.1:3000/static/api-settings.html`, enter the Recommended APIs panel, and verify:

```text
Card 1 name: 镜界AI
Card 1 base saved after entering a key: https://mirror.zeabur.app
Card 1 default protocol saved after entering a key: openai
Card 1 Gemini/即梦 model_protocols exist in saved provider data
Card 1 invite control says 暂无邀请链接 and does not navigate
Card 2 name: 占位（广告位招租）
Card 3 name: 占位（广告位招租）
Account subscription link: https://bewild.ai?code=LSAOCVPC
```

---

### Task 5: README Chinese About and attribution rewrite

**Files:**
- Modify: `README.md:1-68`

- [ ] **Step 1: Replace README heading and opening description**

Replace the top heading and English one-liner with:

```markdown
# OhMyCanvas

镜界-无限画布是基于 Infinite Canvas 二次维护的本地 AI 创作画布，支持 ComfyUI、OpenAI 兼容 API、Gemini 协议、即梦、ModelScope、RunningHub 等多种接入方式。
```

- [ ] **Step 2: Keep detailed tutorial link unchanged**

Keep the current detailed tutorial line unchanged unless the implementation step discovers a broken Markdown syntax. The current source is:

```markdown
详细教程：[https://youtu.be/1y9ShTvgC_w](https://youtu.be/r_y_9ALr7fg)
```

- [ ] **Step 3: Replace top recommended API section**

Use this exact content near the top after the tutorial line:

```markdown
## 推荐 API

- 镜界AI：`https://mirror.zeabur.app`
  - 支持协议：OpenAI / Gemini / 即梦
  - 简介：模型种类齐全，图像、视频、LLM 一站覆盖，支持每日签到送积分，适合想低成本尝鲜各类模型的用户。
- 占位（广告位招租）
- 占位（广告位招租）

账号订阅方案：<https://bewild.ai?code=LSAOCVPC>
```

- [ ] **Step 4: Add Chinese About information**

Replace the old update/version bilingual notice and feature list introduction with:

```markdown
## 关于本项目

- 当前维护仓库：<https://github.com/jingjie1135/OhMyCanvas>
- 项目显示名：镜界-无限画布
- 维护标识：OhMyCanvas
- 作者/维护者：小雨小面@wuli大雄
- B站主页：<https://space.bilibili.com/1499434734>
- 抖音主页：<https://v.douyin.com/p4UBiAsIVdI>
- 小红书 / YouTube / X：占位
- 功能请求、功能更新、视频教程、联系反馈：占位

本仓库保留原项目的核心能力，并围绕本地部署、API 接入、RunningHub、ModelScope、智能画布等场景继续维护。内置一键更新保持禁用，避免远程更新覆盖本仓库的二开改动；如需同步更新，请使用 Git 手动合并。
```

- [ ] **Step 5: Keep and polish supported feature list in Chinese**

Use:

```markdown
## 支持的功能

1. 支持 OpenAI 兼容协议、异步协议、Gemini 协议、方舟协议等多种 API 接入。
2. 支持 RunningHub 工作流、AI 应用和收费模型调用。
3. 支持火山引擎调用。
4. 支持 ModelScope 免费 LLM 模型和图像模型调用。
5. 支持即梦 CLI，覆盖文生图、图生图、文生视频、图生视频等能力。
6. 支持调用本地局域网 ComfyUI。
7. 支持扩展图片、360 全景图预览截图、视频帧抽取、循环节点等功能。
```

- [ ] **Step 6: Preserve license/use restriction content**

Keep the existing commercial-use restriction and original author credit requirement. The current content includes:

```markdown
已经申请著作权，禁止商业用途

Commercial use is prohibited.

* 可以自己使用和公司使用，禁止用于任何形式的修改封装成商业产品，商用须取得授权。
* 根据代码二次开发的软件必须保持开源并注明来源作者
* This software is for personal and company use only, but is prohibited from being modified or packaged into commercial products in any way. Commercial use requires authorization.
* Software developed based on this code must remain open source and the original author must be credited.
```

- [ ] **Step 7: Preserve screenshot image block**

Keep every existing `<img ...>` line currently in `README.md:48-68`.

- [ ] **Step 8: Add bottom attribution section**

After the screenshot image block, add:

```markdown
## 本项目基于以下仓库：

- <https://github.com/hero8152/Infinite-Canvas>
```

- [ ] **Step 9: Verify README rendered content**

Open README in a Markdown preview or render with the repository’s usual Markdown viewer. Expected visible outcomes:

```text
Top title: OhMyCanvas
Chinese About section exists
Recommended API section remains near the top
Screenshots still render
Bottom attribution heading: 本项目基于以下仓库：
Bottom attribution link: https://github.com/hero8152/Infinite-Canvas
```

---

### Task 6: Tutorial docs and local run notes

**Files:**
- Modify: `运行说明.txt:1-29`
- Modify: `新手运行与使用教程.md:1-10`
- Modify: `新手运行与使用教程.md:321-369`

- [ ] **Step 1: Keep B站 tutorial links unchanged in `运行说明.txt`**

Keep:

```text
无限画布教程：https://www.bilibili.com/video/BV1qvLj67Euh/
智能画布教程：https://www.bilibili.com/video/BV1xAVT6hEBk
```

- [ ] **Step 2: Update API registration/base URL guidance in `运行说明.txt`**

Replace old APIMart registration/base instructions with:

```text
推荐 API：镜界AI
Base URL：https://mirror.zeabur.app
支持协议：OpenAI / Gemini / 即梦
简介：模型种类齐全，图像、视频、LLM 一站覆盖，支持每日签到送积分，适合想低成本尝鲜各类模型的用户。
API 使用教程：占位
```

Keep the existing B站 tutorial lines from Step 1.

- [ ] **Step 3: Update tutorial document title and opening**

In `新手运行与使用教程.md`, replace:

```markdown
# Infinite Canvas 新手运行与使用教程
```

with:

```markdown
# OhMyCanvas 新手运行与使用教程
```

In the opening paragraph, replace project references so they use:

```markdown
镜界-无限画布（OhMyCanvas）
```

- [ ] **Step 4: Keep B站 tutorial links unchanged in `新手运行与使用教程.md`**

Keep:

```markdown
- 无限画布教程：https://www.bilibili.com/video/BV1qvLj67Euh/
- 智能画布教程：https://www.bilibili.com/video/BV1xAVT6hEBk
```

- [ ] **Step 5: Update API recommendation section in `新手运行与使用教程.md`**

Where the guide currently recommends APIMart/Yuli/FHL, use this content:

```markdown
推荐先配置镜界AI：

- 请求地址：`https://mirror.zeabur.app`
- 支持协议：OpenAI / Gemini / 即梦
- 特点：模型种类齐全，图像、视频、LLM 一站覆盖，支持每日签到送积分，适合想低成本尝鲜各类模型的用户。
- API 使用教程：占位

另外两个推荐 API 位暂保留为：占位（广告位招租）。
```

- [ ] **Step 6: Verify docs search**

Run:

```powershell
rg -n "APIMart|apimart.ai|yuli.host|fhl.mom|Infinite Canvas|Infinite-Canvas|78652351" README.md 运行说明.txt 新手运行与使用教程.md
```

Expected:

- No old recommended API registration links remain.
- `Infinite Canvas` may remain only when referring to original project attribution or original tutorial names.
- `78652351` no longer appears in changed docs.

---

### Task 7: Maintenance notes consistency

**Files:**
- Modify: `agent.md:1-10`

- [ ] **Step 1: Align documented upstream/original attribution**

If the repo should use the user-provided original project attribution consistently, replace the repository relationship block with:

```markdown
# Agent Notes: OhMyCanvas 二开维护指南

本仓库是基于上游 `hero8152/Infinite-Canvas` 的二开项目。后续合并更新时，先把本文件当作冲突解决参考：上游改动优先吸收，但下列二开行为属于本仓库当前保留项，除非用户明确要求，不要在冲突中误删或改回上游默认。

## 仓库关系

- 当前 fork：`https://github.com/jingjie1135/OhMyCanvas.git`
- 原项目仓库：`https://github.com/hero8152/Infinite-Canvas.git`
- 默认分支：`main`
- 合并上游前建议新建临时分支，先读 `git diff upstream/main...main` 和近期提交，再处理冲突。
```

Do not change the Zeabur lines at `agent.md:35-39`; they already require `jingjie1135/OhMyCanvas`.

- [ ] **Step 2: Verify notes do not conflict with README attribution**

Run:

```powershell
rg -n "mcnxiaoyu-ctrl|hero8152|jingjie1135/OhMyCanvas" agent.md README.md
```

Expected:

- `agent.md` and README both use `https://github.com/hero8152/Infinite-Canvas` for original attribution.
- `jingjie1135/OhMyCanvas` remains the current fork.

---

## Verification checklist for the full implementation

Run these after all implementation tasks are complete.

### Static search checks

```powershell
rg -n "hero8152/Infinite-Canvas|daniel8152/Infinite-Canvas|Daniel8152/Infinite-Canvas|apimart.ai/register|apimart.ai/zh/register|yuli.host/register|fhl.mom/register|rh-v1331|78652351|WULIDX" --glob "!static/vendor/**" --glob "!zeabur-template.yaml" --glob "!LICENSE"
```

Expected remaining matches:

- `hero8152/Infinite-Canvas` only in README bottom attribution and possibly documentation that explicitly says original project.
- `Daniel8152/...` LoRA IDs may remain, but `Daniel8152/Infinite-Canvas` update-source URLs must not remain.
- No `rh-v1331`, old recommended API registration links, old B站 profile ID, or old Bewild invite code in modified surfaces.

### Type/syntax checks

```powershell
python -m py_compile main.py
```

Expected:

```text
command exits 0
```

### Live app checks

```powershell
python main.py
```

Then use browser/Playwright:

1. Open `http://127.0.0.1:3000/`.
2. Confirm tab title is `镜界-无限画布`.
3. Click `项目主页`; confirm the target is `https://github.com/jingjie1135/OhMyCanvas`.
4. Open API Settings.
5. Open Recommended APIs.
6. Confirm `镜界AI` appears first and two `占位（广告位招租）` cards appear after it.
7. Enter a test key for `镜界AI` and save.
8. Confirm the saved provider has:

```json
{
  "name": "镜界AI",
  "base_url": "https://mirror.zeabur.app",
  "protocol": "openai"
}
```

9. Confirm Gemini/即梦 model overrides exist for Gemini/即梦 models.
10. Select RunningHub and confirm guide links match the supplied URLs/placeholders.

### Backend endpoint checks

```powershell
curl.exe http://127.0.0.1:3000/api/app-info
curl.exe http://127.0.0.1:3000/api/update-connectivity
```

Expected:

- `/api/app-info` points GitHub fields at `jingjie1135/OhMyCanvas`.
- Update remains disabled.
- Connectivity output does not expose original ModelScope project URLs as update sources.

### Documentation checks

Open/render `README.md` and confirm:

- Top title is `OhMyCanvas`.
- Chinese About section exists.
- Recommended API section is near the top.
- Screenshots remain visible.
- Bottom attribution heading is `本项目基于以下仓库：`.
- Attribution link is `https://github.com/hero8152/Infinite-Canvas`.

---

## Risks and implementation notes

1. **Literal `占位` in `href` attributes:** The user supplied `占位` for several links. This is not a valid HTTP URL, but it is the requested value. If browser behavior matters, prefer rendering these as disabled controls or using B站 homepage as temporary target only for tutorial/contact links, as requested.
2. **Recommended API multi-protocol support:** Current provider storage supports one default `protocol` plus per-model `model_protocols`. This plan uses OpenAI as default for `镜界AI` and per-model overrides for Gemini/即梦. A new “one card, multiple protocols” UI is intentionally out of scope.
3. **ModelScope update placeholders:** Replacing ModelScope update constants with `占位` will make ModelScope update connectivity fail, which is acceptable because one-click update is already disabled and the user explicitly said not to keep the original source.
4. **Original attribution mismatch:** Local `agent.md` currently mentions `mcnxiaoyu-ctrl/Infinite-Canvas`, but the user provided `https://github.com/hero8152/Infinite-Canvas` as the original attribution URL. This plan uses the user-provided URL for README and recommends aligning `agent.md` for consistency.
5. **Zeabur template remains untouched:** `zeabur-template.yaml` still contains `Infinite Canvas` wording in its template metadata. This is intentionally not changed because the user said the Zeabur template was newly added and should not be touched.

## Suggested commit sequence

Use Chinese Conventional Commit subjects per repo/user preference:

1. `feat: 更新镜界品牌与项目入口链接`
2. `feat: 更新推荐 API 与 RunningHub 引导链接`
3. `docs: 更新 OhMyCanvas 说明与原项目署名`

Each commit should include only the files from its matching task group.
