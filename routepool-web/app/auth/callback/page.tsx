"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRoutePool } from "@/components/routepool-provider";

export default function AuthCallback() {
  const { refreshSession } = useRoutePool();
  const [message, setMessage] = useState("Confirming your account…");
  useEffect(() => {
    let live = true;
    async function complete() {
      if (!supabase) { if (live) setMessage("Supabase is not configured. Continue to the demo account page."); return; }
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) throw error; }
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        window.history.replaceState({}, "", "/auth/callback");
        await refreshSession();
        if (live) setMessage("Account confirmation complete. You can continue to your account.");
      } catch (error) { if (live) setMessage(error instanceof Error ? error.message : "The confirmation link could not be completed. Try signing in again."); }
    }
    void complete();
    return () => { live = false; };
  }, [refreshSession]);
  return <div className="empty-state panel"><ShieldCheck size={35}/><h1>Your RoutePool account</h1><p>{message}</p><Link href="/account" className="btn-primary">Continue to account</Link></div>;
}
