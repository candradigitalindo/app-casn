"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect client-side karena server redirect tidak didukung output: 'export'.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
