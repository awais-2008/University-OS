"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Memory={id:string;category:string;content:string;created_at:string;updated_at:string};

export default function Memories(){
 const [memories,setMemories]=useState<Memory[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState("");
 const [category,setCategory]=useState("Learning preference");
 const [newContent,setNewContent]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);

 async function load(){const {data,error}=await createClient().from("student_memories").select("id,category,content,created_at,updated_at").order("updated_at",{ascending:false});if(error)setError(error.message);setMemories((data??[]) as Memory[]);setLoading(false);}
 useEffect(()=>{void load();},[]);

 async function add(){if(!newContent.trim())return;const {data:{user}}=await createClient().auth.getUser();if(!user){setError("Sign in required.");return;}const {error}=await createClient().from("student_memories").insert({user_id:user.id,category,content:newContent.trim()});if(error)setError(error.message);else{setNewContent("");await load();}}
 async function save(id:string){const {error}=await createClient().from("student_memories").update({category,content:draft,updated_at:new Date().toISOString()}).eq("id",id);if(error)setError(error.message);else{setEditing(null);await load();}}
 async function remove(id:string){const {error}=await createClient().from("student_memories").delete().eq("id",id);if(error)setError(error.message);else await load();}
 async function signOut(){await createClient().auth.signOut();window.location.href="/";}

 return <main className="app-shell"><aside className="sidebar"><div className="side-brand"><img className="brand-logo small-mark" src="/logo.svg" alt="University OS"/>University OS</div><nav><a href="/dashboard">Dashboard</a><a href="/study">Lumen</a><a className="nav-active" href="/memories">Memory</a><a href="/courses">Courses</a><a href="/documents">Documents</a><a href="/chats">Chats</a><a href="/assignments">Assignments</a><a href="/exams">Exams</a></nav></aside><section className="workspace"><header className="topbar"><div><h1>Lumen Memory</h1><p className="muted">Persistent context that Lumen can use to personalize your study help.</p></div><button className="ghost" onClick={signOut}>Sign out</button></header><div className="dashboard">{error&&<div className="error">{error}</div>}<section className="welcome"><div><h2>What Lumen remembers about you</h2><p className="muted">Memories are stored separately from chat history. You can edit or delete them at any time.</p></div></section><section className="welcome"><div><select value={category} onChange={e=>setCategory(e.target.value)}><option>Learning preference</option><option>Study goal</option><option>Strength</option><option>Weak area</option><option>Academic context</option><option>Other</option></select><textarea value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Add something Lumen should remember…" rows={3}/><button className="primary" onClick={add}>Add memory</button></div></section>{loading?<p className="muted">Loading memory…</p>:memories.length===0?<section className="welcome"><p className="muted">No memories saved yet. Lumen will extract durable study preferences and context from meaningful conversations.</p></section>:<div className="stat-grid">{memories.map(m=><article className="stat-card" key={m.id}>{editing===m.id?<><select value={category} onChange={e=>setCategory(e.target.value)}><option>Learning preference</option><option>Study goal</option><option>Strength</option><option>Weak area</option><option>Academic context</option><option>Other</option></select><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={4}/><button className="primary" onClick={()=>void save(m.id)}>Save</button> <button className="ghost" onClick={()=>setEditing(null)}>Cancel</button></>:<><span>{m.category}</span><p>{m.content}</p><small>Updated {new Date(m.updated_at).toLocaleString()}</small><div><button className="ghost" onClick={()=>{setEditing(m.id);setDraft(m.content);setCategory(m.category);}}>Edit</button> <button className="ghost" onClick={()=>void remove(m.id)}>Delete</button></div></>}</article>)}</div>}</div></section></main>;
}
