"use client";

import { useState, type FormEvent } from "react";
import { Check, Database, KeyRound, LogOut, Mail, RefreshCcw, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isPakistaniPhone, normalizePhone } from "@/lib/utils";
import { useRoutePool } from "./routepool-provider";
import { PhoneVerification } from "./phone-verification";

export function AccountScreen() {
  const { mode, profile, notify, refreshSession, resetDemo } = useRoutePool();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountRole, setAccountRole] = useState<"commuter" | "parent">("commuter");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!supabase) { setError("Supabase is not configured. The interactive demo does not require sign-in."); return; }
    if (signup && (fullName.trim().length < 2 || !isPakistaniPhone(phone))) { setError("Enter your full name and a valid Pakistani mobile number."); return; }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    setBusy(true);
    try {
      if (signup) {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: fullName.trim(), phone: normalizePhone(phone), role: accountRole } } });
        if (authError) throw authError;
        notify(data.session ? "Your account is created and signed in." : "Check your email to confirm your account, then sign in here.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        notify("You are signed in. Your authorized routes and bookings are connected.");
      }
      await refreshSession(); setPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to complete sign-in. Check your account details."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else { await refreshSession(); notify("Signed out. Public routes remain available; bookings and live locations require sign-in."); }
    setBusy(false);
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR ROUTEPOOL ACCOUNT</p><h1>A journey that’s yours<span className="heading-dot">.</span></h1><p>Manage your session and connect your real monthly rides.</p></div></div>
    <div className="account-grid">
      <section className="panel account-panel"><span className="dialog-icon"><UserRound size={23}/></span>{profile ? <><h2>{profile.full_name}</h2><p className="muted">Your Supabase profile is connected. Production permissions use your stored profile role, not the navigation switcher.</p><div className="detail-list"><p><span>Account role</span><strong className="capitalize">{profile.role}</strong></p><p><span>Phone</span><strong>{profile.phone || "Not provided"}</strong></p><p><span>Data mode</span><strong>Supabase · authorized records</strong></p></div><button className="btn-secondary" disabled={busy} onClick={signOut}><LogOut size={16}/>Sign out</button></> : <><h2>{signup ? "Create your account" : "Sign in to your everyday ride"}</h2><p className="muted">{supabase ? "Connect your real routes, bookings and authorized live trip updates." : "You’re in demo mode. All sample screens work without an account."}</p><form onSubmit={submit}>{signup && <><label><span className="field-label">Full name</span><input className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required placeholder="Hassan Ahmed"/></label><label><span className="field-label">Pakistani mobile number</span><input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" type="tel" required placeholder="0300 1234567"/></label><label><span className="field-label">I’m joining as</span><select className="field" value={accountRole} onChange={(event) => setAccountRole(event.target.value as "commuter" | "parent")}><option value="commuter">Commuter</option><option value="parent">Parent</option></select></label></>}<label><span className="field-label">Email address</span><input className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" disabled={!supabase}/></label><label><span className="field-label">Password</span><input className="field" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="At least 8 characters" disabled={!supabase}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn-primary" type="submit" disabled={busy || !supabase}><KeyRound size={16}/>{busy ? "Connecting…" : signup ? "Create account" : "Sign in"}</button>{supabase && <button className="text-button justify-center" type="button" onClick={() => { setSignup(!signup); setError(""); }}>{signup ? "Already have an account? Sign in" : "New to RoutePool? Create an account"}</button>}</form><p className="info-note">Driver accounts require operator verification and an administrator role assignment. Choosing Driver in the navigation does not grant database access.</p></>}</section>
      <aside className="panel account-mode"><span className="dialog-icon"><Database size={23}/></span><h3>{mode === "demo" ? "A fully interactive demo" : "Public routes, private journeys"}</h3><p>{mode === "demo" ? "Routes, bookings and trip controls are saved only in this browser. CNIC badges and students are sample records. There are no real payments, tracking or SOS messages." : "Routes, bookings and active trip updates use Supabase row-level security. You only see records your authenticated account is allowed to access."}</p><p className="mt-3">{supabase ? "Public routes are connected. Sign in with an authorized account to view private bookings and live trips." : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, apply the included SQL migration, then rebuild to connect Supabase."}</p>{mode === "demo" && <button className="btn-secondary" onClick={() => { if (window.confirm("Reset local demo routes, bookings and attendance to the original sample data?")) resetDemo(); }}><RefreshCcw size={15}/> Reset local demo</button>}<div className="info-note"><ShieldCheck size={17} className="mb-2 text-emerald-500"/>Contact details and live coordinates are never made public through route search. Parent access requires a verified phone number matching the booking.</div></aside>
    </div>
    {profile && <div className="panel account-panel mt-5"><PhoneVerification/></div>}
  </>;
}
