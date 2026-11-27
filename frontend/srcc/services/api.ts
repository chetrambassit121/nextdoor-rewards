import axios from "axios";
import type {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";


// this code is for development
// const API_URL =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:8000/api";

// production
const API_URL =
  import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("auth:logout"));
}

// Attach access token to API requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

// Handle expired access tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    
  if (
    error.response?.status !== 401 ||
    !original ||
    original._retry ||
    original.url?.includes("/auth/login/") ||
    original.url?.includes("/auth/guest-login/") ||
    original.url?.includes("/auth/register/") ||
    original.url?.includes("/auth/refresh/")
  ) {
    return Promise.reject(error);
  }


    original._retry = true;

    const refresh = localStorage.getItem("refresh_token");

    if (!refresh) {
      clearAuth();
      return Promise.reject(error);
    }

    try {
      // Share one refresh request between concurrent failures
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ access: string }>(
            `${API_URL}/auth/refresh/`,
            { refresh }
          )
          .then(({ data }) => {
            localStorage.setItem("access_token", data.access);
            return data.access;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccess = await refreshPromise;

      original.headers.set(
        "Authorization",
        `Bearer ${newAccess}`
      );

      return api(original);
    } catch (refreshError) {
      clearAuth();
      return Promise.reject(refreshError);
    }
  }
);
