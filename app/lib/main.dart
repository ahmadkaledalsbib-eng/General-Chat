import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'screens/send_screen.dart';
import 'screens/receive_screen.dart';
import 'services/push_service.dart';

@pragma('vm:entry-point')
Future<void> bgHandler(msg) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await PushService.init(bgHandler);
  runApp(MaterialApp(
    debugShowCheckedModeBanner: false,
    builder: (c, w) => Directionality(textDirection: TextDirection.rtl, child: w!),
    home: const Home(),
  ));
}

class Home extends StatelessWidget {
  const Home({super.key});
  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('محفظتي')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            FilledButton(
              onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const SendScreen())),
              child: const Text('إرسال'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const ReceiveScreen())),
              child: const Text('استقبال'),
            ),
          ]),
        ),
      );
}
