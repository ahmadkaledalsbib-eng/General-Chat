const CUR=['SYP','USD'],SYM={SYP:'ل.س',USD:'$'};
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
const seed=()=>({ver:'1.0.0',rates:{USD:1,SYP:15000},users:[],tx:[],msgs:[],notif:[],log:[]});
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
let CT={off:false,until:0,msg:'',bn:'',bt:'',bf:'',ba:''},ctI=null,ctCb=null;
const dec=j=>{const f=(j&&j.fields)||{};return{off:!!(f.off&&f.off.booleanValue),until:+((f.until&&f.until.integerValue)||0),msg:(f.msg&&f.msg.stringValue)||'',bn:(f.bn&&f.bn.stringValue)||'',bt:(f.bt&&f.bt.stringValue)||'',bf:(f.bf&&f.bf.stringValue)||'',ba:(f.ba&&f.ba.stringValue)||''}};
async function pollCtl(){try{const n=dec(await fget('ctl',0));if(JSON.stringify(n)!=JSON.stringify(CT)){CT=n;ctCb&&ctCb()}}catch(x){}}
function startCtl(cb){ctCb=cb;pollCtl();clearInterval(ctI);ctI=setInterval(()=>{if(!document.hidden)pollCtl()},10000)}
const CTL={async set(o){const n={...CT,...o},S=v=>({stringValue:String(v||'')});await fset('ctl',{off:{booleanValue:!!n.off},until:{integerValue:String(Math.floor(n.until||0))},msg:S(n.msg),bn:S(n.bn),bt:S(n.bt),bf:S(n.bf),ba:S(n.ba)},['off','until','msg','bn','bt','bf','ba']);CT={off:!!n.off,until:Math.floor(n.until||0),msg:String(n.msg||''),bn:String(n.bn||''),bt:String(n.bt||''),bf:String(n.bf||''),ba:String(n.ba||'')};ctCb&&ctCb()}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollMain();pollCtl()}});

const LOGO=z=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5da8"/><stop offset="1" stop-color="#1b2250"/></linearGradient><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d36b"/><stop offset="1" stop-color="#c08a10"/></linearGradient></defs><rect width="120" height="120" rx="28" fill="url(#g)"/><circle cx="60" cy="60" r="47" fill="none" stroke="url(#o)" stroke-width="2.5" opacity=".55"/><path d="M60 24 94 42H26Z" fill="url(#o)"/><circle cx="60" cy="37" r="3.5" fill="#1b2250"/><rect x="28" y="45" width="64" height="5" rx="1" fill="url(#o)"/><g fill="#fff"><rect x="32" y="53" width="8" height="29" rx="1"/><rect x="48" y="53" width="8" height="29" rx="1"/><rect x="64" y="53" width="8" height="29" rx="1"/><rect x="80" y="53" width="8" height="29" rx="1"/></g><rect x="26" y="84" width="68" height="5" rx="1" fill="url(#o)"/><rect x="22" y="91" width="76" height="5" rx="1" fill="url(#o)"/></svg>`.replace('<svg ','<svg width="'+z+'" height="'+z+'" ');
const IC={bell:'<path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5z"/><path d="M10 20a2 2 0 0 0 4 0"/>',chart:'<path d="M3 20h18"/><path d="M4 15l5-5 4 3 7-8"/>',eye:'<path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6S3.5 14 2.5 12z"/><circle cx="12" cy="12" r="3"/>',eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a14 14 0 0 1-3 3.8M6.5 7.6C4.6 9 3.4 10.9 2.5 12c1 2 4.5 6 9.5 6 1.4 0 2.6-.3 3.7-.8"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>',send:'<path d="M21 3L3 10.5l7 3 3 7z"/><path d="M10 13.5L21 3"/>',recv:'<path d="M4 18l8-14 8 14-8-3z"/>',star:'<path fill="currentColor" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',bills:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',bank:'<path d="M3 9l9-5 9 5z"/><path d="M5 11v7M10 11v7M14 11v7M19 11v7M3 20h18"/>',home:'<path d="M12 3l8 6v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9z"/><path d="M10 20v-4h4v4"/>',transfers:'<path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"/>',card:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 11h18M7 15.5h3"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',scan:'<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/><path d="M4 12h16"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',headset:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="2"/><rect x="17" y="14" width="4" height="6" rx="2"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',up:'<path d="M12 17V5M6.5 10.5 12 5l5.5 5.5M5 20h14"/>',down:'<path d="M12 7v12M6.5 13.5 12 19l5.5-5.5M5 4h14"/>'};
const ICO=(n,s=24)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]||''}</svg>`;
const THEMES={royal:{n:'أزرق ملكي',bg:'#1b1d2b',card:'#242839',tx:'#f2f4f8',mu:'#9aa1b8',ac:'#6b82d6',h1:'#6c7db6',h2:'#43517f'},gold:{n:'ذهبي داكن',bg:'#14110b',card:'#211c10',tx:'#f5f1e6',mu:'#a89f86',ac:'#d4a017',h1:'#9a7614',h2:'#4a3a0a'},emerald:{n:'أخضر زمردي',bg:'#0e1a17',card:'#16272a',tx:'#eef7f4',mu:'#8fb0a8',ac:'#2fbf8f',h1:'#2f8f78',h2:'#1b5546'},violet:{n:'بنفسجي',bg:'#1a1528',card:'#261f3b',tx:'#f3f0fb',mu:'#a49cc0',ac:'#9b7cf0',h1:'#7a62c4',h2:'#493a85'},crimson:{n:'أحمر عنابي',bg:'#1c1214',card:'#2a1a1d',tx:'#faf0f1',mu:'#b99da2',ac:'#e0566a',h1:'#a8404f',h2:'#5e2430'},light:{n:'فاتح',bg:'#f3f5f9',card:'#ffffff',tx:'#14181f',mu:'#6a7384',ac:'#4a63c8',h1:'#6c7db6',h2:'#43517f'}};
const BRN=()=>CT.bn||'بنك إدلب المركزي',FT=()=>CT.bf||('جميع الحقوق محفوظة لدى '+BRN());
function applyTheme(mode){const k=mode=='light'?'light':(THEMES[CT.bt]?CT.bt:'royal'),t=THEMES[k],r=document.documentElement.style;[['--bg','bg'],['--card','card'],['--tx','tx'],['--mu','mu'],['--h1','h1'],['--h2','h2']].forEach(([v,x])=>r.setProperty(v,t[x]));r.setProperty('--ac',(k!='light'&&CT.ba)||t.ac)}
