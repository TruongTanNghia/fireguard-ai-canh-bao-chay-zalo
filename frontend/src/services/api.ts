import { getRuntimeApiBaseUrl } from "@/src/utils/constants";

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fire_auth_token");
};

export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("fire_auth_token", token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("fire_auth_token");
  }
};

export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const apiBase = getRuntimeApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${apiBase}${endpoint}`;

  const headers: Record<string, string> = {
    ...(getAuthHeaders() as Record<string, string>),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Khi gửi file (FormData), phải để trình duyệt tự đặt Content-Type multipart kèm boundary.
  // Nếu giữ "application/json" thì backend không đọc được file (lỗi 422).
  if (typeof FormData !== "undefined" && options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    if (!window.location.pathname.includes("/login")) {
      removeAuthToken();
      window.location.href = "/login";
    }
  }

  return res;
};
