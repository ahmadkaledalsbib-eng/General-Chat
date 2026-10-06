import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'send_screen.dart';

class UserDetailsScreen extends StatelessWidget {
  final String uid;
  const UserDetailsScreen({super.key, required this.uid});
  @override
  Widget build(BuildContext c) => Scaffold(
    appBar: AppBar(title: const Text('تفاصيل الحساب')),
    body: FutureBuilder<DocumentSnapshot>(
      future: FirebaseFirestore.instance.doc('users/$uid').get(),
      builder: (c, s) {
        final d = s.data?.data() as Map?; if (d == null) return const Center(child: CircularProgressIndicator());
        final date = (d['createdAt'] as Timestamp).toDate();
        return ListView(padding: const EdgeInsets.all(16), children: [
          Row(children: [
            Text(d['name'], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            if (d['verified'] == true) const Padding(padding: EdgeInsets.all(6), child: Icon(Icons.verified, color: Colors.blue)),
          ]),
          const SizedBox(height: 8),
          Text('تاريخ إنشاء الحساب: ${date.year}/${date.month}/${date.day}'),
          Text(d['verified'] == true ? 'حساب موثّق' : 'حساب غير موثّق'),
          const SizedBox(height: 16),
          FilledButton(onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => SendScreen(toAccount: d['accountNumber']))), child: const Text('إرسال')),
          OutlinedButton(onPressed: () => FirebaseFirestore.instance.doc('users/${FirebaseAuth.instance.currentUser!.uid}')
              .update({'favorites': FieldValue.arrayUnion([uid])}), child: const Text('إضافة إلى المفضلة')),
        ]);
      }));
}
