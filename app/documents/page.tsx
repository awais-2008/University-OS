"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Doc={id:string;title:string;course_id:string|null};
export default function Documents(){
 const [docs,setDocs]=useState<Doc[]>([]); const [error,setError]=useState("");
 useEffect(()=>{createClient().from("documents").select("id,title,course_id").order("title").then(({data,error})=>{if(error)setError(error.message);setDocs((data??[]) as Doc[]);});},[]);
 return <main className="app-shell"><aside className="sidebar"><div className="side-brand"><span className="brand-mark small-mark">U</span>University OS</div><nav><a href="/dashboard">Dashboard</a><a href="/study">AI Study Assistant</a><a href="/courses">Courses</a><a className="nav-active" href="/documents">Documents</a><a href="/assignments">Assignments</a><a href="/exams">Exams</a></nav></aside><section className="workspace"><header className="topbar"><div><p className="eyebrow">KNOWLEDGE</p><h1>Documents</h1></div><a className="ghost action-link" href="/study">Study</a></header><div className="dashboard">{error&&<div className="error">{error}</div>}<section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">COURSE MATERIAL</p><h3>Indexed documents</h3></div><span className="muted small">{docs.length} documents</span></div><div className="document-list">{docs.map(d=><article className="document-card" key={d.id}><div><span className="doc-icon">PDF</span><div><strong>{d.title}</strong><small>{d.course_id?"Course material":"General material"}</small></div></div><a href={"/study?document="+d.id}>Ask about this →</a></article>)}</div></section></div></section></main>;
}
