import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'services/update_service.dart';
import 'views/send_screen.dart';
import 'views/receive_screen.dart';
import 'views/profile_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MainBankApp());
}

class MainBankApp extends StatelessWidget {
  const MainBankApp({super.key});

  @override
  Widget build(BuildContext context) {
    // البث المباشر لإعدادات اللوحة (الثيم واسم التطبيق)
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('app_config').doc('global').snapshots(),
      builder: (context, snapshot) {
        Color primaryColor = const Color(0xFF1E1B4B); // لون افتراضي
        String appTitle = 'بنك سوريا';

        if (snapshot.hasData && snapshot.data!.exists) {
          var data = snapshot.data!.data() as Map<String, dynamic>;
          if (data['primary_color'] != null) {
            primaryColor = Color(int.parse(data['primary_color'].replaceAll('#', '0xff')));
          }
          if (data['app_name'] != null) {
            appTitle = data['app_name'];
          }
        }

        return MaterialApp(
          title: appTitle,
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            primaryColor: primaryColor,
            scaffoldBackgroundColor: primaryColor,
            colorScheme: ColorScheme.fromSeed(seedColor: primaryColor),
            useMaterial3: true,
          ),
          home: HomeScreen(title: appTitle),
        );
      },
    );
  }
}

class HomeScreen extends StatefulWidget {
  final String title;
  const HomeScreen({super.key, required this.title});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // فحص التحديثات عند فتح التطبيق
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpdateService.checkForUpdates(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      _buildMainDashboard(),
      const SendScreen(),
      const ReceiveScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, style: const TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.tealAccent,
        unselectedItemColor: Colors.white60,
        backgroundColor: Theme.of(context).primaryColor,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'الرئيسية'),
          BottomNavigationBarItem(icon: Icon(Icons.send), label: 'إرسال'),
          BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner), label: 'استقبال'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'حسابي'),
        ],
      ),
    );
  }

  Widget _buildMainDashboard() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('0', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white)),
          const Text('USD', style: TextStyle(color: Colors.white70)),
          const SizedBox(height: 30),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton.icon(
                onPressed: () => setState(() => _currentIndex = 1),
                icon: const Icon(Icons.arrow_upward),
                label: const Text('إرسال'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.purple.shade700, foregroundColor: Colors.white),
              ),
              const SizedBox(width: 20),
              ElevatedButton.icon(
                onPressed: () => setState(() => _currentIndex = 2),
                icon: const Icon(Icons.arrow_downward),
                label: const Text('استقبال'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.teal.shade700, foregroundColor: Colors.white),
              ),
            ],
          )
        ],
      ),
    );
  }
}
