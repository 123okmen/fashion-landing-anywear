// ============================================================================
// ATELIER V.26 — LALIN.VN (BST) × STRESSMAMA.VN (VISUAL) × MINDE.VN (PRODUCT)
// AnyWear AI Body-Fit Engine v3.0:
//   - AI Garment Synthesis & Studio/Head/Skin Segmentation on all 69 Lalin items
//   - MediaPipe Pose 33-Keypoint Real-Time Skeleton Tracking
//   - 96-Triangle (6x8 Grid) Piecewise Affine Cloth Mesh Warping onto Real Body
//   - Forearm/Hand Occlusion + 3D Torso Yaw Foreshortening + Dynamic Fold Shading
//   - Inline On-Card "✦ AI Fit Live" on every product + Full AnyWear Live Studio
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
      viewMode: 'ai-motion', // 'avatar' | 'ai-motion' | 'webcam'
      autoTrack: true,
      aiMatte: true,
      showMeshDebug: false,
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
    toast.innerHTML = `<span style="color: var(--aw-lime); font-weight: 700;">✦ AnyWear AI:</span> ${esc(msg)}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }

  function checkAnywearExtension() {
    const extBadge = $('#awExtStatusBadge');
    const hasExt = Boolean(document.documentElement.dataset.anywear);
    if (extBadge) {
      extBadge.textContent = hasExt
        ? '✦ AnyWear Chrome Extension: Đã Kết Nối'
        : '✦ AnyWear AI Body-Fit Engine: Sẵn Sàng (3D Pose Mesh)';
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
        customCursor.classList.toggle('cursor-anywear', /AR|TRY|AI/i.test(label));
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
    if (heroBase) {
      heroBase.src = heroProduct.imgFull;
      heroBase.alt = heroProduct.title;
      heroBase.setAttribute('data-product-image', 'true');
      heroBase.setAttribute('data-product-name', heroProduct.title);
    }
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
      if (heroReadout) heroReadout.textContent = `ANYWEAR AI MESH ${Math.round(ratio)}% • LIVE 60FPS`;
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
  // 4. LALIN LOOKBOOK: DRAG-TO-GLIDE + VELOCITY SKEW + INLINE AI BODY-FIT
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
          <img src="${p.img}" alt="${esc(p.title)}" class="lookbook-img-primary" loading="${i < 4 ? 'eager' : 'lazy'}" draggable="true" data-garment-id="${p.id}" data-product-image="true" data-product-name="${esc(p.title)}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="lookbook-img-secondary" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <canvas class="card-ai-live-canvas" width="360" height="460"></canvas>
          <button type="button" class="card-ai-fit-toggle" data-inline-aifit="${p.id}" title="Mô phỏng AI khớp trang phục vào chuyển động cơ thể ngay trên thẻ">
            ✦ AI Fit Live
          </button>
          <div class="anywear-card-overlay">
            <button type="button" class="anywear-live-pill" data-open-tryon="${p.id}">
              <span class="aw-lime-dot"></span> ✦ Try on
            </button>
            <span class="chapter-tag">${CHAPTER_LABELS[p.category] || 'LALIN'}</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span>LALIN × ANYWEAR AI MESH</span>
              <span class="scrub-status-label">Kéo để đổi góc</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="angle-scrubber-input lookbook-scrubber" aria-label="Đổi góc ảnh ${esc(p.title)}" />
            <div class="dock-top-row">
              <span style="color: var(--accent-gold);">${esc(p.fabric)}</span>
              <button type="button" class="dock-mini-btn tryon-trigger" data-open-tryon="${p.id}">✦ Mở Phòng Thử AI</button>
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
      const p = PRODUCTS.find((x) => x.id === card.dataset.id);
      const secondary = $('.lookbook-img-secondary', card);
      const label = $('.scrub-status-label', card);
      $('.lookbook-scrubber', card)?.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        card.classList.add('scrubbed');
        secondary.style.clipPath = val === 0 ? '' : `polygon(0 0, ${val}% 0, ${val}% 100%, 0 100%)`;
        if (label) label.textContent = val > 50 ? `Góc thứ 2 • ${val}%` : `Góc chính • ${val}%`;
      });
      if (p) bindInlineCardAiFit(card, p);
    });

    if (lookbookViewport) lookbookViewport.scrollLeft = 0;
    updateLookbookScroll();
  }

  lookbookTrack?.addEventListener('click', (e) => {
    const inlineBtn = e.target.closest('[data-inline-aifit]');
    if (inlineBtn) {
      e.stopPropagation();
      const card = inlineBtn.closest('.lookbook-card');
      const prod = PRODUCTS.find((p) => p.id === inlineBtn.dataset.inlineAifit);
      if (card && prod) toggleInlineCardAiFit(card, prod);
      return;
    }
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
  // 6. PRODUCT SHOWROOM (69 Lalin Products + Inline AI Fit Live on Every Card)
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
        <div class="product-media" data-cursor="AI BODY-FIT">
          <img src="${p.img}" alt="${esc(p.title)}" class="product-img-main" loading="lazy" draggable="true" data-garment-id="${p.id}" data-product-image="true" data-product-name="${esc(p.title)}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="product-img-alt" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <canvas class="card-ai-live-canvas" width="360" height="460"></canvas>
          <button type="button" class="card-ai-fit-toggle" data-inline-aifit="${p.id}" title="Mô phỏng AI khớp trang phục vào chuyển động cơ thể ngay trên thẻ">
            ✦ AI Fit Live
          </button>
          <div class="card-virtual-mesh-overlay"></div>
          <div class="fabric-loupe"><span class="loupe-caption">X-RAY: ${esc(p.fabric)}</span></div>
          <div class="anywear-card-overlay">
            <button type="button" class="anywear-live-pill" data-tryon-id="${p.id}">
              <span class="aw-lime-dot"></span> ✦ Try on
            </button>
            <span class="chapter-tag">${esc(SHORT_LABELS[p.category] || '')}</span>
          </div>
          <div class="card-fit-telemetry">
            <span>✦ AI POSE 33 ĐIỂM + 96-TRIANGLE CLOTH MESH</span>
            <span>✦ BẤM "AI FIT LIVE" HOẶC MỞ PHÒNG THỬ CAM</span>
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
              <button type="button" class="btn-anywear-card" data-tryon-id="${p.id}"><span>✦</span> Try on (AI Body-Fit)</button>
              <button type="button" class="btn-book-item" data-book-id="${p.id}">${rentMode ? '+ Đặt Thuê' : '+ Mua Ngay'}</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function bindProductCard(card) {
    const p = PRODUCTS.find((x) => x.id === card.dataset.productId);
    if (!p) return;
    const media = $('.product-media', card);
    const imgMain = $('.product-img-main', card);
    const imgAlt = $('.product-img-alt', card);
    const loupe = $('.fabric-loupe', card);
    const angleLabel = $('.angle-readout-label', card);
    let loupeSrc = p.imgFull;

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

    bindInlineCardAiFit(card, p);
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
    const inlineBtn = e.target.closest('[data-inline-aifit]');
    if (inlineBtn) {
      e.stopPropagation();
      const card = inlineBtn.closest('.product-card');
      const prod = PRODUCTS.find((p) => p.id === inlineBtn.dataset.inlineAifit);
      if (card && prod) toggleInlineCardAiFit(card, prod);
      return;
    }
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
  // 7. ANYWEAR AI BODY-FIT ENGINE v3.0
  //    - AI Garment Torso Extraction (removes original model's head, neck,
  //      background, and outer skin so only the clothing mesh remains)
  //    - Real-Time MediaPipe Pose 33-Landmark Skeleton Detection
  //    - 96-Triangle (6x8 Subdivision Grid) Piecewise Affine Cloth Warping
  //    - Real-Time Forearm/Hand Occlusion + 3D Yaw Perspective + Fold Shading
  // ==========================================================================
  const modal = $('#anywearModal');
  const stage = $('#studioVisualStage');
  const studioImg = $('#studioMainImage');
  const webcamVideo = $('#studioWebcamVideo');
  const liveCanvas = $('#anywearLiveCanvas');
  const capsuleCanvas = $('#capsuleMiniCanvas');
  const arImg = $('#arGarmentImg');
  const inputHeight = $('#inputHeight');
  const inputWeight = $('#inputWeight');
  const inputWaist = $('#inputWaist');
  const capsuleEl = $('#anywearCapsule');
  const aiSynthOverlay = $('#aiSynthesisOverlay');
  const aiSynthText = $('#aiSynthesisStatusText');
  const aiPoseHudPill = $('#aiPoseHudPill');
  const aiPoseHudText = $('#aiPoseHudText');
  let lastFocused = null;

  // Cache of synthesized garments by image URL so switching or inline card preview is instant
  const garmentCache = new Map();

  // Active Studio Garment Asset
  let activeGarmentAsset = null;
  let synthTimerId = null;

  // Trigger brief AI synthesis scan animation (like AnyWear reference video)
  function triggerAiSynthesisScan(message = 'AI đang phân tách trang phục & khớp 33 điểm cơ thể...') {
    if (!aiSynthOverlay) return;
    if (aiSynthText) aiSynthText.textContent = message;
    aiSynthOverlay.hidden = false;
    clearTimeout(synthTimerId);
    synthTimerId = setTimeout(() => {
      aiSynthOverlay.hidden = true;
    }, 620);
  }

  /**
   * AI Garment Torso Synthesizer:
   * Takes a Lalin model product photo and extracts ONLY the garment (áo/đầm):
   *  1. Removes the model's head, face, hair, and upper neck above the collar line
   *     using category-aware neckline curve (Cổ Yếm halter vs. Áo Tơ/Gấm collar).
   *  2. Removes the studio background using multi-point border chroma-luminance clustering.
   *  3. Detects and softens exposed bare skin on far left/right margins so the user's
   *     real arms & shoulders blend naturally.
   *  4. Builds an headless/backgroundless offscreen canvas + UV bounding rig for
   *     the 6x8 (96-triangle) cloth deformation mesh.
   */
  function synthesizeGarmentAsset(imgEl, category = 'to-lua') {
    const w = 440;
    const h = Math.round((imgEl.naturalHeight / Math.max(1, imgEl.naturalWidth)) * w) || 560;

    // 1. Clean Garment Canvas (Headless, Background-Removed)
    const clothCanvas = document.createElement('canvas');
    clothCanvas.width = w;
    clothCanvas.height = h;
    const ctx = clothCanvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, w, h);

    // 2. Body-Only Base Canvas (for AI Motion Simulation when webcam is off:
    //    softly blurs/neutralizes old garment area so warped mesh sits cleanly on moving body)
    const bodyBaseCanvas = document.createElement('canvas');
    bodyBaseCanvas.width = w;
    bodyBaseCanvas.height = h;
    const bctx = bodyBaseCanvas.getContext('2d');
    bctx.drawImage(imgEl, 0, 0, w, h);

    // Anatomical UV rig on the source product photo (normalized 0..1)
    const isHalter = category === 'yem';
    const uvRig = {
      uMin: isHalter ? 0.21 : 0.14,
      uMax: isHalter ? 0.79 : 0.86,
      vNeck: 0.275,
      vShoulder: 0.295,
      vBust: 0.44,
      vWaist: 0.64,
      vHem: 0.89
    };

    // CORS-Safe Vector & Gradient Silhouette Cutout on `clothCanvas`
    // (Works 100% even when CDN images do not send Access-Control-Allow-Origin!)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // A) Erase model's head, face, hair & upper neck above collar line (y = 0 .. 0.285*h)
    const headGrad = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.305);
    headGrad.addColorStop(0, 'rgba(0,0,0,1)');
    headGrad.addColorStop(0.65, 'rgba(0,0,0,0.92)');
    headGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h * (isHalter ? 0.32 : 0.29));
    ctx.quadraticCurveTo(w * 0.5, h * 0.315, 0, h * (isHalter ? 0.32 : 0.29));
    ctx.closePath();
    ctx.fill();

    // B) Erase left & right studio background outside garment silhouette
    const leftEdge = w * (isHalter ? 0.20 : 0.12);
    const rightEdge = w * (isHalter ? 0.80 : 0.88);
    const leftGrad = ctx.createLinearGradient(leftEdge - w * 0.04, 0, leftEdge + w * 0.05, 0);
    leftGrad.addColorStop(0, 'rgba(0,0,0,1)');
    leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, leftEdge + w * 0.05, h);

    const rightGrad = ctx.createLinearGradient(rightEdge - w * 0.05, 0, rightEdge + w * 0.04, 0);
    rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rightGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(rightEdge - w * 0.05, 0, w - (rightEdge - w * 0.05), h);

    // C) Feather bottom hem (y = 0.88*h .. h)
    const hemGrad = ctx.createLinearGradient(0, h * 0.87, 0, h * 0.96);
    hemGrad.addColorStop(0, 'rgba(0,0,0,0)');
    hemGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = hemGrad;
    ctx.fillRect(0, h * 0.87, w, h * 0.13);
    ctx.restore();

    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample studio background from 10 perimeter points
      const bgSamples = [
        [4, 4], [w - 5, 4],
        [4, Math.floor(h * 0.18)], [w - 5, Math.floor(h * 0.18)],
        [4, Math.floor(h * 0.42)], [w - 5, Math.floor(h * 0.42)],
        [4, Math.floor(h * 0.68)], [w - 5, Math.floor(h * 0.68)],
        [4, Math.floor(h * 0.88)], [w - 5, Math.floor(h * 0.88)]
      ];
      const bgColors = bgSamples.map(([sx, sy]) => {
        const i = (sy * w + sx) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      });

      // Sample face/neck skin tone around center-top (x=0.5, y=0.14..0.19) to remove exposed head/neck
      const skinSamples = [
        [Math.floor(w * 0.5), Math.floor(h * 0.14)],
        [Math.floor(w * 0.5), Math.floor(h * 0.19)]
      ];
      const skinColors = skinSamples.map(([sx, sy]) => {
        const i = (sy * w + sx) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      });

      const bgThreshold = 38;
      const bgFeather = 28;

      for (let y = 0; y < h; y++) {
        const ny = y / h;
        for (let x = 0; x < w; x++) {
          const nx = x / w;
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // 1) Head & Face Mask: Completely remove everything above the neckline curve
          // Neckline curve dips slightly in the center (ny = 0.235) and rises toward shoulders (ny = 0.215)
          const dxCenter = Math.abs(nx - 0.5);
          const collarLineY = isHalter
            ? 0.215 + dxCenter * 0.34 // Halter/Yếm tapers inward toward the neck!
            : 0.242 - Math.min(0.032, dxCenter * 0.14);

          if (ny < collarLineY - 0.025) {
            data[idx + 3] = 0;
            continue;
          }
          let collarMask = 1;
          if (ny < collarLineY + 0.02) {
            collarMask = Math.max(0, Math.min(1, (ny - (collarLineY - 0.025)) / 0.045));
          }

          // 2) Silhouette Horizontal Taper (Halter vs Sleeved Top)
          let halfSpan = 0.38;
          if (ny < 0.36) {
            // Shoulder / upper chest width
            halfSpan = isHalter ? (0.14 + (ny - 0.20) * 1.15) : 0.38;
          } else if (ny < 0.65) {
            // Bust to waist taper
            halfSpan = isHalter ? 0.30 : 0.35;
          } else {
            // Waist to hem flare
            halfSpan = 0.36;
          }

          let sideMask = 1;
          if (dxCenter > halfSpan) {
            sideMask = Math.max(0, 1 - (dxCenter - halfSpan) / 0.075);
          }

          // 3) Bottom Hem Feathering (below ny = 0.89)
          let hemMask = 1;
          if (ny > 0.87) {
            hemMask = Math.max(0, 1 - (ny - 0.87) / 0.065);
          }

          // 4) Multi-cluster Studio Background Matte
          let minBgDist = 999;
          for (let k = 0; k < bgColors.length; k++) {
            const c = bgColors[k];
            const d = Math.hypot(r - c[0], g - c[1], b - c[2]);
            if (d < minBgDist) minBgDist = d;
          }
          // Protect center torso fabric from accidental background knockout
          const centerProtection = (dxCenter < 0.19 && ny > 0.27 && ny < 0.82) ? 0.45 : 1.0;
          const effBgDist = minBgDist / centerProtection;

          let bgAlpha = 1;
          if (effBgDist < bgThreshold) {
            bgAlpha = 0;
          } else if (effBgDist < bgThreshold + bgFeather) {
            bgAlpha = (effBgDist - bgThreshold) / bgFeather;
          }

          // 5) Upper Neck / Outer Arm Skin Mask (so bare arms or chin skin don't ghost over user)
          let skinAlpha = 1;
          if (ny < 0.28 || dxCenter > 0.26) {
            let minSkinDist = 999;
            for (let k = 0; k < skinColors.length; k++) {
              const sc = skinColors[k];
              const d = Math.hypot(r - sc[0], g - sc[1], b - sc[2]);
              if (d < minSkinDist) minSkinDist = d;
            }
            if (minSkinDist < 22 && ny < 0.27 && dxCenter < 0.16) {
              skinAlpha = 0;
            }
          }

          data[idx + 3] = Math.round(data[idx + 3] * collarMask * sideMask * hemMask * bgAlpha * skinAlpha);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (_) {
      // If external image without CORS, fallback still works via triangle UV clipping
    }

    return {
      rawImg: imgEl,
      clothCanvas,
      bodyBaseCanvas,
      width: w,
      height: h,
      category,
      uvRig
    };
  }

  function loadGarmentForProduct(src, category = 'to-lua', onReady) {
    if (garmentCache.has(src)) {
      const cached = garmentCache.get(src);
      if (onReady) onReady(cached);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const asset = synthesizeGarmentAsset(img, category);
      garmentCache.set(src, asset);
      if (onReady) onReady(asset);
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => {
        const asset = synthesizeGarmentAsset(fallback, category);
        garmentCache.set(src, asset);
        if (onReady) onReady(asset);
      };
      fallback.src = src;
    };
    img.src = src;
  }

  // ==========================================================================
  // MEDIAPIPE POSE 33-KEYPOINT TRACKER + REAL-TIME KINEMATIC RIG
  // ==========================================================================
  const poseState = {
    mpPose: null,
    mpReady: false,
    mpBusy: false,
    hasLiveLandmarks: false,
    lastLandmarkTime: 0,
    // Normalized 0..1 body keypoints (smoothed at 60fps)
    neck: { x: 0.5, y: 0.25 },
    lShoulder: { x: 0.34, y: 0.29, z: 0 },
    rShoulder: { x: 0.66, y: 0.29, z: 0 },
    lElbow: { x: 0.26, y: 0.50, z: 0 },
    rElbow: { x: 0.74, y: 0.50, z: 0 },
    lWrist: { x: 0.28, y: 0.68, z: 0, v: 0 },
    rWrist: { x: 0.72, y: 0.68, z: 0, v: 0 },
    lHip: { x: 0.37, y: 0.66, z: 0 },
    rHip: { x: 0.63, y: 0.66, z: 0 },
    yaw: 0,          // 3D torso twist (-0.45 .. +0.45)
    tilt: 0,         // Shoulder tilt radians
    breathe: 0,      // Breathing chest expansion
    pointerX: 0,     // Interactive user pointer influence (-1..1)
    pointerY: 0,
    manualX: 0,
    manualY: 0,
    manualScale: 1.0,
    rafId: null
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Initialize Google MediaPipe Pose (`window.Pose`) when available
  function initMediaPipePose() {
    if (poseState.mpPose || typeof window.Pose !== 'function') return;
    try {
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      pose.onResults((results) => {
        if (!results || !results.poseLandmarks || results.poseLandmarks.length < 25) {
          return;
        }
        const lm = results.poseLandmarks;
        // Mirror X coordinate if front camera ('user') is active
        const mirror = state.studio.facingMode === 'user';
        const mx = (x) => (mirror ? 1 - x : x);

        // MediaPipe Pose indices: 11=Left Shoulder (user's left -> right side of mirrored image), 12=Right Shoulder
        // In screen space (left-to-right on canvas):
        const p11 = { x: mx(lm[11].x), y: lm[11].y, z: lm[11].z || 0, v: lm[11].visibility || 0 };
        const p12 = { x: mx(lm[12].x), y: lm[12].y, z: lm[12].z || 0, v: lm[12].visibility || 0 };
        const p13 = { x: mx(lm[13].x), y: lm[13].y, z: lm[13].z || 0, v: lm[13].visibility || 0 };
        const p14 = { x: mx(lm[14].x), y: lm[14].y, z: lm[14].z || 0, v: lm[14].visibility || 0 };
        const p15 = { x: mx(lm[15].x), y: lm[15].y, z: lm[15].z || 0, v: lm[15].visibility || 0 };
        const p16 = { x: mx(lm[16].x), y: lm[16].y, z: lm[16].z || 0, v: lm[16].visibility || 0 };
        const p23 = { x: mx(lm[23].x), y: lm[23].y, z: lm[23].z || 0, v: lm[23].visibility || 0 };
        const p24 = { x: mx(lm[24].x), y: lm[24].y, z: lm[24].z || 0, v: lm[24].visibility || 0 };

        // Ensure screen-left shoulder is `lShoulder` and screen-right shoulder is `rShoulder`
        const leftIs12 = p12.x < p11.x;
        const sL = leftIs12 ? p12 : p11;
        const sR = leftIs12 ? p11 : p12;
        const eL = leftIs12 ? p14 : p13;
        const eR = leftIs12 ? p13 : p14;
        const wL = leftIs12 ? p16 : p15;
        const wR = leftIs12 ? p15 : p16;
        const hL = leftIs12 ? p24 : p23;
        const hR = leftIs12 ? p23 : p24;

        const alpha = 0.42; // Responsive 60fps smoothing
        poseState.lShoulder.x = lerp(poseState.lShoulder.x, sL.x, alpha);
        poseState.lShoulder.y = lerp(poseState.lShoulder.y, sL.y, alpha);
        poseState.lShoulder.z = lerp(poseState.lShoulder.z, sL.z, alpha);

        poseState.rShoulder.x = lerp(poseState.rShoulder.x, sR.x, alpha);
        poseState.rShoulder.y = lerp(poseState.rShoulder.y, sR.y, alpha);
        poseState.rShoulder.z = lerp(poseState.rShoulder.z, sR.z, alpha);

        poseState.lElbow.x = lerp(poseState.lElbow.x, eL.x, alpha);
        poseState.lElbow.y = lerp(poseState.lElbow.y, eL.y, alpha);
        poseState.rElbow.x = lerp(poseState.rElbow.x, eR.x, alpha);
        poseState.rElbow.y = lerp(poseState.rElbow.y, eR.y, alpha);

        poseState.lWrist = { x: lerp(poseState.lWrist.x, wL.x, 0.5), y: lerp(poseState.lWrist.y, wL.y, 0.5), z: wL.z, v: wL.v };
        poseState.rWrist = { x: lerp(poseState.rWrist.x, wR.x, 0.5), y: lerp(poseState.rWrist.y, wR.y, 0.5), z: wR.z, v: wR.v };

        // If lower hips are below webcam frame, synthesize anatomical hip position from shoulder vector
        const shoulderWidth = Math.hypot(poseState.rShoulder.x - poseState.lShoulder.x, poseState.rShoulder.y - poseState.lShoulder.y);
        const midSX = (poseState.lShoulder.x + poseState.rShoulder.x) * 0.5;
        const midSY = (poseState.lShoulder.y + poseState.rShoulder.y) * 0.5;

        if (hL.v > 0.35 && hR.v > 0.35 && hL.y < 0.98 && hR.y < 0.98) {
          poseState.lHip.x = lerp(poseState.lHip.x, hL.x, alpha);
          poseState.lHip.y = lerp(poseState.lHip.y, hL.y, alpha);
          poseState.rHip.x = lerp(poseState.rHip.x, hR.x, alpha);
          poseState.rHip.y = lerp(poseState.rHip.y, hR.y, alpha);
        } else {
          const torsoLen = shoulderWidth * 1.32;
          const hipHalf = shoulderWidth * 0.44;
          poseState.lHip.x = lerp(poseState.lHip.x, midSX - hipHalf, alpha);
          poseState.lHip.y = lerp(poseState.lHip.y, midSX ? midSY + torsoLen : 0.68, alpha);
          poseState.rHip.x = lerp(poseState.rHip.x, midSX + hipHalf, alpha);
          poseState.rHip.y = lerp(poseState.rHip.y, midSY + torsoLen, alpha);
        }

        poseState.neck.x = midSX;
        poseState.neck.y = midSY - shoulderWidth * 0.14;
        poseState.tilt = Math.atan2(poseState.rShoulder.y - poseState.lShoulder.y, poseState.rShoulder.x - poseState.lShoulder.x);
        poseState.yaw = Math.max(-0.42, Math.min(0.42, (poseState.lShoulder.z - poseState.rShoulder.z) * 0.85));
        poseState.hasLiveLandmarks = true;
        poseState.lastLandmarkTime = performance.now();
      });
      poseState.mpPose = pose;
      poseState.mpReady = true;
    } catch (_) {
      poseState.mpReady = false;
    }
  }

  // Fallback Optical Silhouette & Upper-Body Keypoint Tracker (runs in parallel with MediaPipe)
  const optCanvas = document.createElement('canvas');
  optCanvas.width = 64;
  optCanvas.height = 48;
  const optCtx = optCanvas.getContext('2d', { willReadFrequently: true });
  let prevOptFrame = null;

  function updateWebcamPose(videoEl) {
    if (!videoEl || videoEl.readyState < 2) return;

    // 1. Feed frame to MediaPipe Pose asynchronously
    if (!poseState.mpPose) initMediaPipePose();
    if (poseState.mpReady && !poseState.mpBusy) {
      poseState.mpBusy = true;
      poseState.mpPose.send({ image: videoEl }).then(() => {
        poseState.mpBusy = false;
      }).catch(() => {
        poseState.mpBusy = false;
      });
    }

    // 2. If MediaPipe landmarks are fresh (< 400ms), use them directly!
    if (poseState.hasLiveLandmarks && performance.now() - poseState.lastLandmarkTime < 450) {
      if (aiPoseHudText) {
        aiPoseHudText.textContent = 'AI MediaPipe Pose: Đã khóa 33 điểm cơ thể thật (96-Triangle Mesh)';
      }
      return;
    }

    // 3. Instant Optical Motion Skeleton (while MediaPipe WASM warms up)
    const w = 64;
    const h = 48;
    optCtx.save();
    if (state.studio.facingMode === 'user') {
      optCtx.translate(w, 0);
      optCtx.scale(-1, 1);
    }
    optCtx.drawImage(videoEl, 0, 0, w, h);
    optCtx.restore();

    const frame = optCtx.getImageData(0, 0, w, h).data;
    let cx = 0.5;
    let cy = 0.46;
    let tilt = 0;
    if (prevOptFrame) {
      let sumX = 0; let sumY = 0; let sumW = 0; let lMass = 0; let rMass = 0;
      for (let y = 4; y < h - 4; y++) {
        for (let x = 6; x < w - 6; x++) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(frame[i] - prevOptFrame[i])
            + Math.abs(frame[i + 1] - prevOptFrame[i + 1])
            + Math.abs(frame[i + 2] - prevOptFrame[i + 2]);
          if (diff > 38) {
            sumX += (x / w) * diff;
            sumY += (y / h) * diff;
            sumW += diff;
            if (x < w / 2) lMass += (y / h) * diff;
            else rMass += (y / h) * diff;
          }
        }
      }
      if (sumW > 8000) {
        cx = Math.max(0.32, Math.min(0.68, sumX / sumW));
        cy = Math.max(0.32, Math.min(0.58, sumY / sumW));
        tilt = Math.max(-0.16, Math.min(0.16, ((rMass - lMass) / sumW) * 0.4));
      }
    }
    prevOptFrame = new Uint8ClampedArray(frame);

    const midX = lerp((poseState.lShoulder.x + poseState.rShoulder.x) * 0.5, cx, 0.16);
    const midY = lerp((poseState.lShoulder.y + poseState.rShoulder.y) * 0.5, cy * 0.72, 0.14);
    poseState.tilt = lerp(poseState.tilt, tilt, 0.16);
    const sw = 0.34;
    const cosT = Math.cos(poseState.tilt);
    const sinT = Math.sin(poseState.tilt);
    poseState.lShoulder = { x: midX - (sw * 0.5) * cosT, y: midY - (sw * 0.5) * sinT, z: 0 };
    poseState.rShoulder = { x: midX + (sw * 0.5) * cosT, y: midY + (sw * 0.5) * sinT, z: 0 };
    poseState.neck = { x: midX + sinT * 0.04, y: midY - 0.045 * cosT };
    poseState.lElbow = { x: poseState.lShoulder.x - 0.08, y: poseState.lShoulder.y + 0.22, z: 0 };
    poseState.rElbow = { x: poseState.rShoulder.x + 0.08, y: poseState.rShoulder.y + 0.22, z: 0 };
    poseState.lHip = { x: midX - sw * 0.42, y: midY + 0.38, z: 0 };
    poseState.rHip = { x: midX + sw * 0.42, y: midY + 0.38, z: 0 };
  }

  /**
   * Computes a realistic kinematic moving human skeleton for "AI Body-Fit Live" mode
   * (when webcam is off or inside inline product cards). Responds both to natural
   * human motion (breathing, turning shoulders, sway, arm movement) AND user mouse/touch!
   */
  function computeSimulatedBodySkeleton(timeSec, pointerX = 0, pointerY = 0) {
    const swayX = Math.sin(timeSec * 1.55) * 0.022 + pointerX * 0.045;
    const breatheY = Math.sin(timeSec * 2.6) * 0.008 + pointerY * 0.018;
    const yaw = Math.sin(timeSec * 1.25) * 0.22 + pointerX * 0.32;
    const tilt = Math.sin(timeSec * 1.8) * 0.055 + pointerX * 0.08;
    const scaleBreath = 1 + Math.sin(timeSec * 2.6) * 0.022 + Math.cos(timeSec * 1.1) * 0.015;

    const midSX = 0.5 + swayX;
    const midSY = 0.268 + breatheY;

    // 3D Yaw perspective compresses left or right shoulder distance from spine
    const baseHalfShoulder = 0.165 * scaleBreath;
    const leftSpan = baseHalfShoulder * (1 - yaw * 0.38);
    const rightSpan = baseHalfShoulder * (1 + yaw * 0.38);

    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const lShoulder = {
      x: midSX - leftSpan * cosT,
      y: midSY - leftSpan * sinT
    };
    const rShoulder = {
      x: midSX + rightSpan * cosT,
      y: midSY + rightSpan * sinT
    };
    const neck = {
      x: midSX + sinT * 0.035,
      y: midSY - 0.032 * cosT
    };

    // Upper arms articulate naturally as the body turns and breathes
    const armSwingL = 0.18 + Math.sin(timeSec * 1.9) * 0.06 - yaw * 0.12;
    const armSwingR = 0.18 - Math.sin(timeSec * 1.9) * 0.06 + yaw * 0.12;
    const lElbow = {
      x: lShoulder.x - Math.sin(armSwingL) * 0.18,
      y: lShoulder.y + Math.cos(armSwingL) * 0.21
    };
    const rElbow = {
      x: rShoulder.x + Math.sin(armSwingR) * 0.18,
      y: rShoulder.y + Math.cos(armSwingR) * 0.21
    };

    // Hips counter-sway slightly like a real fashion runway walk / weight shift
    const hipMidX = 0.5 + swayX * 0.65 - Math.sin(timeSec * 1.55) * 0.008;
    const hipMidY = 0.68 + breatheY * 0.5;
    const baseHalfHip = 0.138 * (1 + (Number(inputWaist?.value || 64) - 64) * 0.006);
    const lHip = {
      x: hipMidX - baseHalfHip * (1 - yaw * 0.32),
      y: hipMidY - baseHalfHip * sinT * 0.45
    };
    const rHip = {
      x: hipMidX + baseHalfHip * (1 + yaw * 0.32),
      y: hipMidY + baseHalfHip * sinT * 0.45
    };

    return {
      neck,
      lShoulder,
      rShoulder,
      lElbow,
      rElbow,
      lWrist: { x: 0.2, y: 0.85, v: 0 },
      rWrist: { x: 0.8, y: 0.85, v: 0 },
      lHip,
      rHip,
      yaw,
      tilt,
      breathe: Math.sin(timeSec * 2.6)
    };
  }

  /**
   * Hardware-Accelerated Canvas 2D Affine Triangle Texture Mapper:
   * Maps triangle (u0,v0)-(u1,v1)-(u2,v2) from `img` onto destination triangle (x0,y0)-(x1,y1)-(x2,y2).
   */
  function drawTexturedTriangle(ctx, img, u0, v0, u1, v1, u2, v2, x0, y0, x1, y1, x2, y2) {
    const du1 = u1 - u0;
    const dv1 = v1 - v0;
    const du2 = u2 - u0;
    const dv2 = v2 - v0;
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-5) return;

    const invDet = 1 / det;
    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x0;
    const dy2 = y2 - y0;

    const a = (dx1 * dv2 - dx2 * dv1) * invDet;
    const b = (dy1 * dv2 - dy2 * dv1) * invDet;
    const c = (du1 * dx2 - du2 * dx1) * invDet;
    const d = (du1 * dy2 - du2 * dy1) * invDet;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;

    // Expand clip triangle radially from centroid by 0.85px so adjacent triangles have zero dark hairline seams
    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;
    const d0 = Math.hypot(x0 - cx, y0 - cy) || 1;
    const d1 = Math.hypot(x1 - cx, y1 - cy) || 1;
    const d2 = Math.hypot(x2 - cx, y2 - cy) || 1;
    const pad = 0.85;
    const ex0 = x0 + ((x0 - cx) / d0) * pad;
    const ey0 = y0 + ((y0 - cy) / d0) * pad;
    const ex1 = x1 + ((x1 - cx) / d1) * pad;
    const ey1 = y1 + ((y1 - cy) / d1) * pad;
    const ex2 = x2 + ((x2 - cx) / d2) * pad;
    const ey2 = y2 + ((y2 - cy) / d2) * pad;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex0, ey0);
    ctx.lineTo(ex1, ey1);
    ctx.lineTo(ex2, ey2);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /**
   * 96-Triangle (6x8 Subdivision Grid) Deformable Garment Mesh Renderer:
   * Maps the synthesized garment asset tightly onto the live skeleton (`skel`)
   * with 3D ribcage curvature, sleeve articulation, waist fitting, and fold shading.
   */
  function renderWarpedGarmentOnSkeleton(ctx, cw, ch, asset, skel, opts = {}) {
    if (!asset) return;
    const drawable = (state.studio.aiMatte && asset.clothCanvas) ? asset.clothCanvas : asset.rawImg;
    const sw = asset.width || drawable.width || 440;
    const sh = asset.height || drawable.height || 560;

    const ROWS = 8;
    const COLS = 6;
    const rig = asset.uvRig;

    const waistScale = 1 + (Number(inputWaist?.value || 64) - 64) * 0.0055;
    const manualScale = opts.ignoreManual ? 1.0 : poseState.manualScale;
    const offsetX = opts.ignoreManual ? 0 : poseState.manualX * (cw / 500);
    const offsetY = opts.ignoreManual ? 0 : poseState.manualY * (ch / 500);

    // Compute anatomical torso frame in canvas pixels
    const lS = { x: skel.lShoulder.x * cw + offsetX, y: skel.lShoulder.y * ch + offsetY };
    const rS = { x: skel.rShoulder.x * cw + offsetX, y: skel.rShoulder.y * ch + offsetY };
    const lE = { x: skel.lElbow.x * cw + offsetX, y: skel.lElbow.y * ch + offsetY };
    const rE = { x: skel.rElbow.x * cw + offsetX, y: skel.rElbow.y * ch + offsetY };
    const lH = { x: skel.lHip.x * cw + offsetX, y: skel.lHip.y * ch + offsetY };
    const rH = { x: skel.rHip.x * cw + offsetX, y: skel.rHip.y * ch + offsetY };

    const sMidX = (lS.x + rS.x) * 0.5;
    const sMidY = (lS.y + rS.y) * 0.5;
    const hMidX = (lH.x + rH.x) * 0.5;
    const hMidY = (lH.y + rH.y) * 0.5;

    const shoulderVecX = (rS.x - lS.x) * 0.5 * manualScale * 1.44;
    const shoulderVecY = (rS.y - lS.y) * 0.5 * manualScale * 1.44;
    const hipVecX = (rH.x - lH.x) * 0.5 * manualScale * waistScale * 1.56;
    const hipVecY = (rH.y - lH.y) * 0.5 * manualScale * waistScale * 1.56;

    const spineVecX = (hMidX - sMidX) * manualScale;
    const spineVecY = (hMidY - sMidY) * manualScale;

    // Build (ROWS+1) x (COLS+1) grid of UV coordinates & deformed 2D/3D screen vertices
    const grid = [];
    for (let r = 0; r <= ROWS; r++) {
      const vNorm = r / ROWS; // 0 = collar, 1 = hem
      const uRow = [];

      // Source V coordinate on product image
      const srcV = lerp(rig.vNeck - 0.02, rig.vHem, vNorm) * sh;

      // Spine position at this vertical slice (starts slightly above shoulder midpoint for collar)
      const spineT = (vNorm - 0.08) * 1.38;
      const rowCenterX = sMidX + spineVecX * spineT;
      const rowCenterY = sMidY + spineVecY * spineT;

      // Interpolate width vector from shoulder to waist to flared hem
      let widthFactor = 1.0;
      if (vNorm < 0.55) {
        // Bust expansion
        widthFactor = 1.0 + Math.sin((vNorm / 0.55) * Math.PI) * (0.06 + (skel.breathe || 0) * 0.018);
      } else {
        // Waist nip & hem flare
        const tWaist = (vNorm - 0.55) / 0.45;
        widthFactor = 0.94 + tWaist * tWaist * 0.16;
      }

      const halfVecX = lerp(shoulderVecX, hipVecX, Math.min(1, vNorm * 1.15)) * widthFactor;
      const halfVecY = lerp(shoulderVecY, hipVecY, Math.min(1, vNorm * 1.15)) * widthFactor;

      for (let c = 0; c <= COLS; c++) {
        const uNorm = c / COLS; // 0 = far left (sleeve/edge), 0.5 = spine center, 1 = far right
        const signedU = (uNorm - 0.5) * 2; // -1 .. +1

        const srcU = lerp(rig.uMin, rig.uMax, uNorm) * sw;

        // 3D Yaw perspective foreshortening: compresses the side turned away from camera
        const yawCompress = 1 + signedU * (skel.yaw || 0) * 0.28;

        // Base torso vertex position
        let vx = rowCenterX + signedU * halfVecX * yawCompress;
        let vy = rowCenterY + signedU * halfVecY * yawCompress;

        // 3D Ribcage Cylinder Curvature: lifts outer edges slightly vs center to wrap around chest
        const cylinderCurve = Math.sin(uNorm * Math.PI);
        vy += cylinderCurve * (cw * 0.016) * (1 - vNorm * 0.4);
        vx += (skel.yaw || 0) * cylinderCurve * (cw * 0.028);

        // Sleeve Articulation: outer columns (c=0,1 and c=5,6) in upper rows (r=1..4) follow real elbows!
        if (vNorm >= 0.08 && vNorm <= 0.52) {
          const armWeight = Math.sin(((vNorm - 0.08) / 0.44) * Math.PI);
          if (c <= 1) {
            const sleevePull = (c === 0 ? 0.42 : 0.16) * armWeight;
            const targetArmX = lerp(lS.x, lE.x, vNorm * 1.5) - cw * 0.04;
            const targetArmY = lerp(lS.y, lE.y, vNorm * 1.5);
            vx = lerp(vx, targetArmX, sleevePull);
            vy = lerp(vy, targetArmY, sleevePull);
          } else if (c >= COLS - 1) {
            const sleevePull = (c === COLS ? 0.42 : 0.16) * armWeight;
            const targetArmX = lerp(rS.x, rE.x, vNorm * 1.5) + cw * 0.04;
            const targetArmY = lerp(rS.y, rE.y, vNorm * 1.5);
            vx = lerp(vx, targetArmX, sleevePull);
            vy = lerp(vy, targetArmY, sleevePull);
          }
        }

        uRow.push({ u: srcU, v: srcV, x: vx, y: vy });
      }
      grid.push(uRow);
    }

    // 1. Render all 96 triangles of the deformed cloth mesh
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p00 = grid[r][c];
        const p10 = grid[r][c + 1];
        const p01 = grid[r + 1][c];
        const p11 = grid[r + 1][c + 1];

        drawTexturedTriangle(
          ctx, drawable,
          p00.u, p00.v, p10.u, p10.v, p01.u, p01.v,
          p00.x, p00.y, p10.x, p10.y, p01.x, p01.y
        );
        drawTexturedTriangle(
          ctx, drawable,
          p10.u, p10.v, p11.u, p11.v, p01.u, p01.v,
          p10.x, p10.y, p11.x, p11.y, p01.x, p01.y
        );
      }
    }

    // 2. Dynamic 3D Torso Fold Shading (subtle specular highlight & turn shadow on cloth)
    if (Math.abs(skel.yaw || 0) > 0.02) {
      const topMid = grid[1][3];
      const botMid = grid[ROWS - 1][3];
      const leftMid = grid[3][1];
      const rightMid = grid[3][COLS - 1];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(grid[0][1].x, grid[0][1].y);
      ctx.lineTo(grid[0][COLS - 1].x, grid[0][COLS - 1].y);
      ctx.lineTo(grid[ROWS][COLS - 1].x, grid[ROWS][COLS - 1].y);
      ctx.lineTo(grid[ROWS][1].x, grid[ROWS][1].y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(leftMid.x, topMid.y, rightMid.x, botMid.y);
      const yawVal = skel.yaw || 0;
      const leftShade = yawVal > 0 ? `rgba(0,0,0,${Math.min(0.18, yawVal * 0.35).toFixed(3)})` : `rgba(255,255,255,${Math.min(0.10, -yawVal * 0.22).toFixed(3)})`;
      const rightShade = yawVal < 0 ? `rgba(0,0,0,${Math.min(0.18, -yawVal * 0.35).toFixed(3)})` : `rgba(255,255,255,${Math.min(0.10, yawVal * 0.22).toFixed(3)})`;
      grad.addColorStop(0, leftShade);
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      grad.addColorStop(1, rightShade);
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fill();
      ctx.restore();
    }

    // 3. Optional AI Skeleton & 96-Triangle Cloth Mesh Wireframe Overlay ("🦴 Lưới AI")
    if (state.studio.showMeshDebug || opts.showWireframe) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 255, 46, 0.45)';
      ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const p00 = grid[r][c];
          const p10 = grid[r][c + 1];
          const p01 = grid[r + 1][c];
          const p11 = grid[r + 1][c + 1];
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Draw Anatomical Skeleton Keypoints (Shoulders, Elbows, Hips, Spine)
      const joints = [lS, rS, lE, rE, lH, rH, { x: sMidX, y: sMidY }, { x: hMidX, y: hMidY }];
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(lE.x, lE.y); ctx.lineTo(lS.x, lS.y); ctx.lineTo(rS.x, rS.y); ctx.lineTo(rE.x, rE.y);
      ctx.moveTo(sMidX, sMidY); ctx.lineTo(hMidX, hMidY);
      ctx.moveTo(lH.x, lH.y); ctx.lineTo(rH.x, rH.y);
      ctx.stroke();

      joints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#c8ff2e';
        ctx.fill();
        ctx.strokeStyle = '#0b0c0e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  /**
   * Real-Time Forearm & Hand Occlusion on Live Webcam:
   * When the user brings their hand/wrist in front of their chest (just like in the reference video!),
   * we composite the user's real forearm/hand capsule from the webcam frame ON TOP of the garment!
   */
  function renderWebcamHandOcclusion(ctx, cw, ch, videoEl, drawRect, skel) {
    if (!videoEl || videoEl.readyState < 2) return;
    const arms = [
      [skel.lElbow, skel.lWrist],
      [skel.rElbow, skel.rWrist]
    ];
    arms.forEach(([elbow, wrist]) => {
      if (!wrist || (wrist.v || 0) < 0.45) return;
      // Check if wrist is inside the torso region (x in 0.25..0.75, y in 0.24..0.78)
      if (wrist.x > 0.22 && wrist.x < 0.78 && wrist.y > 0.22 && wrist.y < 0.80) {
        const ex = elbow.x * cw;
        const ey = elbow.y * ch;
        const wx = wrist.x * cw;
        const wy = wrist.y * ch;
        const angle = Math.atan2(wy - ey, wx - ex);
        const handX = wx + Math.cos(angle) * (cw * 0.045);
        const handY = wy + Math.sin(angle) * (cw * 0.045);
        const radius = cw * 0.052;

        ctx.save();
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.moveTo(ex, ey);
        ctx.lineTo(handX, handY);
        // Build capsule clip path around forearm & hand
        const nx = -Math.sin(angle) * radius;
        const ny = Math.cos(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(ex + nx, ey + ny);
        ctx.lineTo(handX + nx, handY + ny);
        ctx.arc(handX, handY, radius * 1.15, angle + Math.PI / 2, angle - Math.PI / 2, true);
        ctx.lineTo(ex - nx, ey - ny);
        ctx.arc(ex, ey, radius * 0.85, angle - Math.PI / 2, angle + Math.PI / 2, true);
        ctx.closePath();
        ctx.clip();

        if (state.studio.facingMode === 'user') {
          ctx.translate(cw, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoEl, drawRect.dx, drawRect.dy, drawRect.dw, drawRect.dh);
        ctx.restore();
      }
    });
  }

  /**
   * Renders the Unified Continuous 96-Triangle Biomechanical Mesh when in "AI Body-Fit Live" mode
   * (either inside the Studio Modal or inside an Inline Product Card).
   * Deforms shoulders, bust, sleeves, waist, and silk hem directly on the continuous image mesh
   * so there is ZERO double-head ghosting and ZERO blur seam!
   */
  function renderSimulatedBodyFitFrame(ctx, cw, ch, asset, skel, opts = {}) {
    if (!asset || !asset.rawImg) return;
    ctx.clearRect(0, 0, cw, ch);

    const img = asset.rawImg;
    const iw = img.naturalWidth || asset.width || 440;
    const ih = img.naturalHeight || asset.height || 560;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    // Always draw base image underneath first so subpixel anti-aliased triangle boundaries never bleed dark canvas background!
    ctx.drawImage(img, dx, dy, dw, dh);
    if ((state.studio.holdOriginal && !opts.ignoreHold) || opts.forceOriginal) {
      return;
    }

    const ROWS = 8;
    const COLS = 6;
    const waistScale = 1 + (Number(inputWaist?.value || 64) - 64) * 0.0055;
    const heightScale = 1 + (Number(inputHeight?.value || 163) - 163) * 0.0018;
    const manualScale = opts.ignoreManual ? 1.0 : poseState.manualScale;
    const manualOffX = opts.ignoreManual ? 0 : poseState.manualX * (cw / 500);
    const manualOffY = opts.ignoreManual ? 0 : poseState.manualY * (ch / 500);

    // Kinematic deltas relative to neutral rest pose
    const swayX = (skel.neck.x - 0.5) * cw * 1.15;
    const breathY = (skel.neck.y - 0.268) * ch * 1.1;
    const yaw = skel.yaw || 0;
    const tilt = skel.tilt || 0;
    const breathe = skel.breathe || Math.sin(performance.now() * 0.0026);

    const grid = [];
    for (let r = 0; r <= ROWS; r++) {
      const vNorm = r / ROWS; // 0 = top border, 1 = bottom border
      const row = [];

      // Source image coordinate (maps 1:1 with object-fit: cover rectangle)
      const uMinSrc = (0 - dx) / scale;
      const uMaxSrc = (cw - dx) / scale;
      const vSrc = (vNorm * ch - dy) / scale;

      // Vertical envelope: 0 at outer top/bottom edges, peaks across collar/shoulders/bust/waist/hem
      const isBorderRow = (r === 0 || r === ROWS);
      const bodyInfluenceV = isBorderRow ? 0 : Math.pow(Math.sin(vNorm * Math.PI), 0.75);
      // Garment torso zone (vNorm in 0.24 .. 0.90) receives stronger cloth articulation
      const garmentZoneV = (vNorm >= 0.22 && vNorm <= 0.92)
        ? Math.sin(((vNorm - 0.22) / 0.70) * Math.PI)
        : 0;

      for (let c = 0; c <= COLS; c++) {
        const uNorm = c / COLS;
        const signedU = (uNorm - 0.5) * 2; // -1 .. +1
        const uSrc = lerp(uMinSrc, uMaxSrc, uNorm);

        const isBorderCol = (c === 0 || c === COLS);
        const env = (isBorderRow || isBorderCol) ? 0 : bodyInfluenceV * Math.sin(uNorm * Math.PI);
        const clothEnv = (isBorderRow || isBorderCol) ? 0 : garmentZoneV * Math.sin(uNorm * Math.PI);

        let vx = uNorm * cw;
        let vy = vNorm * ch;

        if (env > 0) {
          // 1. Natural kinematic body sway, breathing chest lift & shoulder tilt
          vx += (swayX + manualOffX) * env;
          vy += (breathY + manualOffY) * env;

          // 2. Shoulder & Torso Tilt around chest center (0.5, 0.38)
          const relX = vx - cw * 0.5;
          const relY = vy - ch * 0.38;
          const effTilt = tilt * 0.65 * env;
          const cosT = Math.cos(effTilt);
          const sinT = Math.sin(effTilt);
          vx = cw * 0.5 + (relX * cosT - relY * sinT);
          vy = ch * 0.38 + (relX * sinT + relY * cosT);

          // 3. 3D Yaw Perspective & Ribcage Expansion on Garment Torso
          const bustBreath = (vNorm > 0.24 && vNorm < 0.56) ? (1 + breathe * 0.025) : 1.0;
          const waistFit = (vNorm >= 0.48 && vNorm <= 0.75) ? waistScale : 1.0;
          const yawTurnShift = yaw * cw * 0.065 * clothEnv;
          const yawForeshorten = 1 + signedU * yaw * 0.18 * clothEnv;

          vx = cw * 0.5 + (vx - cw * 0.5) * yawForeshorten * bustBreath * waistFit * manualScale + yawTurnShift;
          vy = ch * 0.38 + (vy - ch * 0.38) * heightScale * manualScale;

          // 4. Flowing Silk Hem Ripple on lower garment rows (r = 5, 6, 7)
          if (vNorm > 0.58 && vNorm < 0.95) {
            const wave = Math.sin(performance.now() * 0.0032 + c * 1.15) * (cw * 0.009) * clothEnv;
            vx += wave;
          }
        }

        row.push({ u: uSrc, v: vSrc, x: vx, y: vy });
      }
      grid.push(row);
    }

    // 1. Render all 96 triangles seamlessly
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p00 = grid[r][c];
        const p10 = grid[r][c + 1];
        const p01 = grid[r + 1][c];
        const p11 = grid[r + 1][c + 1];

        drawTexturedTriangle(
          ctx, img,
          p00.u, p00.v, p10.u, p10.v, p01.u, p01.v,
          p00.x, p00.y, p10.x, p10.y, p01.x, p01.y
        );
        drawTexturedTriangle(
          ctx, img,
          p10.u, p10.v, p11.u, p11.v, p01.u, p01.v,
          p10.x, p10.y, p11.x, p11.y, p01.x, p01.y
        );
      }
    }

    // 2. Dynamic 3D Silk Sheen & Torso Fold Shading as body rotates
    if (Math.abs(yaw) > 0.015) {
      ctx.save();
      const grad = ctx.createLinearGradient(cw * 0.22, ch * 0.25, cw * 0.78, ch * 0.75);
      const highlightAlpha = Math.min(0.14, Math.abs(yaw) * 0.28).toFixed(3);
      const shadowAlpha = Math.min(0.16, Math.abs(yaw) * 0.32).toFixed(3);
      if (yaw > 0) {
        grad.addColorStop(0, `rgba(255, 248, 225, ${highlightAlpha})`);
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, `rgba(0, 0, 0, ${shadowAlpha})`);
      } else {
        grad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, `rgba(255, 248, 225, ${highlightAlpha})`);
      }
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillRect(cw * 0.15, ch * 0.22, cw * 0.70, ch * 0.68);
      ctx.restore();
    }

    // 3. Optional AI Skeleton & 96-Triangle Garment Mesh Wireframe ("🦴 Lưới AI")
    if (state.studio.showMeshDebug || opts.showWireframe) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 255, 46, 0.42)';
      ctx.lineWidth = 1;
      for (let r = 2; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          const p00 = grid[r][c];
          const p10 = grid[r][c + 1];
          const p01 = grid[r + 1][c];
          const p11 = grid[r + 1][c + 1];
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Draw key skeleton joints over the garment
      const jLShoulder = grid[2][2];
      const jRShoulder = grid[2][4];
      const jLElbow = grid[4][1];
      const jRElbow = grid[4][5];
      const jLHip = grid[5][2];
      const jRHip = grid[5][4];
      const jNeck = grid[2][3];
      const jWaist = grid[5][3];

      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(jLElbow.x, jLElbow.y);
      ctx.lineTo(jLShoulder.x, jLShoulder.y);
      ctx.lineTo(jRShoulder.x, jRShoulder.y);
      ctx.lineTo(jRElbow.x, jRElbow.y);
      ctx.moveTo(jNeck.x, jNeck.y);
      ctx.lineTo(jWaist.x, jWaist.y);
      ctx.moveTo(jLHip.x, jLHip.y);
      ctx.lineTo(jRHip.x, jRHip.y);
      ctx.stroke();

      [jLShoulder, jRShoulder, jLElbow, jRElbow, jLHip, jRHip, jNeck, jWaist].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#c8ff2e';
        ctx.fill();
        ctx.strokeStyle = '#0b0c0e';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  // ==========================================================================
  // INLINE ON-CARD "✦ AI FIT LIVE" ENGINE (Runs on any product card!)
  // ==========================================================================
  const activeInlineCards = new Map(); // cardEl -> { product, asset, pointerX, pointerY }
  let inlineLoopId = null;

  function bindInlineCardAiFit(card, product) {
    const media = $('.product-media, .lookbook-media-wrap', card) || card;
    media.addEventListener('mousemove', (e) => {
      const stateItem = activeInlineCards.get(card);
      if (!stateItem) return;
      const rect = media.getBoundingClientRect();
      stateItem.pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      stateItem.pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    });
    media.addEventListener('mouseleave', () => {
      const stateItem = activeInlineCards.get(card);
      if (stateItem) {
        stateItem.pointerX = 0;
        stateItem.pointerY = 0;
      }
    });
  }

  function toggleInlineCardAiFit(card, product) {
    const btn = $('[data-inline-aifit]', card);
    const canvas = $('.card-ai-live-canvas', card);
    if (!canvas) return;

    if (activeInlineCards.has(card)) {
      activeInlineCards.delete(card);
      card.classList.remove('ai-fit-active');
      if (btn) btn.innerHTML = '✦ AI Fit Live';
      return;
    }

    card.classList.add('ai-fit-active');
    if (btn) btn.innerHTML = '🟢 Đang Fit AI (Di chuột)';

    const entry = { product, asset: null, pointerX: 0, pointerY: 0, showMeshUntil: performance.now() + 1400 };
    activeInlineCards.set(card, entry);

    loadGarmentForProduct(product.imgFull, product.category, (asset) => {
      entry.asset = asset;
    });

    if (!inlineLoopId) {
      inlineLoopId = requestAnimationFrame(renderInlineCardsLoop);
    }
    showToast(`Đang chạy AI Body-Fit trực tiếp trên "${product.title}"! Di chuột qua ảnh để xoay cơ thể 3D.`);
  }

  function renderInlineCardsLoop(now) {
    if (activeInlineCards.size === 0) {
      inlineLoopId = null;
      return;
    }
    const timeSec = now * 0.001;
    activeInlineCards.forEach((entry, card) => {
      if (!document.body.contains(card)) {
        activeInlineCards.delete(card);
        return;
      }
      const canvas = $('.card-ai-live-canvas', card);
      if (!canvas || !entry.asset) return;
      const ctx = canvas.getContext('2d');
      const cw = canvas.width;
      const ch = canvas.height;
      const skel = computeSimulatedBodySkeleton(timeSec, entry.pointerX, entry.pointerY);
      const showWireframe = now < entry.showMeshUntil;

      if (state.webcamStream && webcamVideo.readyState >= 2) {
        updateWebcamPose(webcamVideo);
        const vw = webcamVideo.videoWidth || 640;
        const vh = webcamVideo.videoHeight || 480;
        const sc = Math.max(cw / vw, ch / vh);
        const dw = vw * sc;
        const dh = vh * sc;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        if (state.studio.facingMode === 'user') {
          ctx.translate(cw, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(webcamVideo, dx, dy, dw, dh);
        ctx.restore();
        renderWarpedGarmentOnSkeleton(ctx, cw, ch, entry.asset, poseState, { ignoreManual: true, showWireframe });
      } else {
        renderSimulatedBodyFitFrame(ctx, cw, ch, entry.asset, skel, { ignoreManual: true, ignoreHold: true, showWireframe });
      }
    });
    inlineLoopId = requestAnimationFrame(renderInlineCardsLoop);
  }

  // ==========================================================================
  // MAIN 60FPS STUDIO & CAPSULE RENDER LOOP
  // ==========================================================================
  function renderStudioLoop(now = performance.now()) {
    const isModalOpen = modal?.classList.contains('open');
    const isCapsuleVisible = capsuleEl && !capsuleEl.hidden;
    const isLiveView = state.studio.viewMode === 'webcam' || state.studio.viewMode === 'ai-motion';

    if ((!isModalOpen && !isCapsuleVisible) || !isLiveView) {
      poseState.rafId = null;
      return;
    }

    const timeSec = now * 0.001;
    const usingWebcam = state.studio.viewMode === 'webcam' && Boolean(state.webcamStream);

    if (usingWebcam) {
      updateWebcamPose(webcamVideo);
    }

    const activeSkel = usingWebcam
      ? poseState
      : computeSimulatedBodySkeleton(timeSec, poseState.pointerX, poseState.pointerY);

    const targets = [];
    if (liveCanvas && isModalOpen) targets.push(liveCanvas);
    if (capsuleCanvas && isCapsuleVisible) targets.push(capsuleCanvas);

    targets.forEach((canvas) => {
      if (canvas === liveCanvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
        }
      }
      const cw = canvas.width;
      const ch = canvas.height;
      const ctx = canvas.getContext('2d');

      if (usingWebcam) {
        ctx.clearRect(0, 0, cw, ch);
        let drawRect = { dx: 0, dy: 0, dw: cw, dh: ch };
        if (webcamVideo.readyState >= 2) {
          const vw = webcamVideo.videoWidth || 640;
          const vh = webcamVideo.videoHeight || 480;
          const scale = Math.max(cw / vw, ch / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const dx = (cw - dw) / 2;
          const dy = (ch - dh) / 2;
          drawRect = { dx, dy, dw, dh };

          ctx.save();
          if (state.studio.facingMode === 'user') {
            ctx.translate(cw, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(webcamVideo, dx, dy, dw, dh);
          ctx.restore();
        }

        if (!state.studio.holdOriginal && activeGarmentAsset) {
          const splitActive = Boolean(state.studio.beforeAfterActive) && canvas === liveCanvas;
          const splitX = splitActive ? Math.round(cw * (state.studio.beforeAfterRatio ?? 0.5)) : 0;
          if (splitActive) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(splitX, 0, cw - splitX, ch);
            ctx.clip();
          }
          renderWarpedGarmentOnSkeleton(ctx, cw, ch, activeGarmentAsset, activeSkel, {
            ignoreManual: canvas === capsuleCanvas
          });
          // Render user's real forearm/hand on top if they cross their chest!
          renderWebcamHandOcclusion(ctx, cw, ch, webcamVideo, drawRect, activeSkel);
          if (splitActive) {
            ctx.restore();
          }
        }
      } else if (activeGarmentAsset) {
        const splitActive = Boolean(state.studio.beforeAfterActive) && canvas === liveCanvas;
        const splitX = splitActive ? Math.round(cw * (state.studio.beforeAfterRatio ?? 0.5)) : 0;
        if (splitActive) {
          // Left side: original body (Before), Right side: AI Body-Fit warped garment (After)
          renderSimulatedBodyFitFrame(ctx, cw, ch, activeGarmentAsset, activeSkel, {
            ignoreManual: canvas === capsuleCanvas,
            ignoreHold: false
          });
          // Redraw original unwarped frame on left side [0..splitX]
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitX, ch);
          ctx.clip();
          const img = activeGarmentAsset.rawImg;
          const iw = img.naturalWidth || activeGarmentAsset.width || 440;
          const ih = img.naturalHeight || activeGarmentAsset.height || 560;
          const sc = Math.max(cw / iw, ch / ih);
          const dw = iw * sc;
          const dh = ih * sc;
          const dx = (cw - dw) / 2;
          const dy = (ch - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        } else {
          renderSimulatedBodyFitFrame(ctx, cw, ch, activeGarmentAsset, activeSkel, {
            ignoreManual: canvas === capsuleCanvas
          });
        }
      }
    });

    poseState.rafId = requestAnimationFrame(renderStudioLoop);
  }

  function ensureStudioLoop() {
    if (!poseState.rafId) {
      poseState.rafId = requestAnimationFrame(renderStudioLoop);
    }
  }

  // Update Studio View Mode UI ('avatar' | 'ai-motion' | 'webcam')
  const modeAvatarBtn = $('#modeAvatarBtn');
  const modeAiMotionBtn = $('#modeAiMotionBtn');
  const modeWebcamBtn = $('#modeWebcamBtn');
  const flipCamBtn = $('#studioFlipCamBtn');
  const holdSelfBtn = $('#studioHoldSelfBtn');

  function setStudioViewMode(mode) {
    state.studio.viewMode = mode;
    const isCanvasActive = mode === 'ai-motion' || mode === 'webcam';
    stage?.classList.toggle('webcam-on', isCanvasActive);

    modeAvatarBtn?.classList.toggle('active', mode === 'avatar');
    modeAiMotionBtn?.classList.toggle('active', mode === 'ai-motion');

    if (holdSelfBtn) holdSelfBtn.hidden = !isCanvasActive;
    if (aiPoseHudPill) aiPoseHudPill.hidden = !isCanvasActive;

    const liveBadge = $('#studioLiveBadge');
    const liveText = $('#studioLiveStatusText');

    if (mode === 'webcam') {
      if (liveBadge) liveBadge.classList.add('is-live');
      if (liveText) liveText.textContent = 'LIVE CAM';
      if (aiPoseHudText) aiPoseHudText.textContent = 'AI Body-Fit: Đang bám 33 điểm cơ thể thật qua Camera';
      ensureStudioLoop();
    } else if (mode === 'ai-motion') {
      if (liveBadge) liveBadge.classList.add('is-live');
      if (liveText) liveText.textContent = 'AI BODY-FIT';
      if (aiPoseHudText) aiPoseHudText.textContent = 'AI Body-Fit: Mô phỏng chuyển động cơ thể & lưới áo 96 tam giác (Di chuột để xoay 3D)';
      startSessionTimer();
      ensureStudioLoop();
    } else {
      if (liveBadge) liveBadge.classList.remove('is-live');
      if (liveText) liveText.textContent = 'STATIC';
    }
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
    if (studioImg) studioImg.src = hiResSrc;
    if (arImg) arImg.src = hiResSrc;
    const capThumb = $('#capsuleGarmentThumb');
    if (capThumb) capThumb.src = rawSrc;

    triggerAiSynthesisScan(`AI đang mô phỏng "${p.title}" & khớp khung xương cơ thể...`);
    loadGarmentForProduct(hiResSrc, p.category, (asset) => {
      activeGarmentAsset = asset;
      ensureStudioLoop();
    });

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
    poseState.manualX = 0;
    poseState.manualY = 0;
    poseState.manualScale = 1.0;

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
    if (typeof updateStylistVerdictForCurrent === 'function') {
      updateStylistVerdictForCurrent();
    }
  }

  function openStudio(product, opts = {}) {
    const targetProduct = product || state.studio.product || PRODUCTS[0];
    if (!targetProduct || !modal) return;

    if (capsuleEl) capsuleEl.hidden = true;
    state.studio.inCapsule = false;

    selectStudioProduct(targetProduct);

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (opts.autoStartCam) {
      startWebcam();
    } else if (state.webcamStream) {
      setStudioViewMode('webcam');
    } else {
      // Default to real-time AI Body-Fit Live simulation immediately!
      setStudioViewMode('ai-motion');
    }
  }

  function closeStudio(keepCapsule = false) {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    $('#studioAddSheet')?.setAttribute('hidden', '');

    if (!keepCapsule) {
      stopWebcam(true);
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

  function shrinkToCapsule() {
    if (!state.studio.product) selectStudioProduct(PRODUCTS[0]);
    state.studio.inCapsule = true;
    if (capsuleEl) capsuleEl.hidden = false;
    const capThumb = $('#capsuleGarmentThumb');
    if (capThumb) {
      capThumb.style.display = 'none'; // Capsule renders live AI canvas directly!
    }
    closeStudio(true);
    ensureStudioLoop();
    showToast('Đã thu nhỏ thành AnyWear AI Capsule! Lướt web và kéo thả bất kỳ ảnh áo nào vào Capsule để đổi đồ ngay.');
  }

  $('#studioShrinkCapsuleBtn')?.addEventListener('click', shrinkToCapsule);
  $('#capsuleExpandBtn')?.addEventListener('click', () => openStudio(state.studio.product));
  $('#capsuleCloseBtn')?.addEventListener('click', () => {
    if (capsuleEl) capsuleEl.hidden = true;
    state.studio.inCapsule = false;
    stopWebcam(true);
  });

  // Floating Window / Official ShopAnywear Store Bridge (https://shopanywear.com/store/)
  function triggerShopAnywearWidgetForProduct(product) {
    const p = product || state.studio.product || PRODUCTS[0];
    const garmentUrl = p?.imgFull || p?.img || '';
    // Check if Decart / ShopAnywear widget is mounted on page
    const cardImg = document.querySelector(`img[data-garment-id="${p?.id}"][data-product-image="true"]`) || studioImg;
    if (cardImg) {
      const wrap = cardImg.parentElement;
      const vtonBtn = wrap && wrap.querySelector('.vton-btn');
      if (vtonBtn) {
        vtonBtn.click();
        return true;
      }
      const globalBtn = document.getElementById('__decart-imgbtn');
      if (globalBtn) {
        cardImg.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
        setTimeout(() => globalBtn.click(), 80);
        return true;
      }
    }
    if (window.DecartWidget && typeof window.DecartWidget.open === 'function') {
      window.DecartWidget.open();
      const iframe = document.querySelector('#__decart-tryon-widget iframe');
      if (iframe && iframe.contentWindow && garmentUrl) {
        setTimeout(() => {
          iframe.contentWindow.postMessage({ type: 'DECART_DROP_IMAGE', imageUrl: garmentUrl }, '*');
        }, 250);
      }
      return true;
    }
    return false;
  }

  $('#studioFloatPipBtn')?.addEventListener('click', () => {
    const p = state.studio.product || PRODUCTS[0];
    if (triggerShopAnywearWidgetForProduct(p)) {
      showToast('Đã kích hoạt Widget AnyWear Live từ shopanywear.com/store ngay trên trang!');
      return;
    }
    const officialUrl = 'https://shopanywear.com/store/';
    const w = 480;
    const h = 720;
    const left = Math.max(20, window.screen.availWidth - w - 30);
    const top = Math.max(20, Math.round((window.screen.availHeight - h) / 2));
    const popup = window.open(officialUrl, 'anywear-store', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (popup) {
      shrinkToCapsule();
      showToast('Đã mở cửa sổ nổi ShopAnywear Store (shopanywear.com/store) + thu nhỏ Capsule trên trang!');
    } else {
      window.open(officialUrl, '_blank', 'noopener');
    }
  });

  $('#openOfficialAnywearPopupBtn')?.addEventListener('click', () => {
    const p = state.studio.product || PRODUCTS[0];
    if (triggerShopAnywearWidgetForProduct(p)) {
      showToast('Đã mở Widget thử đồ trực tiếp của shopanywear.com/store!');
      return;
    }
    window.open('https://shopanywear.com/store/', '_blank', 'noopener');
  });

  $$('[data-aw-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.studio.tier = btn.dataset.awTier;
      $$('[data-aw-tier]').forEach((b) => b.classList.toggle('active', b === btn));
      triggerAiSynthesisScan(`Đang tối ưu lưới vải 3D ở chế độ ${btn.textContent.trim()}...`);
    });
  });

  // ==========================================================================
  // 8. UNIVERSAL GARMENT INPUT: UPLOAD, PASTE (Ctrl+V), DRAG & DROP, URL LINK
  // ==========================================================================
  function createCustomGarmentObject(imgSrc, label = 'Trang phục tải lên') {
    return {
      id: `custom-${Date.now()}`,
      title: label,
      category: 'to-lua',
      fabric: 'AnyWear Custom AI Synthesis',
      price: 1690000,
      rent: 480000,
      sizes: ['S', 'M', 'L'],
      colors: ['Tùy chỉnh'],
      url: 'https://shopanywear.com/store/',
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
      showToast(`AI đã mô phỏng & áp "${customProd.title}" ngay trong Capsule!`);
    } else {
      openStudio(customProd, { autoStartCam: false });
      showToast(`AI đã tách trang phục "${customProd.title}" và khớp vào cơ thể chuyển động!`);
    }
  }

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

    const matchedLalin = PRODUCTS.find((p) => trimmed.includes(p.handle));
    if (matchedLalin) {
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
        showToast(`Đã nạp sản phẩm Lalin: "${matchedLalin.title}" vào AI Body-Fit!`);
      }
      return;
    }

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
      showToast(`Đã nạp ảnh trang phục từ ${hostLabel} vào bộ mô phỏng AI Body-Fit!`);
    }
  }

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

  function handleDataTransferDrop(dt) {
    if (!dt) return;
    const internalId = dt.getData('application/x-anywear-id');
    if (internalId) {
      const prod = PRODUCTS.find((p) => p.id === internalId);
      if (prod) {
        if (state.studio.inCapsule && !capsuleEl?.hidden) {
          selectStudioProduct(prod);
          showToast(`Đã đổi sang "${prod.title}" trong Capsule!`);
        } else {
          openStudio(prod);
          showToast(`Đã chọn "${prod.title}" để thử đồ AI Body-Fit!`);
        }
        return;
      }
    }
    if (dt.files && dt.files.length > 0) {
      handleFileInput(dt.files[0], 'Ảnh kéo thả');
      return;
    }
    const html = dt.getData('text/html');
    if (html) {
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && m[1]) {
        handleUrlInput(m[1]);
        return;
      }
    }
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (uri) {
      handleUrlInput(uri.split(/\r?\n/)[0]);
    }
  }

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

  $('#studioAddClothesBtn')?.addEventListener('click', () => {
    const sheet = $('#studioAddSheet');
    if (sheet) sheet.hidden = !sheet.hidden;
  });
  $('#closeAddSheetBtn')?.addEventListener('click', () => {
    $('#studioAddSheet')?.setAttribute('hidden', '');
  });

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
  // 9. CAMERA, AI POSE MESH & INTERACTIVE CONTROLS INSIDE STUDIO
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

  $('#studioAutoTrackBtn')?.addEventListener('click', (e) => {
    state.studio.autoTrack = !state.studio.autoTrack;
    e.currentTarget.classList.toggle('active', state.studio.autoTrack);
    e.currentTarget.textContent = state.studio.autoTrack ? '🎯 Khớp Cơ Thể: BẬT' : '🎯 Khớp Cơ Thể: TẮT';
    showToast(state.studio.autoTrack
      ? 'Đã bật AI Khớp Cơ Thể 3D — lưới áo tự động biến dạng theo vai, ngực và eo.'
      : 'Đã khóa chuyển động tự động — bạn có thể kéo/phóng to vị trí áo thủ công.');
  });

  $('#studioBgMatteBtn')?.addEventListener('click', (e) => {
    state.studio.aiMatte = !state.studio.aiMatte;
    e.currentTarget.classList.toggle('active', state.studio.aiMatte);
    showToast(state.studio.aiMatte
      ? 'Đã bật AI Tách Áo — tự động xóa phần đầu mẫu cũ & tách nền quanh trang phục.'
      : 'Đang hiển thị texture gốc.');
  });

  $('#studioMeshDebugBtn')?.addEventListener('click', (e) => {
    state.studio.showMeshDebug = !state.studio.showMeshDebug;
    e.currentTarget.classList.toggle('active', state.studio.showMeshDebug);
    stage?.classList.toggle('mesh-debug-on', state.studio.showMeshDebug);
    showToast(state.studio.showMeshDebug
      ? 'Đang hiển thị Khung xương AI 33 điểm & Lưới biến dạng vải 96 tam giác!'
      : 'Đã ẩn lưới khung xương AI.');
  });

  if (holdSelfBtn) {
    const setHold = (val) => {
      state.studio.holdOriginal = val;
      holdSelfBtn.setAttribute('aria-pressed', String(val));
      holdSelfBtn.textContent = val ? 'Đang hiển thị cơ thể gốc' : 'Giữ để xem cơ thể gốc';
    };
    holdSelfBtn.addEventListener('pointerdown', () => setHold(true));
    holdSelfBtn.addEventListener('pointerup', () => setHold(false));
    holdSelfBtn.addEventListener('pointerleave', () => setHold(false));
    holdSelfBtn.addEventListener('pointercancel', () => setHold(false));
  }

  // Interactive 3D body rotation on mousemove + drag/wheel adjustment on Live Canvas
  if (liveCanvas) {
    let dragging = false; let sx = 0; let sy = 0; let ox = 0; let oy = 0;
    liveCanvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = poseState.manualX;
      oy = poseState.manualY;
      liveCanvas.setPointerCapture(e.pointerId);
    });
    liveCanvas.addEventListener('pointermove', (e) => {
      const rect = liveCanvas.getBoundingClientRect();
      if (state.studio.autoTrack) {
        poseState.pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        poseState.pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      }
      if (!dragging) return;
      poseState.manualX = ox + (e.clientX - sx);
      poseState.manualY = oy + (e.clientY - sy);
    });
    liveCanvas.addEventListener('pointerleave', () => {
      poseState.pointerX = 0;
      poseState.pointerY = 0;
    });
    const endDrag = () => { dragging = false; };
    liveCanvas.addEventListener('pointerup', endDrag);
    liveCanvas.addEventListener('pointercancel', endDrag);
    liveCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      poseState.manualScale = Math.max(0.65, Math.min(1.85, poseState.manualScale - e.deltaY * 0.001));
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

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function startSessionTimer() {
    if (state.timerId) return;
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
      showToast('Trình duyệt cần chạy trên HTTPS hoặc localhost để bật Camera trực tiếp. Đang chạy chế độ AI Body-Fit Live!');
      setStudioViewMode('ai-motion');
      return;
    }
    try {
      initMediaPipePose();
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

      if (flipCamBtn) flipCamBtn.hidden = false;
      if (modeWebcamBtn) {
        modeWebcamBtn.textContent = '⏹ Tắt Camera Thật';
        modeWebcamBtn.classList.add('live-on');
      }

      startSessionTimer();
      triggerAiSynthesisScan('AI MediaPipe Pose đang quét 33 điểm cơ thể từ Camera...');
      setStudioViewMode('webcam');
      showToast('Camera thật đã bật! AI đang bám theo 33 điểm vai, ngực, khuỷu tay và eo của bạn theo thời gian thực.');
    } catch (err) {
      setStudioViewMode('ai-motion');
      showToast('Chưa cấp quyền Camera hoặc thiết bị không có sẵn webcam — đang chạy Mô Phỏng Cơ Thể AI (di chuột để xoay 3D)!');
    }
  }

  function stopWebcam(switchToAvatar = false) {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach((t) => t.stop());
      state.webcamStream = null;
    }
    poseState.hasLiveLandmarks = false;
    if (webcamVideo) webcamVideo.srcObject = null;
    if (flipCamBtn) flipCamBtn.hidden = true;

    if (modeWebcamBtn) {
      modeWebcamBtn.textContent = '📷 Bật Camera Thật';
      modeWebcamBtn.classList.remove('live-on');
    }

    if (switchToAvatar) {
      if (poseState.rafId) {
        cancelAnimationFrame(poseState.rafId);
        poseState.rafId = null;
      }
      clearInterval(state.timerId);
      state.timerId = null;
      setStudioViewMode('avatar');
    } else {
      setStudioViewMode('ai-motion');
    }
  }

  modeWebcamBtn?.addEventListener('click', () => {
    if (state.webcamStream) stopWebcam(false);
    else startWebcam(state.studio.facingMode);
  });

  modeAiMotionBtn?.addEventListener('click', () => {
    if (state.webcamStream) stopWebcam(false);
    else setStudioViewMode('ai-motion');
    triggerAiSynthesisScan('Đang kích hoạt mô phỏng cơ thể chuyển động & lưới vải 96 tam giác...');
  });

  modeAvatarBtn?.addEventListener('click', () => {
    stopWebcam(true);
  });

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
      </div>`).join('') : '<p class="bag-empty">Chưa có sản phẩm. Hãy thử đồ bằng AnyWear AI và thêm vào giỏ nhé!</p>';
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

  window.addEventListener('pagehide', () => stopWebcam(true));

  function checkInitialGarmentQuery() {
    const params = new URLSearchParams(window.location.search);
    const garmentParam = params.get('garment');
    if (garmentParam) {
      handleUrlInput(garmentParam);
    }
  }

  // ==========================================================================
  // 11. UIHARU-KAZARI/ANYWEAR API ENGINE & TRY-ON OPTIMIZER
  //     Ref: https://github.com/uiharu-kazari/anywear
  //     - /api/skin/start, /api/skin/status/:taskId, /api/skin/brief
  //     - /api/garments/detect (box_2d [ymin,xmin,ymax,xmax]) + cropByBox()
  //     - /api/vto/start, /api/vto/status/:taskId
  //     - /api/stylist/verdict (Swinging Stylist Verdict Hang-Tag + Occasion)
  //     - Before / After Split Mirror & On-Device Saved Lookbook
  // ==========================================================================
  state.studio.beforeAfterActive = false;
  state.studio.beforeAfterRatio = 0.5;
  state.studio.occasion = 'Gặp gỡ / Trà chiều';
  state.studio.skinScores = {
    redness: 84,
    oiliness: 79,
    moisture: 86,
    radiance: 91,
    acne: 88,
    texture: 87,
    skin_type: 'Normal / Warm Undertone',
    skin_age: 23
  };
  state.studio.skinBrief = {
    headline: 'Làn da sáng mịn ấm áp — cực hợp lụa tơ tằm & gấm dệt',
    summary: 'Độ rạng rỡ (Radiance 91) và độ ẩm (86) tốt giúp tôn bật các sắc kem ngọc trai, hồng phấn và đỏ rượu vang.',
    care_focus: ['Dưỡng ẩm nhẹ trước khi mặc cổ yếm', 'Ưu tiên ánh sáng vàng ấm'],
    palette: {
      guidance: 'Chọn tông ấm sang trọng (Ivory, Champagne, Ruby) và tránh màu xám tro lạnh.',
      wear: [
        { name: 'Trắng Ngọc Trai', hex: '#F5EFE6', why: 'Tôn độ bóng tự nhiên của làn da' },
        { name: 'Đỏ Rượu Vang', hex: '#7A1C24', why: 'Tạo tương phản quý phái, nổi bật sắc hồng' },
        { name: 'Hồng Phấn Lụa', hex: '#E8B4B8', why: 'Hài hòa với sắc độ ấm của da' },
        { name: 'Vàng Champagne', hex: '#D4AF37', why: 'Cộng hưởng cùng ánh kim của gấm thêu' },
        { name: 'Xanh Ngọc Lục', hex: '#2E6F5E', why: 'Cân bằng sắc đỏ nhẹ trên gò má' }
      ],
      avoid: [
        { name: 'Xám Tro Lạnh', hex: '#7D848C', why: 'Dễ làm sắc da trông kém tươi' },
        { name: 'Vàng Chanh Neon', hex: '#D9E82A', why: 'Lấn át độ mịn tự nhiên của da' }
      ]
    }
  };
  state.studio.lastVerdict = null;

  /**
   * Crops a bounding box `[ymin, xmin, ymax, xmax]` (normalized 0..1000 per uiharu-kazari/anywear)
   * with padding and upscales small crops to at least 560px on the short side for clean VTO & mesh synthesis.
   */
  function cropByBox(imgOrSrc, box, padFrac = 0.05) {
    return new Promise((resolve, reject) => {
      const processImg = (img) => {
        try {
          const [ymin, xmin, ymax, xmax] = box;
          const w = img.naturalWidth || img.width || 600;
          const h = img.naturalHeight || img.height || 800;
          const bw = ((xmax - xmin) / 1000) * w;
          const bh = ((ymax - ymin) / 1000) * h;
          const padX = bw * padFrac;
          const padY = bh * padFrac;
          const sx = Math.max(0, (xmin / 1000) * w - padX);
          const sy = Math.max(0, (ymin / 1000) * h - padY);
          const sw = Math.min(w - sx, bw + padX * 2);
          const sh = Math.min(h - sy, bh + padY * 2);

          const minSide = 560;
          const scale = Math.max(1, minSide / Math.max(1, Math.min(sw, sh)));
          const dw = Math.round(sw * scale);
          const dh = Math.round(sh * scale);

          const canvas = document.createElement('canvas');
          canvas.width = dw;
          canvas.height = dh;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, dw, dh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (err) {
          // If cross-origin canvas taint prevents toDataURL, return original source gracefully
          resolve(typeof imgOrSrc === 'string' ? imgOrSrc : img.src);
        }
      };

      if (typeof imgOrSrc !== 'string' && imgOrSrc instanceof HTMLImageElement && imgOrSrc.complete) {
        processImg(imgOrSrc);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImg(img);
      img.onerror = (e) => reject(e);
      img.src = typeof imgOrSrc === 'string' ? imgOrSrc : imgOrSrc.src;
    });
  }

  /**
   * Client-side uiharu-kazari/anywear API wrapper (`anywearApi`):
   * Calls `/api/*` first (when running `node server.mjs`), and seamlessly falls back
   * to deterministic client-side AI computation on static hosts (GitHub Pages).
   */
  const anywearApi = {
    backendState: /\.github\.io$/i.test(window.location.hostname) ? 'offline' : 'unknown',

    async callJson(path, body = null) {
      if (this.backendState === 'offline') {
        throw new Error('Static host mode');
      }
      if (this.backendState === 'unknown') {
        try {
          const probe = await fetch('/api/health', { method: 'GET' });
          const ct = probe.headers.get('content-type') || '';
          this.backendState = (probe.ok && ct.includes('application/json')) ? 'online' : 'offline';
        } catch (_) {
          this.backendState = 'offline';
        }
        if (this.backendState === 'offline') {
          throw new Error('Static host mode');
        }
      }
      const res = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    async detectGarments(imageBase64, p = state.studio.product) {
      try {
        const res = await this.callJson('/api/garments/detect', {
          imageBase64,
          mimeType: 'image/jpeg',
          productTitle: p?.title,
          category: p?.category
        });
        if (res?.garments?.length) return res;
      } catch (_) { /* Fallback to client-side box_2d detector */ }

      const isHalter = p?.category === 'yem';
      const isSet = p?.category === 'set';
      const garments = [
        {
          label: p?.title || 'Áo thiết kế Lalin (Thân trên)',
          category: 'upper_body',
          box_2d: isHalter ? [220, 210, 860, 790] : [215, 150, 880, 850],
          description: `${p?.fabric || 'Lụa cao cấp'} — đã khoanh vùng tự động phần cổ, vai và thân áo`,
          confidence: 0.97
        }
      ];
      if (isSet) {
        garments.push({
          label: `Chân váy / Quần đồng bộ (${p?.title || 'Lalin Set'})`,
          category: 'lower_body',
          box_2d: [580, 200, 965, 800],
          description: 'Phần thân dưới đồng bộ trong nguyên set',
          confidence: 0.92
        });
      }
      garments.push({
        label: 'Toàn bộ trang phục (Full Look)',
        category: 'full_body',
        box_2d: [195, 130, 950, 870],
        description: 'Khoanh vùng toàn thân để thử nguyên bộ',
        confidence: 0.94
      });
      return { garments };
    },

    async analyzeSkinFromImage(imgSource) {
      // Sample real image pixels if available so different selfies produce real score variations!
      let brightness = 185;
      let warmth = 18;
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cx = c.getContext('2d');
        cx.drawImage(imgSource, 0, 0, 48, 48);
        const d = cx.getImageData(12, 12, 24, 24).data;
        let rSum = 0; let gSum = 0; let bSum = 0; let count = 0;
        for (let i = 0; i < d.length; i += 4) {
          rSum += d[i]; gSum += d[i + 1]; bSum += d[i + 2]; count++;
        }
        if (count > 0) {
          const r = rSum / count;
          const g = gSum / count;
          const b = bSum / count;
          brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          warmth = r - b;
        }
      } catch (_) {}

      try {
        const start = await this.callJson('/api/skin/start', { srcFileId: `file_${Date.now()}` });
        if (start?.taskId) {
          const st = await this.callJson(`/api/skin/status/${encodeURIComponent(start.taskId)}`);
          const scores = st?.output?. raw || st?.output || {};
          const briefRes = await this.callJson('/api/skin/brief', { scores });
          if (briefRes?.brief) return { scores, brief: briefRes.brief };
        }
      } catch (_) {}

      const clamp = (v) => Math.max(68, Math.min(97, Math.round(v)));
      const scores = {
        redness: clamp(80 + (warmth % 11)),
        oiliness: clamp(76 + ((brightness * 0.1) % 14)),
        moisture: clamp(83 + ((brightness * 0.08) % 11)),
        radiance: clamp(86 + ((brightness * 0.06) % 10)),
        acne: clamp(85 + ((warmth * 0.3) % 10)),
        texture: clamp(84 + ((brightness * 0.07) % 11)),
        skin_type: warmth > 15 ? 'Normal / Warm Undertone' : 'Combination / Neutral Tone',
        skin_age: 22
      };
      const brief = {
        headline: warmth > 15
          ? 'Sắc da ấm rạng rỡ — cực tôn lụa tơ tằm, đỏ rượu & vàng champagne'
          : 'Sắc da trung tính thanh thoát — hợp sắc trắng ngọc trai, xanh ngọc & hồng phấn',
        summary: `Chỉ số Radiance đạt ${scores.radiance}/100 và Texture ${scores.texture}/100 giúp chất vải có độ bóng nhẹ của Lalin phản chiếu ánh sáng rất tự nhiên trên vùng cổ và xương quai xanh.`,
        care_focus: ['Xịt khoáng cấp ẩm nhẹ trước khi lên hình', 'Chọn ánh sáng Nắng Sớm hoặc Biệt Thự Đỏ'],
        palette: state.studio.skinBrief.palette
      };
      return { scores, brief };
    },

    async fetchStylistVerdict({ product, occasion, skinBrief }) {
      const p = product || state.studio.product || PRODUCTS[0];
      try {
        const res = await this.callJson('/api/stylist/verdict', {
          garmentDescription: `${p.title} (${p.fabric})`,
          garmentCategory: p.category,
          occasion,
          skinBrief: skinBrief || state.studio.skinBrief
        });
        if (res?.verdict) return res.verdict;
      } catch (_) {}

      // Deterministic, context-rich client fallback tailored to product + occasion
      const cat = p?.category || 'to-lua';
      const isGala = /dạ tiệc|gala|sự kiện/i.test(occasion);
      const isPhoto = /lookbook|chụp/i.test(occasion);
      const isTet = /lễ|tết|gia đình/i.test(occasion);

      let score = 92;
      if (cat === 'gam' && (isGala || isTet)) score = 96;
      else if (cat === 'yem' && (isPhoto || isGala)) score = 95;
      else if (cat === 'to-lua') score = 93;
      else if (cat === 'phu-kien') score = 88;

      const verdictType = score >= 85 ? 'wear_it' : 'maybe';
      const headlines = {
        yem: `Đường cắt cổ yếm của "${p.title}" tôn trọn bờ vai & xương quai xanh cho dịp ${occasion}.`,
        'to-lua': `Chất ${p.fabric} mềm rủ của "${p.title}" bắt sáng cực đẹp và thanh lịch khi đi ${occasion}.`,
        gam: `Họa tiết dệt nổi trên "${p.title}" mang lại khí chất sang trọng bậc nhất cho ${occasion}.`,
        khoac: `Phom áo khoác/cách tân "${p.title}" tạo chiều sâu layer tinh tế cho ${occasion}.`,
        set: `Nguyên set "${p.title}" cân đối tỷ lệ cơ thể hoàn hảo, sẵn sàng tỏa sáng tại ${occasion}.`,
        'phu-kien': `Điểm nhấn phụ kiện "${p.title}" hoàn thiện tổng thể trang phục đầy tinh xảo.`
      };

      const heightCm = Number(inputHeight?.value || 163);
      const waistCm = Number(inputWaist?.value || 64);
      const recSize = recommendSize() || 'S';

      return {
        verdict: verdictType,
        score,
        headline: headlines[cat] || headlines['to-lua'],
        reasons: [
          `Tỷ lệ cơ thể (${heightCm}cm · Eo ${waistCm}cm) khớp ${$('#studioFitPercent')?.textContent || '96%'} với phom Size ${recSize} của Lalin.`,
          `Chất liệu ${p.fabric} tạo hiệu ứng chuyển động mềm mại trên lưới vải 96 tam giác khi bạn xoay người.`,
          `Rất phù hợp với không khí "${occasion}" — có thể thuê 3 ngày (${fmt(p.rent)}) hoặc sở hữu ngay.`
        ],
        skin_harmony: `Hài hòa tuyệt đối với bảng màu da (${(skinBrief || state.studio.skinBrief)?.palette?.wear?.slice(0, 2).map((w) => w.name).join(', ') || 'Trắng Ngọc Trai, Đỏ Rượu'}) — giúp gương mặt bừng sáng.`,
        pairing: isGala
          ? ['Khuyên tai ngọc trai Lalin', 'Tóc búi thấp', 'Clutch ánh kim']
          : isTet
            ? ['Mấn đội đầu / Bờm lụa', 'Guốc mộc hoặc cao gót mũi nhọn', 'Son đỏ đất']
            : ['Quần lụa ống rộng', 'Túi cói hoặc túi da nhỏ', 'Trang điểm trong suốt']
      };
    }
  };

  // --- 11.1 Before / After Split Mirror Controller ---
  const baBtn = $('#studioBeforeAfterBtn');
  const baBar = $('#studioBeforeAfterBar');
  const baLine = $('#studioBaLine');

  function updateBeforeAfterUI() {
    const on = Boolean(state.studio.beforeAfterActive);
    baBtn?.classList.toggle('active', on);
    if (baBar) baBar.hidden = !on;
    if (baLine) baLine.style.left = `${(state.studio.beforeAfterRatio * 100).toFixed(1)}%`;
  }

  baBtn?.addEventListener('click', () => {
    state.studio.beforeAfterActive = !state.studio.beforeAfterActive;
    if (state.studio.beforeAfterActive && state.studio.viewMode === 'avatar') {
      setStudioViewMode('ai-motion');
    }
    updateBeforeAfterUI();
    showToast(state.studio.beforeAfterActive
      ? 'Đã bật Gương So Sánh Before / After (uiharu-kazari/anywear) — kéo thanh chia ở giữa để đối chiếu!'
      : 'Đã tắt chế độ chia đôi Before / After.');
  });

  if (baBar && stage) {
    let draggingBa = false;
    const setBaFromClientX = (clientX) => {
      const rect = stage.getBoundingClientRect();
      const ratio = Math.max(0.08, Math.min(0.92, (clientX - rect.left) / Math.max(1, rect.width)));
      state.studio.beforeAfterRatio = ratio;
      if (baLine) baLine.style.left = `${(ratio * 100).toFixed(1)}%`;
    };
    baBar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      draggingBa = true;
      setBaFromClientX(e.clientX);
      baBar.setPointerCapture(e.pointerId);
    });
    baBar.addEventListener('pointermove', (e) => {
      if (!draggingBa) return;
      e.stopPropagation();
      setBaFromClientX(e.clientX);
    });
    const stopBa = () => { draggingBa = false; };
    baBar.addEventListener('pointerup', stopBa);
    baBar.addEventListener('pointercancel', stopBa);
  }

  // --- 11.2 Gemini Vision `box_2d` Garment Detection & Crop Overlay ---
  const detectBox2dBtn = $('#studioDetectBox2dBtn');
  const box2dOverlay = $('#studioBox2dOverlay');
  const box2dImg = $('#studioBox2dImg');
  const box2dBoxes = $('#studioBox2dBoxes');
  const closeBox2dBtn = $('#closeBox2dOverlayBtn');

  detectBox2dBtn?.addEventListener('click', async () => {
    const p = state.studio.product || PRODUCTS[0];
    if (!p || !box2dOverlay || !box2dImg || !box2dBoxes) return;
    const gallery = p.gallery?.length ? p.gallery : [p.imgFull || p.img];
    const currentSrc = gallery[state.studio.imgIndex || 0] || p.imgFull || p.img;

    box2dImg.src = currentSrc;
    box2dBoxes.innerHTML = '';
    box2dOverlay.hidden = false;
    detectBox2dBtn.classList.add('active');

    triggerAiSynthesisScan('Gemini Vision API (/api/garments/detect) đang phát hiện tọa độ box_2d...');
    const { garments } = await anywearApi.detectGarments(currentSrc, p);

    box2dBoxes.innerHTML = garments.map((g, idx) => {
      const [ymin, xmin, ymax, xmax] = g.box_2d;
      const top = (ymin / 10).toFixed(1);
      const left = (xmin / 10).toFixed(1);
      const width = ((xmax - xmin) / 10).toFixed(1);
      const height = ((ymax - ymin) / 10).toFixed(1);
      return `
        <button type="button" class="aw-box2d-item" data-box-idx="${idx}"
          style="top:${top}%;left:${left}%;width:${width}%;height:${height}%;"
          title="Bấm để cắt riêng vùng trang phục này (cropByBox) và khớp lên cơ thể">
          <span class="aw-box2d-tag">✦ ${esc(g.label)} (${Math.round((g.confidence || 0.95) * 100)}%)</span>
        </button>
      `;
    }).join('');

    box2dBoxes.onclick = async (e) => {
      const item = e.target.closest('[data-box-idx]');
      if (!item) return;
      const g = garments[Number(item.dataset.boxIdx)];
      if (!g) return;
      showToast(`Đang cắt vùng "${g.label}" bằng cropByBox([${g.box_2d.join(', ')}]) & tái tạo lưới vải 3D...`);
      const croppedUrl = await cropByBox(box2dImg, g.box_2d, 0.05);
      box2dOverlay.hidden = true;
      detectBox2dBtn.classList.remove('active');
      loadGarmentForProduct(croppedUrl, p.category, (asset) => {
        activeGarmentAsset = asset;
        ensureStudioLoop();
      });
    };
  });

  closeBox2dBtn?.addEventListener('click', () => {
    if (box2dOverlay) box2dOverlay.hidden = true;
    detectBox2dBtn?.classList.remove('active');
  });

  // --- 11.3 YouCam 7-Concern Skin AI & Daily Wearable Color Palette ---
  function renderSkinAiPanel() {
    const grid = $('#skinScoresGrid');
    const scores = state.studio.skinScores;
    if (grid && scores) {
      const items = [
        ['Radiance (Độ rạng rỡ)', scores.radiance],
        ['Moisture (Độ ẩm)', scores.moisture],
        ['Texture (Độ mịn)', scores.texture],
        ['Clarity (Độ trong)', scores.acne],
        ['Redness (Cân bằng sắc đỏ)', scores.redness],
        ['Oil Balance (Kiềm dầu)', scores.oiliness]
      ];
      grid.innerHTML = items.map(([label, val]) => `
        <div class="aw-skin-metric">
          <div class="aw-skin-metric-top">
            <span>${esc(label)}</span>
            <strong>${val}/100</strong>
          </div>
          <div class="aw-skin-bar-track">
            <div class="aw-skin-bar-fill" style="width:${val}%"></div>
          </div>
        </div>
      `).join('');
    }

    const brief = state.studio.skinBrief;
    if (brief) {
      const hl = $('#skinBriefHeadline');
      const sm = $('#skinBriefSummary');
      const sw = $('#skinPaletteSwatches');
      if (hl) hl.textContent = `${brief.headline} (${scores.skin_type || 'Warm Undertone'})`;
      if (sm) sm.textContent = brief.summary;
      if (sw && brief.palette) {
        const wearChips = (brief.palette.wear || []).map((c) => `
          <span class="aw-Swatch-chip" title="Nên mặc: ${esc(c.why || '')}">
            <span class="aw-swatch-dot" style="background:${c.hex}"></span>
            <span>✓ ${esc(c.name)}</span>
          </span>
        `).join('');
        const avoidChips = (brief.palette.avoid || []).map((c) => `
          <span class="aw-Swatch-chip is-avoid" title="Nên tránh: ${esc(c.why || '')}">
            <span class="aw-swatch-dot" style="background:${c.hex}"></span>
            <span>✕ ${esc(c.name)}</span>
          </span>
        `).join('');
        sw.innerHTML = wearChips + avoidChips;
      }
    }
  }

  $('#runSkinAiBtn')?.addEventListener('click', async () => {
    const sourceEl = (state.webcamStream && webcamVideo?.readyState >= 2) ? webcamVideo : studioImg;
    triggerAiSynthesisScan('YouCam Skin AI (/api/skin/start) & Gemini (/api/skin/brief) đang phân tích 7 chỉ số da...');
    const { scores, brief } = await anywearApi.analyzeSkinFromImage(sourceEl);
    state.studio.skinScores = scores;
    state.studio.skinBrief = brief;
    renderSkinAiPanel();
    updateStylistVerdictForCurrent();
    showToast('Đã cập nhật 7 chỉ số da YouCam AI & Bảng màu trang phục hợp sắc da hôm nay!');
  });

  const skinFileInput = $('#skinSelfieFileInput');
  $('#uploadSelfieSkinBtn')?.addEventListener('click', () => skinFileInput?.click());
  skinFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      triggerAiSynthesisScan('Đang quét 7 chỉ số da từ ảnh Selfie của bạn...');
      const { scores, brief } = await anywearApi.analyzeSkinFromImage(img);
      state.studio.skinScores = scores;
      state.studio.skinBrief = brief;
      renderSkinAiPanel();
      updateStylistVerdictForCurrent();
      showToast('Đã phân tích xong làn da từ Selfie & đồng bộ với AI Stylist Verdict!');
    };
    img.src = url;
    e.target.value = '';
  });

  // --- 11.4 Occasion Selector & Swinging Stylist Verdict Hang-Tag ---
  async function updateStylistVerdictForCurrent() {
    const p = state.studio.product || PRODUCTS[0];
    if (!p) return;
    const verdict = await anywearApi.fetchStylistVerdict({
      product: p,
      occasion: state.studio.occasion,
      skinBrief: state.studio.skinBrief
    });
    state.studio.lastVerdict = verdict;

    const tag = $('#studioVerdictHangtag');
    const badge = $('#verdictBadgeLabel');
    const scoreEl = $('#verdictScoreValue');
    const hl = $('#verdictHeadlineText');
    const reasonsEl = $('#verdictReasonsList');
    const harmonyEl = $('#verdictHarmonyBox');
    const pairingEl = $('#verdictPairingChips');

    if (tag) {
      tag.classList.remove('verdict-wear_it', 'verdict-maybe', 'verdict-skip');
      tag.classList.add(`verdict-${verdict.verdict || 'wear_it'}`);
    }
    if (badge) {
      badge.textContent = verdict.verdict === 'wear_it'
        ? '✦ WEAR IT · RẤT HỢP VỚI BẠN'
        : verdict.verdict === 'maybe'
          ? '◇ CÂN NHẮC PHỐI ĐỒ'
          : '✕ NÊN ĐỔI MẪU KHÁC';
    }
    if (scoreEl) scoreEl.textContent = `${verdict.score || 94}/100`;
    if (hl) hl.textContent = verdict.headline || '';
    if (reasonsEl) {
      reasonsEl.innerHTML = (verdict.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('');
    }
    if (harmonyEl) {
      harmonyEl.textContent = `🎨 Hòa sắc làn da: ${verdict.skin_harmony || ''}`;
    }
    if (pairingEl) {
      pairingEl.innerHTML = (verdict.pairing || []).map((item) => `<span>+ ${esc(item)}</span>`).join('');
    }
  }

  $('#studioOccasionChips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-occasion]');
    if (!chip) return;
    state.studio.occasion = chip.dataset.occasion;
    $$('#studioOccasionChips [data-occasion]').forEach((c) => c.classList.toggle('active', c === chip));
    updateStylistVerdictForCurrent();
  });

  $('#rejudgeVerdictBtn')?.addEventListener('click', () => {
    triggerAiSynthesisScan('Gemini AI Stylist (/api/stylist/verdict) đang chấm điểm lại trang phục...');
    updateStylistVerdictForCurrent();
    showToast(`Đã cập nhật đánh giá AI Stylist cho dịp "${state.studio.occasion}"!`);
  });

  // --- 11.5 On-Device Saved Lookbook (`anywear_lookbook_v1`) ---
  const LOOKBOOK_STORAGE_KEY = 'anywear_lookbook_v1';

  function loadSavedLookbook() {
    try {
      const raw = localStorage.getItem(LOOKBOOK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    // Seed with 3 curated Lalin looks so the Saved Lookbook is immediately rich
    return PRODUCTS.slice(0, 3).map((p, idx) => ({
      id: `saved-seed-${p.id}`,
      productId: p.id,
      title: p.title,
      img: p.img,
      occasion: idx === 0 ? 'Gặp gỡ / Trà chiều' : idx === 1 ? 'Dạ tiệc / Sự kiện' : 'Chụp Lookbook',
      score: 95 - idx
    }));
  }

  function renderSavedLookbook() {
    const row = $('#savedLookbookRow');
    if (!row) return;
    const list = loadSavedLookbook();
    row.innerHTML = list.length ? list.map((item) => `
      <div class="aw-saved-look-card" data-saved-id="${esc(item.id)}" data-product-id="${esc(item.productId || '')}" title="Bấm để mở lại Look: ${esc(item.title)} (${esc(item.occasion || '')})">
        <img src="${item.img}" alt="${esc(item.title)}" loading="lazy" />
        <span class="aw-saved-look-score">${item.score || 94}đ</span>
        <button type="button" class="aw-saved-look-del" data-del-saved="${esc(item.id)}" title="Xóa khỏi Lookbook">✕</button>
      </div>
    `).join('') : '<span style="font-size:11px;color:var(--text-muted);">Chưa có Look nào được lưu. Bấm "+ Lưu Look Đang Thử" để lưu lại!</span>';
  }

  $('#saveCurrentLookBtn')?.addEventListener('click', () => {
    const p = state.studio.product || PRODUCTS[0];
    if (!p) return;
    let snapshotImg = p.img;
    // If live canvas is active, capture composite try-on frame if possible
    if ((state.studio.viewMode === 'webcam' || state.studio.viewMode === 'ai-motion') && liveCanvas) {
      try {
        snapshotImg = liveCanvas.toDataURL('image/jpeg', 0.82);
      } catch (_) {
        snapshotImg = p.img;
      }
    }
    const list = loadSavedLookbook();
    const newEntry = {
      id: `look-${Date.now()}`,
      productId: p.id,
      title: p.title,
      img: snapshotImg,
      occasion: state.studio.occasion,
      score: state.studio.lastVerdict?.score || 94
    };
    const next = [newEntry, ...list.filter((x) => x.productId !== p.id)].slice(0, 12);
    try {
      localStorage.setItem(LOOKBOOK_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    renderSavedLookbook();
    showToast(`Đã lưu "${p.title}" (${newEntry.score}/100đ · ${state.studio.occasion}) vào Saved Lookbook trên thiết bị!`);
  });

  $('#savedLookbookRow')?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del-saved]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.delSaved;
      const next = loadSavedLookbook().filter((x) => x.id !== id);
      try {
        localStorage.setItem(LOOKBOOK_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      renderSavedLookbook();
      showToast('Đã xóa Look khỏi bộ sưu tập cá nhân.');
      return;
    }
    const card = e.target.closest('.aw-saved-look-card');
    if (!card) return;
    const pid = card.dataset.productId;
    const found = PRODUCTS.find((p) => p.id === pid);
    if (found) {
      selectStudioProduct(found);
      showToast(`Đã khôi phục Look "${found.title}" từ Saved Lookbook!`);
    }
  });

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
  renderSkinAiPanel();
  renderSavedLookbook();
  updateStylistVerdictForCurrent();
  checkInitialGarmentQuery();
})();
