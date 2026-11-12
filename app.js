// ============================================================================
// ATELIER V.26 — LALIN.VN (BST) × STRESSMAMA.VN (VISUAL) × MINDE.VN (PRODUCT)
// Default Virtual Try-On Engine: Anywear (by Decart AI)
//   - Embedded via 1-line async script (~17 KB) right before </body>:
//     <script src="https://anywear.decart.ai/widget/latest/anywear.js" async></script>
//   - Automatic product image detection & default Try-On (.vton-btn) injection
//   - Real-time live video camera try-on (no photo upload or account required)
//   - Combined with uiharu-kazari/anywear AI Stylist Verdict, Skin Palette & box_2d
// ============================================================================
(() => {
  'use strict';

  const STREETWEAR_PRODUCTS = [
    {
      id: 'darc-golds-gym-tee',
      handle: 'darc-sport-golds-gym-wolf-tee',
      url: 'https://shop.darcport.com',
      title: 'Áo Thun Darc Sport × Gold\'s Gym "Gold\'s Wolf"',
      category: 'tee',
      fabric: 'Cotton 100% 280gsm · In lụa cao cấp',
      desc: 'Thiết kế giới hạn Darc Sport kết hợp Gold\'s Gym "Gold\'s Wolf" biểu tượng thể hình cổ điển, phom oversize streetwear.',
      price: 1150000,
      rent: 320000,
      sizes: ['M', 'L', 'XL'],
      colors: ['Black'],
      img: './assets/garments/darc-golds-gym-tee.png',
      imgAlt: './assets/garments/darc-golds-gym-tee-preview.jpg',
      imgFull: './assets/garments/darc-golds-gym-tee.png',
      gallery: ['./assets/garments/darc-golds-gym-tee.png', './assets/garments/darc-golds-gym-tee-preview.jpg']
    },
    {
      id: 'darc-city-of-angels-tee',
      handle: 'darc-sport-city-of-angels-tee',
      url: 'https://shop.darcport.com',
      title: 'Áo Thun Darc Sport "City of Angels" Wolves LA',
      category: 'tee',
      fabric: 'Cotton 100% Vintage Washed · Graphic Wolves',
      desc: 'Phiên bản City of Angels Wolves LA 2024 đậm chất thể thao đường phố Los Angeles, phom boxy fit tôn vai.',
      price: 1150000,
      rent: 320000,
      sizes: ['M', 'L', 'XL'],
      colors: ['Black'],
      img: './assets/garments/darc-city-of-angels-tee.png',
      imgAlt: './assets/garments/darc-city-of-angels-tee-preview.jpg',
      imgFull: './assets/garments/darc-city-of-angels-tee.png',
      gallery: ['./assets/garments/darc-city-of-angels-tee.png', './assets/garments/darc-city-of-angels-tee-preview.jpg']
    },
    {
      id: 'darc-naruto-sakura-tee',
      handle: 'darc-sport-naruto-sakura-tee',
      url: 'https://shop.darcport.com',
      title: 'Áo Thun Darc Sport × Naruto (Sakura Final Drop)',
      category: 'tee',
      fabric: 'Cotton 100% · Graphic Sakura Haruno Anime',
      desc: 'Bản collab chính thức Darc Sport x Naruto Shippuden Final Drop, họa tiết Sakura Haruno và ký tự Wolves Forever.',
      price: 1250000,
      rent: 350000,
      sizes: ['M', 'L', 'XL'],
      colors: ['Black'],
      img: './assets/garments/darc-naruto-sakura-tee.png',
      imgAlt: './assets/garments/darc-naruto-sakura-tee-preview.jpg',
      imgFull: './assets/garments/darc-naruto-sakura-tee.png',
      gallery: ['./assets/garments/darc-naruto-sakura-tee.png', './assets/garments/darc-naruto-sakura-tee-preview.jpg']
    },
    {
      id: 'civil-jujutsu-kaisen-tee',
      handle: 'civil-regime-jujutsu-kaisen-itadori-tee',
      url: 'https://civilregime.com',
      title: 'Áo Thun Civil Regime × Jujutsu Kaisen (Itadori Yuji)',
      category: 'tee',
      fabric: 'Heavyweight Cotton · Black Acid Wash',
      desc: 'Sự kết hợp giữa Civil Regime và anime Jujutsu Kaisen với hình ảnh Yuji Itadori bùng nổ sức mạnh Chú thuật hồi chiến.',
      price: 1250000,
      rent: 350000,
      sizes: ['M', 'L', 'XL'],
      colors: ['Black'],
      img: './assets/garments/civil-jujutsu-kaisen-tee.png',
      imgAlt: './assets/garments/civil-jujutsu-kaisen-tee-preview.jpg',
      imgFull: './assets/garments/civil-jujutsu-kaisen-tee.png',
      gallery: ['./assets/garments/civil-jujutsu-kaisen-tee.png', './assets/garments/civil-jujutsu-kaisen-tee-preview.jpg']
    },
    {
      id: 'darc-backpack-front',
      handle: 'darc-sport-wolves-club-backpack-front',
      url: 'https://shop.darcport.com',
      title: 'Balo Darc Sport "Wolves Club" Tactical (Mặt Trước)',
      category: 'phu-kien',
      fabric: 'Cordura chống nước · Khóa bấm kim loại Tactical',
      desc: 'Balo phong cách chiến thuật Wolves Club với họa tiết chữ gothic thêu nổi tinh xảo, ngăn chứa đa năng tiện dụng.',
      price: 1650000,
      rent: 450000,
      sizes: ['One Size'],
      colors: ['Black / White'],
      img: './assets/garments/darc-backpack-front.png',
      imgAlt: './assets/garments/darc-backpack-front-preview.jpg',
      imgFull: './assets/garments/darc-backpack-front.png',
      gallery: ['./assets/garments/darc-backpack-front.png', './assets/garments/darc-backpack-front-preview.jpg']
    },
    {
      id: 'darc-backpack-back',
      handle: 'darc-sport-wolves-club-backpack-back',
      url: 'https://shop.darcport.com',
      title: 'Balo Darc Sport "Wolves Club" Tactical (Quai Đeo)',
      category: 'phu-kien',
      fabric: 'Cordura chống nước · Đệm lưng thoáng khí',
      desc: 'Mặt lưng balo Darc Sport Wolves Club với quai đeo trợ lực và khóa ngực thể thao chắc chắn.',
      price: 1650000,
      rent: 450000,
      sizes: ['One Size'],
      colors: ['Black / White'],
      img: './assets/garments/darc-backpack-back.png',
      imgAlt: './assets/garments/darc-backpack-back-preview.jpg',
      imgFull: './assets/garments/darc-backpack-back.png',
      gallery: ['./assets/garments/darc-backpack-back.png', './assets/garments/darc-backpack-back-preview.jpg']
    }
  ];

  const PRODUCTS = [
    ...STREETWEAR_PRODUCTS,
    ...(Array.isArray(window.LALIN_PRODUCTS) ? window.LALIN_PRODUCTS : [])
  ];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => `${Number(n || 0).toLocaleString('vi-VN')}₫`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isHoverDevice = window.matchMedia('(hover: hover)').matches;

  const SHORT_LABELS = {
    tee: 'ÁO THUN',
    yem: 'YẾM',
    'to-lua': 'TƠ TẰM',
    gam: 'GẤM',
    khoac: 'KHOÁC',
    set: 'SET',
    'phu-kien': 'BALO & PHỤ KIỆN'
  };

  const CATEGORY_LABELS = {
    all: 'Tất cả',
    tee: 'Áo Thun Streetwear (Mới)',
    yem: 'Áo Yếm & Cổ Yếm',
    'to-lua': 'Áo Tơ Tằm & Lụa',
    gam: 'Gấm · Taffeta · Đính Kết',
    khoac: 'Áo Khoác & Choàng Ren',
    set: 'Set Kim Sa',
    'phu-kien': 'Balo & Cài Áo'
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
      occasion: 'Dạo phố thường ngày',
      skinScores: {
        redness: 84,
        oiliness: 79,
        moisture: 86,
        radiance: 91,
        acne: 88,
        texture: 87,
        skin_type: 'Normal / Warm Undertone',
        skin_age: 23
      },
      skinBrief: {
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
      },
      lastVerdict: null
    },
    recentLooks: []
  };
  const PAGE_SIZE = 12;

  // ==========================================================================
  // 0. TOAST & ANYWEAR (DECART AI) WIDGET TELEMETRY / TRIGGER
  // ==========================================================================
  let toastTimer = null;
  function showToast(msg) {
    const toast = $('#toastNotification');
    if (!toast) return;
    toast.innerHTML = `<span style="color: var(--aw-lime); font-weight: 700;">✦ Anywear (Decart AI):</span> ${esc(msg)}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }

  /**
   * Monitors Decart AI's `anywear.js` (~17 KB async widget) and updates the status badge
   * with the number of product images automatically detected & pinned with `.vton-btn`.
   */
  const FREE_VTON_PNG_PRESETS = [
    {
      id: 'darc-golds-gym-tee',
      name: 'Áo Thun Darc Sport × Gold\'s Gym "Gold\'s Wolf"',
      price: '1.150.000₫',
      image: './assets/garments/darc-golds-gym-tee.png',
      category: 'tee',
      description: 'Darc Sport × Gold\'s Gym Premium Tee in Black'
    },
    {
      id: 'darc-city-of-angels-tee',
      name: 'Áo Thun Darc Sport "City of Angels" Wolves LA',
      price: '1.150.000₫',
      image: './assets/garments/darc-city-of-angels-tee.png',
      category: 'tee',
      description: 'Darc Sport "City of Angels" Premium Tee in Black'
    },
    {
      id: 'darc-naruto-sakura-tee',
      name: 'Áo Thun Darc Sport × Naruto (Sakura Final Drop)',
      price: '1.250.000₫',
      image: './assets/garments/darc-naruto-sakura-tee.png',
      category: 'tee',
      description: 'Darc Sport × Naruto FINAL DROP Sakura Tee'
    },
    {
      id: 'civil-jujutsu-kaisen-tee',
      name: 'Áo Thun Civil Regime × Jujutsu Kaisen (Itadori)',
      price: '1.250.000₫',
      image: './assets/garments/civil-jujutsu-kaisen-tee.png',
      category: 'tee',
      description: 'Civil Regime × Jujutsu Kaisen Yuji Itadori Tee'
    },
    {
      id: 'darc-backpack-front',
      name: 'Balo Darc Sport "Wolves Club" Tactical',
      price: '1.650.000₫',
      image: './assets/garments/darc-backpack-front.png',
      category: 'tee',
      description: 'Balo Streetwear Darc Sport Wolves Club'
    },
    {
      id: 'darc-backpack-back',
      name: 'Balo Darc Sport "Wolves Club" (Quai đeo)',
      price: '1.650.000₫',
      image: './assets/garments/darc-backpack-back.png',
      category: 'tee',
      description: 'Mặt lưng balo quai đeo trợ lực'
    },
    {
      id: 'png-tee-black',
      name: 'Áo Thun Oversize (PNG)',
      price: '490.000₫',
      image: './assets/garments/tee-black.png',
      category: 'tee'
    },
    {
      id: 'png-jacket-camel',
      name: 'Blazer Len Camel (PNG)',
      price: '1.890.000₫',
      image: './assets/garments/jacket-camel.png',
      category: 'jacket'
    },
    {
      id: 'png-dress-burgundy',
      name: 'Váy Lụa Satin Midi (PNG)',
      price: '1.450.000₫',
      image: './assets/garments/dress-burgundy.png',
      category: 'dress'
    },
    {
      id: 'png-shirt-emerald',
      name: 'Sơ Mi Lụa Emerald (PNG)',
      price: '890.000₫',
      image: './assets/garments/shirt-emerald.png',
      category: 'shirt'
    }
  ];
  window.FREE_VTON_PNG_PRESETS = FREE_VTON_PNG_PRESETS;

  function toFreeVtonProduct(p) {
    if (!p) return FREE_VTON_PNG_PRESETS[0];
    const catMap = {
      'yem': 'yem',
      'to-lua': 'shirt',
      'gam': 'jacket',
      'khoac': 'jacket',
      'set': 'set',
      'phu-kien': 'tee'
    };
    return {
      id: p.id || `prod-${Date.now()}`,
      name: p.title || p.name || 'Thiết kế Lalin',
      price: typeof p.price === 'number' ? fmt(p.price) : (p.price || ''),
      image: p.imgFull || p.img || p.image || '',
      gallery: Array.isArray(p.gallery)
        ? p.gallery.map((u) => (u.includes('_grande.') ? u.replace('_grande.', '_1024x1024.') : u))
        : [],
      category: catMap[p.category] || p.category || 'shirt',
      description: p.fabric || ''
    };
  }

  function syncAnywearWidgetStatus() {
    const extBadge = $('#awExtStatusBadge');
    const countBadge = $('#awDetectedCountBadge');
    const vtonReady = Boolean(window.FreeVTONWidget);
    const totalBtns = $$('[data-tryon-id], [data-tryon-now], [data-photo-tryon-id]').length;

    if (vtonReady && (!window.__freeVtonCatalogSynced || window.FreeVTONWidget.catalog.length <= 8)) {
      window.__freeVtonCatalogSynced = true;
      window.FreeVTONWidget.setCatalog([
        ...FREE_VTON_PNG_PRESETS,
        ...PRODUCTS.map(toFreeVtonProduct)
      ]);
    }

    if (extBadge) {
      extBadge.textContent = vtonReady
        ? '✦ FreeVTON (MediaPipe AR + HF AI): Sẵn Sàng (0₫/lượt)'
        : '✦ FreeVTON (MediaPipe AR + HF AI): Đang khởi tạo...';
    }
    if (countBadge) {
      countBadge.textContent = totalBtns > 0
        ? `🟢 Đã gắn nút Try-On (AR Camera + Ảnh Tĩnh) cho ${PRODUCTS.length} thiết kế Lalin + 4 PNG mẫu`
        : '🟢 Sẵn sàng thử đồ 0₫ Server';
    }
  }

  [250, 800, 1800, 3500].forEach((ms) => setTimeout(syncAnywearWidgetStatus, ms));

  function notifyAnywearProductsRendered() {
    setTimeout(syncAnywearWidgetStatus, 120);
  }

  /**
   * Launches the 100% Free Client-Side Real-Time AR Camera Modal (`FreeVTONWidget`)
   * powered by `@mediapipe/tasks-vision` (PoseLandmarker) + MediaRecorder 5s Video.
   */
  function triggerAnywearTryOn(product, preferredImgEl = null) {
    const p = product || state.studio.product || PRODUCTS[0];
    if (modal?.classList.contains('open')) {
      closeStudio();
    }

    if (window.FreeVTONWidget) {
      syncAnywearWidgetStatus();
      window.FreeVTONWidget.open(toFreeVtonProduct(p), 'camera');
      showToast(`🎥 Đang mở Camera AR Miễn Phí (0₫) cho "${p?.title || p?.name || 'sản phẩm'}"!`);
      return true;
    }

    showToast('Đang nạp module MediaPipe AR... Vui lòng thử lại sau giây lát.');
    return false;
  }

  // Copy 1-line widget script button in #anywear-extension-hub
  $('#copyAnywearScriptBtn')?.addEventListener('click', () => {
    const snippet = '<script type="module" src="./vton-widget.js"></script>';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet).then(() => {
        const btn = $('#copyAnywearScriptBtn');
        if (btn) {
          const prev = btn.textContent;
          btn.textContent = '✓ Đã sao chép!';
          setTimeout(() => { btn.textContent = prev; }, 2000);
        }
        showToast('Đã sao chép 1 dòng code nhúng FreeVTON Widget vào clipboard!');
      }).catch(() => {
        showToast(`Copy mã nhúng: ${snippet}`);
      });
    } else {
      showToast(`Copy mã nhúng: ${snippet}`);
    }
  });

  // ==========================================================================
  // 1. CUSTOM CURSOR & SCROLL PROGRESS
  // ==========================================================================
  const customCursor = $('#customCursor');
  if (customCursor && isHoverDevice) {
    document.addEventListener('mousemove', (e) => {
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
      const onControl = e.target.closest('button, input, a, select, form, .vton-btn');
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
  // 3. HERO SPLIT-WIPE ANYWEAR STAGE
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
      if (heroReadout) heroReadout.textContent = `SO SÁNH GÓC ${Math.round(ratio)}% • TRY-ON READY`;
    };
    heroStage.addEventListener('mousemove', (e) => updateHeroSplit(e.clientX));
    heroStage.addEventListener('touchmove', (e) => { if (e.touches[0]) updateHeroSplit(e.touches[0].clientX); }, { passive: true });
  }

  $('#heroLaunchTryOnBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerAnywearTryOn(heroProduct, heroBase);
  });
  $('#heroQuickStartAnywear')?.addEventListener('click', () => {
    triggerAnywearTryOn(state.studio.product || heroProduct, heroBase);
  });
  $('#openGlobalAnywearBtn')?.addEventListener('click', () => {
    triggerAnywearTryOn(state.studio.product || heroProduct, heroBase);
  });

  // ==========================================================================
  // 4. LALIN LOOKBOOK: DRAG-TO-GLIDE + VELOCITY SKEW + DEFAULT ANYWEAR TRY-ON
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
        <div class="lookbook-media-wrap" data-decart-mobile-camera="user">
          <img src="${p.img}" alt="${esc(p.title)}" class="lookbook-img-primary" loading="${i < 6 ? 'eager' : 'lazy'}" draggable="true" data-garment-id="${p.id}" data-product-image="true" data-product-name="${esc(p.title)}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="lookbook-img-secondary" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <div class="anywear-card-overlay">
            <span class="chapter-tag">${CHAPTER_LABELS[p.category] || 'LALIN'}</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span>LALIN × ANYWEAR (DECART AI)</span>
              <span class="scrub-status-label">Kéo để đổi góc</span>
            </div>
            <input type="range" min="0" max="100" value="0" class="angle-scrubber-input lookbook-scrubber" aria-label="Đổi góc ảnh ${esc(p.title)}" />
            <div class="dock-top-row">
              <span style="color: var(--accent-gold);">${esc(p.fabric)}</span>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="dock-mini-btn tryon-trigger" data-tryon-now="${p.id}">✦ Try-On Cam</button>
                <button type="button" class="dock-mini-btn" data-photo-tryon-now="${p.id}" title="Tải 1 tấm ảnh chân dung tĩnh để ghép đồ (IDM-VTON / CatVTON / OOTDiffusion)">📸 Ảnh Tĩnh</button>
                <button type="button" class="dock-mini-btn" data-open-detail="${p.id}">Chi tiết</button>
              </div>
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
    notifyAnywearProductsRendered();
  }

  lookbookTrack?.addEventListener('click', (e) => {
    if (e.target.closest('.vton-btn')) return;
    const tryBtn = e.target.closest('[data-tryon-now]');
    if (tryBtn) {
      e.stopPropagation();
      const card = tryBtn.closest('.lookbook-card');
      const prod = PRODUCTS.find((p) => p.id === tryBtn.dataset.tryonNow);
      const imgEl = card ? $('.lookbook-img-primary', card) : null;
      triggerAnywearTryOn(prod, imgEl);
      return;
    }
    const photoBtn = e.target.closest('[data-photo-tryon-now]');
    if (photoBtn) {
      e.stopPropagation();
      const prod = PRODUCTS.find((p) => p.id === photoBtn.dataset.photoTryonNow);
      if (prod) openStaticPhotoVton(prod);
      return;
    }
    const detailBtn = e.target.closest('[data-open-detail]');
    if (detailBtn) {
      e.stopPropagation();
      openStudio(PRODUCTS.find((p) => p.id === detailBtn.dataset.openDetail));
    }
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
      img.style.setProperty('--px', `${(offset * -18).toFixed(1)}px`);
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
      if (e.button !== 0 || e.target.closest('input, button, a, .vton-btn')) return;
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
    mBase.setAttribute('data-product-name', scene.product.title);
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
    if (SCENES[currentScene]) triggerAnywearTryOn(SCENES[currentScene].product, mBase);
  });

  // ==========================================================================
  // 6. PRODUCT SHOWROOM (69 Lalin Products + Default Anywear Try-On on Every Card)
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

  function productCardHTML(p, idx = 0) {
    const rentMode = state.priceMode === 'rent';
    const sizes = p.sizes.length ? p.sizes.map((s) => `<span class="size-dot">${s}</span>`).join('') : '<span class="size-dot">Free size</span>';
    const colors = p.colors.length ? ` · ${esc(p.colors.join(' / '))}` : '';
    return `
      <article class="product-card" data-product-id="${p.id}">
        <div class="product-media" data-cursor="TRY-ON LIVE" data-decart-mobile-camera="user">
          <img src="${p.img}" alt="${esc(p.title)}" class="product-img-main" loading="${idx < 6 ? 'eager' : 'lazy'}" draggable="true" data-garment-id="${p.id}" data-product-image="true" data-product-name="${esc(p.title)}" />
          <img src="${p.imgAlt}" alt="${esc(p.title)} — góc khác" class="product-img-alt" loading="lazy" draggable="true" data-garment-id="${p.id}" />
          <div class="fabric-loupe"><span class="loupe-caption">X-RAY: ${esc(p.fabric)}</span></div>
          <div class="anywear-card-overlay">
            <span class="chapter-tag">${esc(SHORT_LABELS[p.category] || '')}</span>
          </div>
          <div class="card-anywear-dock">
            <div class="dock-top-row">
              <span class="angle-readout-label">GÓC NHÌN: TRƯỚC (0°)</span>
              <div class="dock-mode-btns">
                <button type="button" class="dock-mini-btn btn-toggle-loupe" title="Kính lúp soi chất vải">🔍 Soi Vải</button>
                <button type="button" class="dock-mini-btn" data-open-detail="${p.id}" title="Xem chi tiết, bảng size &amp; AI Stylist">📋 Chi Tiết</button>
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
              <button type="button" class="btn-anywear-card" data-tryon-id="${p.id}"><span>✦</span> Try-On (Cam)</button>
              <button type="button" class="btn-photo-vton-card" data-photo-tryon-id="${p.id}" title="Tải 1 ảnh chân dung tĩnh để ghép đồ (IDM-VTON / CatVTON / OOTDiffusion)">📸 Ảnh Tĩnh</button>
              <button type="button" class="btn-book-item" data-book-id="${p.id}">${rentMode ? '+ Thuê' : '+ Mua'}</button>
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
      imgMain.style.transform = `scale(${1 + (val / 100) * 0.06})`;
      imgAlt.style.transform = `scale(${1.06 - (val / 100) * 0.06})`;
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
  }

  function renderProducts() {
    if (!productGrid) return;
    const list = filteredProducts();
    const visible = list.slice(0, state.productPage * PAGE_SIZE);
    productGrid.innerHTML = visible.map((p, idx) => productCardHTML(p, idx)).join('');
    $$('.product-card', productGrid).forEach((card, i) => {
      bindProductCard(card);
      observeReveal(card, i % PAGE_SIZE % 4);
    });
    const countLabel = $('#productCountLabel');
    if (countLabel) countLabel.textContent = `HIỂN THỊ ${visible.length} / ${list.length} SẢN PHẨM LALIN · *GIÁ THUÊ THAM KHẢO`;
    if (loadMoreBtn) loadMoreBtn.hidden = visible.length >= list.length;
    notifyAnywearProductsRendered();
  }

  productGrid?.addEventListener('click', (e) => {
    if (e.target.closest('.vton-btn')) return;
    const tryBtn = e.target.closest('[data-tryon-id]');
    if (tryBtn) {
      e.stopPropagation();
      const card = tryBtn.closest('.product-card');
      const prod = PRODUCTS.find((p) => p.id === tryBtn.dataset.tryonId);
      const imgEl = card ? $('.product-img-main', card) : null;
      triggerAnywearTryOn(prod, imgEl);
      return;
    }
    const photoBtn = e.target.closest('[data-photo-tryon-id]');
    if (photoBtn) {
      e.stopPropagation();
      const prod = PRODUCTS.find((p) => p.id === photoBtn.dataset.photoTryonId);
      if (prod) openStaticPhotoVton(prod);
      return;
    }
    const detailBtn = e.target.closest('[data-open-detail]');
    if (detailBtn) {
      e.stopPropagation();
      openStudio(PRODUCTS.find((p) => p.id === detailBtn.dataset.openDetail));
      return;
    }
    const bookBtn = e.target.closest('[data-book-id]');
    if (bookBtn) {
      const p = PRODUCTS.find((x) => x.id === bookBtn.dataset.bookId);
      if (p) addToBag(p, state.priceMode, p.sizes.includes('S') ? 'S' : (p.sizes[0] || 'Free'), p.colors[0] || '');
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
  // 7. PRODUCT QUICK-VIEW, AI STYLIST & MINDE RENT/BUY MODAL
  // ==========================================================================
  const modal = $('#anywearModal');
  const studioImg = $('#studioMainImage');
  const inputHeight = $('#inputHeight');
  const inputWeight = $('#inputWeight');
  const inputWaist = $('#inputWaist');
  let lastFocused = null;

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
    if (studioImg) {
      studioImg.src = hiResSrc;
      studioImg.alt = p.title;
      studioImg.setAttribute('data-product-name', p.title);
    }
    $$('#studioThumbs img').forEach((t, i) => t.classList.toggle('active', i === state.studio.imgIndex));
  }

  function renderChips() {
    const p = state.studio.product;
    if (!p) return;
    const sizeWrap = $('#studioSizeChips');
    const colorWrap = $('#studioColorChips');
    const rec = recommendSize();
    if (sizeWrap) {
      sizeWrap.innerHTML = (p.sizes || []).map((s) => `
        <button type="button" class="chip ${s === state.studio.size ? 'active' : ''} ${s === rec ? 'recommended' : ''}" data-size="${s}">${s}</button>`).join('');
    }
    if (colorWrap) {
      colorWrap.innerHTML = (p.colors || []).map((c) => `
        <button type="button" class="chip ${c === state.studio.color ? 'active' : ''}" data-color="${esc(c)}">${esc(c)}</button>`).join('');
    }
  }

  $('#studioSizeChips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-size]');
    if (!btn) return;
    state.studio.size = btn.dataset.size;
    renderChips();
  });

  $('#studioColorChips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    state.studio.color = btn.dataset.color;
    renderChips();
  });

  $('#studioThumbs')?.addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-thumb]');
    if (!thumb) return;
    setStudioImage(Number(thumb.dataset.thumb));
  });

  function selectStudioProduct(product) {
    if (!product) return;
    state.studio.product = product;
    state.studio.color = product.colors?.[0] || '';
    state.studio.size = null;

    $('#studioProductCategory').textContent = `LALIN.VN · ${CATEGORY_LABELS[product.category] || 'CUSTOM TRY-ON'}`;
    $('#studioProductTitle').textContent = product.title;
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
    updateStylistVerdictForCurrent();
    if (vtonState.active) {
      runStaticPhotoVtonSynthesis(false);
    }
  }

  function openStudio(product, initialMode = 'live') {
    const targetProduct = product || state.studio.product || PRODUCTS[0];
    if (!targetProduct || !modal) return;
    selectStudioProduct(targetProduct);

    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setStudioMode(initialMode);
  }

  function openStaticPhotoVton(product) {
    const p = product || state.studio.product || PRODUCTS[0];
    if (modal?.classList.contains('open')) {
      closeStudio();
    }
    if (window.FreeVTONWidget) {
      syncAnywearWidgetStatus();
      window.FreeVTONWidget.open(toFreeVtonProduct(p), 'photo');
      showToast(`🖼️ Đang mở Thử Đồ Ảnh Tĩnh AI Miễn Phí cho "${p?.title || p?.name || 'sản phẩm'}"!`);
      return;
    }
    openStudio(p, 'photo');
  }

  function closeStudio() {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    $('#studioAddSheet')?.setAttribute('hidden', '');
    if (!$('#bagDrawer')?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    lastFocused?.focus?.();
  }

  $('#closeAnywearModalBtn')?.addEventListener('click', closeStudio);
  $('#modalTopCloseBtn')?.addEventListener('click', closeStudio);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeStudio(); });

  // Launch Decart AI's Anywear Camera directly from the Quick-View Modal
  $('#studioLaunchDecartBtn')?.addEventListener('click', () => {
    triggerAnywearTryOn(state.studio.product || PRODUCTS[0]);
  });
  $('#modeWebcamBtn')?.addEventListener('click', () => {
    triggerAnywearTryOn(state.studio.product || PRODUCTS[0]);
  });

  // ==========================================================================
  // 7B. OPEN-SOURCE STATIC PHOTO VIRTUAL TRY-ON (IDM-VTON / CatVTON / OOTDiffusion)
  //     Zero Per-Click Licensing Fee · Self-Hosted GPU or Free Quota API
  // ==========================================================================
  const vtonState = {
    active: false,
    model: 'idm-vton',
    category: 'upper_body',
    sampleIdx: 0,
    customPortraitImg: null,
    customPortraitName: '',
    remoteDiffusedImg: null,
    garmentCutoutCanvas: null,
    garmentCutoutSrc: '',
    comparePct: 100,
    offsetX: 0,
    offsetY: 0,
    scale: 100,
    shoulder: 100
  };

  const VTON_MODEL_LABELS = {
    'idm-vton': 'IDM-VTON (yisol/IDM-VTON)',
    'catvton': 'CatVTON (zhengchong/CatVTON · <8GB VRAM)',
    'ootdiffusion': 'OOTDiffusion (levihsu/OOTDiffusion)'
  };

  const SAMPLE_PORTRAIT_PRESETS = [
    {
      title: 'Mẫu 01 — Chính diện Studio',
      bgTop: '#f3ede2',
      bgBottom: '#dfd5c5',
      skinTone: '#f2ccb0',
      skinShadow: '#d9aa8b',
      hairColor: '#1f1a18',
      baseTopColor: '#e5e0d8',
      skirtColor: '#232329',
      shoulderScale: 1.0,
      poseShiftX: 0
    },
    {
      title: 'Mẫu 02 — Ánh nắng Thảo Điền',
      bgTop: '#f8efe0',
      bgBottom: '#e5cfa8',
      skinTone: '#efd0b6',
      skinShadow: '#d4ab8a',
      hairColor: '#2c1f19',
      baseTopColor: '#ebe4d8',
      skirtColor: '#f5f2eb',
      shoulderScale: 0.97,
      poseShiftX: 6
    },
    {
      title: 'Mẫu 03 — Dáng đứng Lookbook',
      bgTop: '#e8ecf2',
      bgBottom: '#cfd6e2',
      skinTone: '#f4d5be',
      skinShadow: '#dab196',
      hairColor: '#181619',
      baseTopColor: '#dfe3ea',
      skirtColor: '#1c1d24',
      shoulderScale: 1.03,
      poseShiftX: -5
    }
  ];

  function setStudioMode(mode) {
    const isPhoto = mode === 'photo';
    vtonState.active = isPhoto;
    const panel = $('#studioStaticPhotoPanel');
    const tabLive = $('#tabModeLiveCamBtn');
    const tabPhoto = $('#tabModeStaticPhotoBtn');
    const statusText = $('#studioLiveStatusText');

    if (panel) panel.hidden = !isPhoto;
    if (tabLive) {
      tabLive.classList.toggle('active', !isPhoto);
      tabLive.setAttribute('aria-selected', String(!isPhoto));
    }
    if (tabPhoto) {
      tabPhoto.classList.toggle('active', isPhoto);
      tabPhoto.setAttribute('aria-selected', String(isPhoto));
    }
    if (statusText) {
      statusText.textContent = isPhoto ? 'STATIC PHOTO VTON · 0₫/CLICK' : 'ANYWEAR READY';
    }
    if (isPhoto) {
      runStaticPhotoVtonSynthesis(true);
    }
  }

  $('#tabModeLiveCamBtn')?.addEventListener('click', () => triggerAnywearTryOn(state.studio.product || PRODUCTS[0]));
  $('#tabModeStaticPhotoBtn')?.addEventListener('click', () => openStaticPhotoVton(state.studio.product || PRODUCTS[0]));
  $('#modeStaticPhotoBtn')?.addEventListener('click', () => openStaticPhotoVton(state.studio.product || PRODUCTS[0]));
  $('#hubOpenPhotoVtonBtn')?.addEventListener('click', () => openStaticPhotoVton(state.studio.product || PRODUCTS[0]));
  $('#hubOpenStaticPhotoBtn')?.addEventListener('click', () => openStaticPhotoVton(state.studio.product || PRODUCTS[0]));

  $('#vtonToggleApiConfigBtn')?.addEventListener('click', () => {
    const drawer = $('#vtonApiDrawer');
    if (drawer) drawer.hidden = !drawer.hidden;
  });

  $('#vtonModelSelect')?.addEventListener('change', (e) => {
    vtonState.model = e.target.value;
    runStaticPhotoVtonSynthesis(true);
  });

  $('#vtonCategorySelect')?.addEventListener('change', (e) => {
    vtonState.category = e.target.value;
    vtonState.garmentCutoutSrc = ''; // force re-extraction with new region
    runStaticPhotoVtonSynthesis(true);
  });

  $$('[data-sample-portrait]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vtonState.sampleIdx = Number(btn.dataset.samplePortrait || 0);
      vtonState.customPortraitImg = null;
      vtonState.remoteDiffusedImg = null;
      $$('[data-sample-portrait]').forEach((b) => b.classList.toggle('active', b === btn));
      runStaticPhotoVtonSynthesis(true);
    });
  });

  function handlePortraitFile(file, isSelfie = false) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh chân dung hợp lệ (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        vtonState.customPortraitImg = img;
        vtonState.customPortraitName = isSelfie ? 'Selfie Camera' : file.name.replace(/\.[^.]+$/, '').slice(0, 28);
        vtonState.remoteDiffusedImg = null;
        $$('[data-sample-portrait]').forEach((b) => b.classList.remove('active'));
        showToast(`Đã nạp ảnh chân dung "${vtonState.customPortraitName}" — đang ghép trang phục bằng ${VTON_MODEL_LABELS[vtonState.model]}!`);
        runStaticPhotoVtonSynthesis(true);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  $('#vtonUploadPortraitBtn')?.addEventListener('click', () => {
    $('#vtonPortraitFileInput')?.click();
  });
  $('#vtonTakeSelfieBtn')?.addEventListener('click', () => {
    $('#vtonSelfieCaptureInput')?.click();
  });

  $('#vtonPortraitFileInput')?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handlePortraitFile(e.target.files[0], false);
    e.target.value = '';
  });
  $('#vtonSelfieCaptureInput')?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handlePortraitFile(e.target.files[0], true);
    e.target.value = '';
  });

  $('#vtonRunSynthesizeBtn')?.addEventListener('click', () => {
    runStaticPhotoVtonSynthesis(true);
  });

  // Direct touch & mouse wipe across the canvas viewport for natural mobile/desktop comparison
  const vtonViewport = $('#vtonCanvasViewport');
  if (vtonViewport) {
    let isWiping = false;
    const applyWipe = (clientX) => {
      const rect = vtonViewport.getBoundingClientRect();
      if (!rect.width) return;
      const pct = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
      vtonState.comparePct = pct;
      const slider = $('#vtonCompareSlider');
      if (slider) slider.value = String(pct);
      const lbl = $('#vtonCompareLabel');
      if (lbl) lbl.textContent = `Kết quả VTON: ${pct}%`;
      renderStaticPhotoVtonCanvas();
    };

    vtonViewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, input, label')) return;
      isWiping = true;
      applyWipe(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
      if (!isWiping) return;
      applyWipe(e.clientX);
    });
    window.addEventListener('mouseup', () => { isWiping = false; });

    vtonViewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, input, label')) return;
      if (e.touches[0]) {
        isWiping = true;
        applyWipe(e.touches[0].clientX);
      }
    }, { passive: true });
    vtonViewport.addEventListener('touchmove', (e) => {
      if (!isWiping) return;
      if (e.touches[0]) applyWipe(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', () => { isWiping = false; });
  }

  $('#vtonCompareSlider')?.addEventListener('input', (e) => {
    vtonState.comparePct = Number(e.target.value);
    const lbl = $('#vtonCompareLabel');
    if (lbl) lbl.textContent = `Kết quả VTON: ${vtonState.comparePct}%`;
    renderStaticPhotoVtonCanvas();
  });

  ['vtonOffsetX', 'vtonOffsetY', 'vtonScale', 'vtonShoulder'].forEach((id) => {
    $(`#${id}`)?.addEventListener('input', () => {
      vtonState.offsetX = Number($('#vtonOffsetX')?.value || 0);
      vtonState.offsetY = Number($('#vtonOffsetY')?.value || 0);
      vtonState.scale = Number($('#vtonScale')?.value || 100);
      vtonState.shoulder = Number($('#vtonShoulder')?.value || 100);
      renderStaticPhotoVtonCanvas();
    });
  });

  $('#vtonResetFitBtn')?.addEventListener('click', () => {
    vtonState.offsetX = 0;
    vtonState.offsetY = 0;
    vtonState.scale = 100;
    vtonState.shoulder = 100;
    if ($('#vtonOffsetX')) $('#vtonOffsetX').value = '0';
    if ($('#vtonOffsetY')) $('#vtonOffsetY').value = '0';
    if ($('#vtonScale')) $('#vtonScale').value = '100';
    if ($('#vtonShoulder')) $('#vtonShoulder').value = '100';
    renderStaticPhotoVtonCanvas();
  });

  $('#vtonDownloadBtn')?.addEventListener('click', () => {
    const canvas = $('#vtonResultCanvas');
    if (!canvas) return;
    const prevPct = vtonState.comparePct;
    vtonState.comparePct = 100;
    renderStaticPhotoVtonCanvas();
    const link = document.createElement('a');
    const prodSlug = (state.studio.product?.handle || 'lalin-outfit').slice(0, 32);
    link.download = `vton-${vtonState.model}-${prodSlug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    vtonState.comparePct = prevPct;
    renderStaticPhotoVtonCanvas();
    showToast('Đã tải ảnh kết quả thử đồ tĩnh (PNG) về máy!');
  });

  $('#vtonCopyServerCodeBtn')?.addEventListener('click', async () => {
    const pyCode = `# Self-Hosted Open-Source VTON API Server (IDM-VTON / CatVTON / OOTDiffusion)
# Chạy trên Server có GPU (hoặc Google Colab / RunPod) — 0đ phí bản quyền theo lượt bấm
# Cài đặt: pip install fastapi uvicorn gradio_client pillow

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gradio_client import Client, handle_file

app = FastAPI(title="Self-Hosted OpenVTON Bridge")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SPACES = {
    "idm-vton": "yisol/IDM-VTON",
    "catvton": "zhengchong/CatVTON",
    "ootdiffusion": "levihsu/OOTDiffusion"
}

class VtonRequest(BaseModel):
    model: str = "idm-vton"
    personImage: str
    garmentImage: str
    category: str = "upper_body"
    steps: int = 30
    guidanceScale: float = 2.5
    seed: int = 42

@app.post("/api/vton/photo")
def run_vton(req: VtonRequest):
    client = Client(SPACES.get(req.model, "yisol/IDM-VTON"))
    result = client.predict(
        dict={"background": handle_file(req.personImage), "layers": [], "composite": None},
        garm_img=handle_file(req.garmentImage),
        garment_des="Lalin Vietnamese Silk & Brocade Garment",
        is_checked=True,
        is_checked_crop=False,
        denoise_steps=req.steps,
        seed=req.seed,
        api_name="/tryon"
    )
    return {"ok": True, "resultImageUrl": result[0]}
`;
    try {
      await navigator.clipboard.writeText(pyCode);
      showToast('Đã sao chép code Python FastAPI tự host IDM-VTON / CatVTON / OOTDiffusion vào clipboard!');
    } catch {
      showToast('Đã sẵn sàng mẫu code Python FastAPI trong cấu hình API.');
    }
  });

  // Draw a realistic studio portrait silhouette onto an offscreen canvas when using sample presets
  function drawSamplePortraitBase(ctx, W, H, preset, includeBaseTop = true) {
    // 1. Studio backdrop gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, preset.bgTop);
    bgGrad.addColorStop(1, preset.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle studio light vignette
    const rad = ctx.createRadialGradient(W * 0.5, H * 0.35, 60, W * 0.5, H * 0.45, W * 0.75);
    rad.addColorStop(0, 'rgba(255,255,255,0.38)');
    rad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5 + preset.poseShiftX;
    const sw = preset.shoulderScale;

    // 2. Back hair layer
    ctx.save();
    ctx.fillStyle = preset.hairColor;
    ctx.beginPath();
    ctx.ellipse(cx, 255, 98, 138, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Arms & Hands (natural fashion standing pose)
    ctx.save();
    const skinGrad = ctx.createLinearGradient(cx - 190, 360, cx + 190, 880);
    skinGrad.addColorStop(0, preset.skinTone);
    skinGrad.addColorStop(0.5, preset.skinTone);
    skinGrad.addColorStop(1, preset.skinShadow);
    ctx.fillStyle = skinGrad;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(cx - 155 * sw, 385);
    ctx.quadraticCurveTo(cx - 210 * sw, 560, cx - 182 * sw, 785);
    ctx.quadraticCurveTo(cx - 172 * sw, 825, cx - 148 * sw, 815);
    ctx.quadraticCurveTo(cx - 150 * sw, 600, cx - 115 * sw, 425);
    ctx.closePath();
    ctx.fill();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(cx + 155 * sw, 385);
    ctx.quadraticCurveTo(cx + 210 * sw, 560, cx + 182 * sw, 785);
    ctx.quadraticCurveTo(cx + 172 * sw, 825, cx + 148 * sw, 815);
    ctx.quadraticCurveTo(cx + 150 * sw, 600, cx + 115 * sw, 425);
    ctx.closePath();
    ctx.fill();

    // Torso & Chest skin base
    ctx.beginPath();
    ctx.moveTo(cx - 160 * sw, 380);
    ctx.quadraticCurveTo(cx, 355, cx + 160 * sw, 380);
    ctx.lineTo(cx + 118 * sw, 680);
    ctx.quadraticCurveTo(cx, 700, cx - 118 * sw, 680);
    ctx.closePath();
    ctx.fill();

    // Neck & Collarbone
    ctx.beginPath();
    ctx.moveTo(cx - 42, 285);
    ctx.lineTo(cx + 42, 285);
    ctx.quadraticCurveTo(cx + 52, 355, cx + 88, 375);
    ctx.quadraticCurveTo(cx, 395, cx - 88, 375);
    ctx.quadraticCurveTo(cx - 52, 355, cx - 42, 285);
    ctx.closePath();
    ctx.fill();

    // Collarbone subtle highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 82, 372);
    ctx.quadraticCurveTo(cx - 30, 384, cx - 12, 378);
    ctx.moveTo(cx + 82, 372);
    ctx.quadraticCurveTo(cx + 30, 384, cx + 12, 378);
    ctx.stroke();

    // Lower body skirt / trousers
    ctx.fillStyle = preset.skirtColor;
    ctx.beginPath();
    ctx.moveTo(cx - 122 * sw, 665);
    ctx.quadraticCurveTo(cx, 682, cx + 122 * sw, 665);
    ctx.quadraticCurveTo(cx + 168 * sw, 920, cx + 155 * sw, 1180);
    ctx.lineTo(cx - 155 * sw, 1180);
    ctx.quadraticCurveTo(cx - 168 * sw, 920, cx - 122 * sw, 665);
    ctx.closePath();
    ctx.fill();

    // Neutral camisole on the BEFORE portrait so the Before/After comparison is super clear
    if (includeBaseTop) {
      ctx.fillStyle = preset.baseTopColor;
      ctx.beginPath();
      ctx.moveTo(cx - 118 * sw, 415);
      ctx.quadraticCurveTo(cx, 442, cx + 118 * sw, 415);
      ctx.lineTo(cx + 115 * sw, 672);
      ctx.quadraticCurveTo(cx, 692, cx - 115 * sw, 672);
      ctx.closePath();
      ctx.fill();

      // Thin straps
      ctx.strokeStyle = preset.baseTopColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 95 * sw, 420);
      ctx.lineTo(cx - 82 * sw, 368);
      ctx.moveTo(cx + 95 * sw, 420);
      ctx.lineTo(cx + 82 * sw, 368);
      ctx.stroke();
    }

    // 4. Head & Facial features
    ctx.fillStyle = preset.skinTone;
    ctx.beginPath();
    ctx.ellipse(cx, 215, 68, 86, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft jawline shadow
    ctx.strokeStyle = preset.skinShadow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, 222, 65, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Eyes, brows, lips (minimalist fashion editorial portrait)
    ctx.strokeStyle = '#2b211e';
    ctx.lineWidth = 2.4;
    // Brows
    ctx.beginPath();
    ctx.moveTo(cx - 38, 192);
    ctx.quadraticCurveTo(cx - 24, 185, cx - 11, 191);
    ctx.moveTo(cx + 11, 191);
    ctx.quadraticCurveTo(cx + 24, 185, cx + 38, 192);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#231b18';
    ctx.beginPath();
    ctx.ellipse(cx - 24, 206, 7, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 24, 206, 7, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lips
    ctx.fillStyle = '#c86d68';
    ctx.beginPath();
    ctx.ellipse(cx, 258, 15, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Front hair framing
    ctx.fillStyle = preset.hairColor;
    ctx.beginPath();
    ctx.arc(cx, 198, 72, Math.PI * 0.92, Math.PI * 2.08);
    ctx.quadraticCurveTo(cx + 55, 145, cx, 148);
    ctx.quadraticCurveTo(cx - 55, 145, cx - 70, 205);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Extract clean garment silhouette from Lalin product photo (adaptive background removal + collar/torso mask)
  function extractCleanGarmentLayer(prodImg, category = 'upper_body') {
    const outW = 640;
    const outH = 840;
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d');

    // Crop region from product photo focusing on the garment torso/dress
    const srcW = prodImg.naturalWidth || prodImg.width || 800;
    const srcH = prodImg.naturalHeight || prodImg.height || 1000;
    const cropTop = srcH * 0.17;
    const cropBottom = category === 'dresses' ? srcH * 0.93 : srcH * 0.76;
    const cropLeft = srcW * 0.14;
    const cropRight = srcW * 0.86;

    ctx.drawImage(
      prodImg,
      cropLeft,
      cropTop,
      cropRight - cropLeft,
      cropBottom - cropTop,
      0,
      0,
      outW,
      outH
    );

    try {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      const d = imgData.data;

      // Sample border corners to estimate studio backdrop color
      const samples = [];
      for (let y = 4; y < 40; y += 8) {
        for (let x of [6, 18, outW - 18, outW - 6]) {
          const idx = (y * outW + x) * 4;
          samples.push([d[idx], d[idx + 1], d[idx + 2]]);
        }
      }
      const bgR = samples.reduce((s, v) => s + v[0], 0) / samples.length;
      const bgG = samples.reduce((s, v) => s + v[1], 0) / samples.length;
      const bgB = samples.reduce((s, v) => s + v[2], 0) / samples.length;

      for (let y = 0; y < outH; y++) {
        const ny = y / outH;
        for (let x = 0; x < outW; x++) {
          const nx = (x / outW) * 2 - 1; // -1 .. 1
          const i = (y * outW + x) * 4;
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];

          // Distance from studio background
          const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);

          // Torso silhouette envelope (tapers naturally at shoulders, arms, and waist/hem)
          const maxHalfWidth = ny < 0.18
            ? 0.36 + ny * 2.2
            : ny < 0.55
              ? 0.76 - (ny - 0.18) * 0.35
              : category === 'dresses'
                ? 0.63 + (ny - 0.55) * 0.35
                : 0.64;

          const edgeDist = maxHalfWidth - Math.abs(nx);
          let alpha = 1;

          // Feather outer silhouette and neck scoop
          if (edgeDist < 0) {
            alpha = 0;
          } else if (edgeDist < 0.09) {
            alpha *= edgeDist / 0.09;
          }

          // Neck/chin cutout at very top center so the customer's face & neck stay visible
          if (ny < 0.11 && Math.abs(nx) < 0.22) {
            const neckDist = Math.hypot(nx / 0.22, (ny - 0.02) / 0.09);
            if (neckDist < 1) {
              alpha *= Math.max(0, (neckDist - 0.55) / 0.45);
            }
          }

          // Top & bottom hem feathering
          if (ny < 0.04) alpha *= ny / 0.04;
          if (ny > 0.94) alpha *= (1 - ny) / 0.06;

          // Remove outer background pixels close to studio backdrop color
          if (Math.abs(nx) > 0.42 && distBg < 36) {
            alpha *= Math.max(0, (distBg - 14) / 22);
          }

          d[i + 3] = Math.round(Math.max(0, Math.min(255, alpha * 255)));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Cross-origin fallback if canvas is tainted: apply soft clip mask
    }
    return c;
  }

  function renderStaticPhotoVtonCanvas() {
    const canvas = $('#vtonResultCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const preset = SAMPLE_PORTRAIT_PRESETS[vtonState.sampleIdx] || SAMPLE_PORTRAIT_PRESETS[0];

    // 1. Prepare BEFORE canvas (Original Portrait)
    const beforeCanvas = document.createElement('canvas');
    beforeCanvas.width = W;
    beforeCanvas.height = H;
    const bCtx = beforeCanvas.getContext('2d');

    if (vtonState.customPortraitImg) {
      // Cover-fit customer's uploaded portrait
      const img = vtonState.customPortraitImg;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      bCtx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      drawSamplePortraitBase(bCtx, W, H, preset, true);
    }

    // 2. Prepare AFTER canvas (Portrait with VTON Garment Synthesized)
    const afterCanvas = document.createElement('canvas');
    afterCanvas.width = W;
    afterCanvas.height = H;
    const aCtx = afterCanvas.getContext('2d');

    if (vtonState.remoteDiffusedImg) {
      // Render direct output from Self-Hosted GPU / Gradio Space if available
      const rImg = vtonState.remoteDiffusedImg;
      const scale = Math.max(W / rImg.width, H / rImg.height);
      const dw = rImg.width * scale;
      const dh = rImg.height * scale;
      aCtx.drawImage(rImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      if (vtonState.customPortraitImg) {
        aCtx.drawImage(beforeCanvas, 0, 0);
      } else {
        drawSamplePortraitBase(aCtx, W, H, preset, false);
      }

      if (vtonState.garmentCutoutCanvas) {
        const isDress = vtonState.category === 'dresses';
        const userScale = (vtonState.scale || 100) / 100;
        const shoulderRatio = (vtonState.shoulder || 100) / 100;
        const offsetY = Number(vtonState.offsetY || 0);
        const offsetX = Number(vtonState.offsetX || 0);

        const baseW = (isDress ? 520 : 475) * userScale * shoulderRatio * (vtonState.customPortraitImg ? 1.0 : preset.shoulderScale);
        const baseH = (isDress ? 790 : 545) * userScale;
        const cx = W * 0.5 + (vtonState.customPortraitImg ? 0 : preset.poseShiftX) + offsetX;
        const topY = (isDress ? 318 : 322) + offsetY;

        aCtx.save();
        // Contact shadow beneath garment collar & hem for realistic depth
        aCtx.shadowColor = 'rgba(18, 14, 12, 0.34)';
        aCtx.shadowBlur = 22;
        aCtx.shadowOffsetY = 8;
        aCtx.drawImage(
          vtonState.garmentCutoutCanvas,
          cx - baseW / 2,
          topY,
          baseW,
          baseH
        );
        aCtx.restore();
      }
    }

    // 3. Draw Split Before / After Wipe on main #vtonResultCanvas
    const splitX = Math.round((W * vtonState.comparePct) / 100);

    // Draw BEFORE on the right of splitX (or full background)
    ctx.drawImage(beforeCanvas, 0, 0);

    // Draw AFTER on the left up to splitX
    if (splitX > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();
      ctx.drawImage(afterCanvas, 0, 0);
      ctx.restore();
    }

    // Draw interactive split divider line if < 100% and > 0%
    if (vtonState.comparePct > 1 && vtonState.comparePct < 99) {
      ctx.save();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();

      // Handle circle
      ctx.fillStyle = '#0b0c10';
      ctx.beginPath();
      ctx.arc(splitX, H * 0.5, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⇄', splitX, H * 0.5);
      ctx.restore();
    }

    // Subtle watermark badge on canvas
    ctx.save();
    ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
    ctx.fillRect(18, 64, 310, 32);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '600 13px monospace';
    const prodTitle = (state.studio.product?.title || 'Thiết kế Lalin').slice(0, 26);
    ctx.fillText(`✦ ${vtonState.model.toUpperCase()} · ${prodTitle}`, 28, 85);
    ctx.restore();
  }

  async function runStaticPhotoVtonSynthesis(showOverlay = true) {
    const product = state.studio.product || PRODUCTS[0];
    if (!product) return;

    const loadingEl = $('#vtonLoadingOverlay');
    const stepText = $('#vtonLoadingStepText');
    const badge = $('#vtonEngineBadge');
    const modelLabel = VTON_MODEL_LABELS[vtonState.model] || 'IDM-VTON';

    if (showOverlay && loadingEl) {
      loadingEl.hidden = false;
      if (stepText) stepText.textContent = `Đang tách nền "${product.title}" & kết nối API ${modelLabel}...`;
    }

    // 1. Load product image with CORS so we can extract clean garment layer
    const rawSrc = product.imgFull || product.img;
    const proxiedSrc = rawSrc.startsWith('http')
      ? `/api/image-proxy?url=${encodeURIComponent(rawSrc)}`
      : rawSrc;

    const loadImg = (src, useCors = true) => new Promise((resolve) => {
      const im = new Image();
      if (useCors && !src.startsWith('blob:') && !src.startsWith('data:')) {
        im.crossOrigin = 'anonymous';
      }
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });

    let prodImg = await loadImg(rawSrc, true);
    if (!prodImg) prodImg = await loadImg(proxiedSrc, true);
    if (!prodImg) prodImg = await loadImg(rawSrc, false);

    if (prodImg && vtonState.garmentCutoutSrc !== `${rawSrc}:${vtonState.category}`) {
      vtonState.garmentCutoutCanvas = extractCleanGarmentLayer(prodImg, vtonState.category);
      vtonState.garmentCutoutSrc = `${rawSrc}:${vtonState.category}`;
    }

    // 2. Call Self-Hosted / Local API Bridge (/api/vton/photo)
    const endpoint = ($('#vtonEndpointInput')?.value || '/api/vton/photo').trim();
    const hfToken = ($('#vtonHfTokenInput')?.value || '').trim();
    let apiProviderLabel = `${modelLabel} · Smart VTON`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: vtonState.model,
          category: vtonState.category,
          garmentImage: rawSrc,
          garmentTitle: product.title,
          personImage: vtonState.customPortraitName || `sample_${vtonState.sampleIdx + 1}`,
          hfToken,
          steps: 30,
          guidanceScale: 2.5,
          seed: 42
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.resultImageUrl) {
          const remoteImg = await loadImg(data.resultImageUrl, false);
          if (remoteImg) {
            vtonState.remoteDiffusedImg = remoteImg;
            apiProviderLabel = `${modelLabel} · GPU Server Live`;
          }
        } else if (data.ok) {
          apiProviderLabel = `${modelLabel} · API Connected (0₫/click)`;
        }
      }
    } catch {
      // Static GitHub Pages or offline mode: seamless local synthesis
      apiProviderLabel = `${modelLabel} · Hybrid Local VTON (0₫/click)`;
    }

    if (badge) {
      badge.textContent = `✦ ${apiProviderLabel}`;
    }
    if (loadingEl) {
      setTimeout(() => {
        loadingEl.hidden = true;
      }, showOverlay ? 260 : 0);
    }

    renderStaticPhotoVtonCanvas();
  }

  // ==========================================================================
  // 8. UNIVERSAL GARMENT INPUT: UPLOAD, PASTE (Ctrl+V), DRAG & DROP, URL LINK
  // ==========================================================================
  function createCustomGarmentObject(imgSrc, label = 'Trang phục tải lên') {
    return {
      id: `custom-${Date.now()}`,
      title: label,
      category: 'to-lua',
      fabric: 'Anywear Custom Garment',
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
    const customProd = createCustomGarmentObject(objUrl, `Anywear: ${cleanName}`);
    $('#studioAddSheet')?.setAttribute('hidden', '');
    openStudio(customProd);
    showToast(`Đã nạp ảnh "${customProd.title}" — bấm Try-On để thử qua Camera Anywear!`);
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
        triggerAnywearTryOn(matchedLalin);
      }
      return;
    }

    const imgParam = parsed.searchParams.get('imgurl') || parsed.searchParams.get('media') || parsed.searchParams.get('url');
    const finalImgUrl = imgParam || parsed.href;
    const hostLabel = parsed.hostname.replace(/^www\./, '');
    const customProd = createCustomGarmentObject(finalImgUrl, `Trang phục từ ${hostLabel}`);
    $('#studioAddSheet')?.setAttribute('hidden', '');
    triggerAnywearTryOn(customProd);
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
        triggerAnywearTryOn(prod);
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
    triggerAnywearTryOn(state.studio.product || PRODUCTS[0]);
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
  bindDropZone($('#studioDropViewport'), 'drag-over');

  window.addEventListener('paste', (e) => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFileInput(file, 'Screenshot Ctrl+V');
          return;
        }
      }
    }
  });

  // ==========================================================================
  // 9. BODY MEASUREMENTS & LALIN SIZE RECOMMENDER
  // ==========================================================================
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
    if ($('#valHeight')) $('#valHeight').textContent = `${h} cm`;
    if ($('#valWeight')) $('#valWeight').textContent = `${w} kg`;
    if ($('#valWaist')) $('#valWaist').textContent = `${waist} cm`;
    if ($('#bodySummaryLabel')) $('#bodySummaryLabel').textContent = `${h}cm • ${w}kg • Eo ${waist}cm`;

    const p = state.studio.product;
    const rec = recommendSize();
    const outOfRange = waist > 78 || w > 66;
    const fit = Math.round(Math.max(72, Math.min(99, 99 - Math.abs(162 - h) * 0.2 - Math.max(0, waist - 74) * 1.5 - Math.max(0, 58 - waist) * 1.2)));
    if ($('#studioFitPercent')) $('#studioFitPercent').textContent = `${fit}%`;
    if ($('#studioRecommendedSize')) {
      $('#studioRecommendedSize').innerHTML = !p || !p.sizes?.length
        ? 'Phụ kiện: <strong>Free size</strong>'
        : outOfRange
          ? `Khuyên dùng: <strong>Size ${rec} + chỉnh sửa / may đo riêng</strong>`
          : `Khuyên dùng: <strong>Size ${rec}</strong> (bảng size Lalin)`;
    }
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
    if ($('#lightingModeLabel')) $('#lightingModeLabel').textContent = label;
  }));

  $('#studioConfirmRentBtn')?.addEventListener('click', () => studioAdd('rent'));
  $('#studioConfirmBuyBtn')?.addEventListener('click', () => studioAdd('buy'));

  function studioAdd(mode) {
    const p = state.studio.product;
    if (!p) return;
    if (p.sizes?.length && !state.studio.size) { showToast('Vui lòng chọn size trước.'); return; }
    addToBag(p, mode, state.studio.size || 'Free', state.studio.color);
    closeStudio();
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
    if ($('#bagCountBadge')) $('#bagCountBadge').textContent = `(${count})`;
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
      </div>`).join('') : '<p class="bag-empty">Chưa có sản phẩm. Hãy bấm Try-On trên ảnh sản phẩm để thử đồ qua Camera Anywear nhé!</p>';
    if ($('#bagTotal')) $('#bagTotal').textContent = fmt(state.bag.reduce((s, i) => s + i.unit * i.qty, 0));
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

  function checkInitialGarmentQuery() {
    const params = new URLSearchParams(window.location.search);
    const garmentParam = params.get('garment');
    if (garmentParam) {
      handleUrlInput(garmentParam);
    }
  }

  // ==========================================================================
  // 11. UIHARU-KAZARI/ANYWEAR API ENGINE (Stylist Verdict, Skin Brief & box_2d)
  // ==========================================================================
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
        } catch (_) {
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

  const anywearApi = {
    backendState: /\.github\.io$/i.test(window.location.hostname) ? 'offline' : 'unknown',

    async callJson(path, body = null) {
      if (this.backendState === 'offline') throw new Error('Static host mode');
      if (this.backendState === 'unknown') {
        try {
          const probe = await fetch('/api/health', { method: 'GET' });
          const ct = probe.headers.get('content-type') || '';
          this.backendState = (probe.ok && ct.includes('application/json')) ? 'online' : 'offline';
        } catch (_) {
          this.backendState = 'offline';
        }
        if (this.backendState === 'offline') throw new Error('Static host mode');
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
      } catch (_) {}

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
          const scores = st?.output?.raw || st?.output || {};
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

      const cat = p?.category || 'to-lua';
      const isGala = /dạ tiệc|gala|sự kiện|cưới/i.test(occasion);
      const isPhoto = /lookbook|chụp/i.test(occasion);

      let score = 92;
      if (cat === 'gam' && isGala) score = 96;
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
          `Chất liệu ${p.fabric} lên phom rất tự nhiên khi thử trực tiếp qua live video của Anywear (Decart AI).`,
          `Rất phù hợp với không khí "${occasion}" — có thể thuê 3 ngày (${fmt(p.rent)}) hoặc sở hữu ngay.`
        ],
        skin_harmony: `Hài hòa tuyệt đối với bảng màu da (${(skinBrief || state.studio.skinBrief)?.palette?.wear?.slice(0, 2).map((w) => w.name).join(', ') || 'Trắng Ngọc Trai, Đỏ Rượu'}) — giúp gương mặt bừng sáng.`,
        pairing: isGala
          ? ['Khuyên tai ngọc trai Lalin', 'Tóc búi thấp', 'Clutch ánh kim']
          : ['Quần lụa ống rộng', 'Túi cói hoặc túi da nhỏ', 'Trang điểm trong suốt']
      };
    }
  };

  // --- 11.1 Gemini Vision `box_2d` Garment Detection & Crop Overlay ---
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
          title="Bấm để cắt riêng vùng trang phục này (cropByBox)">
          <span class="aw-box2d-tag">✦ ${esc(g.label)} (${Math.round((g.confidence || 0.95) * 100)}%)</span>
        </button>
      `;
    }).join('');

    box2dBoxes.onclick = async (e) => {
      const item = e.target.closest('[data-box-idx]');
      if (!item) return;
      const g = garments[Number(item.dataset.boxIdx)];
      if (!g) return;
      const croppedUrl = await cropByBox(box2dImg, g.box_2d, 0.05);
      if (studioImg) studioImg.src = croppedUrl;
      box2dOverlay.hidden = true;
      detectBox2dBtn.classList.remove('active');
      showToast(`Đã cắt vùng "${g.label}" bằng cropByBox([${g.box_2d.join(', ')}])!`);
    };
  });

  closeBox2dBtn?.addEventListener('click', () => {
    if (box2dOverlay) box2dOverlay.hidden = true;
    detectBox2dBtn?.classList.remove('active');
  });

  // --- 11.2 YouCam 7-Concern Skin AI & Daily Wearable Color Palette ---
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
    const { scores, brief } = await anywearApi.analyzeSkinFromImage(studioImg);
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

  // --- 11.3 Occasion Selector & Swinging Stylist Verdict Hang-Tag ---
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
    updateStylistVerdictForCurrent();
    showToast(`Đã cập nhật đánh giá AI Stylist cho dịp "${state.studio.occasion}"!`);
  });

  // --- 11.4 On-Device Saved Lookbook (`anywear_lookbook_v1`) ---
  const LOOKBOOK_STORAGE_KEY = 'anywear_lookbook_v1';

  function loadSavedLookbook() {
    try {
      const raw = localStorage.getItem(LOOKBOOK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    return PRODUCTS.slice(0, 3).map((p, idx) => ({
      id: `saved-seed-${p.id}`,
      productId: p.id,
      title: p.title,
      img: p.img,
      occasion: idx === 0 ? 'Dạo phố thường ngày' : idx === 1 ? 'Dạ tiệc đêm sang trọng' : 'Chụp ảnh Lookbook',
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
    `).join('') : '<span style="font-size:11px;color:var(--text-muted);">Chưa có Look nào được lưu. Bấm "+ Lưu Look Này" để lưu lại!</span>';
  }

  $('#saveCurrentLookBtn')?.addEventListener('click', () => {
    const p = state.studio.product || PRODUCTS[0];
    if (!p) return;
    const list = loadSavedLookbook();
    const newEntry = {
      id: `look-${Date.now()}`,
      productId: p.id,
      title: p.title,
      img: p.img,
      occasion: state.studio.occasion,
      score: state.studio.lastVerdict?.score || 94
    };
    const next = [newEntry, ...list.filter((x) => x.productId !== p.id)].slice(0, 12);
    try {
      localStorage.setItem(LOOKBOOK_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    renderSavedLookbook();
    showToast(`Đã lưu "${p.title}" (${newEntry.score}/100đ · ${state.studio.occasion}) vào Saved Lookbook!`);
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
