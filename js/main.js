// Menu mobile
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

if (toggle && nav) {
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

// Fotos: cada espaço com data-src mostra a foto quando o arquivo existe
// em assets/fotos/. Enquanto não existe, fica o espaço reservado com o nome do arquivo.
document.querySelectorAll('.photo[data-src]').forEach((el) => {
  const src = el.dataset.src;
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url("${src}")`;
    el.classList.add('has-photo');
  };
  img.src = src;
});

// Ano atual no rodapé
const ano = document.getElementById('ano');
if (ano) ano.textContent = new Date().getFullYear();

// ===== Carrosséis (Swiper) =====
if (window.Swiper) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const auto = (delay) => (reduce ? false : { delay, disableOnInteraction: false, pauseOnMouseEnter: true });

  // Topo: fade de 800 ms a cada 5 s, em loop
  new Swiper('.hs', {
    effect: 'fade', fadeEffect: { crossFade: true },
    speed: 800, loop: true, autoplay: auto(5000),
    pagination: { el: '.hs .swiper-pagination', clickable: true },
    navigation: { nextEl: '.hs .swiper-button-next', prevEl: '.hs .swiper-button-prev' },
  });

  // Produtos: imagem desliza na horizontal e o texto troca em fade (700 ms)
  const prodText = new Swiper('.prod-text', {
    effect: 'fade', fadeEffect: { crossFade: true }, speed: 700, loop: true, allowTouchMove: false, autoHeight: true,
  });
  const prodCount = document.getElementById('prod-count');
  const prodImg = new Swiper('.prod-img', {
    speed: 700, loop: true,
    navigation: { nextEl: '.prod-next', prevEl: '.prod-prev' },
    controller: { control: prodText },
    on: { slideChange(s) { if (prodCount) prodCount.textContent = `${String(s.realIndex + 1).padStart(2, '0')} / ${String(s.slides.length).padStart(2, '0')}`; } },
  });
  // Faixa de categorias abre o produto certo
  document.querySelectorAll('[data-produto]').forEach((a) => {
    a.addEventListener('click', () => prodImg.slideToLoop(Number(a.dataset.produto)));
  });

  // Como funciona: imagem sobe na vertical e o texto troca em fade (600 ms)
  const servText = new Swiper('.serv-text', {
    effect: 'fade', fadeEffect: { crossFade: true }, speed: 600, loop: true, allowTouchMove: false, autoHeight: true,
  });
  const passos = document.querySelectorAll('.sv-list li');
  const servImg = new Swiper('.serv-img', {
    direction: 'vertical', speed: 600, loop: true, autoplay: auto(4000),
    navigation: { nextEl: '.serv-next', prevEl: '.serv-prev' },
    controller: { control: servText },
    on: { slideChange(s) { passos.forEach((li, i) => li.classList.toggle('is-active', i === s.realIndex)); } },
  });
  passos.forEach((li, i) => li.addEventListener('click', () => servImg.slideToLoop(i)));
}

// ===== Elementos aparecem ao rolar =====
const revelar = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revelar.forEach((el) => io.observe(el));
} else {
  revelar.forEach((el) => el.classList.add('is-visible'));
}

// ===== Menu fica branco ao rolar a página =====
const header = document.querySelector('.header--over');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
