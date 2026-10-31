/* ============================================================
   ETERNUM SITES — Immersive engine
   Lenis smooth scroll · GSAP ScrollTrigger · Hero editorial
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = window.matchMedia('(hover: none)').matches;

/* ---------------- Lenis smooth scroll ---------------- */
const lenis = new Lenis({ duration: 1.15, smoothWheel: !REDUCED });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
/* lagSmoothing(0) (do recipe oficial Lenis+GSAP) faz o relógio do GSAP PULAR
   quando a main thread trava (shader, GC, rede) — a animação dá "pulo" em vez
   de continuar fluida. Com limite 300ms→30ms os travamentos viram micro-pausa. */
gsap.ticker.lagSmoothing(300, 30);

/* anchor links via lenis */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: 0 }); }
  });
});

/* ---------------- split-text utility ---------------- */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const inners = [];
  words.forEach((word, i) => {
    const mask = document.createElement('span');
    mask.className = 'w';
    const inner = document.createElement('span');
    inner.className = 'wi';
    inner.textContent = word;
    mask.appendChild(inner);
    el.appendChild(mask);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    inners.push(inner);
  });
  return inners;
}

/* ---------------- scroll progress bar ---------------- */
gsap.to('.progress__bar', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
});

/* ---------------- nav hide / show ---------------- */
const nav = document.querySelector('.nav');
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  if (scroll > 140 && scroll > lastY) {
    gsap.to(nav, { yPercent: -120, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
  } else {
    gsap.to(nav, { yPercent: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
  }
  lastY = scroll;
});


/* ============================================================
   HERO MCF - editorial image reveal + scroll parallax (sem WebGL)
   Foto pura em img cover, revelacao por clip-path + zoom-out
   no intro, parallax + fade no scroll, micro-parallax no mouse.
   ============================================================ */
const heroEl = document.querySelector('.hero');
const heroImg = document.querySelector('.hero__img');
const heroMedia = document.querySelector('.hero__media');

if (heroEl && heroImg && !REDUCED) {
  gsap.set(heroImg, { scale: 1.18, clipPath: 'inset(7% 5% 7% 5%)' });
  /* Zoom-out fluido no scroll: a imagem RECOLHE (diminui) com scrub amortecido.
     Scale vai no WRAPPER (o intro é dono do scale/clip do IMG) — sem briga de tweens,
     e scrub numérico (1s de catch-up) em vez de `true` para não saltar. */
  if (heroMedia) {
    gsap.fromTo(heroMedia,
      { scale: 1, yPercent: 0 },
      {
        scale: 0.9, yPercent: 10, ease: 'none', transformOrigin: '50% 42%',
        scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 1, invalidateOnRefresh: true },
      });
  }
  gsap.to('.hero__content', {
    yPercent: -16, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: heroEl, start: 'top top', end: '72% top', scrub: 1 },
  });
  if (!TOUCH) {
    /* FIX1: mousemove só em X (±8px) — sem briga de y com o parallax */
    const qx = gsap.quickTo(heroImg, 'x', { duration: 0.9, ease: 'power3' });
    window.addEventListener('mousemove', (e) => {
      qx((e.clientX / window.innerWidth - 0.5) * 8);
    });
  }
  /* FIX1: recalcula triggers após fontes/imagens (evita salto de medição) */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
} else if (heroEl && heroImg) {
  gsap.set(heroImg, { scale: 1, clipPath: 'inset(0% 0% 0% 0%)' });
}


/* ============================================================
   PRELOADER + INTRO
   ============================================================ */
(function preloader() {
  const pre = document.querySelector('.preloader');
  const countEl = document.querySelector('.preloader__count');
  if (!pre) return;
  const SKIP = REDUCED || new URLSearchParams(location.search).has('nointro');
  const stripImgs = gsap.utils.toArray('.preloader__strip img');
  lenis.stop();

  /* segurança: nenhuma falha de animação pode deixar a página presa na cortina */
  window.setTimeout(() => {
    if (getComputedStyle(pre).display !== 'none') {
      pre.style.display = 'none';
      gsap.set('.hero__title .ln > span', { y: 0 });
      gsap.set('.hero__img', { scale: 1, clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.set('[data-manifesto] .sw', { opacity: 1 });
      gsap.set('.manifesto__by', { opacity: 1, y: 0 });
      gsap.set('.manifesto__bg img', { opacity: 1, scale: 1 });
      gsap.set('.footer__word .fw', { y: 0, opacity: 1, color: '#fff' });
      lenis.start();
    }
  }, SKIP ? 500 : 7000);

  /* flicker strip while the counter runs (Vendome-style) */
  let stripTimer = null;
  if (stripImgs.length) {
    stripImgs[0].classList.add('is-on');
    if (stripImgs.length > 1 && !SKIP) {
      let si = 0;
      stripTimer = window.setInterval(() => {
        stripImgs[si].classList.remove('is-on');
        si = (si + 1) % stripImgs.length;
        stripImgs[si].classList.add('is-on');
      }, 320);
    }
  }

  const state = { v: 0 };
  const intro = gsap.timeline({ paused: true, timeScale: SKIP ? 100 : 1, onComplete: () => ScrollTrigger.refresh() });

  intro
    .to(['.preloader__count', '.preloader__center', '.preloader__meta'], { opacity: 0, duration: 0.38, ease: 'power2.in' })
    .add(() => { if (stripTimer) clearInterval(stripTimer); }, 0)
    .to('.preloader__panel--top', { yPercent: -101, duration: 1.05, ease: 'expo.inOut' }, '<+0.12')
    .to('.preloader__panel--bottom', { yPercent: 101, duration: 1.05, ease: 'expo.inOut' }, '<')
    .set(pre, { display: 'none' })
    .add(() => lenis.start(), '-=0.6')
    .to('.hero__title .ln > span', { y: 0, duration: 1.2, ease: 'power4.out', stagger: 0.09 }, '-=0.55')
    .from('.hero__eyebrow, .hero__meta, .hero__row', { opacity: 0, y: 26, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=0.8');

  if (!REDUCED) {
    intro.to('.hero__img', { scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.9, ease: 'expo.out' }, 0.45);
  } else {
    gsap.set('.hero__img', { scale: 1, clipPath: 'inset(0% 0% 0% 0%)' });
  }

  gsap.timeline()
    .to(state, {
      v: 100, duration: SKIP ? 0.01 : 2.0, ease: 'power2.inOut',
      onUpdate: () => { countEl.textContent = String(Math.round(state.v)).padStart(3, '0'); },
    })
    .add(() => intro.play(), SKIP ? 0 : '+=0.08');
})();

/* ============================================================
   MANIFESTO MCF - cortina + acendimento (difere do everton/bruna)
   ============================================================ */
/* MANIFESTO MCF - scrub-words estilo everton-pieri (sem mascara: nunca some) */
/* MANIFESTO MCF part A */
document.querySelectorAll('[data-manifesto]').forEach((el) => {
  const spans = [];
  const splitNode = (textNode, parent) => {
    const frag = document.createDocumentFragment();
    textNode.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = part;
      frag.appendChild(s);
      spans.push(s);
    });
    parent.replaceChild(frag, textNode);
  };
  const walk = (parent) => {
    Array.prototype.slice.call(parent.childNodes).forEach((node) => {
      if (node.nodeType === 3) splitNode(node, parent);
      else if (node.nodeType === 1) walk(node);
    });
  };
  walk(el);
  if (!spans.length) return;
  const rule = document.createElement('div');
  rule.className = 'manifesto__rule';
  el.after(rule);
  const by = el.parentElement ? el.parentElement.querySelector('.manifesto__by') : null;
  const bgImg = el.parentElement ? el.parentElement.querySelector('.manifesto__bg img') : null;
  if (REDUCED) {
    gsap.set(spans, { opacity: 1 });
    gsap.set(rule, { scaleX: 1 });
    if (by) gsap.set(by, { opacity: 1, y: 0 });
    if (bgImg) gsap.set(bgImg, { opacity: 1, scale: 1 });
    return;
  }
  /* fundo entra junto (mantido) + parallax -6/6 (mantido) */
  if (bgImg) {
    gsap.fromTo(bgImg, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
    gsap.fromTo(bgImg, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  gsap.to(spans, {
    opacity: 1, ease: 'none', stagger: 0.06,
    scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 58%', scrub: 0.4 },
  });
  gsap.to(rule, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 68%', end: 'bottom 50%', scrub: 0.4 },
  });
  if (by) {
    gsap.to(by, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 55%', toggleActions: 'play none none reverse' },
    });
  }
  /* safety: sem mascara o texto base ja e visivel (.13); 6s apos load forca spans/by/bg se trigger nao disparou */
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      try {
        if (bgImg && parseFloat(getComputedStyle(bgImg).opacity) < 0.1) {
          gsap.set(bgImg, { opacity: 1, scale: 1, yPercent: 0 });
        }
        spans.forEach((s) => {
          if (s && parseFloat(getComputedStyle(s).opacity) < 0.2) gsap.set(s, { opacity: 1 });
        });
        if (by && parseFloat(getComputedStyle(by).opacity) < 0.1) {
          gsap.set(by, { opacity: 1, y: 0 });
        }
      } catch (e) {}
    }, 6000);
  });
});

/* FIX2 (a): recalcula posições após imagens/fontes — trigger top 80% nunca erra */
window.addEventListener('load', () => ScrollTrigger.refresh());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

/* ============================================================
   FOOTER MCF - wordmark por letra (difere do outline estatico)
   ============================================================ */
(function footerWord() {
  const fw = document.querySelector('[data-footer-word]');
  if (!fw) return;
  const text = fw.textContent;
  fw.textContent = '';
  fw.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < text.length; k++) {
    const s = document.createElement('span');
    s.className = 'fw';
    if ('xX'.indexOf(text[k]) > -1) s.classList.add('fw--x');
    s.textContent = (text[k] === ' ') ? ' ' : text[k];
    fw.appendChild(s);
  }
  const letters = fw.querySelectorAll('.fw');
  if (!letters.length) return;
  if (REDUCED) {
    gsap.set(letters, { yPercent: 0, opacity: 1, color: '#fff' });
    return;
  }
  gsap.fromTo(letters, { yPercent: 26, xPercent: 8, opacity: 0 }, {
    yPercent: 0, xPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.035,
    scrollTrigger: { trigger: fw, start: 'top 90%' },
  });
  /* letras sobem ja deslizando da direita; o wrapper NUNCA recebe
     transform/opacity <1, senao cria stacking context e o mix-blend-mode
     do .fw--x para de enxergar a foto do footer */
})();

/* ============================================================
   SCROLL REVEALS
   ============================================================ */
if (!REDUCED) {
  /* word-masked headings & quotes */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const words = splitWords(el);
    gsap.to(words, {
      y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.04,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  /* generic fade-up (todas as seções, EXCETO a história — ela tem batch próprio) */
  document.querySelectorAll('section:not(#historia) [data-fade], main > [data-fade], .video-wrap[data-fade]').forEach((el) => {
    if (el.closest('#historia')) return;
    if (el.closest('[data-bookswap]') || el.classList.contains('manifesto__by')) return;
    gsap.from(el, {
      opacity: 0, y: 34, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  /* ghost word -- scroll drift */
  document.querySelectorAll('.ghost').forEach((g) => {
    gsap.fromTo(g, { xPercent: 6 }, {
      xPercent: -14, ease: 'none',
      scrollTrigger: { trigger: g.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* HISTÓRIA (seção 2) — design original, só que fluido.
     A causa dos saltos: cada [data-fade] criava seu próprio ScrollTrigger
     com trigger/start próprios + parallax com scrub na MESMA imagem. Quando
     os triggers recalculavam (imagens carregando, resize, Lenis), cada um
     disparava em momento distinto = salto visível.
     Correção sem mudar o visual:
     1) UM único ScrollTrigger por seção (#historia) com scrub amortecido
        controla a imagem (zoom-out 1.20→1.08 + parallax) de forma contínua;
     2) os textos/números usam UMA timeline de entrada por lote (batch),
        sem scrub — entram uma vez, juntos e suaves;
     3) invalidateOnRefresh + refresh após as imagens carregarem, para as
        posições nunca serem calculadas com altura errada. */
  (function historiaFluid() {
    const section = document.querySelector('#historia');
    if (!section) return;
    const frame = section.querySelector('.frame');
    const img = frame && frame.querySelector('img');
    if (img) {
      gsap.set(img, { scale: 1.2, yPercent: -4, transformOrigin: 'center center' });
      gsap.to(img, {
        scale: 1.08, yPercent: 5, ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top bottom', end: 'bottom top',
          scrub: 1.2, invalidateOnRefresh: true,
        },
      });
    }
    const items = section.querySelectorAll('[data-fade]');
    if (items.length) {
      gsap.set(items, { opacity: 0, y: 34 });
      ScrollTrigger.batch(items, {
        start: 'top 92%', once: true,
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09,
        }),
      });
    }
    const snapRefresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapRefresh);
    window.addEventListener('load', snapRefresh);
  })();

  /* image parallax inside frames (DEMAIS seções — fora da história) */
  document.querySelectorAll('section:not(#historia) .frame img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: {
        trigger: img.closest('.frame'), start: 'top bottom', end: 'bottom top',
        scrub: 0.8, invalidateOnRefresh: true,
      },
    });
  });

  /* quote band background drift */
  document.querySelectorAll('.quoteband__bg').forEach((bg) => {
    gsap.fromTo(bg, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: bg.closest('.quoteband'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* footer outline word: entrada fica 100% nas letras (footerWord());
     animar o wrapper isolaria o .fw--x do mix-blend-mode */
} else {
  document.querySelectorAll('.wi').forEach((w) => (w.style.transform = 'none'));
}

/* ============================================================
   STATS — count-up (reveal tratado pelo batch da própria seção)
   ============================================================ */
document.querySelectorAll('.stat__num[data-count]').forEach((el) => {
  const end = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const state = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 92%', once: true,
    onEnter: () => gsap.to(state, {
      v: end, duration: REDUCED ? 0.01 : 1.8, ease: 'power3.out',
      onUpdate: () => {
        el.innerHTML = prefix + Math.round(state.v).toLocaleString('pt-BR') + (suffix ? `<sup>${suffix}</sup>` : '');
      },
    }),
  });
});

/* ============================================================
   MARQUEES — text + gallery (infinite, speed via data-speed)
   ============================================================ */
document.querySelectorAll('[data-marquee]').forEach((wrap) => {
  const track = wrap.querySelector('.marquee__track, .gallery__track');
  if (!track) return;
  track.innerHTML += track.innerHTML; /* duplicate for seamless loop */
  const dir = wrap.dataset.dir === 'right' ? 1 : -1;
  const dur = parseFloat(wrap.dataset.speed || '30');
  let tween;

  function build() {
    if (tween) tween.kill();
    gsap.set(track, { x: 0 });
    const kids = track.children;
    const period = kids.length > 1 ? kids[kids.length / 2].offsetLeft : 0;
    if (!period) return;
    tween = gsap.fromTo(track,
      { x: dir === 1 ? -period : 0 },
      { x: dir === 1 ? 0 : -period, duration: dur, ease: 'none', repeat: -1 });
    if (REDUCED) tween.pause(0);
  }
  build();

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 250); });
  wrap.addEventListener('mouseenter', () => tween && gsap.to(tween, { timeScale: 0.25, duration: 0.5 }));
  wrap.addEventListener('mouseleave', () => tween && gsap.to(tween, { timeScale: 1, duration: 0.5 }));
});

/* ============================================================
   ROWS — hover invert + imagem flutuante CENTRADA no cursor.
   Cada tópico mostra sua imagem (data-img) exatamente onde o mouse
   está: x/y via transform (GPU, sem layout thrash), centro da imagem
   no cursor (xPercent/yPercent -50) e troca de src com pré-load +
   crossfade para não piscar.
   ============================================================ */
(function rowsPreview() {
  const rowsWrap = document.querySelector('.rows');
  const preview = document.querySelector('.row-preview');
  if (!rowsWrap || !preview || TOUCH) return;
  const img = preview.querySelector('img');
  const rows = Array.prototype.slice.call(rowsWrap.querySelectorAll('.row'));
  if (!rows.length || !img) return;

  /* pré-carrega todas as imagens dos tópicos */
  rows.forEach((row) => {
    const src = row.dataset.img;
    if (src) { const pre = new Image(); pre.src = src; }
  });

  /* estado inicial: centrada no cursor, encolhida e invisível */
  gsap.set(preview, {
    xPercent: -50, yPercent: -50, x: -9999, y: -9999,
    scale: 0.85, autoAlpha: 0, transformOrigin: 'center center',
  });
  const qx = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3' });
  const qy = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3' });
  let currentSrc = img.getAttribute('src');
  let visible = false;

  /* segue o cursor em QUALQUER lugar da seção (não só sobre as linhas),
     então a imagem nasce grudada no mouse — sem teleporte/atraso */
  /* a seção no ferreirinha se chama #ecossistema (antes era #imperio, id do
     site do Everton — null.addEventListener derrubava TODO o JS abaixo: video
     expand, bookswap, footer word...). Guarda extra por segurança. */
  const rowSec = document.querySelector('#ecossistema') || rowsWrap.closest('section') || rowsWrap;
  if (rowSec) rowSec.addEventListener('mousemove', (e) => {
    qx(e.clientX); qy(e.clientY);
  });

  /* KARBONNA: posicao de enquadramento por foto (rosto sempre visivel) */
  const FACE_POS = { 'kb-white':'50% 50%', 'kb-palestra':'50% 30%', 'kb-editorial':'50% 15%', 'kb-cream':'50% 26%', 'kb-retrato':'50% 38%', 'kb-hero':'50% 20%', 'kb-studio':'50% 15%', 'kb-quote':'50% 42%' };
  function show(src) {
    if (src && src !== currentSrc) {
      currentSrc = src;
      /* crossfade: garante que a nova imagem já carregou antes de exibir */
      const next = new Image();
      next.onload = () => img.setAttribute('src', src);
      next.src = src;
      if (next.complete) img.setAttribute('src', src);
      const key = (src.split('/').pop() || '').replace('.jpg', '');
      if (FACE_POS[key]) img.style.objectPosition = FACE_POS[key];
    }
    if (!visible) {
      visible = true;
      gsap.to(preview, {
        autoAlpha: 1, scale: 1, rotate: 0,
        duration: 0.45, ease: 'power3.out', overwrite: 'auto',
      });
    }
  }
  function hide() {
    visible = false;
    gsap.to(preview, {
      autoAlpha: 0, scale: 0.85,
      duration: 0.32, ease: 'power2.in', overwrite: 'auto',
    });
  }

  rows.forEach((row) => {
    row.addEventListener('mouseenter', (e) => {
      /* posiciona IMEDIATAMENTE no ponto de entrada (sem lag do quickTo) */
      qx(e.clientX); qy(e.clientY);
      gsap.set(preview, { x: e.clientX, y: e.clientY });
      show(row.dataset.img);
    });
    row.addEventListener('mousemove', (e) => { qx(e.clientX); qy(e.clientY); });
    row.addEventListener('mouseleave', hide);
  });
  rowsWrap.addEventListener('mouseleave', hide);
})();

/* toque na linha (mobile): abre/fecha o subtítulo com efeito */
document.querySelectorAll('.rows .row').forEach((row) => {
  row.addEventListener('click', () => {
    const rows = row.closest('.rows');
    const wasOpen = row.classList.contains('is-open');
    rows.querySelectorAll('.row.is-open').forEach((r) => r.classList.remove('is-open'));
    if (!wasOpen) row.classList.add('is-open');
  });
});

/* ============================================================
   VIDEO — scroll EXPAND (ocupa toda a largura) + click expande em tela cheia
   O .video-bleed já é full-bleed no CSS; aqui o scroll anima:
   inset arredondado → bordas da tela (clip-path + scale do vídeo),
   com scrub amortecido. 1º clique: play inline · 2º: fullscreen · ✕/Esc: fecha.
   ============================================================ */
(function videoScrollExpand() {
  const bleed = document.querySelector('.video-bleed');
  const wrap = bleed && bleed.querySelector('.video-wrap');
  const video = wrap && (wrap.querySelector('video') || wrap.querySelector('.video-wrap__poster'));
  if (!bleed || !wrap || !video) return;

  /* Estado inicial: um "cartão" levemente inset, cantos suaves.
     IMPORTANTE: o `from` e o `to` precisam ter a MESMA quantidade de números.
     Com `inset(2% 4% 2% 4% round 4px)` (4 valores) indo para
     `inset(0% 0% 0% 0% round 0px)` (4 valores), o browser normaliza o
     `from` para 3 números e o GSAP emparela por posição — sobrando slots
     zerados, o que fazia o lado ESQUERDO chegar a 0% já em p=0.25 enquanto o
     direito ainda estava em 3% (vídeo "preenchido pela esquerda").
     Usando a forma encurtada nos dois extremos a interpolação é simétrica. */
  gsap.set(wrap, { clipPath: 'inset(2% 4% round 4px)' });
  /* EXPAND: chega à TELA CHEIA quando o topo do vídeo ainda está a 38% da
     viewport — antes de o usuário sair da seção. Timing idêntico ao
     videoScrollExpand do everton-pieri (top 92% → top 38%), sem pin:
     o full-bleed simétrico é do CSS (.video-bleed). */
  gsap.to(wrap, {
    clipPath: 'inset(0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: bleed, start: 'top 92%', end: 'top 38%', scrub: 0.8, invalidateOnRefresh: true },
  });
  /* o vídeo respira junto: zoom-out até preencher as bordas */
  gsap.fromTo(video, { scale: 1.16 }, {
    scale: 1.02, ease: 'none',
    scrollTrigger: { trigger: bleed, start: 'top 92%', end: 'top 38%', scrub: 0.8, invalidateOnRefresh: true },
  });

  const closeBtn = wrap.querySelector('.video-wrap__close');
  const isYT = wrap.classList.contains('video-wrap--yt');
  const safePlay = () => { try { if (video.paused) video.play(); } catch (e) {} };
  const safePause = () => { try { video.pause(); } catch (e) {} };
  let expanded = false;
  function expand() {
    expanded = true;
    wrap.classList.add('is-expanded');
    bleed.style.zIndex = '950'; /* sai do contexto de empilhamento do .band (z:1): nav/progress/textos não cobrem o vídeo em tela cheia */
    document.body.style.overflow = 'hidden';
    if (typeof lenis !== 'undefined') lenis.stop();
    gsap.fromTo(video,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' });
    if (!isYT) safePlay();
    wrap.classList.add('is-playing');
  }
  function collapse() {
    expanded = false;
    wrap.classList.remove('is-expanded');
    bleed.style.zIndex = '';
    document.body.style.overflow = '';
    if (typeof lenis !== 'undefined') lenis.start();
    if (!isYT) safePause();
    wrap.classList.remove('is-playing');
  }

  wrap.addEventListener('click', (e) => {
    if (e.target.closest('.video-wrap__close')) { collapse(); return; }
    if (isYT) {
      if (!wrap.querySelector('iframe')) return; /* 1o clique: cria o player (handler inline do HTML) */
      if (wrap.dataset.ready !== '1') return; /* mesmo evento do 1o clique: ainda não dá expand */
      if (!wrap.classList.contains('is-expanded')) { expand(); return; } /* 2o clique: tela cheia */
      return;
    }
    if (!wrap.classList.contains('is-expanded')) {
      if (video.paused) { safePlay(); wrap.classList.add('is-playing'); }
      else expand(); /* já tocando → expande totalmente */
    } else {
      if (video.paused) { safePlay(); wrap.classList.add('is-playing'); }
      else { safePause(); wrap.classList.remove('is-playing'); }
    }
  });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); collapse(); });
  window.addEventListener('keydown', (e) => {
    /* o handler inline do HTML remove as classes antes — checa o flag local pra garantir o collapse (lenis.start) */
    if (e.key === 'Escape' && expanded) collapse();
  });
  if (video.addEventListener) video.addEventListener('ended', () => wrap.classList.remove('is-playing'));
})();

/* ============================================================
   LIVRO — seal orbitante + pilares em cascata + tilt do frame
   (só anima se a seção existir; usa data-fade/ghost já do engine)
   ============================================================ */
(function livroFX() {
  const swap = document.querySelector('[data-bookswap]');
  if (swap && !REDUCED) {
    /* troca de livro vinculada ao scroll: pane 0 -> 1 com pin */
    const figs = [...swap.querySelectorAll('.bookswap__fig')];
    const panes = [...swap.querySelectorAll('.bookswap__pane')];
    const dots = [...swap.querySelectorAll('.bookswap__progress span')];
    const stageEl = swap.querySelector('.bookswap__stage');
    const copyEl = swap.querySelector('.bookswap__copy');
    const figsAnchor = swap.querySelector('.bookswap__progress');
    const mqMobile = window.matchMedia('(max-width:900px)');
    let cur = -1;
    const setBook = (idx) => {
      if (mqMobile.matches) return; /* mobile: livro+texto empilhados, sem troca */
      if (idx === cur) return;
      cur = idx;
      figs.forEach((f, i) => {
        const on = i === idx;
        f.classList.toggle('is-active', on);
        if (on && !REDUCED) gsap.fromTo(f.querySelector('img'), { opacity: 0, x: 60, rotate: 2 }, { opacity: 1, x: 0, rotate: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto', clearProps: 'opacity,transform,rotate' });
      });
      /* as copies ficam sempre visíveis, cada uma no seu beat de scroll — sem fade no texto, sem risco de travar em opacity 0 */
      panes.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    };
    setBook(0);
    /* cada pane tem seu próprio trigger: a figura troca quando a copy dela centraliza — livro e texto sempre sincronizados */
    panes.forEach((p, i) => {
      ScrollTrigger.create({
        trigger: p, start: 'top 55%', end: 'bottom 45%',
        onToggle: (self) => { if (self.isActive) setBook(i); },
      });
    });
    dots.forEach((d) => d.addEventListener('click', () => {
      const p = panes[+d.dataset.goto];
      if (!p) return;
      if (typeof lenis !== 'undefined') lenis.scrollTo(p, { offset: -window.innerHeight * 0.12 });
      else p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    /* mobile: cada figura vai para cima da sua copy (livro 1 + texto 1, livro 2 + texto 2);
       desktop: figuras voltam ao stage com a troca no scroll */
    const applyBooksLayout = () => {
      if (mqMobile.matches) {
        figs.forEach((f, i) => {
          copyEl.insertBefore(f, panes[i]);
          f.classList.add('is-active');
        });
        panes.forEach((p) => p.classList.add('is-active'));
        if (stageEl) stageEl.style.display = 'none'; /* só some depois das figuras saírem */
      } else if (stageEl && figsAnchor) {
        figs.forEach((f) => stageEl.insertBefore(f, figsAnchor));
        stageEl.style.display = '';
        cur = -1;
        setBook(0);
      }
      ScrollTrigger.refresh();
    };
    mqMobile.addEventListener('change', applyBooksLayout);
    applyBooksLayout();
  }
  const sec = document.querySelector('.livro');
  if (!sec || REDUCED) return;
  const seal = sec.querySelector('.livro__seal');
  if (seal) {
    gsap.to(seal, {
      rotation: 360, duration: 26, ease: 'none', repeat: -1,
      transformOrigin: 'center center',
    });
    /* contra-rota: o texto interno fica legível enquanto o selo gira */
    const inner = seal.querySelectorAll('span');
    if (inner.length) {
      gsap.to(inner, {
        rotation: -360, duration: 26, ease: 'none', repeat: -1,
        transformOrigin: 'center center',
      });
    }
  }
  const pillars = sec.querySelectorAll('.pillar');
  if (pillars.length) {
    gsap.from(pillars, {
      opacity: 0, y: 44, duration: 1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: sec.querySelector('.livro__pillars'), start: 'top 86%' },
    });
  }
  const frame = sec.querySelector('.livro__frame');
  const img = frame && frame.querySelector('img');
  if (frame && img && !TOUCH) {
    /* tilt 3D sutil no frame; parallax vertical preservado via y (não yPercent) */
    frame.addEventListener('mousemove', (e) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(frame, { rotationY: px * 7, rotationX: -py * 7, transformPerspective: 900, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    });
    frame.addEventListener('mouseleave', () => {
      gsap.to(frame, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'elastic.out(1,0.6)', overwrite: 'auto' });
    });
  }
  /* preço: contagem de 0 → 97 no scroll (suporte a data-fade já aplicado) */
  const price = sec.querySelector('.livro__price-num');
  if (price) {
    const target = 97;
    const state = { v: 0 };
    ScrollTrigger.create({
      trigger: price, start: 'top 90%', once: true,
      onEnter: () => gsap.to(state, {
        v: target, duration: 1.6, ease: 'power3.out',
        onUpdate: () => { price.innerHTML = 'R$ ' + Math.round(state.v) + '<sup>,00</sup>'; },
      }),
    });
  }
})();