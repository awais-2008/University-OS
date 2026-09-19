import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,ragUrl=process.env.RAG_API_URL,ragSecret=process.env.RAG_API_SECRET,aiKey=process.env.AI_API_KEY,aiModel=process.env.AI_MODEL;
 if(!url||!key||!ragUrl||!ragSecret)return NextResponse.json({error:"RAG server configuration is incomplete."},{status:500});
 const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return NextResponse.json({error:"Sign in required."},{status:401});
 const token=auth.slice(7),sb=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error}=await sb.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await req.json(),question=String(body.question||"").trim();if(!question)return NextResponse.json({error:"Question is required."},{status:400});
 const rr=await fetch(ragUrl,{method:"POST",headers:{"Content-Type":"application/json","x-ingest-secret":ragSecret},body:JSON.stringify({question,course_id:body.course_id||undefined,match_count:6})});
 if(!rr.ok)return NextResponse.json({error:"RAG retrieval failed."},{status:502});
 const retrieved=await rr.json(),matches=retrieved.matches||[];
 if(!aiKey||!aiModel)return NextResponse.json({answer:"Retrieval is working, but AI generation is not configured yet.",matches});
 const context=matches.map((m:any,i:number)=>"[Source "+(i+1)+"]\n"+m.content).join("\n\n"),base=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
 const ar=await fetch(base+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+aiKey},body:JSON.stringify({model:aiModel,temperature:.2,messages:[{role:"system",content:"You are the University OS study assistant. Answer only from supplied course material. If the material does not contain the answer, say so."},{role:"user",content:"COURSE MATERIAL:\n"+context+"\n\nQUESTION:\n"+question}]})});
 if(!ar.ok)return NextResponse.json({error:"AI generation failed."},{status:502});
 const a=await ar.json();return NextResponse.json({answer:a?.choices?.[0]?.message?.content||"No answer returned.",matches});
}