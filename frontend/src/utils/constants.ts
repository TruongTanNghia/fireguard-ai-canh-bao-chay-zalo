// Cổng Backend API. Mặc định 8000; đổi bằng biến môi trường NEXT_PUBLIC_API_PORT
// (ví dụ khi cổng 8000 đã bị phần mềm khác chiếm dụng).
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || "8000";

export const getRuntimeApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}`;
  }

  // Tự động nhận diện hostname của trình duyệt khi truy cập qua mạng LAN / WiFi
  const hostname = window.location.hostname;
  return `http://${hostname}:${API_PORT}`;
};

export const API_BASE_URL = getRuntimeApiBaseUrl();
