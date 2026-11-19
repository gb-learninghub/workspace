# gblearning LMS

Hệ thống quản lý lớp học của Bảo (giáo viên tiếng Anh, Việt Nam). Web tĩnh trên GitHub Pages (gb-learninghub.com), dữ liệu ở Supabase (project_id `bumaiagvgpewhvczgwio`). Không có bước build.

Giao tiếp bằng tiếng Việt tự nhiên, ngắn gọn. Bảo không biết code: khi hướng dẫn kỹ thuật, giải thích từng bước. Không tự đổi cấu trúc, giao diện, tính năng đã thống nhất. Đề xuất mới thì nói rõ là đề xuất, chưa làm khi chưa được đồng ý.

## Cấu trúc

- Trang quản lý: `index.html` (tổng quan), `classes.html`, `class.html`, `student-list.html`, `parent-list.html`, `tuition.html`, `teacher.html`.
- Trang học viên: `student.html`, `parent.html`.
- Dùng chung: `lms.js`, `lms.css`, `lms-polish.css`, `lms-mode.js`, `lms-tiles.js`, `lms-att.js`, `overview-redesign.css`, `tailwind.css`.
- Giao diện học viên và giáo viên: `student.css`, `student.js`, `teacher.js`. Từ vựng: `vocab-*.js`.
- Bài học theo lớp và tuần: `<lớp>/w<số>/` với lớp là `ac08`, `ac12`, `ielts`, `toeic`, `gt`. Ví dụ `ac12/w11/ac12-tn-11.html`.
- Menu là `<nav id="lms-nav">`, có ở mọi trang quản lý. Thêm hoặc đổi mục menu phải sửa ở tất cả các trang.

## Quy tắc không được phá

- Đường dẫn bài học `<lớp>/w<số>/<file>` được lưu trong Supabase (`assignments.page_path`, `week_materials.url`) và `index.html` tự suy thư mục từ mã bài. Đổi tên hoặc dời thư mục tuần là phải sửa cả hai chỗ này.
- Cache bust thủ công: mọi `<script>` và `<link>` dùng `?v=N`. Sửa file nào thì tăng `v` của file đó ở mọi trang gọi nó.
- Mobile (<=640px) nav là thanh đen trên cùng, có scroll ngang. Tablet (641-1023px) nav ở dưới. Selector mobile phải là `body>#lms-nav` vì có rule `!important`.
- Safari không có speculation rules; warm-up trang kế dùng fetch ở pointerdown (trong `lms.js`, `initSidebar`).
- `sessionStorage.lms_teacher_ok` cache kết quả kiểm giáo viên 30 phút; `signOut` xoá nó.
- Điểm Reading cộng cả 3 part (`sumFirst`), không lấy một part.

## Supabase

Bảng chính: `grades`, `submissions`, `attendance`, `sessions`, `student_targets`, `student_scores`, `week_materials`, `assignments`, `assignment_classes`. RPC: `student_portal`, `student_grades`, `submit_assignment`, `is_teacher`. Đổi schema phải hỏi Bảo trước.

## Cách làm việc

- Sửa nhỏ, giữ nguyên phần đang chạy tốt. Không tạo file hay bản phụ không cần.
- Sau khi sửa: chạy eslint `no-undef` cho file js đã đổi, rồi báo rõ phần nào chưa kiểm trên trình duyệt thật. Không nói đã kiểm khi chưa kiểm.
- Cuối mỗi việc, liệt kê file đã đổi và tăng `?v=` nào.
- `student.css` (146KB) cần tách thành shell, teacher, student. Làm từng bước, commit sau mỗi bước.
- Hai dòng `week_materials` (id 1, id 3) còn dùng link cũ `github.io/workspace`. Link tự chuyển sang `gb-learninghub.com` và mở được, file có trên GitHub. Có thể đổi sang tên miền mới khi rảnh, không gấp.
- Không bao giờ ghi khoá bí mật (service_role, token Telegram, mật khẩu, khoá API riêng) vào bất kỳ file nào trong repo. Repo này công khai. Chỉ khoá công khai (anon/publishable) của Supabase được nằm trong code. Nếu cần khoá bí mật, hỏi Bảo cách lưu ở phía Supabase, không dán vào file.
- Thư mục `0. My Tutor` bên ngoài (PDF, mp3, tài liệu) không thuộc repo. Không thêm vào git.
