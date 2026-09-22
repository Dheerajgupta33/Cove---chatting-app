import axios from 'axios';
import { tokenRefreshed, sessionExpired } from '../features/common/actions';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const api = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true, timeout: 30000 });

let store;
export const injectStore = (s) => { store = s; };

api.interceptors.request.use((config) => {
  const token = store?.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: parallel 401s (and StrictMode double effects) share one request,
// which also keeps refresh-token rotation happy.
let refreshing = null;
export function refreshAccessToken() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/api/auth/refresh`, null, { withCredentials: true })
      .then((r) => r.data)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

const NO_RETRY = /\/auth\/(login|register|refresh|google|logout|forgot-password|reset-password|verify-email)/;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !NO_RETRY.test(original.url || '')) {
      original._retry = true;
      try {
        const data = await refreshAccessToken();
        store.dispatch(tokenRefreshed(data));
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        store.dispatch(sessionExpired());
      }
    }
    return Promise.reject(error);
  }
);

export default api;
