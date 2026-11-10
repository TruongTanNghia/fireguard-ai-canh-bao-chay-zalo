"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MonitorPage() {
  const router = useRouter();

  useEffect(() => {
    // Chế độ Màn hình Trực ban đã được hợp nhất trực tiếp vào Trang chủ Giám sát Trung tâm
    router.replace("/");
  }, [router]);

  return null;
}
