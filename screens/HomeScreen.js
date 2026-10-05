import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function HomeScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    // جلب باقي المستخدمين باستثناء المستخدم الحالي
    const q = query(collection(db, 'users'), where('uid', '!=', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data());
      setUsers(userList);
    });

    return () => unsubscribe();
  }, []);

  const startChat = (recipient) => {
    // إنشاء ID موحد للغرفة بين المستخدمين
    const chatRoomId = [currentUser.uid, recipient.uid].sort().join('_');
    navigation.navigate('Chat', { chatRoomId, recipient });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المحادثات</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logout}>خروج</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userCard} onPress={() => startChat(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 15, backgroundColor: '#075E54', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logout: { color: '#ffdddd', fontSize: 14 },
  userCard: { flexDirection: 'row-reverse', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#128C7E', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  userEmail: { fontSize: 12, color: '#666', textAlign: 'right' }
});
