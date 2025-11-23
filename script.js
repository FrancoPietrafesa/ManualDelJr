document.addEventListener('DOMContentLoaded', ()=>{
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(href.length>1){
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });
});

const API_ROOT = (window.location.origin.includes('5500') || window.location.hostname==='localhost') ? 'http://localhost:4000' : window.location.origin + '/api';

async function openPayment(method, course){
  const token = localStorage.getItem('token');
  if(!token){
    alert('Debes iniciar sesión antes de comprar.');
    window.location.href = 'auth.html';
    return;
  }
  if(method==='paypal'){
    const resp = await fetch(API_ROOT+'/api/paypal/create-order',{method:'POST',headers:{'Content-Type':'application/json', Authorization: 'Bearer '+token},body:JSON.stringify({course})});
    const data = await resp.json();
    if(data.approveUrl){
      window.location.href = data.approveUrl; // redirige a PayPal
    }else{
      alert('Error creando orden de PayPal');
      console.error(data);
    }
  } else if(method==='mercadopago'){
    const resp = await fetch(API_ROOT+'/api/mercadopago/create-preference',{method:'POST',headers:{'Content-Type':'application/json', Authorization: 'Bearer '+token},body:JSON.stringify({course})});
    const data = await resp.json();
    if(data.preference && data.preference.init_point){
      window.location.href = data.preference.init_point;
    }else{
      alert('Error creando preferencia MercadoPago');
      console.error(data);
    }
  } else {
    alert('Método no soportado');
  }
}

// Authentication helpers
async function registerUser(email,password,name){
  const r = await fetch(API_ROOT+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name})});
  return r.json();
}

async function loginUser(email,password){
  const r = await fetch(API_ROOT+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  return r.json();
}

async function fetchProfile(){
  const token = localStorage.getItem('token');
  if(!token) return null;
  const r = await fetch(API_ROOT+'/api/auth/profile',{headers:{Authorization:'Bearer '+token}});
  if(r.ok) return r.json();
  return null;
}

function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
}

// --- Simple i18n toggle (ES/EN) ---
const i18n = {
  en: {
    'hero.title': 'Manual del Junior',
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

function applyLocale(locale){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(i18n[locale] && i18n[locale][key]) el.textContent = i18n[locale][key];
  });
}

const langToggle = document.getElementById('langToggle');
if(langToggle){
  langToggle.setAttribute('role','button');
  const saved = localStorage.getItem('site_lang') || 'es';
  applyLocale(saved);
  langToggle.textContent = saved === 'es' ? 'EN' : 'ES';
  langToggle.setAttribute('aria-pressed', saved === 'en' ? 'true' : 'false');
  langToggle.setAttribute('aria-label', saved === 'es' ? 'Cambiar a Inglés' : 'Switch to Spanish');
  langToggle.addEventListener('click', ()=>{
    const current = localStorage.getItem('site_lang') || 'es';
    const next = current === 'es' ? 'en' : 'es';
    localStorage.setItem('site_lang', next);
    applyLocale(next);
    langToggle.textContent = next === 'es' ? 'EN' : 'ES';
    langToggle.setAttribute('aria-pressed', next === 'en' ? 'true' : 'false');
    langToggle.setAttribute('aria-label', next === 'es' ? 'Cambiar a Inglés' : 'Switch to Spanish');
  });
}

// --- Testimonials carousel auto-rotate ---
const testimonialsRoot = document.querySelector('.testimonials');
if(testimonialsRoot){
  const items = Array.from(testimonialsRoot.querySelectorAll('.testimonial'));
  const prevBtn = testimonialsRoot.querySelector('.test-prev');
  const nextBtn = testimonialsRoot.querySelector('.test-next');
  let idx = items.findIndex(it=>it.classList.contains('active'));
  if(idx < 0) idx = 0;

  function showTestimonial(i){
    items.forEach((it, j)=>{
      it.classList.toggle('active', j===i);
    });
  }

  // rotation controller + auto-resume
  let intervalId = null;
  let resumeTimer = null;
  const ROTATE_MS = 5000;
  const AUTO_RESUME_MS = 8000; // reanudar 8s después de la última interacción

  function startRotation(){
    if(intervalId) return; // already running
    intervalId = setInterval(()=>{
      idx = (idx+1) % items.length;
      showTestimonial(idx);
    }, ROTATE_MS);
    testimonialsRoot.classList.remove('paused');
    if(resumeTimer){ clearTimeout(resumeTimer); resumeTimer = null; }
  }
  function stopRotation(){
    if(intervalId) clearInterval(intervalId);
    intervalId = null;
    testimonialsRoot.classList.add('paused');
  }
  function scheduleAutoResume(ms = AUTO_RESUME_MS){
    if(resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(()=>{ startRotation(); resumeTimer = null; }, ms);
  }

  showTestimonial(idx);
  startRotation();

  // Pause on hover/focus; schedule resume after leave/blur
  testimonialsRoot.addEventListener('mouseenter', ()=>{ stopRotation(); });
  testimonialsRoot.addEventListener('mouseleave', ()=>{ scheduleAutoResume(); });
  testimonialsRoot.addEventListener('focusin', ()=>{ stopRotation(); });
  testimonialsRoot.addEventListener('focusout', ()=>{ scheduleAutoResume(); });

  // Prev/Next handlers (manual interaction pauses and schedules resume)
  function prev(){ idx = (idx - 1 + items.length) % items.length; showTestimonial(idx); }
  function next(){ idx = (idx + 1) % items.length; showTestimonial(idx); }

  if(prevBtn){
    prevBtn.addEventListener('click', ()=>{ prev(); stopRotation(); scheduleAutoResume(); });
    prevBtn.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prev(); stopRotation(); scheduleAutoResume(); } });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', ()=>{ next(); stopRotation(); scheduleAutoResume(); });
    nextBtn.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); stopRotation(); scheduleAutoResume(); } });
  }
}

// UI: reveal on scroll
function setupReveal(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
}

// UI: simple tilt effect for elements with data-tilt
function setupTilt(){
  document.querySelectorAll('[data-tilt]').forEach(card=>{
    card.addEventListener('mousemove',(e)=>{
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${(-y*6).toFixed(2)}deg) rotateY(${(x*6).toFixed(2)}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave',()=>{
      card.style.transform = '';
    });
  });
}

// Hero parallax subtle movement
function setupHeroParallax(){
  const hero = document.querySelector('.hero');
  const ill = document.querySelector('.hero-illustration');
  if(!hero || !ill) return;
  hero.addEventListener('mousemove', (e)=>{
    const rect = hero.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    // move illustration slightly
    ill.style.transform = `translate3d(${(cx*12).toFixed(2)}px, ${(cy*8).toFixed(2)}px, 0) rotate(${(cx*1.5).toFixed(2)}deg)`;
  });
  hero.addEventListener('mouseleave', ()=>{ if(ill) ill.style.transform = ''; });
}

// init UI effects
document.addEventListener('DOMContentLoaded', ()=>{
  setupReveal();
  setupTilt();
  setupHeroParallax();
});

