# Phân tích yêu cầu hệ thống

## 1. Phát biểu bài toán

Phòng tập Pilates cần một hệ thống tập trung để quản lý hội viên, nhân sự, gói tập, lớp học, đăng ký, điểm danh và thanh toán. Hệ thống thay thế việc ghi chép phân tán bằng dữ liệu có kiểm tra nghiệp vụ, phân quyền và lịch sử thao tác.

## 2. Actor

| Actor | Trách nhiệm chính |
|---|---|
| ADMIN | Quản trị toàn bộ dữ liệu, nhân sự, báo cáo và audit log |
| STAFF | Vận hành hội viên, gói tập, lớp học, đăng ký, điểm danh và thanh toán |
| TRAINER | Xem lịch được phân công, xem roster và điểm danh lớp phụ trách |
| MEMBER | Xem gói, đăng ký/hủy lớp, xem lịch sử điểm danh và thanh toán |

## 3. Functional requirements

| Mã | Yêu cầu | Actor |
|---|---|---|
| FR-01 | Tạo, sửa, tìm kiếm, khóa/mở hồ sơ hội viên và cấp mã duy nhất | ADMIN, STAFF |
| FR-02 | Quản lý nhân viên/HLV, chuyên môn, tiểu sử và trạng thái hoạt động | ADMIN |
| FR-03 | Quản lý danh mục gói tập, thời hạn, số buổi, giá và loại lớp áp dụng | ADMIN, STAFF |
| FR-04 | Đăng ký gói, tạo payment pending và xác nhận thanh toán để kích hoạt gói | ADMIN, STAFF, MEMBER |
| FR-05 | Gia hạn gói, liên kết gói mới với gói cũ và bảo toàn lịch sử gia hạn | ADMIN, STAFF, MEMBER |
| FR-06 | Tự động nhận diện gói hết hạn và hiển thị trạng thái `EXPIRED` | Hệ thống |
| FR-07 | Tạo/sửa/hủy lớp và lịch, kiểm tra sức chứa và trùng lịch HLV | ADMIN, STAFF |
| FR-08 | Đăng ký/hủy lớp, kiểm tra gói, số buổi, loại lớp, sức chứa và trùng lịch | ADMIN, STAFF, MEMBER |
| FR-09 | Điểm danh, lưu thời gian thực tế, trừ/hoàn buổi và lưu lịch sử | ADMIN, STAFF, TRAINER |
| FR-10 | Ghi nhận, xác nhận, hoàn tiền và tra cứu giao dịch | ADMIN, STAFF, MEMBER |
| FR-11 | Báo cáo theo khoảng ngày: hội viên, gói hết hạn, lịch, đăng ký, điểm danh, doanh thu và tỷ lệ lấp đầy | ADMIN |
| FR-12 | Ghi audit log cho các thay đổi nghiệp vụ quan trọng | ADMIN |

## 4. Non-functional requirements

- **Security:** JWT access/refresh token, BCrypt, CORS và RBAC theo actor.
- **Integrity:** nghiệp vụ đăng ký, thanh toán, điểm danh và trừ buổi chạy trong transaction; khóa dữ liệu khi cần.
- **Usability:** giao diện responsive, nhãn tiếng Việt, thông báo lỗi nghiệp vụ rõ ràng.
- **Auditability:** lưu actor, thời điểm, hành động và dữ liệu trước/sau thay đổi.
- **Maintainability:** backend phân lớp Controller–Service–Repository–DTO; frontend tách API, repository, state và view.

## 5. Business rules quan trọng

- Hội viên không được đăng ký cùng một lịch hai lần hoặc đăng ký hai lớp trùng thời gian.
- Lớp đầy không nhận đăng ký mới.
- Gói phải ACTIVE, còn hạn, còn buổi và phù hợp loại lớp.
- Hủy trước thời hạn cấu hình được hoàn lại buổi; hủy muộn không hoàn buổi.
- Chỉ giao dịch `PAID` được tính vào doanh thu.
- Gói gia hạn ACTIVE được bắt đầu sau ngày kết thúc gói cũ; gói EXPIRED được bắt đầu từ ngày hiện tại.

## 6. Traceability

Các yêu cầu FR-01 đến FR-12 được triển khai qua các UC trong [API_DOCUMENTATION.md](API_DOCUMENTATION.md), mô hình dữ liệu trong [ERD.md](ERD.md), backend service/controller và các màn hình tương ứng trong frontend.
