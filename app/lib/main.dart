import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

const api = String.fromEnvironment('API', defaultValue: 'http://10.0.2.2:3000');
const bg = Color(0xFF0B1240), card = Color(0xFF1A2366), accent = Color(0xFF5B8CFF);
String? token;

Future<Map> call(String path, [Map? body]) async {
  final h = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  try {
    final r = body == null 
        ? await http.get(Uri.parse('$api$path'), headers: h)
        : await http.post(Uri.parse('$api$path'), headers: h, body: jsonEncode(body));
    final d = jsonDecode(r.body);
    return d is Map ? d : {'list': d};
  } catch (_) { return {'error': 'تعذر الاتصال بالخادم'}; }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  token = (await SharedPreferences.getInstance()).getString('t');
  runApp(const MaterialApp(debugShowCheckedModeBanner: false, home: Root()));
}

class Root extends StatelessWidget {
  const Root({super.key});
  @override
  Widget build(BuildContext c) => Directionality(
    textDirection: TextDirection.rtl,
    child: Theme(
      data: ThemeData.dark().copyWith(scaffoldBackgroundColor: bg),
      child: token == null ? const AuthScreen() : const HomeScreen(),
    ),
  );
}

// === شاشات الدخول والتسجيل ===
class AuthScreen extends StatefulWidget { const AuthScreen({super.key}); @override State<AuthScreen> createState() => _AuthScreenState(); }
class _AuthScreenState extends State<AuthScreen> {
  bool reg = false; String err = ''; bool busy = false;
  final f = {for (var k in ['email','password','confirm','fullName','region','phone','username']) k: TextEditingController()};
  final labels = {'fullName':'الاسم الثلاثي','username':'اسم المستخدم','email':'البريد الإلكتروني','phone':'رقم الهاتف','region':'المنطقة','password':'كلمة المرور','confirm':'تأكيد كلمة المرور'};

  Future<void> submit() async {
    setState(() { busy = true; err = ''; });
    final r = await call(reg ? '/api/register' : '/api/login', {for (var e in f.entries) e.key: e.value.text.trim()});
    if (r['token'] != null) {
      (await SharedPreferences.getInstance()).setString('t', r['token']); token = r['token'];
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const Root()));
    } else { setState(() { err = r['error'] ?? 'خطأ'; busy = false; }); }
  }

  @override
  Widget build(BuildContext c) {
    final keys = reg ? labels.keys.toList() : ['email','password'];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 20),
            const Center(child: Text('بنك سوريا', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: accent))),
            const SizedBox(height: 20),
            for (var k in keys) Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: TextField(
                controller: f[k], obscureText: k == 'password' || k == 'confirm',
                keyboardType: k == 'phone' ? TextInputType.phone : null,
                decoration: InputDecoration(
                  labelText: labels[k] ?? '', filled: true, fillColor: card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none)
                )
              )
            ),
            if (err.isNotEmpty) Padding(padding: const EdgeInsets.all(8), child: Text(err, style: const TextStyle(color: Colors.redAccent))),
            const SizedBox(height: 10),
            SizedBox(height: 50, child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: accent, foregroundColor: Colors.white),
              onPressed: busy ? null : submit, child: Text(reg ? 'إنشاء حساب' : 'تسجيل الدخول')
            )),
            TextButton(onPressed: () => setState(() => reg = !reg), child: Text(reg ? 'لدي حساب بالفعل' : 'إنشاء حساب جديد')),
          ]
        )
      )
    );
  }
}

// === الشاشة الرئيسية والتنقل ===
class HomeScreen extends StatefulWidget { const HomeScreen({super.key}); @override State<HomeScreen> createState() => _HomeScreenState(); }
class _HomeScreenState extends State<HomeScreen> {
  int tab = 0; Map? me; List tx = []; Map rates = {};
  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    final m = await call('/api/me');
    final t = await call('/api/tx');
    final r = await call('/api/rates');
    if (m['error'] != null) return logout();
    setState(() { me = m; tx = t['list'] ?? []; rates = r; });
  }

  Future<void> logout() async {
    (await SharedPreferences.getInstance()).remove('t'); token = null;
    if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const Root()));
  }

  @override
  Widget build(BuildContext c) {
    final pages = [
      HomeTab(me: me, tx: tx, onRefresh: load, onOpenUserDetail: (u) => Navigator.push(context, MaterialPageRoute(builder: (_) => UserDetailScreen(accountQuery: u)))),
      ExchangeTab(me: me, rates: rates, onExchange: load),
      TransactionsTab(tx: tx, me: me, onOpenUserDetail: (u) => Navigator.push(context, MaterialPageRoute(builder: (_) => UserDetailScreen(accountQuery: u)))),
      ProfileTab(me: me, onRefresh: load, onLogout: logout),
    ];

    return Scaffold(
      appBar: AppBar(backgroundColor: bg, elevation: 0, title: const Text('بنك سوريا'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: load)
      ]),
      body: pages[tab],
      bottomNavigationBar: NavigationBar(
        backgroundColor: card, selectedIndex: tab, onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'الرئيسية'),
          NavigationDestination(icon: Icon(Icons.currency_exchange), label: 'الصرف'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'التحويلات'),
          NavigationDestination(icon: Icon(Icons.person), label: 'حسابي'),
        ]
      )
    );
  }
}

// === Tab 1: الرئيسية ===
class HomeTab extends StatelessWidget {
  final Map? me; final List tx; final VoidCallback onRefresh; final Function(String) onOpenUserDetail;
  const HomeTab({super.key, required this.me, required this.tx, required this.onRefresh, required this.onOpenUserDetail});

  @override
  Widget build(BuildContext context) {
    final balances = me?['balances'] ?? {};
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // كرت الأرصدة المتعددة
        Container(
          padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('الأرصدة المتاحة', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('\$${balances['USD'] ?? 0}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.greenAccent)),
              Text('${balances['SYP'] ?? 0} ل.س', style: const TextStyle(fontSize: 18, color: Colors.amberAccent)),
            ]),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('${balances['TRY'] ?? 0} TL', style: const TextStyle(fontSize: 18, color: Colors.lightBlueAccent)),
              Text('€${balances['EUR'] ?? 0}', style: const TextStyle(fontSize: 18, color: Colors.purpleAccent)),
            ]),
          ])
        ),
        const SizedBox(height: 16),
        // أزرار الإرسال والاستقبال
        Row(children: [
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7F7A), padding: const EdgeInsets.all(14)),
              icon: const Icon(Icons.call_received), label: const Text('استقبال'),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReceiveScreen(me: me))),
            )
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6B2B55), padding: const EdgeInsets.all(14)),
              icon: const Icon(Icons.call_made), label: const Text('إرسال'),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SendScreen(me: me, onSent: onRefresh))),
            )
          ),
        ]),
        const SizedBox(height: 20),
        const Text('آخر التحويلات', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        for (var t in tx.take(10))
          GestureDetector(
            onTap: () {
              final otherId = t['from'] == me?['id'] ? t['to'] : t['from'];
              onOpenUserDetail(otherId);
            },
            child: Container(
              margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(12)),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(children: [
                  const Icon(Icons.account_circle, size: 36, color: accent),
                  const SizedBox(width: 8),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(t['to'] == me?['id'] ? t['fromName'] : t['toName'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(t['date'].toString().substring(0, 10), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ])
                ]),
                Text(
                  '${t['to'] == me?['id'] ? '+' : '-'}${t['amount']} ${t['currency'] ?? 'USD'}',
                  style: TextStyle(color: t['to'] == me?['id'] ? Colors.tealAccent : Colors.redAccent, fontWeight: FontWeight.bold)
                )
              ])
            )
          )
      ]
    );
  }
}

// === 1. شاشة الإرسال (3 خيارات: المفضلة - يدوياً - كاميرا) ===
class SendScreen extends StatefulWidget {
  final Map? me; final VoidCallback onSent;
  const SendScreen({super.key, required this.me, required this.onSent});
  @override State<SendScreen> createState() => _SendScreenState();
}
class _SendScreenState extends State<SendScreen> {
  int sendType = 0; // 0: المفضلة, 1: يدوياً, 2: الكاميرا
  final toCtrl = TextEditingController(), amtCtrl = TextEditingController();
  String selectedCurr = 'USD';

  @override
  Widget build(BuildContext context) {
    final favorites = (widget.me?['favorites'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('إرسال أموال')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            ChoiceChip(label: const Text('المفضلة'), selected: sendType == 0, onSelected: (_) => setState(() => sendType = 0)),
            ChoiceChip(label: const Text('إدخال يدوي'), selected: sendType == 1, onSelected: (_) => setState(() => sendType = 1)),
            ChoiceChip(label: const Text('مسح Barcode'), selected: sendType == 2, onSelected: (_) => setState(() => sendType = 2)),
          ]),
          const SizedBox(height: 20),

          if (sendType == 0) ...[
            const Text('اختر حساباً من المفضلة:', style: TextStyle(fontWeight: FontWeight.bold)),
            if (favorites.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('لا يوجد حسابات مضافة للمفضلة بعد')),
            for (var f in favorites)
              ListTile(
                tileColor: card, title: Text(f.toString()), trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () => setState(() { toCtrl.text = f.toString(); sendType = 1; }),
              ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              icon: const Icon(Icons.add), label: const Text('إضافة حساب جديد للمفضلة'),
              onPressed: () {
                final favCtrl = TextEditingController();
                showDialog(context: context, builder: (_) => AlertDialog(
                  title: const Text('إضافة للمفضلة'),
                  content: TextField(controller: favCtrl, decoration: const InputDecoration(labelText: 'رقم الحساب أو اسم المستخدم')),
                  actions: [
                    TextButton(onPressed: () async {
                      await call('/api/me/favorites/add', {'targetAccount': favCtrl.text.trim()});
                      if (context.mounted) Navigator.pop(context);
                      widget.onSent();
                    }, child: const Text('حفظ'))
                  ]
                ));
              }
            )
          ],

          if (sendType == 1) ...[
            TextField(controller: toCtrl, decoration: const InputDecoration(labelText: 'اسم المستخدم أو رقم الحساب', filled: true, fillColor: card)),
            const SizedBox(height: 12),
            TextField(controller: amtCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ', filled: true, fillColor: card)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: selectedCurr,
              decoration: const InputDecoration(labelText: 'العملة', filled: true, fillColor: card),
              items: ['USD', 'SYP', 'TRY', 'EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => selectedCurr = v!),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.all(14)),
              onPressed: () async {
                final r = await call('/api/send', {'to': toCtrl.text.trim(), 'amount': amtCtrl.text.trim(), 'currency': selectedCurr});
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['error'] ?? 'تم إرسال المبلغ بنجاح')));
                if (r['ok'] == true) { widget.onSent(); Navigator.pop(context); }
              },
              child: const Text('إرسال الآن')
            )
          ],

          if (sendType == 2) ...[
            SizedBox(
              height: 300,
              child: MobileScanner(
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  for (final barcode in barcodes) {
                    if (barcode.rawValue != null) {
                      setState(() {
                        toCtrl.text = barcode.rawValue!;
                        sendType = 1;
                      });
                      break;
                    }
                  }
                },
              ),
            ),
            const SizedBox(height: 8),
            const Center(child: Text('وجه الكاميرا نحو باركود المستلم'))
          ]
        ],
      )
    );
  }
}

// === 2. شاشة الاستقبال (QR Code) ===
class ReceiveScreen extends StatelessWidget {
  final Map? me;
  const ReceiveScreen({super.key, required this.me});

  @override
  Widget build(BuildContext context) {
    final acc = me?['account'] ?? me?['username'] ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('استقبال أموال')),
      body: Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: QrImageView(data: acc, version: QrVersions.auto, size: 220.0),
          ),
          const SizedBox(height: 20),
          Text(me?['fullName'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SelectableText('رقم الحساب: $acc', style: const TextStyle(fontSize: 16, color: accent)),
          const SizedBox(height: 12),
          const Text('امسح الباركود أعلاه للإرسال المباشر لهذا الحساب', style: TextStyle(color: Colors.grey))
        ])
      )
    );
  }
}

// === 3. صفحة تفاصيل المرسل/المستقبل ===
class UserDetailScreen extends StatefulWidget {
  final String accountQuery;
  const UserDetailScreen({super.key, required this.accountQuery});
  @override State<UserDetailScreen> createState() => _UserDetailScreenState();
}
class _UserDetailScreenState extends State<UserDetailScreen> {
  Map? details; bool loading = true;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    final r = await call('/api/user-details/${widget.accountQuery}');
    setState(() { details = r; loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (details?['error'] != null) return Scaffold(appBar: AppBar(), body: Center(child: Text(details!['error'])));

    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل الحساب')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
          const Icon(Icons.account_circle, size: 100, color: accent),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(details?['fullName'] ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            if (details?['isVerified'] == true) ...[
              const SizedBox(width: 6),
              const Icon(Icons.verified, color: Colors.blueAccent, size: 22)
            ]
          ]),
          Text('@${details?['username']}'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('تاريخ إنشاء الحساب:'),
                Text(details?['createdAt'].toString().substring(0, 10) ?? '')
              ]),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('حالة التوثيق:'),
                Text(details?['isVerified'] == true ? 'موثق رسمياً' : 'غير موثق',
                     style: TextStyle(color: details?['isVerified'] == true ? Colors.greenAccent : Colors.amberAccent))
              ])
            ])
          ),
          const SizedBox(height: 24),
          Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.send), label: const Text('إرسال مباشر'),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SendScreen(me: null, onSent: (){}))),
              )
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.star), label: const Text('إضافة للمفضلة'),
                onPressed: () async {
                  await call('/api/me/favorites/add', {'targetAccount': details?['account']});
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تمت الإضافة للمفضلة')));
                },
              )
            )
          ])
        ])
      )
    );
  }
}

// === Tab 2: الصرف والتحويل بين العملات ===
class ExchangeTab extends StatefulWidget {
  final Map? me; final Map rates; final VoidCallback onExchange;
  const ExchangeTab({super.key, required this.me, required this.rates, required this.onExchange});
  @override State<ExchangeTab> createState() => _ExchangeTabState();
}
class _ExchangeTabState extends State<ExchangeTab> {
  String from = 'USD', to = 'SYP';
  final amtCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('تصريف وتحويل العملات الداخلي', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: from, decoration: const InputDecoration(labelText: 'من عملة', filled: true, fillColor: card),
              items: ['USD','SYP','TRY','EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => from = v!),
            )
          ),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Icon(Icons.swap_horiz)),
          Expanded(
            child: DropdownButtonFormField<String>(
              value: to, decoration: const InputDecoration(labelText: 'إلى عملة', filled: true, fillColor: card),
              items: ['USD','SYP','TRY','EUR'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => to = v!),
            )
          ),
        ]),
        const SizedBox(height: 16),
        TextField(controller: amtCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ المراد تحويله', filled: true, fillColor: card)),
        const SizedBox(height: 20),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.all(14)),
          onPressed: () async {
            final r = await call('/api/exchange', {'fromCurr': from, 'toCurr': to, 'amount': amtCtrl.text.trim()});
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['error'] ?? 'تم تصريف العملة بنجاح')));
            if (r['ok'] == true) widget.onExchange();
          },
          child: const Text('تأكيد التحويل الآن')
        )
      ]
    );
  }
}

// === Tab 3: قائمة كافة التحويلات ===
class TransactionsTab extends StatelessWidget {
  final List tx; final Map? me; final Function(String) onOpenUserDetail;
  const TransactionsTab({super.key, required this.tx, required this.me, required this.onOpenUserDetail});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('سجل كافة التحويلات', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        for (var t in tx)
          ListTile(
            tileColor: card,
            title: Text('${t['fromName']} ← ${t['toName']}'),
            subtitle: Text('${t['date']}'.substring(0, 16)),
            trailing: Text('${t['amount']} ${t['currency']??'USD'}', style: const TextStyle(fontWeight: FontWeight.bold)),
            onTap: () {
              final otherId = t['from'] == me?['id'] ? t['to'] : t['from'];
              onOpenUserDetail(otherId);
            },
          )
      ]
    );
  }
}

// === 5. Tab 4: صفحة "حسابي" بالترتيب المحدد تماماً ===
class ProfileTab extends StatefulWidget {
  final Map? me; final VoidCallback onRefresh; final VoidCallback onLogout;
  const ProfileTab({super.key, required this.me, required this.onRefresh, required this.onLogout});
  @override State<ProfileTab> createState() => _ProfileTabState();
}
class _ProfileTabState extends State<ProfileTab> {
  @override
  Widget build(BuildContext context) {
    final userFrozen = widget.me?['userFrozen'] == true;
    final isVerified = widget.me?['isVerified'] == true;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // الهيدر
        Center(
          child: Column(children: [
            const Icon(Icons.account_circle, size: 80, color: accent),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(widget.me?['fullName'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              if (isVerified) const Icon(Icons.verified, color: Colors.blueAccent, size: 20),
            ]),
            Text('حساب: ${widget.me?['account']}'),
          ])
        ),
        const SizedBox(height: 24),

        // 1. تعديل حسابي
        ListTile(
          tileColor: card, leading: const Icon(Icons.edit), title: const Text('تعديل حسابي'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: () {
            final nameCtrl = TextEditingController(text: widget.me?['fullName']);
            final phoneCtrl = TextEditingController(text: widget.me?['phone']);
            showDialog(context: context, builder: (_) => AlertDialog(
              title: const Text('تعديل البيانات Personal Data'),
              content: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'الاسم الثلاثي')),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'رقم الهاتف')),
              ]),
              actions: [
                TextButton(onPressed: () async {
                  await call('/api/me/update', {'fullName': nameCtrl.text, 'phone': phoneCtrl.text});
                  if (context.mounted) Navigator.pop(context);
                  widget.onRefresh();
                }, child: const Text('حفظ'))
              ]
            ));
          },
        ),
        const SizedBox(height: 8),

        // 2. التواصل مع الدعم الفني
        ListTile(
          tileColor: card, leading: const Icon(Icons.support_agent), title: const Text('التواصل مع الدعم'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportChatScreen())),
        ),
        const SizedBox(height: 8),

        // 3. خيار التوثيق
        ListTile(
          tileColor: card, leading: const Icon(Icons.verified_user), title: const Text('خيار التوثيق'),
          subtitle: Text(isVerified ? 'الحساب موثق' : 'طلب التوثيق من الإدارة'),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: () {
            final noteCtrl = TextEditingController();
            showDialog(context: context, builder: (_) => AlertDialog(
              title: const Text('تقديم طلب توثيق الهوية'),
              content: TextField(controller: noteCtrl, decoration: const InputDecoration(labelText: 'ملاحظات / بيانات الهوية')),
              actions: [
                TextButton(onPressed: () async {
                  await call('/api/me/verify', {'note': noteCtrl.text});
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم إرسال طلب التوثيق للمراجعة')));
                  }
                }, child: const Text('إرسال الطلب'))
              ]
            ));
          },
        ),
        const SizedBox(height: 8),

        // 6. تفعيل / تعطيل الحساب (مؤقتاً من قبل المستخدم)
        SwitchListTile(
          tileColor: card,
          title: const Text('تجميد الحساب مؤقتاً'),
          subtitle: const Text('إيقاف كافة العمليات المالية بحسابك مؤقتاً'),
          value: userFrozen,
          onChanged: (v) async {
            await call('/api/me/toggle-freeze');
            widget.onRefresh();
          },
        ),
        const SizedBox(height: 12),

        ListTile(
          tileColor: card, leading: const Icon(Icons.logout, color: Colors.redAccent),
          title: const Text('تسجيل الخروج', style: TextStyle(color: Colors.redAccent)),
          onTap: widget.onLogout,
        ),
        const SizedBox(height: 24),

        // رقم إصدار التطبيق (آخر عنصر في الصفحة)
        const Center(
          child: Text('رقم إصدار التطبيق: v1.0.0', style: TextStyle(color: Colors.grey, fontSize: 13)),
        ),
      ]
    );
  }
}

// === شاشة الدعم الفني ===
class SupportChatScreen extends StatefulWidget { const SupportChatScreen({super.key}); @override State<SupportChatScreen> createState() => _SupportChatScreenState(); }
class _SupportChatScreenState extends State<SupportChatScreen> {
  List msgs = []; final msgCtrl = TextEditingController();
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    final r = await call('/api/support');
    setState(() { msgs = r is List ? List<dynamic>.from(r) : []; });
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الدعم الفني المباشر')),
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (var m in msgs)
                Align(
                  alignment: m['sender'] == 'user' ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4), padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: m['sender'] == 'user' ? card : accent, borderRadius: BorderRadius.circular(12)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(m['text'] ?? ''),
                      Text(m['date'].toString().substring(11, 16), style: const TextStyle(fontSize: 10, color: Colors.white70)),
                    ])
                  )
                )
            ]
          )
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(children: [
            Expanded(child: TextField(controller: msgCtrl, decoration: const InputDecoration(hintText: 'اكتب رسالتك...', filled: true, fillColor: card))),
            IconButton(icon: const Icon(Icons.send, color: accent), onPressed: () async {
              if (msgCtrl.text.isEmpty) return;
              await call('/api/support', {'text': msgCtrl.text.trim()});
              msgCtrl.clear(); load();
            })
          ])
        )
      ])
    );
  }
}
