import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
async function context(){
 const [user,token]=await Promise.all([getSessionUser(),getSessionToken()]);
 if(!user||!token)return {response:NextResponse.json({error:"يلزم تسجيل الدخول"},{status:401})};
 if(user.app_metadata?.role!=="admin")return {response:NextResponse.json({error:"هذه العملية مخصصة للمدير"},{status:403})};
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL??process.env.SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??process.env.SUPABASE_ANON_KEY;
 if(!base||!anon)return {response:NextResponse.json({error:"إعدادات قاعدة البيانات غير مكتملة"},{status:503})};
 return {user,token,base:base.replace(/\/$/,""),anon};
}
async function audit(c:{user:{id:string};token:string;base:string;anon:string},action:string,shopId:string,subscriptionId:string|null,details:Record<string,unknown>){
 try {
  const r=await fetch(`${c.base}/rest/v1/aldroobi_operation_logs`,{method:"POST",cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:c.user.id,shop_id:shopId,action,entity_type:"subscription",entity_id:subscriptionId,outcome:"success",details})});
  return r.ok;
 } catch { return false; }
}
export async function GET(){const c=await context();if("response"in c)return c.response;try{const r=await fetch(`${c.base}/rest/v1/shop_subscriptions?select=id,shop_id,plan_code,status,starts_at,ends_at,created_at,exchange_shops(name,slug)&order=created_at.desc`,{cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`}});const d=await r.json().catch(()=>[]);if(!r.ok)return NextResponse.json({error:"تعذر تحميل الاشتراكات. تحقق من سياسات RLS."},{status:502});return NextResponse.json({subscriptions:d})}catch{return NextResponse.json({error:"تعذر الاتصال بقاعدة البيانات"},{status:503})}}
export async function POST(req:NextRequest){
 const c=await context();if("response"in c)return c.response;let b:Record<string,unknown>;try{b=await req.json()}catch{return NextResponse.json({error:"بيانات الطلب غير صحيحة"},{status:400})}
 const shop_id=typeof b.shop_id==="string"?b.shop_id:"",plan_code=typeof b.plan_code==="string"?b.plan_code.trim():"",status=typeof b.status==="string"?b.status:"active",ends_at=typeof b.ends_at==="string"&&b.ends_at?b.ends_at:null;
 if(!/^[0-9a-f-]{36}$/i.test(shop_id)||!/^[a-zA-Z0-9_-]{2,40}$/.test(plan_code)||!["trial","active","past_due","cancelled","expired"].includes(status))return NextResponse.json({error:"تحقق من المحل والخطة وحالة الاشتراك."},{status:400});
 if(ends_at&&(!Number.isFinite(Date.parse(ends_at))||Date.parse(ends_at)<Date.now()))return NextResponse.json({error:"تاريخ الانتهاء يجب أن يكون في المستقبل."},{status:400});
 try{const r=await fetch(`${c.base}/rest/v1/shop_subscriptions`,{method:"POST",cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({shop_id,plan_code,status,starts_at:new Date().toISOString(),ends_at})});const d=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({error:"تعذر إنشاء الاشتراك. تأكد من تطبيق ترحيل صلاحيات الإدارة."},{status:502});const sub=Array.isArray(d)?d[0]:d;const auditRecorded=await audit(c,"subscription.created",shop_id,sub?.id??null,{plan_code,status,ends_at});return NextResponse.json({subscription:sub,auditRecorded},{status:201})}catch{return NextResponse.json({error:"تعذر الاتصال بقاعدة البيانات"},{status:503})}
}

export async function PATCH(req:NextRequest){
 const c=await context();if("response"in c)return c.response;
 let b:Record<string,unknown>;try{b=await req.json()}catch{return NextResponse.json({error:"بيانات الطلب غير صحيحة"},{status:400})}
 const id=typeof b.id==="string"?b.id:"",status=typeof b.status==="string"?b.status:"";
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["trial","active","past_due","cancelled","expired"].includes(status))return NextResponse.json({error:"حدد الاشتراك وحالة صحيحة."},{status:400});
 try{
  const r=await fetch(`${c.base}/rest/v1/shop_subscriptions?id=eq.${encodeURIComponent(id)}&select=id,shop_id,plan_code,status,starts_at,ends_at`,{method:"PATCH",cache:"no-store",headers:{apikey:c.anon,Authorization:`Bearer ${c.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
  const d=await r.json().catch(()=>[]);
  if(!r.ok)return NextResponse.json({error:"تعذر تحديث حالة الاشتراك."},{status:502});
  if(!Array.isArray(d)||!d.length)return NextResponse.json({error:"الاشتراك غير موجود أو لا تملك صلاحية تعديله."},{status:404});
  const sub=d[0],auditRecorded=await audit(c,"subscription.status_changed",sub.shop_id,id,{status});
  return NextResponse.json({subscription:sub,auditRecorded});
 }catch{return NextResponse.json({error:"تعذر الاتصال بقاعدة البيانات"},{status:503})}
}
