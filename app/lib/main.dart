import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

const api = String.fromEnvironment('API', defaultValue: 'http://10.0.2.2:3000');
const bg = Color(0xFF0B1240), card = Color(0xFF1A2366), accent = Color(0xFF5B8CFF);
String? token;

// دالة مساعدة لاقتطاع النصوص/التواريخ بأمان بدون Crashes
String safeSubstring(dynamic text, int start, int end) {
  if (text == null) return '';
  final str = text.toString();
  if (str.length <= start) return '';
  if (str.length < end) return str.substring(start);
  return str.substring(start, end);
}

Future<Map<String, dynamic>> call(String path, [Map? body]) async {
  final h = {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token'
  };
  try {
    final r = body == null 
        ? await http.get(Uri.parse('$api$path'), headers: h)
        : await http.post(Uri.parse('$api$path'), headers: h, body: jsonEncode(body));
    final d = jsonDecode(r.body);
    return d is Map<String, dynamic> ? d : {'list': d};
  } catch (_) { 
    return {'error': 'تعذر الاتصال بالخادم'}; 
  }
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

  @override
  void dispose() {
    for (var controller in f.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void>
