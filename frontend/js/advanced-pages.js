import {repo} from './repository.js';
import {badge, esc, formFields, getForm, modal, table, toast} from './ui.js';
import {money} from './state.js';

const canManage = role => ['ADMIN', 'STAFF'].includes(role);

const pageHead = (title, subtitle, action = '') =>
  `<div class="page-head"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;

export async function enhanceEmployeeViews(el, user) {
  const employees = await repo.employees.list(user);
  el.querySelectorAll('[data-view]').forEach(button => button.onclick = async () => {
    const employee = employees.find(item => item.id === button.dataset.view);
    if (!employee) return;
    let body = `<dl><div class="list-row"><dt>Họ và tên</dt><dd>${esc(employee.name)}</dd></div><div class="list-row"><dt>Email</dt><dd>${esc(employee.email)}</dd></div><div class="list-row"><dt>Số điện thoại</dt><dd>${esc(employee.phone)}</dd></div><div class="list-row"><dt>Vai trò</dt><dd>${esc(employee.role)}</dd></div><div class="list-row"><dt>Chuyên môn</dt><dd>${esc(employee.specialization || '—')}</dd></div><div class="list-row"><dt>Giới thiệu</dt><dd>${esc(employee.biography || '—')}</dd></div></dl>`;
    if (employee.role === 'TRAINER') {
      const schedules = (await repo.classes.list(user)).filter(item => String(item.trainerId) === String(employee.id));
      body += `<h3 class="serif" style="margin-top:24px">Lịch dạy sắp tới</h3>${table(['Lớp học', 'Ngày', 'Thời gian', 'Địa điểm', 'Sĩ số'], schedules.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.date)}</td><td>${esc(item.startTime)}–${esc(item.endTime)}</td><td>${esc(item.location)}</td><td>${item.registered}/${item.capacity}</td></tr>`).join(''), 'Chưa có lịch dạy sắp tới.')}`;
    }
    modal('Chi tiết nhân sự', body);
  });
}

export async function memberPackagesPage(el, user) {
  const [packages, memberships] = await Promise.all([repo.packages.list(user), repo.memberships.list(user)]);
  el.innerHTML = pageHead('Gói tập của tôi', 'Xem, đăng ký, gia hạn và theo dõi gói tập của bạn.') +
    `<div class="grid grid-3">${packages.map(item => {
      const active = memberships.find(x => x.packageId === item.id && x.status === 'active');
      const expired = memberships.find(x => x.packageId === item.id && x.status === 'expired');
      const pending = memberships.find(x => x.packageId === item.id && x.status === 'pending_payment');
      if (active) return `<article class="card card-pad"><small class="muted">${esc(item.type)}</small><h2 class="serif">${esc(item.name)}</h2><p class="stats-value">${money(item.price)}</p><p>${item.duration} tháng · ${item.sessions} buổi</p><p>${badge('active')} Còn ${active.remainingSessions} buổi<br><small class="muted">Hết hạn: ${esc(active.expiryDate || '')}</small></p><button class="btn btn-soft" data-renew="${active.id}">Gia hạn gói</button></article>`;
      if (expired) return `<article class="card card-pad"><small class="muted">${esc(item.type)}</small><h2 class="serif">${esc(item.name)}</h2><p class="stats-value">${money(item.price)}</p><p>${item.duration} tháng · ${item.sessions} buổi</p><p>${badge('inactive')} Đã hết hạn</p><button class="btn btn-primary" data-renew="${expired.id}">Gia hạn gói</button></article>`;
      if (pending) return `<article class="card card-pad"><small class="muted">${esc(item.type)}</small><h2 class="serif">${esc(item.name)}</h2><p class="stats-value">${money(item.price)}</p><p>${item.duration} tháng · ${item.sessions} buổi</p><p>${badge('pending')} Đang chờ thanh toán</p></article>`;
      return `<article class="card card-pad"><small class="muted">${esc(item.type)}</small><h2 class="serif">${esc(item.name)}</h2><p class="stats-value">${money(item.price)}</p><p>${item.duration} tháng · ${item.sessions} buổi</p><button class="btn btn-primary" data-buy="${item.id}">Đăng ký gói</button></article>`;
    }).join('')}</div>`;

  el.querySelectorAll('[data-buy]').forEach(button => button.onclick = async () => {
    try {
      await repo.memberships.create(user, {packageId: button.dataset.buy});
      toast('Đã tạo đăng ký gói, vui lòng hoàn tất thanh toán.');
      memberPackagesPage(el, user);
    } catch (error) { toast(error.message); }
  });
  el.querySelectorAll('[data-renew]').forEach(button => button.onclick = async () => {
    try {
      await repo.memberships.renew(user, button.dataset.renew, 'CASH');
      toast('Đã tạo yêu cầu gia hạn, vui lòng hoàn tất thanh toán.');
      memberPackagesPage(el, user);
    } catch (error) { toast(error.message); }
  });
}

export async function attendanceHistoryPage(el, user) {
  const records = await repo.attendance.list(user);
  const formatDate = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
  const filters = {search:'', status:'', from:'', to:''};
  const render = () => {
    const query = filters.search.trim().toLocaleLowerCase('vi');
    const visibleRecords = records.filter(item => {
      const searchable = [item.memberName, item.className].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      const status = String(item.status || '').toLowerCase();
      const attendanceDate = String(item.startsAt || item.markedAt || item.date || '').slice(0, 10);
      return (!query || searchable.includes(query)) &&
        (!filters.status || status === filters.status) &&
        (!filters.from || attendanceDate >= filters.from) &&
        (!filters.to || attendanceDate <= filters.to);
    });

    el.innerHTML = pageHead('Lịch sử điểm danh', user.role === 'MEMBER'
      ? 'Kết quả điểm danh của bạn.'
      : user.role === 'TRAINER' ? 'Chỉ hiển thị hội viên thuộc các lớp bạn phụ trách.'
      : 'Tra cứu lịch sử điểm danh của toàn bộ hội viên.') +
      `<div class="card payment-filters attendance-filters"><div class="attendance-filter-grid"><label class="payment-filter-search"><span class="label">Tra cứu điểm danh</span><input id="attendance-search" class="field" type="search" placeholder="Tên hội viên hoặc lớp học" value="${esc(filters.search)}"></label><label><span class="label">Trạng thái</span><select id="attendance-status" class="field"><option value="">Tất cả trạng thái</option><option value="present" ${filters.status === 'present' ? 'selected' : ''}>Có mặt</option><option value="absent" ${filters.status === 'absent' ? 'selected' : ''}>Vắng mặt</option><option value="excused" ${filters.status === 'excused' ? 'selected' : ''}>Có phép</option></select></label><label><span class="label">Từ ngày</span><input id="attendance-from" class="field" type="date" value="${filters.from}"></label><label><span class="label">Đến ngày</span><input id="attendance-to" class="field" type="date" value="${filters.to}"></label><button class="btn btn-soft payment-clear" id="clear-attendance-filters" type="button">Xóa lọc</button></div><small class="muted">Hiển thị ${visibleRecords.length}/${records.length} kết quả điểm danh.</small></div>` +
      table(['Thời gian lớp', 'Hội viên', 'Lớp học', 'Trạng thái', 'Thời điểm ghi nhận'], visibleRecords.map(item => `<tr><td>${formatDate(item.startsAt)}</td><td>${esc(item.memberName || '—')}</td><td>${esc(item.className || '—')}</td><td>${badge(String(item.status || '').toLowerCase())}</td><td>${formatDate(item.markedAt)}</td></tr>`).join(''), 'Không tìm thấy kết quả điểm danh phù hợp.');

    const rerenderWithFocus = event => {
      const cursor = event?.target?.selectionStart;
      render();
      const search = el.querySelector('#attendance-search');
      search?.focus();
      if (search && typeof cursor === 'number') search.setSelectionRange(cursor, cursor);
    };
    el.querySelector('#attendance-search').oninput = event => { filters.search = event.target.value; rerenderWithFocus(event); };
    el.querySelector('#attendance-status').onchange = event => { filters.status = event.target.value; render(); };
    el.querySelector('#attendance-from').onchange = event => { filters.from = event.target.value; render(); };
    el.querySelector('#attendance-to').onchange = event => { filters.to = event.target.value; render(); };
    el.querySelector('#clear-attendance-filters').onclick = () => { Object.keys(filters).forEach(key => { filters[key] = ''; }); render(); };
  };
  render();
}

const reportDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const reportPrettyDate = value => { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; };

function reportRanges(preset, anchor = new Date(), page = 0) {
  const ranges = [];
  const count = preset === 'year' ? 5 : 7;
  const duration = preset === 'year' ? 365 : preset === 'month' ? 30 : 7;
  const pageOffset = page * count;
  for (let offset = count - 1 + pageOffset; offset >= pageOffset; offset -= 1) {
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    end.setDate(end.getDate() - offset * duration);
    const start = new Date(end);
    start.setDate(end.getDate() - duration + 1);
    ranges.push({from: reportDate(start), to: reportDate(end), label: reportRangeLabel(preset, start, end)});
  }
  return ranges;
}

function reportRangeLabel(preset, start, end) {
  const day = String(start.getDate()).padStart(2, '0');
  const month = String(start.getMonth() + 1).padStart(2, '0');
  return preset === 'year' ? `${day}/${month}/${String(start.getFullYear()).slice(-2)}` : `${day}/${month}`;
}

const compactMoney = value => {
  const amount = Number(value || 0);
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1).replace('.0', '')} tỷ`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')} tr`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return `${Math.round(amount)}đ`;
};

function reportBars(rows) {
  const max = Math.max(...rows.map(row => Number(row.paidRevenue || 0)), 1);
  return `<div class="report-bars">${rows.map(row => {
    const amount = Number(row.paidRevenue || 0);
    const height = Math.max(8, Math.round((amount / max) * 100));
    return `<div class="report-bar-item"><div class="report-bar-value">${compactMoney(amount)}</div><div class="report-bar-track"><div class="report-bar" style="height:${height}%" title="${money(amount)}"></div></div><small>${esc(row.label)}</small></div>`;
  }).join('')}</div>`;
}

function reportLine(rows) {
  const width = 720;
  const height = 230;
  const padX = 26;
  const padY = 24;
  const values = rows.map(row => Number(row.registrations || 0));
  const max = Math.max(...values, 1);
  const step = rows.length > 1 ? (width - padX * 2) / (rows.length - 1) : 0;
  const points = values.map((value, index) => `${padX + index * step},${height - padY - (value / max) * (height - padY * 2)}`);
  const area = `${padX},${height - padY} ${points.join(' ')} ${width - padX},${height - padY}`;
  return `<div class="report-line-wrap"><svg class="report-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ lượt đăng ký theo kỳ"><defs><linearGradient id="report-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#83d7ac" stop-opacity=".45"></stop><stop offset="1" stop-color="#83d7ac" stop-opacity="0"></stop></linearGradient></defs><line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" class="report-axis"></line><polygon points="${area}" class="report-area"></polygon><polyline points="${points.join(' ')}" class="report-polyline"></polyline>${points.map((point, index) => { const [x, y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="4" class="report-dot"><title>${rows[index].label}: ${values[index]} lượt đăng ký</title></circle>`; }).join('')}</svg><div class="report-line-labels">${rows.map(row => `<small>${esc(row.label)}</small>`).join('')}</div></div>`;
}

export async function reportsPage(el, user) {
  let preset = 'month';
  let customFrom = '';
  let customTo = '';
  let historyPage = 0;
  const load = async () => {
    el.innerHTML = '<div class="card card-pad">Đang tải báo cáo...</div>';
    try {
      const ranges = customFrom && customTo ? [{from: customFrom, to: customTo, label: 'Tùy chọn'}] : reportRanges(preset, new Date(), historyPage);
      const current = ranges[ranges.length - 1];
      const [overview, history, payments, members, schedules] = await Promise.all([
        repo.reports.overview(current.from, current.to),
        Promise.all(ranges.map(range => repo.reports.overview(range.from, range.to))),
        repo.payments.list(user),
        repo.members.list(user),
        repo.classes.list(user)
      ]);
      const chartRows = history.map((item, index) => ({...item, label: ranges[index].label}));
      const currentPayments = payments.filter(payment => {
        const createdAt = new Date(payment.date || payment.paymentTime || 0).getTime();
        return createdAt >= new Date(`${current.from}T00:00:00`).getTime() && createdAt <= new Date(`${current.to}T23:59:59`).getTime();
      });
      const periodSchedules = schedules.filter(schedule => {
        const startsAt = new Date(schedule.startsAt || `${schedule.date}T${schedule.startTime}:00`).getTime();
        return startsAt >= new Date(`${current.from}T00:00:00`).getTime() && startsAt <= new Date(`${current.to}T23:59:59`).getTime();
      });
      const stats = [
        ['members', 'Tổng hội viên', overview.totalMembers, 'Toàn bộ hồ sơ hội viên'],
        ['active', 'Đang hoạt động', overview.activeMembers, `${overview.totalMembers ? Math.round((overview.activeMembers / overview.totalMembers) * 100) : 0}% trên tổng số`],
        ['expired', 'Gói đã hết hạn', overview.expiredPackages || 0, 'Cần được chăm sóc lại'],
        ['classes', 'Tổng lớp học', overview.activeClasses, `${overview.schedules} lịch trong kỳ`],
        ['attendance', 'Lượt tham gia', overview.attendanceRecords, `${overview.registrations} lượt đăng ký trong kỳ`],
        ['revenue', 'Doanh thu', money(overview.paidRevenue), 'Giao dịch đã thanh toán']
      ];
      el.innerHTML = pageHead('Thống kê & báo cáo', 'Tổng quan hoạt động phòng tập theo thời gian thực.', '<button class="btn btn-soft" id="export-report">↓ Xuất báo cáo</button>') +
        `<div class="report-toolbar"><div class="report-periods" role="tablist" aria-label="Khoảng thời gian báo cáo">${[['week', 'Tuần'], ['month', 'Tháng'], ['year', 'Năm']].map(item => `<button class="report-period ${!customFrom && preset === item[0] ? 'active' : ''}" data-period="${item[0]}" role="tab">${item[1]}</button>`).join('')}</div><span class="report-updated">${reportPrettyDate(current.from)} → ${reportPrettyDate(current.to)}</span></div>` +
        `${!customFrom ? `<div class="report-history-nav"><span>Biểu đồ lịch sử</span><div><button class="btn btn-soft" id="history-prev">← Kỳ trước</button><button class="btn btn-soft" id="history-next" ${historyPage === 0 ? 'disabled' : ''}>Kỳ sau →</button><button class="btn btn-soft" id="history-current" ${historyPage === 0 ? 'disabled' : ''}>Hiện tại</button></div></div>` : ''}` +
        `<form id="report-filter" class="card report-custom-filter"><div><span class="label">Khoảng tùy chọn</span><small class="muted">Chọn ngày để xem chính xác một giai đoạn.</small></div><label><span class="label">Từ ngày</span><input class="field" name="from" type="date" value="${customFrom || current.from}" required></label><label><span class="label">Đến ngày</span><input class="field" name="to" type="date" value="${customTo || current.to}" required></label><button class="btn btn-primary" type="submit">Cập nhật</button></form>` +
        `<div class="report-stat-grid">${stats.map(stat => `<article class="card report-stat-card"><div class="report-stat-top"><span class="report-icon ${stat[0]}">${stat[0] === 'revenue' ? '₫' : stat[0] === 'attendance' ? '↗' : stat[0] === 'classes' ? '▦' : stat[0] === 'expired' ? '!' : stat[0] === 'active' ? '✓' : '♙'}</span><span class="report-stat-caption">${stat[1]}</span></div><strong>${stat[2]}</strong><small>${stat[3]}</small></article>`).join('')}</div>` +
        `<div class="report-chart-grid"><article class="card report-panel"><div class="report-panel-head"><div><h2>Doanh thu theo kỳ</h2><p>${historyPage ? 'Các kỳ trước' : 'Kỳ hiện tại và các kỳ gần nhất'}</p></div><span class="report-total">${compactMoney(overview.paidRevenue)}</span></div>${reportBars(chartRows)}</article><article class="card report-panel"><div class="report-panel-head"><div><h2>Tăng trưởng lượt đăng ký</h2><p>${historyPage ? 'Các kỳ trước' : 'Kỳ hiện tại và các kỳ gần nhất'}</p></div><span class="report-trend">${overview.registrations} lượt</span></div>${reportLine(chartRows)}</article></div>` +
        `<article class="card report-panel report-detail"><div class="report-panel-head"><div><h2>Chi tiết theo kỳ</h2><p>Số liệu được lấy trực tiếp từ hệ thống.</p></div><span class="muted">${reportPrettyDate(current.from)} → ${reportPrettyDate(current.to)}</span></div>${table(['Kỳ', 'Doanh thu', 'Hội viên hoạt động', 'Lớp học', 'Đăng ký', 'Điểm danh'], chartRows.slice().reverse().map(row => `<tr><td><b>${esc(row.label)}</b></td><td>${money(row.paidRevenue)}</td><td>${row.activeMembers}</td><td>${row.activeClasses}</td><td>${row.registrations}</td><td>${row.attendanceRecords}</td></tr>`).join(''))}</article>` +
        `<article class="card report-panel report-transactions"><div class="report-panel-head"><div><h2>Giao dịch trong kỳ</h2><p>Hiển thị tối đa 8 giao dịch mới nhất.</p></div><span class="report-total">${currentPayments.length} giao dịch</span></div>${table(['Mã giao dịch', 'Hội viên', 'Gói tập', 'Số tiền', 'Trạng thái'], currentPayments.slice(0, 8).map(payment => `<tr><td>${esc(payment.code)}</td><td>${esc(payment.memberName || '—')}</td><td>${esc(payment.packageName || '—')}</td><td>${money(payment.amount)}</td><td>${badge(payment.status)}</td></tr>`).join(''))}</article>`;

      const memberRows = members.map(member => {
        const status = String(member.status || '').toLowerCase();
        const search = [member.code, member.name, member.email, member.phone].filter(Boolean).join(' ').toLocaleLowerCase('vi');
        return `<tr data-member-row data-status="${esc(status)}" data-search="${esc(search)}"><td><b>${esc(member.name || '—')}</b><br><small class="muted">${esc(member.code || '—')}</small></td><td>${esc(member.phone || '—')}<br><small class="muted">${esc(member.email || '—')}</small></td><td>${badge(status)}</td></tr>`;
      }).join('');
      el.insertAdjacentHTML('beforeend', `<article class="card report-panel report-members"><div class="report-panel-head"><div><h2>Chi tiết hội viên</h2><p>Xem danh sách hội viên và trạng thái hiện tại.</p></div><span class="report-total" id="member-report-count">${members.length} hội viên</span></div><div class="member-report-tools"><input id="member-report-search" class="field" type="search" placeholder="Tìm theo mã, họ tên, email, số điện thoại"><select id="member-report-status" class="field"><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></div>${table(['Hội viên','Liên hệ','Trạng thái'],memberRows,'Chưa có hội viên.')}</article>`);
      const updateMemberFilter = () => {
        const query = el.querySelector('#member-report-search').value.trim().toLocaleLowerCase('vi');
        const status = el.querySelector('#member-report-status').value;
        let visible = 0;
        el.querySelectorAll('[data-member-row]').forEach(row => {
          const matched = (!query || row.dataset.search.includes(query)) && (!status || row.dataset.status === status);
          row.hidden = !matched;
          if (matched) visible += 1;
        });
        el.querySelector('#member-report-count').textContent = `${visible}/${members.length} hội viên`;
      };
      el.querySelector('#member-report-search').oninput = updateMemberFilter;
      el.querySelector('#member-report-status').onchange = updateMemberFilter;
      const classRows = periodSchedules.map(schedule => {
        const status = String(schedule.status || '').toLowerCase();
        const search = [schedule.name, schedule.code, schedule.trainerName, schedule.location, schedule.date, schedule.startTime].filter(Boolean).join(' ').toLocaleLowerCase('vi');
        return `<tr data-class-row data-status="${esc(status)}" data-search="${esc(search)}"><td><b>${esc(schedule.name || '—')}</b><br><small class="muted">${esc(schedule.date || '—')} · ${esc(schedule.startTime || '—')}–${esc(schedule.endTime || '—')}</small></td><td>${esc(schedule.trainerName || '—')}<br><small class="muted">${esc(schedule.location || 'Chưa có địa điểm')}</small></td><td>${schedule.registered || 0}/${schedule.capacity || 0}</td><td>${badge(status)}</td></tr>`;
      }).join('');
      el.insertAdjacentHTML('beforeend', `<article class="card report-panel report-classes"><div class="report-panel-head"><div><h2>Chi tiết lớp học</h2><p>Các lớp trong khoảng ${reportPrettyDate(current.from)} → ${reportPrettyDate(current.to)}.</p></div><span class="report-total" id="class-report-count">${periodSchedules.length} lớp</span></div><div class="member-report-tools"><input id="class-report-search" class="field" type="search" placeholder="Tìm theo tên lớp, HLV, địa điểm"><select id="class-report-status" class="field"><option value="">Tất cả trạng thái</option><option value="active">Đang mở</option><option value="cancelled">Đã hủy</option><option value="completed">Đã hoàn thành</option></select></div>${table(['Lớp học & lịch','HLV & địa điểm','Sĩ số','Trạng thái'],classRows,'Chưa có lớp học trong kỳ.')}</article>`);
      const updateClassFilter = () => {
        const query = el.querySelector('#class-report-search').value.trim().toLocaleLowerCase('vi');
        const status = el.querySelector('#class-report-status').value;
        let visible = 0;
        el.querySelectorAll('[data-class-row]').forEach(row => {
          const matched = (!query || row.dataset.search.includes(query)) && (!status || row.dataset.status === status);
          row.hidden = !matched;
          if (matched) visible += 1;
        });
        el.querySelector('#class-report-count').textContent = `${visible}/${periodSchedules.length} lớp`;
      };
      el.querySelector('#class-report-search').oninput = updateClassFilter;
      el.querySelector('#class-report-status').onchange = updateClassFilter;
      el.querySelectorAll('[data-period]').forEach(button => button.onclick = () => { preset = button.dataset.period; customFrom = ''; customTo = ''; historyPage = 0; load(); });
      el.querySelector('#history-prev')?.addEventListener('click', () => { historyPage += 1; customFrom = ''; customTo = ''; load(); });
      el.querySelector('#history-next')?.addEventListener('click', () => { historyPage = Math.max(0, historyPage - 1); customFrom = ''; customTo = ''; load(); });
      el.querySelector('#history-current')?.addEventListener('click', () => { historyPage = 0; customFrom = ''; customTo = ''; load(); });
      el.querySelector('#report-filter').onsubmit = event => {
        event.preventDefault();
        const form = event.target;
        if (form.elements.to.value < form.elements.from.value) return toast('Ngày kết thúc phải sau ngày bắt đầu.');
        customFrom = form.elements.from.value;
        customTo = form.elements.to.value;
        historyPage = 0;
        load();
      };
      el.querySelector('#export-report').onclick = () => {
        const rows = [['Kỳ', 'Doanh thu', 'Hội viên hoạt động', 'Lớp học', 'Đăng ký', 'Điểm danh'], ...chartRows.map(row => [row.label, row.paidRevenue, row.activeMembers, row.activeClasses, row.registrations, row.attendanceRecords])];
        const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
        link.download = `bao-cao-pilates-${current.from}-${current.to}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      };
    } catch (error) { el.innerHTML = `<div class="card card-pad">${esc(error.message)}</div>`; }
  };
  await load();
}

export async function paymentsPage(el, user) {
  const [payments, members, packages] = await Promise.all([repo.payments.list(user), repo.members.list(user), repo.packages.list(user)]);
  const writable = canManage(user.role);
  const filters = {search:'', status:'', method:'', from:'', to:''};
  const paymentMethodLabel = {CASH:'Tiền mặt', BANK_TRANSFER:'Chuyển khoản', CARD:'Thẻ'};
  const render = () => {
    const query = filters.search.trim().toLocaleLowerCase('vi');
    const visiblePayments = payments.filter(payment => {
      const searchable = [payment.code, payment.memberName, payment.packageName].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      const paymentDate = payment.date || String(payment.createdAt || '').slice(0, 10);
      return (!query || searchable.includes(query)) &&
        (!filters.status || payment.status === filters.status) &&
        (!filters.method || String(payment.method || '').toUpperCase() === filters.method) &&
        (!filters.from || paymentDate >= filters.from) &&
        (!filters.to || paymentDate <= filters.to);
    });
    el.innerHTML = pageHead('Thanh toán', 'Theo dõi giao dịch và xác nhận các khoản thanh toán đang chờ.', writable ? '<button class="btn btn-primary" id="add-pay">＋ Ghi nhận thanh toán</button>' : '') +
      `<div class="card payment-filters"><div class="payment-filter-grid"><label class="payment-filter-search"><span class="label">Tra cứu giao dịch</span><input id="payment-search" class="field" type="search" placeholder="Mã giao dịch, hội viên, gói tập" value="${esc(filters.search)}"></label><label><span class="label">Trạng thái</span><select id="payment-status" class="field"><option value="">Tất cả trạng thái</option><option value="pending" ${filters.status === 'pending' ? 'selected' : ''}>Đang chờ</option><option value="paid" ${filters.status === 'paid' ? 'selected' : ''}>Đã thanh toán</option><option value="refunded" ${filters.status === 'refunded' ? 'selected' : ''}>Đã hoàn tiền</option><option value="failed" ${filters.status === 'failed' ? 'selected' : ''}>Thất bại</option></select></label><label><span class="label">Phương thức</span><select id="payment-method" class="field"><option value="">Tất cả phương thức</option>${Object.entries(paymentMethodLabel).map(([value, label]) => `<option value="${value}" ${filters.method === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label><span class="label">Từ ngày</span><input id="payment-from" class="field" type="date" value="${filters.from}"></label><label><span class="label">Đến ngày</span><input id="payment-to" class="field" type="date" value="${filters.to}"></label><button class="btn btn-soft payment-clear" id="clear-payment-filters" type="button">Xóa lọc</button></div><small class="muted">Hiển thị ${visiblePayments.length}/${payments.length} giao dịch.</small></div>` +
      table(['Mã giao dịch', 'Hội viên', 'Gói tập', 'Số tiền', 'Phương thức', 'Thời điểm', 'Trạng thái', 'Thao tác'], visiblePayments.map(payment => `<tr><td>${esc(payment.code)}</td><td>${esc(payment.memberName || '—')}</td><td>${esc(payment.packageName || '—')}</td><td>${money(payment.amount)}</td><td>${esc(paymentMethodLabel[payment.method] || payment.method || '—')}</td><td>${payment.paymentTime || payment.createdAt ? new Date(payment.paymentTime || payment.createdAt).toLocaleString('vi-VN') : '—'}</td><td>${badge(payment.status)}</td><td><div class="actions"><button data-pay="${payment.id}">Xem</button>${writable && payment.status === 'pending' ? `<button data-confirm="${payment.id}">Xác nhận</button>` : ''}</div></td></tr>`).join(''));
    const rerenderWithFocus = event => {
      const targetId = event?.target?.id;
      const cursor = event?.target?.selectionStart;
      render();
      const nextTarget = targetId ? el.querySelector(`#${targetId}`) : null;
      if (nextTarget) { nextTarget.focus(); if (typeof cursor === 'number') nextTarget.setSelectionRange(cursor, cursor); }
    };
    el.querySelector('#payment-search').oninput = event => { filters.search = event.target.value; rerenderWithFocus(event); };
    el.querySelector('#payment-status').onchange = event => { filters.status = event.target.value; render(); };
    el.querySelector('#payment-method').onchange = event => { filters.method = event.target.value; render(); };
    el.querySelector('#payment-from').onchange = event => { filters.from = event.target.value; render(); };
    el.querySelector('#payment-to').onchange = event => { filters.to = event.target.value; render(); };
    el.querySelector('#clear-payment-filters').onclick = () => { Object.keys(filters).forEach(key => { filters[key] = ''; }); render(); };
    el.querySelectorAll('[data-pay]').forEach(button => button.onclick = () => {
      const payment = payments.find(item => item.id === button.dataset.pay);
      modal('Chi tiết giao dịch', `<p>Mã: <b>${esc(payment.code)}</b></p><p>Hội viên: <b>${esc(payment.memberName || '—')}</b></p><p>Gói tập: <b>${esc(payment.packageName || '—')}</b></p><p>Phương thức: <b>${esc(paymentMethodLabel[payment.method] || payment.method || '—')}</b></p><p>Thời điểm: ${payment.paymentTime || payment.createdAt || 'Chưa thanh toán'}</p><p>Trạng thái: ${badge(payment.status)}</p>`);
    });
    el.querySelectorAll('[data-confirm]').forEach(button => button.onclick = async () => {
      try { await repo.payments.update(user, button.dataset.confirm, {status: 'PAID'}); toast('Đã xác nhận thanh toán.'); paymentsPage(el, user); }
      catch (error) { toast(error.message); }
    });
    el.querySelector('#add-pay')?.addEventListener('click', () => {
      const pending = payments.filter(item => item.status === 'pending');
      const modalRoot = modal('Ghi nhận thanh toán', `<form id="pay-form" class="form-grid"><label class="form-full"><span class="label">Giao dịch đang chờ</span><select id="pending-payment" class="field"><option value="">Tạo giao dịch mới</option>${pending.map(item => `<option value="${item.id}">${esc(item.code)} · ${esc(item.memberName || '')} · ${money(item.amount)}</option>`).join('')}</select><small class="muted">Chọn giao dịch pending để xác nhận giao dịch có sẵn; chọn “Tạo giao dịch mới” nếu chưa có giao dịch.</small></label><label id="pay-member-field"><span class="label">Hội viên</span><select id="pay-member" class="field">${members.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label><label id="pay-package-field"><span class="label">Gói tập</span><select id="pay-package" class="field">${packages.map(item => `<option value="${item.id}">${esc(item.name)} · ${money(item.price)}</option>`).join('')}</select></label><label id="pay-method-field"><span class="label">Phương thức</span><select id="pay-method" class="field"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CARD">Thẻ</option></select></label><button class="btn btn-primary form-full">Xác nhận thanh toán</button></form>`);
      const pendingSelect = modalRoot.querySelector('#pending-payment');
      const newPaymentFields = ['#pay-member-field', '#pay-package-field', '#pay-method-field'].map(selector => modalRoot.querySelector(selector));
      const syncPaymentFields = () => {
        const confirmingPending = Boolean(pendingSelect.value);
        newPaymentFields.forEach(field => {
          field.hidden = confirmingPending;
          field.querySelector('select').disabled = confirmingPending;
        });
      };
      pendingSelect.addEventListener('change', syncPaymentFields);
      syncPaymentFields();
      modalRoot.querySelector('#pay-form').onsubmit = async event => {
        event.preventDefault();
        const form = event.target;
        try {
          const pendingId = form.querySelector('#pending-payment').value;
          if (pendingId) await repo.payments.update(user, pendingId, {status: 'PAID'});
          else await repo.payments.create(user, {memberId: form.querySelector('#pay-member').value, packageId: form.querySelector('#pay-package').value, method: form.querySelector('#pay-method').value});
          modalRoot.remove(); toast('Đã ghi nhận thanh toán.'); paymentsPage(el, user);
        } catch (error) { toast(error.message); }
      };
    });
  };
  render();
}
