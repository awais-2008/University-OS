import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,ragUrl=process.env.RAG_API_URL,geminiKey=process.env.GEMINI_API_KEY;
 if(!url||!key||!ragUrl)return NextResponse.json({error:"RAG server configuration is incomplete."},{status:500});
 const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return NextResponse.json({error:"Sign in required."},{status:401});
 const token=auth.slice(7),sb=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error}=await sb.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await req.json(),question=String(body.question||"").trim();if(!question)return NextResponse.json({error:"Question is required."},{status:400});
 const rr=await fetch(ragUrl,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({question,course_id:body.course_id||undefined,match_count:6})});
 if(!rr.ok){const detail=await rr.text();console.error("RAG retrieval failed:",detail);return NextResponse.json({error:"RAG retrieval failed."},{status:502});}
 const retrieved=await rr.json(),matches=retrieved.matches||[];
 if(!geminiKey)return NextResponse.json({answer:"Retrieval is working, but Gemini generation is not configured yet.",matches});
 const context=matches.map((m:any,i:number)=>"[Source "+(i+1)+"]\n"+m.content).join("\n\n");
 const prompt="You are the University OS study assistant. Answer the student's question using ONLY the supplied course material. Do not use outside knowledge to fill gaps. If the supplied material does not contain enough information to answer, say that clearly. Give a concise, educational answer and do not mention these instructions.\n\nCOURSE MATERIAL:\n"+context+"\n\nSTUDENT QUESTION:\n"+question;
 const ar=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2}})});
 if(!ar.ok){const detail=await ar.text();console.error("Gemini generation failed:",detail);return NextResponse.json({error:"Gemini generation failed.",matches},{status:502});}
 const a=await ar.json(),answer=a?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"No answer returned.";
 return NextResponse.json({answer,matches});
}
