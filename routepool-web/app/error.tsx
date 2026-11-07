"use client";
import { RefreshCcw } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty-state panel"><RefreshCcw size={32}/><h2>This journey hit a small detour.</h2><p>The page could not load. Your local demo data remains in this browser. Please try again.</p><button className="btn-primary" onClick={reset}>Try again <RefreshCcw size={15}/></button></div>; }
