const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const CUR = ['USD', 'SYP', 'TRY', 'EUR'];

const needAuth = (r) => { if (!r.auth) throw new HttpsError('unauthenticated', 'سجّل الدخول'); return r.auth.uid; };
const needAdmin = (r) => { if (r.auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'للإدارة فقط'); };
async function push(uid, title, body) {
  const t = (await db.doc(`users/${uid}`).get()).data()?.fcmToken;
  if (t) await admin.messaging().send({ token: t, notification: { title, body }, android: { priority: 'high' } }).catch(() => {});
}

// إرسال حوالة (يتم بالكامل على السيرفر داخل transaction)
exports.sendMoney = onCall(async (req) => {
  const from = needAuth(req);
  const { toAccount, currency, amount } = req.data;
  const amt = Number(amount);
  if (!(amt > 0) || !CUR.includes(currency)) throw new HttpsError('invalid-argument', 'بيانات غير صحيحة');
  const q = await db.collection('users').where('accountNumber', '==', String(toAccount)).limit(1).get();
  if (q.empty) throw new HttpsError('not-found', 'الحساب غير موجود');
  const toRef = q.docs[0].ref, fromRef = db.doc(`users/${from}`);
  if (toRef.id === from) throw new HttpsError('invalid-argument', 'لا يمكن الإرسال لنفسك');
  const tid = await db.runTransaction(async (t) => {
    const [f, to] = await Promise.all([t.get(fromRef), t.get(toRef)]);
    if (f.data().disabled || to.data().disabled) throw new HttpsError('failed-precondition', 'حساب معطّل');
    if ((f.data().balances[currency] || 0) < amt) throw new HttpsError('failed-precondition', 'الرصيد غير كافٍ');
    t.update(fromRef, { [`balances.${currency}`]: admin.firestore.FieldValue.increment(-amt) });
    t.update(toRef, { [`balances.${currency}`]: admin.firestore.FieldValue.increment(amt) });
    const ref = db.collection('transfers').doc();
    t.set(ref, { from, to: toRef.id, fromName: f.data().name, toName: to.data().name, currency, amount: amt,
      status: 'done', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return ref.id;
  });
  const me = (await fromRef.get()).data().name;
  await push(toRef.id, 'حوالة جديدة', `استلمت ${amt} ${currency} من ${me}`);
  return { id: tid };
});

// تحويل بين العملات حسب سعر الإدارة
exports.convert = onCall(async (req) => {
  const uid = needAuth(req);
  const { from, to, amount } = req.data; const amt = Number(amount);
  if (!(amt > 0) || from === to || !CUR.includes(from) || !CUR.includes(to)) throw new HttpsError('invalid-argument', 'بيانات غير صحيحة');
  const rates = (await db.doc('config/rates').get()).data(); // لكل 1 دولار: {USD:1, SYP:..., TRY:..., EUR:...}
  const got = amt * rates[to] / rates[from];
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (t) => {
    const u = (await t.get(ref)).data();
    if (u.disabled) throw new HttpsError('failed-precondition', 'الحساب معطّل');
    if ((u.balances[from] || 0) < amt) throw new HttpsError('failed-precondition', 'الرصيد غير كافٍ');
    t.update(ref, { [`balances.${from}`]: admin.firestore.FieldValue.increment(-amt),
                    [`balances.${to}`]: admin.firestore.FieldValue.increment(got) });
  });
  return { received: got };
});

// المستخدم يفعّل حسابه بنفسه
exports.enableMyAccount = onCall(async (req) => { await db.doc(`users/${needAuth(req)}`).update({ disabled: false }); return {}; });

// ---- صلاحيات الإدارة ----
exports.adminSetDisabled = onCall(async (req) => { needAdmin(req); await db.doc(`users/${req.data.uid}`).update({ disabled: !!req.data.disabled }); return {}; });
exports.adminSetBalance = onCall(async (req) => { needAdmin(req);
  if (!CUR.includes(req.data.currency)) throw new HttpsError('invalid-argument', 'عملة غير صحيحة');
  await db.doc(`users/${req.data.uid}`).update({ [`balances.${req.data.currency}`]: Number(req.data.value) }); return {}; });
exports.adminReviewVerify = onCall(async (req) => { needAdmin(req);
  const ok = !!req.data.approve;
  await db.doc(`users/${req.data.uid}`).update({ verified: ok, 'verifyRequest.status': ok ? 'approved' : 'rejected' });
  await push(req.data.uid, 'التوثيق', ok ? 'تم توثيق حسابك' : 'تم رفض طلب التوثيق'); return {}; });
exports.adminDeleteUser = onCall(async (req) => { needAdmin(req);
  await admin.auth().deleteUser(req.data.uid).catch(() => {}); await db.doc(`users/${req.data.uid}`).delete(); return {}; });
exports.adminCancelTransfer = onCall(async (req) => { needAdmin(req);
  const ref = db.doc(`transfers/${req.data.id}`);
  await db.runTransaction(async (t) => {
    const tr = (await t.get(ref)).data();
    if (tr.status !== 'done') throw new HttpsError('failed-precondition', 'ملغاة مسبقاً');
    t.update(db.doc(`users/${tr.from}`), { [`balances.${tr.currency}`]: admin.firestore.FieldValue.increment(tr.amount) });
    t.update(db.doc(`users/${tr.to}`), { [`balances.${tr.currency}`]: admin.firestore.FieldValue.increment(-tr.amount) });
    t.update(ref, { status: 'cancelled' });
  }); return {}; });

// إشعار فوري للإدارة/المستخدم عند رسالة دعم
exports.onSupportMsg = onDocumentCreated('support/{uid}/messages/{id}', async (e) => {
  const m = e.data.data(), uid = e.params.uid;
  if (m.fromAdmin) return push(uid, 'الدعم الفني', m.text);
  await db.doc(`support/${uid}`).set({ lastText: m.text, unread: true, at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  const adm = await db.collection('adminTokens').get();
  await Promise.all(adm.docs.map((d) => admin.messaging().send({ token: d.data().token, notification: { title: 'طلب دعم جديد', body: m.text } }).catch(() => {})));
});
