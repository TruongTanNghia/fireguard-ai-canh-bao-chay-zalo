"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { FireAlert } from "@/src/types";
import { getRuntimeApiBaseUrl } from "@/src/utils/constants";
import { playFireSiren, stopFireSiren } from "@/src/features/audio/fireAlarmAudio";
import { apiFetch } from "@/src/services/api";

interface FireAlertContextType {
  activeAlert: FireAlert | null;
  unreadCount: number;
  isWsConnected: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  dismissActiveAlert: () => void;
  clearUnreadCount: () => void;
}

const FireAlertContext = createContext<FireAlertContextType>({
  activeAlert: null,
  unreadCount: 0,
  isWsConnected: false,
  soundEnabled: true,
  setSoundEnabled: () => {},
  dismissActiveAlert: () => {},
  clearUnreadCount: () => {},
});

export const FireAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAlert, setActiveAlert] = useState<FireAlert | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const activeAlertTimeoutRef = useRef<any>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (!soundEnabled) {
      stopFireSiren();
    }
  }, [soundEnabled]);

  // Load số lượng alert pending ban đầu
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await apiFetch("/api/fire-alerts/stats");
        if (res.ok) {
          const stats = await res.json();
          setUnreadCount(stats.pending_alerts || 0);
        }
      } catch {}
    };
    fetchPendingCount();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let pingInterval: any = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const apiBase = getRuntimeApiBaseUrl();
      const wsUrl = apiBase.replace(/^http/, "ws") + "/ws/events";

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWsConnected(true);
          // Gửi heartbeat ping mỗi 25s
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send("ping");
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === "pong") return;
            const message = JSON.parse(event.data);
            if (message.type === "FIRE_ALERT") {
              const alertData: FireAlert = message.data;
              setActiveAlert(alertData);
              setUnreadCount((prev) => prev + 1);

              // Phát còi hú báo động nếu bật âm thanh
              if (soundEnabledRef.current) {
                playFireSiren(100);
              }

              // Tự động đóng banner khẩn cấp sau 15 giây nếu không tương tác
              if (activeAlertTimeoutRef.current) {
                clearTimeout(activeAlertTimeoutRef.current);
              }
              activeAlertTimeoutRef.current = setTimeout(() => {
                setActiveAlert(null);
                stopFireSiren();
              }, 15000);
            }
          } catch (err) {
            console.error("[FireAlertContext] Lỗi parse WS event:", err);
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          if (pingInterval) clearInterval(pingInterval);
          if (!isUnmounted) {
            reconnectTimer = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (activeAlertTimeoutRef.current) clearTimeout(activeAlertTimeoutRef.current);
      stopFireSiren();
      ws?.close();
    };
  }, []);

  const dismissActiveAlert = () => {
    setActiveAlert(null);
    stopFireSiren();
    if (activeAlertTimeoutRef.current) {
      clearTimeout(activeAlertTimeoutRef.current);
    }
  };

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return (
    <FireAlertContext.Provider
      value={{
        activeAlert,
        unreadCount,
        isWsConnected,
        soundEnabled,
        setSoundEnabled,
        dismissActiveAlert,
        clearUnreadCount,
      }}
    >
      {children}
    </FireAlertContext.Provider>
  );
};

export const useFireAlert = () => useContext(FireAlertContext);
