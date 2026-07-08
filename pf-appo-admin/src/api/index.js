import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
});

// URL-იდან /b/{slug} პრეფიქსის ამოცნობა
export function detectPathSlug() {
  const match = window.location.pathname.match(/^\/b\/([a-z0-9_-]+)/i);
  return match ? match[1] : null;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // თუ URL-ში /b/{slug} არის, X-Tenant-Slug header დავამატოთ
  const pathSlug = detectPathSlug();
  if (pathSlug) {
    config.headers["X-Tenant-Slug"] = pathSlug;
  }
  return config;
});

export default api;
