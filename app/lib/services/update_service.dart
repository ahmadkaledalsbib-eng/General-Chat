import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:ota_update/ota_update.dart';
import 'package:permission_handler/permission_handler.dart';

class UpdateService {
  static Future<void> checkForUpdates(BuildContext context) async {
    try {
      // 1. جلب معلومات النسخة الحالية للتطبيق
      PackageInfo packageInfo = await PackageInfo.fromPlatform();
      String currentVersion = packageInfo.version;

      // 2. جلب معلومات التحديث من قاعدة البيانات
      DocumentSnapshot configDoc = await FirebaseFirestore.instance
          .collection('app_config')
          .doc('global')
          .get();

      if (!configDoc.exists) return;

      Map<String, dynamic> data = configDoc.data() as Map<String, dynamic>;
      String latestVersion = data['latest_version'] ?? currentVersion;
      String apkUrl = data['apk_url'] ?? '';

      // 3. المقارنة بين الإصدار الحالي والأحدث
      if (_isVersionLower(currentVersion, latestVersion) && apkUrl.isNotEmpty) {
        if (context.mounted) {
          _showUpdateDialog(context, apkUrl, latestVersion);
        }
      }
    } catch (e) {
      debugPrint('خطأ أثناء فحص التحديثات: $e');
    }
  }

  static bool _isVersionLower(String current, String latest) {
    List<int> c = current.split('.').map(int.parse).toList();
    List<int> l = latest.split('.').map(int.parse).toList();
    for (int i = 0; i < c.length && i < l.length; i++) {
      if (l[i] > c[i]) return true;
      if (l[i] < c[i]) return false;
    }
    return false;
  }

  static void _showUpdateDialog(BuildContext context, String apkUrl, String newVersion) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        double progress = 0.0;
        bool isDownloading = false;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text('تحديث جديد متوفر ($newVersion)'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('يتوفر إصدار جديد للتطبيق. يرجى التحديث لمتابعة الاستخدام بدون مشاكل.'),
                  const SizedBox(height: 15),
                  if (isDownloading) ...[
                    LinearProgressIndicator(value: progress / 100),
                    const SizedBox(height: 10),
                    Text('جاري التنزيل والتثبيت: ${progress.toStringAsFixed(0)}%'),
                  ]
                ],
              ),
              actions: [
                if (!isDownloading)
                  ElevatedButton(
                    onPressed: () async {
                      // طلب صلاحية التثبيت
                      var status = await Permission.requestInstallPackages.request();
                      if (status.isGranted) {
                        setState(() {
                          isDownloading = true;
                        });
                        _executeDownload(apkUrl, (val) {
                          setState(() {
                            progress = val;
                          });
                        });
                      }
                    },
                    child: const Text('تحديث الآن'),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  static void _executeDownload(String apkUrl, Function(double) onProgress) {
    try {
      // تنزيل وتثبيت الـ APK فوق النسخة الحالية دون مسح البيانات
      OtaUpdate().execute(apkUrl, destinationFilename: 'app_update.apk').listen(
        (OtaEvent event) {
          if (event.status == OtaStatus.DOWNLOADING) {
            double p = double.tryParse(event.value ?? '0') ?? 0.0;
            onProgress(p);
          } else if (event.status == OtaStatus.INSTALLING) {
            debugPrint('جاري التثبيت التلقائي...');
          }
        },
        onError: (error) {
          debugPrint('خطأ التحديث: $error');
        },
      );
    } catch (e) {
      debugPrint('فشل التحديث: $e');
    }
  }
}
