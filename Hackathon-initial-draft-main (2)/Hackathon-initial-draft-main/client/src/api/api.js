import axios from "axios";
import { getApiBaseUrl } from "../config/backendUrl";

const TOKEN_KEY = "sz_token";

const api = axios.create({
  baseURL: getApiBaseUrl() || "",
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const base = getApiBaseUrl();
  if (!base) {
    return Promise.reject(
      new Error(
        "API URL not configured. In Netlify: Site settings → Environment variables, set VITE_BACKEND_URL to your HTTPS API origin (no trailing slash), then redeploy."
      )
    );
  }
  config.baseURL = base;
  return config;
});

api.interceptors.request.use((config) => {
  const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  setAuthToken(null);
}

export async function authLogin({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function authRegister({ name, email, password, confirmPassword }) {
  const { data } = await api.post("/auth/register", { name, email, password, confirmPassword });
  return data;
}

export async function authMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function getDashboard(symbol) {
  const { data } = await api.get(`/dashboard/${encodeURIComponent(symbol)}`);
  return data;
}

export async function getTrending(symbol) {
  const params = symbol ? { symbol } : undefined;
  const { data } = await api.get("/trending", { params });
  return data.items || [];
}

export async function getHealth() {
  const { data } = await api.get("/health");
  return data;
}

export async function getCommunityPosts() {
  const { data } = await api.get("/community/posts");
  return data.posts || [];
}

export async function createCommunityPost({ author, role, text }) {
  const { data } = await api.post("/community/posts", { author, role, text });
  return data.post;
}

export async function getLearningTracks() {
  const { data } = await api.get("/learning/tracks");
  return data.tracks || [];
}

export async function getLearningTrackDetail(trackId) {
  const { data } = await api.get(`/learning/tracks/${encodeURIComponent(trackId)}`);
  return data;
}

export async function getLearningTopic(topicId) {
  const { data } = await api.get(`/learning/topics/${encodeURIComponent(topicId)}`);
  return data;
}

export async function getLearningMasterclass() {
  const { data } = await api.get("/learning/masterclass");
  return data.videos || [];
}

export async function askBullBearAssistant({ question, symbol }) {
  const { data } = await api.post("/bull-bear/ask", { question, symbol });
  return data;
}

export async function getAiChatStatus() {
  const { data } = await api.get("/ai/chat/status");
  return data;
}

/**
 * @param {{ messages: Array<{ role: string, content: string }>, symbol?: string }} body
 */
export async function postAiChat(body) {
  const { data } = await api.post("/ai/chat", body, { timeout: 180000 });
  return data;
}

export async function getTrendingCategories() {
  const { data } = await api.get("/market/trending-categories");
  return data.categories || [];
}

export async function getTrendingCategoryQuotes(categoryId) {
  const { data } = await api.get(
    `/market/trending-categories/${encodeURIComponent(categoryId)}/quotes`,
    { timeout: 130000 }
  );
  return data;
}
