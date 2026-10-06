import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class ReceiveScreen extends StatelessWidget {
  const ReceiveScreen({super.key});
  @override
  Widget build(BuildContext c) => Scaffold(
    appBar: AppBar(title: const Text('استقبال')),
    body: Center(child: StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.doc('users/${FirebaseAuth.instance.currentUser!.uid}').snapshots(),
      builder: (c, s) {
        final acc = (s.data?.data() as Map?)?['accountNumber'];
        if (acc == null) return const CircularProgressIndicator();
        return Column(mainAxisSize: MainAxisSize.min, children: [
          QrImageView(data: acc, size: 240), const SizedBox(height: 12),
          SelectableText(acc, style: const TextStyle(fontSize: 22)),
        ]);
      })));
}
