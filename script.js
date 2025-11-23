document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length > 1) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Initialize UI
  setupReveal();
  setupTilt();
  setupHeroParallax();
  setupButtonRipples();
  setupTransientBug();
  setupMobileMenu();
  setupScrollEffect();
  setupTestimonials();
  setupI18n();
});

const API_ROOT = (window.location.origin.includes('5500') || window.location.hostname === 'localhost') ? 'http://localhost:4000' : window.location.origin + '/api';

// --- Payment & Auth ---
async function openPayment(method, course) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Debes iniciar sesión antes de comprar.');
    window.location.href = 'auth.html';
    return;
  }
  if (method === 'paypal') {
    const resp = await fetch(API_ROOT + '/api/paypal/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ course }) });
    const data = await resp.json();
    if (data.approveUrl) window.location.href = data.approveUrl;
    else alert('Error creando orden de PayPal');
  } else if (method === 'mercadopago') {
    const resp = await fetch(API_ROOT + '/api/mercadopago/create-preference', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ course }) });
    const data = await resp.json();
    if (data.preference && data.preference.init_point) window.location.href = data.preference.init_point;
    else alert('Error creando preferencia MercadoPago');
  } else {
    alert('Método no soportado');
  }
}

async function registerUser(email, password, name) {
  const r = await fetch(API_ROOT + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
  return r.json();
}

async function loginUser(email, password) {
  const r = await fetch(API_ROOT + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return r.json();
}

async function fetchProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const r = await fetch(API_ROOT + '/api/auth/profile', { headers: { Authorization: 'Bearer ' + token } });
  if (r.ok) return r.json();
  return null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
}

// --- UI Effects ---
function setupScrollEffect() {
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) topbar.classList.add('scrolled');
      else topbar.classList.remove('scrolled');
    });
  }
}

function setupMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.topnav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !expanded);
    nav.classList.toggle('open');
    document.body.style.overflow = !expanded ? 'hidden' : '';
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

function setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .section').forEach(el => obs.observe(el));
}

function setupTilt() {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function setupHeroParallax() {
  const hero = document.querySelector('.hero');
  const ill = document.querySelector('.hero-illustration');
  if (!hero || !ill) return;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    ill.style.transform = `translate3d(${(cx * 8).toFixed(2)}px, ${(cy * 5).toFixed(2)}px, 0)`;
  });
  hero.addEventListener('mouseleave', () => { if (ill) ill.style.transform = ''; });
}

function setupButtonRipples() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      const rect = btn.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple';
      const size = Math.max(rect.width, rect.height) * 1.2;
      r.style.position = 'absolute';
      r.style.left = (e.clientX - rect.left - size / 2) + 'px';
      r.style.top = (e.clientY - rect.top - size / 2) + 'px';
      r.style.width = size + 'px';
      r.style.height = size + 'px';
      r.style.borderRadius = '50%';
      r.style.background = 'rgba(255,255,255,0.3)';
      r.style.transform = 'scale(0)';
      r.style.opacity = '1';
      r.style.pointerEvents = 'none';
      r.style.transition = 'transform 0.5s ease, opacity 0.5s ease';

      btn.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = 'scale(1)';
        r.style.opacity = '0';
      });
      setTimeout(() => r.remove(), 500);
    });
  });
}

function setupTransientBug() {
  const t = document.getElementById('transientBug');
  const target = document.getElementById('hero-info');
  if (!t || !target) return;

  function go() {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.classList.add('hide');
  }

  t.addEventListener('click', go);
  t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  });
  setTimeout(() => t.classList.add('hide'), 4500);
}

// --- Testimonials ---
function setupTestimonials() {
  const root = document.querySelector('.testimonials');
  if (!root) return;
  const items = Array.from(root.querySelectorAll('.testimonial'));
  const prevBtn = root.querySelector('.test-prev');
  const nextBtn = root.querySelector('.test-next');
  let idx = items.findIndex(it => it.classList.contains('active'));
  if (idx < 0) idx = 0;

  function show(i) {
    items.forEach((it, j) => it.classList.toggle('active', j === i));
    updateIndicators();
  }

  let intervalId = null;
  const ROTATE_MS = 5000;

  function start() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      idx = (idx + 1) % items.length;
      show(idx);
    }, ROTATE_MS);
  }
  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  show(idx);
  start();

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  if (prevBtn) prevBtn.addEventListener('click', () => { idx = (idx - 1 + items.length) % items.length; show(idx); });
  if (nextBtn) nextBtn.addEventListener('click', () => { idx = (idx + 1) % items.length; show(idx); });

  // Indicators
  const indicatorsRoot = root.querySelector('.test-indicators');
  if (indicatorsRoot) {
    items.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.addEventListener('click', () => { idx = i; show(idx); });
      indicatorsRoot.appendChild(btn);
    });
    updateIndicators();
  }

  function updateIndicators() {
    if (!indicatorsRoot) return;
    const btns = Array.from(indicatorsRoot.querySelectorAll('button'));
    btns.forEach((b, j) => b.classList.toggle('active', j === idx));
  }
}

// --- I18n ---
const i18n = {
  en: {
    'hero.title': 'Junior Manual',
    'hero.subtitle': 'From zero to hired — QA, tools, interviews',
    'cta.start': 'Start Learning',
    'testimonials.title': 'Testimonials',
    'hero.featuredTitle': 'Featured Course',
    'hero.featuredDesc': 'QA from zero — Learn testing, automation and teamwork.',
    'hero.f1': 'Hands-on exercises',
    'hero.f2': 'Practical templates',
    'hero.f3': 'Interview prep',
    'hero.enterCourse': 'Enter course',
    'nav.cursos': 'Courses',
    'nav.metodo': 'Method',
    'nav.testimonios': 'Testimonials',
    'nav.contacto': 'Contact'
  },
  es: {
    'hero.title': 'Manual del Junior',
    'hero.subtitle': 'De cero a junior — QA, herramientas, entrevistas',
    'cta.start': 'Comenzar ahora',
    'testimonials.title': 'Testimonios',
    'hero.featuredTitle': 'Curso destacado',
    'hero.featuredDesc': 'QA desde cero — Aprende a testear, automatizar y comunicarte con equipos.',
    'hero.f1': 'Ejercicios reales',
    'hero.f2': 'Plantillas prácticas',
    'hero.f3': 'Preparación de entrevistas',
    'hero.enterCourse': 'Entrar al curso',
    'nav.cursos': 'Cursos',
    'nav.metodo': 'Método',
    'nav.testimonios': 'Testimonios',
    'nav.contacto': 'Contacto'
  }
};

function setupI18n() {
  function applyLocale(locale) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[locale] && i18n[locale][key]) el.textContent = i18n[locale][key];
    });
  }

  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    const saved = localStorage.getItem('site_lang') || 'es';
    applyLocale(saved);
    langToggle.textContent = saved === 'es' ? 'EN' : 'ES';

    langToggle.addEventListener('click', () => {
      const current = localStorage.getItem('site_lang') || 'es';
      const next = current === 'es' ? 'en' : 'es';
      localStorage.setItem('site_lang', next);
      applyLocale(next);
      langToggle.textContent = next === 'es' ? 'EN' : 'ES';
    });
  }
}
