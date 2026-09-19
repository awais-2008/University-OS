"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Course={id:string;code:string;name:string};

export default function Dashboard(){
  const [courses,setCourses]=useState<Course[]>([]);
  const [counts,setCounts]=useState({assignments:0,exams:0,documents:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    async function load(){
      const supabase=createClient();
      const [{data:c,error:ce},{count:ac,error:ae},{count:ec,error:ee},{count:dc,error:de}]=await Promise.all([
        supabase.from("courses").select("id,code,name").order("code"),
        supabase.from("assignments").select("id",{count:"exact",head:true}),
        supabase.from("exams").select("id",{count:"exact",head:true}),
        supabase.from("documents").select("id",{count:"exact",head:true})
      ]);
      if(ce||ae||ee||de) setError((ce||ae||ee||de)?.message||"Could not load dashboard.");
      setCourses((c??[]) as Course[]);
      setCounts({assignments:ac??0,exams:ec??0,documents:dc??0});
      setLoading(false);
    }
    load();
  },[]);

  async function signOut(){
    await createClient().auth.signOut();
    window.location.href="/";
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><span className="brand-mark small-mark">U</span>University OS</div>
      <nav>
        <a className="nav-active" href="/dashboard">Dashboard</a>
        <a href="/study">AI Study Assistant</a>
        <a href="/courses">Courses</a>
        <a href="/documents">Documents</a>
        <a href="/assignments">Assignments</a>
        <a href="/exams">Exams</a>
      </nav>
      <div className="sidebar-note"><strong>Semester 1</strong><span>{courses.length} courses</span><small>Your academic workspace.</small></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1></div><button className="ghost" onClick={signOut}>Sign out</button></header>
      <div className="dashboard">
        {error&&<div className="error">{error}</div>}
        <section className="welcome"><div><p className="eyebrow">SEMESTER 1</p><h2>Your university workspace</h2><p className="muted">Track your courses, material, deadlines and study sessions from one place.</p></div><a className="primary action-link" href="/study">Open Study Assistant</a></section>
        <section className="stat-grid">
          <a className="stat-card" href="/courses"><span>Courses</span><strong>{loading?"—":courses.length}</strong><small>Active semester</small></a>
          <a className="stat-card" href="/documents"><span>Documents</span><strong>{loading?"—":counts.documents}</strong><small>Indexed materials</small></a>
          <a className="stat-card" href="/assignments"><span>Assignments</span><strong>{loading?"—":counts.assignments}</strong><small>Tracked work</small></a>
          <a className="stat-card" href="/exams"><span>Exams</span><strong>{loading?"—":counts.exams}</strong><small>Scheduled exams</small></a>
        </section>
        <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">COURSES</p><h3>Your courses</h3></div><a href="/courses">View all</a></div>
          <div className="course-grid">{courses.map(c=><a className="course-card" href={"/courses#"+c.id} key={c.id}><span>{c.code}</span><strong>{c.name}</strong><small>Open course</small></a>)}</div>
        </section>
      </div>
    </section>
  </main>;
}
