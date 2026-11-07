"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Bell, BusFront, Check, ChevronDown, CircleHelp, Compass, HeartHandshake, LayoutDashboard, MapPin, Navigation, Route, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useRoutePool } from "./routepool-provider";
import type { Role } from "@/lib/types";

const nav = [
  { href: "/tracking", label: "Live tracking", icon: Navigation },
  { href: "/search", label: "Find a route", icon: Search },
  { href: "/rides", label: "My rides", icon: BusFront },
  { href: "/driver", label: "Driver portal", icon: LayoutDashboard },
];
const roles: { value: Role; label: string; path: string }[] = [
  { value: "commuter", label: "Commuter", path: "/search" },
  { value: "parent", label: "Parent", path: "/tracking" },
  { value: "driver", label: "Driver", path: "/driver" },
];

function Wordmark() {
  return <Link className="wordmark" href="/tracking" aria-label="RoutePool PK home"><img src="/routepool.svg" alt="" width="35" height="35"/><span>RoutePool<span className="wordmark-pk">PK</span></span></Link>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { role, setRole, mode, profile, data, notice, clearNotice } = useRoutePool();
  const [notifications, showNotifications] = useState(false);
  const fullName = profile?.full_name ?? (mode === "supabase" ? "Guest" : role === "driver" ? "Muhammad Usman" : "Hassan Ahmed");
  const shortName = fullName.split(" ")[0];
  const navigateRole = (value: Role, target: string) => { setRole(value); router.push(target); };

  return <div className="app-shell">
    <aside className="sidebar">
      <Wordmark/>
      <div className="sidebar-city"><span className="tiny-dot"/><MapPin size={13}/> Islamabad & Rawalpindi</div>
      <p className="nav-label">YOUR WORKSPACE</p>
      <nav aria-label="Main navigation" className="side-nav">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`}><Icon size={19}/><span>{label}</span>{path === href && <span className="nav-active-dot"/>}</Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="peace-card"><div className="peace-icon"><ShieldCheck size={23}/></div><h3>A little peace of mind.</h3><p>Verified rides. Familiar routes.<br/>Safer mornings, together.</p><Link href="/help">Our safety promise <ArrowRight size={14}/></Link></div>
        <Link className={`nav-link ${path === "/help" ? "active" : ""}`} href="/help"><CircleHelp size={19}/> Help & support</Link>
        <div className="sidebar-footer"><span className="pk-flag">PK</span> Made for everyday Pakistan.</div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="mobile-brand"><Wordmark/></div>
        <div className="breadcrumb"><Compass size={17}/><span>Your everyday journey</span><span className="breadcrumb-divider">/</span><strong>{nav.find((item) => item.href === path)?.label ?? (path === "/account" ? "Account" : "Help & safety")}</strong></div>
        <div className="topbar-right">
          <div className="role-switch" aria-label="Role switcher">{roles.map(({ value, label, path: target }) => <button key={value} type="button" aria-pressed={role === value} className={role === value ? "selected" : ""} onClick={() => navigateRole(value, target)}>{label}</button>)}</div>
          <div className="topbar-line"/>
          <div className="notification-host"><button className="icon-button bell-button" aria-label="View notifications" aria-expanded={notifications} onClick={() => showNotifications(!notifications)}><Bell size={19}/><span className="bell-dot"/></button>{notifications && <div className="notification-popover"><div className="flex items-center justify-between"><h3>Journey updates</h3><button aria-label="Close notifications" onClick={() => showNotifications(false)} className="icon-button"><X size={15}/></button></div>{data.events.slice(-3).reverse().map((event) => <p key={event.id}><span className="tiny-dot"/>{event.title}</p>)}{!data.events.length && <p>No new trip updates.</p>}<Link href="/tracking" onClick={() => showNotifications(false)}>Open live tracking <ArrowRight size={14}/></Link></div>}</div>
          <Link href="/account" className="account-link"><span className="avatar small">{fullName.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><span className="account-name">{shortName}<small>{mode === "demo" ? "Demo account" : profile ? "Connected account" : "Sign in"}</small></span><ChevronDown size={14}/></Link>
        </div>
      </header>
      <main id="main-content" className="page-container">{children}</main>
      <footer className="main-footer"><span><ShieldCheck size={13}/> A safer commute, a calmer day.</span><span>{mode === "demo" ? "Interactive demo · sample data" : "Supabase connected"}<span className="footer-separator">·</span> RoutePool PK</span></footer>
    </div>

    <nav aria-label="Mobile navigation" className="mobile-nav">{nav.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={path === href ? "active" : ""}><Icon size={20}/><span>{label}</span></Link>)}</nav>
    {notice && <div className="toast" role="status"><span className="toast-icon"><Check size={17}/></span><p>{notice}</p><button onClick={clearNotice} aria-label="Dismiss notification"><X size={17}/></button></div>}
  </div>;
}
