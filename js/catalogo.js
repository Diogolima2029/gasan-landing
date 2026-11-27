// Catálogo GASAN: busca, filtros, paginação, ficha do produto e orçamento pelo WhatsApp.
(() => {
  // TODO: trocar pelo número real (55 + DDD + número), o mesmo do index.html
  const WHATSAPP = '5500000000000';
  const POR_PAGINA = 24;

  const D = window.CATALOGO;
  if (!D) return;

  const $ = (id) => document.getElementById(id);
  const norm = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Índices
  const catPorId = new Map(D.categorias.map((c) => [c.id, c]));
  const marcaPorId = new Map(D.marcas.map((m) => [m.id, m]));
  const catPorSlug = new Map(D.categorias.map((c) => [c.slug, c]));
  const marcaPorSlug = new Map(D.marcas.map((m) => [m.slug, m]));
  const filhos = new Map();
  D.categorias.forEach((c) => {
    if (c.pai) { if (!filhos.has(c.pai)) filhos.set(c.pai, []); filhos.get(c.pai).push(c); }
  });
  const descendentes = (id) => {
    const out = new Set([id]);
    (filhos.get(id) || []).forEach((f) => descendentes(f.id).forEach((x) => out.add(x)));
    return out;
  };
  const raizes = D.categorias.filter((c) => !c.pai);

  // A busca considera nome, marca e categorias (ex.: "registro docol")
  D.produtos.forEach((p) => {
    const extras = [...p.marcas.map((id) => marcaPorId.get(id)?.nome), ...p.cats.map((id) => catPorId.get(id)?.nome)];
    p._busca = norm([p.nome, p.marca, ...extras].join(' '));
  });
  const contar = (pred) => D.produtos.reduce((n, p) => n + (pred(p) ? 1 : 0), 0);
  const contCat = new Map(raizes.map((c) => { const ds = descendentes(c.id); return [c.id, contar((p) => p.cats.some((x) => ds.has(x)))]; }));
  D.categorias.filter((c) => c.pai).forEach((c) => { const ds = descendentes(c.id); contCat.set(c.id, contar((p) => p.cats.some((x) => ds.has(x)))); });
  const contMarca = new Map(D.marcas.map((m) => [m.id, contar((p) => p.marcas.includes(m.id))]));

  // ---- Estado (guardado na URL: ?q=&cat=&marca=&pag=&p=)
  const estado = { q: '', cat: '', marca: '', pag: 1, p: '' };
  const lerUrl = () => {
    const u = new URLSearchParams(location.search);
    estado.q = u.get('q') || '';
    estado.cat = u.get('cat') || '';
    estado.marca = u.get('marca') || '';
    estado.pag = Math.max(1, parseInt(u.get('pag'), 10) || 1);
    estado.p = u.get('p') || '';
  };
  const gravarUrl = (push) => {
    const u = new URLSearchParams();
    if (estado.q) u.set('q', estado.q);
    if (estado.cat) u.set('cat', estado.cat);
    if (estado.marca) u.set('marca', estado.marca);
    if (estado.pag > 1) u.set('pag', estado.pag);
    if (estado.p) u.set('p', estado.p);
    const url = location.pathname + (u.toString() ? '?' + u : '');
    try { history[push ? 'pushState' : 'replaceState'](null, '', url); } catch (e) { /* file:// em alguns navegadores */ }
  };

  // ---- Filtros (lista lateral)
  const listaCats = $('lista-cats');
  const listaMarcas = $('lista-marcas');
  const itemFiltro = (tipo, o, n, sub) => `<li${sub ? ' class="sub"' : ''}><button type="button" data-${tipo}="${o.slug}">${esc(o.nome)}<span>${n}</span></button></li>`;
  const ordenar = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  listaCats.innerHTML = raizes.filter((c) => contCat.get(c.id)).sort(ordenar).map((c) => {
    const subs = (filhos.get(c.id) || []).filter((f) => contCat.get(f.id)).sort(ordenar);
    return itemFiltro('cat', c, contCat.get(c.id)) + (subs.length ? `<li class="subs" data-de="${c.slug}"><ul>${subs.map((f) => itemFiltro('cat', f, contCat.get(f.id), true)).join('')}</ul></li>` : '');
  }).join('');
  listaMarcas.innerHTML = D.marcas.filter((m) => contMarca.get(m.id)).sort(ordenar).map((m) => itemFiltro('marca', m, contMarca.get(m.id))).join('');

  // ---- Filtragem
  const filtrar = () => {
    const termos = norm(estado.q).split(/\s+/).filter(Boolean);
    const cat = catPorSlug.get(estado.cat);
    const ds = cat ? descendentes(cat.id) : null;
    const marca = marcaPorSlug.get(estado.marca);
    return D.produtos.filter((p) =>
      (!ds || p.cats.some((x) => ds.has(x))) &&
      (!marca || p.marcas.includes(marca.id)) &&
      termos.every((t) => p._busca.includes(t)));
  };

  const nomeCat = (p) => {
    const c = catPorId.get(p.cats[0]);
    return c ? (c.pai && catPorId.get(c.pai) ? catPorId.get(c.pai).nome + ' › ' : '') + c.nome : 'Produtos';
  };
  const precoTxt = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  const imagem = (p) => (p.imagem
    ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">`
    : '<span class="ph"><img src="assets/logo-gasan.png" alt="" loading="lazy"><small>Imagem em breve</small></span>');
  const linkWhats = (p) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá! Gostaria de um orçamento de: ${p.nome}${p.opcoes && p.opcoes.length ? ' (opção: ___)' : ''}`)}`;

  // ---- Renderização
  const grade = $('grade');
  const render = () => {
    const lista = filtrar();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    if (estado.pag > paginas) estado.pag = paginas;
    const ini = (estado.pag - 1) * POR_PAGINA;
    const pagina = lista.slice(ini, ini + POR_PAGINA);

    $('contagem').textContent = lista.length
      ? `${lista.length.toLocaleString('pt-BR')} produto${lista.length > 1 ? 's' : ''}${paginas > 1 ? ` · página ${estado.pag} de ${paginas}` : ''}`
      : 'Nenhum produto encontrado';

    grade.innerHTML = pagina.length ? pagina.map((p) => `
      <li class="card">
        <button type="button" class="card__link" data-abrir="${p.slug}">
          <span class="card__img">${imagem(p)}</span>
          <span class="card__cat">${esc(nomeCat(p))}</span>
          <span class="card__nome">${esc(p.nome)}</span>
          ${p.preco != null ? `<span class="card__preco">${precoTxt(p.preco)}</span>` : ''}
        </button>
        <a class="card__orcar" href="${linkWhats(p)}" target="_blank" rel="noopener">Solicitar orçamento</a>
      </li>`).join('') : `
      <li class="vazio"><strong>Não encontramos esse produto no catálogo.</strong>
      <p>Trabalhamos com vários fornecedores: mande o que precisa e buscamos para você.</p>
      <a class="btn btn--whatsapp" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Estou procurando: ' + (estado.q || ''))}">Perguntar pelo WhatsApp</a></li>`;

    // Paginação
    const pg = $('paginacao');
    if (paginas <= 1) { pg.innerHTML = ''; } else {
      const nums = new Set([1, paginas, estado.pag - 1, estado.pag, estado.pag + 1].filter((n) => n >= 1 && n <= paginas));
      let ant = 0; let html = `<button type="button" data-pag="${estado.pag - 1}" ${estado.pag === 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>`;
      [...nums].sort((a, b) => a - b).forEach((n) => {
        if (n - ant > 1) html += '<span>…</span>';
        html += `<button type="button" data-pag="${n}" ${n === estado.pag ? 'aria-current="page"' : ''}>${n}</button>`;
        ant = n;
      });
      html += `<button type="button" data-pag="${estado.pag + 1}" ${estado.pag === paginas ? 'disabled' : ''} aria-label="Próxima página">→</button>`;
      pg.innerHTML = html;
    }

    // Filtros ativos
    document.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === estado.cat));
    document.querySelectorAll('[data-marca]').forEach((b) => b.classList.toggle('is-active', b.dataset.marca === estado.marca));
    const catAtual = catPorSlug.get(estado.cat);
    const raizAtual = catAtual ? (catAtual.pai ? catPorId.get(catAtual.pai) : catAtual) : null;
    document.querySelectorAll('.subs').forEach((s) => s.classList.toggle('is-open', raizAtual && s.dataset.de === raizAtual.slug));

    const chips = [];
    if (estado.q) chips.push(['q', `Busca: “${estado.q}”`]);
    if (catAtual) chips.push(['cat', catAtual.nome]);
    if (marcaPorSlug.get(estado.marca)) chips.push(['marca', marcaPorSlug.get(estado.marca).nome]);
    $('chips').innerHTML = chips.map(([k, t]) => `<button type="button" data-tirar="${k}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('');
  };

  // ---- Ficha do produto
  const ficha = $('ficha');
  const abrirFicha = (slug, push) => {
    const p = D.produtos.find((x) => x.slug === slug);
    if (!p) return;
    estado.p = slug; gravarUrl(push);
    $('ficha-img').innerHTML = imagem(p);
    $('ficha-cat').textContent = nomeCat(p);
    $('ficha-nome').textContent = p.nome;
    const marcas = p.marcas.map((id) => marcaPorId.get(id)?.nome).filter(Boolean);
    // A fonte às vezes liga um produto a várias marcas: só mostra quando é inequívoco
    const marca = p.marca || (marcas.length === 1 ? marcas[0] : '');
    $('ficha-marca').textContent = marca ? `Marca: ${marca}` : '';
    $('ficha-desc').textContent = p.descricao || '';
    if (p.embalagem) $('ficha-desc').textContent = [p.descricao, `Embalagem: ${p.embalagem}`].filter(Boolean).join(' · ');
    $('ficha-opcoes').innerHTML = p.opcoes && p.opcoes.length
      ? `<strong>Opções disponíveis</strong><ul>${p.opcoes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : '';
    $('ficha-preco').textContent = precoTxt(p.preco);
    $('ficha-orcar').href = linkWhats(p);
    document.title = `${p.nome} | GASAN`;
    if (!ficha.open) ficha.showModal();
  };
  const fecharFicha = () => {
    if (ficha.open) ficha.close();
  };
  ficha.addEventListener('close', () => {
    if (estado.p) { estado.p = ''; gravarUrl(false); }
    document.title = 'Catálogo | GASAN Materiais de Construção';
  });
  ficha.addEventListener('click', (e) => { if (e.target === ficha) fecharFicha(); });
  $('ficha-fechar').addEventListener('click', fecharFicha);

  // ---- Eventos
  const busca = $('busca');
  let timer;
  busca.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { estado.q = busca.value.trim(); estado.pag = 1; gravarUrl(false); render(); }, 180);
  });

  const filtros = $('filtros');
  const toggle = $('abrir-filtros');
  const setFiltros = (open) => { filtros.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setFiltros(!filtros.classList.contains('is-open')));

  const topo = () => document.querySelector('.resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cat !== undefined) {
      estado.cat = estado.cat === b.dataset.cat ? '' : b.dataset.cat; estado.pag = 1; gravarUrl(true); render(); setFiltros(false); topo();
    } else if (b.dataset.marca !== undefined) {
      estado.marca = estado.marca === b.dataset.marca ? '' : b.dataset.marca; estado.pag = 1; gravarUrl(true); render(); setFiltros(false); topo();
    } else if (b.dataset.pag) {
      estado.pag = Number(b.dataset.pag); gravarUrl(true); render(); topo();
    } else if (b.dataset.abrir) {
      abrirFicha(b.dataset.abrir, true);
    } else if (b.dataset.tirar) {
      if (b.dataset.tirar === 'q') busca.value = '';
      estado[b.dataset.tirar] = ''; estado.pag = 1; gravarUrl(true); render();
    } else if (b.id === 'limpar') {
      Object.assign(estado, { q: '', cat: '', marca: '', pag: 1 }); busca.value = ''; gravarUrl(true); render();
    }
  });

  window.addEventListener('popstate', () => {
    lerUrl(); busca.value = estado.q; render();
    if (estado.p) abrirFicha(estado.p, false); else fecharFicha();
  });

  lerUrl();
  busca.value = estado.q;
  render();
  if (estado.p) abrirFicha(estado.p, false);
})();
