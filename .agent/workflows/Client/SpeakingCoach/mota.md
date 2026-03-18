# AI Speaking Coach — Bài trình bày với HR / Nhà tuyển dụng

---

## Mở đầu — Giới thiệu tính năng (30 giây)

> *"Tôi đã xây dựng một tính năng tên là AI Speaking Coach — về cơ bản đó là một người bạn luyện nói tiếng Anh được mô phỏng bằng AI, hoạt động hoàn toàn theo thời gian thực. Người dùng nói vào micro, AI nghe hiểu rồi đáp lại bằng giọng nói — giống như đang nói chuyện với một người thật, nhưng người đó lại là một nhân vật được lập trình sẵn theo từng kịch bản học tập như: xin việc, thông quan tại sân bay, đặt phòng khách sạn..."*

---

## Vấn đề tôi giải quyết

Học nói tiếng Anh có một nghịch lý rất lớn: **bạn cần được nói thật nhiều để giỏi, nhưng lại không có ai để nói cùng.** Tìm gia sư thì tốn tiền, học với app thì chỉ đọc/chọn đáp án chứ không thực sự "giao tiếp".

Tôi muốn tạo ra trải nghiệm gần nhất với việc nói chuyện với người thật — có hỏi đáp, có phản hồi tức thì, và đặc biệt là **biết bạn đang phát âm sai ở đâu**.

---

## Tôi đã làm gì — Giải thích kiến trúc (1–2 phút)

Toàn bộ pipeline tôi xây từ đầu, gồm 3 tầng làm việc song song với nhau:

### **Tầng 1 — Người dùng nói, máy nghe hiểu**

Khi người dùng nhấn giữ nút micro trên giao diện (Push-To-Talk), trình duyệt bắt đầu thu âm bằng `MediaRecorder API`. Khi thả tay ra, file âm thanh được gửi ngầm lên backend, xử lý qua **OpenAI Whisper** để chuyển thành văn bản — gọi là STT (Speech-to-Text). Toàn bộ bước này mất khoảng 0.5 đến 1 giây.

### **Tầng 2 — AI phản hồi thông minh, phát tiếng ngay**

Sau khi có văn bản, tôi gửi nó vào **GPT-4o** kèm theo toàn bộ lịch sử hội thoại. GPT không chờ nghĩ xong rồi mới trả lời — nó trả về từng chữ một theo chuẩn Server-Sent Events, gần giống kiểu ChatGPT gõ từng chữ vậy.

Điểm tôi tự hào nhất: **tôi không đợi AI nói xong rồi mới đọc**. Thay vào đó, cứ mỗi khi AI hoàn thành được một câu đầy đủ — có dấu chấm, dấu hỏi, hay dấu chấm than — tôi lập tức tách câu đó ra, gửi lên API Text-to-Speech để lấy file âm thanh, và phát ngay. Trong khi câu đầu đang vang lên loa, câu thứ hai đã được tải về sẵn sàng phát tiếp. Kết quả là người dùng nghe AI phản hồi trong vòng chưa đến 2 giây sau khi thả micro — cảm giác rất tự nhiên, không bị chờ đợi.

### **Tầng 3 — Chấm điểm phát âm chi tiết đến từng âm tiết**

Đây là phần kỹ thuật phức tạp nhất. Trong khi AI đang phản hồi ở tầng 2, tôi **đồng thời** gửi file âm thanh vừa ghi được sang **Azure Cognitive Services Speech SDK**, kết nối qua WebSocket trực tiếp đến máy chủ Microsoft ở khu vực Đông Nam Á.

Azure không chỉ chấm điểm tổng — nó phân tích chi tiết xuống từng âm tiết (phoneme). Ví dụ từ "passport": âm `æ` được 48/100, đánh dấu là Mispronunciation; âm `s` được 91/100. Hệ thống của tôi sau đó **đưa thông tin này vào System Prompt của GPT trong lượt hội thoại tiếp theo** — để AI tự biết người dùng đang yếu âm gì, và có thể khéo léo tạo cơ hội cho họ luyện lại từ đó ngay trong kịch bản roleplay, mà không cần phá vỡ vai diễn.

---

## Thách thức kỹ thuật thú vị nhất

**1. Trình duyệt chặn tự động phát âm thanh**

Chrome và Safari có chính sách nghiêm ngặt: chỉ cho phép phát âm thanh nếu người dùng vừa tương tác trực tiếp. Vì AI phản hồi sau một vài giây (bất đồng bộ), trình duyệt coi đó là "tự phát tự nhiên" và chặn luôn. Giải pháp tôi dùng: ngay tại thời điểm người dùng nhấn nút (đồng bộ, trong cùng một sự kiện click), tôi tạo một thẻ `Audio` và phát một file âm thanh im lặng cỡ 1 byte — đủ để "mở khóa" cái channel đó. Từ đó trở đi mọi âm thanh phát qua cùng channel này đều không bị chặn nữa.

**2. Mô hình AI chậm vì hay suy nghĩ quá nhiều**

Các mô hình GPT thế hệ mới như gpt-5 hay o-series có một chế độ gọi là "chain-of-thought" — AI tự suy luận trước khi trả lời, rất tốt cho bài toán phức tạp nhưng lại mất 8–12 giây — quá lâu cho một cuộc hội thoại thoại realtime. Tôi phát hiện ra có thể tắt tính năng này bằng tham số `reasoning_effort: 'low'`, giảm thời gian phản hồi xuống còn khoảng 1–2 giây mà chất lượng hội thoại thông thường vẫn rất tốt.

**3. Azure WebSocket bị vòng lặp vô hạn**

Lần đầu tích hợp Azure, tôi gặp tình trạng kết nối WebSocket cứ liên tục reconnect — logs server bị lấp đầy. Nguyên nhân là tôi vô tình gọi đồng thời nhiều lần `recognizeOnceAsync` trước khi cái trước kết thúc. Tôi fix bằng cách thêm một flag `isAssessingRef` để đảm bảo chỉ có một phiên Azure chạy tại một thời điểm, kết hợp cơ chế cooldown 2 phút nếu liên tục thất bại.

---

## Kết quả & Bài học

Tính năng hoàn thành với trải nghiệm rất mượt: người dùng nói xong là nghe AI đáp lại trong vòng dưới 2 giây, đồng thời nhìn thấy điểm phát âm chi tiết của mình trên màn hình. Về mặt kỹ thuật, tôi học được rất nhiều về xử lý concurrent stream, quản lý WebSocket, tối ưu latency AI, và cả cách browser enforce security policies.

Tôi nghĩ điểm hay nhất của mình trong dự án này là **không chỉ làm cho nó "chạy được", mà còn làm cho nó chạy đủ nhanh và đủ mượt để thực sự có thể luyện nói được**.

---

*Stack: React + TypeScript · Node.js + Express · OpenAI (Whisper / GPT-4o / TTS) · Azure Cognitive Services · TanStack Query · SSE Streaming*
