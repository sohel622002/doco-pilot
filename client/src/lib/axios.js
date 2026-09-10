import axios from "axios";

const apiUrl = import.meta.env.VITE_BACKEND_API_URL;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

let refreshPromise = null;

function redirectToLogin() {
  window.location.href = "/login";
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Never chain refresh attempts off the refresh endpoint itself — each
    // api.post() gets a fresh config, so _retry alone cannot stop a loop.
    if (originalRequest.url?.includes("/api/auth/refresh")) {
      if (!originalRequest.skipAuthRedirect) redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post("/api/auth/refresh")
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      // Silent auth checks (e.g. the public landing page probing whether a
      // visitor is already logged in) shouldn't force-navigate anyone away.
      if (!originalRequest.skipAuthRedirect) redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
