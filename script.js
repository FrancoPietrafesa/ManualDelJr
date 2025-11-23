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

