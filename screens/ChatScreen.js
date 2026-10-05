import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function ChatScreen({ route }) {
  const { chatRoomId, recipient } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const currentUser = auth.currentUser;

  useEffect(() => {
    // الاستماع للرسائل في الوقت الفعلي
    const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(list);
    });

    return () => unsubscribe();
  }, [chatRoomId]);

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    const messageData = {
      text: inputText,
      senderId: currentUser.uid,
      createdAt: serverTimestamp()
    };

    setInputText('');
    await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMe = item.senderId === currentUser.uid;
          return (
            <View style={[styles.messageBox, isMe ? styles.myMessage : styles.theirMessage]}>
              <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="اكتب رسالة..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>إرسال</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5DDD5' },
  messageBox: { padding: 10, borderRadius: 10, marginVertical: 4, marginHorizontal: 10, maxWidth: '80%' },
  myMessage: { alignSelf: 'flex-start', backgroundColor: '#DCF8C6' },
  theirMessage: { alignSelf: 'flex-end', backgroundColor: '#FFF' },
  messageText: { fontSize: 15 },
  myText: { color: '#000' },
  theirText: { color: '#000' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F0F0F0', padding: 10, borderRadius: 20, textAlign: 'right', marginRight: 10 },
  sendButton: { backgroundColor: '#075E54', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  sendButtonText: { color: '#FFF', fontWeight: 'bold' }
});
