const CUR=['SYP','USD','TRY','EUR'],SYM={SYP:'ل.س',USD:'$',TRY:'₺',EUR:'€'};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const PID=window.FB_CONFIG.projectId,KEY=window.FB_CONFIG.apiKey;
const IT='https://identitytoolkit.googleapis.com/v1/',FS='https://firestore.googleapis.com/v1/projects/'+PID+'/databases/(default)/documents/db/';
const CMAP=[['EMAIL_EXISTS','auth/email-already-in-use'],['WEAK_PASSWORD','auth/weak-password'],['INVALID_EMAIL','auth/invalid-email'],['INVALID_LOGIN_CREDENTIALS','auth/invalid-credential'],['INVALID_PASSWORD','auth/invalid-credential'],['EMAIL_NOT_FOUND','auth/invalid-credential'],['MISSING_PASSWORD','auth/invalid-credential'],['TOO_MANY_ATTEMPTS','auth/too-many-requests'],['USER_DISABLED','auth/user-disabled'],['OPERATION_NOT_ALLOWED','auth/operation-not-allowed']];
const AERR={'auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/email-already-in-use':'هذا البريد مسجّل مسبقاً','auth/weak-password':'كلمة المرور ضعيفة (6 أحرف على الأقل)','auth/invalid-email':'البريد الإلكتروني غير صالح','auth/network-request-failed':'تحقق من الاتصال بالإنترنت','auth/too-many-requests':'محاولات كثيرة، حاول لاحقاً','auth/user-disabled':'الحساب معطّل','auth/operation-not-allowed':'تسجيل الدخول بالبريد غير مفعّل في Firebase'};
const aerr=x=>AERR[x.code]||('خطأ: '+(x.raw||x.detail||x.message||''));
async function jf(url,opt){let r;try{r=await fetch(url,opt)}catch(x){const er=new Error('network');er.code='auth/network-request-failed';er.detail=String(x);throw er}
 const t=await r.text();let j={};try{j=JSON.parse(t)}catch(x){}
 if(!r.ok){const m=(j.error&&(j.error.message||j.error.status))||('HTTP '+r.status);const er=new Error(m);er.status=r.status;er.raw=m;er.code=(CMAP.find(([k])=>m.includes(k))||[0,'auth/unknown'])[1];throw er}
 return j}
const pj=b=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
// ===== المصادقة =====
let S=null;try{S=JSON.parse(localStorage.getItem('lw_s'))}catch(x){}
const LST=[];
function setS(j){S=j?{uid:j.localId,email:j.email,idToken:j.idToken,rt:j.refreshToken,exp:Date.now()+(+j.expiresIn)*1000}:null;try{S?localStorage.setItem('lw_s',JSON.stringify(S)):localStorage.removeItem('lw_s')}catch(x){}LST.slice().forEach(f=>f(auth.currentUser))}
const auth={get currentUser(){return S?{uid:S.uid,email:S.email}:null},
 onAuthStateChanged(cb){LST.push(cb);setTimeout(()=>cb(auth.currentUser),0);return()=>{const i=LST.indexOf(cb);i>=0&&LST.splice(i,1)}},
 async signInWithEmailAndPassword(em,pw){setS(await jf(IT+'accounts:signInWithPassword?key='+KEY,pj({email:em,password:pw,returnSecureToken:true})))},
 async createUserWithEmailAndPassword(em,pw){setS(await jf(IT+'accounts:signUp?key='+KEY,pj({email:em,password:pw,returnSecureToken:true})))},
 async sendPasswordResetEmail(em){await jf(IT+'accounts:sendOobCode?key='+KEY,pj({requestType:'PASSWORD_RESET',email:em}))},
 async signOut(){setS(null)}};
async function tok(){if(!S){const er=new Error('no session');er.code='auth/no-user';throw er}
 if(Date.now()>S.exp-60000){try{const r=await jf('https://securetoken.googleapis.com/v1/token?key='+KEY,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(S.rt)});S.idToken=r.id_token;S.rt=r.refresh_token;S.exp=Date.now()+(+r.expires_in)*1000;try{localStorage.setItem('lw_s',JSON.stringify(S))}catch(x){}}
 catch(x){if(/TOKEN_EXPIRED|USER_NOT_FOUND|INVALID_REFRESH|USER_DISABLED/.test(x.raw||''))setS(null);throw x}}
 return S.idToken}
// ===== Firestore عبر REST =====
async function fget(n,a){try{return await jf(FS+n+(a?'':'?key='+KEY),{headers:a?{Authorization:'Bearer '+await tok()}:{}})}catch(x){if(x.status==404)return null;throw x}}
async function fset(n,fields,mask){return jf(FS+n+'?'+mask.map(m=>'updateMask.fieldPaths='+m).join('&'),{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await tok()},body:JSON.stringify({fields})})}
let CACHE=null,LU='',dirty=0,wt=null,mt=null,cbM=null,busy=0,lastE='';
const seed=()=>({ver:'1.0.0',rates:{USD:1,SYP:15000,TRY:41,EUR:0.92},users:[],tx:[],msgs:[],notif:[],log:[]});
const load=()=>CACHE||seed();
function save(d){CACHE=d;dirty=1;clearTimeout(wt);wt=setTimeout(flush,120)}
async function flush(){if(!dirty)return;dirty=0;try{const r=await fset('main',{j:{stringValue:JSON.stringify(CACHE)}},['j']);LU=r.updateTime}catch(x){console.error('save',x);dirty=1;wt=setTimeout(flush,3000);rep(x)}}
function rep(x){const m=String(x.raw||x.detail||x.message);if(m!=lastE){lastE=m;window.onSyncErr&&onSyncErr(x)}}
async function pollMain(){if(busy||dirty||!S||!cbM)return;busy=1;try{const j=await fget('main',1);let ch=0;
 if(!j||!j.fields||!j.fields.j){CACHE=seed();dirty=1;await flush();ch=1}
 else if(!dirty&&j.updateTime!=LU&&(!LU||j.updateTime>LU)){CACHE=JSON.parse(j.fields.j.stringValue);LU=j.updateTime;ch=1}
 else if(!CACHE){CACHE=JSON.parse(j.fields.j.stringValue);LU=j.updateTime;ch=1}
 lastE='';if(ch&&cbM)cbM()}catch(x){console.error('poll',x);rep(x)}finally{busy=0}}
function startMain(cb){cbM=cb;CACHE=null;LU='';pollMain();clearInterval(mt);mt=setInterval(()=>{if(!document.hidden)pollMain()},5000)}
function stopMain(){clearInterval(mt);cbM=null;CACHE=null;LU=''}
// ===== حالة إيقاف الموقع =====
let CT={off:false,until:0,msg:''},ctI=null,ctCb=null;
const dec=j=>{const f=(j&&j.fields)||{};return{off:!!(f.off&&f.off.booleanValue),until:+((f.until&&f.until.integerValue)||0),msg:(f.msg&&f.msg.stringValue)||''}};
async function pollCtl(){try{const n=dec(await fget('ctl',0));if(JSON.stringify(n)!=JSON.stringify(CT)){CT=n;ctCb&&ctCb()}}catch(x){}}
function startCtl(cb){ctCb=cb;pollCtl();clearInterval(ctI);ctI=setInterval(()=>{if(!document.hidden)pollCtl()},10000)}
const CTL={async set(o){await fset('ctl',{off:{booleanValue:!!o.off},until:{integerValue:String(Math.floor(o.until||0))},msg:{stringValue:String(o.msg||'')}},['off','until','msg']);CT={off:!!o.off,until:Math.floor(o.until||0),msg:String(o.msg||'')};ctCb&&ctCb()}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollMain();pollCtl()}});
