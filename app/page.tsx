"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";

const phrases=["Let’s study","Let’s learn","Let’s explore","Let’s understand"];

export default function Home() {
  const [showSignIn,setShowSignIn]=useState(false);
  const [phraseIndex,setPhraseIndex]=useState(0);
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [showPassword,setShowPassword]=useState(false); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);

  useEffect(()=>{createClient().auth.getSession().then(({data})=>{if(data.session) window.location.href="/dashboard";});},[]);
  useEffect(()=>{if(showSignIn)return;const timer=window.setInterval(()=>setPhraseIndex(i=>(i+1)%phrases.length),2600);return()=>window.clearInterval(timer);},[showSignIn]);

  async function signIn(e:React.FormEvent){
    e.preventDefault(); if(busy)return; setBusy(true); setError("");
    try{const supabase=createClient();const result=await Promise.race([supabase.auth.signInWithPassword({email:email.trim(),password}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Sign-in timed out. Please try again.")),15000))]);if(result.error)throw new Error(result.error.message);window.location.href="/dashboard";}
    catch(e){setError(e instanceof Error?e.message:"Unable to sign in. Please try again.");}finally{setBusy(false);}
  }

  if(!showSignIn) return <main className="landing-shell"><div className="landing-glow"/><section className="landing-content"><img className="landing-logo" src="/logo.svg" alt="University OS"/><p className="eyebrow">UNIVERSITY OS</p><h1 className="landing-title"><span key={phraseIndex} className="landing-reveal"><span className="landing-static">{phrases[phraseIndex]}</span></span></h1><p className="landing-subtitle">Your academic workspace for courses, documents, deadlines and focused study.</p><button className="primary landing-signin" onClick={()=>setShowSignIn(true)}>Sign in</button></section></main>;

  return <main className="auth-shell"><section className="auth-card sign-in-enter"><button className="back-button" onClick={()=>setShowSignIn(false)}>← Back</button><img className="brand-logo auth-logo" src="/logo.svg" alt="University OS"/><p className="eyebrow">UNIVERSITY OS</p><h1>Your academic workspace.</h1><p className="muted">Courses, documents, deadlines and a grounded AI study assistant in one place.</p><form onSubmit={signIn} className="stack"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/></label><label>Password<div className="password-field"><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} disabled={busy} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button></div></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></section></main>;
}
