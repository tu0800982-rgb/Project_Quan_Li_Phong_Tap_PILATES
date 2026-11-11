# Phân tích và thiết kế hệ thống

## 1. Kiến trúc tổng thể

```text
Browser / Vanilla HTML-CSS-JS
        |
        | REST/JSON + JWT
        v
Spring Boot API
  Controller -> Service -> Repository -> JPA Entity
        |                              |
        +-- Security/RBAC              +-- MySQL 8
        +-- Validation                 +-- Flyway migrations
        +-- Audit + transaction
```

Frontend tách thành `api.js` (HTTP/JWT refresh), `repository.js` (mapping nghiệp vụ), `state.js` (session) và các view trong `app.js`/`advanced-pages.js`. Backend tách DTO request/response để không expose trực tiếp entity.

## 2. Subsystem

| Subsystem | Thành phần chính |
|---|---|
| Authentication | `AuthController`, `AuthService`, JWT filter, refresh/revoked token |
| Member & staff | `MemberController`, `EmployeeController`, profile và RBAC |
| Package & payment | `MemberPackageService`, `PaymentService`, `Payment`, `MemberPackage` |
| Class & registration | `ClassManagementService`, `ClassRegistrationService` |
| Attendance | `AttendanceService`, session usage ledger |
| Reporting | `ReportService`, dashboard services, date-range overview |
| Audit | `AuditService`, `AuditController`, audit log repository |

## 3. Sequence: đăng ký và thanh toán gói

```mermaid
sequenceDiagram
  actor Member
  participant UI as Frontend
  participant API as MemberPackageController
  participant Service as MemberPackageService
  participant DB as MySQL
  participant Staff as PaymentController

  Member->>UI: Chọn gói
  UI->>API: POST /member-packages
  API->>Service: register(request)
  Service->>DB: Tạo member_package PENDING
  Service->>DB: Tạo payment PENDING
  DB-->>UI: Mã giao dịch
  Staff->>Staff: Chọn giao dịch pending
  Staff->>API: PATCH /payments/{id}/status PAID
  Staff->>Service: updateStatus(paymentId)
  Service->>DB: Kích hoạt đúng member_package
```

## 4. Sequence: gia hạn gói

```mermaid
sequenceDiagram
  actor Member
  participant UI as Frontend
  participant API as MemberPackageController
  participant Service as MemberPackageService
  participant DB as MySQL

  Member->>UI: Chọn Gia hạn gói
  UI->>API: POST /member-packages/{id}/renew
  API->>Service: renew(id, paymentMethod)
  Service->>DB: Khóa gói cũ và kiểm tra trạng thái
  Service->>DB: Tạo gói mới renewedFrom=gói cũ
  Service->>DB: Tạo payment PENDING
  DB-->>UI: Gói gia hạn + giao dịch chờ
```

## 5. Sequence: đăng ký lớp và điểm danh

```mermaid
sequenceDiagram
  actor Member
  participant Registration as ClassRegistrationService
  participant Ledger as SessionUsageLedger
  participant Attendance as AttendanceService

  Member->>Registration: Đăng ký lịch học
  Registration->>Registration: Kiểm tra capacity, duplicate, conflict, package
  Registration->>Ledger: Ghi REGISTRATION_RESERVED (-1)
  actor Trainer
  Trainer->>Attendance: Lưu trạng thái điểm danh
  Attendance->>Ledger: Ghi delta theo PRESENT/ABSENT/EXCUSED
  Attendance-->>Member: Lịch sử điểm danh cập nhật
```

## 6. Thiết kế báo cáo

`GET /reports/overview` nhận `from` và `to`. Service quy đổi ngày theo `Asia/Ho_Chi_Minh`, giới hạn khoảng tối đa hai năm, sau đó tổng hợp hội viên, gói hết hạn, lịch học, đăng ký, điểm danh, giao dịch, doanh thu PAID và tỷ lệ lấp đầy.
