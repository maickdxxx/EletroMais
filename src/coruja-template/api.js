function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readEnv(key) {
  try { return String(import.meta?.env?.[key] || "").trim(); } catch { return ""; }
}
function readRuntimeProjectId() {
  if (typeof window === "undefined") return "";
  const root = isObject(window.__CORUJA__) ? window.__CORUJA__ : {};
  const payload = isObject(window.__CORUJA_RUNTIME_PAYLOAD__) ? window.__CORUJA_RUNTIME_PAYLOAD__ : {};
  const project = isObject(root.project) ? root.project : isObject(payload.project) ? payload.project : {};
  const candidates = [window.__CORUJA_PROJECT_ID__, root.projectId, root.project_id, payload.projectId, payload.project_id, project.id];
  return String(candidates.find((value) => typeof value === "string" && value.trim()) || "").trim();
}
export function getCorujaProjectId() { return readEnv("VITE_CORUJA_PROJECT_ID") || readRuntimeProjectId(); }
export function getCorujaApiBase() { return (readEnv("VITE_CORUJA_API_BASE") || "https://corujahost.com.br").replace(/\/+$/, ""); }
export function isCorujaPublicRuntime() { return Boolean(getCorujaProjectId()); }
async function fetchJson(url, timeoutMs = 8000) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller?.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; } finally { if (timer) clearTimeout(timer); }
}
function looksLikeContent(value) { return isObject(value) && (isObject(value.global) || isObject(value.pages) || isObject(value.collections) || isObject(value.blog)); }
function unwrapContent(value) {
  if (!isObject(value)) return null;
  for (const key of ["projectContent", "project_content", "siteContent", "site_content", "content"]) {
    if (isObject(value[key])) { const nested = unwrapContent(value[key]); if (nested) return nested; }
  }
  if (isObject(value.data)) { const nested = unwrapContent(value.data); if (nested) return nested; }
  return looksLikeContent(value) ? value : null;
}
let contentPromise = null;
export async function fetchCorujaContent() {
  if (!contentPromise) contentPromise = (async () => {
    const projectId = getCorujaProjectId();
    if (!projectId) return null;
    return unwrapContent(await fetchJson(`${getCorujaApiBase()}/api/public/projects/${encodeURIComponent(projectId)}/content`));
  })();
  const pending = contentPromise;
  const content = await pending;
  if (!content && contentPromise === pending) contentPromise = null;
  return content;
}
function normalizePost(value) {
  if (!isObject(value)) return null;
  const seo = isObject(value.seo) ? value.seo : {};
  const slug = String(value.slug || "").trim();
  const title = String(value.title || "").trim();
  if (!slug || !title) return null;
  const coverImage = String(value.coverImage || value.coverImageUrl || value.cover_image_url || value.cover || value.image || "");
  return { id:value.id, slug, title, excerpt:String(value.excerpt || value.description || value.summary || ""), description:String(value.description || value.excerpt || ""), content:value.content, contentHtml:String(value.contentHtml || value.content_html || (typeof value.content === "string" ? value.content : "")), coverImage, coverImageAlt:String(value.coverImageAlt || value.cover_image_alt || value.imageAlt || title), publishedAt:String(value.publishedAt || value.published_at || value.date || ""), updatedAt:String(value.updatedAt || value.updated_at || ""), author:String(value.author || ""), category:String(value.category || value.categoryName || ""), seoTitle:String(value.seoTitle || value.seo_title || seo.title || ""), seoDescription:String(value.seoDescription || value.seo_description || seo.description || "") };
}
function normalizeList(value) {
  if (Array.isArray(value)) return value.map(normalizePost).filter(Boolean);
  if (!isObject(value)) return [];
  for (const key of ["posts", "items", "results", "data"]) if (Array.isArray(value[key])) return value[key].map(normalizePost).filter(Boolean);
  return [];
}
export async function fetchCorujaBlogPosts() {
  const projectId = getCorujaProjectId();
  if (!projectId) return [];
  return normalizeList(await fetchJson(`${getCorujaApiBase()}/api/public/projects/${encodeURIComponent(projectId)}/blog`));
}
export async function fetchCorujaBlogPost(slug) {
  const projectId = getCorujaProjectId();
  if (!projectId || !slug) return null;
  const json = await fetchJson(`${getCorujaApiBase()}/api/public/projects/${encodeURIComponent(projectId)}/blog/${encodeURIComponent(slug)}`);
  if (!isObject(json)) return null;
  return normalizePost(isObject(json.post) ? json.post : isObject(json.data) ? json.data : json);
}
