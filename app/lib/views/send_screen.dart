import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class SendScreen extends StatelessWidget {
  const SendScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('إرسال أموال'), backgroundColor: Colors.transparent),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.star, color: Colors.amber),
              title: const Text('المفضلة', style: TextStyle(color: Colors.white)),
              subtitle: const Text('اختيار من القائمة أو إضافة حساب جديد', style: TextStyle(color: Colors.white60)),
              onTap: () => _showFavoritesModal(context),
            ),
            const Divider(color: Colors.white24),
            ListTile(
              leading: const Icon(Icons.edit, color: Colors.blue),
              title: const Text('إدخال رقم الحساب يدوياً', style: TextStyle(color: Colors.white)),
              onTap: () => _showManualInputDialog(context),
            ),
            const Divider(color: Colors.white24),
            ListTile(
              leading: const Icon(Icons.qr_code_scanner, color: Colors.green),
              title: const Text('الكاميرا / مسح الباركود', style: TextStyle(color: Colors.white)),
              onTap: () => _openQRScanner(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showFavoritesModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('قائمة المفضلة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.person_add),
                  onPressed: () {
                    // إضافة حساب جديد للمفضلة
                  },
                )
              ],
            ),
            Expanded(
              child: ListView(
                children: const [
                  ListTile(title: Text('أحمد المحمد'), subtitle: Text('ACC-100234')),
                  ListTile(title: Text('خالد العلي'), subtitle: Text('ACC-100889')),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  void _showManualInputDialog(BuildContext context) {
    TextEditingController controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إدخال رقم الحساب'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'أدخل رقم الحساب هنا'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
          ElevatedButton(onPressed: () {}, child: const Text('متابعة')),
        ],
      ),
    );
  }

  void _openQRScanner(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('مسح الباركود')),
          body: MobileScanner(
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  String scannedAcc = barcode.rawValue!;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('تم العثور على الحساب: $scannedAcc')),
                  );
                  break;
                }
              }
            },
          ),
        ),
      ),
    );
  }
}
