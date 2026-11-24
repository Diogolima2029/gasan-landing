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
// em assets/fotos/. Aceita .jpg, .jpeg, .png ou .webp com o mesmo nome.
// Enquanto não existe, fica o espaço reservado com o nome do arquivo.
const EXTS = ['jpg', 'jpeg', 'png', 'webp'];
document.querySelectorAll('.photo[data-src]').forEach((el) => {
  const base = el.dataset.src.replace(/\.[a-z]+$/i, '');
  const tryExt = (i) => {
    if (i >= EXTS.length) return;
    const src = `${base}.${EXTS[i]}`;
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage = `url("${src}")`;
      el.classList.add('has-photo');
    };
    img.onerror = () => tryExt(i + 1);
    img.src = src;
  };
  tryExt(0);
});

// Ano atual no rodapé
const ano = document.getElementById('ano');
if (ano) ano.textContent = new Date().getFullYear();
