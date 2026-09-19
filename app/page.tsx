"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{createClient().auth.getSession().then(({data})=>{if(data.session) window.location.href="/dashboard";});},[]);
  async function signIn(e:React.FormEvent){
    e.preventDefault(); if(busy)return; setBusy(true); setError("");
    try{const supabase=createClient();const result=await Promise.race([supabase.auth.signInWithPassword({email:email.trim(),password}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Sign-in timed out. Please try again.")),15000))]);if(result.error)throw new Error(result.error.message);window.location.href="/dashboard";}
    catch(e){setError(e instanceof Error?e.message:"Unable to sign in. Please try again.");}finally{setBusy(false);}
  }
  return <main className="auth-shell"><section className="auth-card"><div className="brand-mark">U</div><p className="eyebrow">UNIVERSITY OS</p><h1>Your academic workspace.</h1><p className="muted">Courses, documents, deadlines and a grounded AI study assistant in one place.</p><form onSubmit={signIn} className="stack"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></section></main>;
}
