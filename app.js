// ============================================================================
// ATELIER V.26 — LALIN.VN (BST) × STRESSMAMA.VN (VISUAL) × MINDE.VN (PRODUCT)
// Powered by ANYWEAR: LIVE VIRTUAL Interactive Engine
// Product data: lalin-data.js (scraped from https://lalin.vn/collections/ao-1)
// ============================================================================
(() => {
  'use strict';

  const PRODUCTS = Array.isArray(window.LALIN_PRODUCTS) ? window.LALIN_PRODUCTS : [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => `${Number(n || 0).toLocaleString('vi-VN')}₫`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isHoverDevice = window.matchMedia('(hover: hover)').matches;

  const CATEGORY_LABELS = {
    all: 'Tất cả',
    yem: 'Áo Yếm & Cổ Yếm',
    'to-lua': 'Áo Tơ Tằm & Lụa',
    gam: 'Gấm · Taffeta · Đính Kết',
    khoac: 'Áo Khoác & Choàng Ren',
    set: 'Set Kim Sa',
    'phu-kien': 'Cài Áo'
  };

  const SHORT_LABELS = { yem: 'YẾM', 'to-lua': 'TƠ TẰM', gam: 'GẤM', khoac: 'KHOÁC', set: 'SET', 'phu-kien': 'CÀI ÁO' };

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
    studio: { product: null, size: null, color: null, imgIndex: 0 },
    webcamStream: null
  };
  const PAGE_SIZE = 12;

  if (!PRODUCTS.length) {
    console.error('lalin-data.js chưa được tải — không có dữ liệu sản phẩm.');
  }

  // ==========================================================================
  // 0. TOAST
  // ==========================================================================
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toastNotification');
    if (!toast) return;
    toast.innerHTML = `<span style="color: var(--accent-jade); font-weight: 700;">✦ ANYWEAR:</span> ${esc(msg)}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  // ==========================================================================
  // 1. CUSTOM CURSOR & SCROLL PROGRESS
  // ==========================================================================
  const customCursor = $('#customCursor');
  if (customCursor && isHoverDevice) {
    document.addEventListener('mousemove', (e) => {
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
      // Interactive controls get the native cursor so they stay usable
      const onControl = e.target.closest('button, input, a, select');
      const target = onControl ? null : e.target.closest('[data-cursor]');
      if (target) {
        const label = target.getAttribute('data-cursor');
        customCursor.textContent = label;
        customCursor.classList.add('active');
        customCursor.classList.toggle('cursor-anywear', /AR/.test(label));
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
  // 2. SCROLL REVEAL (image wipe transitions while scrolling)
  // ==========================================================================
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');
        revealObserver.unobserve(el);
        // drop the translate helper afterwards so :hover transforms work again
        setTimeout(() => el.classList.remove('reveal'), 1000);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    : null;

  function observeReveal(el, delayIndex = 0) {
    el.classList.add('reveal', 'reveal-wipe');
    el.style.transitionDelay = `${Math.min(delayIndex, 6) * 70}ms`;
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('in-view');
  }

  $$('.section-header-bar, .ref-box, .red-villa-card').forEach((el) => {
    el.classList.add('reveal');
    if (revealObserver) revealObserver.observe(el); else el.classList.add('in-view');
  });

  // ==========================================================================
  // 3. HERO SPLIT-WIPE ANYWEAR MIRROR (uses real Lalin product)
  // ==========================================================================
  const heroProduct = PRODUCTS.find((p) => p.category === 'yem' && p.gallery.length > 2) || PRODUCTS[0];
  const heroStage = $('#heroInteractiveStage');
  const heroBase = $('.hero-layer-base');
  const heroAfter = $('#heroAfterImage');
  const heroSplitBar = $('#heroSplitBar');
  const heroReadout = $('#heroAngleReadout');

  if (heroProduct) {
    if (heroBase) { heroBase.src = heroProduct.imgFull; heroBase.alt = heroProduct.title; }
    if (heroAfter) { heroAfter.src = heroProduct.imgAltFull; heroAfter.alt = `${heroProduct.title} — góc Anywear`; }
    const heroName = $('#heroProductName');
    if (heroName) heroName.textContent = `${heroProduct.title} · ${fmt(heroProduct.price)}`;
  }

  if (heroStage && heroAfter && heroSplitBar) {
    const updateHeroSplit = (clientX) => {
      const rect = heroStage.getBoundingClientRect();
      const ratio = Math.max(6, Math.min(94, ((clientX - rect.left) / rect.width) * 100));
      heroAfter.style.clipPath = `inset(0 0 0 ${ratio}%)`;
      heroSplitBar.style.left = `${ratio}%`;
      if (heroReadout) heroReadout.textContent = `ANYWEAR SCAN ${Math.round(ratio)}% • FIT ${Math.round(95 + ratio / 25)}%`;
    };
    heroStage.addEventListener('mousemove', (e) => updateHeroSplit(e.clientX));
    heroStage.addEventListener('touchmove', (e) => { if (e.touches[0]) updateHeroSplit(e.touches[0].clientX); }, { passive: true });
  }

  $('#heroLaunchTryOnBtn')?.addEventListener('click', (e) => { e.stopPropagation(); openStudio(heroProduct); });
  $('#openGlobalAnywearBtn')?.addEventListener('click', () => openStudio(state.studio.product || heroProduct));

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
      <button class="filter-tab ${state.lookbookFilter === key ? 'active' : ''}" data-lookbook-filter="${key}">
        ${esc(label)}<span class="count">${lookbookItems(key).length}</span>
      </button>`).join('');
  }

  function renderLookbook() {
    if (!lookbookTrack) return;
    const items = lookbookItems(state.lookbookFilter);
    lookbookTrack.innerHTML = items.map((p, i) => `
      <article class="lookbook-card" data-id="${p.id}" data-cursor="DRAG ↔">
        <div class="lookbook-media-wrap">
          <img src="${p.img}" alt="${esc(p.title)}" class="lookbook-img-primary" loading="${i < 4 ? 'eager' : 'lazy'}" draggable="false" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="lookbook-img-secondary" loading="lazy" draggable="false" />
          <div class="anywear-card-overlay">
            <button class="anywear-live-pill" data-open-tryon="${p.id}"><span class="pulse-dot"></span> ANYWEAR: LIVE VIRTUAL</button>
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
              <button class="dock-mini-btn tryon-trigger" data-open-tryon="${p.id}">✦ Phòng Thử AR</button>
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
        // value 0 hands control back to the CSS hover-peel
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

    // Swallow the click that follows a drag so buttons/links aren't triggered accidentally
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
  // 5. STRESSMAMA VISUAL MANIFESTO (curtain wipe + scene switch)
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
      void img.offsetWidth; // restart animation
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
  // 6. PRODUCT SHOWROOM (Minde rent/buy model) — Anywear on every card
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
      return `<button class="filter-tab ${state.productFilter === key ? 'active' : ''}" data-product-filter="${key}">${esc(label)}<span class="count">${count}</span></button>`;
    }).join('');
  }

  function productCardHTML(p) {
    const rentMode = state.priceMode === 'rent';
    const sizes = p.sizes.length ? p.sizes.map((s) => `<span class="size-dot">${s}</span>`).join('') : '<span class="size-dot">Free size</span>';
    const colors = p.colors.length ? ` · ${esc(p.colors.join(' / '))}` : '';
    return `
      <article class="product-card" data-product-id="${p.id}">
        <div class="product-media" data-cursor="ANYWEAR AR">
          <img src="${p.img}" alt="${esc(p.title)}" class="product-img-main" loading="lazy" draggable="false" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="product-img-alt" loading="lazy" draggable="false" />
          <div class="card-virtual-mesh-overlay"></div>
          <div class="fabric-loupe"><span class="loupe-caption">X-RAY: ${esc(p.fabric)}</span></div>
          <div class="anywear-card-overlay">
            <button class="anywear-live-pill" data-tryon-id="${p.id}"><span class="pulse-dot"></span> ANYWEAR LIVE</button>
            <span class="chapter-tag">${esc(SHORT_LABELS[p.category] || '')}</span>
          </div>
          <div class="card-fit-telemetry">
            <span>✦ CHẤT LIỆU: ${esc(p.fabric)}</span>
            <span>✦ SIZE: ${p.sizes.join(' · ') || 'Free'}</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span class="angle-readout-label">GÓC NHÌN: TRƯỚC (0°)</span>
              <div class="dock-mode-btns">
                <button class="dock-mini-btn btn-toggle-loupe" title="Kính lúp soi chất vải">🔍 Soi Vải</button>
                <button class="dock-mini-btn btn-toggle-mesh" title="Lưới đo 3D">📐 Lưới 3D</button>
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
              <button class="btn-anywear-card" data-tryon-id="${p.id}"><span>✦</span> Thử Thực Tế Ảo</button>
              <button class="btn-book-item" data-book-id="${p.id}">${rentMode ? '+ Đặt Thuê' : '+ Mua Ngay'}</button>
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
      // lazy-load the hi-res image only when the loupe is used
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
  // 7. ANYWEAR: LIVE VIRTUAL FITTING ROOM
  // ==========================================================================
  const modal = $('#anywearModal');
  const stage = $('#studioVisualStage');
  const studioImg = $('#studioMainImage');
  const webcamVideo = $('#studioWebcamVideo');
  const arProjection = $('#arGarmentProjection');
  const arImg = $('#arGarmentImg');
  const inputHeight = $('#inputHeight');
  const inputWeight = $('#inputWeight');
  const inputWaist = $('#inputWaist');
  let lastFocused = null;

  function setStudioImage(idx) {
    const p = state.studio.product;
    if (!p) return;
    const gallery = p.gallery.length ? p.gallery : [p.img];
    state.studio.imgIndex = (idx + gallery.length) % gallery.length;
    const src = gallery[state.studio.imgIndex].replace('_grande.', '_1024x1024.');
    studioImg.src = src;
    arImg.src = src;
    $$('#studioThumbs img').forEach((t, i) => t.classList.toggle('active', i === state.studio.imgIndex));
  }

  function renderChips() {
    const p = state.studio.product;
    const sizeWrap = $('#studioSizeChips');
    const colorWrap = $('#studioColorChips');
    const rec = recommendSize();
    sizeWrap.innerHTML = p.sizes.map((s) => `
      <button class="chip ${s === state.studio.size ? 'active' : ''} ${s === rec ? 'recommended' : ''}" data-size="${s}">${s}</button>`).join('');
    colorWrap.innerHTML = p.colors.map((c) => `
      <button class="chip ${c === state.studio.color ? 'active' : ''}" data-color="${esc(c)}">${esc(c)}</button>`).join('');
  }

  function openStudio(product) {
    if (!product || !modal) return;
    state.studio.product = product;
    state.studio.color = product.colors[0] || '';
    state.studio.size = null;

    $('#studioProductCategory').textContent = `LALIN.VN · ${CATEGORY_LABELS[product.category] || ''}`;
    $('#studioProductTitle').textContent = product.title;
    $('#studioRentPrice').textContent = fmt(product.rent);
    $('#studioBuyPrice').textContent = fmt(product.price);
    $('#studioLalinLink').href = product.url;
    $('#studioTelemetryText').textContent = `ANYWEAR SIMULATION · ${product.fabric.toUpperCase()}`;
    $('#studioThumbs').innerHTML = product.gallery.map((src, i) =>
      `<img src="${src}" alt="Ảnh ${i + 1}" data-thumb="${i}" loading="lazy" />`).join('');

    setStudioImage(0);
    updateBodyFit();
    state.studio.size = recommendSize();
    renderChips();

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('#closeAnywearModalBtn')?.focus();
  }

  function closeStudio() {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    stopWebcam();
    if (!$('#bagDrawer')?.classList.contains('open')) document.body.classList.remove('modal-open');
    lastFocused?.focus?.();
  }

  $('#closeAnywearModalBtn')?.addEventListener('click', closeStudio);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeStudio(); });

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

  $('#studioFlipAngleBtn')?.addEventListener('click', () => setStudioImage(state.studio.imgIndex + 1));

  $('#studioToggleMeshBtn')?.addEventListener('click', (e) => {
    const guides = $('#arBodyGuides');
    if (!guides) return;
    const hidden = guides.style.opacity === '0';
    guides.style.opacity = hidden ? '1' : '0';
    e.currentTarget.classList.toggle('active', !hidden);
  });

  // Lalin size chart (approx.): S ≈ ngực 82–86 / eo 64–66, M ≈ 86–90 / 68–70, L ≈ 90–94 / 72–74
  function recommendSize() {
    const p = state.studio.product;
    const waist = Number(inputWaist?.value || 64);
    const weight = Number(inputWeight?.value || 50);
    let size = 'S';
    if (waist > 70 || weight > 56) size = 'L';
    else if (waist > 66 || weight > 51) size = 'M';
    if (!p || !p.sizes.length) return null;
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
    $('#studioRecommendedSize').innerHTML = !p || !p.sizes.length
      ? 'Phụ kiện: <strong>Free size</strong>'
      : outOfRange
        ? `Khuyên dùng: <strong>Size ${rec} + chỉnh sửa / may đo riêng</strong>`
        : `Khuyên dùng: <strong>Size ${rec}</strong> (bảng size Lalin)`;

    // Proportional (uniform) preview — no more stretched/distorted model image
    const scale = 1 + (h - 163) * 0.002;
    studioImg.style.transform = `scale(${scale.toFixed(3)})`;
    if (arProjection) arProjection.style.setProperty('--fit-scale', (1 + (waist - 64) * 0.008).toFixed(3));
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
    studioImg.style.filter = filter;
    if (webcamVideo) webcamVideo.style.filter = filter;
    $('#lightingModeLabel').textContent = label;
  }));

  // --- Webcam AR mirror -----------------------------------------------------
  const modeAvatarBtn = $('#modeAvatarBtn');
  const modeWebcamBtn = $('#modeWebcamBtn');
  const arPos = { x: 0, y: 0, scale: 1 };

  function applyArTransform() {
    arProjection.style.transform = `translate(${arPos.x}px, ${arPos.y}px) scale(calc(${arPos.scale} * var(--fit-scale, 1)))`;
  }

  function showArOverlay(label) {
    arProjection.classList.add('visible');
    arProjection.style.pointerEvents = 'auto';
    arProjection.style.cursor = 'grab';
    applyArTransform();
    modeWebcamBtn.classList.add('active');
    modeAvatarBtn.classList.remove('active');
    $('#studioStatusLabel').textContent = label;
  }

  async function startWebcam() {
    if (state.webcamStream) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      showArOverlay('MÔ PHỎNG AR (TRÌNH DUYỆT KHÔNG HỖ TRỢ CAMERA)');
      showToast('Camera chỉ hoạt động trên HTTPS hoặc localhost. Đang dùng chế độ mô phỏng AR.');
      return;
    }
    try {
      state.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (!modal.classList.contains('open')) { stopWebcam(); return; } // modal closed while waiting for permission
      webcamVideo.srcObject = state.webcamStream;
      webcamVideo.classList.add('active');
      stage.classList.add('webcam-on');
      showArOverlay('CAMERA AR TRỰC TIẾP • KÉO ẢNH ÁO ĐỂ KHỚP DÁNG');
      showToast('Đã bật camera. Kéo để di chuyển áo, cuộn chuột để phóng to/thu nhỏ.');
    } catch (err) {
      showArOverlay('MÔ PHỎNG AR (CHƯA CẤP QUYỀN CAMERA)');
      showToast('Không truy cập được camera — đang dùng chế độ AR mô phỏng.');
    }
  }

  function stopWebcam() {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach((t) => t.stop());
      state.webcamStream = null;
    }
    if (webcamVideo) { webcamVideo.srcObject = null; webcamVideo.classList.remove('active'); }
    stage?.classList.remove('webcam-on');
    if (arProjection) { arProjection.classList.remove('visible'); arProjection.style.pointerEvents = 'none'; }
    modeAvatarBtn?.classList.add('active');
    modeWebcamBtn?.classList.remove('active');
    const label = $('#studioStatusLabel');
    if (label) label.textContent = 'ANYWEAR LIVE VIRTUAL • AVATAR TƯƠNG TÁC';
  }

  modeWebcamBtn?.addEventListener('click', startWebcam);
  modeAvatarBtn?.addEventListener('click', stopWebcam);

  if (arProjection) {
    let dragging = false; let sx = 0; let sy = 0; let ox = 0; let oy = 0;
    arProjection.addEventListener('pointerdown', (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY; ox = arPos.x; oy = arPos.y;
      arProjection.setPointerCapture(e.pointerId);
      arProjection.style.cursor = 'grabbing';
    });
    arProjection.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      arPos.x = ox + (e.clientX - sx);
      arPos.y = oy + (e.clientY - sy);
      applyArTransform();
    });
    const end = () => { dragging = false; arProjection.style.cursor = 'grab'; };
    arProjection.addEventListener('pointerup', end);
    arProjection.addEventListener('pointercancel', end);
    arProjection.addEventListener('wheel', (e) => {
      e.preventDefault();
      arPos.scale = Math.max(0.5, Math.min(2.2, arPos.scale - e.deltaY * 0.001));
      applyArTransform();
    }, { passive: false });
  }

  $('#studioConfirmRentBtn')?.addEventListener('click', () => studioAdd('rent'));
  $('#studioConfirmBuyBtn')?.addEventListener('click', () => studioAdd('buy'));

  function studioAdd(mode) {
    const p = state.studio.product;
    if (!p) return;
    if (p.sizes.length && !state.studio.size) { showToast('Vui lòng chọn size trước.'); return; }
    addToBag(p, mode, state.studio.size || 'Free', state.studio.color);
    closeStudio();
  }

  // ==========================================================================
  // 8. BAG DRAWER
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
        <button class="remove-btn" data-remove="${idx}" title="Xóa">✕</button>
      </div>`).join('') : '<p class="bag-empty">Chưa có sản phẩm. Hãy thử đồ bằng Anywear và thêm vào giỏ nhé!</p>';
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
    if (modal?.classList.contains('open')) closeStudio();
    else if (bagDrawer?.classList.contains('open')) closeBag();
  });

  // Stop the camera if the tab is hidden / page unloaded
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopWebcam(); });
  window.addEventListener('pagehide', stopWebcam);

  // ==========================================================================
  // INIT
  // ==========================================================================
  renderLookbookFilters();
  renderLookbook();
  renderProductFilters();
  renderProducts();
  renderBag();
})();
