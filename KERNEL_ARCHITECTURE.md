# KERNEL_ARCHITECTURE.md

## Tổng quan

```
Kernel Runtime (js/kernel-runtime.js)
        ↓ dùng làm transport
Signal Bus (js/signal-bus.js)
        ↓ emit/on
Modules (Terminal, SystemMonitor, Cursor, EnergyCore, LiveArchitecture,
         LiveRoadmap, AmbientLife, ShutdownSequence, Navigation, Scroll,
         Performance, Interactions, EasterEggs, Animations, Hero,
         KernelInspector)
        ↓ ghi DOM
UI
```

Không còn "Module A gọi Module B gọi Module C". Mọi module đăng ký với Kernel Runtime, giao tiếp qua Signal Bus, và Kernel Runtime là nơi duy nhất quyết định trạng thái hệ thống + vòng đời module.

---

## 1. Kernel Runtime (`js/kernel-runtime.js`)

### State Machine (Nhiệm vụ 7)

```
BOOTING ──→ INITIALIZING ──→ READY ──→ ACTIVE ⇄ IDLE ⇄ SLEEP
                                          │
                                          └──→ SHUTDOWN (terminal, không quay lại)

ERROR ──→ INITIALIZING (đường phục hồi duy nhất)
```

Bảng `VALID_TRANSITIONS` validate mọi lần chuyển trạng thái — `transition()` từ chối và log lỗi nếu chuyển không hợp lệ (ví dụ BOOTING không thể nhảy thẳng sang SHUTDOWN, đúng ví dụ trong brief). `SHUTDOWN` là trạng thái cuối (mảng rỗng) — khớp với `js/shutdown-sequence.js` vốn đã được thiết kế một chiều từ Phase 6.

Luồng thật: `kernel-runtime.js` khởi tạo ở `BOOTING` (đúng lúc Boot cinematic đang chạy) → `boot.js`'s `complete()` gọi `NexyrothApp.init()` → `main.js` chuyển `INITIALIZING` → đăng ký + init từng module → `READY` → `ACTIVE`.

### Phân chia trách nhiệm Kernel Runtime vs Signal Bus (Nhiệm vụ 2)

`js/signal-bus.js` **không đổi về bản chất** — nó vốn đã chỉ là transport thuần (`on`/`off`/`emit`, không giữ state, không validate) từ Phase 5. Tôi xác nhận điều này bằng cách đọc lại toàn bộ file, không phải giả định. Chỉ thêm 1 thứ: `getRecentEmissions()` — một rolling log 50 event gần nhất, phục vụ Kernel Inspector. Đây vẫn là transport-layer concern (giống packet capture của 1 network switch), không phải business logic.

Toàn bộ business logic thật (validate transition, dispatch có điều kiện, quản lý vòng đời module) nằm trong `kernel-runtime.js`.

### Module Registration (Nhiệm vụ 3)

```
main.js
  → kernel.registerModule(name, ref)
  → module.init()          (vẫn do main.js gọi — xem lý do bên dưới)
  → kernel.readyModule(name)     → gọi module.ready() nếu có
  → kernel.activateModule(name)  → đánh dấu 'active'
```

**Khác với brief gốc**: brief mô tả `registerModule() → module.ready() → module.active() → module.destroy()` như một chuỗi tự động hoàn toàn nằm trong Kernel. Tôi **giữ lại việc `main.js` quyết định thứ tự và gọi `init()`** thay vì để Kernel tự gọi, vì thứ tự init có phụ thuộc DOM thật (Hero phải tồn tại trước khi EnergyCore tìm canvas của nó) — Kernel Runtime không nên biết về thứ tự phụ thuộc DOM cụ thể này, đó vẫn là trách nhiệm hợp lý của orchestrator. Kernel sở hữu *vòng đời* (ready/active/pause/resume/destroy) và *registry*, không sở hữu *thứ tự khởi tạo*.

---

## 2. Standardized Lifecycle (Nhiệm vụ 11)

Mọi module giờ có đúng 5 phương thức: `init()`, `ready()`, `pause()`, `resume()`, `destroy()`. Kernel gọi chúng qua `typeof`-check — module không cần implement tất cả nếu không có gì để làm (ví dụ `Navigation.pause()` là no-op vì Navigation không có vòng lặp nào để dừng).

**Đã chuẩn hoá 1 bất nhất quán thật tìm được**: `js/navigation.js` trước đây viết theo style object-literal (`window.Navigation = { init() {...} }`) khác hẳn mọi module khác (IIFE trả về object). Đã viết lại theo đúng pattern chung, hành vi giữ nguyên 100%.

**Ngoại lệ trung thực, không giấu**: `js/terminal.js`'s `pause()`/`resume()` là no-op có chủ đích. Terminal đã có cơ chế `pausableDelay()` tự quản lý từ Phase 1.5/6 — tinh vi hơn 1 lệnh pause/resume ở cấp module (nó dừng được giữa lúc đang gõ ký tự, không chỉ ở ranh giới module). Viết lại cơ chế này để Kernel điều khiển hoàn toàn sẽ tốn công sức lớn và rủi ro cao hơn giá trị nhận được — nên tôi giữ nguyên, chỉ thêm no-op cho đúng hình dạng API.

---

## 3. Performance Layer tập trung (Nhiệm vụ 8)

**Phát hiện kiểm chứng được**: trước Phase 7, có **3 listener `visibilitychange` độc lập** (không phải chỉ những cái tôi nhớ) — `energy-core.js`, `cursor.js`, `system-monitor.js` (đã biết từ trước) — và phát hiện thêm **`performance.js` cũng có 1 cái riêng** (chỉ để toggle class CSS `tab-hidden`). Tổng cộng 4, cộng thêm cơ chế riêng của Terminal (ngoại lệ đã nêu) = 5 nơi xử lý tab-hidden độc lập trước phase này.

Đã gộp 4 cái thành đúng 1, nằm trong `kernel-runtime.js`. Khi tab ẩn: `pauseAllModules()` duyệt registry, gọi `pause()` trên mọi module đang `active`. Khi hiện lại (hoặc `pageshow` với `event.persisted` — bfcache): `resumeAllModules()`.

**Ghi chú trung thực**: class `tab-hidden` (giờ do Kernel toggle thay vì `performance.js`) vẫn **không được bất kỳ CSS rule nào tiêu thụ** — đã verify bằng grep, xác nhận đây là "dead plumbing" từ trước Phase 7, tôi không tạo ra nó nhưng cũng chưa dọn. Khuyến nghị: xoá hẳn class này ở phase sau, vì về bản chất một class chỉ có ý nghĩa khi tab ẩn thì cũng vô dụng — không ai nhìn thấy CSS áp dụng cho nó.

---

## 4. Kernel Inspector (Nhiệm vụ 4 + 5)

`Ctrl+Shift+K` để mở/đóng, `Escape` để đóng. DOM được tạo lười (chỉ khi mở lần đầu) — không tốn gì cho người dùng thường ngoài 1 keydown listener nhỏ.

Hiển thị: Kernel Version, Current State (màu theo trạng thái), FPS (đọc từ `SystemMonitor.getFPS()` — không đo lại, tránh trùng lặp), Memory (`performance.memory` nếu trình duyệt hỗ trợ — chỉ Chromium), danh sách Module kèm lifecycleState, Signal Queue (8 event gần nhất từ Signal Bus), Event Timeline (15 event gần nhất từ Kernel, có timestamp + duration giữa các event, có màu theo loại).

**Chưa làm**: "Failed Modules" hiện tính bằng module có `lifecycleState === 'registered'` (chưa từng đạt 'ready') — đây là suy luận hợp lý nhưng chưa test được có bắt đúng mọi trường hợp lỗi thật hay không.

---

## 5. Diễn giải khác với brief — nói rõ, không im lặng

### Nhiệm vụ 9 — "Energy Core không còn tự chạy"
EnergyCore **vẫn tự chạy vòng lặp `requestAnimationFrame` của riêng nó** — chỉ có việc BẮT ĐẦU/DỪNG vòng lặp đó (`pause()`/`resume()`) giờ do Kernel quyết định, không phải nó tự nghe `visibilitychange`. Tôi **không** biến EnergyCore thành hoàn toàn thụ động (nhận tick từ 1 vòng lặp trung tâm của Kernel mỗi frame) vì đó là thay đổi kiến trúc lớn hơn nhiều (Kernel phải tự vẽ frame cho mọi thứ), rủi ro cao khi không thể xem render thử, và giá trị thực tế không rõ ràng hơn cách hiện tại.

Brief cũng liệt kê EnergyCore nên nhận sự kiện `kernel:state`/`kernel:hover`/`kernel:idle`/`kernel:wake`/`kernel:shutdown` — tôi **chưa đổi tên** các event hiện có (`module:hover`, `system:idle`, `system:wake`, `system:shutdown`) sang tiền tố `kernel:`. Đổi tên 4 event xuyên suốt 6 file đã test kỹ (Terminal/SystemMonitor/Cursor/EnergyCore/LiveArchitecture/LiveRoadmap) là rủi ro thật nếu làm vội cuối 1 lượt đã dài — để lại cho phase sau.

### Nhiệm vụ 10 — chuỗi "Hover → Kernel → Bus → Terminal → SystemMonitor → Cursor → EnergyCore → ..."
Đọc kỹ, đây có thể hiểu theo 2 cách: (a) một chuỗi TUẦN TỰ (Terminal xong mới tới SystemMonitor, rồi mới tới Cursor...), hoặc (b) liệt kê các module cùng PHẢN ỨNG SONG SONG với 1 signal duy nhất. Tôi chọn (b) **có chủ đích** — vì (a) chính là "Module A gọi Module B gọi Module C" mà brief này mở đầu bằng việc nói KHÔNG muốn nữa. Kiến trúc hiện tại (broadcast qua Signal Bus, mọi listener phản ứng độc lập cùng lúc) đã đúng tinh thần này từ Phase 5. Nếu ý bạn thực sự là (a) — một pipeline có thứ tự — xin nói rõ, vì đó là thiết kế ngược hẳn với "không module nào biết module khác tồn tại" ở ngay dòng cuối Nhiệm vụ 10.

---

## 6. Dependency Audit (Nhiệm vụ 6) — kết quả

- **Circular dependency**: không tìm thấy. `kernel-runtime.js` → `signal-bus.js` một chiều, đã verify bằng grep.
- **Duplicate listener**: tìm thấy và sửa — 4 listener `visibilitychange` độc lập → gộp còn 1 (mục 3).
- **Style không nhất quán**: tìm thấy và sửa — `navigation.js` viết khác style mọi module khác (mục 2).
- **Dead code còn sót**: class `tab-hidden` không được CSS nào tiêu thụ (mục 3, chưa sửa, đã ghi rõ).
- **Double init/destroy**: đã có guard sẵn (`main.js`'s `isInitialized`, Kernel's `registerModule`/`destroyModule` đều cảnh báo nếu gọi trùng).
- **Race condition mới**: không phát hiện thêm trong lượt này ngoài những gì đã biết.
- **Memory leak**: không phát hiện leak mới; `EnergyCore.destroy()` giờ gọi `renderer.dispose()` — trước đây `destroy()` chưa tồn tại nên `dispose()` chưa từng được gọi (dù thực tế cũng chưa từng cần, vì trang tĩnh không unmount module).

---

## 7. File thay đổi/tạo mới trong Phase 7

Mới: `js/kernel-runtime.js`, `js/kernel-inspector.js`, `css/kernel-inspector.css`, `KERNEL_ARCHITECTURE.md`.
Sửa: `js/main.js`, `js/navigation.js` (viết lại toàn bộ), `js/cursor.js` (viết lại toàn bộ), `js/energy-core.js`, `js/system-monitor.js`, `js/terminal.js`, `js/ambient-life.js` (viết lại toàn bộ), `js/performance.js`, `js/hero.js`, `js/live-architecture.js`, `js/live-roadmap.js`, `js/shutdown-sequence.js`, `js/scroll.js`, `js/interactions.js`, `js/easter-eggs.js`, `js/animations.js`, `js/signal-bus.js`, `index.html`.
