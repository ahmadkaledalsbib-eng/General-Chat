const express=require('express'),fs=require('fs'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),cors=require('cors'),path=require('path');
const SECRET=process.env.JWT_SECRET||'change-this-secret';
const ADMIN_EMAIL=process.env.ADMIN_EMAIL||'admin@banksyria.com';
const ADMIN_PASS=process.env.ADMIN_PASS||'Admin@12345';
const F=process.env.DB_FILE||'db.json';
let db=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):{users:[],tx:[]};
const save=()=>fs.writeFileSync(F,JSON.stringify(db));
const app=express();app.use(cors(),express.json());
app.use('/admin',express.static(path.join(__dirname,'admin')));
const sign=(o)=>jwt.sign(o,SECRET,{expiresIn:'30d'});
const auth=(role)=>(q,s,n)=>{try{const p=jwt.verify((q.headers.authorization||'').slice(7),SECRET);
 if(p.role!==role)throw 0;q.auth=p;n()}catch{s.status(401).json({error:'غير مصرح'})}};
const pub=u=>({id:u.id,email:u.email,fullName:u.fullName,region:u.region,phone:u.phone,username:u.username,account:u.account,balance:u.balance,disabled:u.disabled});
const genAcc=()=>Array.from({length:4},()=>String(1000+Math.floor(Math.random()*9000))).join(' ');

app.post('/api/register',async(q,s)=>{
 const{email,password,confirm,fullName,region,phone,username}=q.body;
 if(![email,password,fullName,region,phone,username].every(Boolean))return s.status(400).json({error:'جميع الحقول مطلوبة'});
 if(password!==confirm)return s.status(400).json({error:'كلمتا المرور غير متطابقتين'});
 if(password.length<8)return s.status(400).json({error:'كلمة المرور 8 أحرف على الأقل'});
 if(fullName.trim().split(/\s+/).length<3)return s.status(400).json({error:'الاسم يجب أن يكون ثلاثياً'});
 const e=email.toLowerCase(),u=username.toLowerCase();
 if(db.users.some(x=>x.email===e||x.username===u||x.phone===phone))return s.status(409).json({error:'البريد أو اسم المستخدم أو الهاتف مستخدم مسبقاً'});
 const user={id:Date.now().toString(36),email:e,username:u,fullName,region,phone,account:genAcc(),balance:0,disabled:false,hash:await bcrypt.hash(password,10)};
 db.users.push(user);save();s.json({token:sign({id:user.id,role:'user'}),user:pub(user)});
});
app.post('/api/login',async(q,s)=>{
 const u=db.users.find(x=>x.email===(q.body.email||'').toLowerCase());
 if(!u||!await bcrypt.compare(q.body.password||'',u.hash))return s.status(401).json({error:'بيانات الدخول غير صحيحة'});
 if(u.disabled)return s.status(403).json({error:'الحساب معطل'});
 s.json({token:sign({id:u.id,role:'user'}),user:pub(u)});
});
app.get('/api/me',auth('user'),(q,s)=>{const u=db.users.find(x=>x.id===q.auth.id);s.json(pub(u))});
app.get('/api/tx',auth('user'),(q,s)=>s.json(db.tx.filter(t=>t.from===q.auth.id||t.to===q.auth.id).reverse().slice(0,50)));
app.post('/api/send',auth('user'),(q,s)=>{
 const a=db.users.find(x=>x.id===q.auth.id),amt=Number(q.body.amount),key=(q.body.to||'').toLowerCase().replace(/^@/,'');
 const b=db.users.find(x=>x.username===key||x.account.replace(/ /g,'')===key.replace(/ /g,''));
 if(!b||b.id===a.id)return s.status(404).json({error:'المستلم غير موجود'});
 if(!(amt>0)||amt>a.balance)return s.status(400).json({error:'الرصيد غير كاف أو المبلغ غير صالح'});
 a.balance-=amt;b.balance+=amt;
 db.tx.push({id:Date.now(),from:a.id,to:b.id,fromName:a.fullName,toName:b.fullName,amount:amt,note:q.body.note||'',date:new Date().toISOString()});save();s.json({ok:true,balance:a.balance});
});
// ---- Admin (منفصل) ----
app.post('/api/admin/login',(q,s)=>{
 if(q.body.email===ADMIN_EMAIL&&q.body.password===ADMIN_PASS)return s.json({token:sign({role:'admin'})});
 s.status(401).json({error:'بيانات خاطئة'});
});
app.get('/api/admin/users',auth('admin'),(q,s)=>s.json(db.users.map(pub)));
app.get('/api/admin/tx',auth('admin'),(q,s)=>s.json(db.tx.slice().reverse()));
app.post('/api/admin/users/:id',auth('admin'),(q,s)=>{
 const u=db.users.find(x=>x.id===q.params.id);if(!u)return s.sendStatus(404);
 if(q.body.balance!==undefined)u.balance=Number(q.body.balance);
 if(q.body.disabled!==undefined)u.disabled=!!q.body.disabled;save();s.json(pub(u));
});
app.listen(process.env.PORT||3000,()=>console.log('running'));
