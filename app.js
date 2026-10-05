let peer = new Peer(); // إنشاء معرف PeerJS للمكالمات
let mediaRecorder;
let audioChunks = [];
let localStream;

// إعداد PeerJS
peer.on('open', (id) => {
  console.log('معرف الاتصال الخاص بك: ' + id);
});

// استقبال المكالمات الصادرة/الواردة
peer.on('call', (call) => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
    call.answer(stream);
    document.getElementById('callOverlay').style.display = 'flex';

    call.on('stream', (remoteStream) => {
      document.getElementById('remoteVideo').srcObject = remoteStream;
    });
  });
});

// فتح نافذة دردشة
function openChat(name, type) {
  document.getElementById('activeChatName').innerText = name;
  document.getElementById('chatScreen').style.display = 'flex';
}

function closeChat() {
  document.getElementById('chatScreen').style.display = 'none';
}

// إرسال نص
function sendMessage() {
  const input = document.getElementById('messageInput');
  if (!input.value.trim()) return;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = "background: #005c4b; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; align-self: flex-start; max-width: 80%;";
  msgDiv.innerText = input.value;
  document.getElementById('messagesContainer').appendChild(msgDiv);
  input.value = '';
}

// التسجيل الصوتية
const recordBtn = document.getElementById('voiceRecordBtn');
recordBtn.addEventListener('click', async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.controls = true;
      
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = "background: #005c4b; padding: 8px; border-radius: 8px; margin-bottom: 8px;";
      msgDiv.appendChild(audio);
      document.getElementById('messagesContainer').appendChild(msgDiv);
    };

    mediaRecorder.start();
    recordBtn.style.color = "red";
  } else {
    mediaRecorder.stop();
    recordBtn.style.color = "white";
  }
});

// بدء المكالمات الصوتية والمرئية
function startCall(type) {
  const targetPeerId = prompt("أدخل معرف المستخدم للاتصال به:");
  if (!targetPeerId) return;

  const constraints = type === 'video' ? { video: true, audio: true } : { video: false, audio: true };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
    document.getElementById('callOverlay').style.display = 'flex';

    const call = peer.call(targetPeerId, stream);
    call.on('stream', (remoteStream) => {
      document.getElementById('remoteVideo').srcObject = remoteStream;
    });
  });
}

function endCall() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  document.getElementById('callOverlay').style.display = 'none';
}
