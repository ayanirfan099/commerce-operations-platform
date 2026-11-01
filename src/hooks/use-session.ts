"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth";

export function useSession() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { user?: SessionUser }) => {
        if (mounted) setSession(data.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { session, loading };
}
