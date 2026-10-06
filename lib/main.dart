import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const api = String.fromEnvironment('API', defaultValue: 'http://10.0.2.2:3000');
const bg = Color(0xFF0B1240), card = Color(0xFF1A2366), accent = Color(0xFF5B8CFF);
String? token;

Future<Map> call(String path, [Map? body]) async {
  final h = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  try {
    final r = body == null ? await http.get(Uri.parse('$api$path'), headers: h)
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
  Widget build(BuildContext c) => Directionality(textDirection: TextDirection.rtl,
      child: Theme(data: ThemeData.dark().copyWith(scaffoldBackgroundColor: bg),
          child: token == null ? const Auth() : const Home()));
}

class Auth extends StatefulWidget { const Auth({super.key}); @override State<Auth> createState() => _A(); }
class _A extends State<Auth> {
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
    return Scaffold(body: SafeArea(child: ListView(padding: const EdgeInsets.all(20), children: [
      const SizedBox(height: 30), const Center(child: Text('بنك سوريا', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold))),
      const SizedBox(height: 24),
      for (var k in keys) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: TextField(
        controller: f[k], obscureText: k == 'password' || k == 'confirm',
        keyboardType: k == 'phone' ? TextInputType.phone : null,
        decoration: InputDecoration(labelText: labels[k] ?? (k == 'email' ? 'البريد الإلكتروني' : 'كلمة المرور'), filled: true, fillColor: card,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none)))),
      if (err.isNotEmpty) Padding(padding: const EdgeInsets.all(8), child: Text(err, style: const TextStyle(color: Colors.redAccent))),
      const SizedBox(height: 10),
      SizedBox(height: 50, child: ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: accent, foregroundColor: Colors.white),
        onPressed: busy ? null : submit, child: Text(reg ? 'إنشاء حساب' : 'تسجيل الدخول'))),
      TextButton(onPressed: () => setState(() => reg = !reg), child: Text(reg ? 'لدي حساب' : 'إنشاء حساب جديد')),
    ])));
  }
}

class Home extends StatefulWidget { const Home({super.key}); @override State<Home> createState() => _H(); }
class _H extends State<Home> {
  int tab = 0; Map? me; List tx = [];
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    final m = await call('/api/me'); final t = await call('/api/tx');
    if (m['error'] != null) return logout();
    setState(() { me = m; tx = t['list'] ?? []; });
  }
  Future<void> logout() async {
    (await SharedPreferences.getInstance()).remove('t'); token = null;
    if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const Root()));
  }
  Widget btn(String t, IconData i, Color col, VoidCallback f) => Expanded(child: GestureDetector(onTap: f, child: Container(
    height: 64, margin: const EdgeInsets.all(6), decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(16)),
    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(i), const SizedBox(width: 8), Text(t, style: const TextStyle(fontSize: 18))]))));
  void send() {
    final to = TextEditingController(), amt = TextEditingController();
    showDialog(context: context, builder: (_) => Directionality(textDirection: TextDirection.rtl, child: AlertDialog(
      title: const Text('إرسال'), content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: to, decoration: const InputDecoration(labelText: 'اسم المستخدم أو رقم الحساب')),
        TextField(controller: amt, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ (USD)'))]),
      actions: [TextButton(onPressed: () async {
        final r = await call('/api/send', {'to': to.text, 'amount': amt.text});
        if (!mounted) return; Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['error'] ?? 'تم الإرسال'))); load();
      }, child: const Text('إرسال'))])));
  }
  @override
  Widget build(BuildContext c) {
    final pages = [
      ListView(padding: const EdgeInsets.all(16), children: [
        Text('${me?['balance'] ?? 0}', textAlign: TextAlign.end, style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold)),
        const Text('USD', textAlign: TextAlign.end),
        const SizedBox(height: 16),
        Row(children: [btn('استقبال', Icons.call_received, const Color(0xFF3B7F7A), () => showDialog(context: context, builder: (_) => AlertDialog(
          title: const Text('رقم حسابك'), content: SelectableText('${me?['account']}\n@${me?['username']}')))),
          btn('إرسال', Icons.call_made, const Color(0xFF6B2B55), send)]),
        const SizedBox(height: 16), const Text('آخر التحويلات', style: TextStyle(fontSize: 18)),
        for (var t in tx) Container(margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(t['to'] == me?['id'] ? t['fromName'] : t['toName']),
            Text('${t['to'] == me?['id'] ? '+' : '-'}\$${t['amount']}', style: TextStyle(color: t['to'] == me?['id'] ? Colors.tealAccent : Colors.redAccent))])),
      ]),
      const Center(child: Text('الخدمات - قريباً')),
      ListView(children: [for (var t in tx) ListTile(title: Text('${t['fromName']} ← ${t['toName']}'), subtitle: Text('${t['date']}'.substring(0, 16)), trailing: Text('\$${t['amount']}'))]),
      ListView(padding: const EdgeInsets.all(16), children: [
        const Icon(Icons.account_circle, size: 90), Center(child: Text(me?['fullName'] ?? '', style: const TextStyle(fontSize: 20))),
        Center(child: Text('${me?['account']}')), const SizedBox(height: 20),
        ListTile(tileColor: card, title: const Text('تسجيل الخروج'), trailing: const Icon(Icons.logout), onTap: logout)]),
    ];
    return Scaffold(appBar: AppBar(backgroundColor: bg, elevation: 0, title: const Text('بنك سوريا')),
      body: pages[tab], bottomNavigationBar: NavigationBar(backgroundColor: card, selectedIndex: tab, onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [NavigationDestination(icon: Icon(Icons.home), label: 'الرئيسية'), NavigationDestination(icon: Icon(Icons.credit_card), label: 'الخدمات'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'التحويلات'), NavigationDestination(icon: Icon(Icons.person), label: 'حسابي')]));
  }
}
