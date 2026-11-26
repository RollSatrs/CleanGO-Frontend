import {NextRequest,NextResponse} from "next/server";
const COOKIE="cleango_admin_session";
const uuid="[0-9a-f-]{36}";
function allowed(path:string,method:string){
 if(method==="POST")return ["session/start","session/verify","session/logout"].includes(path);
 if(method==="GET")return ["session/me","dashboard","orders","users","reviews","cases"].includes(path)||new RegExp("^(orders|users|cases)/"+uuid+"$","i").test(path)||new RegExp("^users/"+uuid+"/avatar$","i").test(path)||new RegExp("^orders/"+uuid+"/photos/[0-9]{1,2}$","i").test(path);
 return method==="PATCH"&&new RegExp("^cases/"+uuid+"$","i").test(path);
}
function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});}
async function forward(req:NextRequest,ctx:{params:Promise<{path:string[]}>}){
 const path=(await ctx.params).path.join("/");
 if(!allowed(path,req.method))return json({message:"Маршрут недоступен"},404);
 if(req.method!=="GET"&&req.headers.get("origin")!==req.nextUrl.origin)return json({message:"Недопустимый источник запроса"},403);
 const base=(process.env.API_URL??process.env.NEXT_PUBLIC_API_URL??"").replace(/\/$/,"");
 if(!/^https:\/\/[^/]+$/i.test(base))return json({message:"Backend не настроен"},503);
 const publicRoute=path==="session/start"||path==="session/verify";
 const token=req.cookies.get(COOKIE)?.value;
 if(!publicRoute&&!token)return json({message:"Войдите в CleanGo Admin"},401);
 const headers=new Headers({Accept:"application/json","Content-Type":"application/json"});
 if(!publicRoute&&token)headers.set("Authorization","Bearer "+token);
 const url=new URL(base+"/admin/"+path);url.search=req.nextUrl.search;
 try{
   const body=req.method==="GET"?undefined:await req.text();
   if(body&&body.length>10000)return json({message:"Запрос слишком большой"},413);
   const upstream=await fetch(url,{method:req.method,headers,body,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
   const data=await upstream.json().catch(()=>({message:"Ошибка backend"}));
   if(path==="session/verify"&&upstream.ok){
     if(typeof data.token!=="string"||!/^[a-f0-9]{64}$/.test(data.token))return json({message:"Некорректная сессия"},502);
     const res=json({ok:true});res.cookies.set(COOKIE,data.token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/admin",maxAge:7200});return res;
   }
   if(upstream.ok&&(/\/avatar$/.test(path)||/\/photos\/\d+$/.test(path))){
     const encoded=typeof data.image==="string"?data.image:"";
     if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length>4200000)return json({message:"Фото недоступно"},404);
     const image=Buffer.from(encoded.slice("data:image/jpeg;base64,".length),"base64");
     if(image.length<4||image[0]!==255||image[1]!==216||image[2]!==255)return json({message:"Фото недоступно"},404);
     return new NextResponse(new Uint8Array(image),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
   }
   const res=json(data,upstream.status);
   if(path==="session/logout"||(!publicRoute&&upstream.status===401))res.cookies.set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/admin",maxAge:0});
   return res;
 }catch{return json({message:"Не удалось связаться с сервером"},502);}
}
export const GET=forward;
export const POST=forward;
export const PATCH=forward;
