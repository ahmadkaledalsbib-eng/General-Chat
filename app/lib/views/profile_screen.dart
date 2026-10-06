import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:record/record.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _appVersion = '1.0.0';
  final AudioRecorder _audioRecorder = AudioRecorder();
  bool _isRecording = false;

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  void _loadVersion() async {
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    setState(() {
      _appVersion = '${packageInfo.version}+${packageInfo.buildNumber}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('حسابي'), backgroundColor: Colors.transparent),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. تعديل حسابي
          Card(
            child: ListTile(
              leading: const Icon(Icons.manage_accounts),
              title: const Text('تعديل حسابي'),
              subtitle: const Text('تغيير البيانات الشخصية ورقم الهاتف'),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 10),

          // 2. التواصل مع الدعم
          Card(
            child: ListTile(
              leading: const Icon(Icons.support_agent, color: Colors.teal),
              title: const Text('التواصل مع الدعم'),
              subtitle: const Text('محادثة مباشرة مع التنبيه الفوري للوحة الإدارة'),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 10),

          // 3. خيار التوثيق (صوتي + صور)
          Card(
            child: ExpansionTile(
              leading: const Icon(Icons.verified_user, color: Colors.blue),
              title: const Text('توثيق الحساب (KYC)'),
              subtitle: const Text('إرسال المستندات والتسجيل الصوتي'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.upload_file),
                        label: const Text('رفع صورة إثبات الشخصية'),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: Icon(_isRecording ? Icons.stop : Icons.mic, color: Colors.red),
                            onPressed: _toggleRecording,
                          ),
                          Text(_isRecording ? 'جاري التسجيل الصوت...' : 'تسجيل مقطع صوتي للتوثيق'),
                        ],
                      )
                    ],
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 40),

          // 4. رقم إصدار التطبيق (آخر عنصر في الصفحة)
          Center(
            child: Text(
              'رقم إصدار التطبيق: v$_appVersion',
              style: const TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  void _toggleRecording() async {
    if (_isRecording) {
      final path = await _audioRecorder.stop();
      setState(() => _isRecording = false);
      if (mounted && path != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تم حفظ التسجيل في: $path')),
        );
      }
    } else {
      if (await _audioRecorder.hasPermission()) {
        await _audioRecorder.start(const RecordConfig(), path: '');
        setState(() => _isRecording = true);
      }
    }
  }
}
