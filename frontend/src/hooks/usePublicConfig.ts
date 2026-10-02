"use client";

import { useEffect, useState } from "react";
import { api, PublicConfig } from "@/lib/api";

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let alive = true;
    api.get<PublicConfig>("/public/config").then((c) => alive && setConfig(c)).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return config;
}
