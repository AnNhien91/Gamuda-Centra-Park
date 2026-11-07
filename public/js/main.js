/* Gamuda Central Park — tương tác giao diện (vanilla JS, không phụ thuộc thư viện) */
(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Header: đổi nền khi cuộn ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menu.hidden = !open;
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => e.matches && setMenu(false));

  /* ---------- Hiệu ứng xuất hiện khi cuộn (stagger theo nhóm) ---------- */
  const revealEls = $$('.reveal');
  const groups = new Map();
  revealEls.forEach((el) => {
    const parent = el.parentElement;
    const idx = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(idx, 6) * 90}ms`);
    groups.set(parent, idx + 1);
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Đếm số ---------- */
  const counters = $$('[data-count]');
  const runCount = (el) => {
    const target = Number(el.dataset.count);
    const dur = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString('vi-VN');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Parallax nhẹ cho ảnh công viên ---------- */
  const parkImg = $('.park-media img');
  if (parkImg && !reduceMotion) {
    const park = $('.park');
    let ticking = false;
    const update = () => {
      const r = park.getBoundingClientRect();
      const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      parkImg.style.transform = `translate3d(0, ${progress * -60}px, 0)`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Đánh dấu mục menu đang xem ---------- */
  const navLinks = $$('[data-nav] a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const nio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((a) => {
            const active = a.getAttribute('href') === `#${e.target.id}`;
            a.classList.toggle('is-active', active);
            if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => nio.observe(s));
  }

  /* ---------- Tabs sản phẩm (WAI-ARIA, điều khiển bằng phím mũi tên) ---------- */
  $$('[data-tabs]').forEach((wrap) => {
    const tabs = $$('[role="tab"]', wrap);
    const select = (tab, focus = true) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(tabs[n]); }
      });
    });
  });

  /* ---------- Chọn sẵn "Sản phẩm quan tâm" khi bấm từ tab ---------- */
  const interestSelect = $('#f-interest');
  $$('[data-interest]').forEach((btn) => {
    btn.addEventListener('click', () => { if (interestSelect) interestSelect.value = btn.dataset.interest; });
  });

  /* ---------- Lightbox thư viện ảnh ---------- */
  const lightbox = $('[data-lightbox]');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const items = $$('[data-gallery] img');
    const lbImg = $('[data-lightbox-img]');
    const lbCap = $('[data-lightbox-caption]');
    let current = 0;
    let lastFocus = null;
    const show = (i) => {
      current = (i + items.length) % items.length;
      const img = items[current];
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = `${img.alt} · ${current + 1}/${items.length}`;
    };
    items.forEach((img, i) => {
      img.closest('button').addEventListener('click', () => {
        lastFocus = document.activeElement;
        show(i);
        lightbox.showModal();
      });
    });
    $('[data-lightbox-close]').addEventListener('click', () => lightbox.close());
    $('[data-lightbox-prev]').addEventListener('click', () => show(current - 1));
    $('[data-lightbox-next]').addEventListener('click', () => show(current + 1));
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
    });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('close', () => lastFocus && lastFocus.focus());
  }

  /* ---------- Form đăng ký tư vấn ---------- */
  const form = $('[data-lead-form]');
  if (form) {
    const status = $('[data-form-status]', form);
    const submit = $('[data-submit]', form);
    const success = $('[data-form-success]');
    const endpoint = (window.SITE_CONFIG && window.SITE_CONFIG.formEndpoint) || '/api/leads';

    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Vui lòng nhập họ tên.'),
      phone: (v) => (/^(\+?84|0)(3|5|7|8|9)\d{8}$/.test(v.replace(/[\s.\-()]/g, '')) ? '' : 'Số điện thoại chưa đúng định dạng (VD: 0901 234 567).'),
      email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Email chưa đúng định dạng.'),
      consent: (_v, el) => (el.checked ? '' : 'Vui lòng đồng ý để chúng tôi liên hệ.'),
    };
    const setError = (name, msg) => {
      const el = form.elements[name];
      const err = $(`#e-${name}`, form);
      if (!el || !err) return;
      err.textContent = msg || '';
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    };
    const validateField = (name) => {
      const el = form.elements[name];
      const msg = rules[name](el.value, el);
      setError(name, msg);
      return !msg;
    };
    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      el.addEventListener('blur', () => { if (el.value || name === 'consent') validateField(name); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) validateField(name); });
      el.addEventListener('change', () => { if (el.getAttribute('aria-invalid')) validateField(name); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      const invalid = Object.keys(rules).filter((n) => !validateField(n));
      if (invalid.length) { form.elements[invalid[0]].focus(); return; }

      const data = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        email: form.elements.email.value,
        interest: form.elements.interest.value,
        message: form.elements.message.value,
        website: form.elements.website.value,
        consent: form.elements.consent.checked,
      };

      submit.classList.add('is-loading');
      submit.setAttribute('aria-busy', 'true');
      $('.btn-label', submit).textContent = 'Đang gửi…';

      try {
        if (endpoint.startsWith('/')) {
          // Server Node.js
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            if (json.errors) {
              Object.entries(json.errors).forEach(([k, v]) => setError(k, v));
              const first = Object.keys(json.errors)[0];
              if (form.elements[first]) form.elements[first].focus();
            }
            throw new Error(json.message || 'Gửi chưa thành công. Vui lòng thử lại.');
          }
        } else {
          // Bản tĩnh: gửi tới Google Apps Script / dịch vụ ngoài
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            body: new URLSearchParams({ ...data, consent: String(data.consent), createdAt: new Date().toISOString() }),
          });
        }
        form.hidden = true;
        success.hidden = false;
        success.focus();
        if (window.dataLayer) window.dataLayer.push({ event: 'generate_lead', interest: data.interest });
      } catch (err) {
        status.textContent = err.message === 'Failed to fetch'
          ? 'Mất kết nối mạng. Vui lòng thử lại hoặc gọi hotline.'
          : err.message;
      } finally {
        submit.classList.remove('is-loading');
        submit.removeAttribute('aria-busy');
        $('.btn-label', submit).textContent = 'Gửi đăng ký';
      }
    });
  }

  /* ---------- Ẩn nút liên hệ nổi khi đang ở khu vực form ---------- */
  const floatContact = $('.float-contact');
  const contactSection = $('#lien-he');
  if (floatContact && contactSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => floatContact.classList.toggle('is-hidden', e.isIntersecting), { threshold: 0.15 })
      .observe(contactSection);
  }

  /* ---------- Năm hiện tại ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
