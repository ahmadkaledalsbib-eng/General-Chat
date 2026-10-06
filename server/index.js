const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@banksyria.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@12345';
const F = process.env.DB_FILE || 'db.json';

// الهيكلية الأساسية لقاعدة البيانات
const initialDb = {
  users: [],
  tx: [],
  support: [],
  rates: { USD: 1.0, SYP: 15000.0, TRY: 34.5, EUR: 0.92 },
  settings: { appName: 'بنك سوريا', themeColor: '#0B1240' }
};

let db = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F)) : initialDb;
if (!db.rates) db.rates = initialDb.rates;
if (!db.support) db.support = [];
if (!db.settings) db.settings = initialDb.settings;

const save = () => fs.writeFileSync(F, JSON.stringify(db, null, 2));

const app = express();
app.use(cors(), express.json());
app.use('/admin', express.static(path.join(__dirname, 'admin')));

const sign = (o) => jwt.sign(o, SECRET, { expiresIn: '30d' });
const auth = (role) => (q, s, n) => {
  try {
    const p = jwt.verify((q.headers.authorization || '').slice(7), SECRET);
    if (role && p.role !== role) throw 0;
    q.auth = p;
    n();
  } catch {
    s.status(401).json({ error: 'غير مصرح' });
  }
};

const pub = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  region: u.region,
  phone: u.phone,
  username: u.username,
  account: u.account,
  balances: u.balances || { USD: u.balance || 0, SYP: 0, TRY: 0, EUR: 0 },
  disabled: !!u.disabled,         // حظر أمني من الإدارة
  userFrozen: !!u.userFrozen,     // إيقاف مؤقت من المستخدم
  isVerified: !!u.isVerified,
  verificationStatus: u.verificationStatus || 'none', // 'none' | 'pending' | 'verified' | 'rejected'
  favorites: u.favorites || [],
  createdAt: u.createdAt || new Date().toISOString()
});

const genAcc = () => Array.from({ length: 4 }, () => String(1000 + Math.floor(Math.random() * 9000))).join(' ');

// --- تسجيل ودخول المستخدمين ---
app.post('/api/register', async (q, s) => {
  const { email, password, confirm, fullName, region, phone, username } = q.body;
  if (![email, password, fullName, region, phone, username].every(Boolean)) return s.status(400).json({ error: 'جميع الحقول مطلوبة' });
  if (password !== confirm) return s.status(400).json({ error: 'كلمتا المرور غير متطابقتين' });
  if (password.length < 8) return s.status(400).json({ error: 'كلمة المرور 8 أحرف على الأقل' });
  if (fullName.trim().split(/\s+/).length < 3) return s.status(400).json({ error: 'الاسم يجب أن يكون ثلاثياً' });

  const e = email.toLowerCase(), u = username.toLowerCase();
  if (db.users.some(x => x.email === e || x.username === u || x.phone === phone)) {
    return s.status(409).json({ error: 'البريد أو اسم المستخدم أو الهاتف مستخدم مسبقاً' });
  }

  const user = {
    id: Date.now().toString(36),
    email: e,
    username: u,
    fullName,
    region,
    phone,
    account: genAcc(),
    balances: { USD: 0, SYP: 0, TRY: 0, EUR: 0 },
    disabled: false,
    userFrozen: false,
    isVerified: false,
    verificationStatus: 'none',
    favorites: [],
    createdAt: new Date().toISOString(),
    hash: await bcrypt.hash(password, 10)
  };

  db.users.push(user); save();
  s.json({ token: sign({ id: user.id, role: 'user' }), user: pub(user) });
});

app.post('/api/login', async (q, s) => {
  const u = db.users.find(x => x.email === (q.body.email || '').toLowerCase());
  if (!u || !await bcrypt.compare(q.body.password || '', u.hash)) {
    return s.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  if (u.disabled) return s.status(403).json({ error: 'تم حظر الحساب من قِبل إدارة التطبيق' });
  s.json({ token: sign({ id: u.id, role: 'user' }), user: pub(u) });
});

app.get('/api/me', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  if (!u) return s.status(404).json({ error: 'المستخدم غير موجود' });
  s.json(pub(u));
});

// تعديل بيانات الملف الشخصي
app.post('/api/me/update', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  if (!u) return s.sendStatus(404);
  const { fullName, phone, region } = q.body;
  if (fullName) u.fullName = fullName;
  if (phone) u.phone = phone;
  if (region) u.region = region;
  save();
  s.json(pub(u));
});

// تجميد/تفعيل الحساب مؤقتاً من قبل المستخدم
app.post('/api/me/toggle-freeze', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  if (!u) return s.sendStatus(404);
  u.userFrozen = !u.userFrozen;
  save();
  s.json({ ok: true, userFrozen: u.userFrozen });
});

// إيقاف المعاملات للمستخدم المفعل خيار "تجميد الحساب"
const checkActive = (u) => {
  if (u.disabled) throw new Error('حسابك محظور من الإدارة');
  if (u.userFrozen) throw new Error('حسابك موقوف مؤقتاً من قبلك. يرجى تفعيله أولاً');
};

// --- تفاصيل مستخدم و المفضلة ---
app.get('/api/user-details/:query', auth('user'), (q, s) => {
  const search = q.params.query.toLowerCase().replace(/[@ ]/g, '');
  const target = db.users.find(u => u.username.toLowerCase() === search || u.account.replace(/ /g, '') === search || u.id === search);
  if (!target) return s.status(404).json({ error: 'الحساب غير موجود' });
  s.json({
    id: target.id,
    fullName: target.fullName,
    username: target.username,
    account: target.account,
    createdAt: target.createdAt,
    isVerified: !!target.isVerified
  });
});

app.post('/api/me/favorites/add', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  const { targetAccount } = q.body;
  if (!u || !targetAccount) return s.status(400).json({ error: 'بيانات غير مكتملة' });
  if (!u.favorites) u.favorites = [];
  if (!u.favorites.includes(targetAccount)) u.favorites.push(targetAccount);
  save();
  s.json({ ok: true, favorites: u.favorites });
});

// --- إرسال التحويلات ---
app.get('/api/tx', auth('user'), (q, s) => {
  s.json(db.tx.filter(t => t.from === q.auth.id || t.to === q.auth.id).reverse().slice(0, 50));
});

app.post('/api/send', auth('user'), (q, s) => {
  try {
    const a = db.users.find(x => x.id === q.auth.id);
    checkActive(a);

    const amt = Number(q.body.amount);
    const curr = q.body.currency || 'USD';
    const key = (q.body.to || '').toLowerCase().replace(/^@/, '').replace(/ /g, '');
    const b = db.users.find(x => x.username.toLowerCase() === key || x.account.replace(/ /g, '') === key);

    if (!b || b.id === a.id) return s.status(404).json({ error: 'المستلم غير موجود أو تم إدخال حسابك نفسه' });
    if (b.disabled) return s.status(400).json({ error: 'حساب المستلم معطل حالياً' });

    if (!a.balances) a.balances = { USD: 0, SYP: 0, TRY: 0, EUR: 0 };
    if (!b.balances) b.balances = { USD: 0, SYP: 0, TRY: 0, EUR: 0 };

    if (!(amt > 0) || (a.balances[curr] || 0) < amt) {
      return s.status(400).json({ error: 'الرصيد غير كافٍ للعملة المحددة' });
    }

    a.balances[curr] -= amt;
    b.balances[curr] = (b.balances[curr] || 0) + amt;

    const txObj = {
      id: Date.now().toString(),
      from: a.id,
      to: b.id,
      fromName: a.fullName,
      toName: b.fullName,
      fromAccount: a.account,
      toAccount: b.account,
      amount: amt,
      currency: curr,
      note: q.body.note || '',
      date: new Date().toISOString(),
      status: 'completed'
    };

    db.tx.push(txObj);
    save();
    s.json({ ok: true, balances: a.balances, tx: txObj });
  } catch (err) {
    s.status(400).json({ error: err.message });
  }
});

// --- التحويل بين العملات داخل الحساب الشخصي ---
app.get('/api/rates', (q, s) => s.json(db.rates));

app.post('/api/exchange', auth('user'), (q, s) => {
  try {
    const u = db.users.find(x => x.id === q.auth.id);
    checkActive(u);

    const { fromCurr, toCurr, amount } = q.body;
    const amt = Number(amount);
    if (!db.rates[fromCurr] || !db.rates[toCurr] || !(amt > 0)) {
      return s.status(400).json({ error: 'عملة أو مبلغ غير صالح' });
    }

    if (!u.balances) u.balances = { USD: 0, SYP: 0, TRY: 0, EUR: 0 };
    if ((u.balances[fromCurr] || 0) < amt) {
      return s.status(400).json({ error: 'الرصيد غير كافٍ في العملة المراد تحويلها' });
    }

    // حساب قيمة الصرف عبر الدولار المرجعي
    const amountInUSD = amt / db.rates[fromCurr];
    const convertedAmount = amountInUSD * db.rates[toCurr];

    u.balances[fromCurr] -= amt;
    u.balances[toCurr] = (u.balances[toCurr] || 0) + convertedAmount;

    save();
    s.json({ ok: true, balances: u.balances, convertedAmount });
  } catch (err) {
    s.status(400).json({ error: err.message });
  }
});

// --- التوثيق والدعم الفني للمستخدم ---
app.post('/api/me/verify', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  if (!u) return s.sendStatus(404);
  
  u.verificationStatus = 'pending';
  u.verificationData = {
    note: q.body.note || '',
    audioBase64: q.body.audioBase64 || null,
    submittedAt: new Date().toISOString()
  };
  save();
  s.json({ ok: true, status: 'pending' });
});

app.get('/api/support', auth('user'), (q, s) => {
  const msgs = db.support.filter(m => m.userId === q.auth.id);
  s.json(msgs);
});

app.post('/api/support', auth('user'), (q, s) => {
  const u = db.users.find(x => x.id === q.auth.id);
  if (!u) return s.sendStatus(404);
  const msg = {
    id: Date.now().toString(),
    userId: u.id,
    userName: u.fullName,
    text: q.body.text || '',
    sender: 'user',
    date: new Date().toISOString()
  };
  db.support.push(msg);
  save();
  s.json(msg);
});

// ==================== لوحة الإدارة (ADMIN) ====================
app.post('/api/admin/login', (q, s) => {
  if (q.body.email === ADMIN_EMAIL && q.body.password === ADMIN_PASS) {
    return s.json({ token: sign({ role: 'admin' }) });
  }
  s.status(401).json({ error: 'بيانات الدخول للإدارة غير صحيحة' });
});

// إدارة المستخدمين
app.get('/api/admin/users', auth('admin'), (q, s) => s.json(db.users.map(pub)));

app.post('/api/admin/users/:id', auth('admin'), (q, s) => {
  const u = db.users.find(x => x.id === q.params.id);
  if (!u) return s.sendStatus(404);

  if (q.body.balances) u.balances = { ...u.balances, ...q.body.balances };
  if (q.body.disabled !== undefined) u.disabled = !!q.body.disabled;
  if (q.body.isVerified !== undefined) {
    u.isVerified = !!q.body.isVerified;
    u.verificationStatus = u.isVerified ? 'verified' : 'none';
  }

  save();
  s.json(pub(u));
});

app.delete('/api/admin/users/:id', auth('admin'), (q, s) => {
  db.users = db.users.filter(x => x.id !== q.params.id);
  save();
  s.json({ ok: true });
});

// مراجعة التوثيق
app.get('/api/admin/verifications', auth('admin'), (q, s) => {
  const list = db.users.filter(u => u.verificationStatus === 'pending').map(pub);
  s.json(list);
});

app.post('/api/admin/verifications/:id', auth('admin'), (q, s) => {
  const u = db.users.find(x => x.id === q.params.id);
  if (!u) return s.sendStatus(404);
  const { action } = q.body; // 'approve' | 'reject'
  if (action === 'approve') {
    u.isVerified = true;
    u.verificationStatus = 'verified';
  } else {
    u.isVerified = false;
    u.verificationStatus = 'rejected';
  }
  save();
  s.json(pub(u));
});

// إدارة العملات وأسعار الصرف
app.get('/api/admin/rates', auth('admin'), (q, s) => s.json(db.rates));
app.post('/api/admin/rates', auth('admin'), (q, s) => {
  db.rates = { ...db.rates, ...q.body.rates };
  save();
  s.json({ ok: true, rates: db.rates });
});

// إدارة وتعديل/إلغاء التحويلات
app.get('/api/admin/tx', auth('admin'), (q, s) => s.json(db.tx.slice().reverse()));

app.post('/api/admin/tx/:id/cancel', auth('admin'), (q, s) => {
  const tx = db.tx.find(t => t.id === q.params.id);
  if (!tx || tx.status === 'cancelled') return s.status(400).json({ error: 'العملية ملغاة أو غير موجودة' });

  const sender = db.users.find(u => u.id === tx.from);
  const receiver = db.users.find(u => u.id === tx.to);

  if (sender && receiver) {
    sender.balances[tx.currency] = (sender.balances[tx.currency] || 0) + tx.amount;
    receiver.balances[tx.currency] = (receiver.balances[tx.currency] || 0) - tx.amount;
    tx.status = 'cancelled';
    save();
    return s.json({ ok: true, message: 'تم تمويل العملية العكسية وإرجاع الأرصدة' });
  }
  s.status(400).json({ error: 'تعذر تحديد طرفي التحويل' });
});

// الدعم الفني للإدارة
app.get('/api/admin/support', auth('admin'), (q, s) => s.json(db.support));
app.post('/api/admin/support/reply', auth('admin'), (q, s) => {
  const { userId, text } = q.body;
  const msg = {
    id: Date.now().toString(),
    userId,
    userName: 'الدعم الفني',
    text,
    sender: 'admin',
    date: new Date().toISOString()
  };
  db.support.push(msg);
  save();
  s.json(msg);
});

// التخصيص البصري وتغيير الثيم
app.get('/api/admin/settings', (q, s) => s.json(db.settings));
app.post('/api/admin/settings', auth('admin'), (q, s) => {
  db.settings = { ...db.settings, ...q.body };
  save();
  s.json(db.settings);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running...'));
