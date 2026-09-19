"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function signIn(e:React.FormEvent){
    e.preventDefault();
    setBusy(true); setError("");
    const supabase=createClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error) setError(error.message); else window.location.href="/dashboard";
  }

  return <main className="auth-shell"><section className="auth-card"><div className="brand-mark">U</div><p className="eyebrow">UNIVERSITY OS</p><h1>Your academic workspace.</h1><p className="muted">Courses, documents, deadlines and a grounded AI study assistant in one place.</p><form onSubmit={signIn} className="stack"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form><p className="muted small">Your AI key stays server-side.</p></section></main>;
}
