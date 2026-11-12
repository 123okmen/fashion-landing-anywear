// ============================================================================
// ATELIER V.26 — LALIN.VN (BST) × STRESSMAMA.VN (VISUAL) × MINDE.VN (PRODUCT)
// Integrated with AnyWear: Live Virtual Try-On (Browser + Extension + Live Cam)
// ============================================================================
(() => {
  'use strict';

  const PRODUCTS = Array.isArray(window.LALIN_PRODUCTS) ? window.LALIN_PRODUCTS : [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => `${Number(n || 0).toLocaleString('vi-VN')}₫`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isHoverDevice = window.matchMedia('(hover: hover)').matches;

  const SHORT_LABELS = { yem: 'YẾM', 'to-lua': 'TƠ TẰM', gam: 'GẤM', khoac: 'KHOÁC', set: 'SET', 'phu-kien': 'CÀI ÁO' };

  const CATEGORY_LABELS = {
    all: 'Tất cả',
    yem: 'Áo Yếm & Cổ Yếm',
    'to-lua': 'Áo Tơ Tằm & Lụa',
    gam: 'Gấm · Taffeta · Đính Kết',
    khoac: 'Áo Khoác & Choàng Ren',
    set: 'Set Kim Sa',
    'phu-kien': 'Cài Áo'
  };

  const CHAPTER_LABELS = {
    yem: 'CHƯƠNG I • YẾM ĐƯƠNG ĐẠI',
    'to-lua': 'CHƯƠNG II • TƠ TẰM',
    gam: 'CHƯƠNG III • GẤM & ĐÍNH KẾT',
    khoac: 'CHƯƠNG IV • KHOÁC & REN',
    set: 'CHƯƠNG V • SET KIM SA',
    'phu-kien': 'PHỤ KIỆN • CÀI ÁO'
  };

  const state = {
    priceMode: 'rent',
    productFilter: 'all',
    productSort: 'default',
    productPage: 1,
    lookbookFilter: 'all',
    bag: [],
    studio: {
      product: null,
      size: null,
      color: null,
      imgIndex: 0,
      tier: 'standard',
      autoTrack: true,
      aiMatte: true,
      holdOriginal: false,
      facingMode: 'user',
      inCapsule: false
    },
    recentLooks: [],
    webcamStream: null,
    liveStartAt: 0,
    timerId: null
  };
  const PAGE_SIZE = 12;

  // ==========================================================================
  // 0. TOAST & EXTENSION DETECTION
  // ==========================================================================
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toastNotification');
    if (!toast) return;
    toast.innerHTML = `<span style="color: var(--aw-lime); font-weight: 700;">✦ AnyWear.Live:</span> ${esc(msg)}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // Detect AnyWear Chrome Extension (sets document.documentElement.dataset.anywear)
  function checkAnywearExtension() {
    const extBadge = $('#awExtStatusBadge');
    const hasExt = Boolean(document.documentElement.dataset.anywear);
    if (extBadge) {
      extBadge.textContent = hasExt
        ? '✦ AnyWear Chrome Extension: Đã Kết Nối'
        : '✦ AnyWear Browser Engine: Sẵn Sàng (Web + Mobile)';
    }
  }
  checkAnywearExtension();

  // ==========================================================================
  // 1. CUSTOM CURSOR & SCROLL PROGRESS
  // ==========================================================================
  const customCursor = $('#customCursor');
  if (customCursor && isHoverDevice) {
    document.addEventListener('mousemove', (e) => {
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
      const onControl = e.target.closest('button, input, a, select, form');
      const target = onControl ? null : e.target.closest('[data-cursor]');
      if (target) {
        const label = target.getAttribute('data-cursor');
        customCursor.textContent = label;
        customCursor.classList.add('active');
        customCursor.classList.toggle('cursor-anywear', /AR|TRY/i.test(label));
      } else {
        customCursor.classList.remove('active');
      }
    }, { passive: true });
    document.addEventListener('mouseleave', () => customCursor.classList.remove('active'));
  } else if (customCursor) {
    customCursor.remove();
  }

  const scrollProgressBar = $('#scrollProgressBar');
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      if (scrollProgressBar) scrollProgressBar.style.width = `${progress}%`;
      scrollTicking = false;
    });
  }, { passive: true });

  // ==========================================================================
  // 2. SCROLL REVEAL
  // ==========================================================================
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');
        revealObserver.unobserve(el);
        setTimeout(() => el.classList.remove('reveal'), 1000);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    : null;

  function observeReveal(el, delayIndex = 0) {
    el.classList.add('reveal', 'reveal-wipe');
    el.style.transitionDelay = `${Math.min(delayIndex, 6) * 65}ms`;
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('in-view');
  }

  $$('.section-header-bar, .ref-box, .red-villa-card, .anywear-hub-container').forEach((el) => {
    el.classList.add('reveal');
    if (revealObserver) revealObserver.observe(el); else el.classList.add('in-view');
  });

  // ==========================================================================
  // 3. HERO SPLIT-WIPE ANYWEAR MIRROR
  // ==========================================================================
  const heroProduct = PRODUCTS.find((p) => p.category === 'yem' && p.gallery.length > 2) || PRODUCTS[0];
  const heroStage = $('#heroInteractiveStage');
  const heroBase = $('.hero-layer-base');
  const heroAfter = $('#heroAfterImage');
  const heroSplitBar = $('#heroSplitBar');
  const heroReadout = $('#heroAngleReadout');

  if (heroProduct) {
    if (heroBase) { heroBase.src = heroProduct.imgFull; heroBase.alt = heroProduct.title; }
    if (heroAfter) { heroAfter.src = heroProduct.imgAltFull; heroAfter.alt = `${heroProduct.title} — góc AnyWear`; }
    const heroName = $('#heroProductName');
    if (heroName) heroName.textContent = `${heroProduct.title} · ${fmt(heroProduct.price)}`;
  }

  if (heroStage && heroAfter && heroSplitBar) {
    const updateHeroSplit = (clientX) => {
      const rect = heroStage.getBoundingClientRect();
      const ratio = Math.max(6, Math.min(94, ((clientX - rect.left) / rect.width) * 100));
      heroAfter.style.clipPath = `inset(0 0 0 ${ratio}%)`;
      heroSplitBar.style.left = `${ratio}%`;
      if (heroReadout) heroReadout.textContent = `ANYWEAR SCAN ${Math.round(ratio)}% • LIVE 60FPS`;
    };
    heroStage.addEventListener('mousemove', (e) => updateHeroSplit(e.clientX));
    heroStage.addEventListener('touchmove', (e) => { if (e.touches[0]) updateHeroSplit(e.touches[0].clientX); }, { passive: true });
  }

  $('#heroLaunchTryOnBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStudio(heroProduct, { autoStartCam: false });
  });
  $('#heroQuickStartAnywear')?.addEventListener('click', () => {
    openStudio(state.studio.product || heroProduct, { autoStartCam: true });
  });
  $('#openGlobalAnywearBtn')?.addEventListener('click', () => {
    openStudio(state.studio.product || heroProduct, { autoStartCam: false });
  });

  // ==========================================================================
  // 4. LALIN LOOKBOOK: DRAG-TO-GLIDE + VELOCITY SKEW + PARALLAX
  // ==========================================================================
  const lookbookTrack = $('#lookbookTrack');
  const lookbookViewport = $('#lookbookViewport');
  const lookbookProgressFill = $('#lookbookProgressFill');
  const LOOKBOOK_POOL = PRODUCTS.filter((p) => p.category !== 'phu-kien');
  const LOOKBOOK_FILTERS = [
    ['all', 'Tất cả chương'],
    ['yem', 'Yếm Đương Đại'],
    ['to-lua', 'Tơ Tằm'],
    ['gam', 'Gấm & Đính Kết'],
    ['khoac-set', 'Khoác · Ren · Set']
  ];

  function lookbookItems(filter) {
    if (filter === 'all') return LOOKBOOK_POOL;
    if (filter === 'khoac-set') return LOOKBOOK_POOL.filter((p) => p.category === 'khoac' || p.category === 'set');
    return LOOKBOOK_POOL.filter((p) => p.category === filter);
  }

  function renderLookbookFilters() {
    const wrap = $('#lookbookFilters');
    if (!wrap) return;
    wrap.innerHTML = LOOKBOOK_FILTERS.map(([key, label]) => `
      <button type="button" class="filter-tab ${state.lookbookFilter === key ? 'active' : ''}" data-lookbook-filter="${key}">
        ${esc(label)}<span class="count">${lookbookItems(key).length}</span>
      </button>`).join('');
  }

  function renderLookbook() {
    if (!lookbookTrack) return;
    const items = lookbookItems(state.lookbookFilter);
    lookbookTrack.innerHTML = items.map((p, i) => `
      <article class="lookbook-card" data-id="${p.id}" data-cursor="DRAG ↔">
        <div class="lookbook-media-wrap">
          <img src="${p.img}" alt="${esc(p.title)}" class="lookbook-img-primary" loading="${i < 4 ? 'eager' : 'lazy'}" data-garment-id="${p.id}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="lookbook-img-secondary" loading="lazy" data-garment-id="${p.id}" />
          <div class="anywear-card-overlay">
            <button type="button" class="anywear-live-pill" data-open-tryon="${p.id}">
              <span class="aw-lime-dot"></span> ✦ Try on
            </button>
            <span class="chapter-tag">${CHAPTER_LABELS[p.category] || 'LALIN'}</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span>LALIN × ANYWEAR 360°</span>
              <span class="scrub-status-label">Kéo để đổi góc</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="angle-scrubber-input lookbook-scrubber" aria-label="Đổi góc ảnh ${esc(p.title)}" />
            <div class="dock-top-row">
              <span style="color: var(--accent-gold);">${esc(p.fabric)}</span>
              <button type="button" class="dock-mini-btn tryon-trigger" data-open-tryon="${p.id}">✦ Try on Live</button>
            </div>
          </div>
        </div>
        <div class="lookbook-meta">
          <div class="lookbook-meta-header">
            <h3>${esc(p.title)}</h3>
          </div>
          <p class="lookbook-desc">${esc(p.desc)}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 12px;">
            <span>Giá Lalin: <strong style="color: var(--accent-gold);">${fmt(p.price)}</strong></span>
            <span>Thuê: <strong>${fmt(p.rent)}</strong></span>
          </div>
        </div>
      </article>`).join('');

    $$('.lookbook-card', lookbookTrack).forEach((card, i) => {
      observeReveal(card, i);
      const secondary = $('.lookbook-img-secondary', card);
      const label = $('.scrub-status-label', card);
      $('.lookbook-scrubber', card)?.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        card.classList.add('scrubbed');
        secondary.style.clipPath = val === 0 ? '' : `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;
        if (label) label.textContent = val > 50 ? `Góc thứ 2 • ${val}%` : `Góc chính • ${val}%`;
      });
    });

    if (lookbookViewport) lookbookViewport.scrollLeft = 0;
    updateLookbookScroll();
  }

  lookbookTrack?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-tryon]');
    if (!btn) return;
    e.stopPropagation();
    openStudio(PRODUCTS.find((p) => p.id === btn.dataset.openTryon));
  });

  $('#lookbookFilters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lookbook-filter]');
    if (!btn) return;
    state.lookbookFilter = btn.dataset.lookbookFilter;
    renderLookbookFilters();
    renderLookbook();
  });

  function updateLookbookScroll() {
    if (!lookbookViewport || !lookbookTrack) return;
    const maxScroll = lookbookViewport.scrollWidth - lookbookViewport.clientWidth;
    const ratio = maxScroll > 0 ? (lookbookViewport.scrollLeft / maxScroll) * 100 : 100;
    if (lookbookProgressFill) lookbookProgressFill.style.width = `${Math.max(6, ratio)}%`;
    const vw = window.innerWidth;
    $$('.lookbook-img-primary', lookbookTrack).forEach((img) => {
      const rect = img.parentElement.getBoundingClientRect();
      if (rect.right < -200 || rect.left > vw + 200) return;
      const offset = (rect.left + rect.width / 2 - vw / 2) / vw;
      img.style.setProperty('--px', `${(offset * -28).toFixed(1)}px`);
    });
  }

  if (lookbookViewport && lookbookTrack) {
    let isDown = false;
    let moved = 0;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let skew = 0;
    let rafId = null;

    const decaySkew = () => {
      skew *= 0.85;
      if (Math.abs(skew) < 0.05) skew = 0;
      lookbookTrack.style.transform = skew ? `skewX(${skew.toFixed(2)}deg)` : '';
      rafId = skew ? requestAnimationFrame(decaySkew) : null;
    };

    lookbookViewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('input, button, a')) return;
      isDown = true;
      moved = 0;
      startX = lastX = e.pageX;
      startScroll = lookbookViewport.scrollLeft;
      lookbookViewport.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      moved = Math.max(moved, Math.abs(dx));
      lookbookViewport.scrollLeft = startScroll - dx * 1.4;
      skew = Math.max(-6, Math.min(6, (e.pageX - lastX) * 0.3));
      lastX = e.pageX;
      lookbookTrack.style.transform = `skewX(${skew.toFixed(2)}deg)`;
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      lookbookViewport.classList.remove('is-dragging');
      if (!rafId) rafId = requestAnimationFrame(decaySkew);
    });

    lookbookViewport.addEventListener('click', (e) => {
      if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; }
    }, true);

    let lbTicking = false;
    lookbookViewport.addEventListener('scroll', () => {
      if (lbTicking) return;
      lbTicking = true;
      requestAnimationFrame(() => { updateLookbookScroll(); lbTicking = false; });
    }, { passive: true });
    window.addEventListener('resize', updateLookbookScroll);
  }

  // ==========================================================================
  // 5. STRESSMAMA VISUAL MANIFESTO
  // ==========================================================================
  const pick = (cat, fallbackIdx) => PRODUCTS.find((p) => p.category === cat && p.gallery.length > 2) || PRODUCTS[fallbackIdx] || PRODUCTS[0];
  const SCENES = PRODUCTS.length ? [
    { code: 'SCENE 01 // RED VILLA ARCHIVE', product: pick('gam', 1) },
    { code: 'SCENE 02 // THE BIG KIDS × HERITAGE', product: pick('to-lua', 2) },
    { code: 'SCENE 03 // NIGHT GALA (MINDE)', product: pick('set', 3) }
  ] : [];
  let currentScene = 0;

  const manifestoStage = $('#manifestoStage');
  const mBase = $('#manifestoImgBase');
  const mOverlay = $('#manifestoImgOverlay');

  function applyScene(idx) {
    const scene = SCENES[idx];
    if (!scene || !mBase || !mOverlay) return;
    currentScene = idx;
    mBase.src = scene.product.imgFull;
    mOverlay.src = scene.product.imgAltFull;
    [mBase, mOverlay].forEach((img) => {
      img.classList.remove('fade-swap');
      void img.offsetWidth;
      img.classList.add('fade-swap');
    });
    $('#manifestoSceneCode').textContent = scene.code;
    $('#manifestoSceneTitle').textContent = `${scene.product.title} — ${fmt(scene.product.price)}`;
    $$('[data-scene]').forEach((b) => b.classList.toggle('active', Number(b.dataset.scene) === idx));
  }
  applyScene(0);

  if (manifestoStage && mOverlay) {
    const wipe = (clientX) => {
      const rect = manifestoStage.getBoundingClientRect();
      const pct = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
      mOverlay.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      const tag = $('#manifestoPercentTag');
      if (tag) tag.textContent = `WIPE: ${Math.round(pct)}%`;
    };
    manifestoStage.addEventListener('mousemove', (e) => wipe(e.clientX));
    manifestoStage.addEventListener('touchmove', (e) => { if (e.touches[0]) wipe(e.touches[0].clientX); }, { passive: true });
  }

  $$('[data-scene]').forEach((btn) => btn.addEventListener('click', () => applyScene(Number(btn.dataset.scene))));
  $('#manifestoTryOnTrigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (SCENES[currentScene]) openStudio(SCENES[currentScene].product);
  });

  // ==========================================================================
  // 6. PRODUCT SHOWROOM (69 Lalin Products + Draggable AnyWear Images)
  // ==========================================================================
  const productGrid = $('#productGrid');
  const loadMoreBtn = $('#loadMoreBtn');

  function filteredProducts() {
    let list = state.productFilter === 'all' ? PRODUCTS.slice() : PRODUCTS.filter((p) => p.category === state.productFilter);
    if (state.productSort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.productSort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }

  function renderProductFilters() {
    const wrap = $('#productFilters');
    if (!wrap) return;
    wrap.innerHTML = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
      const count = key === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === key).length;
      if (!count) return '';
      return `<button type="button" class="filter-tab ${state.productFilter === key ? 'active' : ''}" data-product-filter="${key}">${esc(label)}<span class="count">${count}</span></button>`;
    }).join('');
  }

  function productCardHTML(p) {
    const rentMode = state.priceMode === 'rent';
    const sizes = p.sizes.length ? p.sizes.map((s) => `<span class="size-dot">${s}</span>`).join('') : '<span class="size-dot">Free size</span>';
    const colors = p.colors.length ? ` · ${esc(p.colors.join(' / '))}` : '';
    return `
      <article class="product-card" data-product-id="${p.id}">
        <div class="product-media" data-cursor="TRY ON AR">
          <img src="${p.img}" alt="${esc(p.title)}" class="product-img-main" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="product-img-alt" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <div class="card-virtual-mesh-overlay"></div>
          <div class="fabric-loupe"><span class="loupe-caption">X-RAY: ${esc(p.fabric)}</span></div>
          <div class="anywear-card-overlay">
            <button type="button" class="anywear-live-pill" data-tryon-id="${p.id}">
              <span class="aw-lime-dot"></span> ✦ Try on
            </button>
            <span class="chapter-tag">${esc(SHORT_LABELS[p.category] || '')}</span>
          </div>
          <div class="card-fit-telemetry">
            <span>✦ CHẤT LIỆU: ${esc(p.fabric)}</span>
            <span>✦ KÉO ẢNH THẢ VÀO CAPSULE ĐỂ THỬ</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span class="angle-readout-label">GÓC NHÌN: TRƯỚC (0°)</span>
              <div class="dock-mode-btns">
                <button type="button" class="dock-mini-btn btn-toggle-loupe" title="Kính lúp soi chất vải">🔍 Soi Vải</button>
                <button type="button" class="dock-mini-btn btn-toggle-mesh" title="Lưới đo 3D">📐 Lưới 3D</button>
              </div>
            </div>
            <input type="range" min="0" max="100" value="0" class="angle-scrubber-input product-angle-scrubber" aria-label="Xoay góc nhìn ${esc(p.title)}" />
          </div>
        </div>
        <div class="product-body">
          <div>
            <div class="product-brand-row">
              <span class="product-source-badge">LALIN.VN${colors}</span>
              <span class="fabric-pill">${esc(p.fabric)}</span>
            </div>
            <h3 class="product-title"><a href="${p.url}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
            <div class="size-row">SIZE ${sizes}</div>
          </div>
          <div>
            <div class="price-matrix-box">
              <div class="price-col ${rentMode ? 'highlighted' : ''}">
                <span class="price-label">Thuê 3 ngày*</span>
                <span class="price-val rent-color">${fmt(p.rent)}</span>
              </div>
              <div class="price-col ${!rentMode ? 'highlighted' : ''}">
                <span class="price-label">Giá bán Lalin</span>
                <span class="price-val">${fmt(p.price)}</span>
              </div>
            </div>
            <div class="product-actions">
              <button type="button" class="btn-anywear-card" data-tryon-id="${p.id}"><span>✦</span> Try on (AnyWear)</button>
              <button type="button" class="btn-book-item" data-book-id="${p.id}">${rentMode ? '+ Đặt Thuê' : '+ Mua Ngay'}</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function bindProductCard(card) {
    const p = PRODUCTS.find((x) => x.id === card.dataset.productId);
    const media = $('.product-media', card);
    const imgMain = $('.product-img-main', card);
    const imgAlt = $('.product-img-alt', card);
    const loupe = $('.fabric-loupe', card);
    const angleLabel = $('.angle-readout-label', card);
    let loupeSrc = p.imgFull;

    // Enable native HTML5 drag-and-drop into AnyWear Capsule / Extension
    [imgMain, imgAlt].forEach((img) => {
      img?.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/uri-list', p.imgFull);
        e.dataTransfer.setData('text/plain', p.imgFull);
        e.dataTransfer.setData('application/x-anywear-id', p.id);
      });
    });

    $('.product-angle-scrubber', card)?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      imgAlt.style.opacity = val / 100;
      imgMain.style.transform = `scale(${1 + (val / 100) * 0.08})`;
      imgAlt.style.transform = `scale(${1.08 - (val / 100) * 0.08})`;
      loupeSrc = val > 50 ? p.imgAltFull : p.imgFull;
      if (media.classList.contains('loupe-enabled')) loupe.style.backgroundImage = `url('${loupeSrc}')`;
      const deg = Math.round(val * 1.8);
      angleLabel.textContent = val < 30 ? `GÓC NHÌN: TRƯỚC (${deg}°)` : val < 70 ? `CHUYỂN GÓC (${deg}°)` : `GÓC THỨ 2 (${deg}°)`;
    });

    $('.btn-toggle-loupe', card)?.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = media.classList.toggle('loupe-enabled');
      e.currentTarget.classList.toggle('active', on);
      if (on) loupe.style.backgroundImage = `url('${loupeSrc}')`;
    });

    const moveLoupe = (clientX, clientY) => {
      if (!media.classList.contains('loupe-enabled')) return;
      const rect = media.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      loupe.style.left = `${x}px`;
      loupe.style.top = `${y}px`;
      loupe.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    };
    media.addEventListener('mousemove', (e) => moveLoupe(e.clientX, e.clientY));
    media.addEventListener('touchmove', (e) => { if (e.touches[0]) moveLoupe(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

    $('.btn-toggle-mesh', card)?.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = media.classList.toggle('mesh-active');
      e.currentTarget.classList.toggle('active', on);
    });
  }

  function renderProducts() {
    if (!productGrid) return;
    const list = filteredProducts();
    const visible = list.slice(0, state.productPage * PAGE_SIZE);
    productGrid.innerHTML = visible.map(productCardHTML).join('');
    $$('.product-card', productGrid).forEach((card, i) => {
      bindProductCard(card);
      observeReveal(card, i % PAGE_SIZE % 4);
    });
    const countLabel = $('#productCountLabel');
    if (countLabel) countLabel.textContent = `HIỂN THỊ ${visible.length} / ${list.length} SẢN PHẨM LALIN · *GIÁ THUÊ THAM KHẢO`;
    if (loadMoreBtn) loadMoreBtn.hidden = visible.length >= list.length;
  }

  productGrid?.addEventListener('click', (e) => {
    const tryBtn = e.target.closest('[data-tryon-id]');
    if (tryBtn) {
      openStudio(PRODUCTS.find((p) => p.id === tryBtn.dataset.tryonId));
      return;
    }
    const bookBtn = e.target.closest('[data-book-id]');
    if (bookBtn) {
      const p = PRODUCTS.find((x) => x.id === bookBtn.dataset.bookId);
      addToBag(p, state.priceMode, p.sizes.includes('S') ? 'S' : (p.sizes[0] || 'Free'), p.colors[0] || '');
    }
  });

  $('#productFilters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-product-filter]');
    if (!btn) return;
    state.productFilter = btn.dataset.productFilter;
    state.productPage = 1;
    renderProductFilters();
    renderProducts();
  });

  $('#productSort')?.addEventListener('change', (e) => {
    state.productSort = e.target.value;
    state.productPage = 1;
    renderProducts();
  });

  loadMoreBtn?.addEventListener('click', () => {
    state.productPage += 1;
    renderProducts();
  });

  $$('[data-price-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.priceMode === btn.dataset.priceMode) return;
      state.priceMode = btn.dataset.priceMode;
      $$('[data-price-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      renderProducts();
      showToast(state.priceMode === 'rent'
        ? 'Chế độ Thuê theo sự kiện (mô hình Minde.vn) — giá thuê tham khảo.'
        : 'Chế độ Mua sở hữu — giá bán niêm yết Lalin.vn.');
    });
  });

  // ==========================================================================
  // 7. ANYWEAR: LIVE VIRTUAL ENGINE
  //    - 4 Garment Input Methods: Product Click, File/Screenshot Upload,
  //      Clipboard Paste (Ctrl+V), Drag & Drop (from page / Pinterest / Google),
  //      and Product/Image URL Resolver
  //    - Real-Time 60FPS Motion-Tracked Webcam Canvas + Smart AI Background Matte
  //    - Floating Capsule while browsing + Document PiP + Official anywear.live link
  // ==========================================================================
  const modal = $('#anywearModal');
  const stage = $('#studioVisualStage');
  const studioImg = $('#studioMainImage');
  const webcamVideo = $('#studioWebcamVideo');
  const liveCanvas = $('#anywearLiveCanvas');
  const capsuleCanvas = $('#capsuleMiniCanvas');
  const arProjection = $('#arGarmentProjection');
  const arImg = $('#arGarmentImg');
  const inputHeight = $('#inputHeight');
  const inputWeight = $('#inputWeight');
  const inputWaist = $('#inputWaist');
  const capsuleEl = $('#anywearCapsule');
  let lastFocused = null;

  // Processed offscreen garment canvas (with AI background matte applied)
  const garmentSourceImg = new Image();
  garmentSourceImg.crossOrigin = 'anonymous';
  let garmentProcessedCanvas = null;
  let garmentRawLoaded = false;

  // Real-time upper-body motion tracking state
  const tracker = {
    cx: 0.5,       // smoothed normalized torso X (0..1)
    cy: 0.58,      // smoothed normalized torso Y (0..1)
    scale: 1.0,    // smoothed distance scale
    tilt: 0.0,     // smoothed shoulder tilt radians
    manualX: 0,    // user drag offset px
    manualY: 0,
    manualScale: 1.0,
    prevFrame: null,
    workCanvas: document.createElement('canvas'),
    rafId: null
  };
  tracker.workCanvas.width = 64;
  tracker.workCanvas.height = 48;
  const workCtx = tracker.workCanvas.getContext('2d', { willReadFrequently: true });

  // Build AI-matted garment offscreen canvas (removes bright/uniform studio background around garment)
  function buildGarmentMatte(imgEl) {
    const w = 420;
    const h = Math.round((imgEl.naturalHeight / Math.max(1, imgEl.naturalWidth)) * w) || 540;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, w, h);

    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample corners & top-left/right edges to estimate studio background color
      const samples = [
        [4, 4], [w - 5, 4], [4, Math.floor(h * 0.3)], [w - 5, Math.floor(h * 0.3)],
        [4, Math.floor(h * 0.7)], [w - 5, Math.floor(h * 0.7)]
      ];
      let sr = 0; let sg = 0; let sb = 0;
      samples.forEach(([sx, sy]) => {
        const idx = (sy * w + sx) * 4;
        sr += data[idx];
        sg += data[idx + 1];
        sb += data[idx + 2];
      });
      sr /= samples.length;
      sg /= samples.length;
      sb /= samples.length;

      // Remove background pixels similar to border color + soft vignette around head/edges
      const threshold = 46;
      const feather = 26;
      for (let y = 0; y < h; y++) {
        const ny = y / h;
        for (let x = 0; x < w; x++) {
          const nx = x / w;
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const distBg = Math.hypot(r - sr, g - sg, b - sb);

          // Also fade out the model's head area (top 19%) so the user's real head shows cleanly on camera!
          let headMask = 1;
          if (ny < 0.21) {
            const headDist = Math.hypot((nx - 0.5) * 1.6, (ny - 0.10) * 2.2);
            if (headDist < 0.26) {
              headMask = Math.max(0, (headDist - 0.14) / 0.12);
            }
          }

          // Edge oval feathering
          const edgeDist = Math.hypot((nx - 0.5) * 2.05, (ny - 0.55) * 1.9);
          const edgeMask = edgeDist > 0.92 ? Math.max(0, 1 - (edgeDist - 0.92) * 5) : 1;

          let bgAlpha = 1;
          if (distBg < threshold) {
            bgAlpha = 0;
          } else if (distBg < threshold + feather) {
            bgAlpha = (distBg - threshold) / feather;
          }

          data[idx + 3] = Math.round(data[idx + 3] * bgAlpha * headMask * edgeMask);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      // Cross-origin image without CORS headers: keep un-matted image gracefully
    }
    return c;
  }

  function loadGarmentImageForLive(src) {
    garmentRawLoaded = false;
    garmentProcessedCanvas = null;
    garmentSourceImg.onload = () => {
      garmentRawLoaded = true;
      garmentProcessedCanvas = buildGarmentMatte(garmentSourceImg);
    };
    garmentSourceImg.onerror = () => {
      // Fallback without crossOrigin if remote host blocks anonymous CORS
      const fallback = new Image();
      fallback.onload = () => {
        garmentRawLoaded = true;
        garmentProcessedCanvas = fallback;
      };
      fallback.src = src;
    };
    garmentSourceImg.src = src;
  }

  // Real-time motion & upper-body silhouette tracker on 64x48 downsampled frame
  function updateMotionTracking(videoEl) {
    if (!state.studio.autoTrack || videoEl.readyState < 2) return;
    const w = 64;
    const h = 48;
    workCtx.save();
    if (state.studio.facingMode === 'user') {
      workCtx.translate(w, 0);
      workCtx.scale(-1, 1);
    }
    workCtx.drawImage(videoEl, 0, 0, w, h);
    workCtx.restore();

    const frame = workCtx.getImageData(0, 0, w, h).data;
    if (tracker.prevFrame) {
      let sumX = 0;
      let sumY = 0;
      let sumW = 0;
      let leftMass = 0;
      let rightMass = 0;

      for (let y = 4; y < h - 4; y++) {
        for (let x = 6; x < w - 6; x++) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(frame[i] - tracker.prevFrame[i])
            + Math.abs(frame[i + 1] - tracker.prevFrame[i + 1])
            + Math.abs(frame[i + 2] - tracker.prevFrame[i + 2]);
          if (diff > 42) {
            const weight = diff;
            sumX += (x / w) * weight;
            sumY += (y / h) * weight;
            sumW += weight;
            if (x < w / 2) leftMass += (y / h) * weight;
            else rightMass += (y / h) * weight;
          }
        }
      }

      if (sumW > 9500) {
        const targetX = Math.max(0.28, Math.min(0.72, sumX / sumW));
        const targetY = Math.max(0.44, Math.min(0.70, (sumY / sumW) + 0.10));
        tracker.cx += (targetX - tracker.cx) * 0.18;
        tracker.cy += (targetY - tracker.cy) * 0.14;
        const targetTilt = Math.max(-0.12, Math.min(0.12, ((rightMass - leftMass) / sumW) * 0.35));
        tracker.tilt += (targetTilt - tracker.tilt) * 0.15;
      } else {
        // Gently ease tilt back when standing still
        tracker.tilt *= 0.92;
      }
    }
    tracker.prevFrame = new Uint8ClampedArray(frame);
  }

  // 60FPS Render Loop for both Studio Canvas & Floating Capsule Mini Canvas
  function renderLiveLoop() {
    if (!state.webcamStream) {
      tracker.rafId = null;
      return;
    }

    updateMotionTracking(webcamVideo);

    const targets = [];
    if (liveCanvas && modal?.classList.contains('open')) targets.push(liveCanvas);
    if (capsuleCanvas && !capsuleEl?.hidden) targets.push(capsuleCanvas);

    targets.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && canvas === liveCanvas) {
        if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
        }
      }
      const cw = canvas.width;
      const ch = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, cw, ch);

      // 1. Draw Live Camera Video (cover fit, mirrored for front camera)
      if (webcamVideo.readyState >= 2) {
        const vw = webcamVideo.videoWidth || 640;
        const vh = webcamVideo.videoHeight || 480;
        const scale = Math.max(cw / vw, ch / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.save();
        if (state.studio.facingMode === 'user') {
          ctx.translate(cw, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(webcamVideo, dx, dy, dw, dh);
        ctx.restore();
      }

      // 2. Draw Motion-Tracked Garment (unless user holds "Hold to see yourself")
      if (!state.studio.holdOriginal && garmentRawLoaded) {
        const sourceDrawable = (state.studio.aiMatte && garmentProcessedCanvas)
          ? garmentProcessedCanvas
          : garmentSourceImg;
        const gw = sourceDrawable.width || sourceDrawable.naturalWidth || 400;
        const gh = sourceDrawable.height || sourceDrawable.naturalHeight || 520;

        const waistFactor = 1 + (Number(inputWaist?.value || 64) - 64) * 0.006;
        const baseWidth = cw * 0.62 * tracker.scale * tracker.manualScale * waistFactor;
        const baseHeight = baseWidth * (gh / Math.max(1, gw));

        const scaleRatio = canvas === capsuleCanvas ? (cw / 500) : 1;
        const centerX = cw * tracker.cx + tracker.manualX * scaleRatio;
        const centerY = ch * tracker.cy + tracker.manualY * scaleRatio;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(tracker.tilt);
        ctx.globalAlpha = 0.94;
        ctx.drawImage(sourceDrawable, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore();
      }
    });

    tracker.rafId = requestAnimationFrame(renderLiveLoop);
  }

  // Add to Recent Looks Tray (persists up to 6 looks in session)
  function pushRecentLook(product) {
    if (!product) return;
    state.recentLooks = [
      product,
      ...state.recentLooks.filter((x) => x.id !== product.id)
    ].slice(0, 6);
    renderRecentLooksTray();
  }

  function renderRecentLooksTray() {
    const list = $('#studioLooksList');
    if (!list) return;
    const currentId = state.studio.product?.id;
    list.innerHTML = state.recentLooks.map((item) => `
      <button type="button" class="aw-look-thumb ${item.id === currentId ? 'active' : ''}" data-look-id="${item.id}" title="${esc(item.title)}">
        <img src="${item.img}" alt="${esc(item.title)}" />
      </button>
    `).join('');
  }

  $('#studioLooksList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-look-id]');
    if (!btn) return;
    const found = state.recentLooks.find((x) => x.id === btn.dataset.lookId)
      || PRODUCTS.find((x) => x.id === btn.dataset.lookId);
    if (found) selectStudioProduct(found);
  });

  function setStudioImage(idx) {
    const p = state.studio.product;
    if (!p) return;
    const gallery = p.gallery?.length ? p.gallery : [p.img];
    state.studio.imgIndex = (idx + gallery.length) % gallery.length;
    const rawSrc = gallery[state.studio.imgIndex];
    const hiResSrc = rawSrc.includes('_grande.') ? rawSrc.replace('_grande.', '_1024x1024.') : rawSrc;
    studioImg.src = hiResSrc;
    arImg.src = hiResSrc;
    const capThumb = $('#capsuleGarmentThumb');
    if (capThumb) capThumb.src = rawSrc;
    loadGarmentImageForLive(hiResSrc);
    $$('#studioThumbs img').forEach((t, i) => t.classList.toggle('active', i === state.studio.imgIndex));
  }

  function renderChips() {
    const p = state.studio.product;
    if (!p) return;
    const sizeWrap = $('#studioSizeChips');
    const colorWrap = $('#studioColorChips');
    const rec = recommendSize();
    sizeWrap.innerHTML = (p.sizes || []).map((s) => `
      <button type="button" class="chip ${s === state.studio.size ? 'active' : ''} ${s === rec ? 'recommended' : ''}" data-size="${s}">${s}</button>`).join('');
    colorWrap.innerHTML = (p.colors || []).map((c) => `
      <button type="button" class="chip ${c === state.studio.color ? 'active' : ''}" data-color="${esc(c)}">${esc(c)}</button>`).join('');
  }

  function selectStudioProduct(product) {
    if (!product) return;
    state.studio.product = product;
    state.studio.color = product.colors?.[0] || '';
    state.studio.size = null;

    $('#studioProductCategory').textContent = `LALIN.VN · ${CATEGORY_LABELS[product.category] || 'CUSTOM TRY-ON'}`;
    $('#studioProductTitle').textContent = product.title;
    $('#capsuleProductTitle').textContent = product.title;
    $('#studioRentPrice').textContent = fmt(product.rent || 450000);
    $('#studioBuyPrice').textContent = fmt(product.price || 1690000);
    $('#studioLalinLink').href = product.url || 'https://lalin.vn/collections/ao-1';
    $('#studioThumbs').innerHTML = (product.gallery || [product.img]).map((src, i) =>
      `<img src="${src}" alt="Ảnh ${i + 1}" data-thumb="${i}" loading="lazy" />`).join('');

    pushRecentLook(product);
    setStudioImage(0);
    updateBodyFit();
    state.studio.size = recommendSize();
    renderChips();
  }

  function openStudio(product, opts = {}) {
    const targetProduct = product || state.studio.product || PRODUCTS[0];
    if (!targetProduct || !modal) return;

    // Hide floating capsule if expanding back to studio
    if (capsuleEl) capsuleEl.hidden = true;
    state.studio.inCapsule = false;

    selectStudioProduct(targetProduct);

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (opts.autoStartCam) {
      startWebcam();
    } else if (state.webcamStream && !tracker.rafId) {
      tracker.rafId = requestAnimationFrame(renderLiveLoop);
    }
  }

  function closeStudio(keepCapsule = false) {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    $('#studioAddSheet')?.setAttribute('hidden', '');

    if (!keepCapsule) {
      stopWebcam();
      if (capsuleEl) capsuleEl.hidden = true;
      state.studio.inCapsule = false;
    }
    if (!$('#bagDrawer')?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    lastFocused?.focus?.();
  }

  $('#closeAnywearModalBtn')?.addEventListener('click', () => closeStudio(false));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeStudio(false); });

  // Shrink to Floating Capsule while user keeps browsing the store!
  function shrinkToCapsule() {
    if (!state.studio.product) selectStudioProduct(PRODUCTS[0]);
    state.studio.inCapsule = true;
    if (capsuleEl) capsuleEl.hidden = false;
    const capThumb = $('#capsuleGarmentThumb');
    if (capThumb) {
      capThumb.style.display = state.webcamStream ? 'none' : 'block';
    }
    closeStudio(true);
    showToast('Đã thu nhỏ thành AnyWear Capsule! Lướt web và kéo thả bất kỳ ảnh áo nào vào Capsule để đổi đồ ngay.');
  }

  $('#studioShrinkCapsuleBtn')?.addEventListener('click', shrinkToCapsule);
  $('#capsuleExpandBtn')?.addEventListener('click', () => openStudio(state.studio.product));
  $('#capsuleCloseBtn')?.addEventListener('click', () => {
    if (capsuleEl) capsuleEl.hidden = true;
    state.studio.inCapsule = false;
    stopWebcam();
  });

  // Document Picture-in-Picture / Floating Window over any store (Pinterest, Google Images, etc.)
  $('#studioFloatPipBtn')?.addEventListener('click', async () => {
    const p = state.studio.product || PRODUCTS[0];
    const garmentUrl = p?.imgFull || p?.img || '';
    const officialUrl = `https://anywear.live/try-on?preview=1&garment=${encodeURIComponent(garmentUrl)}&from=lalin`;

    const w = 420;
    const h = 680;
    const left = Math.max(20, window.screen.availWidth - w - 30);
    const top = Math.max(20, Math.round((window.screen.availHeight - h) / 2));
    const popup = window.open(
      officialUrl,
      'anywear-studio',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`
    );
    if (popup) {
      shrinkToCapsule();
      showToast('Đã mở cửa sổ nổi AnyWear.Live! Bạn có thể kéo thả ảnh từ Pinterest, Google Images hoặc Lalin vào cửa sổ đó.');
    } else {
      showToast('Vui lòng cho phép mở cửa sổ bật lên (Pop-up) trên trình duyệt để thả nổi AnyWear.');
    }
  });

  // Official AnyWear.Live Cloud Bridge Button
  $('#openOfficialAnywearPopupBtn')?.addEventListener('click', () => {
    const p = state.studio.product || PRODUCTS[0];
    const garmentUrl = p?.imgFull || p?.img || '';
    const officialUrl = `https://anywear.live/try-on?preview=1&garment=${encodeURIComponent(garmentUrl)}&from=lalin`;
    window.open(officialUrl, '_blank', 'noopener');
  });

  // Tier selector (Flash / Standard / Ultra)
  $$('[data-aw-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.studio.tier = btn.dataset.awTier;
      $$('[data-aw-tier]').forEach((b) => b.classList.toggle('active', b === btn));
      const names = { flash: 'Flash (Nhanh nhất)', standard: 'Standard (Mượt mà)', ultra: 'Ultra (Siêu thực)' };
      showToast(`Đã chuyển chế độ AnyWear sang ${names[state.studio.tier] || 'Standard'}.`);
    });
  });

  // ==========================================================================
  // 8. UNIVERSAL GARMENT INPUT: UPLOAD, PASTE (Ctrl+V), DRAG & DROP, URL LINK
  // ==========================================================================
  function createCustomGarmentObject(imgSrc, label = 'Trang phục tải lên') {
    return {
      id: `custom-${Date.now()}`,
      title: label,
      category: 'yem',
      fabric: 'AnyWear Custom Upload',
      price: 1690000,
      rent: 480000,
      sizes: ['S', 'M', 'L'],
      colors: ['Tùy chỉnh'],
      url: 'https://anywear.live/try-on?preview=1',
      img: imgSrc,
      imgAlt: imgSrc,
      imgFull: imgSrc,
      imgAltFull: imgSrc,
      gallery: [imgSrc]
    };
  }

  function handleFileInput(file, sourceLabel = 'Ảnh tải lên') {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.hei[cf]$/i.test(file.name)) {
      showToast('Vui lòng chọn file hình ảnh (JPG, PNG, WebP, AVIF, Screenshot).');
      return;
    }
    const objUrl = URL.createObjectURL(file);
    const cleanName = file.name ? file.name.replace(/\.[^.]+$/, '').slice(0, 42) : sourceLabel;
    const customProd = createCustomGarmentObject(objUrl, `AnyWear: ${cleanName}`);
    $('#studioAddSheet')?.setAttribute('hidden', '');
    if (state.studio.inCapsule && !capsuleEl?.hidden) {
      selectStudioProduct(customProd);
      showToast(`Đã đổi sang "${customProd.title}" ngay trong Capsule!`);
    } else {
      openStudio(customProd, { autoStartCam: false });
      showToast(`Đã tải "${customProd.title}" vào phòng thử AnyWear.Live!`);
    }
  }

  // Handle URL input (supports Lalin product links, direct image URLs, Pinterest/Google Images links)
  function handleUrlInput(rawUrl) {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return;
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      showToast('Đường dẫn (URL) không hợp lệ. Hãy dán link bắt đầu bằng https://');
      return;
    }

    // 1. Check if it matches one of the 69 Lalin products by handle
    const matchedLalin = PRODUCTS.find((p) => trimmed.includes(p.handle));
    if (matchedLalin) {
      // Show candidate images from that Lalin product page (just like AnyWear's candidate picker!)
      const candBox = $('#studioCandidateBox');
      const candGrid = $('#studioCandidateGrid');
      if (candBox && candGrid && modal?.classList.contains('open')) {
        candBox.hidden = false;
        candGrid.innerHTML = matchedLalin.gallery.map((src, idx) => `
          <button type="button" data-pick-lalin="${matchedLalin.id}" data-pick-idx="${idx}">
            <img src="${src}" alt="${esc(matchedLalin.title)}" />
          </button>
        `).join('');
        showToast(`Tìm thấy ${matchedLalin.gallery.length} ảnh từ "${matchedLalin.title}" — bấm chọn ảnh để thử!`);
      } else {
        openStudio(matchedLalin);
        showToast(`Đã tải sản phẩm Lalin: "${matchedLalin.title}"!`);
      }
      return;
    }

    // 2. Extract nested image URL if it's a Google Images or Pinterest redirect link
    const imgParam = parsed.searchParams.get('imgurl') || parsed.searchParams.get('media') || parsed.searchParams.get('url');
    const finalImgUrl = imgParam || parsed.href;

    const hostLabel = parsed.hostname.replace(/^www\./, '');
    const customProd = createCustomGarmentObject(finalImgUrl, `Trang phục từ ${hostLabel}`);
    $('#studioAddSheet')?.setAttribute('hidden', '');
    if (state.studio.inCapsule && !capsuleEl?.hidden) {
      selectStudioProduct(customProd);
      showToast(`Đã đổi trang phục từ ${hostLabel} trong Capsule!`);
    } else {
      openStudio(customProd);
      showToast(`Đã nạp ảnh trang phục từ ${hostLabel}! Bấm "Bật Camera Live" hoặc "Mở trên AnyWear.Live ↗" để thử.`);
    }
  }

  // Candidate grid click inside Add Sheet
  $('#studioCandidateGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-lalin]');
    if (!btn) return;
    const prod = PRODUCTS.find((p) => p.id === btn.dataset.pickLalin);
    const idx = Number(btn.dataset.pickIdx || 0);
    if (prod) {
      selectStudioProduct(prod);
      setStudioImage(idx);
      $('#studioAddSheet')?.setAttribute('hidden', '');
      showToast(`Đã chọn góc ảnh #${idx + 1} của "${prod.title}"!`);
    }
  });

  // Extract dropped dataTransfer (Files, <img src> from other websites, product card drag, or URL)
  function handleDataTransferDrop(dt) {
    if (!dt) return;
    // 1. Internal Lalin product drag
    const internalId = dt.getData('application/x-anywear-id');
    if (internalId) {
      const prod = PRODUCTS.find((p) => p.id === internalId);
      if (prod) {
        if (state.studio.inCapsule && !capsuleEl?.hidden) {
          selectStudioProduct(prod);
          showToast(`Đã đổi sang "${prod.title}" trong Capsule!`);
        } else {
          openStudio(prod);
          showToast(`Đã chọn "${prod.title}" để thử đồ!`);
        }
        return;
      }
    }

    // 2. Dropped image file from computer
    if (dt.files && dt.files.length > 0) {
      handleFileInput(dt.files[0], 'Ảnh kéo thả');
      return;
    }

    // 3. Dropped HTML `<img>` from Pinterest, Google Images, or any website
    const html = dt.getData('text/html');
    if (html) {
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && m[1]) {
        handleUrlInput(m[1]);
        return;
      }
    }

    // 4. Dropped URI / plain text URL
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (uri) {
      handleUrlInput(uri.split(/\r?\n/)[0]);
    }
  }

  // Bind Landing Page Universal Hub Controls
  const hubFileInput = $('#hubFileInput');
  $('#hubUploadBtn')?.addEventListener('click', () => hubFileInput?.click());
  $('#trayQuickUploadBtn')?.addEventListener('click', () => hubFileInput?.click());
  $('#studioUploadFileBtn')?.addEventListener('click', () => hubFileInput?.click());
  hubFileInput?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleFileInput(e.target.files[0]);
    e.target.value = '';
  });

  $('#hubOpenCameraNowBtn')?.addEventListener('click', () => {
    openStudio(state.studio.product || PRODUCTS[0], { autoStartCam: true });
  });

  $('#hubLinkForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#hubLinkInput');
    if (input?.value.trim()) {
      handleUrlInput(input.value.trim());
      input.value = '';
    }
  });

  $('#studioLinkForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#studioLinkInput');
    if (input?.value.trim()) {
      handleUrlInput(input.value.trim());
      input.value = '';
    }
  });

  // Open / close Add Clothes sheet inside Studio
  $('#studioAddClothesBtn')?.addEventListener('click', () => {
    const sheet = $('#studioAddSheet');
    if (sheet) sheet.hidden = !sheet.hidden;
  });
  $('#closeAddSheetBtn')?.addEventListener('click', () => {
    $('#studioAddSheet')?.setAttribute('hidden', '');
  });

  // Drag & Drop on Hub, Studio Viewport, and Floating Capsule
  function bindDropZone(el, activeClass) {
    if (!el) return;
    el.addEventListener('dragenter', (e) => { e.preventDefault(); el.classList.add(activeClass); });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add(activeClass); });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) el.classList.remove(activeClass);
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove(activeClass);
      handleDataTransferDrop(e.dataTransfer);
    });
  }

  bindDropZone($('#hubDropZone'), 'drag-over');
  bindDropZone($('#studioDropViewport'), 'dragging-over');
  bindDropZone(capsuleEl, 'capsule-drop-active');

  // Global Clipboard Paste (Ctrl+V / Cmd+V) for screenshots, copied images, or product links
  document.addEventListener('paste', (e) => {
    if (e.target.closest('input, textarea')) return;
    const cb = e.clipboardData;
    if (!cb) return;
    const imgFile = Array.from(cb.files || []).find((f) => f.type.startsWith('image/'));
    if (imgFile) {
      e.preventDefault();
      handleFileInput(imgFile, 'Screenshot Ctrl+V');
      return;
    }
    const text = cb.getData('text/plain')?.trim();
    if (text && /^https?:\/\//i.test(text)) {
      e.preventDefault();
      handleUrlInput(text);
    }
  });

  // ==========================================================================
  // 9. CAMERA & MOTION-TRACKING CONTROLS INSIDE STUDIO
  // ==========================================================================
  $('#studioThumbs')?.addEventListener('click', (e) => {
    const t = e.target.closest('[data-thumb]');
    if (t) setStudioImage(Number(t.dataset.thumb));
  });
  $('#studioSizeChips')?.addEventListener('click', (e) => {
    const c = e.target.closest('[data-size]');
    if (!c) return;
    state.studio.size = c.dataset.size;
    renderChips();
  });
  $('#studioColorChips')?.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (!c) return;
    state.studio.color = c.dataset.color;
    renderChips();
  });

  // Auto Motion Track toggle
  $('#studioAutoTrackBtn')?.addEventListener('click', (e) => {
    state.studio.autoTrack = !state.studio.autoTrack;
    e.currentTarget.classList.toggle('active', state.studio.autoTrack);
    e.currentTarget.textContent = state.studio.autoTrack ? '🎯 Bám Chuyển Động: BẬT' : '🎯 Bám Chuyển Động: TẮT';
    showToast(state.studio.autoTrack
      ? 'Đã bật Bám Chuyển Động Cơ Thể (Auto Motion Track).'
      : 'Đã tắt Bám Chuyển Động — bạn có thể kéo thả cố định vị trí áo.');
  });

  // AI Background Matte toggle
  $('#studioBgMatteBtn')?.addEventListener('click', (e) => {
    state.studio.aiMatte = !state.studio.aiMatte;
    e.currentTarget.classList.toggle('active', state.studio.aiMatte);
    showToast(state.studio.aiMatte
      ? 'Đã bật Tách Nền AI — tự động làm trong suốt nền sáng quanh trang phục.'
      : 'Đang hiển thị khung ảnh gốc.');
  });

  // Hold to see yourself button (exact AnyWear.Live feature)
  const holdSelfBtn = $('#studioHoldSelfBtn');
  if (holdSelfBtn) {
    const setHold = (val) => {
      state.studio.holdOriginal = val;
      holdSelfBtn.setAttribute('aria-pressed', String(val));
      holdSelfBtn.textContent = val ? 'Đang hiển thị camera gốc' : 'Giữ để xem camera gốc';
    };
    holdSelfBtn.addEventListener('pointerdown', () => setHold(true));
    holdSelfBtn.addEventListener('pointerup', () => setHold(false));
    holdSelfBtn.addEventListener('pointerleave', () => setHold(false));
    holdSelfBtn.addEventListener('pointercancel', () => setHold(false));
  }

  // Drag & mouse-wheel zoom directly on the Live Canvas to fine-tune garment placement
  if (liveCanvas) {
    let dragging = false; let sx = 0; let sy = 0; let ox = 0; let oy = 0;
    liveCanvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = tracker.manualX;
      oy = tracker.manualY;
      liveCanvas.setPointerCapture(e.pointerId);
    });
    liveCanvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      tracker.manualX = ox + (e.clientX - sx);
      tracker.manualY = oy + (e.clientY - sy);
    });
    const endDrag = () => { dragging = false; };
    liveCanvas.addEventListener('pointerup', endDrag);
    liveCanvas.addEventListener('pointercancel', endDrag);
    liveCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      tracker.manualScale = Math.max(0.55, Math.min(2.1, tracker.manualScale - e.deltaY * 0.001));
    }, { passive: false });
  }

  function recommendSize() {
    const p = state.studio.product;
    const waist = Number(inputWaist?.value || 64);
    const weight = Number(inputWeight?.value || 50);
    let size = 'S';
    if (waist > 70 || weight > 56) size = 'L';
    else if (waist > 66 || weight > 51) size = 'M';
    if (!p || !p.sizes?.length) return null;
    return p.sizes.includes(size) ? size : p.sizes[p.sizes.length - 1];
  }

  function updateBodyFit() {
    const h = Number(inputHeight?.value || 163);
    const w = Number(inputWeight?.value || 50);
    const waist = Number(inputWaist?.value || 64);
    $('#valHeight').textContent = `${h} cm`;
    $('#valWeight').textContent = `${w} kg`;
    $('#valWaist').textContent = `${waist} cm`;
    $('#bodySummaryLabel').textContent = `${h}cm • ${w}kg • Eo ${waist}cm`;

    const p = state.studio.product;
    const rec = recommendSize();
    const outOfRange = waist > 78 || w > 66;
    const fit = Math.round(Math.max(72, Math.min(99, 99 - Math.abs(162 - h) * 0.2 - Math.max(0, waist - 74) * 1.5 - Math.max(0, 58 - waist) * 1.2)));
    $('#studioFitPercent').textContent = `${fit}%`;
    $('#studioRecommendedSize').innerHTML = !p || !p.sizes?.length
      ? 'Phụ kiện: <strong>Free size</strong>'
      : outOfRange
        ? `Khuyên dùng: <strong>Size ${rec} + chỉnh sửa / may đo riêng</strong>`
        : `Khuyên dùng: <strong>Size ${rec}</strong> (bảng size Lalin)`;

    const scale = 1 + (h - 163) * 0.002;
    if (studioImg) studioImg.style.transform = `scale(${scale.toFixed(3)})`;
  }

  [inputHeight, inputWeight, inputWaist].forEach((el) => el?.addEventListener('input', () => {
    updateBodyFit();
    if (state.studio.product) {
      state.studio.size = recommendSize();
      renderChips();
    }
  }));

  const LIGHTS = {
    daylight: ['contrast(1.02) brightness(1.04) saturate(1.05)', 'Nắng Sớm (Lalin Lookbook)'],
    redvilla: ['contrast(1.15) brightness(0.95) sepia(0.22) hue-rotate(-15deg) saturate(1.3)', 'Biệt Thự Đỏ (Stressmama)'],
    gala: ['contrast(1.12) brightness(0.88) saturate(1.2)', 'Dạ Tiệc Đêm (Minde)']
  };
  $$('[data-light]').forEach((btn) => btn.addEventListener('click', () => {
    $$('[data-light]').forEach((b) => b.classList.toggle('active', b === btn));
    const [filter, label] = LIGHTS[btn.dataset.light] || LIGHTS.daylight;
    if (studioImg) studioImg.style.filter = filter;
    if (liveCanvas) liveCanvas.style.filter = filter;
    $('#lightingModeLabel').textContent = label;
  }));

  // --- Start / Stop / Flip Live Webcam --------------------------------------
  const modeAvatarBtn = $('#modeAvatarBtn');
  const modeWebcamBtn = $('#modeWebcamBtn');
  const flipCamBtn = $('#studioFlipCamBtn');

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function startSessionTimer() {
    clearInterval(state.timerId);
    state.liveStartAt = Date.now();
    state.timerId = setInterval(() => {
      const elapsed = (Date.now() - state.liveStartAt) / 1000;
      const text = formatTimer(elapsed);
      const t1 = $('#studioLiveTimer');
      const t2 = $('#capsuleTimer');
      if (t1) t1.textContent = text;
      if (t2) t2.textContent = text;
    }, 1000);
  }

  async function startWebcam(facing = state.studio.facingMode) {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      showToast('Trình duyệt cần chạy trên HTTPS hoặc localhost để bật Camera trực tiếp.');
      return;
    }
    try {
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach((t) => t.stop());
      }
      state.studio.facingMode = facing;
      state.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      webcamVideo.srcObject = state.webcamStream;
      await webcamVideo.play().catch(() => {});

      stage?.classList.add('webcam-on');
      if (holdSelfBtn) holdSelfBtn.hidden = false;
      if (flipCamBtn) flipCamBtn.hidden = false;

      const liveBadge = $('#studioLiveBadge');
      if (liveBadge) liveBadge.classList.add('is-live');
      const liveText = $('#studioLiveStatusText');
      if (liveText) liveText.textContent = 'LIVE';

      if (modeWebcamBtn) {
        modeWebcamBtn.textContent = '⏹ Tắt Camera';
        modeWebcamBtn.classList.add('live-on');
      }
      modeAvatarBtn?.classList.remove('active');

      const capThumb = $('#capsuleGarmentThumb');
      if (capThumb) capThumb.style.display = 'none';

      startSessionTimer();
      if (!tracker.rafId) {
        tracker.rafId = requestAnimationFrame(renderLiveLoop);
      }
      showToast('Camera AnyWear.Live đã bật! Hãy di chuyển cơ thể để xem trang phục bám theo chuyển động của bạn.');
    } catch (err) {
      showToast('Không thể truy cập Camera. Hãy cấp quyền Camera trên thanh địa chỉ trình duyệt hoặc mở trên AnyWear.Live ↗');
    }
  }

  function stopWebcam() {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach((t) => t.stop());
      state.webcamStream = null;
    }
    if (tracker.rafId) {
      cancelAnimationFrame(tracker.rafId);
      tracker.rafId = null;
    }
    clearInterval(state.timerId);
    if (webcamVideo) webcamVideo.srcObject = null;
    stage?.classList.remove('webcam-on');
    if (holdSelfBtn) holdSelfBtn.hidden = true;
    if (flipCamBtn) flipCamBtn.hidden = true;

    const liveBadge = $('#studioLiveBadge');
    if (liveBadge) liveBadge.classList.remove('is-live');
    const liveText = $('#studioLiveStatusText');
    if (liveText) liveText.textContent = 'PREVIEW';

    if (modeWebcamBtn) {
      modeWebcamBtn.textContent = '📷 Bật Camera Live';
      modeWebcamBtn.classList.remove('live-on');
    }
    modeAvatarBtn?.classList.add('active');

    const capThumb = $('#capsuleGarmentThumb');
    if (capThumb) capThumb.style.display = 'block';
  }

  modeWebcamBtn?.addEventListener('click', () => {
    if (state.webcamStream) stopWebcam();
    else startWebcam(state.studio.facingMode);
  });
  modeAvatarBtn?.addEventListener('click', stopWebcam);

  flipCamBtn?.addEventListener('click', () => {
    const nextFacing = state.studio.facingMode === 'user' ? 'environment' : 'user';
    startWebcam(nextFacing);
  });

  $('#studioConfirmRentBtn')?.addEventListener('click', () => studioAdd('rent'));
  $('#studioConfirmBuyBtn')?.addEventListener('click', () => studioAdd('buy'));

  function studioAdd(mode) {
    const p = state.studio.product;
    if (!p) return;
    if (p.sizes?.length && !state.studio.size) { showToast('Vui lòng chọn size trước.'); return; }
    addToBag(p, mode, state.studio.size || 'Free', state.studio.color);
    closeStudio(false);
  }

  // ==========================================================================
  // 10. BAG DRAWER
  // ==========================================================================
  const bagDrawer = $('#bagDrawer');

  function addToBag(p, mode, size, color) {
    const key = `${p.id}|${mode}|${size}|${color}`;
    const existing = state.bag.find((i) => i.key === key);
    if (existing) existing.qty += 1;
    else state.bag.push({ key, id: p.id, title: p.title, img: p.img, mode, size, color, qty: 1, unit: mode === 'rent' ? p.rent : p.price });
    renderBag();
    showToast(`Đã thêm "${p.title}" (${mode === 'rent' ? 'Thuê' : 'Mua'} · Size ${size}) vào giỏ.`);
  }

  function renderBag() {
    const count = state.bag.reduce((s, i) => s + i.qty, 0);
    $('#bagCountBadge').textContent = `(${count})`;
    const wrap = $('#bagItems');
    if (!wrap) return;
    wrap.innerHTML = state.bag.length ? state.bag.map((i, idx) => `
      <div class="bag-item">
        <img src="${i.img}" alt="${esc(i.title)}" />
        <div>
          <h5>${esc(i.title)}</h5>
          <small>${i.mode === 'rent' ? 'THUÊ 3 NGÀY' : 'MUA'} · SIZE ${esc(i.size)}${i.color ? ' · ' + esc(i.color) : ''} · x${i.qty}</small>
          <small style="color: var(--accent-gold);">${fmt(i.unit * i.qty)}</small>
        </div>
        <button type="button" class="remove-btn" data-remove="${idx}" title="Xóa">✕</button>
      </div>`).join('') : '<p class="bag-empty">Chưa có sản phẩm. Hãy thử đồ bằng AnyWear.Live và thêm vào giỏ nhé!</p>';
    $('#bagTotal').textContent = fmt(state.bag.reduce((s, i) => s + i.unit * i.qty, 0));
  }

  function openBag() {
    bagDrawer?.classList.add('open');
    bagDrawer?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function closeBag() {
    bagDrawer?.classList.remove('open');
    bagDrawer?.setAttribute('aria-hidden', 'true');
    if (!modal?.classList.contains('open')) document.body.classList.remove('modal-open');
  }

  $('#bagDrawerBtn')?.addEventListener('click', openBag);
  $('#closeBagBtn')?.addEventListener('click', closeBag);
  bagDrawer?.addEventListener('click', (e) => {
    if (e.target === bagDrawer) { closeBag(); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) { state.bag.splice(Number(rm.dataset.remove), 1); renderBag(); }
  });
  $('#checkoutBtn')?.addEventListener('click', () => {
    if (!state.bag.length) { showToast('Giỏ hàng đang trống.'); return; }
    showToast('Đã ghi nhận đơn (demo). Nhân viên sẽ liên hệ xác nhận lịch thuê / giao hàng.');
    state.bag = [];
    renderBag();
    closeBag();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal?.classList.contains('open')) closeStudio(false);
    else if (bagDrawer?.classList.contains('open')) closeBag();
  });

  window.addEventListener('pagehide', stopWebcam);

  // Support URL query parameter `?garment=<url>` on our own landing page too!
  function checkInitialGarmentQuery() {
    const params = new URLSearchParams(window.location.search);
    const garmentParam = params.get('garment');
    if (garmentParam) {
      handleUrlInput(garmentParam);
    }
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  if (PRODUCTS.length) {
    state.recentLooks = PRODUCTS.slice(0, 4);
  }
  renderLookbookFilters();
  renderLookbook();
  renderProductFilters();
  renderProducts();
  renderBag();
  checkInitialGarmentQuery();
})();
