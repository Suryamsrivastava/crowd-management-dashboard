import axios from 'axios';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://hiring-dev.internal.kloudspot.com'
).replace(/\/$/, '');

const TOKEN_KEY = 'cms_token';

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

// Analytics endpoints aggregate raw NDJSON on the server and can take 10-20s
const api = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Listeners notified when the session becomes invalid (401 on a protected call)
const unauthorizedListeners = new Set();
export const onUnauthorized = (fn) => {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const isLogin = error?.config?.url?.includes('/auth/login');
    if (status === 401 && !isLogin) unauthorizedListeners.forEach((fn) => fn());
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.errorMessage ||
  err?.response?.data?.message ||
  (err?.code === 'ECONNABORTED' ? 'Request timed out' : null) ||
  (err?.message === 'Network Error' ? 'Unable to reach the server' : null) ||
  fallback;

export default api;
