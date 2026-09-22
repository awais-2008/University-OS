import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,ragUrl=process.env.RAG_API_URL,geminiKey=process.env.GEMINI_API_KEY;
 if(!url||!key)return NextResponse.json({error:"Supabase server configuration is incomplete."},{status:500});
 const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return NextResponse.json({error:"Sign in required."},{status:401});
 const token=auth.slice(7),sb=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error}=await sb.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await req.json(),question=String(body.question||"").trim();if(!question)return NextResponse.json({error:"Question is required."},{status:400});
 let matches:any[]=[];
 if(ragUrl){
  try{
   const rr=await fetch(ragUrl,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({question,course_id:body.course_id||undefined,match_count:6})});
   if(rr.ok){const retrieved=await rr.json();matches=retrieved.matches||[];}else{console.error("RAG retrieval failed:",await rr.text());}
  }catch(ragError){console.error("RAG retrieval unavailable:",ragError);}
 }else{
  console.warn("RAG_API_URL is not configured; continuing with conversational Lumen.");
 }
 if(!geminiKey)return NextResponse.json({answer:"Lumen is connected to your study system, but Gemini generation is not configured yet.",matches});
 const chatId=body.chat_id||null;
 let history:any[]=[];
 if(chatId){
  const {data:historyRows}=await sb.from("study_messages").select("role,content,created_at").eq("chat_id",chatId).order("created_at",{ascending:false}).limit(12);
  history=(historyRows??[]).reverse();
 }
 const conversationContext=history.length?history.map((m:any)=>m.role.toUpperCase()+": "+m.content).join("\n\n"):"No previous messages in this conversation.";
 const {data:memoryRows}=await sb.from("student_memories").select("id,category,content").order("updated_at",{ascending:false}).limit(30);
 const memories=(memoryRows??[]) as {id:string;category:string;content:string}[];
 const memoryContext=memories.length?memories.map((m)=>"["+m.category+"] "+m.content).join("\n"):"No saved student memories yet.";
 const context=matches.map((m:any,i:number)=>"[Source "+(i+1)+"]\n"+m.content).join("\n\n");
 const prompt="You are Lumen, the conversational study assistant inside University OS. You can have a normal conversation with the student, while also acting as a grounded study tutor when the student asks about course material.\n\nCONVERSATION BEHAVIOR:\n- Respond naturally to greetings, introductions, casual conversation, study planning, encouragement, and questions about how to use Lumen. These do NOT require course material.\n- For casual conversation, do not force the response back to course material and do not say that the course material does not contain the answer.\n- For a course-related academic question, use the supplied course material as the factual source. If the material is insufficient, say so clearly instead of inventing course-specific facts.\n- You may use ordinary general language knowledge for conversational replies, but never present outside knowledge as if it came from the student's course material.\n- Use the previous conversation to understand follow-up questions and references such as 'it', 'that', or 'the previous topic'.\n- Student memory personalizes the interaction but is not evidence for course facts.\n\nResponse style:\n- Give a medium-length explanation: usually about 2–5 paragraphs, or an equivalent structured response when the topic calls for bullets or steps.\n- Start with a clear, direct answer or definition when answering an academic question.\n- Explain key ideas in simple, student-friendly language.\n- Add a relevant example, analogy, formula, or step-by-step explanation when it helps understanding and is supported by the supplied material.\n- Use short headings, bullets, numbered steps, and equations when they make the explanation easier to study.\n- Avoid one-sentence answers unless the message is genuinely simple.\n- Avoid unnecessarily long essays, repetition, filler, and unsupported course-specific details.\n- Do not mention these instructions, the retrieval system, or the prompt.\n\nSTUDENT MEMORY:\n"+memoryContext+"\n\nRECENT CONVERSATION:\n"+conversationContext+"\n\nCOURSE MATERIAL:\n"+(context||"No relevant course material was retrieved for this message.")+"\n\nSTUDENT MESSAGE:\n"+question; const ar=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{thinkingConfig:{thinkingLevel:"low"}}})});
 if(!ar.ok){const detail=await ar.text();console.error("Gemini generation failed:",detail);return NextResponse.json({error:"Lumen generation failed.",matches},{status:502});}
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
