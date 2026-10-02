/* =========================================================
   妈妈，我爱你 —— 交互脚本（原生 JavaScript，无任何依赖）
   模块：01 工具  02 配置  03 主题  04 导航滚动  05 揭示动画
        06 花瓣  07 相伴计时  08 一封信  09 夸夸她  10 送花
        11 爱心雨  12 我的承诺  13 相册放大  14 音乐盒
        15 页脚与重置
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 01. 工具函数 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const STORAGE = {
    theme: 'mom.theme',
    praise: 'mom.praise',
    promises: 'mom.promises'
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* 忽略 */ }
  }

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  /* ---------- 02. 配置 ---------- */
  const CONFIG = Object.assign({
    momName: '妈妈',
    since: '1998-06-18',
    signature: '爱你的孩子'
  }, window.MOM_CONFIG || {});

  /* ---------- 03. 主题切换 ---------- */
  (function initTheme() {
    const root = document.documentElement;
    const btn = $('#themeToggle');
    const saved = load(STORAGE.theme, null);
    if (saved === 'day' || saved === 'night') root.setAttribute('data-theme', saved);

    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
      root.setAttribute('data-theme', next);
      save(STORAGE.theme, next);
      toast(next === 'night' ? '🌙 已经换成夜里的暖光' : '☀️ 已经是白天的暖阳');
    });
  })();

  /* ---------- 04. 导航与滚动 ---------- */
  (function initNav() {
    const header = $('#siteHeader');
    const nav = $('#mainNav');
    const burger = $('#hamburger');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');
    const navLinks = $$('.nav-link');
    const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

    function closeNav() {
      if (!nav || !burger) return;
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }

    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', e => { if (e.target.closest('a')) closeNav(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
    }

    /* 平滑滚动（带固定头部偏移） */
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = (header ? header.offsetHeight : 0) + 14;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });

    let ticking = false;
    function onScroll() {
      const y = window.pageYOffset;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = clamp(docH > 0 ? (y / docH) * 100 : 0, 0, 100) + '%';
      if (header) header.classList.toggle('scrolled', y > 16);
      if (toTop) toTop.classList.toggle('show', y > 520);

      const line = y + (header ? header.offsetHeight : 0) + 130;
      let current = null;
      sections.forEach(sec => { if (sec.offsetTop <= line) current = sec; });

      navLinks.forEach(a => {
        a.classList.toggle('active', !!current && a.getAttribute('href') === '#' + current.id);
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    }, { passive: true });

    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    onScroll();
  })();

  /* ---------- 05. 段落揭示 ---------- */
  (function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const sibs = el.parentElement ? Array.from(el.parentElement.children) : [];
        el.style.transitionDelay = Math.min(Math.max(0, sibs.indexOf(el)) * 80, 400) + 'ms';
        el.classList.add('in');
        obs.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    items.forEach(el => io.observe(el));
  })();

  /* ---------- 06. 飘落的花瓣 ---------- */
  (function initPetals() {
    const canvas = $('#petalCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DAY = ['232,104,138', '244,161,121', '185,138,209', '224,165,74'];
    const NIGHT = ['247,170,190', '246,190,160', '214,178,232', '240,205,150'];

    let w = 0, h = 0, dpr = 1, raf = null;
    let petals = [];

    function colors() {
      return document.documentElement.getAttribute('data-theme') === 'night' ? NIGHT : DAY;
    }

    function make() {
      const count = clamp(Math.round((w * h) / 42000), 12, 30);
      const palette = colors();
      petals = Array.from({ length: count }, () => spawn(palette, true));
    }

    function spawn(palette, anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -40,
        r: 5 + Math.random() * 7,
        squash: 0.5 + Math.random() * 0.25,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.014,
        vy: 0.28 + Math.random() * 0.55,
        sway: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.4,
        color: palette[Math.floor(Math.random() * palette.length)]
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
    }

    function paint(p, t) {
      ctx.save();
      ctx.translate(p.x + Math.sin(t * 0.001 * p.sway + p.phase) * 16, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'rgb(' + p.color + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * p.squash, 0, 0, Math.PI * 2);
      ctx.fill();
      /* 花瓣上的一道浅色脉络 */
      ctx.globalAlpha = p.alpha * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.5, 0);
      ctx.lineTo(p.r * 0.5, 0);
      ctx.stroke();
      ctx.restore();
    }

    let t0 = 0;
    function frame(t) {
      if (!t0) t0 = t;
      ctx.clearRect(0, 0, w, h);
      petals.forEach(p => {
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y - 60 > h) {
          Object.assign(p, spawn(colors(), false), { x: Math.random() * w });
        }
        paint(p, t);
      });
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);

    /* 主题切换后换一套颜色 */
    new MutationObserver(() => { petals.forEach(p => { p.color = colors()[Math.floor(Math.random() * 4)]; }); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (raf) window.cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf && !reduceMotion) {
        t0 = 0;
        raf = window.requestAnimationFrame(frame);
      }
    });

    if (reduceMotion) {
      ctx.clearRect(0, 0, w, h);
      petals.forEach(p => paint(p, 1));
    } else {
      raf = window.requestAnimationFrame(frame);
    }
  })();

  /* ---------- 07. 相伴计时 ---------- */
  (function initTogether() {
    const box = $('.together');
    if (!box) return;
    const out = {
      d: $('#tDays'), h: $('#tHours'), m: $('#tMins'), s: $('#tSecs'), label: $('#sinceLabel')
    };

    const start = new Date(String(CONFIG.since).replace(/-/g, '/') + ' 00:00:00');
    if (isNaN(start.getTime())) { box.hidden = true; return; }

    if (out.label) {
      out.label.textContent = start.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    function tick() {
      const diff = Date.now() - start.getTime();
      if (diff < 0) {
        Object.values(out).forEach(el => { if (el && el.textContent !== undefined) el.textContent = '—'; });
        return;
      }
      const secs = Math.floor(diff / 1000);
      if (out.d) out.d.textContent = Math.floor(secs / 86400).toLocaleString('en-US');
      if (out.h) out.h.textContent = String(Math.floor(secs / 3600) % 24).padStart(2, '0');
      if (out.m) out.m.textContent = String(Math.floor(secs / 60) % 60).padStart(2, '0');
      if (out.s) out.s.textContent = String(secs % 60).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 08. 一封信（逐字打出） ---------- */
  (function initLetter() {
    const body = $('#letterBody');
    if (!body) return;

    const salutation = $('#letterSalutation');
    const sign = $('#letterSign');
    if (salutation) salutation.textContent = '亲爱的' + CONFIG.momName + '：';
    if (sign) sign.textContent = CONFIG.signature;

    const paras = $$('p', body);
    const texts = paras.map(p => p.textContent.trim());

    /* 打字层叠在原文之上，原文留白撑住高度，页面不会抖动 */
    const overlay = document.createElement('div');
    overlay.className = 'letter-typing';
    const typed = texts.map(() => {
      const p = document.createElement('p');
      overlay.appendChild(p);
      return p;
    });
    body.appendChild(overlay);

    let timer = null;
    let started = false;

    function stop() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function showAll() {
      stop();
      started = true;
      typed.forEach((p, i) => { p.textContent = texts[i]; });
      body.classList.remove('is-typing');
      overlay.style.display = 'none';
    }

    function type() {
      stop();
      started = true;
      overlay.style.display = '';
      typed.forEach(p => { p.textContent = ''; });
      body.classList.add('is-typing');

      let pi = 0, ci = 0;
      (function step() {
        if (pi >= texts.length) { showAll(); return; }
        const text = texts[pi];
        if (ci < text.length) {
          typed[pi].textContent = text.slice(0, ci + 1);
          ci++;
          timer = setTimeout(step, text.length > 120 ? 16 : 26);
        } else {
          pi++; ci = 0;
          timer = setTimeout(step, 340);
        }
      })();
    }

    const skipBtn = $('#skipLetter');
    const replayBtn = $('#replayLetter');
    if (skipBtn) skipBtn.addEventListener('click', () => { showAll(); });
    if (replayBtn) replayBtn.addEventListener('click', () => { type(); });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    /* 滚动到信件时才开始写 */
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || started) return;
        type();
        obs.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(body);
  })();

  /* ---------- 09. 夸夸妈妈 ---------- */
  const PRAISES = [
    '你把最好的脾气留给了家人，把最好的耐心留给了我。',
    '你是我人生里第一个老师，也是唯一一个从不收学费的老师。',
    '你的手很粗糙，却是我摸过最温柔的一双手。',
    '你不化妆也好看。你笑起来的时候，整个屋子都亮了。',
    '你总说自己没什么本事，可你把我养成了一个还不错的人。',
    '你的唠叨是这世上最准的天气预报，总在我出门前提醒我加衣服。',
    '你没读过多少书，却教会了我什么叫体面。',
    '你做的那道菜，全世界没有第二家能复制。',
    '你是我见过的，把「爱」这个字写得最工整的人。',
    '你从不夸自己，所以我替你说：你真的很了不起。',
    '你怕的东西很多，可你为我的时候，一样都没怕过。',
    '你把苦都嚼碎了咽下去，只把甜的留给我。',
    '你的爱不用还，但我还是想还一点，哪怕一点点。',
    '你是我心里最柔软的地方，也是我最不敢碰的地方。',
    '你笑起来眼角有皱纹，那是你替我操心留下的勋章。',
    '你不完美，可你对我的爱，挑不出一丝毛病。',
    '你不许我熬夜，自己却在我发烧的时候一夜没合眼。',
    '你把我所有的坏脾气都收下了，然后回我一句「吃饭没」。',
    '你是我见过最会过日子的人，也是最不会对自己好的人。',
    '你总说「妈什么都不要」，可我知道，你只是不敢要。',
    '你是我这辈子唯一一个，不用我解释就能懂我的人。',
    '你把我的人生当成你的事业，还从不要求回报。',
    '你的拥抱，有一种不讲道理的安全感。',
    '你种的花很好看，就像你把我养得这么好。',
    '你在的地方，就是家。',
    '你把「妈妈」两个字，做成了我这辈子最大的幸运。',
    '你很少说爱我，可你做的每一件事都在说。',
    '你是我唯一想一直报喜、舍不得报忧的人。',
    '我长大以后的每一个优点，都是你当年种下的种子。',
    '你辛苦了这么多年，接下来该轮到你享福了。',
    '你值得这世上所有的好东西，包括我一直没说出口的这句谢谢。',
    '你是最好的妈妈，没有之一。'
  ];

  (function initCompliment() {
    const textEl = $('#complimentText');
    const btn = $('#praiseBtn');
    const countEl = $('#praiseCount');
    const flowerBtn = $('#flowerBtn');
    const flowerCountEl = $('#flowerCount');
    if (!textEl || !btn) return;

    let state = load(STORAGE.praise, { count: 0, flowers: 0, last: -1 });
    if (typeof state !== 'object' || state === null) state = { count: 0, flowers: 0, last: -1 };

    function render() {
      if (countEl) countEl.textContent = String(state.count || 0);
      if (flowerCountEl) flowerCountEl.textContent = String(state.flowers || 0);
    }

    btn.addEventListener('click', () => {
      let i = Math.floor(Math.random() * PRAISES.length);
      if (PRAISES.length > 1 && i === state.last) i = (i + 1) % PRAISES.length;
      state.last = i;
      state.count = (state.count || 0) + 1;

      textEl.textContent = PRAISES[i];
      textEl.classList.remove('pop');
      void textEl.offsetWidth;   /* 触发重排，让动画可以重播 */
      textEl.classList.add('pop');

      render();
      save(STORAGE.praise, state);
      heartRain(['💗', '💕', '🌸'], 6);
    });

    render();
  })();

  /* ---------- 10 / 11. 送花与爱心雨 ---------- */
  let heartLayer = null;
  function getHeartLayer() {
    if (!heartLayer) {
      heartLayer = document.createElement('div');
      heartLayer.className = 'heart-layer';
      document.body.appendChild(heartLayer);
    }
    return heartLayer;
  }

  function heartRain(emojis, count) {
    if (reduceMotion) return;
    const layer = getHeartLayer();
    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'heart-drop';
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      span.style.left = (Math.random() * 96) + '%';
      span.style.fontSize = (14 + Math.random() * 22).toFixed(0) + 'px';
      const dur = 3 + Math.random() * 2.6;
      span.style.animationDuration = dur.toFixed(2) + 's';
      span.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
      layer.appendChild(span);
      setTimeout(() => span.remove(), (dur + 1.4) * 1000);
    }
  }

  (function initFlowers() {
    const btn = $('#flowerBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const state = load(STORAGE.praise, { count: 0, flowers: 0, last: -1 });
      state.flowers = (state.flowers || 0) + 1;
      save(STORAGE.praise, state);
      const el = $('#flowerCount');
      if (el) el.textContent = String(state.flowers);
      heartRain(['💐', '🌸', '🌷', '🌹', '🌺'], 26);
      toast('💐 送出去一束花，她一定会喜欢的');
    });
  })();

  (function initLoveButton() {
    const btn = $('#loveBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      heartRain(['💗', '💖', '💕', '💞', '❤️', '🌸'], 70);
      toast('💗 妈妈，我爱你');
    });
  })();

  /* 点一下就冒一颗心 */
  (function initTapHearts() {
    if (reduceMotion) return;
    let last = 0;
    document.addEventListener('pointerdown', e => {
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      const span = document.createElement('span');
      span.className = 'tap-heart';
      span.textContent = ['💗', '💕', '🌸', '✨'][Math.floor(Math.random() * 4)];
      span.style.left = e.clientX + 'px';
      span.style.top = e.clientY + 'px';
      document.body.appendChild(span);
      setTimeout(() => span.remove(), 1150);
    });
  })();

  /* ---------- 12. 我的承诺 ---------- */
  (function initPromises() {
    const list = $('#promiseList');
    if (!list) return;
    const boxes = $$('input[type="checkbox"]', list);
    const bar = $('#promiseBar');
    const label = $('#promiseCount');
    const resetBtn = $('#resetPromises');

    let state = load(STORAGE.promises, {});
    if (typeof state !== 'object' || state === null) state = {};

    function render() {
      let done = 0;
      boxes.forEach(box => {
        const on = !!state[box.dataset.key];
        box.checked = on;
        if (on) done++;
      });
      if (bar) bar.style.setProperty('--w', (boxes.length ? (done / boxes.length) * 100 : 0) + '%');
      if (label) label.textContent = done + ' / ' + boxes.length;

      if (done === boxes.length && boxes.length > 0) toast('💗 八条都做到了，你一定是个很好的孩子');
    }

    boxes.forEach(box => {
      box.addEventListener('change', () => {
        state[box.dataset.key] = box.checked;
        save(STORAGE.promises, state);
        render();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state = {};
        save(STORAGE.promises, state);
        render();
        toast('已经清空，重新开始也不晚');
      });
    }

    render();
  })();

  /* ---------- 13. 相册放大 ---------- */
  (function initLightbox() {
    const box = $('#lightbox');
    const art = $('#lightboxArt');
    const caption = $('#lightboxCaption');
    const closeBtn = $('#lightboxClose');
    const photos = $$('.photo');
    if (!box || !art || !photos.length) return;

    let lastFocus = null;

    function open(photo) {
      const inner = $('.photo-art', photo);
      art.innerHTML = inner ? inner.innerHTML : '';
      if (caption) caption.textContent = photo.dataset.caption || '';
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement;
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      box.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    photos.forEach(photo => {
      photo.setAttribute('tabindex', '0');
      photo.setAttribute('role', 'button');
      photo.addEventListener('click', () => open(photo));
      photo.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(photo); }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    box.addEventListener('click', e => { if (e.target === box) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  })();

  /* ---------- 14. 音乐盒（Web Audio，无需音频文件） ---------- */
  (function initMusic() {
    const btn = $('#musicToggle');
    if (!btn) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { btn.hidden = true; return; }

    const NOTE = {
      C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
      A5: 880.00, C6: 1046.50, D6: 1174.66, E6: 1318.51
    };
    /* 五声音阶的温柔摇篮曲，一个单位 0.42 秒 */
    const MELODY = [
      ['E5', 1], ['G5', 1], ['A5', 2], ['G5', 1], ['E5', 1], ['D5', 2],
      ['C5', 1], ['D5', 1], ['E5', 2], ['G5', 1], ['E5', 1], ['D5', 2],
      ['C5', 1], ['E5', 1], ['G5', 2], ['A5', 1], ['G5', 1], ['C6', 3],
      ['D6', 1], ['C6', 1], ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 4]
    ];

    let ctx = null, master = null, timer = null, idx = 0, playing = false;

    function ensure() {
      if (ctx) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600;
      master.connect(filter).connect(ctx.destination);
    }

    function note(freq, dur) {
      if (!freq) return;
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + dur);

      /* 低八度的一点余韵，让声音更暖 */
      const soft = ctx.createOscillator();
      soft.type = 'sine';
      soft.frequency.value = freq / 2;
      const softGain = ctx.createGain();
      softGain.gain.setValueAtTime(0, t);
      softGain.gain.linearRampToValueAtTime(0.05, t + 0.04);
      softGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
      soft.connect(softGain).connect(master);
      soft.start(t);
      soft.stop(t + dur);
    }

    function schedule() {
      if (!playing) return;
      const step = MELODY[idx % MELODY.length];
      const unit = 0.42;
      const dur = step[1] * unit;
      note(NOTE[step[0]], dur * 0.92);
      idx++;
      timer = setTimeout(schedule, dur * 1000);
    }

    function setUi(on) {
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? '暂停音乐盒' : '播放音乐盒';
    }

    btn.addEventListener('click', () => {
      ensure();
      if (ctx.state === 'suspended') ctx.resume();

      if (playing) {
        playing = false;
        clearTimeout(timer);
        timer = null;
        setUi(false);
        toast('🎵 音乐盒先休息一下');
      } else {
        playing = true;
        idx = 0;
        setUi(true);
        schedule();
        toast('🎵 音乐盒开始播放，愿你被温柔以待');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && playing) {
        playing = false;
        clearTimeout(timer);
        timer = null;
        setUi(false);
      }
    });
  })();

  /* ---------- 15. 页脚与重置 ---------- */
  (function initFooter() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    const reset = $('#resetAll');
    if (!reset) return;
    reset.addEventListener('click', e => {
      e.preventDefault();
      if (!window.confirm('确定要清空夸夸记录和承诺勾选吗？')) return;
      Object.values(STORAGE).forEach(key => {
        try { localStorage.removeItem(key); } catch (err) { /* 忽略 */ }
      });
      toast('已经清空，正在重新开始…');
      setTimeout(() => window.location.reload(), 700);
    });
  })();

})();
