# REST API

Base URL: `http://localhost:8080/api/v1`

Mọi response thành công có dạng `{ success, message, data, timestamp }`. Lỗi có thêm `code`, `fieldErrors`, `path`. Các endpoint ngoài login/refresh yêu cầu `Authorization: Bearer <accessToken>`.

## Authentication và profile

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public với refresh token hợp lệ |
| POST | `/auth/logout` | Authenticated |
| GET | `/auth/me` | Authenticated |
| GET, PATCH | `/profile` | Hồ sơ chính mình |

## UC1 – Hội viên

`GET /members`, `GET /members/{id}`, `POST /members`, `PATCH /members/{id}`, `PATCH /members/{id}/status`: ADMIN/STAFF.

## UC2 – Nhân viên

`GET /employees`: ADMIN/STAFF (STAFF dùng danh sách Trainer khi xếp lịch). `POST /employees`, `PUT /employees/{id}`, `PATCH /employees/{id}/status`: ADMIN.

## UC3 – Gói tập

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/packages`, `/packages/class-types` | ADMIN/STAFF/MEMBER |
| POST, PUT, PATCH status | `/packages...` | ADMIN/STAFF |
| POST | `/member-packages` | ADMIN/STAFF hoặc MEMBER cho chính mình |
| GET | `/member-packages/me` | MEMBER |
| GET | `/member-packages/member/{memberId}` | ADMIN/STAFF |

`POST /member-packages` tạo member package và payment PENDING trong cùng transaction.

## UC4 – Lớp và lịch

`GET /classes`, `GET /schedules` trả dữ liệu theo scope. ADMIN/STAFF được POST/PUT/PATCH status cho `/classes` và `/schedules`. TRAINER chỉ thấy lịch được phân công; MEMBER chỉ thấy lịch mở.

## UC5 – Đăng ký

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/class-registrations` | ADMIN/STAFF/MEMBER theo ownership |
| PATCH | `/class-registrations/{id}/cancel` | ADMIN/STAFF/MEMBER theo ownership |
| GET | `/class-registrations` | ADMIN/STAFF |
| GET | `/class-registrations/me` | MEMBER |

Backend kiểm tra member/package active, ngày hiệu lực, loại lớp, số buổi, capacity, trùng lịch và đăng ký trùng trong transaction có pessimistic lock.

## UC6 – Điểm danh

- `GET /schedules/{id}/attendance-roster`
- `PUT /schedules/{id}/attendance`
- `GET /attendance/me`

ADMIN/STAFF thao tác theo quyền vận hành; TRAINER chỉ lớp được phân công; MEMBER chỉ đọc lịch sử của mình.

## UC7 – Thanh toán

- `GET /payments`, `PATCH /payments/{id}/status`: ADMIN/STAFF.
- `GET /payments/me`: MEMBER.

Transition hợp lệ: `PENDING→PAID|FAILED`, `PAID→REFUNDED` (bắt buộc lý do). Doanh thu chỉ tính `PAID`.

## UC8 – Dashboard, báo cáo, audit

- `/dashboard/admin`, `/dashboard/staff`, `/dashboard/trainer`, `/dashboard/member`: đúng vai trò tương ứng.
- `GET /reports/overview?from=&to=`: ADMIN.
- `GET /audit-logs?page=&size=`: ADMIN.

STAFF không nhận doanh thu; TRAINER và MEMBER không truy cập báo cáo toàn hệ thống.

## HTTP status

## Bổ sung nghiệp vụ gói và báo cáo

- `POST /member-packages/{id}/renew?paymentMethod=CASH|BANK_TRANSFER|CARD`: tạo gói gia hạn ở trạng thái `PENDING_PAYMENT`, liên kết với gói cũ qua `renewedFrom`; MEMBER chỉ được gia hạn gói của chính mình.
- Gói `ACTIVE` có `endDate` trước ngày hiện tại được chuẩn hóa sang `EXPIRED` khi tải danh sách gói. Báo cáo cũng tính cả gói đã lưu `EXPIRED` và gói ACTIVE đã quá hạn.
- `PATCH /payments/{id}/status` với `status=PAID` xác nhận giao dịch pending và kích hoạt đúng member package liên kết. Giao diện thanh toán ưu tiên luồng này để tránh tạo gói trùng.
- `GET /reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` trả về số hội viên, gói hết hạn, lịch học, đăng ký, điểm danh, giao dịch, doanh thu và tỷ lệ lấp đầy trong khoảng chọn.

`200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `500`. Các lỗi nghiệp vụ có mã ổn định như `CLASS_FULL`, `SCHEDULE_CONFLICT`, `DUPLICATE_REGISTRATION`, `NO_SESSIONS_LEFT` và `INVALID_PAYMENT_TRANSITION`.
