Đúng rồi, và thực ra còn **đơn giản hơn** mình đang nghĩ. Đây là cách làm gọn nhất theo đúng những gì docs OpenAI hướng dẫn: [platform.openai](https://platform.openai.com/docs/guides/realtime)

***

## Kiến trúc thực tế: 3 bước duy nhất

```
[Frontend]  →  GET /speaking/session?lessonId=abc  →  [Backend]
                                                           │
                                                    Lấy lesson từ DB
                                                    Build systemPrompt
                                                    POST /v1/realtime/sessions (OpenAI)
                                                           │
                                                    Trả về { ephemeral_key }
                                                           │
[Frontend]  ←──────────────────────────────────────────────
    │
    │  Dùng ephemeral_key kết nối WebRTC thẳng tới OpenAI
    │  (Không qua backend nữa)
    ▼
[OpenAI Realtime Mini] ←→ [User mic/speaker]
```

Backend **chỉ làm 1 việc**: tạo ephemeral token và nhúng system prompt vào đó. Sau đó frontend tự kết nối thẳng với OpenAI. [developers.openai](https://developers.openai.com/api/reference/resources/realtime/)

***

## Code cụ thể

### Backend — `GET /speaking/session`

```typescript
// speech.service.ts
app.get("/speaking/session", async (req, res) => {
  const { lessonId } = req.query;

  // 1. Lấy dữ liệu bài học
  const lesson = await Lesson.findById(lessonId).populate("unitId");
  const systemPrompt = buildPrompt(lesson); // ghép context từ bài học

  // 2. Tạo ephemeral key + nhúng system prompt ngay tại đây
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-realtime-preview",
      voice: lesson.aiConfig.voiceId ?? "alloy",
      instructions: systemPrompt,  // ← system prompt bài học nằm ở đây
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe"  // bật transcript sẵn
      }
    }),
  });

  const data = await response.json();
  res.json({ ephemeral_key: data.client_secret.value });
});
```

### Frontend — Kết nối WebRTC

```typescript
// speaking-session.ts
async function startSpeakingSession(lessonId: string) {
  // 1. Lấy ephemeral key (đã có system prompt bên trong rồi)
  const { ephemeral_key } = await fetch(`/speaking/session?lessonId=${lessonId}`)
    .then(r => r.json());

  // 2. Setup WebRTC
  const pc = new RTCPeerConnection();

  // Nhận audio AI → phát ra loa
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  pc.ontrack = (e) => audioEl.srcObject = e.streams[0];

  // Gửi audio mic → OpenAI
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(stream.getTracks()[0]);

  // Data channel để nhận events (transcript, v.v.)
  const dc = pc.createDataChannel("oai-events");
  dc.onmessage = (e) => handleEvent(JSON.parse(e.data));

  // 3. Kết nối thẳng tới OpenAI
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch(
    "https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview",
    {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Authorization": `Bearer ${ephemeral_key}`,
        "Content-Type": "application/sdp"
      }
    }
  );

  await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
  // Xong. AI bắt đầu nói firstMessage và lắng nghe user.
}

// Lắng nghe transcript
function handleEvent(event: any) {
  if (event.type === "response.audio_transcript.done") {
    console.log("AI:", event.transcript);
  }
  if (event.type === "conversation.item.input_audio_transcription.completed") {
    console.log("User:", event.transcript);
  }
}
```

***

## Tóm gọn flow thực tế

| Bước | Ai làm | Công việc |
|---|---|---|
| 1 | **Backend** | Lấy lesson → build prompt → xin ephemeral key từ OpenAI |
| 2 | **Frontend** | Nhận key → kết nối WebRTC trực tiếp với OpenAI |
| 3 | **OpenAI** | Lo toàn bộ: nhận mic, xử lý, phát audio, trả transcript |
| 4 | **Frontend** | Lắng nghe events → hiển thị transcript nếu cần |

Ephemeral key chỉ sống **1 phút** kể từ khi được tạo, đủ để frontend kịp kết nối WebRTC xong là hết nhiệm vụ. Sau đó phiên WebRTC tự duy trì độc lập. [developers.openai](https://developers.openai.com/api/reference/resources/realtime/)