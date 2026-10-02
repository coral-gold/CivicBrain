"use client";

import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";

/** Loads the signed-in user from /auth/me (re-reads the DB server-side, FR-A13). */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api.get<{ user: User }>("/auth/me")
      .then((r) => alive && setUser(r.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);
  return { user, loading };
}
