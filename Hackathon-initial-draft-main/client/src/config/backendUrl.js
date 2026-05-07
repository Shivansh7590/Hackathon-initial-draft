/**
 * Backend URL resolution for REST + Socket.IO.
 *
 * Netlify: set ONE variable in Site settings → Environment variables, then redeploy:
 *   VITE_BACKEND_URL=https://your-express-host.com   (no trailing slash; same host as API)
 *
 * Or set both (legacy):
 *   VITE_API_URL=https://host.com/api
 *   VITE_SOCKET_URL=https://host.com
 *
 * Dev: defaults to http://localhost:4000 when unset.
 */

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/$/, "");
}

/** @returns {string} Origin only, e.g. https://api.example.com */
export function getBackendOrigin() {
  const single = import.meta.env.VITE_BACKEND_URL;
  if (single) {
    return stripTrailingSlash(single);
  }
  const api = import.meta.env.VITE_API_URL;
  if (api) {
    const s = stripTrailingSlash(api);
    if (s.endsWith("/api")) {
      return s.slice(0, -4);
    }
    return s.replace(/\/api$/, "");
  }
  const sock = import.meta.env.VITE_SOCKET_URL;
  if (sock) {
    return stripTrailingSlash(sock);
  }
  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }
  return "";
}

/** @returns {string} e.g. https://host.com/api */
export function getApiBaseUrl() {
  const o = getBackendOrigin();
  if (o) {
    return `${o}/api`;
  }
  if (import.meta.env.DEV) {
    return "http://localhost:4000/api";
  }
  return "";
}

/** @returns {string} Same as origin (Socket.IO on server root). */
export function getSocketUrl() {
  const o = getBackendOrigin();
  if (o) {
    return o;
  }
  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }
  return "";
}

/** Production build has a public API URL configured (not localhost baked in). */
export function isBackendConfiguredForProduction() {
  if (import.meta.env.DEV) {
    return true;
  }
  return Boolean(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL);
}
