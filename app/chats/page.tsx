"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Chat={id:string;title:string;updated_at:string};
export default function Chats(){
 const [chats,setChats]=useState<Chat[]>([]);const [error,setError]=useState("");
 useEffect(()=>{createClient().from("study_chats").select("id,title,updated_at").order("updated_at",{ascending:false}).then(({data,error})=>{if(error)setError(error.message);setChats((data??[]) as Chat[]);});},[]);
 return <main className="app-shell"><aside className="sidebar"><div className="side-brand"><span className="brand-mark small-mark">U</span>University OS</div><nav><a href="/dashboard">Dashboard</a><a href="/study">AI Study Assistant</a><a href="/courses">Courses</a><a href="/documents">Documents</a><a className="nav-active" href="/chats">Chats</a><a href="/assignments">Assignments</a><a href="/exams">Exams</a></nav></aside><section className="workspace"><header className="topbar"><h1>Chats</h1><a className="primary action-link" href="/study">New chat</a></header><div className="dashboard"><section className="dashboard-section">{error&&<div className="error">{error}</div>}{chats.length===0?<div className="empty-state compact"><h2>No saved chats yet</h2><p>Start a conversation in the AI Study Assistant and it will appear here.</p></div>:<div className="chat-list">{chats.map(c=><a className="chat-row" key={c.id} href={"/study?chat="+c.id}><span><strong>{c.title}</strong><small>{new Date(c.updated_at).toLocaleString()}</small></span><span>Open →</span></a>)}</div>}</section></div></section></main>;
}
