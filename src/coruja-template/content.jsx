import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import templateManifest from "../../coruja.template.json";
import defaultsJson from "./defaults.json";
import { fetchCorujaContent, isCorujaPublicRuntime } from "./api.js";

const StatusContext = createContext("ready");
const ALLOW_FALLBACK = templateManifest.visibility === "private_client";
let currentContent = defaultsJson;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((current, key) => {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    return current[key];
  }, obj);
}

function deepMerge(base, overlay) {
  if (overlay === undefined || overlay === null) return base;
  if (Array.isArray(overlay)) return overlay;
  if (!isObject(base) || !isObject(overlay)) return overlay;
  const out = { ...base };
  for (const key of Object.keys(overlay)) out[key] = key in base ? deepMerge(base[key], overlay[key]) : overlay[key];
  return out;
}

function unwrap(raw) {
  if (!isObject(raw)) return undefined;
  for (const key of ["projectContent", "project_content", "siteContent", "site_content", "content"]) {
    if (isObject(raw[key])) {
      const nested = unwrap(raw[key]);
      if (nested) return nested;
    }
  }
  if (isObject(raw.data)) {
    const nested = unwrap(raw.data);
    if (nested) return nested;
  }
  return isObject(raw.global) || isObject(raw.pages) || isObject(raw.collections) || isObject(raw.blog) ? raw : undefined;
}

function injected() {
  if (typeof window === "undefined") return undefined;
  for (const candidate of [window.__CORUJA_CONTENT__, window.__CORUJA__?.content, window.__CORUJA_RUNTIME_PAYLOAD__, window.__CORUJA_PROJECT_CONTENT__, window.__CORUJA_SITE_CONTENT__, window.__CORUJA__]) {
    const content = unwrap(candidate);
    if (content) return content;
  }
  return undefined;
}

function setByPath(target, path, value) {
  const keys = String(path || "").split(".").filter(Boolean);
  if (!keys.length) return target;
  const out = Array.isArray(target) ? [...target] : { ...target };
  let current = out;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const existing = current[key];
    current[key] = Array.isArray(existing) ? [...existing] : isObject(existing) ? { ...existing } : /^\d+$/.test(nextKey) ? [] : {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return out;
}

function applyPatch(detail, setValue) {
  if (!isObject(detail)) return false;
  const direct = unwrap(detail.content);
  if (direct) {
    setValue((current) => deepMerge(current, direct));
    return true;
  }
  if (Array.isArray(detail.patches)) {
    setValue((current) => detail.patches.reduce((next, patch) => isObject(patch) && typeof patch.path === "string" ? setByPath(next, patch.path, patch.value) : next, current));
    return true;
  }
  if (typeof detail.path === "string") {
    setValue((current) => setByPath(current, detail.path, detail.value));
    return true;
  }
  return false;
}

function previewEmbedded() {
  return typeof window !== "undefined" && window.parent !== window;
}

function allowedOrigin(origin) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "corujahost.com.br" || host.endsWith(".corujahost.com.br") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function applyTheme(content) {
  if (typeof document === "undefined") return;
  const colors = getByPath(content, "global.theme.colors") || {};
  for (const key of ["primary", "secondary", "accent", "background", "foreground", "surface", "muted", "border", "soft", "whatsapp"]) {
    if (typeof colors[key] === "string" && colors[key].trim()) document.documentElement.style.setProperty(`--${key}`, colors[key].trim());
  }
}

export function CorujaProvider({ children, content }) {
  const seed = useMemo(() => unwrap(content) ?? injected(), [content]);
  const initial = useMemo(() => deepMerge(defaultsJson, seed || {}), [seed]);
  const publicRuntime = isCorujaPublicRuntime();
  const shouldWait = !seed && (previewEmbedded() || (publicRuntime && !ALLOW_FALLBACK));
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState(shouldWait ? "loading" : "ready");
  const [revision, setRevision] = useState(0);

  const setSiteValue = useCallback((updater) => {
    setValue(updater);
    setRevision((current) => current + 1);
  }, []);

  currentContent = value;

  useEffect(() => {
    setSiteValue(initial);
    if (seed) setStatus("ready");
  }, [initial, seed, setSiteValue]);

  useEffect(() => applyTheme(value), [value]);

  useEffect(() => {
    if (!publicRuntime || previewEmbedded() || seed) return undefined;
    let active = true;
    void fetchCorujaContent().then((remote) => {
      if (!active) return;
      if (remote) {
        setSiteValue(deepMerge(defaultsJson, remote));
        setStatus("ready");
      } else {
        setStatus(ALLOW_FALLBACK ? "ready" : "error");
      }
    });
    return () => { active = false; };
  }, [publicRuntime, seed, setSiteValue]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPatch = (event) => {
      if (applyPatch(event.detail, setSiteValue)) setStatus("ready");
    };
    const onContent = (event) => {
      const next = unwrap(isObject(event.detail) ? event.detail.content ?? event.detail : event.detail);
      if (next) {
        setSiteValue(deepMerge(defaultsJson, next));
        setStatus("ready");
      }
    };
    const onMessage = (event) => {
      if (window.parent === window || !allowedOrigin(event.origin) || !isObject(event.data)) return;
      const type = String(event.data.type || "");
      if (["CORUJA_PREVIEW_PATCH", "CORUJA_CONTENT_PATCH", "coruja:preview-patch"].includes(type)) {
        if (applyPatch(event.data, setSiteValue)) setStatus("ready");
      }
      if (["CORUJA_PREVIEW_CONTENT", "CORUJA_SET_CONTENT", "coruja:preview-content"].includes(type)) {
        const next = unwrap(event.data.content) ?? unwrap(event.data.payload);
        if (next) {
          setSiteValue(deepMerge(defaultsJson, next));
          setStatus("ready");
        }
      }
    };
    window.addEventListener("message", onMessage);
    for (const name of ["coruja:preview-patch", "CORUJA_PREVIEW_PATCH", "CORUJA_CONTENT_PATCH"]) window.addEventListener(name, onPatch);
    for (const name of ["coruja:preview-content", "CORUJA_PREVIEW_CONTENT", "CORUJA_SET_CONTENT"]) window.addEventListener(name, onContent);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: "coruja-site-preview", type: "CORUJA_EDITOR_READY" }, "*");
      window.parent.postMessage({ source: "coruja-site-preview", type: "CORUJA_PREVIEW_READY" }, "*");
    }
    return () => {
      window.removeEventListener("message", onMessage);
      for (const name of ["coruja:preview-patch", "CORUJA_PREVIEW_PATCH", "CORUJA_CONTENT_PATCH"]) window.removeEventListener(name, onPatch);
      for (const name of ["coruja:preview-content", "CORUJA_PREVIEW_CONTENT", "CORUJA_SET_CONTENT"]) window.removeEventListener(name, onContent);
    };
  }, [setSiteValue]);

  return <StatusContext.Provider value={status}><Fragment key={revision}>{children}</Fragment></StatusContext.Provider>;
}

export function CorujaContentGate({ children }) {
  const status = useContext(StatusContext);
  if (status === "ready") return children;
  if (status === "error") return <main className="runtime-state"><div><h1>Site temporariamente indisponível</h1><p>Atualize a página em alguns instantes.</p></div></main>;
  return <main className="runtime-state" aria-busy="true"><div className="runtime-loader" /></main>;
}

export function useCoruja() {
  return currentContent;
}

export function useContent(path, fallback) {
  const current = getByPath(currentContent, path);
  const value = current ?? getByPath(defaultsJson, path);
  return value ?? fallback;
}

export function useCollection(path) {
  const value = useContent(path, []);
  return Array.isArray(value) ? value : [];
}

export function buildWhatsAppHref(raw, message = "") {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}` : "#contato";
}

export function useWhatsAppUrl(message) {
  return buildWhatsAppHref(useContent("global.contact.whatsappRaw", ""), message ?? useContent("global.contact.whatsappMessage", ""));
}

export function useTelHref() {
  const digits = String(useContent("global.contact.phoneRaw", "") || "").replace(/\D/g, "");
  return digits ? `tel:+${digits}` : "#contato";
}
