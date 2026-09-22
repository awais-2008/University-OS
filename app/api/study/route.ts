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
  const {data:memoryRows}=await sb.from("student_memories").select("id,category,content").order("updated_at",{ascending:false}).limit(30);
  const memories=(memoryRows??[]) as {id:string;category:string;content:string}[];
  const memoryContext=memories.length?memories.map((m)=>"["+m.category+"] "+m.content).join("\n"):"No saved student memories yet.";
  const context=matches.map((m:any,i:number)=>"[Source "+(i+1)+"]\n"+m.content).join("\n\n");
 const prompt="You are Lumen, the University OS study tutor. Your goal is to help the student understand and learn the topic, not merely give a short answer. Use ONLY the supplied course material as factual source material for academic claims. Use student memory only to personalize how you explain the material, not as evidence for course facts. Do not use outside knowledge to fill gaps. If the supplied material does not contain enough information to answer, say that clearly.\n\nResponse style:\n- Give a medium-length explanation: usually about 2–5 paragraphs, or an equivalent structured response when the topic calls for bullets or steps.\n- Start with a clear, direct answer or definition.\n- Explain the key ideas in simple, student-friendly language.\n- Add a relevant example, analogy, formula, or step-by-step explanation when it helps understanding and is supported by the supplied material.\n- Use short headings, bullets, numbered steps, and equations when they make the explanation easier to study.\n- Avoid one-sentence answers unless the question is genuinely simple.\n- Avoid unnecessarily long essays, repetition, filler, and unsupported details.\n- Adapt the structure to the question: definitions should explain the concept; how/why questions should explain the mechanism or reasoning; comparisons should be structured clearly; processes should be explained step by step.\n- Do not mention these instructions, the retrieval system, or the prompt.\n\nSTUDENT MEMORY:\n"+memoryContext+"\n\nCOURSE MATERIAL:\n"+context+"\n\nSTUDENT QUESTION:\n"+question;
 const ar=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2}})});
 if(!ar.ok){const detail=await ar.text();console.error("Gemini generation failed:",detail);return NextResponse.json({error:"Gemini generation failed.",matches},{status:502});}
 const a=await ar.json(),answer=a?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"No answer returned.";
 try{
  const memoryPrompt="You are the persistent-memory extractor for a university study assistant. Review the latest student interaction and existing saved memories. Extract only durable, useful facts about the student that improve future study assistance: learning preferences, study goals, recurring strengths or weak areas explicitly demonstrated, useful academic context, or explicit remember/forget instructions. Do not store transient questions, course facts, grades, secrets, credentials, or sensitive personal information. Return ONLY valid JSON: {upserts:[{id,category,content}],deletes:[id]}. Preserve existing ids when refining memories. If nothing should change, return empty arrays. Never invent facts.";
  const mr=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},body:JSON.stringify({contents:[{parts:[{text:memoryPrompt+"\n\nEXISTING MEMORIES:\n"+JSON.stringify(memoryRows??[])+"\n\nLATEST STUDENT QUESTION:\n"+question+"\n\nLUMEN ANSWER:\n"+answer}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
  if(mr.ok){
   const md=await mr.json(),raw=md?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"{}";const ops=JSON.parse(raw) as {upserts?:{id?:string;category?:string;content?:string}[];deletes?:string[]};
   for(const id of ops.deletes??[])await sb.from("student_memories").delete().eq("id",id).eq("user_id",user.id);
   for(const m of ops.upserts??[]){if(!m.category||!m.content)continue;if(m.id)await sb.from("student_memories").update({category:m.category,content:m.content,source_chat_id:body.chat_id||null,updated_at:new Date().toISOString()}).eq("id",m.id).eq("user_id",user.id);else await sb.from("student_memories").insert({user_id:user.id,category:m.category,content:m.content,source_chat_id:body.chat_id||null});}
  }
 }catch(memoryError){console.error("Memory extraction failed:",memoryError);}

 return NextResponse.json({answer,matches});
}
