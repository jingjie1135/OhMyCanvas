const root = document.getElementById('assetManagerRoot');
const statusEl = document.getElementById('assetStatus');
const refreshBtn = document.getElementById('refreshBtn');
const uploadInput = document.getElementById('assetUploadInput');

let activeTab = 'assets';
let assetLibrary = {libraries:[], categories:[]};
let promptLibrary = {libraries:[]};
let apiProviders = [];
let avatarRegisterProvider = '';
let avatarBusyId = '';
let activeAssetLibraryId = '';
let activeAssetCategoryId = '';
let activeWorkflowLibraryId = '';
let activeWorkflowCategoryId = '';
let activePromptLibraryId = '';
let activePromptCategory = 'all';
let assetTreeFocus = 'category';
let promptTreeFocus = 'category';
let selectedAssetId = '';
let selectedWorkflowId = '';
let selectedPromptId = '';
let selectedAssetIds = new Set();
let selectedWorkflowIds = new Set();
let selectedPromptIds = new Set();
let assetQuery = '';
let workflowQuery = '';
let promptQuery = '';
let assetManageMode = false;
let workflowManageMode = false;
let promptManageMode = false;
let assetMoveTarget = '';
let assetClipboard = null;
let assetEditMode = false;
let promptEditMode = false;
let promptCreateMode = false;
let pendingDeleteAssetId = '';
let pendingDeletePromptId = '';
let pendingBatchDelete = '';
let assetTreeEdit = null;
let workflowTreeEdit = null;
let promptTreeEdit = null;
let pendingTreeDelete = '';
let marqueeState = null;
let sharedFolders = [];
let activeSharedFolderId = '';
let activeSharedFolderName = '';
let localFolders = [];
let localFolderMap = new Map();
let localItemMap = new Map();
let activeLocalFolderId = '';
let selectedLocalId = '';
let selectedLocalIds = new Set();
let localQuery = '';
let localManageMode = false;
let localClipboard = null;
let localCaptionBusy = false;
let localCaptionProvider = '';
let localCaptionModel = '';
let localCaptionPrompt = '描述图片';
let localAssets = [];
let localAssetsLoaded = false;
let localUploadTree = null;
let activeLocalUploadFolder = '';
let selectedLocalUploadId = '';
let selectedLocalUploadIds = new Set();
let localUploadQuery = '';
let localUploadManageMode = false;
let lightboxPanState = null;

const LOCAL_MEDIA_EXTS = /\.(png|jpe?g|webp|gif|bmp|avif|svg|mp4|webm|mov|m4v|mp3|wav|flac|ogg|m4a|aac)(\?|#|$)/i;

function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
function setStatus(text='准备就绪'){ if(statusEl) statusEl.textContent = text || '准备就绪'; }
function escapeHtml(value=''){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(value=''){ return escapeHtml(value); }
async function copyTextToClipboard(text){
    const value = String(text || '');
    if(!value) return false;
    try {
        if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(value); return true; }
    } catch(_) {}
    try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch(_) { return false; }
}
async function apiJson(url, options={}){
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if(!res.ok) throw new Error(data.detail || data.message || '操作失败');
    return data;
}
function formatDate(value){
    const num = Number(value || 0);
    if(!num) return '未知';
    try { return new Date(num).toLocaleString('zh-CN', {hour12:false}); }
    catch(e) { return '未知'; }
}
function formatFileSize(bytes=0){
    const size = Number(bytes || 0);
    if(!size) return '0 B';
    const units = ['B','KB','MB','GB','TB'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return `${(size / Math.pow(1024, idx)).toFixed(idx ? 1 : 0)} ${units[idx]}`;
}
function assetLibraries(){
    return Array.isArray(assetLibrary.libraries) && assetLibrary.libraries.length
        ? assetLibrary.libraries
        : [{id:'default', name:'默认资产库', categories:assetLibrary.categories || []}];
}
function activeAssetLibrary(){
    const libs = assetLibraries();
    return libs.find(lib => lib.id === activeAssetLibraryId) || libs[0] || null;
}
function activeWorkflowLibrary(){
    const libs = assetLibraries();
    return libs.find(lib => lib.id === activeWorkflowLibraryId) || libs[0] || null;
}
function assetCategories(){
    return (activeAssetLibrary()?.categories || []).filter(cat => (cat.type || 'image') === 'image');
}
function workflowCategories(){
    const cats = [];
    assetLibraries().forEach(lib => {
        (lib.categories || []).filter(cat => (cat.type || '') === 'workflow').forEach(cat => {
            cats.push({...cat, __libraryId:lib.id, __libraryName:lib.name || '资产库'});
        });
    });
    return cats;
}
function activeAssetCategory(){
    const cats = assetCategories();
    return cats.find(cat => cat.id === activeAssetCategoryId) || cats[0] || null;
}
function activeWorkflowCategory(){
    const cats = workflowCategories();
    return cats.find(cat => cat.id === activeWorkflowCategoryId && cat.__libraryId === activeWorkflowLibraryId)
        || cats.find(cat => cat.id === activeWorkflowCategoryId)
        || cats[0]
        || null;
}
function workflowCount(){
    return workflowCategories().reduce((sum, cat) => sum + ((cat.items || []).length), 0);
}
function assetCountForLibrary(lib){
    return (lib?.categories || [])
        .filter(cat => (cat.type || 'image') === 'image')
        .reduce((sum, cat) => sum + ((cat.items || []).length), 0);
}
function promptLibraries(){
    const libs = Array.isArray(promptLibrary.libraries) ? promptLibrary.libraries.filter(Boolean) : [];
    if(!libs.length) return [{id:'system', name:'系统提示词库', system:true, items:[], categories:[]}];
    const system = libs.filter(lib => lib.id === 'system');
    const others = libs.filter(lib => lib.id !== 'system');
    return [...system, ...others];
}
function isSystemPromptLibrary(lib){
    return !lib || lib.id === 'system';
}
function activePromptLibrary(){
    const libs = promptLibraries();
    return libs.find(lib => lib.id === activePromptLibraryId) || libs[0] || null;
}
function activePromptCategories(){
    const lib = activePromptLibrary();
    const fromLib = Array.isArray(lib?.categories) ? lib.categories : [];
    if(fromLib.length) return fromLib;
    if(!isSystemPromptLibrary(lib)) return [];
    return [
        {id:'view', name:'视角'},
        {id:'storyboard', name:'分镜'},
        {id:'character', name:'角色'},
        {id:'product', name:'产品'},
        {id:'lighting', name:'光影'},
        {id:'custom', name:'我的'}
    ];
}
const PROMPT_BUILTIN_CATEGORY_IDS = new Set(['view','storyboard','character','product','lighting','custom']);
function promptCategoryLabel(category='custom'){
    const found = activePromptCategories().find(cat => cat.id === category);
    if(found?.name) return found.name;
    const map = {view:'视角', storyboard:'分镜', character:'角色', product:'产品', lighting:'光影', mine:'我的', custom:'我的'};
    return map[category] || category || '自定义';
}
function promptCountForCategory(category, lib=activePromptLibrary()){
    const items = lib?.items || [];
    if(category === 'all') return items.length;
    return items.filter(item => (item.category || 'custom') === category).length;
}
function assetKind(item){
    const url = String(item?.url || '').toLowerCase();
    const kind = String(item?.kind || item?.type || '').toLowerCase();
    if(kind.includes('video') || /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(url)) return 'video';
    if(kind.includes('audio') || /\.(mp3|wav|flac|ogg|m4a)(\?|#|$)/.test(url)) return 'audio';
    return 'image';
}
function workflowKindLabel(item){
    const format = String(item?.format || '').toLowerCase();
    const url = String(item?.url || '').toLowerCase();
    if(format === 'json' || url.endsWith('.json')) return 'JSON 工作流';
    return 'ZIP 工作流包';
}
function assetKindLabel(item){
    const kind = assetKind(item);
    if(kind === 'video') return '视频';
    if(kind === 'audio') return '音频';
    return '图片';
}
function assetThumb(item){
    const kind = assetKind(item);
    if(kind === 'video') return `<video src="${escapeAttr(item.url)}" muted preload="metadata" playsinline></video>`;
    if(kind === 'audio') return `<div class="asset-file-icon"><i data-lucide="file-audio"></i><span>音频</span></div>`;
    return `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.name || 'asset')}" loading="lazy">`;
}
function workflowThumb(item){
    return `<div class="asset-file-icon workflow-file-icon"><i data-lucide="workflow"></i><span>${escapeHtml(workflowKindLabel(item))}</span></div>`;
}
function isLocalMediaFile(file){
    if(!file) return false;
    const type = String(file.type || '').toLowerCase();
    if(type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) return true;
    return LOCAL_MEDIA_EXTS.test(file.name || '');
}
function localItemKind(item){
    // 共享文件夹的 item 已带 kind；兜底按名称判断
    if(item && item.kind) return item.kind;
    const name = String(item?.name || '').toLowerCase();
    if(/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(name)) return 'video';
    if(/\.(mp3|wav|flac|ogg|m4a|aac)(\?|#|$)/i.test(name)) return 'audio';
    return 'image';
}
function localObjectUrl(item){
    // 共享文件夹素材直接走后端 URL（局域网也可访问），不再用 createObjectURL
    return item?.url || '';
}
function localAssetThumb(item){
    return assetThumb({url:localObjectUrl(item), name:item?.name || 'local', kind:item?.kind || localItemKind(item)});
}
function activeLocalFolder(){
    return localFolderMap.get(activeLocalFolderId) || localFolders[0] || null;
}
function localItemsForFolder(folderId=activeLocalFolderId){
    const query = localQuery.trim().toLowerCase();
    const folder = localFolderMap.get(folderId) || activeLocalFolder();
    const items = folder?.items || [];
    return items.filter(item => {
        if(!query) return true;
        return [item.name, item.relativePath, assetKindLabel(item)].join(' ').toLowerCase().includes(query);
    });
}
function localCaptionProviders(){
    return (apiProviders || []).filter(p => p && p.enabled !== false && Array.isArray(p.chat_models) && p.chat_models.length);
}
function normalizeLocalCaptionSettings(){
    const providers = localCaptionProviders();
    if(!providers.length){
        localCaptionProvider = '';
        localCaptionModel = '';
        return;
    }
    let provider = providers.find(p => p.id === localCaptionProvider) || providers[0];
    localCaptionProvider = provider.id || '';
    const models = (provider.chat_models || []).filter(Boolean);
    if(!models.includes(localCaptionModel)) localCaptionModel = models[0] || '';
}
function localCaptionModels(){
    normalizeLocalCaptionSettings();
    const provider = localCaptionProviders().find(p => p.id === localCaptionProvider);
    return (provider?.chat_models || []).filter(Boolean);
}
function renderLocalCaptionTools(imageCount){
    normalizeLocalCaptionSettings();
    const providers = localCaptionProviders();
    const models = localCaptionModels();
    const disabled = !imageCount || !providers.length || !localCaptionModel || localCaptionBusy;
    return `
        <div class="local-caption-tools">
            <select id="localCaptionProvider" class="manage-select" title="反推平台" ${providers.length ? '' : 'disabled'}>
                ${providers.length ? providers.map(p => `<option value="${escapeAttr(p.id)}" ${p.id === localCaptionProvider ? 'selected' : ''}>${escapeHtml(p.name || p.id)}</option>`).join('') : '<option value="">暂无聊天平台</option>'}
            </select>
            <select id="localCaptionModel" class="manage-select" title="反推模型" ${models.length ? '' : 'disabled'}>
                ${models.length ? models.map(m => `<option value="${escapeAttr(m)}" ${m === localCaptionModel ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('') : '<option value="">暂无模型</option>'}
            </select>
            <input id="localCaptionPrompt" class="local-caption-prompt-input" type="text" value="${escapeAttr(localCaptionPrompt || '描述图片')}" placeholder="描述图片">
            <button class="asset-btn primary" type="button" data-local-caption-run ${disabled ? 'disabled' : ''}><i data-lucide="${localCaptionBusy ? 'loader-2' : 'wand-sparkles'}"></i><span>${localCaptionBusy ? '反推中' : '提示词反推'}</span></button>
        </div>
    `;
}
function findLocalItem(id){
    return localItemMap.get(id) || null;
}
function normalizeLocalState(){
    if(!activeLocalFolderId || !localFolderMap.has(activeLocalFolderId)) activeLocalFolderId = localFolders[0]?.id || '';
    const items = localItemsForFolder();
    if(selectedLocalId && !localItemMap.has(selectedLocalId)) selectedLocalId = '';
    if(!selectedLocalId && items.length) selectedLocalId = items[0].id;
    selectedLocalIds = new Set([...selectedLocalIds].filter(id => localItemMap.has(id)));
}
function localFolderTotal(folder){
    if(!folder) return 0;
    return (folder.items || []).length + (folder.children || []).reduce((sum, child) => sum + localFolderTotal(child), 0);
}
function localFolderId(path=''){
    return path || '__root__';
}
function localChildPath(parentPath='', name=''){
    return parentPath ? `${parentPath}/${name}` : name;
}
// ---------------- 共享文件夹（服务端登记 + 只读浏览/引用，局域网可用） ----------------
async function loadSharedFolders(){
    try {
        const data = await apiJson('/api/shared-folders');
        sharedFolders = Array.isArray(data.folders) ? data.folders : [];
    } catch(err) {
        sharedFolders = [];
    }
    return sharedFolders;
}
async function loadLocalAssets(){
    try {
        const data = await apiJson('/api/local-assets');
        localAssets = Array.isArray(data.items) ? data.items : [];
        localUploadTree = data.tree || {id:'__root__', path:'', name:'全部上传', count:localAssets.length, items:[], children:[]};
    } catch(err) {
        localAssets = [];
        localUploadTree = {id:'__root__', path:'', name:'全部上传', count:0, items:[], children:[]};
    }
    if(activeLocalUploadFolder && !localUploadFolderExists(activeLocalUploadFolder)) activeLocalUploadFolder = '';
    selectedLocalUploadIds = new Set([...selectedLocalUploadIds].filter(id => localAssets.some(item => item.id === id)));
    localAssetsLoaded = true;
    return localAssets;
}
async function registerSharedFolder(){
    const tip = '请输入要登记的共享文件夹路径（必须位于项目目录内，例如 assets\\library 或 output）：';
    const path = window.prompt(tip, '');
    if(!String(path || '').trim()) return;
    try {
        setStatus('正在登记共享文件夹...');
        const data = await apiJson('/api/shared-folders', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({path})
        });
        await loadSharedFolders();
        const folder = data.folder;
        if(folder?.id) await openSharedFolder(folder.id);
        else render();
        setStatus(`已登记「${folder?.name || '共享文件夹'}」`);
    } catch(err) {
        setStatus(err.message || '登记共享文件夹失败');
    }
}
async function unregisterSharedFolder(folderId){
    if(!folderId) return;
    try {
        await apiJson(`/api/shared-folders/${encodeURIComponent(folderId)}`, {method:'DELETE'});
        if(activeSharedFolderId === folderId){
            activeSharedFolderId = '';
            activeSharedFolderName = '';
            localFolders = [];
            localFolderMap = new Map();
            localItemMap = new Map();
            activeLocalFolderId = '';
            selectedLocalId = '';
            selectedLocalIds.clear();
            localClipboard = null;
        }
        await loadSharedFolders();
        render();
        setStatus('已移除共享文件夹登记（不会删除磁盘文件）');
    } catch(err) {
        setStatus(err.message || '移除共享文件夹失败');
    }
}
function indexSharedTree(node){
    if(!node) return;
    localFolderMap.set(node.id, node);
    (node.items || []).forEach(item => localItemMap.set(item.id, item));
    (node.children || []).forEach(child => indexSharedTree(child));
}
async function openSharedFolder(folderId){
    if(!folderId) return;
    try {
        setStatus('正在读取共享文件夹...');
        const data = await apiJson(`/api/shared-folders/${encodeURIComponent(folderId)}/tree`);
        const tree = data.tree;
        localFolders = tree ? [tree] : [];
        localFolderMap = new Map();
        localItemMap = new Map();
        if(tree) indexSharedTree(tree);
        activeSharedFolderId = folderId;
        activeSharedFolderName = data.folder?.name || tree?.name || '共享文件夹';
        activeLocalFolderId = tree?.id || '';
        selectedLocalId = '';
        selectedLocalIds.clear();
        localClipboard = null;
        normalizeLocalState();
        render();
        setStatus(`已读取「${activeSharedFolderName}」`);
    } catch(err) {
        setStatus(err.message || '读取共享文件夹失败');
    }
}
function currentAssetItems(){
    const query = assetQuery.trim().toLowerCase();
    return (activeAssetCategory()?.items || []).filter(item => {
        if(!query) return true;
        return [item.name, item.url, assetKindLabel(item)].join(' ').toLowerCase().includes(query);
    });
}
function currentWorkflowItems(){
    const query = workflowQuery.trim().toLowerCase();
    return (activeWorkflowCategory()?.items || []).filter(item => {
        if(!query) return true;
        return [item.name, item.url, workflowKindLabel(item)].join(' ').toLowerCase().includes(query);
    });
}
function assetMoveTargets(){
    const currentKey = `${activeAssetLibraryId}::${activeAssetCategoryId}`;
    const targets = [];
    assetLibraries().forEach(lib => {
        (lib.categories || []).filter(cat => (cat.type || 'image') === 'image').forEach(cat => {
            const key = `${lib.id}::${cat.id}`;
            if(key !== currentKey) targets.push({key, libraryId:lib.id, categoryId:cat.id, label:`${lib.name || '资产库'} / ${cat.name || '分组'}`});
        });
    });
    return targets;
}
function normalizeAssetMoveTarget(){
    const targets = assetMoveTargets();
    if(!targets.some(item => item.key === assetMoveTarget)) assetMoveTarget = targets[0]?.key || '';
    return targets;
}
function currentPromptItems(){
    const lib = activePromptLibrary();
    const query = promptQuery.trim().toLowerCase();
    return (lib?.items || []).filter(item => {
        if(activePromptCategory !== 'all' && (item.category || 'custom') !== activePromptCategory) return false;
        if(!query) return true;
        return [item.name, item.scene, item.positive, item.negative, item.category].join(' ').toLowerCase().includes(query);
    });
}
// 认证支持的平台键（与后端 AVATAR_SUPPORTED_PLATFORMS 保持一致；新增平台时同步）
const AVATAR_SUPPORTED_PLATFORMS = ['apimart', 'volcengine'];
const AVATAR_PLATFORM_LABELS = {apimart:'APIMart', volcengine:'火山引擎'};
function providerAvatarPlatform(p){
    const proto = String(p?.protocol || '').toLowerCase();
    const base = String(p?.base_url || '').toLowerCase();
    if(proto === 'apimart' || base.includes('apimart.ai')) return 'apimart';
    if(proto === 'volcengine') return 'volcengine';
    return '';
}
function providerAvatarSupported(p){
    return AVATAR_SUPPORTED_PLATFORMS.includes(providerAvatarPlatform(p));
}
function avatarPlatformLabel(platform){
    return AVATAR_PLATFORM_LABELS[String(platform || '')] || String(platform || '平台');
}
// 列出 API 设置里所有启用的 provider 作为认证候选（以 API 设置为中心，由用户自己选平台）；
// 不支持的平台也列出，在下拉里标注「待接入」，避免用户以为漏了。
function avatarCandidateProviders(){
    return (apiProviders || []).filter(p => p && p.enabled !== false);
}
function activeAvatarProvider(){
    const list = avatarCandidateProviders();
    if(!list.length) return null;
    return list.find(p => p.id === avatarRegisterProvider)
        || list.find(p => providerAvatarSupported(p))
        || list[0];
}
function avatarProviderOptionLabel(p){
    const name = p.name || p.id;
    const platform = providerAvatarPlatform(p);
    if(!platform) return `${name}（暂不支持，待接入）`;
    if(!providerAvatarSupported(p)) return `${name}（${avatarPlatformLabel(platform)}·待接入）`;
    return `${name}（${avatarPlatformLabel(platform)}）`;
}
// 找出某平台当前可用的 provider_id（优先注册时记录的，其次同平台任一启用 provider）
function avatarProviderIdForPlatform(platform, preferredId=''){
    const list = avatarCandidateProviders();
    if(preferredId && list.some(p => p.id === preferredId)) return preferredId;
    const match = list.find(p => providerAvatarPlatform(p) === platform);
    return match ? match.id : '';
}
function findAssetItem(id){
    for(const lib of assetLibraries()) for(const cat of lib.categories || []) for(const item of cat.items || []) if(item.id === id) return item;
    return null;
}
function findWorkflowItem(id){
    for(const lib of assetLibraries()) for(const cat of lib.categories || []) {
        if((cat.type || '') !== 'workflow') continue;
        for(const item of cat.items || []) if(item.id === id) return item;
    }
    return null;
}
function findPromptItem(id){
    for(const lib of promptLibraries()) for(const item of lib.items || []) if(item.id === id) return item;
    return null;
}
function selectedAsset(){
    const items = currentAssetItems();
    return items.find(item => item.id === selectedAssetId) || items[0] || null;
}
function selectedWorkflow(){
    const items = currentWorkflowItems();
    return items.find(item => item.id === selectedWorkflowId) || items[0] || null;
}
function selectedPrompt(){
    const items = currentPromptItems();
    return items.find(item => item.id === selectedPromptId) || items[0] || null;
}
function normalizeAssetState(){
    const libs = assetLibraries();
    if(!activeAssetLibraryId || !libs.some(lib => lib.id === activeAssetLibraryId)) activeAssetLibraryId = assetLibrary.active_library_id || libs[0]?.id || '';
    const cats = assetCategories();
    if(!activeAssetCategoryId || !cats.some(cat => cat.id === activeAssetCategoryId)) activeAssetCategoryId = cats[0]?.id || '';
    const items = currentAssetItems();
    if(selectedAssetId && !items.some(item => item.id === selectedAssetId)) selectedAssetId = '';
    if(!selectedAssetId && items.length) selectedAssetId = items[0].id;
    selectedAssetIds = new Set([...selectedAssetIds].filter(id => findAssetItem(id)));
}
function normalizeWorkflowState(){
    const libs = assetLibraries();
    if(!activeWorkflowLibraryId || !libs.some(lib => lib.id === activeWorkflowLibraryId)) activeWorkflowLibraryId = assetLibrary.active_library_id || libs[0]?.id || '';
    const cats = workflowCategories();
    if(
        !activeWorkflowCategoryId
        || !cats.some(cat => cat.id === activeWorkflowCategoryId && cat.__libraryId === activeWorkflowLibraryId)
    ){
        activeWorkflowCategoryId = cats[0]?.id || '';
        activeWorkflowLibraryId = cats[0]?.__libraryId || activeWorkflowLibraryId;
    }
    const activeCat = cats.find(cat => cat.id === activeWorkflowCategoryId && cat.__libraryId === activeWorkflowLibraryId) || null;
    if(activeCat?.__libraryId) activeWorkflowLibraryId = activeCat.__libraryId;
    const items = currentWorkflowItems();
    if(selectedWorkflowId && !items.some(item => item.id === selectedWorkflowId)) selectedWorkflowId = '';
    if(!selectedWorkflowId && items.length) selectedWorkflowId = items[0].id;
    selectedWorkflowIds = new Set([...selectedWorkflowIds].filter(id => findWorkflowItem(id)));
}
function normalizePromptState(){
    const libs = promptLibraries();
    if(!activePromptLibraryId || !libs.some(lib => lib.id === activePromptLibraryId)) activePromptLibraryId = promptLibrary.active_library_id || libs[0]?.id || '';
    const cats = activePromptCategories();
    if(activePromptCategory !== 'all' && !cats.some(cat => cat.id === activePromptCategory)) activePromptCategory = 'all';
    const items = currentPromptItems();
    if(selectedPromptId && !items.some(item => item.id === selectedPromptId)) selectedPromptId = '';
    if(!selectedPromptId && items.length) selectedPromptId = items[0].id;
    selectedPromptIds = new Set([...selectedPromptIds].filter(id => findPromptItem(id)));
}
async function loadAll(){
    setStatus('加载中...');
    const [assetData, promptData, providerData] = await Promise.all([
        apiJson('/api/asset-library'),
        apiJson('/api/prompt-libraries'),
        apiJson('/api/providers').catch(() => ({providers:[]})),
        loadSharedFolders(),
        loadLocalAssets()
    ]);
    assetLibrary = assetData.library || {libraries:[], categories:[]};
    promptLibrary = promptData.library || {libraries:[]};
    apiProviders = Array.isArray(providerData.providers) ? providerData.providers : [];
    // 刷新时默认回到「默认资产库」
    const libs = assetLibraries();
    activeAssetLibraryId = (libs.find(lib => lib.id === 'default') || libs[0])?.id || '';
    activeWorkflowLibraryId = (libs.find(lib => lib.id === 'default') || libs[0])?.id || '';
    activeAssetCategoryId = '';
    activeWorkflowCategoryId = '';
    selectedAssetId = '';
    selectedWorkflowId = '';
    selectedAssetIds.clear();
    selectedWorkflowIds.clear();
    selectedPromptIds.clear();
    render();
    setStatus('准备就绪');
}
function render(){
    document.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === activeTab));
    if(activeTab === 'prompts') renderPromptManager();
    else if(activeTab === 'workflows') renderWorkflowManager();
    else if(activeTab === 'local') renderLocalManager();
    else if(activeTab === 'canvas-assets') renderCanvasAssetsManager();
    else renderAssetManager();
    refreshIcons();
}
function renderCanvasAssetsManager(){
    root.innerHTML = `
        <aside class="asset-panel asset-nav">
            <div class="panel-head"><div class="panel-title"><strong>画布资产</strong><span>画布内保存的素材集合</span></div></div>
            <div class="nav-scroll"><div class="nav-empty">画布资产功能待完善</div></div>
        </aside>
        <section class="asset-panel asset-content">
            <div class="content-toolbar">
                <div class="content-heading"><strong>画布资产</strong><span>后续会按画布、节点和输出记录整理</span></div>
            </div>
            <div class="content-scroll"><div class="empty-state">这里先预留给画布资产。当前请继续使用「图片资产」和「本地素材」。</div></div>
        </section>
        <aside class="asset-panel asset-detail">
            <div class="panel-head"><div class="panel-title"><strong>资产预览</strong><span>选择画布资产查看详情</span></div></div>
            <div class="detail-scroll"><div class="detail-empty"><i data-lucide="layout-dashboard"></i><span>暂无可预览资产</span></div></div>
        </aside>
    `;
}
function renderHeadTreeInlineEdit(edit, inputId, saveAttr, cancelAttr){
    if(!edit || edit.placement !== 'head') return '';
    const label = edit.label || '名称';
    return `<div class="head-inline-edit">
        <input id="${escapeAttr(inputId)}" type="text" value="${escapeAttr(edit.value || '')}" placeholder="${escapeAttr(label)}">
        <button type="button" class="primary" ${saveAttr} title="保存"><i data-lucide="check"></i><span>保存</span></button>
        <button type="button" ${cancelAttr} title="取消"><i data-lucide="x"></i><span>取消</span></button>
    </div>`;
}
function focusTreeEditInput(id){
    requestAnimationFrame(() => {
        const input = document.getElementById(id);
        input?.focus();
        input?.select?.();
    });
}
function localUploadItems(){
    const q = String(localUploadQuery || '').trim().toLowerCase();
    let list = Array.isArray(localAssets) ? localAssets.slice() : [];
    if(activeLocalUploadFolder) list = list.filter(it => String(it.folder || '') === activeLocalUploadFolder);
    if(q) list = list.filter(it => [it.name, it.file, assetKindLabel(it)].join(' ').toLowerCase().includes(q));
    return list;
}
function findLocalUpload(id){
    return (localAssets || []).find(it => it.id === id) || null;
}
function localUploadFolderExists(path=''){
    const target = String(path || '');
    let found = !target;
    function walk(node){
        if(!node || found) return;
        if(String(node.path || '') === target){ found = true; return; }
        (node.children || []).forEach(walk);
    }
    walk(localUploadTree);
    return found;
}
function localUploadFolderByPath(path=''){
    const target = String(path || '');
    let match = null;
    function walk(node){
        if(!node || match) return;
        if(String(node.path || '') === target){ match = node; return; }
        (node.children || []).forEach(walk);
    }
    walk(localUploadTree);
    return match;
}
function localUploadFolderTitle(){
    if(!activeLocalUploadFolder) return '本地上传';
    return localUploadFolderByPath(activeLocalUploadFolder)?.name || activeLocalUploadFolder.split('/').pop() || '本地上传';
}
function renderLocalUploadFolderBranch(folder, depth=0){
    if(!folder) return '';
    const path = folder.path || '';
    const active = path === activeLocalUploadFolder;
    const contains = !active && (folder.children || []).some(child => localUploadFolderContainsActive(child));
    return `<div class="tree-branch">
        <button class="tree-row ${depth ? 'tree-child' : 'tree-parent'} ${active ? 'active' : ''} ${contains ? 'contains-active' : ''}" type="button" data-localup-folder="${escapeAttr(path)}">
            ${depth ? '<span class="tree-elbow"></span>' : ''}
            <span class="tree-row-icon"><i data-lucide="${active ? 'folder-open' : (depth ? 'folder' : 'upload-cloud')}"></i></span>
            <span class="tree-row-name">${escapeHtml(folder.name || '文件夹')}</span>
            <span class="tree-row-count">${Number(folder.count || 0)}</span>
        </button>
        ${(folder.children || []).length ? `<div class="tree-children">${folder.children.map(child => renderLocalUploadFolderBranch(child, depth + 1)).join('')}</div>` : ''}
    </div>`;
}
function localUploadFolderContainsActive(folder){
    if(!folder) return false;
    if(String(folder.path || '') === activeLocalUploadFolder) return true;
    return (folder.children || []).some(child => localUploadFolderContainsActive(child));
}
function selectedLocalUploadImageItems(){
    return [...selectedLocalUploadIds].map(id => findLocalUpload(id)).filter(item => item && assetKind(item) === 'image');
}
function renderLocalManager(){
    normalizeLocalCaptionSettings();
    const items = localUploadItems();
    if(selectedLocalUploadId && !items.some(item => item.id === selectedLocalUploadId)) selectedLocalUploadId = '';
    if(!selectedLocalUploadId && items.length) selectedLocalUploadId = items[0].id;
    const detail = findLocalUpload(selectedLocalUploadId);
    const total = (localAssets || []).length;
    const imageCount = selectedLocalUploadImageItems().length;
    const folderTitle = localUploadFolderTitle();
    root.innerHTML = `
        <aside class="asset-panel asset-nav">
            <div class="panel-head">
                <div class="panel-title"><strong>本地上传</strong><span>批量上传到 assets/uploads</span></div>
                <div class="panel-actions compact-actions">
                    <button class="asset-icon-btn" type="button" data-localup-folder-new title="新建文件夹"><i data-lucide="folder-plus"></i></button>
                    <button class="asset-icon-btn" type="button" data-localup-folder-rename title="重命名文件夹" ${activeLocalUploadFolder ? '' : 'disabled'}><i data-lucide="pencil"></i></button>
                </div>
            </div>
            <div class="nav-scroll">
                <div class="nav-tree">
                    ${renderLocalUploadFolderBranch(localUploadTree || {path:'', name:'全部上传', count:total, children:[]})}
                </div>
                <div class="nav-hint" style="padding:10px 12px;font-size:12px;opacity:.7;">选择图片/视频/音频文件即可上传，文件保存在项目 assets/uploads 目录。</div>
            </div>
        </aside>
        <section class="asset-panel asset-content ${localUploadManageMode ? 'manage-on' : ''}">
            <div class="content-toolbar">
                <div class="content-heading">
                    <strong>${escapeHtml(folderTitle)}</strong>
                    <span>${items.length} / ${total} 个素材</span>
                </div>
                <div class="asset-tools">
                    <label class="asset-search-wrap"><i data-lucide="search"></i><input id="localUploadSearch" class="asset-search" type="search" value="${escapeAttr(localUploadQuery)}" placeholder="搜索本地上传"></label>
                    <button class="asset-btn primary" type="button" data-localup-upload><i data-lucide="upload"></i><span>上传文件</span></button>
                    <button class="asset-btn ${localUploadManageMode ? 'primary' : ''}" type="button" data-localup-manage ${total ? '' : 'disabled'}><i data-lucide="list-checks"></i><span>${localUploadManageMode ? '完成管理' : '批量管理'}</span></button>
                </div>
            </div>
            <div class="manage-tools local-manage-tools">
                <span>已选择 ${selectedLocalUploadIds.size} 个素材，其中 ${imageCount} 张图片。</span>
                <div class="asset-tools local-manage-actions">
                    <button class="asset-btn" type="button" data-localup-select-all ${items.length ? '' : 'disabled'}><i data-lucide="check-square"></i><span>全选</span></button>
                    <button class="asset-btn" type="button" data-localup-clear ${selectedLocalUploadIds.size ? '' : 'disabled'}><i data-lucide="square"></i><span>清空</span></button>
                    <button class="asset-btn danger" type="button" data-localup-delete-selected ${selectedLocalUploadIds.size ? '' : 'disabled'}><i data-lucide="trash-2"></i><span>删除</span></button>
                    ${renderLocalCaptionTools(imageCount)}
                </div>
            </div>
            <div class="content-scroll">
                <div class="asset-grid">
                    ${renderLocalUploadAddCard()}
                    ${items.map(item => renderLocalUploadCard(item)).join('')}
                </div>
            </div>
        </section>
        <aside class="asset-panel asset-detail">
            ${renderLocalUploadDetail(detail)}
        </aside>
    `;
}
function renderLocalUploadAddCard(){
    return `<button id="localUploadDrop" class="upload-grid-card" type="button" data-localup-upload>
        <span class="upload-thumb"><i data-lucide="upload-cloud"></i></span>
        <span class="upload-body">
            <strong>上传本地素材</strong>
            <small>拖入文件或点击上传</small>
        </span>
    </button>`;
}
function renderLocalUploadCard(item){
    const hasCaption = assetKind(item) === 'image' && String(item.caption || '').trim();
    return `<article class="asset-card ${item.id === selectedLocalUploadId ? 'active' : ''}" data-localup-card="${escapeAttr(item.id)}">
        <input class="asset-card-check" type="checkbox" data-localup-check="${escapeAttr(item.id)}" ${selectedLocalUploadIds.has(item.id) ? 'checked' : ''}>
        <div class="asset-thumb">${assetThumb(item)}</div>
        <div class="asset-card-body">
            <div class="asset-card-name" title="${escapeAttr(item.name || '')}">${escapeHtml(item.name || '本地素材')}</div>
            <div class="asset-card-meta">${escapeHtml(assetKindLabel(item))} · ${escapeHtml(formatFileSize(item.size))}${hasCaption ? ' · 有提示词' : ''}</div>
        </div>
    </article>`;
}
function renderLocalUploadDetail(item){
    if(!item) return `<div class="panel-head"><div class="panel-title"><strong>素材预览</strong><span>选择一个素材查看详情</span></div></div><div class="detail-scroll"><div class="detail-empty"><i data-lucide="image"></i><span>暂无可预览素材</span></div></div>`;
    const isImage = assetKind(item) === 'image';
    return `
        <div class="panel-head">
            <div class="panel-title"><strong>素材预览</strong><span>${escapeHtml(assetKindLabel(item))}</span></div>
            <div class="panel-actions">
                <button class="asset-icon-btn" type="button" data-localup-open="${escapeAttr(item.id)}" title="新窗口打开"><i data-lucide="external-link"></i></button>
                <button class="asset-icon-btn" type="button" data-localup-copy="${escapeAttr(item.id)}" title="复制链接"><i data-lucide="link"></i></button>
                <button class="asset-icon-btn danger" type="button" data-localup-delete-one="${escapeAttr(item.id)}" title="删除"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="detail-scroll">
            <div class="detail-media"><button class="detail-media-frame detail-media-zoomable" type="button" data-localup-preview="${escapeAttr(item.id)}" title="点击放大预览">${assetThumb(item)}</button></div>
            <div class="detail-body">
                <div class="detail-name">${escapeHtml(item.name || '本地素材')}</div>
                <div class="detail-meta-grid">
                    <div class="detail-meta"><span>类型</span><strong>${escapeHtml(assetKindLabel(item))}</strong></div>
                    <div class="detail-meta"><span>大小</span><strong>${escapeHtml(formatFileSize(item.size))}</strong></div>
                    <div class="detail-meta"><span>上传时间</span><strong>${escapeHtml(formatDate((item.created_at||0)*1000))}</strong></div>
                    <div class="detail-meta"><span>来源</span><strong>本地上传</strong></div>
                </div>
                <div class="detail-url">${escapeHtml(item.url || '')}</div>
                ${isImage ? `
                    <div class="detail-caption-card">
                        <div class="detail-caption-head">
                            <strong>反推提示词</strong>
                            <button class="asset-btn primary" type="button" data-localup-caption-save="${escapeAttr(item.id)}"><i data-lucide="save"></i><span>保存</span></button>
                        </div>
                        <textarea id="localUploadCaptionEdit" class="detail-caption-textarea" placeholder="暂无反推提示词，可以批量反推后自动写入，也可以在这里手动编辑。">${escapeHtml(item.caption || '')}</textarea>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}
function renderLocalFolderBranch(folder, depth=0){
    const active = folder.id === activeLocalFolderId;
    const contains = !active && (folder.children || []).some(child => child.id === activeLocalFolderId || folderContainsLocalActive(child));
    return `<div class="tree-branch">
        <button class="tree-row ${depth ? 'tree-child' : 'tree-parent'} ${active ? 'active' : ''} ${contains ? 'contains-active' : ''}" type="button" data-local-folder="${escapeAttr(folder.id)}">
            ${depth ? '<span class="tree-elbow"></span>' : ''}
            <span class="tree-row-icon"><i data-lucide="${active ? 'folder-open' : 'folder'}"></i></span>
            <span class="tree-row-name">${escapeHtml(folder.name || '文件夹')}</span>
            <span class="tree-row-count">${localFolderTotal(folder)}</span>
        </button>
        ${(folder.children || []).length ? `<div class="tree-children">${folder.children.map(child => renderLocalFolderBranch(child, depth + 1)).join('')}</div>` : ''}
    </div>`;
}
function folderContainsLocalActive(folder){
    if(!folder) return false;
    if(folder.id === activeLocalFolderId) return true;
    return (folder.children || []).some(child => folderContainsLocalActive(child));
}
function renderLocalCard(item){
    const hasCaption = localItemKind(item) === 'image' && String(item.caption || '').trim();
    return `<article class="asset-card ${item.id === selectedLocalId ? 'active' : ''}" data-local-card="${escapeAttr(item.id)}">
        <input class="asset-card-check" type="checkbox" data-local-check="${escapeAttr(item.id)}" ${selectedLocalIds.has(item.id) ? 'checked' : ''}>
        <div class="asset-thumb">${localAssetThumb(item)}</div>
        <div class="asset-card-body">
            <div class="asset-card-name" title="${escapeAttr(item.relativePath || item.name || '')}">${escapeHtml(item.name || 'local')}</div>
            <div class="asset-card-meta">${escapeHtml(assetKindLabel(item))} · ${escapeHtml(formatFileSize(item.size))}${hasCaption ? ' · 有提示词' : ''}</div>
        </div>
    </article>`;
}
function renderLocalClipboardBar(){
    if(!localClipboard?.items?.length) return '';
    const modeLabel = localClipboard.mode === 'cut' ? '剪切' : '复制';
    const target = activeAssetCategory();
    return `<div class="asset-clipboard-bar">
        <div class="asset-clipboard-info"><i data-lucide="clipboard"></i><span>${escapeHtml(modeLabel)}了 ${localClipboard.items.length} 个本地素材，目标：${escapeHtml(activeAssetLibrary()?.name || '图片资产')} / ${escapeHtml(target?.name || '未选择分组')}</span></div>
        <div class="asset-tools">
            <button class="asset-btn primary" type="button" data-local-import-clipboard ${target ? '' : 'disabled'}><i data-lucide="clipboard-paste"></i><span>导入到图片资产</span></button>
            <button class="asset-icon-btn" type="button" data-local-clear-clipboard title="清空本地剪贴板"><i data-lucide="x"></i></button>
        </div>
    </div>`;
}
function renderLocalDetail(item){
    if(!item) return `<div class="panel-head"><div class="panel-title"><strong>本地预览</strong><span>选择一个本地素材查看详情</span></div></div><div class="detail-scroll"><div class="detail-empty"><i data-lucide="folder-open"></i><span>暂无可预览素材</span></div></div>`;
    return `
        <div class="panel-head">
            <div class="panel-title"><strong>本地预览</strong><span>${escapeHtml(assetKindLabel(item))}</span></div>
            <div class="panel-actions">
                <button class="asset-icon-btn" type="button" data-local-open="${escapeAttr(item.id)}" title="打开预览"><i data-lucide="external-link"></i></button>
                <button class="asset-btn primary" type="button" data-local-import-one="${escapeAttr(item.id)}"><i data-lucide="download"></i><span>导入</span></button>
            </div>
        </div>
        <div class="detail-scroll">
            <div class="detail-media"><button class="detail-media-frame detail-media-zoomable" type="button" data-local-preview="${escapeAttr(item.id)}" title="点击放大预览">${localAssetThumb(item)}</button></div>
            <div class="detail-body">
                <div class="detail-name">${escapeHtml(item.name || '本地素材')}</div>
                <div class="detail-meta-grid">
                    <div class="detail-meta"><span>类型</span><strong>${escapeHtml(assetKindLabel(item))}</strong></div>
                    <div class="detail-meta"><span>大小</span><strong>${escapeHtml(formatFileSize(item.size))}</strong></div>
                    <div class="detail-meta"><span>修改时间</span><strong>${escapeHtml(formatDate(item.lastModified))}</strong></div>
                    <div class="detail-meta"><span>来源</span><strong>${escapeHtml(activeSharedFolderName || '共享文件夹')}</strong></div>
                </div>
                <div class="detail-url">${escapeHtml(item.relativePath || item.name || '')}</div>
            </div>
        </div>
    `;
}
function renderAssetManager(){
    normalizeAssetState();
    const libs = assetLibraries();
    const cats = assetCategories();
    const lib = activeAssetLibrary();
    const cat = activeAssetCategory();
    const items = currentAssetItems();
    const detail = selectedAsset();
    root.innerHTML = `
        <aside class="asset-panel asset-nav">
            <div class="panel-head">
                <div class="panel-title"><strong>资产层级</strong><span>先选库，再选分组</span></div>
                <div class="panel-actions compact-actions">
                    ${assetTreeEdit?.placement === 'head' ? '' : '<button class="asset-icon-btn" type="button" data-asset-lib-new title="新建资产库"><i data-lucide="plus"></i></button>'}
                    ${renderHeadTreeInlineEdit(assetTreeEdit, 'assetTreeEditInput', 'data-asset-tree-edit-save', 'data-asset-tree-edit-cancel')}
                </div>
            </div>
            <div class="nav-scroll">
                <div class="nav-tree">
                    ${libs.map(item => renderAssetTreeBranch(item)).join('')}
                </div>
            </div>
        </aside>
        <section class="asset-panel asset-content ${assetManageMode ? 'manage-on' : ''}">
            <div class="content-toolbar">
                <div class="content-heading">
                    <strong>${escapeHtml(cat?.name || '图片资产')}</strong>
                    <span>${escapeHtml(lib?.name || '资产库')} / ${items.length} 个素材</span>
                </div>
                <div class="asset-tools">
                    <label class="asset-search-wrap"><i data-lucide="search"></i><input id="assetSearch" class="asset-search" type="search" value="${escapeAttr(assetQuery)}" placeholder="搜索素材"></label>
                    <button class="asset-btn ${assetManageMode ? 'primary' : ''}" type="button" data-asset-manage><i data-lucide="list-checks"></i><span>${assetManageMode ? '完成管理' : '批量管理'}</span></button>
                </div>
            </div>
            ${renderAssetClipboardBar()}
            ${renderLocalClipboardBar()}
            <div class="manage-tools">
                <span>已选择 ${selectedAssetIds.size} 个素材，支持拖拽框选或逐个勾选。</span>
                <div class="asset-tools">
                    <button class="asset-btn" type="button" data-asset-select-all ${items.length ? '' : 'disabled'}><i data-lucide="check-square"></i><span>全选</span></button>
                    <button class="asset-btn" type="button" data-asset-clear-selection ${selectedAssetIds.size ? '' : 'disabled'}><i data-lucide="square"></i><span>清空</span></button>
                    <button class="asset-btn" type="button" data-asset-cut-selected ${selectedAssetIds.size ? '' : 'disabled'}><i data-lucide="scissors"></i><span>剪切</span></button>
                    <button class="asset-btn" type="button" data-asset-copy-selected ${selectedAssetIds.size ? '' : 'disabled'}><i data-lucide="copy"></i><span>复制</span></button>
                    <button class="asset-btn danger" type="button" data-asset-delete-selected ${selectedAssetIds.size ? '' : 'disabled'}><i data-lucide="trash-2"></i><span>删除所选</span></button>
                </div>
            </div>
            <div class="content-scroll">
                <div class="asset-grid">
                    ${renderUploadCard(cat)}
                    ${items.map(item => renderAssetCard(item)).join('')}
                    ${items.length ? '' : '<div class="empty-state">当前分组还没有素材，可以上传，或从智能画布输出保存到素材库。</div>'}
                </div>
            </div>
        </section>
        <aside class="asset-panel asset-detail">
            ${renderAssetDetail(detail)}
        </aside>
    `;
}
function renderWorkflowManager(){
    normalizeWorkflowState();
    const cats = workflowCategories();
    const cat = activeWorkflowCategory();
    const items = currentWorkflowItems();
    const detail = selectedWorkflow();
    root.innerHTML = `
        <aside class="asset-panel asset-nav">
            <div class="panel-head">
                <div class="panel-title"><strong>工作流层级</strong><span>独立管理工作流分组</span></div>
                <div class="panel-actions compact-actions">
                    ${workflowTreeEdit?.placement === 'head' ? '' : '<button class="asset-icon-btn" type="button" data-workflow-cat-new title="新建工作流分组"><i data-lucide="folder-plus"></i></button>'}
                    ${renderHeadTreeInlineEdit(workflowTreeEdit, 'workflowTreeEditInput', 'data-workflow-tree-edit-save', 'data-workflow-tree-edit-cancel')}
                </div>
            </div>
            <div class="nav-scroll">
                <div class="nav-tree">
                    <div class="tree-branch expanded">
                        <button class="tree-row tree-parent contains-active" type="button" data-workflow-root>
                            <span class="tree-row-icon"><i data-lucide="folder-open"></i></span>
                            <span class="tree-row-name">工作流库</span>
                            <span class="tree-row-count">${workflowCount()}</span>
                        </button>
                        <div class="tree-children">
                            ${cats.length ? cats.map(c => {
                                const active = c.id === activeWorkflowCategoryId && c.__libraryId === activeWorkflowLibraryId;
                                return `<button class="tree-row tree-child ${active ? 'active' : ''}" type="button" data-workflow-cat="${escapeAttr(c.id)}" data-workflow-cat-lib="${escapeAttr(c.__libraryId || '')}">
                                <span class="tree-elbow"></span>
                                <span class="tree-row-icon"><i data-lucide="workflow"></i></span>
                                <span class="tree-row-name">${escapeHtml(c.name || '工作流')}</span>
                                <span class="tree-row-count">${(c.items || []).length}</span>
                            </button>${active ? renderWorkflowTreeActionBar() : ''}`;
                            }).join('') : '<div class="tree-empty">暂无工作流分组</div>'}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        <section class="asset-panel asset-content ${workflowManageMode ? 'manage-on' : ''}">
            <div class="content-toolbar">
                <div class="content-heading">
                    <strong>${escapeHtml(cat?.name || '工作流管理')}</strong>
                    <span>工作流库 / ${items.length} 个工作流</span>
                </div>
                <div class="asset-tools">
                    <label class="asset-search-wrap"><i data-lucide="search"></i><input id="workflowSearch" class="asset-search" type="search" value="${escapeAttr(workflowQuery)}" placeholder="搜索工作流"></label>
                    <button class="asset-btn ${workflowManageMode ? 'primary' : ''}" type="button" data-workflow-manage><i data-lucide="list-checks"></i><span>${workflowManageMode ? '完成管理' : '批量管理'}</span></button>
                </div>
            </div>
            <div class="manage-tools">
                <span>已选择 ${selectedWorkflowIds.size} 个工作流。</span>
                <div class="asset-tools">
                    <button class="asset-btn" type="button" data-workflow-select-all ${items.length ? '' : 'disabled'}><i data-lucide="check-square"></i><span>全选</span></button>
                    <button class="asset-btn" type="button" data-workflow-clear-selection ${selectedWorkflowIds.size ? '' : 'disabled'}><i data-lucide="square"></i><span>清空</span></button>
                    <button class="asset-btn" type="button" data-workflow-export-selected ${selectedWorkflowIds.size ? '' : 'disabled'}><i data-lucide="download"></i><span>导出所选</span></button>
                    <button class="asset-btn danger" type="button" data-workflow-delete-selected ${selectedWorkflowIds.size ? '' : 'disabled'}><i data-lucide="trash-2"></i><span>删除所选</span></button>
                </div>
            </div>
            <div class="content-scroll">
                <div class="asset-grid">
                    ${renderWorkflowUploadCard(cat)}
                    ${items.map(item => renderWorkflowCard(item)).join('')}
                    ${items.length ? '' : '<div class="empty-state">当前分组还没有工作流，可以上传 JSON / ZIP，或从传统画布导出到资产库。</div>'}
                </div>
            </div>
        </section>
        <aside class="asset-panel asset-detail">
            ${renderWorkflowDetail(detail)}
        </aside>
    `;
}
function renderWorkflowUploadCard(cat){
    return `<button id="workflowDrop" class="upload-grid-card" type="button" data-workflow-upload ${!cat ? 'disabled' : ''}>
        <span class="upload-thumb"><i data-lucide="upload-cloud"></i></span>
        <span class="upload-body">
            <strong>上传工作流</strong>
            <small>支持 JSON / ZIP</small>
        </span>
    </button>`;
}
function renderWorkflowTreeActionBar(){
    const editHtml = renderWorkflowTreeInlineEdit();
    if(editHtml) return editHtml;
    const deleteKey = `workflow-cat:${activeWorkflowLibraryId}:${activeWorkflowCategoryId}`;
    return `<div class="tree-action-bar child-actions">
        <button type="button" data-workflow-cat-rename><i data-lucide="pencil"></i><span>重命名</span></button>
        <button type="button" class="danger ${pendingTreeDelete === deleteKey ? 'detail-confirm' : ''}" data-workflow-cat-delete><i data-lucide="trash-2"></i><span>${pendingTreeDelete === deleteKey ? '确认删除' : '删除'}</span></button>
    </div>`;
}
function renderWorkflowTreeInlineEdit(){
    if(!workflowTreeEdit || workflowTreeEdit.placement === 'head') return '';
    if(workflowTreeEdit.kind !== 'category-rename') return '';
    const label = workflowTreeEdit.label || '名称';
    return `<div class="tree-inline-edit child-actions">
        <input id="workflowTreeEditInput" type="text" value="${escapeAttr(workflowTreeEdit.value || '')}" placeholder="${escapeAttr(label)}">
        <button type="button" class="primary" data-workflow-tree-edit-save><i data-lucide="check"></i><span>保存</span></button>
        <button type="button" data-workflow-tree-edit-cancel><i data-lucide="x"></i><span>取消</span></button>
    </div>`;
}
function renderWorkflowCard(item){
    return `<article class="asset-card workflow-card ${item.id === selectedWorkflowId ? 'active' : ''}" data-workflow-card="${escapeAttr(item.id)}">
        <input class="asset-card-check" type="checkbox" data-workflow-check="${escapeAttr(item.id)}" ${selectedWorkflowIds.has(item.id) ? 'checked' : ''}>
        <div class="asset-thumb">${workflowThumb(item)}</div>
        <div class="asset-card-body">
            <div class="asset-card-name" title="${escapeAttr(item.name || '')}">${escapeHtml(item.name || 'workflow')}</div>
            <div class="asset-card-meta">${escapeHtml(workflowKindLabel(item))} · ${escapeHtml(formatDate(item.created_at))}</div>
        </div>
    </article>`;
}
function renderWorkflowDetail(item){
    if(!item) return `<div class="panel-head"><div class="panel-title"><strong>工作流详情</strong><span>选择一个工作流查看详情</span></div></div><div class="detail-scroll"><div class="detail-empty"><i data-lucide="workflow"></i><span>暂无工作流</span></div></div>`;
    return `
        <div class="panel-head">
            <div class="panel-title"><strong>工作流详情</strong><span>${escapeHtml(workflowKindLabel(item))}</span></div>
            <div class="panel-actions">
                <button class="asset-icon-btn" type="button" data-workflow-download="${escapeAttr(item.id)}" title="导出工作流"><i data-lucide="download"></i></button>
                <button class="asset-icon-btn" type="button" data-workflow-rename="${escapeAttr(item.id)}" title="重命名"><i data-lucide="pencil"></i></button>
                <button class="asset-icon-btn danger ${pendingDeleteAssetId === item.id ? 'detail-confirm' : ''}" type="button" data-workflow-delete="${escapeAttr(item.id)}" title="${pendingDeleteAssetId === item.id ? '再次点击确认删除' : '删除'}"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="detail-scroll">
            <div class="detail-media"><div class="detail-media-frame">${workflowThumb(item)}</div></div>
            <div class="detail-body">
                <input class="detail-name-input" data-workflow-inline-name="${escapeAttr(item.id)}" type="text" value="${escapeAttr(item.name || 'workflow')}" title="直接修改名称">
                <div class="detail-meta-grid">
                    <div class="detail-meta"><span>类型</span><strong>${escapeHtml(workflowKindLabel(item))}</strong></div>
                    <div class="detail-meta"><span>创建时间</span><strong>${escapeHtml(formatDate(item.created_at))}</strong></div>
                    <div class="detail-meta"><span>位置</span><strong>工作流库</strong></div>
                    <div class="detail-meta"><span>分组</span><strong>${escapeHtml(activeWorkflowCategory()?.name || '工作流')}</strong></div>
                </div>
                <div class="detail-url">${escapeHtml(item.url || '')}</div>
            </div>
        </div>
    `;
}
function renderUploadCard(cat){
    return `<button id="assetDrop" class="upload-grid-card" type="button" data-asset-upload ${!cat ? 'disabled' : ''}>
        <span class="upload-thumb"><i data-lucide="upload-cloud"></i></span>
        <span class="upload-body">
            <strong>上传到当前分组</strong>
            <small>拖入文件或点击上传</small>
        </span>
    </button>`;
}
function renderAssetClipboardBar(){
    if(!assetClipboard?.ids?.length) return '';
    const modeLabel = assetClipboard.mode === 'cut' ? '剪切' : '复制';
    const sameTarget = assetClipboard.sourceLibraryId === activeAssetLibraryId && assetClipboard.sourceCategoryId === activeAssetCategoryId;
    const pasteText = sameTarget && assetClipboard.mode === 'cut' ? '选择其他分组后粘贴' : '粘贴到当前分组';
    return `<div class="asset-clipboard-bar">
        <div class="asset-clipboard-info"><i data-lucide="clipboard"></i><span>${escapeHtml(modeLabel)}了 ${assetClipboard.ids.length} 个素材</span></div>
        <div class="asset-tools">
            <button class="asset-btn primary" type="button" data-asset-paste-clipboard ${sameTarget && assetClipboard.mode === 'cut' ? 'disabled' : ''}><i data-lucide="clipboard-paste"></i><span>${escapeHtml(pasteText)}</span></button>
            <button class="asset-icon-btn" type="button" data-asset-clear-clipboard title="清空剪贴板"><i data-lucide="x"></i></button>
        </div>
    </div>`;
}
function renderAssetTreeBranch(lib){
    const isActiveLib = lib.id === activeAssetLibraryId;
    const cats = (lib.categories || []).filter(cat => (cat.type || 'image') === 'image');
    const showLibActions = isActiveLib && assetTreeFocus === 'library';
    return `<div class="tree-branch ${isActiveLib ? 'expanded' : ''}">
        <button class="tree-row tree-parent ${isActiveLib ? 'contains-active' : ''} ${showLibActions ? 'active' : ''}" type="button" data-asset-lib="${escapeAttr(lib.id)}">
            <span class="tree-row-icon"><i data-lucide="${isActiveLib ? 'folder-open' : 'folder'}"></i></span>
            <span class="tree-row-name">${escapeHtml(lib.name || '资产库')}</span>
            <span class="tree-row-count">${assetCountForLibrary(lib)}</span>
        </button>
        ${showLibActions ? renderAssetTreeActionBar('library') : ''}
        <div class="tree-children">
            ${cats.length ? cats.map(cat => `<button class="tree-row tree-child ${isActiveLib && cat.id === activeAssetCategoryId && assetTreeFocus === 'category' ? 'active' : ''}" type="button" data-asset-cat="${escapeAttr(cat.id)}" data-asset-cat-lib="${escapeAttr(lib.id)}">
                <span class="tree-elbow"></span>
                <span class="tree-row-icon"><i data-lucide="image"></i></span>
                <span class="tree-row-name">${escapeHtml(cat.name || '分组')}</span>
                <span class="tree-row-count">${(cat.items || []).length}</span>
            </button>${isActiveLib && cat.id === activeAssetCategoryId && assetTreeFocus === 'category' ? renderAssetTreeActionBar('category') : ''}`).join('') : '<div class="tree-empty">暂无分组</div>'}
        </div>
    </div>`;
}
function renderAssetTreeActionBar(kind){
    const editHtml = renderAssetTreeInlineEdit(kind);
    if(editHtml) return editHtml;
    const deleteKey = kind === 'library' ? `asset-lib:${activeAssetLibraryId}` : `asset-cat:${activeAssetCategoryId}`;
    if(kind === 'library'){
        return `<div class="tree-action-bar library-actions">
            <button type="button" data-asset-cat-new><i data-lucide="folder-plus"></i><span>新分组</span></button>
            <button type="button" data-asset-lib-rename><i data-lucide="pencil"></i><span>重命名</span></button>
            <button type="button" class="danger ${pendingTreeDelete === deleteKey ? 'detail-confirm' : ''}" data-asset-lib-delete><i data-lucide="trash-2"></i><span>${pendingTreeDelete === deleteKey ? '确认删除' : '删除库'}</span></button>
        </div>`;
    }
    return `<div class="tree-action-bar child-actions">
        <button type="button" data-asset-cat-new><i data-lucide="folder-plus"></i><span>新分组</span></button>
        <button type="button" data-asset-cat-rename><i data-lucide="pencil"></i><span>重命名</span></button>
        <button type="button" class="danger ${pendingTreeDelete === deleteKey ? 'detail-confirm' : ''}" data-asset-cat-delete><i data-lucide="trash-2"></i><span>${pendingTreeDelete === deleteKey ? '确认删除' : '删除'}</span></button>
    </div>`;
}
function renderAssetTreeInlineEdit(kind){
    if(!assetTreeEdit) return '';
    if(assetTreeEdit.placement === 'head') return '';
    const expectedKinds = kind === 'library'
        ? ['library-new', 'library-rename', 'category-new']
        : ['category-new', 'category-rename'];
    if(!expectedKinds.includes(assetTreeEdit.kind)) return '';
    const label = assetTreeEdit.label || '名称';
    return `<div class="tree-inline-edit ${kind === 'category' ? 'child-actions' : 'library-actions'}">
        <input id="assetTreeEditInput" type="text" value="${escapeAttr(assetTreeEdit.value || '')}" placeholder="${escapeAttr(label)}">
        <button type="button" class="primary" data-asset-tree-edit-save><i data-lucide="check"></i><span>保存</span></button>
        <button type="button" data-asset-tree-edit-cancel><i data-lucide="x"></i><span>取消</span></button>
    </div>`;
}
function renderAssetCard(item){
    return `<article class="asset-card ${item.id === selectedAssetId ? 'active' : ''}" data-asset-card="${escapeAttr(item.id)}">
        <input class="asset-card-check" type="checkbox" data-asset-check="${escapeAttr(item.id)}" ${selectedAssetIds.has(item.id) ? 'checked' : ''}>
        <div class="asset-thumb">${assetThumb(item)}</div>
        <div class="asset-card-body">
            <div class="asset-card-name" title="${escapeAttr(item.name || '')}">${escapeHtml(item.name || 'asset')}</div>
            <div class="asset-card-meta">${escapeHtml(assetKindLabel(item))} · ${escapeHtml(formatDate(item.created_at))}</div>
        </div>
    </article>`;
}
function renderAvatarRegistrationCard(item, platform, reg, busy){
    const status = String(reg.status || '');
    const tag = `<span class="avatar-platform-tag">${escapeHtml(avatarPlatformLabel(platform))}</span>`;
    const providerId = avatarProviderIdForPlatform(platform, reg.provider_id || '');
    const provAttr = `data-avatar-prov="${escapeAttr(providerId)}"`;
    if(status === 'Active' && reg.asset_uri){
        return `<div class="avatar-card registered">
            <div class="avatar-head"><i data-lucide="badge-check"></i><span>已认证可用</span>${tag}</div>
            <div class="avatar-uri" title="只能在 ${escapeAttr(avatarPlatformLabel(platform))} 平台的视频生成中通过 @ 调用">${escapeHtml(reg.asset_uri)}</div>
            <div class="asset-tools">
                <button class="asset-btn" type="button" data-avatar-copy="${escapeAttr(reg.asset_uri)}"><i data-lucide="copy"></i><span>复制 asset:// 地址</span></button>
                <button class="asset-btn" type="button" data-avatar-register="${escapeAttr(item.id)}" ${provAttr} ${busy ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${busy ? '处理中…' : '重新注册'}</span></button>
            </div>
        </div>`;
    }
    if(status === 'Processing'){
        return `<div class="avatar-card processing">
            <div class="avatar-head"><i data-lucide="loader"></i><span>审核中</span>${tag}</div>
            <div class="avatar-hint">已提交到 ${escapeHtml(avatarPlatformLabel(platform))} 审核（任务 ${escapeHtml(reg.task_id || '')}），通过后会自动生成 asset:// 地址。审核通常需要几十秒到几分钟。</div>
            <div class="asset-tools">
                <button class="asset-btn primary" type="button" data-avatar-check="${escapeAttr(item.id)}" ${provAttr} ${busy ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${busy ? '查询中…' : '刷新审核状态'}</span></button>
            </div>
        </div>`;
    }
    return `<div class="avatar-card failed">
        <div class="avatar-head"><i data-lucide="x-circle"></i><span>审核未通过</span>${tag}</div>
        <div class="avatar-hint warn">${escapeHtml(reg.detail || '审核未通过，请更换素材后重试。')}</div>
        <div class="asset-tools">
            <button class="asset-btn" type="button" data-avatar-register="${escapeAttr(item.id)}" ${provAttr} ${busy ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${busy ? '处理中…' : '重新提交'}</span></button>
        </div>
    </div>`;
}
function renderAvatarSection(item){
    const busy = avatarBusyId === item.id;
    const regs = (item.registrations && typeof item.registrations === 'object') ? item.registrations : {};
    const cards = Object.keys(regs)
        .filter(platform => regs[platform] && regs[platform].task_id)
        .map(platform => renderAvatarRegistrationCard(item, platform, regs[platform], busy))
        .join('');
    const providers = avatarCandidateProviders();
    if(!providers.length){
        return `<div class="avatar-section">
            ${cards}
            <div class="avatar-head"><i data-lucide="user-round-cog"></i><span>注册为真人/数字人</span></div>
            <div class="avatar-hint">未检测到可用平台。请先在「API 平台管理」中添加并启用 API 平台（如 APIMart）并填写 Key。</div>
        </div>`;
    }
    const selected = activeAvatarProvider();
    const selPlatform = providerAvatarPlatform(selected);
    const supported = providerAvatarSupported(selected);
    const noKey = selected && selected.has_key === false;
    const alreadyRegistered = supported && regs[selPlatform] && regs[selPlatform].task_id;
    const select = `<select class="avatar-provider-select" data-avatar-provider>${providers.map(p => `<option value="${escapeAttr(p.id)}" ${p.id === selected?.id ? 'selected' : ''}>${escapeHtml(avatarProviderOptionLabel(p))}</option>`).join('')}</select>`;
    let registerUI;
    if(!supported){
        registerUI = `<div class="avatar-hint">认证是跨平台功能，但「${escapeHtml(selPlatform ? avatarPlatformLabel(selPlatform) : (selected?.name || selected?.id || '该平台'))}」的资产认证 API 尚未接入（待接入）。请选择已支持的平台，或继续使用官方控制台认证。</div>${select}`;
    } else {
        registerUI = `
            <div class="avatar-hint">提交到 ${escapeHtml(avatarPlatformLabel(selPlatform))} 私域素材审核，通过后生成 asset:// 地址，可在该平台的视频生成中通过 @ 直接调用（一个素材可注册到多个平台，平台间互相隔离）。</div>
            ${select}
            ${noKey ? '<div class="avatar-hint warn">该平台尚未配置 API Key。</div>' : ''}
            ${alreadyRegistered ? '<div class="avatar-hint">该平台已注册，再次提交会覆盖该平台的认证。</div>' : ''}
            <button class="asset-btn primary" type="button" data-avatar-register="${escapeAttr(item.id)}" data-avatar-prov="${escapeAttr(selected?.id || '')}" ${busy || noKey ? 'disabled' : ''}><i data-lucide="user-round-plus"></i><span>${busy ? '注册中，请稍候…' : (alreadyRegistered ? '重新注册到该平台' : '注册并等待审核')}</span></button>`;
    }
    return `<div class="avatar-section">
        ${cards}
        <div class="avatar-head"><i data-lucide="user-round-cog"></i><span>注册到平台</span></div>
        ${registerUI}
    </div>`;
}
function renderAssetDetail(item){
    if(!item) return `<div class="panel-head"><div class="panel-title"><strong>素材预览</strong><span>选择一个素材查看详情</span></div></div><div class="detail-scroll"><div class="detail-empty"><i data-lucide="image"></i><span>暂无可预览素材</span></div></div>`;
    if(assetEditMode && item.id === selectedAssetId){
        return `
            <div class="panel-head">
                <div class="panel-title"><strong>编辑素材</strong><span>当前分组内直接保存</span></div>
                <div class="panel-actions">
                    <button class="asset-btn primary" type="button" data-asset-edit-save="${escapeAttr(item.id)}"><i data-lucide="check"></i><span>保存</span></button>
                    <button class="asset-icon-btn" type="button" data-asset-edit-cancel title="取消"><i data-lucide="x"></i></button>
                </div>
            </div>
            <div class="detail-scroll">
                <div class="detail-media"><button class="detail-media-frame detail-media-zoomable" type="button" data-asset-preview="${escapeAttr(item.id)}" title="点击放大预览">${assetThumb(item)}</button></div>
                <div class="inline-edit-form">
                    <label class="inline-edit-field"><span>素材名称</span><input id="assetEditName" type="text" value="${escapeAttr(item.name || '')}" placeholder="素材名称"></label>
                    <div class="detail-meta-grid">
                        <div class="detail-meta"><span>类型</span><strong>${escapeHtml(assetKindLabel(item))}</strong></div>
                        <div class="detail-meta"><span>创建时间</span><strong>${escapeHtml(formatDate(item.created_at))}</strong></div>
                    </div>
                    <div class="detail-url">${escapeHtml(item.url || '')}</div>
                </div>
            </div>
        `;
    }
    return `
        <div class="panel-head">
            <div class="panel-title"><strong>素材预览</strong><span>${escapeHtml(assetKindLabel(item))}</span></div>
            <div class="panel-actions">
                <button class="asset-icon-btn" type="button" data-asset-open="${escapeAttr(item.id)}" title="打开素材"><i data-lucide="external-link"></i></button>
                <button class="asset-icon-btn" type="button" data-asset-edit-start="${escapeAttr(item.id)}" title="编辑"><i data-lucide="pencil"></i></button>
                <button class="asset-icon-btn danger ${pendingDeleteAssetId === item.id ? 'detail-confirm' : ''}" type="button" data-asset-delete="${escapeAttr(item.id)}" title="${pendingDeleteAssetId === item.id ? '再次点击确认删除' : '删除'}"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="detail-scroll">
            <div class="detail-media"><button class="detail-media-frame detail-media-zoomable" type="button" data-asset-preview="${escapeAttr(item.id)}" title="点击放大预览">${assetThumb(item)}</button></div>
            <div class="detail-body">
                <input class="detail-name-input" data-asset-inline-name="${escapeAttr(item.id)}" type="text" value="${escapeAttr(item.name || 'asset')}" title="直接修改名称">
                <div class="detail-meta-grid">
                    <div class="detail-meta"><span>类型</span><strong>${escapeHtml(assetKindLabel(item))}</strong></div>
                    <div class="detail-meta"><span>创建时间</span><strong>${escapeHtml(formatDate(item.created_at))}</strong></div>
                    <div class="detail-meta"><span>资产库</span><strong>${escapeHtml(activeAssetLibrary()?.name || '资产库')}</strong></div>
                    <div class="detail-meta"><span>分组</span><strong>${escapeHtml(activeAssetCategory()?.name || '分组')}</strong></div>
                </div>
                <div class="detail-url">${escapeHtml(item.url || '')}</div>
                ${renderAvatarSection(item)}
            </div>
        </div>
    `;
}
function renderPromptManager(){
    normalizePromptState();
    const libs = promptLibraries();
    const lib = activePromptLibrary();
    const readonly = Boolean(lib?.readonly);
    const cats = activePromptCategories();
    const items = currentPromptItems();
    const detail = promptCreateMode ? null : selectedPrompt();
    const promptEmptyText = (lib?.items || []).length
        ? '当前条件下没有提示词。可以切换分类或清空搜索条件。'
        : `${lib?.name || '当前提示词库'} 暂无提示词，点击「新增」添加。`;
    root.innerHTML = `
        <aside class="asset-panel asset-nav">
            <div class="panel-head">
                <div class="panel-title"><strong>提示词库</strong><span>可创建多个词库</span></div>
                <div class="panel-actions compact-actions">
                    ${promptTreeEdit?.placement === 'head' ? '' : '<button class="asset-icon-btn" type="button" data-prompt-lib-new title="新建提示词库"><i data-lucide="plus"></i></button>'}
                    ${renderHeadTreeInlineEdit(promptTreeEdit, 'promptTreeEditInput', 'data-prompt-tree-edit-save', 'data-prompt-tree-edit-cancel')}
                </div>
            </div>
            <div class="nav-scroll">
                <div class="nav-tree">
                    ${libs.map(item => renderPromptTreeBranch(item)).join('')}
                </div>
            </div>
        </aside>
        <section class="asset-panel asset-content ${promptManageMode ? 'manage-on' : ''}">
            <div class="content-toolbar">
                <div class="content-heading">
                    <strong>${escapeHtml(lib?.name || '提示词库')}</strong>
                    <span>共 ${items.length} 条提示词</span>
                </div>
                <div class="asset-tools">
                    <label class="asset-search-wrap"><i data-lucide="search"></i><input id="promptSearch" class="asset-search" type="search" value="${escapeAttr(promptQuery)}" placeholder="搜索名称、说明或正文"></label>
                    <button class="asset-btn primary" type="button" data-prompt-new ${readonly ? 'disabled' : ''}><i data-lucide="file-plus-2"></i><span>新增</span></button>
                    <button class="asset-btn ${promptManageMode ? 'primary' : ''}" type="button" data-prompt-manage><i data-lucide="list-checks"></i><span>${promptManageMode ? '完成管理' : '批量管理'}</span></button>
                </div>
            </div>
            <div class="manage-tools">
                <span>已选择 ${selectedPromptIds.size} 条提示词，支持拖拽框选或逐个勾选。</span>
                <div class="asset-tools">
                    <button class="asset-btn" type="button" data-prompt-select-all ${items.length && !readonly ? '' : 'disabled'}><i data-lucide="check-square"></i><span>全选</span></button>
                    <button class="asset-btn" type="button" data-prompt-clear-selection ${selectedPromptIds.size ? '' : 'disabled'}><i data-lucide="square"></i><span>清空</span></button>
                    <button class="asset-btn danger ${pendingBatchDelete === 'prompt' ? 'detail-confirm' : ''}" type="button" data-prompt-delete-selected ${readonly || !selectedPromptIds.size ? 'disabled' : ''}><i data-lucide="trash-2"></i><span>${pendingBatchDelete === 'prompt' ? '确认删除' : '删除所选'}</span></button>
                </div>
            </div>
            <div class="content-scroll">
                ${items.length ? `<div class="prompt-list">${items.map(item => renderPromptRow(item, readonly)).join('')}</div>` : `<div class="empty-state">${escapeHtml(promptEmptyText)}</div>`}
            </div>
        </section>
        <aside class="asset-panel asset-detail">
            ${renderPromptDetail(detail, readonly)}
        </aside>
    `;
}
function renderPromptTreeBranch(lib){
    const isActiveLib = lib.id === activePromptLibraryId;
    const cats = Array.isArray(lib.categories) && lib.categories.length ? lib.categories : activePromptCategories();
    const libId = escapeAttr(lib.id);
    const readonly = Boolean(lib.readonly);
    const showLibActions = isActiveLib && promptTreeFocus === 'library';
    return `<div class="tree-branch ${isActiveLib ? 'expanded' : ''}">
        <button class="tree-row tree-parent ${isActiveLib ? 'contains-active' : ''} ${showLibActions ? 'active' : ''}" type="button" data-prompt-lib="${libId}">
            <span class="tree-row-icon"><i data-lucide="${lib.id === 'system' ? 'sparkles' : 'book-open'}"></i></span>
            <span class="tree-row-name">${escapeHtml(lib.name || '提示词库')}</span>
            <span class="tree-row-count">${(lib.items || []).length}</span>
        </button>
        ${showLibActions ? renderPromptTreeActionBar('library') : ''}
        <div class="tree-children">
            <button class="tree-row tree-child ${isActiveLib && activePromptCategory === 'all' && promptTreeFocus === 'category' ? 'active' : ''}" type="button" data-prompt-cat="all" data-prompt-cat-lib="${libId}">
                <span class="tree-elbow"></span>
                <span class="tree-row-icon"><i data-lucide="layout-list"></i></span>
                <span class="tree-row-name">全部提示词</span>
                <span class="tree-row-count">${promptCountForCategory('all', lib)}</span>
            </button>
            ${cats.map(cat => {
                const active = isActiveLib && cat.id === activePromptCategory && promptTreeFocus === 'category';
                return `<button class="tree-row tree-child ${active ? 'active' : ''}" type="button" data-prompt-cat="${escapeAttr(cat.id)}" data-prompt-cat-lib="${libId}">
                <span class="tree-elbow"></span>
                <span class="tree-row-icon"><i data-lucide="tag"></i></span>
                <span class="tree-row-name">${escapeHtml(cat.name || promptCategoryLabel(cat.id))}</span>
                <span class="tree-row-count">${promptCountForCategory(cat.id, lib)}</span>
            </button>${active ? renderPromptTreeActionBar('category') : ''}`;
            }).join('')}
        </div>
    </div>`;
}
function renderPromptTreeActionBar(kind){
    const editHtml = renderPromptTreeInlineEdit(kind);
    if(editHtml) return editHtml;
    if(kind === 'library'){
        const lib = activePromptLibrary();
        const isSystem = isSystemPromptLibrary(lib);
        const deleteKey = `prompt-lib:${lib?.id || ''}`;
        return `<div class="tree-action-bar library-actions">
            <button type="button" data-prompt-cat-new><i data-lucide="folder-plus"></i><span>新分组</span></button>
            <button type="button" data-prompt-lib-rename><i data-lucide="pencil"></i><span>重命名</span></button>
            ${isSystem ? '' : `<button type="button" class="danger ${pendingTreeDelete === deleteKey ? 'detail-confirm' : ''}" data-prompt-lib-delete><i data-lucide="trash-2"></i><span>${pendingTreeDelete === deleteKey ? '确认删除' : '删除库'}</span></button>`}
        </div>`;
    }
    if(activePromptCategory === 'all'){
        return `<div class="tree-action-bar child-actions muted-actions"><span><i data-lucide="lock"></i>请选择具体分组后编辑</span></div>`;
    }
    const deleteKey = `prompt-cat:${activePromptCategory}`;
    return `<div class="tree-action-bar child-actions">
        <button type="button" data-prompt-cat-rename><i data-lucide="pencil"></i><span>重命名</span></button>
        <button type="button" class="danger ${pendingTreeDelete === deleteKey ? 'detail-confirm' : ''}" data-prompt-cat-delete><i data-lucide="trash-2"></i><span>${pendingTreeDelete === deleteKey ? '确认删除' : '删除'}</span></button>
    </div>`;
}
function renderPromptTreeInlineEdit(kind){
    if(!promptTreeEdit) return '';
    if(promptTreeEdit.placement === 'head') return '';
    const expectedKinds = kind === 'library' ? ['library-new', 'library-rename', 'category-new'] : ['category-new', 'category-rename'];
    if(!expectedKinds.includes(promptTreeEdit.kind)) return '';
    const label = promptTreeEdit.label || '名称';
    return `<div class="tree-inline-edit ${kind === 'category' ? 'child-actions' : 'library-actions'}">
        <input id="promptTreeEditInput" type="text" value="${escapeAttr(promptTreeEdit.value || '')}" placeholder="${escapeAttr(label)}">
        <button type="button" class="primary" data-prompt-tree-edit-save><i data-lucide="check"></i><span>保存</span></button>
        <button type="button" data-prompt-tree-edit-cancel><i data-lucide="x"></i><span>取消</span></button>
    </div>`;
}
function renderPromptRow(item, readonly){
    return `<article class="prompt-row ${item.id === selectedPromptId ? 'active' : ''}" data-prompt-row="${escapeAttr(item.id)}">
        <input class="prompt-row-check" type="checkbox" data-prompt-check="${escapeAttr(item.id)}" ${selectedPromptIds.has(item.id) ? 'checked' : ''} ${readonly ? 'disabled' : ''}>
        <div class="prompt-row-main">
            <div class="prompt-row-title"><strong>${escapeHtml(item.name || '提示词')}</strong><span class="prompt-tag">${escapeHtml(promptCategoryLabel(item.category || 'custom'))}</span></div>
            <div class="prompt-row-scene">${escapeHtml(item.scene || '未填写用途说明')}</div>
            <div class="prompt-row-text">${escapeHtml(item.positive || '')}</div>
        </div>
    </article>`;
}
function renderPromptDetail(item, readonly){
    if(promptCreateMode && !readonly){
        return `
            <div class="panel-head">
                <div class="panel-title"><strong>新增提示词</strong><span>保存到当前提示词库</span></div>
                <div class="panel-actions">
                    <button class="asset-btn primary" type="button" data-prompt-create-save><i data-lucide="check"></i><span>保存</span></button>
                    <button class="asset-icon-btn" type="button" data-prompt-edit-cancel title="取消"><i data-lucide="x"></i></button>
                </div>
            </div>
            <div class="detail-scroll">
                <div class="inline-edit-form">
                    <label class="inline-edit-field"><span>名称</span><input id="promptEditName" type="text" value="" placeholder="提示词名称"></label>
                    <label class="inline-edit-field"><span>用途说明</span><textarea id="promptEditScene" placeholder="用途说明"></textarea></label>
                    <label class="inline-edit-field"><span>正向提示词</span><textarea id="promptEditPositive" placeholder="正向提示词"></textarea></label>
                    <label class="inline-edit-field"><span>负向提示词</span><textarea id="promptEditNegative" placeholder="负向提示词"></textarea></label>
                </div>
            </div>
        `;
    }
    if(!item) return `<div class="panel-head"><div class="panel-title"><strong>提示词预览</strong><span>选择一条提示词查看全文</span></div></div><div class="detail-scroll"><div class="detail-empty"><i data-lucide="text-cursor-input"></i><span>暂无可预览提示词</span></div></div>`;
    if(promptEditMode && item.id === selectedPromptId && !readonly){
        return `
            <div class="panel-head">
                <div class="panel-title"><strong>编辑提示词</strong><span>在当前库内保存</span></div>
                <div class="panel-actions">
                    <button class="asset-btn primary" type="button" data-prompt-edit-save="${escapeAttr(item.id)}"><i data-lucide="check"></i><span>保存</span></button>
                    <button class="asset-icon-btn" type="button" data-prompt-edit-cancel title="取消"><i data-lucide="x"></i></button>
                </div>
            </div>
            <div class="detail-scroll">
                <div class="inline-edit-form">
                    <label class="inline-edit-field"><span>名称</span><input id="promptEditName" type="text" value="${escapeAttr(item.name || '')}" placeholder="提示词名称"></label>
                    <label class="inline-edit-field"><span>用途说明</span><textarea id="promptEditScene" placeholder="用途说明">${escapeHtml(item.scene || '')}</textarea></label>
                    <label class="inline-edit-field"><span>正向提示词</span><textarea id="promptEditPositive" placeholder="正向提示词">${escapeHtml(item.positive || '')}</textarea></label>
                    <label class="inline-edit-field"><span>负向提示词</span><textarea id="promptEditNegative" placeholder="负向提示词">${escapeHtml(item.negative || '')}</textarea></label>
                </div>
            </div>
        `;
    }
    const params = item.params && typeof item.params === 'object' ? Object.entries(item.params) : [];
    return `
        <div class="panel-head">
            <div class="panel-title"><strong>提示词预览</strong><span>${escapeHtml(promptCategoryLabel(item.category || 'custom'))}</span></div>
            <div class="panel-actions">
                <button class="asset-icon-btn" type="button" data-prompt-edit-start="${escapeAttr(item.id)}" ${readonly ? 'disabled' : ''} title="编辑"><i data-lucide="pencil"></i></button>
                <button class="asset-icon-btn danger ${pendingDeletePromptId === item.id ? 'detail-confirm' : ''}" type="button" data-prompt-delete="${escapeAttr(item.id)}" ${readonly ? 'disabled' : ''} title="${pendingDeletePromptId === item.id ? '再次点击确认删除' : '删除'}"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="detail-scroll">
            <div class="prompt-detail-head">
                <div class="prompt-detail-title">${escapeHtml(item.name || '提示词')}</div>
                <div class="prompt-detail-scene">${escapeHtml(item.scene || '未填写用途说明')}</div>
            </div>
            <section class="prompt-block">
                <div class="prompt-block-head"><span>正向提示词</span><span>${String(item.positive || '').length} 字符</span></div>
                <div class="prompt-block-body">${escapeHtml(item.positive || '未填写')}</div>
            </section>
            <section class="prompt-block">
                <div class="prompt-block-head"><span>负向提示词</span><span>${String(item.negative || '').length} 字符</span></div>
                <div class="prompt-block-body negative">${escapeHtml(item.negative || '未填写')}</div>
            </section>
            ${params.length ? `<div class="params-list">${params.map(([key, value]) => `<div class="param-row"><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></div>`).join('')}</div>` : ''}
        </div>
    `;
}
async function uploadFiles(files){
    const cat = activeAssetCategory();
    if(!cat) throw new Error('请先创建图片分组');
    const form = new FormData();
    [...files].forEach(file => form.append('files', file));
    const uploaded = await apiJson('/api/ai/upload', {method:'POST', body:form});
    const items = (uploaded.files || []).filter(file => file?.url).map(file => ({
        library_id:activeAssetLibraryId,
        category_id:activeAssetCategoryId,
        url:file.url,
        name:file.name || 'asset'
    }));
    if(!items.length) throw new Error('没有可保存的素材');
    const data = await apiJson('/api/asset-library/items/batch', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({library_id:activeAssetLibraryId, category_id:activeAssetCategoryId, items})
    });
    assetLibrary = data.library || assetLibrary;
    selectedAssetIds.clear();
    selectedAssetId = data.items?.[0]?.id || selectedAssetId;
    render();
    setStatus(`已上传 ${items.length} 个素材`);
    return {count:items.length, items:data.items || []};
}
async function uploadWorkflowFiles(files){
    const cat = activeWorkflowCategory();
    if(!cat) throw new Error('请先创建工作流分组');
    const list = [...files].filter(file => /\.(json|zip)$/i.test(file.name || '') || ['application/json','application/zip','application/x-zip-compressed'].includes(String(file.type || '').toLowerCase()));
    if(!list.length) throw new Error('没有可上传的工作流文件');
    const form = new FormData();
    form.append('library_id', activeWorkflowLibraryId || '');
    form.append('category_id', activeWorkflowCategoryId || '');
    list.forEach(file => form.append('files', file));
    const data = await apiJson('/api/asset-library/workflows/upload', {method:'POST', body:form});
    assetLibrary = data.library || assetLibrary;
    selectedWorkflowIds.clear();
    selectedWorkflowId = data.items?.[0]?.id || selectedWorkflowId;
    render();
    setStatus(`已上传 ${data.items?.length || 0} 个工作流`);
}
function downloadUrl(url, filename='download'){
    if(!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
}
async function exportWorkflowItems(ids){
    const items = (ids || []).map(id => findWorkflowItem(id)).filter(item => item?.url);
    if(!items.length) return;
    if(items.length === 1){
        const item = items[0];
        const ext = String(item.url || '').toLowerCase().split('?')[0].endsWith('.json') ? '.json' : '.zip';
        downloadUrl(item.url, `${item.name || 'workflow'}${ext}`);
        setStatus('已导出工作流');
        return;
    }
    const res = await fetch('/api/canvas-assets/download', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({filename:'workflows.zip', items:items.map(item => ({url:item.url, name:item.name || 'workflow'}))})
    });
    if(!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || '导出工作流失败');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workflows.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    setStatus(`已导出 ${items.length} 个工作流`);
}
async function renameWorkflowItem(id){
    const item = findWorkflowItem(id);
    const name = window.prompt('工作流名称', item?.name || '');
    if(!item || !String(name || '').trim()) return;
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    render();
    setStatus('已重命名工作流');
}
async function deleteWorkflowItem(id){
    const item = findWorkflowItem(id);
    if(!item) return;
    if(pendingDeleteAssetId !== id){
        pendingDeleteAssetId = id;
        render();
        setStatus('再次点击确认删除工作流');
        return;
    }
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'DELETE'});
    assetLibrary = data.library || assetLibrary;
    selectedWorkflowIds.delete(id);
    selectedWorkflowId = '';
    pendingDeleteAssetId = '';
    render();
    setStatus('已删除工作流');
}
async function deleteSelectedWorkflows(){
    const ids = [...selectedWorkflowIds];
    if(!ids.length) return;
    const data = await apiJson('/api/asset-library/items/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:activeWorkflowLibraryId, ids})});
    assetLibrary = data.library || assetLibrary;
    selectedWorkflowIds.clear();
    selectedWorkflowId = '';
    render();
    setStatus(`已删除 ${data.removed || 0} 个工作流`);
}
async function uploadLocalAssets(files){
    const list = [...files].filter(f => isLocalMediaFile(f));
    if(!list.length){ setStatus('没有可上传的图片/视频/音频文件'); return; }
    const form = new FormData();
    form.append('folder', activeLocalUploadFolder || '');
    list.forEach(file => form.append('files', file));
    setStatus('正在上传...');
    try {
        const data = await apiJson('/api/local-assets/upload', {method:'POST', body:form});
        const uploaded = Array.isArray(data.files) ? data.files : [];
        await loadLocalAssets();
        selectedLocalUploadId = uploaded[0]?.id || selectedLocalUploadId;
        render();
        setStatus(`已上传 ${uploaded.length} 个素材`);
    } catch(err) {
        setStatus(err.message || '上传失败');
    }
}
async function deleteLocalAssets(ids){
    const names = (ids || []).map(id => findLocalUpload(id)?.file).filter(Boolean);
    if(!names.length) return;
    setStatus('正在删除...');
    try {
        await apiJson('/api/local-assets/delete', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({names})
        });
        await loadLocalAssets();
        selectedLocalUploadIds.clear();
        if(selectedLocalUploadId && !findLocalUpload(selectedLocalUploadId)) selectedLocalUploadId = '';
        render();
        setStatus(`已删除 ${names.length} 个素材`);
    } catch(err) {
        setStatus(err.message || '删除失败');
    }
}
async function createLocalUploadFolder(){
    const name = window.prompt('新建文件夹名称', '新文件夹');
    if(!String(name || '').trim()) return;
    try {
        const data = await apiJson('/api/local-assets/folders', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({parent:activeLocalUploadFolder || '', name})
        });
        localAssets = Array.isArray(data.items) ? data.items : localAssets;
        localUploadTree = data.tree || localUploadTree;
        activeLocalUploadFolder = data.folder?.path || activeLocalUploadFolder;
        selectedLocalUploadId = '';
        selectedLocalUploadIds.clear();
        render();
        setStatus('已新建本地素材文件夹');
    } catch(err) {
        setStatus(err.message || '新建文件夹失败');
    }
}
async function renameLocalUploadFolder(){
    if(!activeLocalUploadFolder){
        setStatus('根目录不能重命名');
        return;
    }
    const current = localUploadFolderTitle();
    const name = window.prompt('重命名文件夹', current);
    if(!String(name || '').trim() || name === current) return;
    try {
        const data = await apiJson('/api/local-assets/folders', {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({path:activeLocalUploadFolder, name})
        });
        localAssets = Array.isArray(data.items) ? data.items : localAssets;
        localUploadTree = data.tree || localUploadTree;
        activeLocalUploadFolder = data.folder?.path || activeLocalUploadFolder;
        selectedLocalUploadId = '';
        selectedLocalUploadIds.clear();
        render();
        setStatus('已重命名本地素材文件夹');
    } catch(err) {
        setStatus(err.message || '重命名文件夹失败');
    }
}
async function runLocalUploadCaptionSelected(){
    const images = selectedLocalUploadImageItems();
    if(!images.length || localCaptionBusy) return;
    normalizeLocalCaptionSettings();
    if(!localCaptionProvider || !localCaptionModel){
        setStatus('请先在 API 设置中配置可用的聊天/视觉模型');
        return;
    }
    localCaptionBusy = true;
    render();
    setStatus(`正在反推 ${images.length} 张本地图片的提示词...`);
    try {
        const data = await apiJson('/api/local-assets/caption', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                names:images.map(item => item.file || item.id),
                provider:localCaptionProvider,
                model:localCaptionModel,
                prompt:(localCaptionPrompt || '描述图片').trim() || '描述图片'
            })
        });
        await loadLocalAssets();
        selectedLocalUploadIds.clear();
        if(images[0]?.id) selectedLocalUploadId = images[0].id;
        render();
        const failed = (data.items || []).filter(item => !item.ok);
        setStatus(failed.length ? `已完成 ${data.count || 0} 张，${failed.length} 张失败：${failed[0].error || '反推失败'}` : `已反推并保存 ${data.count || images.length} 张图片提示词`);
    } catch(err) {
        setStatus(err.message || '提示词反推失败');
    } finally {
        localCaptionBusy = false;
        render();
    }
}
async function saveLocalUploadCaption(id){
    const item = findLocalUpload(id);
    if(!item || assetKind(item) !== 'image') return;
    const textarea = document.getElementById('localUploadCaptionEdit');
    const caption = textarea ? textarea.value : (item.caption || '');
    try {
        const data = await apiJson('/api/local-assets/caption', {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name:item.file || item.id, caption})
        });
        item.caption = data.caption || '';
        item.caption_file = data.caption_file || item.caption_file || '';
        render();
        setStatus('已保存反推提示词');
    } catch(err) {
        setStatus(err.message || '保存提示词失败');
    }
}
async function handleClick(event){
    const target = event.target;
    const tabBtn = target.closest?.('[data-tab]');
    if(tabBtn){ activeTab = tabBtn.dataset.tab || 'assets'; selectedAssetIds.clear(); selectedWorkflowIds.clear(); selectedPromptIds.clear(); selectedLocalIds.clear(); selectedLocalUploadIds.clear(); render(); return; }
    if(target.closest?.('#refreshBtn')){ await loadAll(); return; }
    const assetPreview = target.closest?.('[data-asset-preview]');
    if(assetPreview){ showDetailPreview('asset', assetPreview.dataset.assetPreview || ''); return; }
    const localPreview = target.closest?.('[data-local-preview]');
    if(localPreview){ showDetailPreview('local', localPreview.dataset.localPreview || ''); return; }
    const localUpPreview = target.closest?.('[data-localup-preview]');
    if(localUpPreview){ showDetailPreview('localup', localUpPreview.dataset.localupPreview || ''); return; }
    if(target.closest?.('[data-localup-upload]')){ uploadInput?.click(); return; }
    if(target.closest?.('[data-localup-folder-new]')){ await createLocalUploadFolder(); return; }
    if(target.closest?.('[data-localup-folder-rename]')){ await renameLocalUploadFolder(); return; }
    const localUpFolder = target.closest?.('[data-localup-folder]');
    if(localUpFolder){
        activeLocalUploadFolder = localUpFolder.dataset.localupFolder || '';
        selectedLocalUploadId = '';
        selectedLocalUploadIds.clear();
        pendingBatchDelete = '';
        render();
        return;
    }
    if(target.closest?.('[data-localup-manage]')){
        localUploadManageMode = !localUploadManageMode;
        if(!localUploadManageMode) selectedLocalUploadIds.clear();
        render();
        return;
    }
    if(target.closest?.('[data-localup-select-all]')){ localUploadItems().forEach(item => selectedLocalUploadIds.add(item.id)); render(); return; }
    if(target.closest?.('[data-localup-clear]')){ selectedLocalUploadIds.clear(); render(); return; }
    if(target.closest?.('[data-localup-delete-selected]')){ await deleteLocalAssets([...selectedLocalUploadIds]); return; }
    if(target.closest?.('[data-local-caption-run]')){ await runLocalUploadCaptionSelected(); return; }
    const localUpCaptionSave = target.closest?.('[data-localup-caption-save]');
    if(localUpCaptionSave){ await saveLocalUploadCaption(localUpCaptionSave.dataset.localupCaptionSave || ''); return; }
    const localUpDeleteOne = target.closest?.('[data-localup-delete-one]');
    if(localUpDeleteOne){ await deleteLocalAssets([localUpDeleteOne.dataset.localupDeleteOne || '']); return; }
    const localUpCheck = target.closest?.('[data-localup-check]');
    if(localUpCheck){
        const id = localUpCheck.dataset.localupCheck || '';
        if(selectedLocalUploadIds.has(id)) selectedLocalUploadIds.delete(id); else selectedLocalUploadIds.add(id);
        render();
        return;
    }
    const localUpOpen = target.closest?.('[data-localup-open]');
    if(localUpOpen){ const it = findLocalUpload(localUpOpen.dataset.localupOpen || ''); if(it?.url) window.open(it.url, '_blank'); return; }
    const localUpCopy = target.closest?.('[data-localup-copy]');
    if(localUpCopy){ const it = findLocalUpload(localUpCopy.dataset.localupCopy || ''); const ok = await copyTextToClipboard(it?.url || ''); setStatus(ok ? '已复制链接' : '复制失败'); return; }
    const localUpCard = target.closest?.('[data-localup-card]');
    if(localUpCard){
        if(localUploadManageMode){
            const id = localUpCard.dataset.localupCard || '';
            if(selectedLocalUploadIds.has(id)) selectedLocalUploadIds.delete(id); else selectedLocalUploadIds.add(id);
        } else {
            selectedLocalUploadId = localUpCard.dataset.localupCard || '';
        }
        render();
        return;
    }
    if(target.closest?.('[data-local-pick-folder]')){ await registerSharedFolder(); return; }
    const sharedRemove = target.closest?.('[data-shared-remove]');
    if(sharedRemove){ event.stopPropagation(); await unregisterSharedFolder(sharedRemove.dataset.sharedRemove || ''); return; }
    const sharedOpen = target.closest?.('[data-shared-open]');
    if(sharedOpen){ await openSharedFolder(sharedOpen.dataset.sharedOpen || ''); return; }
    if(target.closest?.('[data-local-manage]')){
        localManageMode = !localManageMode;
        pendingBatchDelete = '';
        if(!localManageMode) selectedLocalIds.clear();
        render();
        return;
    }
    if(target.closest?.('[data-local-select-all]')){ localItemsForFolder().forEach(item => selectedLocalIds.add(item.id)); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-local-clear-selection]')){ selectedLocalIds.clear(); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-local-copy-selected]')){ setLocalClipboard('copy'); return; }
    if(target.closest?.('[data-local-import-clipboard]')){ await pasteLocalClipboardToAssets(); return; }
    if(target.closest?.('[data-local-clear-clipboard]')){ localClipboard = null; render(); return; }
    const localImportOne = target.closest?.('[data-local-import-one]');
    if(localImportOne){ setLocalClipboard('copy', [localImportOne.dataset.localImportOne || '']); await pasteLocalClipboardToAssets(); return; }
    const localOpen = target.closest?.('[data-local-open]');
    if(localOpen){ openLocalItem(localOpen.dataset.localOpen || ''); return; }
    const localFolder = target.closest?.('[data-local-folder]');
    if(localFolder){ activeLocalFolderId = localFolder.dataset.localFolder || ''; selectedLocalId = ''; selectedLocalIds.clear(); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-local-check]')) return;
    const localCard = target.closest?.('[data-local-card]');
    if(localCard){
        const id = localCard.dataset.localCard || '';
        selectedLocalId = id;
        if(localManageMode){
            if(selectedLocalIds.has(id)) selectedLocalIds.delete(id); else selectedLocalIds.add(id);
        }
        render();
        return;
    }
    if(target.closest?.('[data-workflow-manage]')){
        workflowManageMode = !workflowManageMode;
        if(!workflowManageMode) selectedWorkflowIds.clear();
        pendingDeleteAssetId = '';
        render();
        return;
    }
    if(target.closest?.('[data-workflow-select-all]')){ currentWorkflowItems().forEach(item => selectedWorkflowIds.add(item.id)); render(); return; }
    if(target.closest?.('[data-workflow-clear-selection]')){ selectedWorkflowIds.clear(); render(); return; }
    if(target.closest?.('[data-workflow-export-selected]')){ await exportWorkflowItems([...selectedWorkflowIds]); return; }
    if(target.closest?.('[data-workflow-delete-selected]')){ await deleteSelectedWorkflows(); return; }
    if(target.closest?.('[data-workflow-upload]')){
        if(uploadInput) uploadInput.accept = '.json,.zip,application/json,application/zip,application/x-zip-compressed';
        uploadInput?.click();
        return;
    }
    const workflowDownload = target.closest?.('[data-workflow-download]');
    if(workflowDownload){ await exportWorkflowItems([workflowDownload.dataset.workflowDownload || '']); return; }
    const workflowRename = target.closest?.('[data-workflow-rename]');
    if(workflowRename){ await renameWorkflowItem(workflowRename.dataset.workflowRename || ''); return; }
    const workflowDelete = target.closest?.('[data-workflow-delete]');
    if(workflowDelete){ await deleteWorkflowItem(workflowDelete.dataset.workflowDelete || ''); return; }
    if(target.closest?.('[data-workflow-cat-new]')){
        workflowTreeEdit = {kind:'category-new', placement:'head', value:'新工作流分组', label:'工作流分组名称'};
        pendingTreeDelete = '';
        render();
        focusTreeEditInput('workflowTreeEditInput');
        return;
    }
    if(target.closest?.('[data-workflow-cat-rename]')){
        const cat = activeWorkflowCategory();
        if(!cat) return;
        workflowTreeEdit = {kind:'category-rename', value:cat.name || '', label:'工作流分组名称', categoryId:cat.id};
        pendingTreeDelete = '';
        render();
        focusTreeEditInput('workflowTreeEditInput');
        return;
    }
    if(target.closest?.('[data-workflow-cat-delete]')){ await deleteWorkflowCategory(); return; }
    const workflowLib = target.closest?.('[data-workflow-lib]');
    if(workflowLib){ activeWorkflowLibraryId = workflowLib.dataset.workflowLib || ''; activeWorkflowCategoryId = ''; selectedWorkflowId = ''; selectedWorkflowIds.clear(); render(); return; }
    const workflowCat = target.closest?.('[data-workflow-cat]');
    if(workflowCat){ activeWorkflowLibraryId = workflowCat.dataset.workflowCatLib || activeWorkflowLibraryId; activeWorkflowCategoryId = workflowCat.dataset.workflowCat || ''; selectedWorkflowId = ''; selectedWorkflowIds.clear(); render(); return; }
    const workflowCard = target.closest?.('[data-workflow-card]');
    if(workflowCard){
        const id = workflowCard.dataset.workflowCard || '';
        selectedWorkflowId = id;
        if(workflowManageMode){
            if(selectedWorkflowIds.has(id)) selectedWorkflowIds.delete(id); else selectedWorkflowIds.add(id);
        }
        pendingDeleteAssetId = '';
        render();
        return;
    }
    if(target.closest?.('[data-asset-tree-edit-save]')){ await saveAssetTreeEdit(); return; }
    if(target.closest?.('[data-asset-tree-edit-cancel]')){ assetTreeEdit = null; render(); return; }
    if(target.closest?.('[data-workflow-tree-edit-save]')){ await saveWorkflowTreeEdit(); return; }
    if(target.closest?.('[data-workflow-tree-edit-cancel]')){ workflowTreeEdit = null; render(); return; }
    if(target.closest?.('[data-prompt-tree-edit-save]')){ await savePromptTreeEdit(); return; }
    if(target.closest?.('[data-prompt-tree-edit-cancel]')){ promptTreeEdit = null; render(); return; }
    const assetEditSave = target.closest?.('[data-asset-edit-save]');
    if(assetEditSave){ await saveAssetEdit(assetEditSave.dataset.assetEditSave || ''); return; }
    if(target.closest?.('[data-asset-edit-cancel]')){ assetEditMode = false; render(); return; }
    const assetEditStart = target.closest?.('[data-asset-edit-start]');
    if(assetEditStart){ selectedAssetId = assetEditStart.dataset.assetEditStart || selectedAssetId; assetEditMode = true; pendingDeleteAssetId = ''; render(); return; }
    if(target.closest?.('[data-asset-manage]')){
        assetManageMode = !assetManageMode;
        pendingBatchDelete = '';
        if(!assetManageMode) selectedAssetIds.clear();
        render();
        return;
    }
    if(target.closest?.('[data-asset-select-all]')){ currentAssetItems().forEach(item => selectedAssetIds.add(item.id)); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-asset-clear-selection]')){ selectedAssetIds.clear(); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-asset-cut-selected]')){ setAssetClipboard('cut'); return; }
    if(target.closest?.('[data-asset-copy-selected]')){ setAssetClipboard('copy'); return; }
    if(target.closest?.('[data-asset-paste-clipboard]')){ await pasteAssetClipboard(); return; }
    if(target.closest?.('[data-asset-clear-clipboard]')){ assetClipboard = null; render(); return; }
    const assetRename = target.closest?.('[data-asset-rename]');
    if(assetRename){ await renameAssetItem(assetRename.dataset.assetRename || ''); return; }
    const assetDelete = target.closest?.('[data-asset-delete]');
    if(assetDelete){ await deleteAssetItem(assetDelete.dataset.assetDelete || ''); return; }
    const assetOpen = target.closest?.('[data-asset-open]');
    if(assetOpen){ openAssetItem(assetOpen.dataset.assetOpen || ''); return; }
    const avatarCopy = target.closest?.('[data-avatar-copy]');
    if(avatarCopy){
        const uri = avatarCopy.dataset.avatarCopy || '';
        const ok = await copyTextToClipboard(uri);
        setStatus(ok ? '已复制 asset:// 地址' : `复制失败，请手动复制：${uri}`);
        return;
    }
    const avatarRegister = target.closest?.('[data-avatar-register]');
    if(avatarRegister){ await registerAssetAvatar(avatarRegister.dataset.avatarRegister || '', avatarRegister.dataset.avatarProv || ''); return; }
    const avatarCheck = target.closest?.('[data-avatar-check]');
    if(avatarCheck){ await checkAssetAvatarStatus(avatarCheck.dataset.avatarCheck || '', false, avatarCheck.dataset.avatarProv || ''); return; }
    if(target.closest?.('[data-asset-delete-selected]')){ await deleteSelectedAssets(); return; }
    if(target.closest?.('[data-asset-upload]')){
        if(uploadInput) uploadInput.accept = 'image/*,video/*,audio/*';
        uploadInput?.click();
        return;
    }
    if(target.closest?.('[data-asset-lib-new]')){ assetTreeFocus = 'library'; assetTreeEdit = {kind:'library-new', placement:'head', value:'新资产库', label:'资产库名称'}; render(); focusTreeEditInput('assetTreeEditInput'); return; }
    if(target.closest?.('[data-asset-lib-rename]')){
        const row = target.closest('[data-asset-lib]');
        if(row) activeAssetLibraryId = row.dataset.assetLib || activeAssetLibraryId;
        assetTreeFocus = 'library';
        assetTreeEdit = {kind:'library-rename', value:activeAssetLibrary()?.name || '', label:'资产库名称'};
        pendingTreeDelete = '';
        render(); return;
    }
    if(target.closest?.('[data-asset-lib-delete]')){
        const row = target.closest('[data-asset-lib]');
        if(row) activeAssetLibraryId = row.dataset.assetLib || activeAssetLibraryId;
        await deleteAssetLibrary(); return;
    }
    if(target.closest?.('[data-asset-cat-new]')){
        const row = target.closest('[data-asset-lib]');
        const catRow = target.closest('[data-asset-cat]');
        if(row) activeAssetLibraryId = row.dataset.assetLib || activeAssetLibraryId;
        if(catRow) activeAssetLibraryId = catRow.dataset.assetCatLib || activeAssetLibraryId;
        assetTreeEdit = {kind:'category-new', value:'新分组', label:'分组名称'};
        pendingTreeDelete = '';
        render(); return;
    }
    if(target.closest?.('[data-asset-cat-rename]')){
        const row = target.closest('[data-asset-cat]');
        if(row){ activeAssetLibraryId = row.dataset.assetCatLib || activeAssetLibraryId; activeAssetCategoryId = row.dataset.assetCat || activeAssetCategoryId; }
        assetTreeFocus = 'category';
        assetTreeEdit = {kind:'category-rename', value:activeAssetCategory()?.name || '', label:'分组名称'};
        pendingTreeDelete = '';
        render(); return;
    }
    if(target.closest?.('[data-asset-cat-delete]')){
        const row = target.closest('[data-asset-cat]');
        if(row){ activeAssetLibraryId = row.dataset.assetCatLib || activeAssetLibraryId; activeAssetCategoryId = row.dataset.assetCat || activeAssetCategoryId; }
        await deleteAssetCategory(); return;
    }
    const assetLib = target.closest?.('[data-asset-lib]');
    if(assetLib){ activeAssetLibraryId = assetLib.dataset.assetLib || ''; assetTreeFocus = 'library'; activeAssetCategoryId = assetCategories()[0]?.id || ''; selectedAssetId = ''; selectedAssetIds.clear(); render(); return; }
    const assetCat = target.closest?.('[data-asset-cat]');
    if(assetCat){ activeAssetLibraryId = assetCat.dataset.assetCatLib || activeAssetLibraryId; activeAssetCategoryId = assetCat.dataset.assetCat || ''; assetTreeFocus = 'category'; selectedAssetId = ''; selectedAssetIds.clear(); render(); return; }
    const assetCard = target.closest?.('[data-asset-card]');
    if(assetCard){ selectedAssetId = assetCard.dataset.assetCard || ''; assetEditMode = false; pendingDeleteAssetId = ''; render(); return; }

    const promptEditSave = target.closest?.('[data-prompt-edit-save]');
    if(promptEditSave){ await savePromptEdit(promptEditSave.dataset.promptEditSave || ''); return; }
    if(target.closest?.('[data-prompt-create-save]')){ await savePromptCreate(); return; }
    if(target.closest?.('[data-prompt-edit-cancel]')){ promptEditMode = false; promptCreateMode = false; render(); return; }
    const promptEditStart = target.closest?.('[data-prompt-edit-start]');
    if(promptEditStart){ selectedPromptId = promptEditStart.dataset.promptEditStart || selectedPromptId; promptEditMode = true; promptCreateMode = false; pendingDeletePromptId = ''; render(); return; }
    if(target.closest?.('[data-prompt-manage]')){
        promptManageMode = !promptManageMode;
        pendingBatchDelete = '';
        if(!promptManageMode) selectedPromptIds.clear();
        render();
        return;
    }
    if(target.closest?.('[data-prompt-select-all]')){ currentPromptItems().forEach(item => selectedPromptIds.add(item.id)); pendingBatchDelete = ''; render(); return; }
    if(target.closest?.('[data-prompt-clear-selection]')){ selectedPromptIds.clear(); pendingBatchDelete = ''; render(); return; }
    const promptEdit = target.closest?.('[data-prompt-edit]');
    if(promptEdit){ await editPromptItem(promptEdit.dataset.promptEdit || ''); return; }
    const promptDelete = target.closest?.('[data-prompt-delete]');
    if(promptDelete){ await deletePromptItem(promptDelete.dataset.promptDelete || ''); return; }
    if(target.closest?.('[data-prompt-delete-selected]')){ await deleteSelectedPrompts(); return; }
    const promptNewBtn = target.closest?.('[data-prompt-new]');
    if(promptNewBtn){
        const libId = promptNewBtn.dataset.libId || target.closest('[data-prompt-lib]')?.dataset.promptLib;
        const catRow = target.closest('[data-prompt-cat]');
        if(libId){ activePromptLibraryId = libId; activePromptCategory = 'all'; }
        if(catRow){ activePromptLibraryId = catRow.dataset.promptCatLib || activePromptLibraryId; activePromptCategory = catRow.dataset.promptCat || activePromptCategory; }
        promptCreateMode = true; promptEditMode = false; pendingDeletePromptId = ''; render(); return;
    }
    if(target.closest?.('[data-prompt-lib-new]')){ promptTreeFocus = 'library'; promptTreeEdit = {kind:'library-new', placement:'head', value:'新提示词库', label:'提示词库名称'}; render(); focusTreeEditInput('promptTreeEditInput'); return; }
    if(target.closest?.('[data-prompt-cat-new]')){
        const libRow = target.closest('[data-prompt-lib]');
        if(libRow) activePromptLibraryId = libRow.dataset.promptLib || activePromptLibraryId;
        promptTreeFocus = 'library';
        promptTreeEdit = {kind:'category-new', value:'新分组', label:'分组名称'};
        pendingTreeDelete = '';
        render(); return;
    }
    if(target.closest?.('[data-prompt-cat-rename]')){
        promptTreeFocus = 'category';
        const cat = activePromptCategories().find(c => c.id === activePromptCategory);
        promptTreeEdit = {kind:'category-rename', value:cat?.name || '', label:'分组名称'};
        pendingTreeDelete = '';
        render(); return;
    }
    if(target.closest?.('[data-prompt-cat-delete]')){ await deletePromptCategory(); return; }
    const promptLibRenameBtn = target.closest?.('[data-prompt-lib-rename]');
    if(promptLibRenameBtn){
        const libRow = target.closest('[data-prompt-lib]');
        if(promptLibRenameBtn.dataset.libId) activePromptLibraryId = promptLibRenameBtn.dataset.libId;
        if(libRow) activePromptLibraryId = libRow.dataset.promptLib || activePromptLibraryId;
        promptTreeFocus = 'library';
        promptTreeEdit = {kind:'library-rename', value:activePromptLibrary()?.name || '', label:'提示词库名称'};
        render(); return;
    }
    const promptLibDeleteBtn = target.closest?.('[data-prompt-lib-delete]');
    if(promptLibDeleteBtn){
        if(promptLibDeleteBtn.dataset.libId) activePromptLibraryId = promptLibDeleteBtn.dataset.libId;
        await deletePromptLibrary(); return;
    }
    const promptLib = target.closest?.('[data-prompt-lib]');
    if(promptLib){ activePromptLibraryId = promptLib.dataset.promptLib || ''; activePromptCategory = 'all'; promptTreeFocus = 'library'; selectedPromptId = ''; promptCreateMode = false; promptEditMode = false; selectedPromptIds.clear(); render(); return; }
    const promptCat = target.closest?.('[data-prompt-cat]');
    if(promptCat){ activePromptLibraryId = promptCat.dataset.promptCatLib || activePromptLibraryId; activePromptCategory = promptCat.dataset.promptCat || 'all'; promptTreeFocus = 'category'; selectedPromptId = ''; promptCreateMode = false; promptEditMode = false; selectedPromptIds.clear(); render(); return; }
    const promptRow = target.closest?.('[data-prompt-row]');
    if(promptRow){ selectedPromptId = promptRow.dataset.promptRow || ''; promptEditMode = false; promptCreateMode = false; pendingDeletePromptId = ''; render(); return; }
}
function openAssetItem(id){
    const item = findAssetItem(id);
    if(item?.url) window.open(item.url, '_blank', 'noopener');
}
function showDetailPreview(source, id){
    const item = source === 'local' ? findLocalItem(id) : source === 'localup' ? findLocalUpload(id) : findAssetItem(id);
    if(!item) return;
    const kind = source === 'local' ? (item.kind || localItemKind(item)) : assetKind(item);
    if(kind !== 'image'){
        setStatus('仅图片支持放大预览');
        return;
    }
    const url = source === 'local' ? localObjectUrl(item) : item.url;
    if(!url) return;
    document.querySelector('.asset-lightbox')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'asset-lightbox';
    overlay.dataset.scale = '1';
    overlay.dataset.x = '0';
    overlay.dataset.y = '0';
    overlay.innerHTML = `
        <div class="asset-lightbox-inner" role="dialog" aria-modal="true" aria-label="图片预览">
            <img class="asset-lightbox-image" src="${escapeAttr(url)}" alt="${escapeAttr(item.name || 'preview')}" draggable="false">
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('asset-lightbox-open');
}
function closeDetailPreview(){
    document.querySelector('.asset-lightbox')?.remove();
    document.body.classList.remove('asset-lightbox-open');
    lightboxPanState = null;
}
function applyLightboxTransform(overlay){
    const image = overlay?.querySelector?.('.asset-lightbox-image');
    if(!image) return;
    const scale = Number(overlay.dataset.scale || 1);
    const x = Number(overlay.dataset.x || 0);
    const y = Number(overlay.dataset.y || 0);
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    overlay.classList.toggle('zoomed', scale > 1.01);
}
function zoomDetailPreview(event){
    const overlay = event.target.closest?.('.asset-lightbox');
    const image = event.target.closest?.('.asset-lightbox-image');
    if(!overlay || !image) return;
    event.preventDefault();
    const current = Number(overlay.dataset.scale || 1);
    const next = Math.max(0.25, Math.min(8, current * (event.deltaY < 0 ? 1.15 : 0.87)));
    const rect = overlay.getBoundingClientRect();
    const anchorX = event.clientX - (rect.left + rect.width / 2);
    const anchorY = event.clientY - (rect.top + rect.height / 2);
    const currentX = Number(overlay.dataset.x || 0);
    const currentY = Number(overlay.dataset.y || 0);
    const ratio = next / current;
    overlay.dataset.scale = String(next);
    if(next <= 1.01){
        overlay.dataset.x = '0';
        overlay.dataset.y = '0';
    } else {
        overlay.dataset.x = String(anchorX - ratio * (anchorX - currentX));
        overlay.dataset.y = String(anchorY - ratio * (anchorY - currentY));
    }
    applyLightboxTransform(overlay);
}
function beginLightboxPan(event){
    const image = event.target.closest?.('.asset-lightbox-image');
    const overlay = event.target.closest?.('.asset-lightbox');
    if(!image || !overlay) return;
    const scale = Number(overlay.dataset.scale || 1);
    if(scale <= 1.01) return;
    event.preventDefault();
    lightboxPanState = {
        overlay,
        pointerId:event.pointerId,
        startX:event.clientX,
        startY:event.clientY,
        originX:Number(overlay.dataset.x || 0),
        originY:Number(overlay.dataset.y || 0)
    };
    image.setPointerCapture?.(event.pointerId);
    overlay.classList.add('dragging');
}
function updateLightboxPan(event){
    if(!lightboxPanState || event.pointerId !== lightboxPanState.pointerId) return;
    const {overlay, startX, startY, originX, originY} = lightboxPanState;
    overlay.dataset.x = String(originX + event.clientX - startX);
    overlay.dataset.y = String(originY + event.clientY - startY);
    applyLightboxTransform(overlay);
}
function endLightboxPan(event){
    if(!lightboxPanState || event.pointerId !== lightboxPanState.pointerId) return;
    lightboxPanState.overlay?.classList.remove('dragging');
    lightboxPanState = null;
}
function rectsIntersect(a, b){
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function marqueeTargetSelector(){
    if(activeTab === 'assets' && assetManageMode) return '[data-asset-card]';
    if(activeTab === 'prompts' && promptManageMode) return '[data-prompt-row]';
    if(activeTab === 'local' && localManageMode) return '[data-local-card]';
    return '';
}
function beginMarqueeSelection(event){
    const selector = marqueeTargetSelector();
    if(!selector) return;
    if(event.button !== 0) return;
    if(event.target.closest?.('button,input,textarea,select,.side-upload-card,.upload-grid-card,.asset-search-wrap')) return;
    const area = event.target.closest?.('.content-scroll');
    if(!area) return;
    event.preventDefault();
    const box = document.createElement('div');
    box.className = 'selection-marquee';
    area.appendChild(box);
    marqueeState = {
        startX:event.clientX,
        startY:event.clientY,
        area,
        box,
        selector,
        baseAsset:new Set(selectedAssetIds),
        basePrompt:new Set(selectedPromptIds),
        baseLocal:new Set(selectedLocalIds)
    };
    updateMarqueeSelection(event);
}
function updateMarqueeSelection(event){
    if(!marqueeState) return;
    const left = Math.min(marqueeState.startX, event.clientX);
    const top = Math.min(marqueeState.startY, event.clientY);
    const right = Math.max(marqueeState.startX, event.clientX);
    const bottom = Math.max(marqueeState.startY, event.clientY);
    const areaRect = marqueeState.area.getBoundingClientRect();
    const boxLeft = left - areaRect.left + marqueeState.area.scrollLeft;
    const boxTop = top - areaRect.top + marqueeState.area.scrollTop;
    Object.assign(marqueeState.box.style, {
        left:`${boxLeft}px`,
        top:`${boxTop}px`,
        width:`${Math.max(1, right - left)}px`,
        height:`${Math.max(1, bottom - top)}px`
    });
    const rect = {left, top, right, bottom};
    if(activeTab === 'assets'){
        selectedAssetIds = new Set(marqueeState.baseAsset);
        document.querySelectorAll(marqueeState.selector).forEach(el => {
            if(rectsIntersect(rect, el.getBoundingClientRect())) selectedAssetIds.add(el.dataset.assetCard);
        });
    } else if(activeTab === 'prompts') {
        selectedPromptIds = new Set(marqueeState.basePrompt);
        document.querySelectorAll(marqueeState.selector).forEach(el => {
            if(rectsIntersect(rect, el.getBoundingClientRect())) selectedPromptIds.add(el.dataset.promptRow);
        });
    } else if(activeTab === 'local') {
        selectedLocalIds = new Set(marqueeState.baseLocal);
        document.querySelectorAll(marqueeState.selector).forEach(el => {
            if(rectsIntersect(rect, el.getBoundingClientRect())) selectedLocalIds.add(el.dataset.localCard);
        });
    }
    document.querySelectorAll('[data-asset-check]').forEach(input => { input.checked = selectedAssetIds.has(input.dataset.assetCheck); });
    document.querySelectorAll('[data-prompt-check]').forEach(input => { input.checked = selectedPromptIds.has(input.dataset.promptCheck); });
    document.querySelectorAll('[data-local-check]').forEach(input => { input.checked = selectedLocalIds.has(input.dataset.localCheck); });
}
function endMarqueeSelection(){
    if(!marqueeState) return;
    marqueeState.box.remove();
    marqueeState = null;
    pendingBatchDelete = '';
    render();
}
async function createAssetLibrary(){
    const name = window.prompt('资产库名称', '新资产库');
    if(!String(name || '').trim()) return;
    const data = await apiJson('/api/asset-library/libraries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    activeAssetLibraryId = data.asset_library?.id || activeAssetLibraryId;
    activeAssetCategoryId = '';
    selectedAssetId = '';
    render();
}
async function saveAssetTreeEdit(){
    if(!assetTreeEdit) return;
    const name = document.getElementById('assetTreeEditInput')?.value || '';
    if(!String(name || '').trim()){
        setStatus('名称不能为空');
        return;
    }
    let data = null;
    if(assetTreeEdit.kind === 'library-new'){
        data = await apiJson('/api/asset-library/libraries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        assetLibrary = data.library || assetLibrary;
        activeAssetLibraryId = data.asset_library?.id || activeAssetLibraryId;
        assetTreeFocus = 'library';
    } else if(assetTreeEdit.kind === 'library-rename'){
        const lib = activeAssetLibrary();
        if(!lib) return;
        data = await apiJson(`/api/asset-library/libraries/${encodeURIComponent(lib.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        assetLibrary = data.library || assetLibrary;
        assetTreeFocus = 'library';
    } else if(assetTreeEdit.kind === 'category-new'){
        data = await apiJson('/api/asset-library/categories', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:activeAssetLibraryId, name, type:'image'})});
        assetLibrary = data.library || assetLibrary;
        activeAssetCategoryId = data.category?.id || activeAssetCategoryId;
        assetTreeFocus = 'category';
    } else if(assetTreeEdit.kind === 'category-rename'){
        const cat = activeAssetCategory();
        if(!cat) return;
        data = await apiJson(`/api/asset-library/categories/${encodeURIComponent(cat.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        assetLibrary = data.library || assetLibrary;
        assetTreeFocus = 'category';
    }
    assetTreeEdit = null;
    pendingTreeDelete = '';
    render();
    setStatus('已保存');
}
async function saveWorkflowTreeEdit(){
    if(!workflowTreeEdit) return;
    const name = document.getElementById('workflowTreeEditInput')?.value || '';
    if(!String(name || '').trim()){
        setStatus('名称不能为空');
        return;
    }
    if(workflowTreeEdit.kind === 'category-new'){
        const lib = activeWorkflowLibrary();
        if(!lib){
            setStatus('请先选择资产库');
            return;
        }
        activeWorkflowLibraryId = lib.id || activeWorkflowLibraryId;
        const data = await apiJson('/api/asset-library/categories', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({library_id:activeWorkflowLibraryId, name, type:'workflow'})
        });
        assetLibrary = data.library || assetLibrary;
        activeWorkflowCategoryId = data.category?.id || activeWorkflowCategoryId;
    } else if(workflowTreeEdit.kind === 'category-rename'){
        const cat = activeWorkflowCategory();
        const categoryId = workflowTreeEdit.categoryId || cat?.id || activeWorkflowCategoryId;
        if(!categoryId) return;
        const data = await apiJson(`/api/asset-library/categories/${encodeURIComponent(categoryId)}`, {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name, library_id:activeWorkflowLibraryId})
        });
        assetLibrary = data.library || assetLibrary;
        activeWorkflowCategoryId = categoryId;
    }
    workflowTreeEdit = null;
    pendingTreeDelete = '';
    render();
    setStatus('已保存');
}
async function deleteWorkflowCategory(){
    const cat = activeWorkflowCategory();
    if(!cat) return;
    const libraryId = cat.__libraryId || activeWorkflowLibraryId;
    const key = `workflow-cat:${libraryId}:${cat.id}`;
    if(pendingTreeDelete !== key){
        pendingTreeDelete = key;
        workflowTreeEdit = null;
        render();
        setStatus('再次点击确认删除工作流分组');
        return;
    }
    const data = await apiJson(`/api/asset-library/categories/${encodeURIComponent(cat.id)}?library_id=${encodeURIComponent(libraryId)}`, {method:'DELETE'});
    assetLibrary = data.library || assetLibrary;
    activeWorkflowCategoryId = '';
    selectedWorkflowId = '';
    selectedWorkflowIds.clear();
    pendingTreeDelete = '';
    render();
    setStatus('工作流分组已删除');
}
async function renameAssetLibrary(){
    const lib = activeAssetLibrary();
    const name = window.prompt('资产库名称', lib?.name || '');
    if(!lib || !String(name || '').trim()) return;
    const data = await apiJson(`/api/asset-library/libraries/${encodeURIComponent(lib.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    render();
}
async function deleteAssetLibrary(){
    const lib = activeAssetLibrary();
    if(!lib) return;
    const key = `asset-lib:${lib.id}`;
    if(pendingTreeDelete !== key){
        pendingTreeDelete = key;
        assetTreeEdit = null;
        render();
        setStatus('再次点击确认删除资产库');
        return;
    }
    const data = await apiJson(`/api/asset-library/libraries/${encodeURIComponent(lib.id)}`, {method:'DELETE'});
    assetLibrary = data.library || assetLibrary;
    activeAssetLibraryId = assetLibrary.active_library_id || assetLibraries()[0]?.id || '';
    activeAssetCategoryId = '';
    selectedAssetId = '';
    selectedAssetIds.clear();
    pendingTreeDelete = '';
    render();
}
async function createAssetCategory(){
    const name = window.prompt('分组名称', '新分组');
    if(!String(name || '').trim()) return;
    const data = await apiJson('/api/asset-library/categories', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:activeAssetLibraryId, name, type:'image'})});
    assetLibrary = data.library || assetLibrary;
    activeAssetCategoryId = data.category?.id || activeAssetCategoryId;
    selectedAssetId = '';
    render();
}
async function renameAssetCategory(){
    const cat = activeAssetCategory();
    const name = window.prompt('分组名称', cat?.name || '');
    if(!cat || !String(name || '').trim()) return;
    const data = await apiJson(`/api/asset-library/categories/${encodeURIComponent(cat.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    render();
}
async function deleteAssetCategory(){
    const cat = activeAssetCategory();
    if(!cat) return;
    const key = `asset-cat:${cat.id}`;
    if(pendingTreeDelete !== key){
        pendingTreeDelete = key;
        assetTreeEdit = null;
        render();
        setStatus('再次点击确认删除分组');
        return;
    }
    const data = await apiJson(`/api/asset-library/categories/${encodeURIComponent(cat.id)}`, {method:'DELETE'});
    assetLibrary = data.library || assetLibrary;
    activeAssetCategoryId = '';
    selectedAssetId = '';
    selectedAssetIds.clear();
    pendingTreeDelete = '';
    render();
}
async function renameAssetItem(id){
    const item = findAssetItem(id);
    const name = window.prompt('素材名称', item?.name || '');
    if(!item || !String(name || '').trim()) return;
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    selectedAssetId = id;
    render();
}
async function saveAssetEdit(id){
    const item = findAssetItem(id);
    const name = document.getElementById('assetEditName')?.value || '';
    if(!item || !String(name || '').trim()) {
        setStatus('素材名称不能为空');
        return;
    }
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    selectedAssetId = id;
    assetEditMode = false;
    render();
    setStatus('素材已保存');
}
async function saveAssetInlineName(id, name){
    const item = findAssetItem(id);
    if(!item || !String(name || '').trim()) return;
    if(String(item.name || '') === String(name || '')) return;
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    assetLibrary = data.library || assetLibrary;
    selectedAssetId = id;
    render();
    setStatus('素材名称已保存');
}
async function registerAssetAvatar(id, providerId=''){
    const item = findAssetItem(id);
    if(!item) return;
    const provider = (providerId && (apiProviders || []).find(p => p.id === providerId)) || activeAvatarProvider();
    if(!provider){ setStatus('请先在 API 平台管理中添加并启用 API 平台'); return; }
    if(!providerAvatarSupported(provider)){ setStatus(`「${avatarPlatformLabel(providerAvatarPlatform(provider))}」的资产认证 API 尚未接入`); return; }
    if(avatarBusyId) return;
    avatarBusyId = id;
    selectedAssetId = id;
    render();
    setStatus(`正在上传素材并提交 ${avatarPlatformLabel(providerAvatarPlatform(provider))} 审核…`);
    try {
        const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}/register-avatar`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({library_id:activeAssetLibraryId, provider_id:provider.id})
        });
        assetLibrary = data.library || assetLibrary;
        setStatus(`已提交审核，正在等待 ${avatarPlatformLabel(providerAvatarPlatform(provider))} 通过…`);
        scheduleAvatarPoll(id, provider.id);
    } catch(err) {
        setStatus(err.message || '数字人提交失败');
    } finally {
        avatarBusyId = '';
        render();
    }
}
function avatarRegistrationOf(item, platform){
    const regs = (item && item.registrations && typeof item.registrations === 'object') ? item.registrations : {};
    return regs[platform] || null;
}
async function checkAssetAvatarStatus(id, silent=false, providerId=''){
    const item = findAssetItem(id);
    if(!item) return;
    const provider = (providerId && (apiProviders || []).find(p => p.id === providerId)) || activeAvatarProvider();
    if(!provider) return;
    const platform = providerAvatarPlatform(provider);
    const reg = avatarRegistrationOf(item, platform);
    if(!reg || !reg.task_id) return;
    if(!silent){ avatarBusyId = id; render(); setStatus('正在查询审核状态…'); }
    try {
        const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}/avatar-status`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({library_id:activeAssetLibraryId, provider_id:provider.id})
        });
        assetLibrary = data.library || assetLibrary;
        const newReg = (data.item?.registrations && data.item.registrations[platform]) || {};
        const status = newReg.status || '';
        if(status === 'Active') setStatus('审核通过，已生成 asset:// 地址，可在视频生成中通过 @ 调用');
        else if(status === 'Failed') setStatus(newReg.detail || '审核未通过');
        else { setStatus('仍在审核中，稍后会自动刷新…'); scheduleAvatarPoll(id, provider.id); }
    } catch(err) {
        if(!silent) setStatus(err.message || '查询审核状态失败');
    } finally {
        avatarBusyId = '';
        render();
    }
}
function scheduleAvatarPoll(id, providerId){
    setTimeout(() => {
        const item = findAssetItem(id);
        const provider = (apiProviders || []).find(p => p.id === providerId);
        if(!item || !provider) return;
        const reg = avatarRegistrationOf(item, providerAvatarPlatform(provider));
        if(reg && reg.task_id && reg.status === 'Processing'){
            checkAssetAvatarStatus(id, true, providerId);
        }
    }, 6000);
}
async function deleteAssetItem(id){
    const item = findAssetItem(id);
    if(!item) return;
    const data = await apiJson(`/api/asset-library/items/${encodeURIComponent(id)}`, {method:'DELETE'});
    assetLibrary = data.library || assetLibrary;
    selectedAssetIds.delete(id);
    if(selectedAssetId === id) selectedAssetId = '';
    pendingDeleteAssetId = '';
    render();
    setStatus('素材已删除');
}
async function deleteSelectedAssets(){
    if(!selectedAssetIds.size) return;
    const ids = [...selectedAssetIds];
    const data = await apiJson('/api/asset-library/items/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:activeAssetLibraryId, ids})});
    assetLibrary = data.library || assetLibrary;
    if(ids.includes(selectedAssetId)) selectedAssetId = '';
    selectedAssetIds.clear();
    pendingBatchDelete = '';
    render();
    setStatus(`已删除 ${data.removed || ids.length} 个素材`);
}
function setAssetClipboard(mode){
    if(!selectedAssetIds.size) return;
    assetClipboard = {
        mode,
        ids:[...selectedAssetIds],
        sourceLibraryId:activeAssetLibraryId,
        sourceCategoryId:activeAssetCategoryId,
        items:[...selectedAssetIds].map(id => findAssetItem(id)).filter(Boolean)
    };
    selectedAssetIds.clear();
    pendingBatchDelete = '';
    render();
    const label = mode === 'cut' ? '剪切' : '复制';
    setStatus(`${label}了 ${assetClipboard.ids.length} 个素材，切换分组后粘贴`);
}
async function pasteAssetClipboard(){
    if(!assetClipboard?.ids?.length) return;
    if(assetClipboard.mode === 'cut'){
        if(assetClipboard.sourceLibraryId === activeAssetLibraryId && assetClipboard.sourceCategoryId === activeAssetCategoryId) return;
        const data = await apiJson('/api/asset-library/items/move', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({library_id:assetClipboard.sourceLibraryId, target_library_id:activeAssetLibraryId, target_category_id:activeAssetCategoryId, ids:assetClipboard.ids})
        });
        assetLibrary = data.library || assetLibrary;
        setStatus(`已移动 ${data.moved || 0} 个素材`);
    } else {
        const items = (assetClipboard.items || []).map(item => ({url:item.url, name:item.name || 'asset'})).filter(item => item.url);
        const data = await apiJson('/api/asset-library/items/batch', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({library_id:activeAssetLibraryId, category_id:activeAssetCategoryId, items})
        });
        assetLibrary = data.library || assetLibrary;
        setStatus(`已复制 ${data.items?.length || 0} 个素材`);
    }
    assetClipboard = null;
    selectedAssetIds.clear();
    selectedAssetId = '';
    render();
}
function setLocalClipboard(mode, ids=null){
    // 共享文件夹只读，仅支持「复制」（引用导入），不支持剪切删除源文件
    const sourceIds = Array.isArray(ids) ? ids.filter(Boolean) : [...selectedLocalIds];
    if(!sourceIds.length) return;
    const items = sourceIds.map(id => findLocalItem(id)).filter(Boolean);
    if(!items.length) return;
    localClipboard = {
        mode:'copy',
        ids:items.map(item => item.id),
        items,
        sourceRootName:activeSharedFolderName || '共享文件夹'
    };
    selectedLocalIds.clear();
    pendingBatchDelete = '';
    render();
    setStatus(`复制了 ${items.length} 个共享素材，导入后会拷贝到图片资产分组（共享文件夹原文件保留）`);
}
async function pasteLocalClipboardToAssets(){
    if(!localClipboard?.items?.length) return;
    if(!activeAssetCategory()){
        setStatus('请先在图片资产中创建或选择分组');
        return;
    }
    const clip = localClipboard;
    // 按所属共享文件夹分组，调用后端按路径导入（复制到素材库，无需走浏览器文件对象）
    const groups = new Map();
    clip.items.forEach(item => {
        if(!item || !item.folderId || !item.relativePath) return;
        if(!groups.has(item.folderId)) groups.set(item.folderId, []);
        groups.get(item.folderId).push(item.relativePath);
    });
    if(!groups.size) return;
    setStatus('正在导入共享素材...');
    let imported = 0;
    try {
        for(const [folderId, paths] of groups){
            const data = await apiJson('/api/shared-folders/import', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({library_id:activeAssetLibraryId, category_id:activeAssetCategoryId, folder_id:folderId, paths})
            });
            assetLibrary = data.library || assetLibrary;
            imported += (data.items?.length || 0);
        }
    } catch(err) {
        setStatus(err.message || '导入共享素材失败');
        return;
    }
    localClipboard = null;
    selectedLocalIds.clear();
    selectedLocalId = '';
    render();
    setStatus(`已导入 ${imported} 个素材到图片资产`);
}
async function moveSelectedAssets(){
    if(!selectedAssetIds.size || !assetMoveTarget) return;
    const [targetLibraryId, targetCategoryId] = assetMoveTarget.split('::');
    if(!targetLibraryId || !targetCategoryId) return;
    const ids = [...selectedAssetIds];
    const data = await apiJson('/api/asset-library/items/move', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({library_id:activeAssetLibraryId, target_library_id:targetLibraryId, target_category_id:targetCategoryId, ids})
    });
    assetLibrary = data.library || assetLibrary;
    selectedAssetIds.clear();
    if(ids.includes(selectedAssetId)) selectedAssetId = '';
    render();
    setStatus(`已移动 ${data.moved || 0} 个素材`);
}
function openLocalItem(id){
    const item = findLocalItem(id);
    if(!item) return;
    const url = localObjectUrl(item);
    if(url) window.open(url, '_blank', 'noopener');
}
async function createPromptLibrary(){
    const name = window.prompt('提示词库名称', '新提示词库');
    if(!String(name || '').trim()) return;
    const data = await apiJson('/api/prompt-libraries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    promptLibrary = data.library || promptLibrary;
    activePromptLibraryId = data.prompt_library?.id || activePromptLibraryId;
    activePromptCategory = 'all';
    selectedPromptId = '';
    render();
}
async function savePromptTreeEdit(){
    if(!promptTreeEdit) return;
    const name = document.getElementById('promptTreeEditInput')?.value || '';
    if(!String(name || '').trim()){
        setStatus('名称不能为空');
        return;
    }
    let data = null;
    if(promptTreeEdit.kind === 'library-new'){
        data = await apiJson('/api/prompt-libraries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        promptLibrary = data.library || promptLibrary;
        activePromptLibraryId = data.prompt_library?.id || activePromptLibraryId;
        activePromptCategory = 'all';
        promptTreeFocus = 'library';
    } else if(promptTreeEdit.kind === 'library-rename'){
        const lib = activePromptLibrary();
        if(!lib) return;
        data = await apiJson(`/api/prompt-libraries/${encodeURIComponent(lib.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        promptLibrary = data.library || promptLibrary;
        promptTreeFocus = 'library';
    } else if(promptTreeEdit.kind === 'category-new'){
        const lib = activePromptLibrary();
        data = await apiJson('/api/prompt-libraries/categories', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:lib?.id || 'system', name})});
        promptLibrary = data.library || promptLibrary;
        activePromptCategory = data.category?.id || activePromptCategory;
        promptTreeFocus = 'category';
    } else if(promptTreeEdit.kind === 'category-rename'){
        data = await apiJson(`/api/prompt-libraries/categories/${encodeURIComponent(activePromptCategory)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
        promptLibrary = data.library || promptLibrary;
        promptTreeFocus = 'category';
    }
    promptTreeEdit = null;
    pendingTreeDelete = '';
    render();
    setStatus('已保存');
}
async function deletePromptCategory(){
    if(activePromptCategory === 'all'){
        setStatus('请选择具体分组后删除');
        return;
    }
    const key = `prompt-cat:${activePromptCategory}`;
    if(pendingTreeDelete !== key){
        pendingTreeDelete = key;
        promptTreeEdit = null;
        render();
        setStatus('再次点击确认删除分组');
        return;
    }
    const data = await apiJson(`/api/prompt-libraries/categories/${encodeURIComponent(activePromptCategory)}`, {method:'DELETE'});
    promptLibrary = data.library || promptLibrary;
    activePromptCategory = 'all';
    pendingTreeDelete = '';
    render();
    setStatus('分组已删除');
}
async function renamePromptLibrary(){
    const lib = activePromptLibrary();
    const name = window.prompt('提示词库名称', lib?.name || '');
    if(!lib || !String(name || '').trim()) return;
    const data = await apiJson(`/api/prompt-libraries/${encodeURIComponent(lib.id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})});
    promptLibrary = data.library || promptLibrary;
    render();
}
async function deletePromptLibrary(){
    const lib = activePromptLibrary();
    if(!lib) return;
    if(isSystemPromptLibrary(lib)){ setStatus('系统提示词库不能删除'); return; }
    const key = `prompt-lib:${lib.id}`;
    if(pendingTreeDelete !== key){
        pendingTreeDelete = key;
        promptTreeEdit = null;
        render();
        setStatus('再次点击确认删除提示词库');
        return;
    }
    const data = await apiJson(`/api/prompt-libraries/${encodeURIComponent(lib.id)}`, {method:'DELETE'});
    promptLibrary = data.library || promptLibrary;
    activePromptLibraryId = promptLibrary.active_library_id || promptLibraries()[0]?.id || 'system';
    activePromptCategory = 'all';
    selectedPromptId = '';
    selectedPromptIds.clear();
    pendingTreeDelete = '';
    render();
    setStatus('提示词库已删除');
}
async function createPromptItem(){
    const lib = activePromptLibrary();
    if(!lib) return;
    const name = window.prompt('提示词名称', '新提示词');
    if(!String(name || '').trim()) return;
    const scene = window.prompt('用途说明', '') || '';
    const positive = window.prompt('正向提示词内容', '');
    if(!String(positive || '').trim()) return;
    const negative = window.prompt('负向提示词内容', '') || '';
    const category = activePromptCategory === 'all' ? 'custom' : activePromptCategory;
    const data = await apiJson('/api/prompt-libraries/items', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:lib.id, name, positive, negative, category, scene})});
    promptLibrary = data.library || promptLibrary;
    selectedPromptId = data.item?.id || selectedPromptId;
    render();
}
async function savePromptCreate(){
    const lib = activePromptLibrary();
    const name = document.getElementById('promptEditName')?.value || '';
    const scene = document.getElementById('promptEditScene')?.value || '';
    const positive = document.getElementById('promptEditPositive')?.value || '';
    const negative = document.getElementById('promptEditNegative')?.value || '';
    if(!lib) return;
    if(!String(name || '').trim() || !String(positive || '').trim()){
        setStatus('名称和正向提示词不能为空');
        return;
    }
    const category = activePromptCategory === 'all' ? 'custom' : activePromptCategory;
    const data = await apiJson('/api/prompt-libraries/items', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:lib.id, name, positive, negative, category, scene})});
    promptLibrary = data.library || promptLibrary;
    selectedPromptId = data.item?.id || selectedPromptId;
    promptCreateMode = false;
    render();
    setStatus('提示词已新增');
}
async function editPromptItem(id){
    const item = findPromptItem(id);
    const lib = activePromptLibrary();
    if(!item || !lib) return;
    const name = window.prompt('提示词名称', item.name || '');
    if(!String(name || '').trim()) return;
    const scene = window.prompt('用途说明', item.scene || '') || '';
    const positive = window.prompt('正向提示词内容', item.positive || '');
    if(!String(positive || '').trim()) return;
    const negative = window.prompt('负向提示词内容', item.negative || '') || '';
    const data = await apiJson(`/api/prompt-libraries/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:lib.id, name, positive, negative, category:item.category || 'custom', scene})});
    promptLibrary = data.library || promptLibrary;
    selectedPromptId = id;
    render();
}
async function savePromptEdit(id){
    const item = findPromptItem(id);
    const lib = activePromptLibrary();
    const name = document.getElementById('promptEditName')?.value || '';
    const scene = document.getElementById('promptEditScene')?.value || '';
    const positive = document.getElementById('promptEditPositive')?.value || '';
    const negative = document.getElementById('promptEditNegative')?.value || '';
    if(!item || !lib) return;
    if(!String(name || '').trim() || !String(positive || '').trim()){
        setStatus('名称和正向提示词不能为空');
        return;
    }
    const data = await apiJson(`/api/prompt-libraries/items/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({library_id:lib.id, name, positive, negative, category:item.category || 'custom', scene})});
    promptLibrary = data.library || promptLibrary;
    selectedPromptId = id;
    promptEditMode = false;
    render();
    setStatus('提示词已保存');
}
async function deletePromptItem(id){
    const item = findPromptItem(id);
    if(!item) return;
    const data = await apiJson(`/api/prompt-libraries/items/${encodeURIComponent(id)}`, {method:'DELETE'});
    promptLibrary = data.library || promptLibrary;
    selectedPromptIds.delete(id);
    if(selectedPromptId === id) selectedPromptId = '';
    pendingDeletePromptId = '';
    render();
    setStatus('提示词已删除');
}
async function deleteSelectedPrompts(){
    if(!selectedPromptIds.size) return;
    if(pendingBatchDelete !== 'prompt'){
        pendingBatchDelete = 'prompt';
        render();
        setStatus('再次点击确认删除所选提示词');
        return;
    }
    const ids = [...selectedPromptIds];
    const data = await apiJson('/api/prompt-libraries/items/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ids})});
    promptLibrary = data.library || promptLibrary;
    if(ids.includes(selectedPromptId)) selectedPromptId = '';
    selectedPromptIds.clear();
    pendingBatchDelete = '';
    render();
}
root.addEventListener('click', event => {
    handleClick(event).catch(err => setStatus(err.message || '操作失败'));
});
document.addEventListener('click', event => {
    if(event.target.closest?.('.asset-lightbox') && !event.target.closest?.('.asset-lightbox-image')) closeDetailPreview();
});
document.addEventListener('keydown', event => {
    if(event.key === 'Escape') closeDetailPreview();
    if(event.target?.id === 'assetTreeEditInput'){
        if(event.key === 'Enter'){ event.preventDefault(); saveAssetTreeEdit().catch(err => setStatus(err.message || '保存失败')); }
        if(event.key === 'Escape'){ event.preventDefault(); assetTreeEdit = null; render(); }
    }
    if(event.target?.id === 'workflowTreeEditInput'){
        if(event.key === 'Enter'){ event.preventDefault(); saveWorkflowTreeEdit().catch(err => setStatus(err.message || '保存失败')); }
        if(event.key === 'Escape'){ event.preventDefault(); workflowTreeEdit = null; render(); }
    }
    if(event.target?.id === 'promptTreeEditInput'){
        if(event.key === 'Enter'){ event.preventDefault(); savePromptTreeEdit().catch(err => setStatus(err.message || '保存失败')); }
        if(event.key === 'Escape'){ event.preventDefault(); promptTreeEdit = null; render(); }
    }
});
document.addEventListener('wheel', zoomDetailPreview, {passive:false});
document.addEventListener('pointerdown', beginLightboxPan);
document.addEventListener('pointermove', updateLightboxPan);
document.addEventListener('pointerup', endLightboxPan);
document.addEventListener('pointercancel', endLightboxPan);
root.addEventListener('pointerdown', beginMarqueeSelection);
document.addEventListener('pointermove', event => updateMarqueeSelection(event));
document.addEventListener('pointerup', endMarqueeSelection);
root.addEventListener('input', event => {
    if(event.target?.id === 'assetSearch'){
        const pos = event.target.selectionStart || 0;
        assetQuery = event.target.value || '';
        selectedAssetId = '';
        render();
        requestAnimationFrame(() => {
            const input = document.getElementById('assetSearch');
            input?.focus();
            input?.setSelectionRange?.(pos, pos);
        });
    }
    if(event.target?.id === 'workflowSearch'){
        const pos = event.target.selectionStart || 0;
        workflowQuery = event.target.value || '';
        selectedWorkflowId = '';
        render();
        requestAnimationFrame(() => {
            const input = document.getElementById('workflowSearch');
            input?.focus();
            input?.setSelectionRange?.(pos, pos);
        });
    }
    if(event.target?.id === 'promptSearch'){
        const pos = event.target.selectionStart || 0;
        promptQuery = event.target.value || '';
        selectedPromptId = '';
        render();
        requestAnimationFrame(() => {
            const input = document.getElementById('promptSearch');
            input?.focus();
            input?.setSelectionRange?.(pos, pos);
        });
    }
    if(event.target?.id === 'localSearch'){
        const pos = event.target.selectionStart || 0;
        localQuery = event.target.value || '';
        selectedLocalId = '';
        render();
        requestAnimationFrame(() => {
            const input = document.getElementById('localSearch');
            input?.focus();
            input?.setSelectionRange?.(pos, pos);
        });
    }
    if(event.target?.id === 'localUploadSearch'){
        const pos = event.target.selectionStart || 0;
        localUploadQuery = event.target.value || '';
        selectedLocalUploadId = '';
        render();
        requestAnimationFrame(() => {
            const input = document.getElementById('localUploadSearch');
            input?.focus();
            input?.setSelectionRange?.(pos, pos);
        });
    }
    if(event.target?.id === 'localCaptionPrompt'){
        localCaptionPrompt = event.target.value || '';
    }
});
root.addEventListener('change', event => {
    const inlineAssetName = event.target.closest?.('[data-asset-inline-name]');
    if(inlineAssetName){
        saveAssetInlineName(inlineAssetName.dataset.assetInlineName || '', inlineAssetName.value || '').catch(err => setStatus(err.message || '保存失败'));
        return;
    }
    const inlineWorkflowName = event.target.closest?.('[data-workflow-inline-name]');
    if(inlineWorkflowName){
        apiJson(`/api/asset-library/items/${encodeURIComponent(inlineWorkflowName.dataset.workflowInlineName || '')}`, {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({name:inlineWorkflowName.value || ''})
        }).then(data => {
            assetLibrary = data.library || assetLibrary;
            render();
            setStatus('已保存工作流名称');
        }).catch(err => setStatus(err.message || '保存失败'));
        return;
    }
    const assetCheck = event.target.closest?.('[data-asset-check]');
    if(assetCheck){
        if(!assetManageMode) return;
        if(assetCheck.checked) {
            selectedAssetIds.add(assetCheck.dataset.assetCheck);
            selectedAssetId = assetCheck.dataset.assetCheck;
        } else selectedAssetIds.delete(assetCheck.dataset.assetCheck);
        render();
    }
    const workflowCheck = event.target.closest?.('[data-workflow-check]');
    if(workflowCheck){
        if(!workflowManageMode) return;
        if(workflowCheck.checked) {
            selectedWorkflowIds.add(workflowCheck.dataset.workflowCheck);
            selectedWorkflowId = workflowCheck.dataset.workflowCheck;
        } else selectedWorkflowIds.delete(workflowCheck.dataset.workflowCheck);
        render();
    }
    const promptCheck = event.target.closest?.('[data-prompt-check]');
    if(promptCheck){
        if(!promptManageMode) return;
        if(promptCheck.checked) {
            selectedPromptIds.add(promptCheck.dataset.promptCheck);
            selectedPromptId = promptCheck.dataset.promptCheck;
        } else selectedPromptIds.delete(promptCheck.dataset.promptCheck);
        render();
    }
    const localCheck = event.target.closest?.('[data-local-check]');
    if(localCheck){
        if(!localManageMode) return;
        if(localCheck.checked) {
            selectedLocalIds.add(localCheck.dataset.localCheck);
            selectedLocalId = localCheck.dataset.localCheck;
        } else selectedLocalIds.delete(localCheck.dataset.localCheck);
        render();
    }
    if(event.target?.id === 'assetMoveTarget'){
        assetMoveTarget = event.target.value || '';
        pendingBatchDelete = '';
        render();
    }
    if(event.target?.id === 'localCaptionProvider'){
        localCaptionProvider = event.target.value || '';
        localCaptionModel = '';
        render();
    }
    if(event.target?.id === 'localCaptionModel'){
        localCaptionModel = event.target.value || '';
        render();
    }
    const avatarProvider = event.target.closest?.('[data-avatar-provider]');
    if(avatarProvider){
        avatarRegisterProvider = avatarProvider.value || '';
        render();
    }
});
root.addEventListener('dragover', event => {
    const drop = event.target.closest?.('#assetDrop, #localUploadDrop, #workflowDrop');
    if(!drop) return;
    event.preventDefault();
    drop.classList.add('drag-over');
});
root.addEventListener('dragleave', event => {
    event.target.closest?.('#assetDrop, #localUploadDrop, #workflowDrop')?.classList.remove('drag-over');
});
root.addEventListener('drop', event => {
    const drop = event.target.closest?.('#assetDrop, #localUploadDrop, #workflowDrop');
    if(!drop) return;
    event.preventDefault();
    drop.classList.remove('drag-over');
    if(drop.id === 'localUploadDrop') uploadLocalAssets(event.dataTransfer.files);
    else if(drop.id === 'workflowDrop') uploadWorkflowFiles(event.dataTransfer.files).catch(err => setStatus(err.message || '上传失败'));
    else uploadFiles(event.dataTransfer.files).catch(err => setStatus(err.message || '上传失败'));
});
uploadInput?.addEventListener('change', event => {
    const files = event.target.files;
    if(files?.length){
        if(activeTab === 'local') uploadLocalAssets(files);
        else if(activeTab === 'workflows') uploadWorkflowFiles(files).catch(err => setStatus(err.message || '上传失败'));
        else uploadFiles(files).catch(err => setStatus(err.message || '上传失败'));
    }
    event.target.value = '';
});
document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab || 'assets';
        selectedAssetIds.clear();
        selectedWorkflowIds.clear();
        selectedPromptIds.clear();
        selectedLocalIds.clear();
        selectedLocalUploadIds.clear();
        render();
    });
});
refreshBtn?.addEventListener('click', () => loadAll().catch(err => setStatus(err.message || '加载失败')));
window.addEventListener('message', event => {
    if(event.data?.type === 'studio-theme') window.StudioTheme?.apply?.(event.data.theme);
});
document.addEventListener('DOMContentLoaded', () => loadAll().catch(err => setStatus(err.message || '加载失败')));
