"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Course={id:string;code:string;name:string};
export default function Courses(){
 const [courses,setCourses]=useState<Course[]>([]);const [error,setError]=useState("");
 useEffect(()=>{createClient().from("courses").select("id,code,name").order("code").then(({data,error})=>{if(error)setError(error.message);setCourses((data??[]) as Course[]);});},[]);
 return <main className="app-shell"><aside className="sidebar"><div className="side-brand"><span className="brand-mark small-mark">U</span>University OS</div><nav><a href="/dashboard">Dashboard</a><a href="/study">AI Study Assistant</a><a className="nav-active" href="/courses">Courses</a><a href="/documents">Documents</a><a href="/chats">Chats</a><a href="/assignments">Assignments</a><a href="/exams">Exams</a></nav></aside><section className="workspace"><header className="topbar"><h1>Courses</h1><a className="ghost action-link" href="/dashboard">Dashboard</a></header><div className="dashboard">{error&&<div className="error">{error}</div>}<section className="dashboard-section"><div className="section-heading"><div><h3>All courses</h3></div><span className="muted small">{courses.length} courses</span></div><div className="course-grid">{courses.map(c=><article className="course-card" id={c.id} key={c.id}><span>{c.code}</span><strong>{c.name}</strong><small><a href={"/study?course="+c.id}>Study this course →</a></small></article>)}</div></section></div></section></main>;
}
