"use client";
import { useState } from "react";
type Props={kind:"shop"|"subscription";id:string;status:string};
const choices:Record<Props["kind"],{value:string;label:string}[]>={shop:[{value:"pending",label:"بانتظار التفعيل"},{value:"active",label:"تفعيل"},{value:"suspended",label:"إيقاف"},{value:"closed",label:"إغلاق"}],subscription:[{value:"trial",label:"تجريبي"},{value:"active",label:"تفعيل"},{value:"past_due",label:"متأخر"},{value:"cancelled",label:"إلغاء"},{value:"expired",label:"منتهي"}]};
export default function AdminStatusAction({kind,id,status}:Props){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function change(next:string){if(next===status)return;setBusy(true);setMessage("");try{const r=await fetch(kind==="shop"?"/api/aldroobi/shops":"/api/aldroobi/subscriptions",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:next})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"تعذر التحديث");setMessage(d.auditRecorded===false?"تم التحديث دون تسجيله في سجل العمليات":"تم التحديث");window.setTimeout(()=>window.location.reload(),700)}catch(e){setMessage(e instanceof Error?e.message:"حدث خطأ")}finally{setBusy(false)}}
 return <div className="min-w-36"><select aria-label={kind==="shop"?"تغيير حالة المحل":"تغيير حالة الاشتراك"} disabled={busy} value={status} onChange={e=>change(e.target.value)} className="w-full rounded-lg border px-2 py-2 text-xs"><option value={status}>الحالة الحالية</option>{choices[kind].filter(x=>x.value!==status).map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>{message&&<p role="status" className="mt-1 text-xs">{message}</p>}</div>
}
