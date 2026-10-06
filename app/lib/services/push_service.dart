import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class PushService {
  static Future<void> init(Future<void> Function(RemoteMessage) bg) async {
    final fm = FirebaseMessaging.instance;
    await fm.requestPermission();
    FirebaseMessaging.onBackgroundMessage(bg);
    FirebaseAuth.instance.authStateChanges().listen((u) async {
      if (u == null) return;
      final t = await fm.getToken();
      await FirebaseFirestore.instance.doc('users/${u.uid}').update({'fcmToken': t});
    });
    fm.onTokenRefresh.listen((t) {
      final u = FirebaseAuth.instance.currentUser;
      if (u != null) FirebaseFirestore.instance.doc('users/${u.uid}').update({'fcmToken': t});
    });
  }
}
