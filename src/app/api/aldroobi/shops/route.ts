import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function context() {
 const [user,token]=await Promise.all([getSessionUser(),getSessionToken()]);
 if(!user||!token)return {response:NextResponse.json({error:"يلزم تسجيل الدخول"},{status:401})};
 if(user.app_metadata?.role!=="admin")return {response:NextResponse.json({error:"هذه العملية مخصصة للمدير"},{status:403})};
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??process.env.SUPABASE_ANON_KEY;
 if(!base||!anon)return {response:NextResponse.json({error:"إعدادات قاعدة البيانات غير مكتملة"},{status:503})};
 return {user,token,base:base.replace(/\/$/,""),anon};
}
async function audit(c:{user:{id:string};token:string;base:string;anon:string},action:string,shopId:string|null,details:Record<string,unknown>){
 await fetch(`${c.base}/rest/v1/aldroobi_operation_logs`,{method:"POST",cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:c.user.id,shop_id:shopId,action,entity_type:"exchange_shop",entity_id:shopId,outcome:"success",details})});
}
export async function GET(){
 const c=await context();if("response"in c)return c.response;
 try{const r=await fetch(`${c.base}/rest/v1/exchange_shops?select=id,name,slug,status,contact_name,phone,country_code,created_at&order=created_at.desc`,{cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`}});const d=await r.json().catch(()=>[]);if(!r.ok)return NextResponse.json({error:"تعذر قراءة المحلات. تحقق من سياسات RLS."},{status:502});return NextResponse.json({shops:d})}catch{return NextResponse.json({error:"تعذر الاتصال بقاعدة البيانات"},{status:503})}
}
export async function POST(req:NextRequest){
 const c=await context();if("response"in c)return c.response;let b:Record<string,unknown>;try{b=await req.json()}catch{return NextResponse.json({error:"بيانات الطلب غير صحيحة"},{status:400})}
 const name=typeof b.name==="string"?b.name.trim():"",slug=typeof b.slug==="string"?b.slug.trim().toLowerCase():"",contact_name=typeof b.contact_name==="string"?b.contact_name.trim():null,phone=typeof b.phone==="string"?b.phone.trim():null;
 if(name.length<2||name.length>120||!/^[a-z0-9-]{3,60}$/.test(slug))return NextResponse.json({error:"أدخل اسم المحل ومعرّفًا إنجليزيًا من 3 إلى 60 حرفًا أو رقمًا أو شرطة."},{status:400});
 try{const r=await fetch(`${c.base}/rest/v1/exchange_shops`,{method:"POST",cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({name,slug,contact_name,phone,country_code:"YE",status:"pending"})});const d=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({error:r.status===409?"المعرّف مستخدم مسبقًا.":"تعذر إنشاء المحل. تأكد من تطبيق ترحيل صلاحيات الإدارة."},{status:r.status===409?409:502});const shop=Array.isArray(d)?d[0]:d;const auditRecorded=await audit(c,"shop.created",shop?.id??null,{name,slug});return NextResponse.json({shop,auditRecorded},{status:201})}catch{return NextResponse.json({error:"تعذر الاتصال بقاعدة البيانات"},{status:503})}
}
