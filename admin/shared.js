const CUR=['SYP','USD','TRY','EUR'],SYM={SYP:'ل.س',USD:'$',TRY:'₺',EUR:'€'};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
Array.prototype.toString=function(){return this.join('')};
firebase.initializeApp(window.FB_CONFIG);
const auth=firebase.auth(),fs=firebase.firestore(),REF=fs.doc('db/main'),CTL=fs.doc('db/ctl');
let CACHE=null,CT={off:false,until:0,msg:''},unM=null;
const seed=()=>({ver:'1.0.0',rates:{USD:1,SYP:15000,TRY:41,EUR:0.92},users:[],tx:[],msgs:[],notif:[],log:[]});
const load=()=>CACHE||seed();
function save(d){CACHE=d;REF.set(JSON.parse(JSON.stringify(d))).catch(x=>console.error('save',x))}
function startMain(cb){unM&&unM();unM=REF.onSnapshot(s=>{if(!s.exists){CACHE=seed();REF.set(CACHE)}else CACHE=s.data();cb&&cb()},x=>console.error(x))}
function stopMain(){unM&&unM();unM=null;CACHE=null}
function startCtl(cb){CTL.onSnapshot(s=>{CT=s.exists?s.data():{off:false,until:0,msg:''};cb&&cb()},x=>console.error(x))}
const AERR={'auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة','auth/wrong-password':'كلمة المرور غير صحيحة','auth/user-not-found':'الحساب غير موجود','auth/email-already-in-use':'هذا البريد مسجّل مسبقاً','auth/weak-password':'كلمة المرور ضعيفة (6 أحرف على الأقل)','auth/invalid-email':'البريد الإلكتروني غير صالح','auth/network-request-failed':'تحقق من الاتصال بالإنترنت','auth/too-many-requests':'محاولات كثيرة، حاول لاحقاً'};
const aerr=x=>AERR[x.code]||'حدث خطأ، حاول مرة أخرى';
