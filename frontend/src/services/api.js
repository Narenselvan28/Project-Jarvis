import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach JWT access token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global response interceptor for 401 Unauthorized & Envelope Compatibility
api.interceptors.response.use(
  (response) => {
    // Graceful envelope unpacker: supports both {success: true, data: {...}} and raw payloads
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      if (typeof response.data.data === "object" && response.data.data !== null && !Array.isArray(response.data.data)) {
        Object.keys(response.data.data).forEach((key) => {
          if (!(key in response.data)) {
            response.data[key] = response.data.data[key];
          }
        });
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if session expired
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
