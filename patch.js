/* تعديلات خاصة بالـAPK: حفظ الإيصال في الاستديو، مشاركته PDF/صورة، وحقل PIN عند إنشاء الحساب */
(function(){
'use strict';
var C=window.Capacitor,RK=null;
try{RK=(C&&C.registerPlugin)?C.registerPlugin('ReceiptKit'):null}catch(x){}
var fmt='pdf';

function gv(id){var x=document.getElementById(id);return x?String(x.value||'').trim():''}
function toB64(u){var s='',n=0x8000;for(var i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)}
function fromB64(b){var s=atob(b),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}

async function snap(){
  if(!window.html2canvas)throw new Error('تعذّر تحميل أداة الصور، تأكد من الإنترنت');
  var el=document.getElementById('rcard');if(!el)throw new Error('الإيصال غير ظاهر');
  return html2canvas(el,{backgroundColor:getComputedStyle(document.body).backgroundColor||'#1b1d2b',scale:2});
}

/* يبني ملف PDF من صورة JPEG بدون أي مكتبة */
function makePdf(c){
  var jpg=fromB64(c.toDataURL('image/jpeg',0.92).split(',')[1]),w=c.width,h=c.height,pw=420,ph=Math.round(pw*h/w);
  var te=new TextEncoder(),parts=[],len=0,off={};
  function push(b){if(typeof b==='string')b=te.encode(b);parts.push(b);len+=b.length}
  push('%PDF-1.4\n');
  off[1]=len;push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  off[2]=len;push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  off[3]=len;push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
  off[4]=len;push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');push(jpg);push('\nendstream\nendobj\n');
  var cs='q '+pw+' 0 0 '+ph+' 0 0 cm /Im0 Do Q';
  off[5]=len;push('5 0 obj\n<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream\nendobj\n');
  var xo=len,x='xref\n0 6\n0000000000 65535 f \n';
  for(var i=1;i<=5;i++)x+=String(off[i]).padStart(10,'0')+' 00000 n \n';
  push(x+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF');
  var out=new Uint8Array(len),p=0;parts.forEach(function(b){out.set(b,p);p+=b.length});
  return out;
}
window.__makePdf=makePdf;

function rid(){try{return RID}catch(x){return 'x'}}
function pack(c,f){
  if(f==='pdf')return{d:toB64(makePdf(c)),n:'receipt-'+rid()+'.pdf',m:'application/pdf'};
  return{d:c.toDataURL('image/png').split(',')[1],n:'receipt-'+rid()+'.png',m:'image/png'};
}
function fail(x,pre){var m=String((x&&x.message)||x);toast(m==='not_installed'?'التطبيق غير مثبّت على هذا الجهاز':pre+': '+m,'err')}

/* استخراج الإيصال: صورة PNG مباشرة إلى الاستديو */
window.rcSave=async function(){
  try{
    var c=await snap(),p=pack(c,'img');
    if(RK){await RK.saveFile({data:p.d,name:p.n,mime:p.m});toast('تم حفظ الإيصال في الاستديو (Pictures/BANK-ADLIB)','ok')}
    else{var a=document.createElement('a');a.href='data:image/png;base64,'+p.d;a.download=p.n;document.body.appendChild(a);a.click();a.remove();toast('تم استخراج الإيصال','ok')}
  }catch(x){fail(x,'تعذّر حفظ الإيصال')}
};

async function doShare(pkg){
  try{
    var c=await snap(),p=pack(c,fmt);
    if(RK){await RK.shareFile({data:p.d,name:p.n,mime:p.m,pkg:pkg||''})}
    else{
      var u=fromB64(p.d),f=new File([u],p.n,{type:p.m});
      if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'إيصال حوالة'});
      else throw new Error('المشاركة غير متاحة');
    }
  }catch(x){if(x&&x.name==='AbortError')return;fail(x,'تعذّرت المشاركة')}
}
async function doSavePdf(){
  try{
    var c=await snap(),p=pack(c,'pdf');
    if(!RK)throw new Error('متاح داخل التطبيق فقط');
    await RK.saveFile({data:p.d,name:p.n,mime:p.m});toast('حُفظ ملف PDF في التنزيلات (Download/BANK-ADLIB)','ok');
  }catch(x){fail(x,'تعذّر الحفظ')}
}

window.rcShare=function(){
  fmt='pdf';
  var m=modal('<h3>مشاركة الإيصال</h3><p class="mu" style="margin-bottom:8px">اختر الصيغة ثم التطبيق</p>'
   +'<div class="row" style="margin-bottom:12px"><button id="rsP">📄 PDF</button><button class="g" id="rsI">🖼️ صورة</button></div>'
   +'<div class="row" style="margin-bottom:8px"><button class="g" data-p="com.whatsapp">واتساب</button><button class="g" data-p="com.facebook.orca">ماسنجر</button></div>'
   +'<div class="row" style="margin-bottom:8px"><button class="g" data-p="org.telegram.messenger">تيليجرام</button><button class="g" data-p="*">كل التطبيقات…</button></div>'
   +'<button class="g" style="width:100%" id="rsS">⬇️ حفظ نسخة PDF في التنزيلات</button>'
   +'<p class="mu c" style="margin-top:8px;font-size:12px">«كل التطبيقات» تفتح قائمة هاتفك (فيسبوك، البريد، الرسائل وغيرها)</p>');
  function tg(){var a=m.querySelector('#rsP'),b=m.querySelector('#rsI');a.className=fmt==='pdf'?'':'g';b.className=fmt==='img'?'':'g'}
  m.addEventListener('click',function(ev){
    var b=ev.target.closest('button');if(!b)return;
    if(b.id==='rsP'){fmt='pdf';tg();return}
    if(b.id==='rsI'){fmt='img';tg();return}
    if(b.id==='rsS'){doSavePdf();return}
    if(b.dataset.p)doShare(b.dataset.p==='*'?'':b.dataset.p);
  });
};

/* حقول PIN عند إنشاء الحساب */
var _sa=window.showAuth;
if(typeof _sa==='function'){
  window.showAuth=function(m){
    window.__pendingPin=null;
    _sa(m);
    if(m==='up'){
      var p2=document.getElementById('p2');
      if(p2&&!document.getElementById('pin1')){
        p2.insertAdjacentHTML('afterend','<input id="pin1" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="رمز PIN لفتح التطبيق (6 أرقام)"><input id="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="تأكيد رمز PIN">');
      }
    }
  };
}
var _ds=window.doSignup;
if(typeof _ds==='function'){
  window.doSignup=function(){
    if(document.getElementById('pin1')){
      var a=gv('pin1'),b=gv('pin2');
      if(!/^\d{6}$/.test(a))return toast('رمز PIN يجب أن يكون 6 أرقام','err');
      if(a!==b)return toast('رمزا PIN غير متطابقين','err');
      window.__pendingPin=a;
    }
    _ds();
  };
}
/* بعد نجاح إنشاء الحساب يُحفظ الـPIN على هذا الجهاز؛ ومن يسجّل دخوله بلا PIN محلي يُطلب منه إنشاؤه */
if(typeof auth!=='undefined'&&window.AppLock){
  auth.onAuthStateChanged(function(fu){
    if(!fu)return;
    var pp=window.__pendingPin;
    if(pp){window.__pendingPin=null;window.AppLock.setPin(pp).catch(function(){});return}
    if(!window.AppLock.hasPin())window.AppLock.require();
  });
}

/* ===== التوثيق: علامة زرقاء للمستخدم وذهبية للجهة الحكومية ===== */
function seal(color,ck,s){
  var pts=[],n=16;
  for(var i=0;i<n*2;i++){var r=(i%2?9.2:11),a=Math.PI*i/n-Math.PI/2;pts.push((12+r*Math.cos(a)).toFixed(2)+','+(12+r*Math.sin(a)).toFixed(2))}
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" style="flex:none;vertical-align:middle"><polygon points="'+pts.join(' ')+'" fill="'+color+'" stroke="'+color+'" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="'+ck+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
window.BADGE=function(u,s){
  if(!u||!u.vf)return '';
  return u.gov?seal('#e8b630','#3b2a00',s||16):seal('#5b8def','#fff',s||16);
};

/* التحويلات: علامة التوثيق بجانب الاسم */
window.row=function(t){
  var o=t.from==U.id,u=D.users.find(function(x){return x.id==(o?t.to:t.from)}),sb=o||!t.anon;
  return '<div class="tx" data-id="'+t.id+'"><span>'+e(o?nm(t.to):(t.anon?'مجهول':nm(t.from)))+(sb?' '+BADGE(u,16):'')+'<br><small class="mu">'+new Date(t.t).toLocaleString('ar')+'</small></span><b class="'+(o?'out':'in')+'" style="display:flex;gap:8px;align-items:center;font-size:19px">'+ICO(o?'up':'down',18)+fm(t.amt,t.cur)+'</b></div>';
};

/* شاشة الإرسال: بطاقة المستلم (صورة، اسم، رقم مخفي، علامة التوثيق) */
var _sm=window.sendM;
if(typeof _sm==='function'){
  window.sendM=function(to){
    _sm(to);
    var a=document.getElementById('a');if(!a)return;
    var box=document.createElement('div');box.id='rcp';a.insertAdjacentElement('afterend',box);
    function upd(){
      var v=a.value.trim(),u=D.users.find(function(x){return x.pub==v});
      if(!u||u.id==U.id){box.innerHTML='';return}
      var g=!!u.gov,last=String(u.pub).slice(-4);
      box.innerHTML='<div style="text-align:center;margin:12px 0 8px"><div style="width:84px;height:84px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;background:'+(g?'#2d2716':'#2a3350')+';color:'+(g?'#e8b630':'#8fb0ff')+'">'+ICO(g?'bank':'user',40)+'</div><b style="font-size:17px">'+e(u.name)+'</b><div class="mu" style="margin-top:6px;display:flex;gap:6px;justify-content:center;align-items:center;direction:ltr"><span>**** **** **** '+e(last)+'</span>'+BADGE(u,18)+'</div>'+(u.vf?'<small class="mu">'+(g?'جهة حكومية موثّقة':'حساب موثّق')+'</small>':'')+'</div>';
    }
    a.addEventListener('input',upd);a.addEventListener('change',upd);upd();
  };
}

/* صفحة حسابي: حالة التوثيق وزر الطلب */
window.reqVerify=function(){
  var m=modal('<h3>طلب توثيق الحساب</h3><p class="mu" style="margin-bottom:8px">تراجع الإدارة طلبك ثم تضع علامة التوثيق على حسابك. اكتب معلومات تساعد في التحقق (اختياري).</p><textarea id="vn" rows="3" placeholder="مثال: الاسم الكامل كما في الهوية، وسبب طلب التوثيق"></textarea><div class="row"><button id="vy">إرسال الطلب</button><button class="g" id="vc">إلغاء</button></div>');
  m.querySelector('#vc').onclick=function(){m.remove()};
  m.querySelector('#vy').onclick=function(){
    var n=m.querySelector('#vn').value.trim();
    D=load();var u=D.users.find(function(x){return x.id==U.id});if(!u)return;
    if(u.vf||u.vq){m.remove();return}
    u.vq=Date.now();u.vnote=n.slice(0,300);save(D);m.remove();
    toast('تم إرسال طلب التوثيق، بانتظار مراجعة الإدارة','ok');render();
  };
};
var _acc=window.acc;
if(typeof _acc==='function'){
  window.acc=function(){
    var h=_acc(),u=U,st;
    if(u.vf)st='<div class="card c" style="display:flex;gap:10px;justify-content:center;align-items:center">'+BADGE(u,28)+'<b>'+(u.gov?'جهة حكومية موثّقة':'حسابك موثّق')+'</b></div>';
    else if(u.vq)st='<div class="card c mu">⏳ طلب التوثيق قيد المراجعة من الإدارة</div>';
    else st='<button class="g" style="width:100%;margin-bottom:12px" onclick="reqVerify()">🔵 طلب توثيق الحساب</button>';
    h=h.replace('<h3 class="c">حسابي</h3>','<h3 class="c" style="display:flex;gap:8px;justify-content:center;align-items:center">حسابي '+BADGE(u,22)+'</h3>');
    var k='<button style="width:100%;margin-bottom:12px" onclick="go(\'info\')">';
    return h.indexOf(k)>=0?h.replace(k,st+k):h+st;
  };
}
})();
