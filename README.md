# A Little Universe of Gratitude — FT 537

Website chúc mừng ngày 20/11 dành riêng cho cô giáo, gồm 6 phân cảnh tương tác.

Website được xây dựng bằng HTML, CSS và JavaScript thuần. Không cần cài framework hoặc biên dịch mã nguồn.

## Chỉnh sửa nội dung ở một nơi duy nhất

**Mở file `js/content.js` để chỉnh gần như toàn bộ nội dung website.** Không cần sửa `index.html` hoặc `js/main.js` khi chỉ muốn thay lời chúc, ảnh, video hay tên lớp.

Trong `js/content.js`, các mục chính gồm:

- `meta`: tiêu đề và mô tả website.
- `intro`: nội dung màn hình mở đầu.
- `celebration`: lời chúc 20/11.
- `memories`: tiêu đề và mô tả khu vực ảnh.
- `photos`: danh sách 30 ảnh và caption tương ứng.
- `videos`: đường dẫn 3 video và nhãn hiển thị.
- `letter`: tiêu đề, lời mở đầu và các đoạn trong thư.
- `surpriseSection`: tiêu đề và hướng dẫn phần bí mật.
- `surprises`: nội dung 4 ngôi sao tương tác.
- `finale`: nội dung màn hình kết thúc.
- `ui`: một số nhãn giao diện.

Ví dụ thay lời nhắn của ngôi sao vui nhộn: tìm `surprises` → `funny` → `text` rồi sửa phần nội dung nằm giữa dấu nháy. Giữ nguyên dấu phẩy giữa các thuộc tính và không xóa dấu ngoặc.

## Thay ảnh lớp

1. Đặt ảnh vào thư mục `assets/photos/`.
2. Mở `js/content.js`, tìm mục `photos`.
3. Đổi `src` của từng ảnh, ví dụ `assets/photos/photo-01.jpg`.
4. Sửa `caption` ngay bên cạnh để thêm chú thích cho ảnh đó.

Có 30 mục ảnh. Gallery hiển thị 14 Polaroid nổi và 16 khung film trên hai dải ảnh không đều, được cố ý sắp xếp hỗn loạn.

## Thêm video

Đặt tối đa 3 video MP4 vào `assets/videos/`, ví dụ:

- `clip-01.mp4`
- `clip-02.mp4`
- `clip-03.mp4`

Trong `js/content.js`, tìm mục `videos` và sửa `src`, `poster` hoặc `label` nếu cần.

## Thêm nhạc nền

Đặt file MP3 tại `assets/music/background.mp3`. Nhạc chỉ phát sau khi người xem chủ động nhấn nút bật nhạc.

## Chạy website trên máy tính

1. Giải nén project.
2. Mở thư mục `ft537_little_universe` bằng VS Code.
3. Mở `index.html` bằng Chrome/Edge; hoặc chạy máy chủ cục bộ:

```bash
python -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`.

## Đăng website thành link công khai

Đây là website tĩnh. Tải toàn bộ thư mục `ft537_little_universe` (không chỉ riêng `index.html`) lên dịch vụ hosting website tĩnh. Trước khi công khai, thay ảnh demo, thêm video/nhạc thật, kiểm tra trên máy tính và điện thoại, đồng thời đảm bảo có sự đồng ý phù hợp khi chia sẻ ảnh/video có hình ảnh học sinh và giáo viên.

## Cấu trúc project

```text
ft537_little_universe/
├── index.html          # Khung giao diện 6 phân cảnh
├── README.md
├── css/
│   └── style.css       # Giao diện và hiệu ứng
├── js/
│   ├── content.js      # SỬA NỘI DUNG TẠI ĐÂY
│   └── main.js         # Logic và tương tác, hạn chế chỉnh sửa
└── assets/
    ├── demo/           # Ảnh minh họa tạm thời và poster video
    ├── photos/         # Ảnh thật của lớp
    ├── videos/         # Video MP4
    └── music/          # background.mp3
```

## Lưu ý

- `prefers-reduced-motion` được hỗ trợ để giảm chuyển động khi người xem yêu cầu.
- Có thể dùng phím mũi tên hoặc vuốt ngang để chuyển cảnh.
- Khi popup ảnh/video mở, điều hướng scene tạm khóa.
- Google Fonts được tải trực tuyến; hệ thống có font dự phòng nếu không tải được.
- Nếu chỉ sửa nội dung, hãy sửa `js/content.js`; tránh đổi tên các key như `intro`, `letter`, `surprises`, `photos` vì JavaScript dùng các key này để hiển thị dữ liệu.

## Hiệu ứng nền vũ trụ

Nền website có nhiều lớp sao với kích thước và màu sắc khác nhau, sao nhấp nháy, sao băng xuất hiện ngẫu nhiên, bụi sáng trôi chậm, tinh vân tím/xanh chuyển động nhẹ và quầng sáng đi theo con trỏ trên máy tính. Các hiệu ứng chỉ mang tính trang trí, nằm phía sau nội dung và không chặn thao tác. Trên thiết bị cảm ứng, quầng sáng con trỏ được ẩn; khi bật chế độ giảm chuyển động của hệ điều hành, các animation nền cũng được giảm/tắt.

Muốn tăng hoặc giảm độ đậm của nền, mở `css/style.css` và tìm các quy tắc `.cosmic-nebula`, `.aurora-haze` và `#starfield`. Muốn điều chỉnh số lượng sao, mở `js/main.js` và tìm biến `starCount` trong hàm `resizeCanvas()`.
