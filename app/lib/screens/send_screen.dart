import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'user_details_screen.dart';

class SendScreen extends StatefulWidget {
  final String? toAccount;
  const SendScreen({super.key, this.toAccount});
  @override State<SendScreen> createState() => _S();
}
class _S extends State<SendScreen> {
  final acc = TextEditingController(), amt = TextEditingController();
  String cur = 'USD'; bool busy = false;
  final me = FirebaseAuth.instance.currentUser!.uid;
  @override void initState() { super.initState(); acc.text = widget.toAccount ?? ''; }

  Future<void> send() async {
    setState(() => busy = true);
    try {
      await FirebaseFunctions.instance.httpsCallable('sendMoney')
          .call({'toAccount': acc.text.trim(), 'currency': cur, 'amount': amt.text});
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم الإرسال'))); Navigator.pop(context); }
    } on FirebaseFunctionsException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message ?? 'خطأ')));
    }
    if (mounted) setState(() => busy = false);
  }

  Future<void> scan() async {
    final code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => Scaffold(
      appBar: AppBar(title: const Text('امسح الباركود')),
      body: MobileScanner(onDetect: (cap) {
        final v = cap.barcodes.firstOrNull?.rawValue;
        if (v != null) Navigator.pop(context, v);
      }))));
    if (code != null) setState(() => acc.text = code);
  }

  @override
  Widget build(BuildContext c) => Scaffold(
    appBar: AppBar(title: const Text('إرسال')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      TextField(controller: acc, keyboardType: TextInputType.number,
        decoration: InputDecoration(labelText: 'رقم الحساب',
          suffixIcon: IconButton(icon: const Icon(Icons.qr_code_scanner), onPressed: scan))),
      Row(children: [
        Expanded(child: TextField(controller: amt, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ'))),
        const SizedBox(width: 12),
        DropdownButton<String>(value: cur, items: const ['USD', 'SYP', 'TRY', 'EUR'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
          onChanged: (v) => setState(() => cur = v!)),
      ]),
      const SizedBox(height: 12),
      FilledButton(onPressed: busy ? null : send, child: Text(busy ? '...' : 'إرسال')),
      const Divider(height: 32),
      const Text('المفضلة', style: TextStyle(fontWeight: FontWeight.bold)),
      StreamBuilder<DocumentSnapshot>(
        stream: FirebaseFirestore.instance.doc('users/$me').snapshots(),
        builder: (c, s) {
          final favs = List<String>.from((s.data?.data() as Map?)?['favorites'] ?? []);
          if (favs.isEmpty) return const Padding(padding: EdgeInsets.all(12), child: Text('لا توجد حسابات مفضلة بعد'));
          return Column(children: favs.map((uid) => FutureBuilder<DocumentSnapshot>(
            future: FirebaseFirestore.instance.doc('users/$uid').get(),
            builder: (c, u) {
              final d = u.data?.data() as Map?; if (d == null) return const SizedBox();
              return ListTile(title: Text(d['name']), subtitle: Text(d['accountNumber']),
                onTap: () => setState(() => acc.text = d['accountNumber']),
                trailing: IconButton(icon: const Icon(Icons.info_outline),
                  onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => UserDetailsScreen(uid: uid)))));
            })).toList());
        }),
    ]));
}
