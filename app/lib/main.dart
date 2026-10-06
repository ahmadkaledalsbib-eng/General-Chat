import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

const api = String.fromEnvironment('API', defaultValue: 'http://10.0.2.2:3000');
const bg = Color(0xFF0B1240), card = Color(0xFF1A2366), accent = Color(0xFF5B8CFF);
String? token;

String safeSub(dynamic t, int s, int e) {
  if (t == null) return '';
  final str = t.toString();
  if (str.length <= s) return '';
  return str.length < e ? str.substring(s) : str.substring(s, e);
}

Future<Map<String, dynamic>> call(String path, [Map? body]) async {
  final h = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  try {
    final r = body == null
        ? await http.get(Uri.parse('$api$path'), headers: h)
        : await http.post(Uri.parse('$api$path'), headers: h, body: jsonEncode(body));
    final d = jsonDecode(r.body);
    return d is Map ? Map<String, dynamic>.from(d) : {'list': d};
  } catch (_) {
    return {'error': 'تعذر الاتصال بالخادم'};
  }
}

void snack(BuildContext c, String m) =>
    ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(m)));

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  token = (await SharedPreferences.getInstance()).getString('t');
  runApp(MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData.dark().copyWith(scaffoldBackgroundColor: bg),
    builder: (c, w) => Directionality(textDirection: TextDirection.rtl, child: w!),
    home: const Root(),
  ));
}

class Root extends StatelessWidget {
  const Root({super.key});
  @override
  Widget build(BuildContext c) => token == null ? const AuthScreen() : const HomeScreen();
}

// ================= الدخول والتسجيل =================
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool reg = false, busy = false;
  String err = '';
  final f = {for (var k in ['email', 'password', 'confirm', 'fullName', 'region', 'phone', 'username']) k: TextEditingController()};
  final labels = {
    'fullName': 'الاسم الثلاثي', 'username': 'اسم المستخدم', 'email': 'البريد الإلكتروني',
    'phone': 'رقم الهاتف', 'region': 'المنطقة', 'password': 'كلمة المرور', 'confirm': 'تأكيد كلمة المرور'
  };

  @override
  void dispose() {
    for (var c in f.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> submit() async {
    setState(() { busy = true; err = ''; });
    final r = await call(reg ? '/api/register' : '/api/login', {for (var e in f.entries) e.key: e.value.text.trim()});
    if (r['token'] != null) {
      (await SharedPreferences.getInstance()).setString('t', r['token']);
      token = r['token'];
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const Root()));
    } else {
      setState(() { err = r['error'] ?? 'خطأ'; busy = false; });
    }
  }

  @override
  Widget build(BuildContext c) {
    final keys = reg ? labels.keys.toList() : ['email', 'password'];
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(20), children: [
          const SizedBox(height: 30),
          const Center(child: Text('بنك سوريا', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold))),
          const SizedBox(height: 24),
          for (var k in keys)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: TextField(
                controller: f[k],
                obscureText: k == 'password' || k == 'confirm',
                keyboardType: k == 'phone' ? TextInputType.phone : null,
                decoration: InputDecoration(
                  labelText: labels[k], filled: true, fillColor: card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ),
          if (err.isNotEmpty) Padding(padding: const EdgeInsets.all(8), child: Text(err, style: const TextStyle(color: Colors.redAccent))),
          const SizedBox(height: 10),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: accent, foregroundColor: Colors.white),
              onPressed: busy ? null : submit,
              child: Text(reg ? 'إنشاء حساب' : 'تسجيل الدخول'),
            ),
          ),
          TextButton(onPressed: () => setState(() => reg = !reg), child: Text(reg ? 'لدي حساب' : 'إنشاء حساب جديد')),
        ]),
      ),
    );
  }
}

// ================= الرئيسية =================
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;
  Map<String, dynamic>? me;
  List tx = [];

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    final m = await call('/api/me');
    final t = await call('/api/tx');
    if (m['error'] == 'غير مصرح') return logout();
    if (!mounted) return;
    setState(() {
      if (m['error'] == null) me = m;
      tx = (t['list'] as List?) ?? [];
    });
  }

  Future<void> logout() async {
    (await SharedPreferences.getInstance()).remove('t');
    token = null;
    if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const Root()));
  }

  Widget bigBtn(String t, IconData i, Color col, VoidCallback f) => Expanded(
        child: GestureDetector(
          onTap: f,
          child: Container(
            height: 64, margin: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(16)),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(i), const SizedBox(width: 8), Text(t, style: const TextStyle(fontSize: 18)),
            ]),
          ),
        ),
      );

  void txDetails(Map t) {
    final incoming = t['to'] == me?['id'];
    showDialog(
      context: context,
      builder: (d) => AlertDialog(
        title: Text(incoming ? '${t['fromName']}' : '${t['toName']}'),
        content: Text('${incoming ? 'مستلم' : 'مرسل'}: \$${t['amount']}\n'
            'التاريخ: ${safeSub(t['date'], 0, 10)} ${safeSub(t['date'], 11, 16)}\n'
            '${(t['note'] ?? '').toString().isEmpty ? '' : 'ملاحظة: ${t['note']}'}'),
        actions: [TextButton(onPressed: () => Navigator.pop(d), child: const Text('إغلاق'))],
      ),
    );
  }

  Widget txTile(Map t) {
    final incoming = t['to'] == me?['id'];
    return GestureDetector(
      onTap: () => txDetails(t),
      child: Container(
        margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14)),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(incoming ? '${t['fromName']}' : '${t['toName']}'),
          Text('${incoming ? '+' : '-'}\$${t['amount']}',
              style: TextStyle(color: incoming ? Colors.tealAccent : Colors.redAccent)),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext c) {
    final pages = <Widget>[
      RefreshIndicator(
        onRefresh: load,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text('${me?['balance'] ?? 0}', textAlign: TextAlign.end, style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold)),
          const Text('USD', textAlign: TextAlign.end),
          const SizedBox(height: 16),
          Row(children: [
            bigBtn('استقبال', Icons.call_received, const Color(0xFF3B7F7A), () {
              Navigator.push(c, MaterialPageRoute(builder: (_) => ReceiveScreen(me: me ?? {})));
            }),
            bigBtn('إرسال', Icons.call_made, const Color(0xFF6B2B55), () async {
              await Navigator.push(c, MaterialPageRoute(builder: (_) => const SendScreen()));
              load();
            }),
          ]),
          const SizedBox(height: 16),
          const Text('آخر التحويلات', style: TextStyle(fontSize: 18)),
          for (var t in tx.take(10)) txTile(Map.from(t)),
        ]),
      ),
      const Center(child: Text('الخدمات - قريباً')),
      ListView(padding: const EdgeInsets.all(16), children: [for (var t in tx) txTile(Map.from(t))]),
      ListView(padding: const EdgeInsets.all(16), children: [
        const Icon(Icons.account_circle, size: 90),
        Center(child: Text(me?['fullName'] ?? '', style: const TextStyle(fontSize: 20))),
        Center(child: Text('${me?['account'] ?? ''}')),
        const SizedBox(height: 20),
        ListTile(tileColor: card, title: const Text('تسجيل الخروج'), trailing: const Icon(Icons.logout), onTap: logout),
        const SizedBox(height: 40),
        const Center(child: Text('رقم الإصدار v1.0.0', style: TextStyle(color: Colors.white54))),
      ]),
    ];
    return Scaffold(
      appBar: AppBar(backgroundColor: bg, elevation: 0, title: const Text('بنك سوريا')),
      body: pages[tab],
      bottomNavigationBar: NavigationBar(
        backgroundColor: card, selectedIndex: tab,
        onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'الرئيسية'),
          NavigationDestination(icon: Icon(Icons.credit_card), label: 'الخدمات'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'التحويلات'),
          NavigationDestination(icon: Icon(Icons.person), label: 'حسابي'),
        ],
      ),
    );
  }
}

// ================= الاستقبال (باركود حسابي) =================
class ReceiveScreen extends StatelessWidget {
  final Map me;
  const ReceiveScreen({super.key, required this.me});
  @override
  Widget build(BuildContext c) {
    final acc = '${me['account'] ?? ''}';
    return Scaffold(
      appBar: AppBar(backgroundColor: bg, title: const Text('استقبال')),
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          QrImageView(data: acc, size: 240, backgroundColor: Colors.white, padding: const EdgeInsets.all(12)),
          const SizedBox(height: 20),
          SelectableText(acc, style: const TextStyle(fontSize: 20)),
          Text('@${me['username'] ?? ''}'),
          const SizedBox(height: 10),
          IconButton(
            icon: const Icon(Icons.copy),
            onPressed: () { Clipboard.setData(ClipboardData(text: acc)); snack(c, 'تم النسخ'); },
          ),
        ]),
      ),
    );
  }
}

// ================= الإرسال =================
Future<bool> sendMoney(BuildContext context, String key) async {
  final amt = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (d) => AlertDialog(
      title: Text('إرسال إلى $key'),
      content: TextField(
        controller: amt,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: const InputDecoration(labelText: 'المبلغ (USD)'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('إلغاء')),
        TextButton(onPressed: () => Navigator.pop(d, true), child: const Text('إرسال')),
      ],
    ),
  );
  if (ok != true) return false;
  final r = await call('/api/send', {'to': key, 'amount': amt.text});
  if (context.mounted) snack(context, r['error'] ?? 'تم الإرسال بنجاح');
  return r['error'] == null;
}

class SendScreen extends StatefulWidget {
  const SendScreen({super.key});
  @override
  State<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends State<SendScreen> {
  List<Map<String, dynamic>> favs = [];
  final acc = TextEditingController();

  @override
  void initState() { super.initState(); loadFavs(); }

  Future<void> loadFavs() async {
    final raw = (await SharedPreferences.getInstance()).getString('favs');
    if (!mounted) return;
    setState(() => favs = raw == null ? [] : List<Map<String, dynamic>>.from((jsonDecode(raw) as List).map((e) => Map<String, dynamic>.from(e))));
  }

  Future<void> saveFavs() async =>
      (await SharedPreferences.getInstance()).setString('favs', jsonEncode(favs));

  Future<void> addFav(String key) async {
    if (key.isEmpty || favs.any((f) => f['key'] == key)) return;
    setState(() => favs.add({'name': key, 'key': key}));
    await saveFavs();
    if (mounted) snack(context, 'أضيف إلى المفضلة');
  }

  Future<void> scanCamera() async {
    final code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const ScanScreen()));
    if (code != null && mounted) {
      acc.text = code;
      final done = await sendMoney(context, code);
      if (done && mounted) Navigator.pop(context);
    }
  }

  Future<void> scanImage() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (x == null) return;
    final ctrl = MobileScannerController();
    final res = await ctrl.analyzeImage(x.path);
    await ctrl.dispose();
    final code = (res != null && res.barcodes.isNotEmpty) ? res.barcodes.first.rawValue : null;
    if (!mounted) return;
    if (code == null) return snack(context, 'لم يتم العثور على باركود في الصورة');
    acc.text = code;
    final done = await sendMoney(context, code);
    if (done && mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext c) {
    return Scaffold(
      appBar: AppBar(backgroundColor: bg, title: const Text('إرسال')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('المفضلة', style: TextStyle(fontSize: 18)),
        if (favs.isEmpty) const Padding(padding: EdgeInsets.all(12), child: Text('لا توجد حسابات مفضلة بعد', style: TextStyle(color: Colors.white54))),
        for (var f in favs)
          ListTile(
            tileColor: card,
            title: Text('${f['name']}'),
            subtitle: Text('${f['key']}'),
            onTap: () async {
              final done = await sendMoney(c, '${f['key']}');
              if (done && mounted) Navigator.pop(c);
            },
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () async { setState(() => favs.remove(f)); await saveFavs(); },
            ),
          ),
        const Divider(height: 32),
        TextField(
          controller: acc,
          decoration: InputDecoration(
            labelText: 'رقم الحساب أو اسم المستخدم', filled: true, fillColor: card,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: accent, foregroundColor: Colors.white),
              onPressed: () async {
                if (acc.text.trim().isEmpty) return;
                final done = await sendMoney(c, acc.text.trim());
                if (done && mounted) Navigator.pop(c);
              },
              child: const Text('متابعة'),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(onPressed: () => addFav(acc.text.trim()), child: const Text('إضافة للمفضلة')),
        ]),
        const SizedBox(height: 24),
        ListTile(tileColor: card, leading: const Icon(Icons.qr_code_scanner), title: const Text('مسح باركود بالكاميرا'), onTap: scanCamera),
        const SizedBox(height: 8),
        ListTile(tileColor: card, leading: const Icon(Icons.image), title: const Text('اختيار صورة باركود من الاستوديو'), onTap: scanImage),
      ]),
    );
  }
}

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final ctrl = MobileScannerController();
  bool done = false;

  @override
  void dispose() { ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(backgroundColor: bg, title: const Text('مسح رمز QR')),
        body: MobileScanner(
          controller: ctrl,
          onDetect: (cap) {
            if (done || cap.barcodes.isEmpty) return;
            final v = cap.barcodes.first.rawValue;
            if (v == null || v.isEmpty) return;
            done = true;
            Navigator.pop(c, v);
          },
        ),
      );
}
