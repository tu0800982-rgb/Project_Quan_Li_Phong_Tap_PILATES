const programs = [
  {number: '01', title: 'Reformer Pilates', text: 'Tăng sức mạnh, cải thiện tư thế và đánh thức sự linh hoạt trong từng chuyển động.'},
  {number: '02', title: 'Mat Pilates', text: 'Một nền tảng nhẹ nhàng nhưng hiệu quả để bạn kết nối sâu hơn với cơ thể.'},
  {number: '03', title: 'Private Session', text: 'Lộ trình cá nhân hóa cùng huấn luyện viên dành riêng cho mục tiêu của bạn.'}
];

const scrollToSection = event => {
  const target = event.currentTarget.getAttribute('href');
  if (!target?.startsWith('#') || target === '#/login') return;
  event.preventDefault();
  document.querySelector(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
};

export function homeView(root) {
  root.innerHTML = `<main class="home-page">
    <nav class="home-nav" aria-label="Điều hướng trang chủ">
      <a class="home-brand" href="#home-top" aria-label="Pilates Studio - Trang chủ">
        <span class="home-brand-mark">P</span>
        <span><strong>Pilates Studio</strong></span>
      </a>
      <div class="home-nav-links">
        <a href="#home-programs">Chương trình</a>
        <a href="#home-story">Triết lý</a>
        <a href="#home-contact">Liên hệ</a>
      </div>
      <a class="home-login-link" href="#/login">Đăng nhập <span>↗</span></a>
    </nav>

    <section class="home-hero" id="home-top">
      <div class="home-hero-content">
        <p class="eyebrow">MOVE WITH INTENTION <span></span> PILATES STUDIO</p>
        <h1>Một cơ thể<br><em>cân bằng.</em><br>Một tâm trí an yên.</h1>
        <p class="home-hero-copy">Không gian Pilates tinh tế dành cho hành trình trở về với chính bạn — từng nhịp thở, từng chuyển động.</p>
        <div class="home-hero-actions">
          <a class="btn btn-light" href="#home-programs">Khám phá lớp học <span>→</span></a>
          <a class="home-text-link" href="#home-story">Câu chuyện của chúng tôi <span>↓</span></a>
        </div>
      </div>
      <div class="home-scroll-cue"><span></span> Cuộn để khám phá</div>
    </section>

    <section class="home-intro" id="home-story">
      <div class="home-section-label"><span>01</span><span class="home-label-line"></span><span>THE STUDIO</span></div>
      <div class="home-intro-grid">
        <div><p class="eyebrow eyebrow-dark">YOUR SPACE TO RESET</p><h2>Nơi mỗi chuyển động<br><em>đều có chủ đích.</em></h2></div>
        <div class="home-intro-text"><p>Pilates Studio là nơi bạn tạm dừng nhịp sống vội vã để lắng nghe cơ thể. Với đội ngũ huấn luyện viên tận tâm và không gian được chăm chút, mỗi buổi tập là một khoảng thời gian chất lượng dành cho bạn.</p><a class="home-dark-link" href="#home-programs">Tìm lớp học phù hợp <span>↗</span></a></div>
      </div>
      <div class="home-stat-row"><div><strong>04</strong><span>Chương trình<br>chuyên biệt</span></div><div><strong>12+</strong><span>Huấn luyện viên<br>tận tâm</span></div><div><strong>500</strong><span>Hội viên đang<br>chuyển động</span></div><div><strong>01</strong><span>Không gian<br>chỉ dành cho bạn</span></div></div>
    </section>

    <section class="home-programs" id="home-programs">
      <div class="home-section-heading"><div><p class="eyebrow eyebrow-dark">OUR PROGRAMS</p><h2>Tìm nhịp điệu<br><em>của riêng bạn.</em></h2></div><p>Cho dù bạn mới bắt đầu hay đang muốn nâng cao kỹ thuật, chúng tôi có một lớp học dành cho hành trình của bạn.</p></div>
      <div class="home-program-grid">${programs.map(program => `<article class="home-program-card"><div class="home-program-number">${program.number}</div><div><h3>${program.title}</h3><p>${program.text}</p><a href="#/login" aria-label="Đăng nhập để xem ${program.title}">Xem lịch học <span>↗</span></a></div></article>`).join('')}</div>
    </section>

    <section class="home-quote"><div class="home-quote-mark">“</div><blockquote>Thay đổi cơ thể bạn,<br><em>thay đổi cách bạn sống.</em></blockquote><p>— Joseph Pilates</p></section>

    <section class="home-cta" id="home-contact"><div><p class="eyebrow">READY TO MOVE?</p><h2>Bắt đầu hành trình<br><em>của bạn hôm nay.</em></h2></div><a class="btn btn-light" href="#/login">Đăng nhập hệ thống <span>↗</span></a></section>

    <footer class="home-footer"><div class="home-brand"><span class="home-brand-mark">P</span><span><strong>Pilates Studio</strong></span></div><div><p>© Pilates Studio Management</p><p>hello@pilates.com</p></div><a href="#home-top" class="home-top-link">Về đầu trang ↑</a></footer>
  </main>`;

  root.querySelectorAll('.home-page a[href^="#"]').forEach(link => link.addEventListener('click', scrollToSection));
}
