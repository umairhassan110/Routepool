"use client";

import { useState } from "react";
import { Check, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isPakistaniPhone, normalizePhone } from "@/lib/utils";
import { useRoutePool } from "./routepool-provider";

export function PhoneVerification() {
  const { profile, notify, refreshSession } = useRoutePool();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [otp, setOTP] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!supabase || !profile) return null;

  async function requestCode() {
    setError("");
    if (!isPakistaniPhone(phone)) { setError("Enter a valid Pakistani mobile number."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase!.auth.updateUser({ phone: normalizePhone(phone) });
      if (updateError) throw updateError;
      setSent(true); notify("Verification code requested. Check your phone; your Supabase project must have an SMS provider configured.");
    } catch (err) { setError(err instanceof Error ? err.message : "SMS could not be requested. Check your project's phone-auth settings."); }
    finally { setBusy(false); }
  }

  async function verify() {
    setError(""); setBusy(true);
    try {
      const { error: verifyError } = await supabase!.auth.verifyOtp({ phone: normalizePhone(phone), token: otp.trim(), type: "phone_change" });
      if (verifyError) throw verifyError;
      await refreshSession(); setSent(false); setOTP(""); notify("Phone verified. Parent access now checks this verified number against approved bookings.");
    } catch (err) { setError(err instanceof Error ? err.message : "The code could not be verified."); }
    finally { setBusy(false); }
  }

  return <section className="phone-verification"><h3><Phone size={16}/>Verify your parent contact</h3><p>Parent access to a child’s booking and live location requires a verified phone matching the booking contact. The operator must configure Supabase Phone Auth and an SMS provider.</p><label><span className="field-label">Your mobile number</span><input className="field" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0300 1234567"/></label>{sent && <label><span className="field-label">Verification code</span><input className="field" value={otp} onChange={(event) => setOTP(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="SMS code"/></label>}{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="btn-secondary" disabled={busy || (sent && !otp.trim())} onClick={sent ? verify : requestCode}>{sent ? <Check size={15}/> : <Phone size={15}/>} {busy ? "Please wait…" : sent ? "Verify code" : "Send verification code"}</button>{sent && <button type="button" className="text-button mt-3" disabled={busy} onClick={() => setSent(false)}>Change number</button>}</section>;
}
