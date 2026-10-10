/* قفل التطبيق: PIN إجباري + بصمة إجبارية. يعمل داخل الـAPK فقط (لا يؤثر على نسخة الويب). */
(function(){
'use strict';
var C=window.Capacitor;
var native=!!(C&&((C.isNativePlatform&&C.isNativePlatform())||(C.getPlatform&&C.getPlatform()!=='web')));
if(!native)return;
var BIO=null;
try{BIO=C.registerPlugin?C.registerPlugin('BiometricLock'):(C.Plugins&&C.Plugins.BiometricLock)}catch(x){}
var K='lw_pin',KS='lw_pins',KF='lw_pinfail',MAXF=5,GRACE=30000,LEN=6;
var st={mode:'',buf:'',first:'',busy:0,locked:1,hiddenAt:0,note:'',err:''};

var ov=document.createElement('div');
ov.id='applock';
ov.style.cssText='position:fixed;inset:0;z-index:100000;background:var(--bg,#1b1d2b);color:var(--tx,#f2f4f8);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;direction:rtl;font-family:system-ui,Tahoma,sans-serif;user-select:none;-webkit-user-select:none';
var sty=document.createElement('style');
sty.textContent='#applock .k{width:72px;height:72px;border-radius:50%;border:0;font-size:26px;background:var(--card,#242839);color:var(--tx,#f2f4f8);font-family:inherit}#applock .k:active{background:var(--ac,#6b82d6);color:#111}#applock .g{display:grid;grid-template-columns:repeat(3,72px);gap:16px;direction:ltr;margin-top:26px}#applock .d{width:14px;height:14px;border-radius:50%;border:2px solid var(--ac,#6b82d6);display:inline-block;margin:0 6px}#applock .d.f{background:var(--ac,#6b82d6)}#applock .b{margin-top:22px;padding:14px 28px;border:0;border-radius:14px;font-size:17px;font-weight:700;background:var(--ac,#6b82d6);color:#111;font-family:inherit}#applock a{color:var(--ac,#6b82d6);font-size:14px;margin-top:22px;display:block}';
document.body.appendChild(sty);
document.body.appendChild(ov);

function brand(){try{return typeof BRN==='function'?BRN():'بنك إدلب المركزي'}catch(x){return 'بنك إدلب المركزي'}}
function hx(s){
  try{if(window.crypto&&crypto.subtle){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return ('0'+x.toString(16)).slice(-2)}).join('')})}}catch(e){}
  var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return Promise.resolve(String(h));
}
function salt(){var a='';for(var i=0;i<16;i++)a+=Math.floor(Math.random()*16).toString(16);return a}

function draw(){
  var m=st.mode,t='',s='',keys=0,btn='';
  if(m==='create'){t='أنشئ رمز PIN';s=st.note||(LEN+' أرقام تحمي تطبيقك');keys=1}
  else if(m==='confirm'){t='أعد إدخال الرمز';s=st.err||'للتأكيد';keys=1}
  else if(m==='enter'){t='أدخل رمز PIN';s=st.err||'';keys=1}
  else if(m==='bio'){t='التحقق بالبصمة';s='ضع إصبعك على مستشعر البصمة'}
  else{t='البصمة مطلوبة';s=st.err||'';btn='<button class="b" data-a="bio">إعادة المحاولة</button>'}
  var dots='';
  if(keys){for(var i=0;i<LEN;i++)dots+='<span class="d'+(i<st.buf.length?' f':'')+'"></span>'}
  var pad='';
  if(keys){
    for(var n=1;n<=9;n++)pad+='<button class="k" data-k="'+n+'">'+n+'</button>';
    pad+='<span></span><button class="k" data-k="0">0</button><button class="k" data-k="x">⌫</button>';
  }
  ov.innerHTML='<div style="font-size:54px">🔒</div><h2 style="margin:8px 0 4px">'+brand()+'</h2><h3 style="margin:14px 0 6px">'+t+'</h3><p style="color:var(--mu,#9aa1b8);min-height:22px;max-width:300px">'+s+'</p>'+(keys?'<div style="margin-top:14px">'+dots+'</div><div class="g">'+pad+'</div>':'')+btn+(m==='enter'?'<a href="#" data-a="forgot">نسيت الرمز؟</a>':'');
}

function show(){ov.style.display='flex'}
function hide(){ov.style.display='none'}

function loggedIn(){try{return !!localStorage.getItem('lw_s')}catch(x){return false}}
function start(){
  st.buf='';st.first='';st.err='';st.note='';
  if(!localStorage.getItem(K)){
    if(!loggedIn()){unlock();return}
    st.locked=1;st.mode='create';
  }else{st.locked=1;st.mode='enter'}
  show();draw();
}

function unlock(){st.locked=0;st.busy=0;st.buf='';hide()}

function reset(mail){
  var em='';try{em=(JSON.parse(localStorage.getItem('lw_s'))||{}).email||''}catch(x){}
  try{localStorage.removeItem(K);localStorage.removeItem(KS);localStorage.removeItem(KF)}catch(x){}
  var done=function(ok){
    try{auth.signOut()}catch(x){}
    unlock();
    try{
      if(mail&&em)toast(ok?('أُرسل رابط تغيير كلمة المرور إلى '+em+'. غيّرها ثم سجّل الدخول وضع رمز PIN جديداً'):'تعذّر إرسال البريد. سجّل الدخول وضع رمز PIN جديداً',ok?'ok':'err');
      else toast('سُجّل خروجك. سجّل الدخول من جديد وضع رمز PIN جديداً','ok');
    }catch(x){}
  };
  if(mail&&em){try{auth.sendPasswordResetEmail(em).then(function(){done(1)}).catch(function(){done(0)})}catch(x){done(0)}}
  else done(0);
}

function bio(){
  if(st.busy&&st.mode==='bio')return;
  st.mode='bio';st.busy=1;st.err='';draw();
  if(!BIO||!BIO.authenticate){st.busy=0;st.mode='bf';st.err='مكوّن البصمة غير متوفر في هذا الإصدار من التطبيق';draw();return}
  BIO.authenticate().then(function(r){
    st.busy=0;
    if(r&&r.ok){unlock();return}
    st.mode='bf';
    if(r&&r.reason==='none_enrolled')st.err='لا توجد بصمة مسجّلة في هاتفك. سجّل بصمتك من إعدادات الهاتف ثم أعد المحاولة.';
    else if(r&&r.reason==='unavailable')st.err='البصمة غير متاحة على هذا الجهاز.';
    else st.err='فشل التحقق من البصمة، أعد المحاولة.';
    draw();
  }).catch(function(){st.busy=0;st.mode='bf';st.err='تعذّر تشغيل البصمة، أعد المحاولة.';draw()});
}

async function submit(){
  var p=st.buf;st.buf='';
  if(st.mode==='create'){st.first=p;st.mode='confirm';st.err='';draw();return}
  if(st.mode==='confirm'){
    if(p!==st.first){st.first='';st.mode='create';st.note='الرمزان غير متطابقين، أعد الإنشاء';draw();return}
    var sl=salt(),h=await hx(sl+p);
    try{localStorage.setItem(KS,sl);localStorage.setItem(K,h);localStorage.setItem(KF,'0')}catch(x){}
    st.first='';bio();return;
  }
  if(st.mode==='enter'){
    var s2=localStorage.getItem(KS)||'',h2=await hx(s2+p);
    if(h2===localStorage.getItem(K)){try{localStorage.setItem(KF,'0')}catch(x){}bio();return}
    var f=(+localStorage.getItem(KF)||0)+1;try{localStorage.setItem(KF,String(f))}catch(x){}
    if(f>=MAXF){reset(0);return}
    st.err='الرمز خاطئ (المحاولات المتبقية: '+(MAXF-f)+')';draw();
  }
}

ov.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-k],[data-a]');if(!b)return;
  if(b.dataset.a==='bio'){bio();return}
  if(b.dataset.a==='forgot'){ev.preventDefault();reset(1);return}
  if(st.busy)return;
  var k=b.dataset.k;
  if(k==='x'){st.buf=st.buf.slice(0,-1);draw();return}
  if(st.buf.length>=LEN)return;
  st.buf+=k;st.err='';draw();
  if(st.buf.length===LEN)submit();
});

document.addEventListener('visibilitychange',function(){
  if(document.hidden){if(!st.locked)st.hiddenAt=Date.now();return}
  if(!st.locked&&st.hiddenAt&&Date.now()-st.hiddenAt>GRACE)start();
});

window.AppLock={
  hasPin:function(){return !!localStorage.getItem(K)},
  setPin:async function(p){var sl=salt(),h=await hx(sl+p);localStorage.setItem(KS,sl);localStorage.setItem(K,h);localStorage.setItem(KF,'0')},
  require:function(){if(!st.locked&&!localStorage.getItem(K))start()}
};
start();
})();
