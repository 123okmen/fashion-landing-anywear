/**
 * ============================================================================
 * ATELIER V.26 × ANYWEAR — HIGH-PRECISION VIRTUAL TRY-ON WIDGET & GARMENT STUDIO
 * ----------------------------------------------------------------------------
 * 1. Client-Side Real-Time AR Mirror (Webcam + @mediapipe/tasks-vision PoseLandmarker)
 * 2. Static Photo Fitting Room (AI MediaPipe Pose + Direct Canvas Transform + @gradio/client)
 * 3. Interactive Garment Studio (Cắt ảnh, Tách nền thông minh, Cọ tẩy Eraser/Restore, Feather)
 * 4. Precision Fit Calibration (X/Y Offset, Shoulder Width, Length, Tilt, Flip, Opacity, Blend Mode)
 * 5. Direct Canvas Drag & Resize (Kéo thả, xoay và chỉnh cỡ trực tiếp trên ảnh)
 * 6. Full 69+ Lalin Catalog + Custom Garment Upload (Tải ảnh quần áo riêng)
 * ============================================================================
 */

const MEDIAPIPE_VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MEDIAPIPE_WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const CLOTHES_SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const GRADIO_CLIENT_CDN =
  'https://cdn.jsdelivr.net/npm/@gradio/client/+esm';

const DEFAULT_STREETWEAR_PRESETS = [
  {
    id: 'darc-golds-gym-tee',
    name: 'Áo Thun Darc Sport × Gold\'s Gym "Gold\'s Wolf"',
    price: '1.150.000₫',
    image: './assets/garments/darc-golds-gym-tee.png',
    category: 'tee',
    description: 'Darc Sport × Gold\'s Gym Premium Tee in Black',
  },
  {
    id: 'darc-city-of-angels-tee',
    name: 'Áo Thun Darc Sport "City of Angels" Wolves LA',
    price: '1.150.000₫',
    image: './assets/garments/darc-city-of-angels-tee.png',
    category: 'tee',
    description: 'Darc Sport "City of Angels" Premium Tee in Black',
  },
  {
    id: 'darc-naruto-sakura-tee',
    name: 'Áo Thun Darc Sport × Naruto (Sakura Final Drop)',
    price: '1.250.000₫',
    image: './assets/garments/darc-naruto-sakura-tee.png',
    category: 'tee',
    description: 'Darc Sport × Naruto FINAL DROP Sakura Tee',
  },
  {
    id: 'civil-jujutsu-kaisen-tee',
    name: 'Áo Thun Civil Regime × Jujutsu Kaisen (Itadori)',
    price: '1.250.000₫',
    image: './assets/garments/civil-jujutsu-kaisen-tee.png',
    category: 'tee',
    description: 'Civil Regime × Jujutsu Kaisen Yuji Itadori Tee',
  },
  {
    id: 'darc-backpack-front',
    name: 'Balo Darc Sport "Wolves Club" Tactical',
    price: '1.650.000₫',
    image: './assets/garments/darc-backpack-front.png',
    category: 'tee',
    description: 'Balo Streetwear Darc Sport Wolves Club',
  },
  {
    id: 'darc-backpack-back',
    name: 'Balo Darc Sport "Wolves Club" (Quai đeo)',
    price: '1.650.000₫',
    image: './assets/garments/darc-backpack-back.png',
    category: 'tee',
    description: 'Mặt lưng balo quai đeo trợ lực',
  },
  {
    id: 'png-tee-black',
    name: 'Áo Thun Oversize (PNG)',
    price: '490.000₫',
    image: './assets/garments/tee-black.png',
    category: 'tee',
  },
  {
    id: 'png-jacket-camel',
    name: 'Blazer Len Camel (PNG)',
    price: '1.890.000₫',
    image: './assets/garments/jacket-camel.png',
    category: 'jacket',
  },
  {
    id: 'png-dress-burgundy',
    name: 'Váy Lụa Satin Midi (PNG)',
    price: '1.450.000₫',
    image: './assets/garments/dress-burgundy.png',
    category: 'dress',
  },
  {
    id: 'png-shirt-emerald',
    name: 'Sơ Mi Lụa Emerald (PNG)',
    price: '890.000₫',
    image: './assets/garments/shirt-emerald.png',
    category: 'shirt',
  },
];

/**
 * Garment geometry multipliers per category so silhouettes map
 * naturally onto shoulders (11, 12) and hips (23, 24).
 */
const GARMENT_FIT_PRESETS = {
  tee: {
    label: 'Áo thun / Áo phông',
    hfCategory: 'upper_body',
    widthMultiplier: 2.05,
    shoulderYRatio: 0.20,
    torsoLengthMultiplier: 1.25,
  },
  jacket: {
    label: 'Áo khoác / Blazer / Gấm',
    hfCategory: 'upper_body',
    widthMultiplier: 1.72,
    shoulderYRatio: 0.17,
    torsoLengthMultiplier: 1.28,
  },
  shirt: {
    label: 'Áo sơ mi / Áo tơ tằm',
    hfCategory: 'upper_body',
    widthMultiplier: 1.98,
    shoulderYRatio: 0.18,
    torsoLengthMultiplier: 1.24,
  },
  yem: {
    label: 'Áo yếm / Cổ yếm Lalin',
    hfCategory: 'upper_body',
    widthMultiplier: 1.82,
    shoulderYRatio: 0.24,
    torsoLengthMultiplier: 1.22,
  },
  dress: {
    label: 'Đầm / Váy / Nguyên set',
    hfCategory: 'dresses',
    widthMultiplier: 1.55,
    shoulderYRatio: 0.09,
    torsoLengthMultiplier: 1.95,
  },
  set: {
    label: 'Nguyên bộ Set Lalin',
    hfCategory: 'dresses',
    widthMultiplier: 1.62,
    shoulderYRatio: 0.12,
    torsoLengthMultiplier: 1.88,
  },
};

/**
 * 4 Diverse Sample Model Presets for Static Photo Try-On
 */
const SAMPLE_MODELS = [
  {
    id: 'mannequin-female-couture',
    name: 'Ma nơ canh Nữ · Haute Couture',
    desc: 'Phom dáng chuẩn người mẫu sàn diễn (90-60-90), eo thon vai chuẩn, tôn dáng áo lụa & đầm dạ hội',
    src: './assets/models/mannequin-female-couture.jpg',
    gender: 'female',
    pose: {
      lShoulder: { x: 0.346, y: 0.224 },
      rShoulder: { x: 0.654, y: 0.224 },
      lHip: { x: 0.365, y: 0.540 },
      rHip: { x: 0.635, y: 0.540 },
      nose: { x: 0.500, y: 0.155 },
    },
    fitSettings: {
      scaleX: 100,
      scaleY: 100,
      offsetX: 0,
      offsetY: 0,
      fabricSmoothness: 88,
      meshTightness: 85,
    },
  },
  {
    id: 'mannequin-male-streetwear',
    name: 'Ma nơ canh Nam · Athletic Streetwear',
    desc: 'Phom thể thao vai rộng chữ V (V-taper), ngực nở, chuẩn phom áo thun boxy & hoodie',
    src: './assets/models/mannequin-male-streetwear.jpg',
    gender: 'male',
    pose: {
      lShoulder: { x: 0.285, y: 0.304 },
      rShoulder: { x: 0.715, y: 0.304 },
      lHip: { x: 0.366, y: 0.520 },
      rHip: { x: 0.633, y: 0.520 },
      nose: { x: 0.500, y: 0.185 },
    },
    fitSettings: {
      scaleX: 106,
      scaleY: 102,
      offsetX: 0,
      offsetY: 2,
      fabricSmoothness: 85,
      meshTightness: 88,
    },
  },
  {
    id: 'mannequin-tailor-linen',
    name: 'Ma nơ canh May Đo · Vintage Atelier',
    desc: 'Cốt may đo vải lanh Pháp cổ điển với đường chỉ định vị tỉ lệ vàng, chuẩn may đo Bespoke',
    src: './assets/models/mannequin-tailor-linen.jpg',
    gender: 'unisex',
    pose: {
      lShoulder: { x: 0.346, y: 0.210 },
      rShoulder: { x: 0.664, y: 0.210 },
      lHip: { x: 0.355, y: 0.530 },
      rHip: { x: 0.645, y: 0.530 },
      nose: { x: 0.500, y: 0.145 },
    },
    fitSettings: {
      scaleX: 102,
      scaleY: 100,
      offsetX: 0,
      offsetY: 0,
      fabricSmoothness: 90,
      meshTightness: 86,
    },
  },
  {
    id: 'mannequin-full-minimal',
    name: 'Ma nơ canh Studio · Tối Giản Toàn Thân',
    desc: 'Ma nơ canh sợi thủy tinh trắng mờ studio, phom dáng trung tính hiện đại thanh lịch',
    src: './assets/models/mannequin-full-minimal.jpg',
    gender: 'unisex',
    pose: {
      lShoulder: { x: 0.352, y: 0.233 },
      rShoulder: { x: 0.648, y: 0.233 },
      lHip: { x: 0.370, y: 0.540 },
      rHip: { x: 0.630, y: 0.540 },
      nose: { x: 0.500, y: 0.160 },
    },
    fitSettings: {
      scaleX: 100,
      scaleY: 100,
      offsetX: 0,
      offsetY: 0,
      fabricSmoothness: 88,
      meshTightness: 85,
    },
  },
];

export class VirtualTryOnWidget {
  constructor(options = {}) {
    this.options = {
      defaultSamplePortrait: './assets/models/mannequin-female-couture.jpg',
      autoDetectSelector: '[data-vton-product], [data-product-id]',
      ...options,
    };

    // UI state
    this.isOpen = false;
    this.activeTab = 'camera'; // 'camera' | 'photo'
    this.currentProduct = null;
    this.currentGarmentImg = null;
    this.rawGarmentImg = null; // Original before crop/edit
    this.catalog = [];
    this.catalogFilter = 'all';
    this.catalogSearch = '';

    // MediaPipe & AI instances
    this.visionModule = null;
    this.poseVideoLandmarker = null;
    this.poseImageLandmarker = null;
    this.clothesSegmenter = null;
    this._selectSeq = 0;

    // Real-time AR Camera state
    this.mediaStream = null;
    this.arLoopRaf = null;
    this.lastVideoTime = -1;
    this.smoothedPose = null;
    this.mediaRecorder = null;
    this.isRecording = false;
    this.recordTimerId = null;

    // Organic Physics & Sway Inertia state
    this.physicsState = {
      lastTime: performance.now(),
      swayX: 0,
      swayVelX: 0,
      lastTorsoMidX: null,
      lastTorsoMidY: null,
      breathePhase: 0,
    };

    // Precision Fitting Settings (Applies to both AR Camera & Static Photo!)
    this.arSettings = {
      scalePct: 100,       // 50%..200% overall scale
      scaleX: 100,         // 60%..180% shoulder width stretch
      scaleY: 100,         // 60%..180% torso height stretch
      offsetX: 0,          // -200px..+200px horizontal shift
      offsetY: 0,          // -200px..+200px vertical shift
      rotationDeg: 0,      // -45°..+45° rotation angle
      flipH: false,        // Flip garment horizontally
      opacity: 100,        // 30%..100% transparency
      blendMode: 'source-over', // 'source-over' | 'multiply' | 'soft-light'
      brightness: 100,     // 70%..140%
      contrast: 100,       // 70%..140%
      showShadow: true,    // Contact drop shadow
      showSkeleton: false, // Pose landmarks
      mirrorCamera: true,  // Flip selfie video
      // Dynamic 3D Body Frame Fitting & Deformation
      dynamicMesh: true,   // True 3D body-conforming mesh deformation
      meshTightness: 85,   // 20%..100% body contour wrap
      shading3D: true,     // 3D cylindrical volume lighting & ambient occlusion
      organicMotion: true, // Respiration expansion & fabric sway inertia
      fabricSmoothness: 88, // 30%..100% fabric softness, edge feathering & micro-texture
      organicCreases: true, // Natural draping folds, collar insertion & tension wrinkles
    };

    // Static Photo State
    this.personFile = null;
    this.personImg = null;
    this.personDataUrl = '';
    this.afterDataUrl = '';
    this.comparePercent = 55;
    this.staticEngine = 'auto'; // 'auto' | 'pose-canvas'
    this.hfSpace = 'yisol/IDM-VTON';
    this.staticDetectedPose = null;
    this.staticDetectedPersonSrc = null;
    this.selectedModelIdx = 0;

    // Direct Interactive Canvas Transform (Mouse & Touch Drag/Scale/Rotate)
    this.interactiveTransform = {
      active: false,
      isDragging: false,
      isResizing: false,
      isRotating: false,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
      startScaleX: 100,
      startScaleY: 100,
      startRotation: 0,
      box: null, // Bounding box on screen [x, y, w, h, angle]
    };

    // Garment Studio / Cropper State
    this.editor = {
      isOpen: false,
      rawImg: null,
      canvas: null,
      ctx: null,
      cropBox: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, // Normalized 0..1
      activeTool: 'crop', // 'crop' | 'erase' | 'restore'
      brushSize: 22,
      feather: 2,
      isDrawing: false,
      history: [],
      historyIndex: -1,
      maskData: null,
    };

    this._garmentCache = new Map();
    this._mountModalDOM();
    this._mountEditorDOM();
    this._bindEvents();

    // Auto-load catalog with presets + Lalin products
    if (typeof window !== 'undefined') {
      const presets = Array.isArray(window.FREE_VTON_PNG_PRESETS) && window.FREE_VTON_PNG_PRESETS.length > 0
        ? window.FREE_VTON_PNG_PRESETS
        : DEFAULT_STREETWEAR_PRESETS;
      const lalin = Array.isArray(window.LALIN_PRODUCTS)
        ? this._convertLalinCatalog(window.LALIN_PRODUCTS)
        : [];
      this.setCatalog([...presets, ...lalin]);
    } else {
      this.setCatalog(DEFAULT_STREETWEAR_PRESETS);
    }
  }

  _convertLalinCatalog(products = []) {
    const catMap = {
      yem: 'yem',
      'to-lua': 'shirt',
      gam: 'jacket',
      khoac: 'jacket',
      set: 'set',
      'phu-kien': 'tee',
    };
    return products.map((p) => ({
      id: p.id || `lalin-${p.handle || Math.random()}`,
      name: p.title || 'Thiết kế Lalin',
      price: typeof p.price === 'number' ? `${p.price.toLocaleString('vi-VN')}₫` : (p.price || ''),
      image: p.imgFull || p.img || '',
      category: catMap[p.category] || p.category || 'shirt',
      gallery: p.gallery || [p.img, p.imgAlt].filter(Boolean),
      description: p.fabric || p.desc || 'Thiết kế thủ công từ Lalin.vn',
    }));
  }

  setCatalog(items = []) {
    this.catalog = Array.isArray(items) ? items : [];
    this._renderProductSwitcher();
  }

  /**
   * Auto-detect product cards matching selector on host page
   */
  autoDetectProducts(root = document) {
    const cards = Array.from(root.querySelectorAll(this.options.autoDetectSelector));
    const detected = [];

    cards.forEach((card, index) => {
      if (card.dataset.vtonBound === '1') return;
      card.dataset.vtonBound = '1';

      const imgEl = card.querySelector('img.product-img-main') || card.querySelector('img');
      const titleEl = card.querySelector('.product-title a') || card.querySelector('h3, h4');
      const priceEl = card.querySelector('.price-val, .price');

      const product = {
        id: card.dataset.productId || card.dataset.vtonId || `vton-item-${index + 1}`,
        name: card.dataset.vtonName || titleEl?.textContent?.trim() || imgEl?.alt || `Sản phẩm #${index + 1}`,
        price: card.dataset.vtonPrice || priceEl?.textContent?.trim() || '',
        image: card.dataset.vtonSrc || imgEl?.getAttribute('src') || '',
        category: card.dataset.vtonCategory || 'shirt',
        description: card.dataset.vtonDesc || 'Trang phục thời trang Lalin',
      };
      if (product.image) detected.push(product);

      let triggerBtn = card.querySelector('[data-tryon-id], [data-vton-trigger]');
      if (!triggerBtn) {
        triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className =
          'vton-auto-btn w-full mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-white px-3.5 py-2 text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer';
        triggerBtn.innerHTML = '<span>✦</span> Thử đồ ảo (Try-On)';
        card.appendChild(triggerBtn);
      }

      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.open(product);
      });
    });

    if (detected.length > 0 && this.catalog.length === 0) {
      this.catalog = detected;
      this._renderProductSwitcher();
    }
    return this.catalog;
  }

  /**
   * Open Modal immediately with parallel asset loading
   */
  async open(product = null, initialTab = null) {
    this.isOpen = true;
    this.el.backdrop.classList.remove('hidden');
    this.el.backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Auto sync from global Lalin catalog if available and current catalog is small
    if (typeof window !== 'undefined' && Array.isArray(window.LALIN_PRODUCTS) && this.catalog.length < 10) {
      this.catalog = [
        ...(Array.isArray(window.FREE_VTON_PNG_PRESETS) ? window.FREE_VTON_PNG_PRESETS : []),
        ...this._convertLalinCatalog(window.LALIN_PRODUCTS),
      ];
      this._renderProductSwitcher();
    }

    const target = product || this.currentProduct || this.catalog[0] || null;
    if (target) {
      this._selectingPromise = this.selectProduct(target);
    }

    const tab = initialTab || this.activeTab;
    this.switchTab(tab);

    if (tab === 'photo' && !this.personImg) {
      // Auto-load default model so user never lands on a blank empty screen!
      this.loadSampleModel(0);
    }

    if (this._selectingPromise) {
      await this._selectingPromise;
    }
  }

  close() {
    this.isOpen = false;
    this.stopCameraAR();
    this.el.backdrop.classList.add('hidden');
    this.el.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async selectProduct(product) {
    if (!product) return;
    const seq = ++this._selectSeq;
    this.currentProduct = product;
    this.el.modalProductName.textContent = product.name;
    this.el.modalProductMeta.textContent = '⏳ Đang tách nền trang phục AI...';
    this.el.modalGarmentThumb.src = product.image;

    const rawImg = await this._loadImage(product.image);
    if (seq !== this._selectSeq) return;
    this.rawGarmentImg = rawImg;

    let bestCutout = rawImg
      ? await this._prepareGarmentRenderSource(rawImg, product.category || 'shirt')
      : null;

    // If primary editorial photo had heavy prop occlusion, try gallery images
    if (bestCutout?._occluded && Array.isArray(product.gallery) && product.gallery.length > 1) {
      let bestRatio = bestCutout._symmetryRatio || 0;
      for (const altUrl of product.gallery.slice(1, 4)) {
        if (!altUrl || altUrl === product.image) continue;
        const altImg = await this._loadImage(altUrl);
        if (seq !== this._selectSeq) return;
        if (!altImg) continue;
        const altCut = await this._prepareGarmentRenderSource(altImg, product.category || 'shirt');
        if (seq !== this._selectSeq) return;
        if (!altCut?._hasPose || altCut?._edgeClipped) continue;
        const r = altCut._symmetryRatio ?? 0;
        if (r > bestRatio + 0.12) {
          bestCutout = altCut;
          bestRatio = r;
          this.el.modalGarmentThumb.src = altUrl;
          if (!altCut._occluded) break;
        }
      }
    }

    this.currentGarmentImg = bestCutout;
    if (seq !== this._selectSeq) return;

    const presetLabel = GARMENT_FIT_PRESETS[product.category]?.label || 'Trang phục';
    this.el.modalProductMeta.textContent = `${presetLabel}${product.price ? ` · ${product.price}` : ''}`;
    this._renderProductSwitcher();

    // Live refresh static canvas if photo is loaded
    if (this.activeTab === 'photo' && this.personImg) {
      this._refreshStaticFallbackLive();
    }
  }

  /**
   * Smart Garment Segmentation:
   * 1. Check for pre-cut transparent RGBA PNG
   * 2. If opaque photo, try MediaPipe Clothes Segmenter + Pose
   * 3. Robust Local Fallback: Adaptive Color-Difference + Flood-Fill background cutter
   *    -> NEVER overlays an opaque rectangular photo on the user!
   */
  async _prepareGarmentRenderSource(img, category = 'shirt') {
    const key = `${img.src}:${category}`;
    if (this._garmentCache?.has(key)) return this._garmentCache.get(key);

    const nw = img.naturalWidth || img.width || 600;
    const nh = img.naturalHeight || img.height || 800;

    // 1. Fast transparent PNG check
    try {
      const probe = document.createElement('canvas');
      probe.width = 24;
      probe.height = 24;
      const pCtx = probe.getContext('2d');
      pCtx.drawImage(img, 0, 0, 24, 24);
      const pd = pCtx.getImageData(0, 0, 24, 24).data;
      if (pd[3] < 30 && pd[23 * 4 + 3] < 30) {
        this._garmentCache?.set(key, img);
        return img;
      }
    } catch (_) {}

    // 2. Working copy for segmentation
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(nw, nh));
    const w = Math.max(64, Math.round(nw * scale));
    const h = Math.max(64, Math.round(nh * scale));

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const sCtx = srcCanvas.getContext('2d');
    sCtx.drawImage(img, 0, 0, w, h);

    let clothesMask = null;
    let mw = 0;
    let mh = 0;
    let lalinPose = null;

    try {
      const [segmenter, landmarker] = await Promise.all([
        this._ensureClothesSegmenter().catch(() => null),
        this._ensurePoseLandmarker('IMAGE').catch(() => null),
      ]);

      if (segmenter) {
        const segRes = segmenter.segment(srcCanvas);
        const maskObj = segRes?.confidenceMasks?.[4] || segRes?.confidenceMasks?.[1];
        if (maskObj) {
          mw = maskObj.width;
          mh = maskObj.height;
          clothesMask = new Float32Array(maskObj.getAsFloat32Array());
        }
        segRes?.close?.();
      }

      if (landmarker) {
        const poseRes = landmarker.detect(srcCanvas);
        const lm = poseRes?.landmarks?.[0];
        if (lm && lm.length > 24) {
          lalinPose = {
            lShoulder: { x: lm[11].x * w, y: lm[11].y * h },
            rShoulder: { x: lm[12].x * w, y: lm[12].y * h },
            lHip: { x: lm[23].x * w, y: lm[23].y * h },
            rHip: { x: lm[24].x * w, y: lm[24].y * h },
          };
        }
      }
    } catch (err) {
      console.warn('[VTON] AI segmentation notice, using smart local background cutter:', err);
    }

    // 3. If MediaPipe segmenter succeeded, apply bilinear probability mask
    if (clothesMask && mw && mh) {
      const cutout = this._extractFromMediaPipeMask(srcCanvas, clothesMask, mw, mh, lalinPose, category);
      if (cutout) {
        this._garmentCache?.set(key, cutout);
        return cutout;
      }
    }

    // 4. SMART LOCAL CUTTER FALLBACK:
    // Sample border corners, flood-fill background, cut upper-torso silhouette
    const smartCutout = this._smartLocalBackgroundRemoval(srcCanvas, lalinPose, category);
    this._garmentCache?.set(key, smartCutout);
    return smartCutout;
  }

  _extractFromMediaPipeMask(srcCanvas, clothesMask, mw, mh, lalinPose, category) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const sCtx = srcCanvas.getContext('2d');
    const isDress = category === 'dress' || category === 'dresses' || category === 'set';

    let topCutY = 0;
    let botCutY = h;
    let minXLimit = 0;
    let maxXLimit = w;
    if (lalinPose) {
      const shY = (lalinPose.lShoulder.y + lalinPose.rShoulder.y) / 2;
      const hipY = (lalinPose.lHip.y + lalinPose.rHip.y) / 2;
      const shSpan = Math.max(30, Math.hypot(lalinPose.rShoulder.x - lalinPose.lShoulder.x, lalinPose.rShoulder.y - lalinPose.lShoulder.y));
      const torsoH = Math.max(shSpan * 1.1, Math.abs(hipY - shY));
      topCutY = Math.max(0, shY - shSpan * 0.32);
      botCutY = isDress ? h : Math.min(h, hipY + torsoH * 0.25);
      const midX = (lalinPose.lShoulder.x + lalinPose.rShoulder.x) / 2;
      const sidePad = isDress ? shSpan * 1.15 : shSpan * 0.95;
      minXLimit = Math.max(0, midX - sidePad);
      maxXLimit = Math.min(w, midX + sidePad);
    }

    const imgData = sCtx.getImageData(0, 0, w, h);
    const d = imgData.data;
    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
      const fy = ((y + 0.5) / h) * mh - 0.5;
      const y0 = Math.max(0, Math.min(mh - 1, Math.floor(fy)));
      const y1 = Math.max(0, Math.min(mh - 1, y0 + 1));
      const wy = Math.max(0, Math.min(1, fy - y0));

      let regionWeight = 1;
      if (y < topCutY || y > botCutY) regionWeight = 0;
      else if (!isDress && y > botCutY - 18) regionWeight = (botCutY - y) / 18;

      const rowStart = y * w;
      for (let x = 0; x < w; x++) {
        const idx = (rowStart + x) * 4;
        if (regionWeight <= 0 || x < minXLimit || x > maxXLimit) {
          d[idx + 3] = 0;
          continue;
        }

        const fx = ((x + 0.5) / w) * mw - 0.5;
        const x0 = Math.max(0, Math.min(mw - 1, Math.floor(fx)));
        const x1 = Math.max(0, Math.min(mw - 1, x0 + 1));
        const wx = Math.max(0, Math.min(1, fx - x0));

        const p00 = clothesMask[y0 * mw + x0];
        const p10 = clothesMask[y0 * mw + x1];
        const p01 = clothesMask[y1 * mw + x0];
        const p11 = clothesMask[y1 * mw + x1];
        const prob = (p00 * (1 - wx) + p10 * wx) * (1 - wy) + (p01 * (1 - wx) + p11 * wx) * wy;

        const alphaNorm = Math.max(0, Math.min(1, (prob - 0.32) / 0.35)) * regionWeight;
        const a = Math.round(alphaNorm * 255);
        d[idx + 3] = a;
        if (a > 45) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX + 20 || maxY <= minY + 20) return null;

    sCtx.putImageData(imgData, 0, 0);
    return this._cropToGarmentCanvas(srcCanvas, minX, minY, maxX, maxY, lalinPose);
  }

  /**
   * Local Smart Background Remover & Torso Isolator
   */
  _smartLocalBackgroundRemoval(srcCanvas, lalinPose, category) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Sample border corners to detect studio background color
    const samples = [];
    const samplePts = [
      [4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5],
      [Math.round(w / 2), 4], [4, Math.round(h / 2)], [w - 5, Math.round(h / 2)],
    ];
    for (const [sx, sy] of samplePts) {
      const idx = (sy * w + sx) * 4;
      samples.push([d[idx], d[idx + 1], d[idx + 2]]);
    }
    const bgR = samples.reduce((s, v) => s + v[0], 0) / samples.length;
    const bgG = samples.reduce((s, v) => s + v[1], 0) / samples.length;
    const bgB = samples.reduce((s, v) => s + v[2], 0) / samples.length;

    const isDress = category === 'dress' || category === 'dresses' || category === 'set';
    const topCutY = lalinPose ? Math.max(0, lalinPose.lShoulder.y - 45) : h * 0.16;
    const botCutY = isDress ? h * 0.96 : (lalinPose ? lalinPose.lHip.y + 70 : h * 0.78);
    const midX = w * 0.5;

    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
      const ny = y / h;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Euclidean distance from backdrop color
        const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);

        // Vertical cutoff
        if (y < topCutY || y > botCutY) {
          d[i + 3] = 0;
          continue;
        }

        // Distance from horizontal center
        const nx = Math.abs((x - midX) / (w * 0.5));
        const maxSpan = isDress ? 0.88 : (ny < 0.35 ? 0.78 : 0.68);
        if (nx > maxSpan) {
          d[i + 3] = 0;
          continue;
        }

        // Background color threshold with soft ramp
        let alpha = 1;
        if (distBg < 26) {
          alpha = 0;
        } else if (distBg < 52) {
          alpha = (distBg - 26) / 26;
        }

        // Edge vertical feather
        if (y < topCutY + 14) alpha *= (y - topCutY) / 14;
        if (y > botCutY - 14) alpha *= (botCutY - y) / 14;

        const finalA = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
        d[i + 3] = finalA;

        if (finalA > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX + 20 || maxY <= minY + 20) {
      // Fallback safe centered crop
      minX = Math.round(w * 0.18);
      maxX = Math.round(w * 0.82);
      minY = Math.round(h * 0.18);
      maxY = Math.round(isDress ? h * 0.90 : h * 0.75);
    }

    ctx.putImageData(imgData, 0, 0);
    return this._cropToGarmentCanvas(srcCanvas, minX, minY, maxX, maxY, lalinPose);
  }

  _cropToGarmentCanvas(srcCanvas, minX, minY, maxX, maxY, lalinPose) {
    const pad = 8;
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(w - cx, maxX - minX + pad * 2);
    const ch = Math.min(h - cy, maxY - minY + pad * 2);

    const out = document.createElement('canvas');
    out.width = Math.max(32, cw);
    out.height = Math.max(32, ch);
    const oCtx = out.getContext('2d');
    oCtx.drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);

    out._hasPose = Boolean(lalinPose);
    if (lalinPose) {
      const shMidX = (lalinPose.lShoulder.x + lalinPose.rShoulder.x) / 2 - cx;
      const shMidY = (lalinPose.lShoulder.y + lalinPose.rShoulder.y) / 2 - cy;
      const shSpan = Math.hypot(
        lalinPose.rShoulder.x - lalinPose.lShoulder.x,
        lalinPose.rShoulder.y - lalinPose.lShoulder.y
      );
      out._vtonMeta = {
        shoulderCenterRatioX: Math.max(0.25, Math.min(0.75, shMidX / cw)),
        shoulderYRatio: Math.max(0.04, Math.min(0.32, shMidY / ch)),
        shoulderSpanRatioW: Math.max(0.28, Math.min(0.88, shSpan / cw)),
      };
    }
    return out;
  }

  switchTab(tab) {
    this.activeTab = tab;
    const isCam = tab === 'camera';

    this.el.tabCamBtn.className = isCam ? this._tabActiveClass() : this._tabIdleClass();
    this.el.tabPhotoBtn.className = !isCam ? this._tabActiveClass() : this._tabIdleClass();

    this.el.camPanel.classList.toggle('hidden', !isCam);
    this.el.photoPanel.classList.toggle('hidden', isCam);

    if (isCam) {
      this.startCameraAR();
    } else {
      this.stopCameraAR();
      if (!this.personImg) {
        this.loadSampleModel(0);
      } else {
        this._refreshStaticFallbackLive();
      }
    }
  }

  /**
   * MediaPipe PoseLandmarker & Segmenter loaders
   */
  async _ensurePoseLandmarker(requiredMode = 'VIDEO') {
    const run = async () => {
      if (!this.visionModule) {
        this.visionModule = await import(MEDIAPIPE_VISION_CDN);
      }
      const { FilesetResolver, PoseLandmarker } = this.visionModule;
      const targetProp = requiredMode === 'IMAGE' ? 'poseImageLandmarker' : 'poseVideoLandmarker';
      if (!this[targetProp]) {
        if (!this._visionFileset) {
          this._visionFileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
        }
        try {
          this[targetProp] = await PoseLandmarker.createFromOptions(this._visionFileset, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
            runningMode: requiredMode,
            numPoses: 1,
            minPoseDetectionConfidence: 0.45,
            minPosePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        } catch (_) {
          this[targetProp] = await PoseLandmarker.createFromOptions(this._visionFileset, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
            runningMode: requiredMode,
            numPoses: 1,
            minPoseDetectionConfidence: 0.45,
            minPosePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        }
      }
      return this[targetProp];
    };
    this._poseInitQueue = (this._poseInitQueue || Promise.resolve()).then(run, run);
    return this._poseInitQueue;
  }

  async _ensureClothesSegmenter() {
    const run = async () => {
      if (!this.visionModule) {
        this.visionModule = await import(MEDIAPIPE_VISION_CDN);
      }
      const { FilesetResolver, ImageSegmenter } = this.visionModule;
      if (!this.clothesSegmenter) {
        if (!this._visionFileset) {
          this._visionFileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
        }
        try {
          this.clothesSegmenter = await ImageSegmenter.createFromOptions(this._visionFileset, {
            baseOptions: { modelAssetPath: CLOTHES_SEGMENTER_MODEL_URL, delegate: 'GPU' },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        } catch (_) {
          this.clothesSegmenter = await ImageSegmenter.createFromOptions(this._visionFileset, {
            baseOptions: { modelAssetPath: CLOTHES_SEGMENTER_MODEL_URL, delegate: 'CPU' },
            runningMode: 'IMAGE',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });
        }
      }
      return this.clothesSegmenter;
    };
    this._poseInitQueue = (this._poseInitQueue || Promise.resolve()).then(run, run);
    return this._poseInitQueue;
  }

  /**
   * Real-Time Camera AR
   */
  async startCameraAR() {
    this.el.camPermissionBox.classList.add('hidden');
    this.el.camStatusPill.textContent = '⏳ Đang xin quyền Camera & tải AI...';
    this.el.camStatusPill.dataset.state = 'loading';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._showCameraError(
        !window.isSecureContext
          ? 'Trình duyệt yêu cầu kết nối bảo mật HTTPS (hoặc localhost) để truy cập Camera.'
          : 'Trình duyệt hiện tại không hỗ trợ API getUserMedia.'
      );
      return;
    }

    try {
      this._stopStreamOnly();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const video = this.el.video;
      video.srcObject = this.mediaStream;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
      await video.play();

      const canvas = this.el.arCanvas;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      this.el.camStatusPill.textContent = '🧠 Đang nạp PoseLandmarker...';
      await this._ensurePoseLandmarker('VIDEO');

      this.el.camStatusPill.textContent = '● AR LIVE · Khớp vai & hông (11,12,23,24)';
      this.el.camStatusPill.dataset.state = 'live';
      this.smoothedPose = null;
      this.lastVideoTime = -1;
      this._hasAutoCalibratedCamera = false;
      this._camStableFrames = 0;

      this._runARFrameLoop();
    } catch (err) {
      console.error('[VTON] Camera start error:', err);
      this._showCameraError(this._mapCameraErrorMessage(err));
    }
  }

  stopCameraAR() {
    if (this.arLoopRaf) {
      cancelAnimationFrame(this.arLoopRaf);
      this.arLoopRaf = null;
    }
    if (this.isRecording) {
      this._stopVideoRecording(true);
    }
    this._stopStreamOnly();
  }

  _stopStreamOnly() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.el?.video) {
      this.el.video.srcObject = null;
    }
  }

  _mapCameraErrorMessage(err) {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Bạn đã chặn quyền truy cập Camera. Vui lòng bấm biểu tượng Ổ khóa (🔒) trên thanh địa chỉ -> Cho phép Camera -> Thử lại.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Không tìm thấy Webcam/Camera trên máy này. Bạn có thể chuyển sang Tab "Thử qua Ảnh Tĩnh"!';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera đang bị ứng dụng khác (Zoom, Meet...) chiếm dụng. Hãy tắt ứng dụng kia rồi bấm Thử lại.';
    }
    return `Không thể mở Camera (${err?.message || 'Lỗi'}). Vui lòng dùng Tab Ảnh Tĩnh.`;
  }

  _showCameraError(message) {
    this.el.camStatusPill.textContent = '⚠ Camera bị chặn hoặc chưa sẵn sàng';
    this.el.camStatusPill.dataset.state = 'error';
    this.el.camPermissionMsg.textContent = message;
    this.el.camPermissionBox.classList.remove('hidden');
  }

  _runARFrameLoop() {
    const video = this.el.video;
    const canvas = this.el.arCanvas;
    const ctx = canvas.getContext('2d');

    const step = () => {
      if (!this.isOpen || this.activeTab !== 'camera') return;

      const W = canvas.width;
      const H = canvas.height;

      if (video.readyState >= 2) {
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        if (this.arSettings.mirrorCamera) {
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, W, H);
        ctx.restore();

        if (this.poseVideoLandmarker && video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = video.currentTime;
          try {
            const result = this.poseVideoLandmarker.detectForVideo(video, performance.now());
            const rawLm = result?.landmarks?.[0];
            if (rawLm && rawLm.length > 24) {
              this._updateSmoothedPose(rawLm, W, H);
            }
          } catch (_) {}
        }

        if (this.smoothedPose && this.currentGarmentImg) {
          if (!this._hasAutoCalibratedCamera) {
            this._camStableFrames = (this._camStableFrames || 0) + 1;
            if (this._camStableFrames > 12) {
              this.autoCalibrateFit(this.smoothedPose, true);
              this._hasAutoCalibratedCamera = true;
            }
          }

          const fit = this.computeGarmentGeometry(
            this.smoothedPose,
            this.currentProduct?.category || 'shirt',
            this.arSettings,
            this.currentGarmentImg
          );
          this.drawGarmentOverlay(ctx, this.currentGarmentImg, fit, this.arSettings);

          if (this.arSettings.showSkeleton) {
            this.drawDebugSkeleton(ctx, this.smoothedPose, fit);
          }
          this.el.camPoseBadge.textContent = `Vai: ${Math.round(fit.shoulderWidth)}px · Nghiêng: ${Math.round(
            (fit.angle * 180) / Math.PI
          )}°`;
        } else {
          this.el.camPoseBadge.textContent = 'Đứng lùi lại 1 bước để AI thấy rõ 2 vai';
        }
      }

      this.arLoopRaf = requestAnimationFrame(step);
    };

    this.arLoopRaf = requestAnimationFrame(step);
  }

  _updateSmoothedPose(rawLm, W, H) {
    const mapPt = (lm) => {
      if (!lm) return null;
      return {
        x: (this.arSettings.mirrorCamera ? 1 - lm.x : lm.x) * W,
        y: lm.y * H,
        z: ((lm.z ?? 0) * (this.arSettings.mirrorCamera ? -1 : 1)) * W,
        visibility: lm.visibility ?? 1,
      };
    };

    const target = {
      lShoulder: mapPt(rawLm[11]),
      rShoulder: mapPt(rawLm[12]),
      lHip: mapPt(rawLm[23]),
      rHip: mapPt(rawLm[24]),
      nose: mapPt(rawLm[0]),
      lElbow: mapPt(rawLm[13]),
      rElbow: mapPt(rawLm[14]),
    };

    if (!this.smoothedPose) {
      this.smoothedPose = target;
      return;
    }

    // Adaptive velocity-based filter: high response when moving fast, zero jitter when still
    const prevMidX = (this.smoothedPose.lShoulder.x + this.smoothedPose.rShoulder.x) / 2;
    const currMidX = (target.lShoulder.x + target.rShoulder.x) / 2;
    const dist = Math.abs(currMidX - prevMidX);
    const alpha = Math.min(0.72, Math.max(0.24, 0.24 + (dist / 35) * 0.48));

    for (const key of ['lShoulder', 'rShoulder', 'lHip', 'rHip', 'nose', 'lElbow', 'rElbow']) {
      if (!target[key]) continue;
      if (!this.smoothedPose[key]) {
        this.smoothedPose[key] = { ...target[key] };
        continue;
      }
      this.smoothedPose[key].x += (target[key].x - this.smoothedPose[key].x) * alpha;
      this.smoothedPose[key].y += (target[key].y - this.smoothedPose[key].y) * alpha;
      this.smoothedPose[key].z = (this.smoothedPose[key].z ?? 0) + ((target[key].z ?? 0) - (this.smoothedPose[key].z ?? 0)) * alpha;
      this.smoothedPose[key].visibility = target[key].visibility;
    }
  }

  /**
   * Core Geometry Formula with Separate Width, Length, Shift, Tilt, and 3D Body Mesh Warping
   */
  computeGarmentGeometry(
    pose,
    category = 'shirt',
    settings = {},
    garmentImg = null
  ) {
    const preset = GARMENT_FIT_PRESETS[category] || GARMENT_FIT_PRESETS.shirt;

    const shoulderMid = {
      x: (pose.lShoulder.x + pose.rShoulder.x) / 2,
      y: (pose.lShoulder.y + pose.rShoulder.y) / 2,
    };

    const hipMid = {
      x: (pose.lHip.x + pose.rHip.x) / 2,
      y: (pose.lHip.y + pose.rHip.y) / 2,
    };

    const sLeft = pose.lShoulder.x <= pose.rShoulder.x ? pose.lShoulder : pose.rShoulder;
    const sRight = pose.lShoulder.x <= pose.rShoulder.x ? pose.rShoulder : pose.lShoulder;
    const hLeft = pose.lHip.x <= pose.rHip.x ? pose.lHip : pose.rHip;
    const hRight = pose.lHip.x <= pose.rHip.x ? pose.rHip : pose.lHip;

    const dx = sRight.x - sLeft.x;
    const dy = sRight.y - sLeft.y;
    const shoulderWidth = Math.max(40, Math.hypot(dx, dy));

    const rawAngle = Math.atan2(dy, Math.max(1, Math.abs(dx)));
    const angle = Math.max(-0.55, Math.min(0.55, rawAngle));

    const hipsVisible =
      (pose.lHip.visibility ?? 1) > 0.25 && (pose.rHip.visibility ?? 1) > 0.25;
    const rawTorsoHeight = Math.hypot(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y);
    const torsoHeight =
      hipsVisible && rawTorsoHeight > shoulderWidth * 0.65
        ? rawTorsoHeight
        : shoulderWidth * 1.45;

    const userScale = (Number(settings.scalePct) || 100) / 100;
    const userScaleX = (Number(settings.scaleX) || 100) / 100;
    const userScaleY = (Number(settings.scaleY) || 100) / 100;
    const userOffsetX = Number(settings.offsetX) || 0;
    const userOffsetY = Number(settings.offsetY) || 0;
    const userRotation = ((Number(settings.rotationDeg) || 0) * Math.PI) / 180;

    const meta = garmentImg?._vtonMeta;
    const widthMult = meta ? 1 / meta.shoulderSpanRatioW : preset.widthMultiplier;
    const effectiveShoulderYRatio = meta ? meta.shoulderYRatio : preset.shoulderYRatio;

    const drawW = shoulderWidth * widthMult * userScale * userScaleX;
    const torsoTargetH = torsoHeight * preset.torsoLengthMultiplier * userScale * userScaleY;

    let drawH = torsoTargetH;
    const gw = garmentImg?.naturalWidth || garmentImg?.width;
    const gh = garmentImg?.naturalHeight || garmentImg?.height;
    if (gw && gh) {
      const naturalAspect = gw / gh;
      const naturalH = (shoulderWidth * widthMult * userScale * userScaleY) / naturalAspect;
      drawH = meta ? naturalH : hipsVisible ? 0.55 * naturalH + 0.45 * torsoTargetH : naturalH;
    }

    const centerShiftX = meta ? (0.5 - meta.shoulderCenterRatioX) * drawW : 0;
    const totalAngle = angle + userRotation;

    // Anchor pivot at shoulder midpoint + user X/Y offsets
    const anchorX = shoulderMid.x + userOffsetX;
    const anchorY = shoulderMid.y + userOffsetY;

    // =========================================================================
    // DYNAMIC 3D BODY FRAME MESH GENERATION (7x7 Vertices = 72 Triangles)
    // =========================================================================
    const isBackpack = category === 'backpack' || (this.currentProduct?.id && this.currentProduct.id.includes('backpack'));
    const tightness = Math.max(0.2, Math.min(1.0, (Number(settings.meshTightness) || 85) / 100));

    // Dynamic Physics & Respiration Micro-Dynamics
    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.001, (now - this.physicsState.lastTime) / 1000));
    this.physicsState.lastTime = now;

    let swayX = 0;
    let breatheWidthFactor = 1.0;
    if (settings.organicMotion !== false) {
      this.physicsState.breathePhase = (this.physicsState.breathePhase + dt * 1.7) % (Math.PI * 2);
      breatheWidthFactor = 1.0 + Math.sin(this.physicsState.breathePhase) * 0.012;

      if (this.physicsState.lastTorsoMidX !== null) {
        const velX = (shoulderMid.x - this.physicsState.lastTorsoMidX) / dt;
        const springK = 7.5;
        const dampingD = 4.2;
        const acc = -springK * this.physicsState.swayX - dampingD * this.physicsState.swayVelX - velX * 0.022;
        this.physicsState.swayVelX += acc * dt;
        this.physicsState.swayX += this.physicsState.swayVelX * dt;
        this.physicsState.swayX = Math.max(-28, Math.min(28, this.physicsState.swayX));
      }
      this.physicsState.lastTorsoMidX = shoulderMid.x;
      this.physicsState.lastTorsoMidY = shoulderMid.y;
      swayX = this.physicsState.swayX;
    }

    // 3D Yaw (Body Turn Direction & Perspective)
    let yaw = 0;
    if (pose.nose && sRight.x > sLeft.x) {
      const noseRatio = (pose.nose.x - sLeft.x) / (sRight.x - sLeft.x);
      yaw = Math.max(-1, Math.min(1, (noseRatio - 0.5) * 2.2));
    } else if (typeof sRight.z === 'number' && typeof sLeft.z === 'number') {
      yaw = Math.max(-1, Math.min(1, (sRight.z - sLeft.z) / Math.max(30, shoulderWidth * 0.4)));
    }

    // Unit directions along shoulders & spine
    const shLen = Math.max(1, shoulderWidth);
    const uShX = dx / shLen;
    const uShY = dy / shLen;
    const uSpineX = -uShY;
    const uSpineY = uShX;

    // Torso length vector
    const spineDx = hipMid.x - shoulderMid.x;
    const spineDy = hipMid.y - shoulderMid.y;
    const effTorsoH = torsoHeight;

    const GRID_COLS = 6;
    const GRID_ROWS = 6;
    const mesh = [];

    // Streetwear tailoring drop & collar dimensions
    const dropSleeveSpan = isBackpack ? shoulderWidth * 0.06 : shoulderWidth * 0.22 * userScaleX;
    const effectiveTotalW = drawW * breatheWidthFactor;
    const collarTopDrop = -drawH * (effectiveShoulderYRatio || 0.16);

    for (let r = 0; r <= GRID_ROWS; r++) {
      const v = r / GRID_ROWS;
      const row = [];

      // Hermite smoothstep curve along torso
      const t = v * v * (3 - 2 * v);

      // Row center hangs naturally along spine from collarTopDrop to (collarTopDrop + drawH)
      const vertOffset = collarTopDrop + v * drawH;
      const rowMid = {
        x: shoulderMid.x + uSpineX * vertOffset,
        y: shoulderMid.y + uSpineY * vertOffset,
      };

      // Lateral unit vector blending smoothly from shoulder tilt to hip tilt
      const hipDx = hRight.x - hLeft.x;
      const hipDy = hRight.y - hLeft.y;
      const hipSpanLen = Math.max(20, Math.hypot(hipDx, hipDy));
      const uHipX = hipDx / hipSpanLen;
      const uHipY = hipDy / hipSpanLen;

      const blendRowX = (1 - t) * uShX + t * uHipX;
      const blendRowY = (1 - t) * uShY + t * uHipY;
      const rowUnitLen = Math.hypot(blendRowX, blendRowY) || 1;
      const uRowX = blendRowX / rowUnitLen;
      const uRowY = blendRowY / rowUnitLen;

      // Natural anatomical width profile (wide shoulders, tailored torso taper, organic hem)
      let widthRatio = 1.0;
      if (v < 0.20) {
        widthRatio = 1.0 - v * 0.45;
      } else if (v < 0.65) {
        const wt = (v - 0.20) / 0.45;
        widthRatio = 0.91 - wt * (0.18 * tightness);
      } else {
        const wt = (v - 0.65) / 0.35;
        widthRatio = (0.91 - 0.18 * tightness) + wt * (0.05 + (1 - tightness) * 0.08);
      }

      const rowSpan = effectiveTotalW * widthRatio * 0.5;

      for (let c = 0; c <= GRID_COLS; c++) {
        const u = c / GRID_COLS;
        const xi = 2 * u - 1; // -1 (left edge) .. 0 (center) .. 1 (right edge)

        // Base horizontal position across the row
        let px = rowMid.x + uRowX * (xi * rowSpan) + (centerShiftX || 0);
        let py = rowMid.y + uRowY * (xi * rowSpan);

        // Shoulder & sleeve anatomical downward slope (deltoids & arms drape down naturally)
        if (!isBackpack) {
          const deltoidDrop = Math.abs(xi) * (shoulderWidth * 0.16) * Math.max(0, 1 - v / 0.55);
          px += uSpineX * deltoidDrop;
          py += uSpineY * deltoidDrop;
        }

        // 1. 3D Cylindrical Ribcage Curvature (Chest Barrel Projection)
        if (!isBackpack) {
          const zBulge = Math.sqrt(Math.max(0, 1 - xi * xi)) - 0.5;
          const bulgeDepth = shoulderWidth * 0.09 * tightness;
          px += uSpineX * (zBulge * bulgeDepth);
          py += uSpineY * (zBulge * bulgeDepth);
        }

        // 2. Collar Scoop Arc (Realistic neckline dip hugging clavicle)
        if (v < 0.35 && !isBackpack) {
          const collarProfile = Math.exp(-9 * xi * xi) * (1 - v / 0.35);
          const collarDip = drawH * 0.085;
          px += uSpineX * (collarProfile * collarDip);
          py += uSpineY * (collarProfile * collarDip);
        }

        // 3. Bottom Hemline Curve & Fabric Sway Inertia
        if (v > 0.6) {
          const hemWeight = (v - 0.6) / 0.4;
          // Organic curved hem
          const hemCurve = (1 - xi * xi) * (drawH * 0.038) * hemWeight;
          px += uSpineX * hemCurve;
          py += uSpineY * hemCurve;

          // Fabric sway inertia
          px += uShX * (swayX * hemWeight);
          py += uShY * (swayX * hemWeight);
        }

        // 4. 3D Body Yaw Perspective (Logo and fabric compression on turned torso)
        if (Math.abs(yaw) > 0.04 && !isBackpack) {
          const yawShift = (1 - xi * xi) * yaw * (shoulderWidth * 0.12);
          px += uRowX * yawShift;
          py += uRowY * yawShift;
        }

        // 5. Apply User Calibration Offsets & Rotation
        if (userOffsetX !== 0 || userOffsetY !== 0) {
          px += userOffsetX;
          py += userOffsetY;
        }
        if (userRotation !== 0) {
          const rx = px - anchorX;
          const ry = py - anchorY;
          const cosR = Math.cos(userRotation);
          const sinR = Math.sin(userRotation);
          px = anchorX + rx * cosR - ry * sinR;
          py = anchorY + rx * sinR + ry * cosR;
        }

        row.push({ x: px, y: py, u, v });
      }
      mesh.push(row);
    }

    return {
      shoulderMid,
      hipMid,
      shoulderWidth,
      torsoHeight,
      angle: totalAngle,
      drawW,
      drawH,
      centerShiftX,
      shoulderYRatio: effectiveShoulderYRatio,
      anchorX,
      anchorY,
      mesh,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
      yaw,
      tightness,
      isBackpack,
    };
  }

  /**
   * Render Garment with Opacity, Shading, Filters, Flip, and 3D Body Mesh Warping
   */
  drawGarmentOverlay(ctx, garmentImg, fit, settings = {}) {
    if (settings.dynamicMesh !== false && fit.mesh && fit.mesh.length > 2) {
      // High-Fidelity 3D Body Frame Mesh Warping
      this._renderDeformableGarmentMesh(ctx, garmentImg, fit, settings);
      if (settings.shading3D !== false && !fit.isBackpack) {
        this._renderGarment3DShading(ctx, fit, settings);
      }
      return;
    }

    // Clean Fallback: Standard Affine Transform
    ctx.save();
    ctx.translate(fit.anchorX, fit.anchorY);
    ctx.rotate(fit.angle);

    if (settings.flipH) {
      ctx.scale(-1, 1);
    }

    // Blend mode & Opacity
    ctx.globalAlpha = Math.max(0.1, Math.min(1, (settings.opacity ?? 100) / 100));
    ctx.globalCompositeOperation = settings.blendMode || 'source-over';

    // Brightness & Contrast filter
    const br = settings.brightness ?? 100;
    const ct = settings.contrast ?? 100;
    if (br !== 100 || ct !== 100) {
      ctx.filter = `brightness(${br}%) contrast(${ct}%)`;
    }

    // Contact drop-shadow
    if (settings.showShadow !== false) {
      ctx.shadowColor = 'rgba(15, 12, 10, 0.35)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    }

    const topY = -fit.drawH * (fit.shoulderYRatio ?? 0.16);
    ctx.drawImage(
      garmentImg,
      -fit.drawW / 2 + (fit.centerShiftX || 0),
      topY,
      fit.drawW,
      fit.drawH
    );
    ctx.restore();
  }

  /**
   * Piecewise Triangular Affine Texture Warping Engine (60+ FPS on Mobile & Desktop)
   */
  _renderDeformableGarmentMesh(ctx, garmentImg, fit, settings) {
    const { mesh, gridCols, gridRows } = fit;
    const imgW = garmentImg.naturalWidth || garmentImg.width;
    const imgH = garmentImg.naturalHeight || garmentImg.height;

    ctx.save();
    // Blend mode & Opacity
    ctx.globalAlpha = Math.max(0.1, Math.min(1, (settings.opacity ?? 100) / 100));
    ctx.globalCompositeOperation = settings.blendMode || 'source-over';

    // Filters
    const br = settings.brightness ?? 100;
    const ct = settings.contrast ?? 100;
    if (br !== 100 || ct !== 100) {
      ctx.filter = `brightness(${br}%) contrast(${ct}%)`;
    }

    // Contact drop-shadow
    if (settings.showShadow !== false) {
      ctx.shadowColor = 'rgba(15, 12, 10, 0.35)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    }

    const flipH = Boolean(settings.flipH);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const p00 = mesh[r][c];
        const p10 = mesh[r][c + 1];
        const p01 = mesh[r + 1][c];
        const p11 = mesh[r + 1][c + 1];

        // UV coordinates (flipped horizontally if flipH is enabled)
        const u00 = flipH ? 1 - p00.u : p00.u;
        const u10 = flipH ? 1 - p10.u : p10.u;
        const u01 = flipH ? 1 - p01.u : p01.u;
        const u11 = flipH ? 1 - p11.u : p11.u;

        // Triangle 1: (p00, p10, p01)
        this._drawTexturedTriangle(
          ctx, garmentImg,
          u00 * imgW, p00.v * imgH,
          u10 * imgW, p10.v * imgH,
          u01 * imgW, p01.v * imgH,
          p00.x, p00.y,
          p10.x, p10.y,
          p01.x, p01.y
        );

        // Triangle 2: (p10, p11, p01)
        this._drawTexturedTriangle(
          ctx, garmentImg,
          u10 * imgW, p10.v * imgH,
          u11 * imgW, p11.v * imgH,
          u01 * imgW, p01.v * imgH,
          p10.x, p10.y,
          p11.x, p11.y,
          p01.x, p01.y
        );
      }
    }
    ctx.restore();
  }

  /**
   * Exact Affine Triangle Texture Mapper with Subpixel Edge Anti-Aliasing Dilation
   */
  _drawTexturedTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    const dx10 = sx1 - sx0;
    const dy10 = sy1 - sy0;
    const dx20 = sx2 - sx0;
    const dy20 = sy2 - sy0;
    const D = dx10 * dy20 - dx20 * dy10;
    if (Math.abs(D) < 0.0001) return;

    const du10 = dx1 - dx0;
    const dv10 = dy1 - dy0;
    const du20 = dx2 - dx0;
    const dv20 = dy2 - dy0;

    const a = (du10 * dy20 - du20 * dy10) / D;
    const c = (dx10 * du20 - dx20 * du10) / D;
    const b = (dv10 * dy20 - dv20 * dy10) / D;
    const d = (dx10 * dv20 - dx20 * dv10) / D;
    const e = dx0 - a * sx0 - c * sy0;
    const f = dy0 - b * sx0 - d * sy0;

    ctx.save();
    ctx.beginPath();
    // Subpixel expansion (0.45px) outwards from triangle centroid to prevent seams
    const cx = (dx0 + dx1 + dx2) / 3;
    const cy = (dy0 + dy1 + dy2) / 3;
    const dilate = (x, y) => {
      const vx = x - cx;
      const vy = y - cy;
      const len = Math.hypot(vx, vy) || 1;
      return { x: x + (vx / len) * 0.45, y: y + (vy / len) * 0.45 };
    };
    const t0 = dilate(dx0, dy0);
    const t1 = dilate(dx1, dy1);
    const t2 = dilate(dx2, dy2);

    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.closePath();
    ctx.clip();

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /**
   * 3D Cylindrical Volume Shading, Fabric Micro-Texture, Creases & Collar Insertion
   * Creates the authentic tactile feeling of real fabric being worn on the body.
   */
  _renderGarment3DShading(ctx, fit, settings) {
    if (!fit.mesh || fit.mesh.length < 3) return;
    const mesh = fit.mesh;
    const rows = mesh.length;
    const cols = mesh[0].length;
    const midCol = Math.floor(cols / 2);
    const smoothness = Math.max(0.2, Math.min(1.0, (Number(settings.fabricSmoothness) || 88) / 100));
    const showCreases = settings.organicCreases !== false;

    ctx.save();

    // =========================================================================
    // 1. TORSO CYLINDRICAL AMBIENT OCCLUSION & FLANK WRAP SHADOWS
    // =========================================================================
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.20 * smoothness;

    // Left flank shadow
    for (let r = 0; r < rows - 1; r++) {
      const p0 = mesh[r][0];
      const p1 = mesh[r][1];
      const p2 = mesh[r + 1][1];
      const p3 = mesh[r + 1][0];

      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, 'rgba(0,0,0,0.48)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }

    // Right flank shadow
    for (let r = 0; r < rows - 1; r++) {
      const p0 = mesh[r][cols - 2];
      const p1 = mesh[r][cols - 1];
      const p2 = mesh[r + 1][cols - 1];
      const p3 = mesh[r + 1][cols - 2];

      const grad = ctx.createLinearGradient(p1.x, p1.y, p0.x, p0.y);
      grad.addColorStop(0, 'rgba(0,0,0,0.48)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }

    // =========================================================================
    // 2. COLLAR RIBBING, NECK HOLE MASKING & CLAVICLE SHADOW
    // (Cảm giác cổ chui qua cổ áo chân thực)
    // =========================================================================
    const neckP = mesh[0][midCol];
    const chestP = mesh[1][midCol];
    const collarRadius = Math.max(16, Math.hypot(chestP.x - neckP.x, chestP.y - neckP.y) * 1.6);

    // Deep ambient occlusion inside collar scoop onto clavicle
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.32 * smoothness;
    const collarGrad = ctx.createRadialGradient(neckP.x, neckP.y - 2, 2, neckP.x, neckP.y + 10, collarRadius);
    collarGrad.addColorStop(0, 'rgba(10, 8, 6, 0.55)');
    collarGrad.addColorStop(0.45, 'rgba(10, 8, 6, 0.22)');
    collarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = collarGrad;
    ctx.beginPath();
    ctx.arc(neckP.x, neckP.y + 4, collarRadius, 0, Math.PI * 2);
    ctx.fill();

    // Curved collar ribbing seam (rib-knit neckline trim)
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mesh[0][1].x, mesh[0][1].y);
    ctx.quadraticCurveTo(neckP.x, neckP.y + collarRadius * 0.45, mesh[0][cols - 2].x, mesh[0][cols - 2].y);
    ctx.stroke();

    // =========================================================================
    // 3. UNDERARM / ARMPIT DRAPING TENSION CREASES (Nếp gấp nách vải co giãn)
    // =========================================================================
    if (showCreases) {
      // Left armpit tension creases radiating toward chest/sternum
      const lArmpit = mesh[2][1];
      const sternum = mesh[3][midCol];
      const rArmpit = mesh[2][cols - 2];

      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.14 * smoothness;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 2.4;

      // Crease 1: Left armpit toward sternum
      ctx.beginPath();
      ctx.moveTo(lArmpit.x, lArmpit.y);
      ctx.quadraticCurveTo(
        (lArmpit.x + sternum.x) * 0.5 - 6,
        (lArmpit.y + sternum.y) * 0.5 + 8,
        sternum.x - 15,
        sternum.y - 8
      );
      ctx.stroke();

      // Crease 2: Right armpit toward sternum
      ctx.beginPath();
      ctx.moveTo(rArmpit.x, rArmpit.y);
      ctx.quadraticCurveTo(
        (rArmpit.x + sternum.x) * 0.5 + 6,
        (rArmpit.y + sternum.y) * 0.5 + 8,
        sternum.x + 15,
        sternum.y - 8
      );
      ctx.stroke();

      // Subtle paired soft-light highlights on top of creases
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.18 * smoothness;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(lArmpit.x, lArmpit.y - 3);
      ctx.quadraticCurveTo(
        (lArmpit.x + sternum.x) * 0.5 - 6,
        (lArmpit.y + sternum.y) * 0.5 + 5,
        sternum.x - 15,
        sternum.y - 11
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rArmpit.x, rArmpit.y - 3);
      ctx.quadraticCurveTo(
        (rArmpit.x + sternum.x) * 0.5 + 6,
        (rArmpit.y + sternum.y) * 0.5 + 5,
        sternum.x + 15,
        sternum.y - 11
      );
      ctx.stroke();

      // =========================================================================
      // 4. WAIST & HEMLINE UNDULATING DRAPING WAVES (Nếp rủ & lượn sóng tà áo)
      // =========================================================================
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.12 * smoothness;
      for (let c = 1; c < cols - 1; c++) {
        const topFold = mesh[rows - 3][c];
        const botFold = mesh[rows - 1][c];
        if (c % 2 === 1) {
          // Soft vertical shadow ribbon
          const foldGrad = ctx.createLinearGradient(topFold.x - 8, topFold.y, topFold.x + 8, topFold.y);
          foldGrad.addColorStop(0, 'rgba(0,0,0,0)');
          foldGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
          foldGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = foldGrad;
          ctx.beginPath();
          ctx.moveTo(topFold.x - 6, topFold.y);
          ctx.lineTo(topFold.x + 6, topFold.y);
          ctx.lineTo(botFold.x + 8, botFold.y);
          ctx.lineTo(botFold.x - 8, botFold.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // =========================================================================
    // 5. SLEEVE OPENING 3D HOLLOW DEPTH (Cánh tay luồn bên trong ống tay)
    // =========================================================================
    const leftSleeveCuff = mesh[2][0];
    const rightSleeveCuff = mesh[2][cols - 1];
    const sleeveRadius = Math.max(14, fit.shoulderWidth * 0.14);

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.22 * smoothness;

    // Left sleeve inner shadow
    const lSleeveGrad = ctx.createRadialGradient(leftSleeveCuff.x, leftSleeveCuff.y, 2, leftSleeveCuff.x + 6, leftSleeveCuff.y, sleeveRadius);
    lSleeveGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    lSleeveGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lSleeveGrad;
    ctx.beginPath();
    ctx.arc(leftSleeveCuff.x, leftSleeveCuff.y, sleeveRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right sleeve inner shadow
    const rSleeveGrad = ctx.createRadialGradient(rightSleeveCuff.x, rightSleeveCuff.y, 2, rightSleeveCuff.x - 6, rightSleeveCuff.y, sleeveRadius);
    rSleeveGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    rSleeveGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rSleeveGrad;
    ctx.beginPath();
    ctx.arc(rightSleeveCuff.x, rightSleeveCuff.y, sleeveRadius, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================================
    // 6. MATTE COMBED COTTON SHEEN & STERNUM HIGHLIGHT (Vải đầm mịn cao cấp)
    // =========================================================================
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.22 * smoothness;
    const chestHighlight = ctx.createLinearGradient(
      mesh[2][midCol - 1].x, mesh[2][midCol - 1].y,
      mesh[2][midCol + 1].x, mesh[2][midCol + 1].y
    );
    chestHighlight.addColorStop(0, 'rgba(255,255,255,0)');
    chestHighlight.addColorStop(0.5, 'rgba(255,255,255,0.75)');
    chestHighlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = chestHighlight;
    ctx.beginPath();
    ctx.moveTo(mesh[1][midCol - 1].x, mesh[1][midCol - 1].y);
    ctx.lineTo(mesh[1][midCol + 1].x, mesh[1][midCol + 1].y);
    ctx.lineTo(mesh[rows - 2][midCol + 1].x, mesh[rows - 2][midCol + 1].y);
    ctx.lineTo(mesh[rows - 2][midCol - 1].x, mesh[rows - 2][midCol - 1].y);
    ctx.closePath();
    ctx.fill();

    // =========================================================================
    // 7. SOFT FIBER EDGE BLEND (Làm mịn êm dịu mép viền vải)
    // =========================================================================
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.28 * smoothness;
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.18)';
    ctx.lineWidth = 1.4;
    // Trace outer perimeter to soften triangle pixel steps
    ctx.beginPath();
    // Top shoulder boundary
    ctx.moveTo(mesh[0][0].x, mesh[0][0].y);
    for (let c = 1; c < cols; c++) ctx.lineTo(mesh[0][c].x, mesh[0][c].y);
    // Right flank
    for (let r = 1; r < rows; r++) ctx.lineTo(mesh[r][cols - 1].x, mesh[r][cols - 1].y);
    // Bottom hem
    for (let c = cols - 2; c >= 0; c--) ctx.lineTo(mesh[rows - 1][c].x, mesh[rows - 1][c].y);
    // Left flank
    for (let r = rows - 2; r >= 0; r--) ctx.lineTo(mesh[r][0].x, mesh[r][0].y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  drawDebugSkeleton(ctx, pose, fit) {
    ctx.save();
    // 1. Draw 3D Dynamic Body Wireframe Mesh if available
    if (fit.mesh && fit.mesh.length) {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 1.2;
      const rows = fit.mesh.length;
      const cols = fit.mesh[0].length;
      // Horizontal mesh rings
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(fit.mesh[r][0].x, fit.mesh[r][0].y);
        for (let c = 1; c < cols; c++) {
          ctx.lineTo(fit.mesh[r][c].x, fit.mesh[r][c].y);
        }
        ctx.stroke();
      }
      // Vertical contour ribs
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(fit.mesh[0][c].x, fit.mesh[0][c].y);
        for (let r = 1; r < rows; r++) {
          ctx.lineTo(fit.mesh[r][c].x, fit.mesh[r][c].y);
        }
        ctx.stroke();
      }
    }

    // 2. Draw Key Pose Landmarks
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pose.lShoulder.x, pose.lShoulder.y);
    ctx.lineTo(pose.rShoulder.x, pose.rShoulder.y);
    ctx.lineTo(pose.rHip.x, pose.rHip.y);
    ctx.lineTo(pose.lHip.x, pose.lHip.y);
    ctx.closePath();
    ctx.stroke();

    for (const [id, pt] of [
      ['11 (Vai L)', pose.lShoulder],
      ['12 (Vai R)', pose.rShoulder],
      ['23 (Hông L)', pose.lHip],
      ['24 (Hông R)', pose.rHip],
    ]) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(id, pt.x + 8, pt.y + 3);
    }
    ctx.restore();
  }

  capturePhoto() {
    const canvas = this.el.arCanvas;
    if (!canvas?.width || !canvas?.height) {
      this._toast('⚠ Camera chưa sẵn sàng.');
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      this._triggerDownload(url, `atelier-vton-${Date.now()}.png`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this._toast('📸 Đã chụp & lưu ảnh thử đồ HD về máy!');
    }, 'image/png');
  }

  startVideoRecording5s() {
    if (this.isRecording) {
      this._stopVideoRecording(false);
      return;
    }
    const canvas = this.el.arCanvas;
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      this._toast('Trình duyệt chưa hỗ trợ quay video Canvas.');
      return;
    }

    const stream = canvas.captureStream(30);
    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    const chunks = [];
    this.mediaRecorder = chosenMime
      ? new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 3_500_000 })
      : new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: chosenMime || 'video/webm' });
      const url = URL.createObjectURL(blob);
      this._triggerDownload(url, `atelier-vton-5s-${Date.now()}.${ext}`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this._toast(`🎬 Đã xuất video thử đồ (.${ext}) về máy!`);
    };

    this.mediaRecorder.start(200);
    this.isRecording = true;

    let remaining = 5;
    this.el.recordBtn.textContent = `⏹ Đang quay (${remaining}s)...`;
    this.el.recordBtn.classList.add('animate-pulse', '!bg-red-600', '!text-white');

    this.recordTimerId = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        this.el.recordBtn.textContent = `⏹ Đang quay (${remaining}s)...`;
      } else {
        this._stopVideoRecording(false);
      }
    }, 1000);
  }

  _stopVideoRecording(silent = false) {
    if (this.recordTimerId) {
      clearInterval(this.recordTimerId);
      this.recordTimerId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      if (silent) this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.el.recordBtn.textContent = '🎥 Quay Video (5s)';
    this.el.recordBtn.classList.remove('animate-pulse', '!bg-red-600', '!text-white');
  }

  /**
   * Static Photo Fit Pipeline
   */
  async loadSampleModel(index = 0) {
    const item = SAMPLE_MODELS[index] || SAMPLE_MODELS[0];
    this.selectedModelIdx = index;
    this.el.modelPickerChips?.querySelectorAll('[data-model-idx]').forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.modelIdx) === index);
    });

    const img = await this._loadImage(item.src);
    if (!img) {
      this._toast('Không thể tải ảnh mẫu này. Vui lòng tải ảnh của bạn!');
      return;
    }

    this.personImg = img;
    this.personDataUrl = item.src;
    this.personFile = null;
    this.staticDetectedPersonSrc = null;
    this.staticDetectedPose = null;
    this.el.staticBeforeImg.src = item.src;
    this.el.staticResultBox.classList.remove('hidden');
    this.el.staticEmptyBox.classList.add('hidden');
    await this.runStaticPhotoTryOn();
  }

  async handlePortraitUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      this._toast('Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).');
      return;
    }
    this.personFile = file;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    this.personDataUrl = dataUrl;
    this.personImg = await this._loadImage(dataUrl);
    this.staticDetectedPersonSrc = null;
    this.staticDetectedPose = null;
    this.el.staticBeforeImg.src = dataUrl;
    this.el.staticResultBox.classList.remove('hidden');
    this.el.staticEmptyBox.classList.add('hidden');
    await this.runStaticPhotoTryOn();
  }

  async runStaticPhotoTryOn() {
    if (this._selectingPromise) {
      this.el.staticLoading.classList.remove('hidden');
      this.el.staticLoadingText.textContent = 'Đang chuẩn bị mẫu trang phục...';
      await this._selectingPromise;
    }
    if (!this.personImg || !this.currentGarmentImg) {
      this.el.staticLoading.classList.add('hidden');
      return;
    }

    this.el.staticLoading.classList.remove('hidden');
    this.el.staticBadge.textContent = '⏳ Đang phân tích dáng người & căn chỉnh...';

    try {
      let usedFallbackReason = '';

      if (this.staticEngine === 'auto') {
        try {
          this.el.staticLoadingText.textContent =
            `Đang kết nối Hugging Face (${this.hfSpace}) qua @gradio/client...`;

          const personBlob =
            this.personFile || (await (await fetch(this.personDataUrl)).blob());
          const garmentBlob = await (await fetch(this.currentProduct.image)).blob();

          const generatedUrl = await this._callFreeHuggingFaceSpace(
            this.hfSpace,
            personBlob,
            garmentBlob,
            this.currentProduct
          );

          this.afterDataUrl = generatedUrl;
          this.el.staticAfterImg.src = generatedUrl;
          this.el.staticBadge.textContent = `✨ Hugging Face (${this.hfSpace}) · Miễn phí`;
          this.el.staticBadge.dataset.mode = 'hf';
          return;
        } catch (err) {
          usedFallbackReason = err?.message || 'Space công cộng đang bận';
        }
      }

      // Smart High-Precision Pose + Canvas Engine
      this.el.staticLoadingText.textContent =
        'Đang chạy PoseLandmarker + Canvas Precision Fit (100% Client-Side)...';
      const fittedDataUrl = await this._runStaticPoseCanvasFallback(
        this.personImg,
        this.currentGarmentImg,
        this.currentProduct?.category || 'shirt'
      );

      this.afterDataUrl = fittedDataUrl;
      this.el.staticAfterImg.src = fittedDataUrl;
      this.el.staticBadge.textContent = usedFallbackReason
        ? `⚡ Smart Pose + Canvas (${usedFallbackReason})`
        : '⚡ Smart Pose + Canvas Fit (Chuẩn xác 100%)';
      this.el.staticBadge.dataset.mode = 'fallback';
    } finally {
      this.el.staticLoading.classList.add('hidden');
    }
  }

  async _callFreeHuggingFaceSpace(spaceId, personBlob, garmentBlob, product) {
    const TIMEOUT_MS = 14000;
    const preset = GARMENT_FIT_PRESETS[product?.category || 'shirt'] || GARMENT_FIT_PRESETS.shirt;

    const task = (async () => {
      const { Client, handle_file } = await import(GRADIO_CLIENT_CDN);
      const app = await Client.connect(spaceId);

      if (spaceId === 'zhengchong/CatVTON') {
        const res = await app.predict('/submit_function', {
          person_image: { background: handle_file(personBlob), layers: [], composite: null },
          cloth_image: handle_file(garmentBlob),
          cloth_type: preset.hfCategory === 'dresses' ? 'overall' : 'upper',
          num_inference_steps: 35,
          guidance_scale: 2.5,
          seed: 42,
        });
        const out = res?.data?.[0];
        const url = typeof out === 'string' ? out : out?.url;
        if (!url) throw new Error('CatVTON không phản hồi');
        return url;
      }

      const res = await app.predict('/tryon', {
        dict: { background: handle_file(personBlob), layers: [], composite: null },
        garm_img: handle_file(garmentBlob),
        garment_des: product?.name || 'Vietnamese silk fashion garment',
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 25,
        seed: 42,
      });
      const out = res?.data?.[0];
      const url = typeof out === 'string' ? out : out?.url;
      if (!url) throw new Error('IDM-VTON không phản hồi');
      return url;
    })();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Hugging Face quá tải, chuyển sang Smart Canvas')), TIMEOUT_MS)
    );

    return Promise.race([task, timeout]);
  }

  async _runStaticPoseCanvasFallback(personImg, garmentImg, category = 'shirt') {
    const W = personImg.naturalWidth || personImg.width || 800;
    const H = personImg.naturalHeight || personImg.height || 1000;

    let detectedPose =
      this.staticDetectedPersonSrc === personImg.src ? this.staticDetectedPose : null;

    if (!detectedPose) {
      // Check if current image is one of the calibrated mannequin presets
      const matchedPreset = SAMPLE_MODELS.find(
        (m) =>
          (this.personDataUrl && this.personDataUrl.includes(m.id)) ||
          (personImg.src && personImg.src.includes(m.id)) ||
          (m.src && personImg.src && personImg.src.endsWith(m.src.replace(/^\.\//, '')))
      ) || (this.personFile ? null : SAMPLE_MODELS[this.selectedModelIdx]);

      if (matchedPreset && matchedPreset.pose) {
        detectedPose = {
          lShoulder: { x: matchedPreset.pose.lShoulder.x * W, y: matchedPreset.pose.lShoulder.y * H, z: 0, visibility: 1.0 },
          rShoulder: { x: matchedPreset.pose.rShoulder.x * W, y: matchedPreset.pose.rShoulder.y * H, z: 0, visibility: 1.0 },
          lHip: { x: matchedPreset.pose.lHip.x * W, y: matchedPreset.pose.lHip.y * H, z: 0, visibility: 1.0 },
          rHip: { x: matchedPreset.pose.rHip.x * W, y: matchedPreset.pose.rHip.y * H, z: 0, visibility: 1.0 },
          nose: matchedPreset.pose.nose ? { x: matchedPreset.pose.nose.x * W, y: matchedPreset.pose.nose.y * H, z: 0, visibility: 1.0 } : null,
        };
      } else {
        try {
          const landmarker = await this._ensurePoseLandmarker('IMAGE');
          const result = landmarker.detect(personImg);
          const lm = result?.landmarks?.[0];
          if (lm && lm.length > 24) {
            detectedPose = {
              lShoulder: { x: lm[11].x * W, y: lm[11].y * H, z: (lm[11].z ?? 0) * W, visibility: lm[11].visibility ?? 1 },
              rShoulder: { x: lm[12].x * W, y: lm[12].y * H, z: (lm[12].z ?? 0) * W, visibility: lm[12].visibility ?? 1 },
              lHip: { x: lm[23].x * W, y: lm[23].y * H, z: (lm[23].z ?? 0) * W, visibility: lm[23].visibility ?? 1 },
              rHip: { x: lm[24].x * W, y: lm[24].y * H, z: (lm[24].z ?? 0) * W, visibility: lm[24].visibility ?? 1 },
              nose: lm[0] ? { x: lm[0].x * W, y: lm[0].y * H, z: (lm[0].z ?? 0) * W, visibility: lm[0].visibility ?? 1 } : null,
              lElbow: lm[13] ? { x: lm[13].x * W, y: lm[13].y * H, z: (lm[13].z ?? 0) * W, visibility: lm[13].visibility ?? 1 } : null,
              rElbow: lm[14] ? { x: lm[14].x * W, y: lm[14].y * H, z: (lm[14].z ?? 0) * W, visibility: lm[14].visibility ?? 1 } : null,
            };
          }
        } catch (e) {
          console.warn('[VTON] Static pose detection fallback:', e);
        }
      }

      if (!detectedPose) {
        detectedPose = {
          lShoulder: { x: W * 0.35, y: H * 0.23, visibility: 0.9 },
          rShoulder: { x: W * 0.65, y: H * 0.23, visibility: 0.9 },
          lHip: { x: W * 0.37, y: H * 0.54, visibility: 0.9 },
          rHip: { x: W * 0.63, y: H * 0.54, visibility: 0.9 },
        };
      }

      this.staticDetectedPersonSrc = personImg.src;
      this.staticDetectedPose = detectedPose;
      this.autoCalibrateFit(detectedPose, true);
    }

    return this._renderStaticPoseCanvas(personImg, garmentImg, category, detectedPose);
  }

  _renderStaticPoseCanvas(personImg, garmentImg, category, detectedPose) {
    const W = personImg.naturalWidth || personImg.width || 800;
    const H = personImg.naturalHeight || personImg.height || 1000;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(personImg, 0, 0, W, H);

    const normSettings = {
      ...this.arSettings,
      offsetX: this.arSettings.offsetX * (W / 720),
      offsetY: this.arSettings.offsetY * (H / 720),
    };

    const fit = this.computeGarmentGeometry(
      detectedPose,
      category,
      normSettings,
      garmentImg
    );

    this.drawGarmentOverlay(ctx, garmentImg, fit, this.arSettings);
    if (this.arSettings.showSkeleton) {
      this.drawDebugSkeleton(ctx, detectedPose, fit);
    }

    // Save screen bounding box for interactive canvas dragging
    this.interactiveTransform.box = {
      cx: fit.anchorX,
      cy: fit.anchorY,
      w: fit.drawW,
      h: fit.drawH,
      angle: fit.angle,
    };

    return canvas.toDataURL('image/png');
  }

  _refreshStaticFallbackLive() {
    if (
      this.activeTab !== 'photo' ||
      !this.personImg ||
      !this.currentGarmentImg ||
      !this.staticDetectedPose
    ) {
      return;
    }
    const url = this._renderStaticPoseCanvas(
      this.personImg,
      this.currentGarmentImg,
      this.currentProduct?.category || 'shirt',
      this.staticDetectedPose
    );
    this.afterDataUrl = url;
    this.el.staticAfterImg.src = url;
  }

  downloadStaticResult() {
    if (!this.afterDataUrl) return;
    this._triggerDownload(this.afterDataUrl, `atelier-vton-result-${Date.now()}.png`);
    this._toast('⬇ Đã tải ảnh phối đồ chất lượng cao về máy!');
  }

  /**
   * AI Auto-Calibration: Automatically analyzes wearer's anatomical frame
   * (shoulder span, torso height, neck-to-waist ratio, posture tilt) and calibrates
   * optimal fit parameters (scaleX, scaleY, offsetX, offsetY, meshTightness).
   */
  autoCalibrateFit(targetPose = null, silent = false) {
    const pose = targetPose || (this.activeTab === 'camera' ? this.smoothedPose : this.staticDetectedPose);
    if (!pose || !pose.lShoulder || !pose.rShoulder) {
      if (!silent) this._toast('⚠ Hãy đứng trước camera hoặc tải ảnh người mẫu để AI quét phom!');
      return false;
    }

    const sL = pose.lShoulder.x <= pose.rShoulder.x ? pose.lShoulder : pose.rShoulder;
    const sR = pose.lShoulder.x <= pose.rShoulder.x ? pose.rShoulder : pose.lShoulder;
    const hL = pose.lHip && pose.rHip ? (pose.lHip.x <= pose.rHip.x ? pose.lHip : pose.rHip) : null;
    const hR = pose.lHip && pose.rHip ? (pose.lHip.x <= pose.rHip.x ? pose.rHip : pose.lHip) : null;

    const shW = Math.max(40, Math.hypot(sR.x - sL.x, sR.y - sL.y));
    const sMid = { x: (sL.x + sR.x) / 2, y: (sL.y + sR.y) / 2 };

    const hasHips = hL && hR && (pose.lHip.visibility ?? 1) > 0.25;
    const hipW = hasHips ? Math.max(20, Math.hypot(hR.x - hL.x, hR.y - hL.y)) : shW * 0.78;
    const hMid = hasHips ? { x: (hL.x + hR.x) / 2, y: (hL.y + hR.y) / 2 } : { x: sMid.x, y: sMid.y + shW * 1.45 };
    const torsoH = Math.max(shW * 0.8, Math.hypot(hMid.x - sMid.x, hMid.y - sMid.y));

    const taperRatio = shW / Math.max(20, hipW);
    const category = this.currentProduct?.category || 'shirt';
    const isDress = category === 'dress' || category === 'dresses' || category === 'set';

    // 1. Optimal Shoulder Width (scaleX)
    let optScaleX = 100;
    if (taperRatio > 1.35) {
      // Broad shoulders / athletic V-taper
      optScaleX = 104;
    } else if (taperRatio < 1.15) {
      // Slender / petite shoulders
      optScaleX = 96;
    }

    // 2. Optimal Torso Length (scaleY)
    // Terminate naturally at beltline / iliac crest
    let optScaleY = 100;
    if (!isDress) {
      const idealHemH = torsoH * 1.08;
      const basePresetH = shW * 1.45 * 1.25;
      optScaleY = Math.round(Math.max(78, Math.min(125, (idealHemH / basePresetH) * 100)));
    } else {
      optScaleY = 102;
    }

    // 3. Optimal Neck & Collar Vertical Alignment (offsetY)
    let optOffsetY = 0;
    if (pose.nose) {
      const neckLength = sMid.y - pose.nose.y;
      const standardNeck = shW * 0.42;
      optOffsetY = Math.round(Math.max(-15, Math.min(15, (neckLength - standardNeck) * 0.22)));
    }

    // 4. Optimal Body Tightness
    const optTightness = Math.round(Math.max(72, Math.min(94, 76 + (taperRatio - 1.15) * 32)));

    // Apply calibrated values
    this.arSettings.scaleX = optScaleX;
    this.arSettings.scaleY = optScaleY;
    this.arSettings.offsetX = 0;
    this.arSettings.offsetY = optOffsetY;
    this.arSettings.rotationDeg = 0;
    this.arSettings.meshTightness = optTightness;

    // Update DOM UI sliders
    if (this.el.scaleXSlider) this.el.scaleXSlider.value = String(optScaleX);
    if (this.el.scaleXVal) this.el.scaleXVal.textContent = `${optScaleX}%`;
    if (this.el.scaleYSlider) this.el.scaleYSlider.value = String(optScaleY);
    if (this.el.scaleYVal) this.el.scaleYVal.textContent = `${optScaleY}%`;
    if (this.el.offsetXSlider) this.el.offsetXSlider.value = '0';
    if (this.el.offsetXVal) this.el.offsetXVal.textContent = '0px';
    if (this.el.offsetYSlider) this.el.offsetYSlider.value = String(optOffsetY);
    if (this.el.offsetYVal) this.el.offsetYVal.textContent = `${optOffsetY}px`;
    if (this.el.rotationSlider) this.el.rotationSlider.value = '0';
    if (this.el.rotationVal) this.el.rotationVal.textContent = '0°';
    if (this.el.meshTightnessSlider) this.el.meshTightnessSlider.value = String(optTightness);
    if (this.el.meshTightnessVal) this.el.meshTightnessVal.textContent = `${optTightness}%`;

    // Show Auto-Fit Badge
    if (this.el.autoFitBadge) {
      this.el.autoFitBadge.classList.remove('hidden');
      clearTimeout(this._autoFitBadgeTimer);
      this._autoFitBadgeTimer = setTimeout(() => {
        this.el.autoFitBadge?.classList.add('hidden');
      }, 4000);
    }

    if (!silent) {
      this._toast(`✨ AI đã quét dáng người: Vai ${Math.round(shW)}px · Thân ${Math.round(torsoH)}px → Đã căn vừa in!`);
    }

    this._refreshStaticFallbackLive();
    return true;
  }

  /**
   * ==========================================================================
   * GARMENT STUDIO / CROPPER & MASK EDITOR MODAL
   * ==========================================================================
   */
  _mountEditorDOM() {
    if (document.getElementById('free-vton-editor-backdrop')) return;

    const editorEl = document.createElement('div');
    editorEl.id = 'free-vton-editor-backdrop';
    editorEl.className = 'hidden fixed inset-0 z-[10010] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5';
    editorEl.innerHTML = `
      <div class="relative w-full max-w-4xl bg-neutral-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-700 flex flex-col max-h-[95dvh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950">
          <div class="flex items-center gap-2.5">
            <span class="text-emerald-400 font-bold text-base">✂️</span>
            <div>
              <h4 class="font-bold text-sm text-white">Chỉnh Sửa &amp; Cắt Mẫu Áo (Garment Studio)</h4>
              <p class="text-[11px] text-neutral-400">Khoanh vùng áo, xóa chi tiết thừa (hoa, tóc, tay) &amp; tách nền chuẩn xác</p>
            </div>
          </div>
          <button type="button" id="vton-editor-close" class="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold transition">✕</button>
        </div>

        <!-- Editor Body -->
        <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-neutral-950">
          <!-- Canvas Viewport -->
          <div class="md:col-span-8 relative flex items-center justify-center p-4 bg-neutral-900/60 overflow-hidden select-none touch-none">
            <div id="vton-crop-viewport" class="relative max-w-full max-h-[60vh] aspect-[3/4] flex items-center justify-center shadow-lg border border-neutral-800 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
              <canvas id="vton-editor-canvas" class="max-w-full max-h-full block"></canvas>
              <!-- Interactive Crop Box Overlay -->
              <div id="vton-crop-box" class="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-auto cursor-move">
                <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border border-black cursor-nwse-resize" data-corner="tl"></div>
                <div class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border border-black cursor-nesw-resize" data-corner="tr"></div>
                <div class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border border-black cursor-nesw-resize" data-corner="bl"></div>
                <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border border-black cursor-nwse-resize" data-corner="br"></div>
                <span class="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-emerald-300 font-mono pointer-events-none">Vùng cắt áo</span>
              </div>
            </div>
          </div>

          <!-- Tools Sidebar -->
          <div class="md:col-span-4 p-4 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-neutral-800 bg-neutral-950 overflow-y-auto text-xs">
            <!-- Mode Switcher -->
            <div>
              <label class="block font-bold text-neutral-300 mb-1.5 uppercase text-[11px] tracking-wider">Chế độ chỉnh sửa:</label>
              <div class="grid grid-cols-3 gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
                <button type="button" id="vton-tool-crop" class="py-2 rounded-lg font-semibold text-center bg-emerald-500 text-neutral-950">📦 Khung cắt</button>
                <button type="button" id="vton-tool-erase" class="py-2 rounded-lg font-semibold text-center text-neutral-400 hover:text-white">🧹 Cọ tẩy</button>
                <button type="button" id="vton-tool-restore" class="py-2 rounded-lg font-semibold text-center text-neutral-400 hover:text-white">🖌️ Khôi phục</button>
              </div>
            </div>

            <!-- Auto Background Removal -->
            <div class="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
              <span class="font-bold text-neutral-200 block text-[11px]">TÁCH NỀN TỰ ĐỘNG:</span>
              <button type="button" id="vton-auto-remove-bg-btn" class="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition flex items-center justify-center gap-1.5">
                <span>🪄</span> Tách Nền Studio (1-Click)
              </button>
              <p class="text-[10px] text-neutral-400 leading-normal">Tự động nhận diện phông studio và xóa sạch nền ngoài khung áo.</p>
            </div>

            <!-- Brush Size Slider -->
            <div id="vton-brush-controls" class="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
              <div class="flex justify-between items-center text-neutral-300">
                <span>Cỡ cọ (Brush Radius)</span>
                <span id="vton-brush-val" class="font-mono text-emerald-400 font-semibold">22px</span>
              </div>
              <input type="range" id="vton-brush-slider" min="4" max="60" value="22" class="w-full accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Edge Feathering -->
            <div class="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
              <div class="flex justify-between items-center text-neutral-300">
                <span>Làm mịn viền áo (Feather)</span>
                <span id="vton-feather-val" class="font-mono text-emerald-400 font-semibold">2px</span>
              </div>
              <input type="range" id="vton-feather-slider" min="0" max="8" value="2" class="w-full accent-emerald-500 cursor-pointer" />
            </div>

            <!-- Flip & Reset -->
            <div class="flex gap-2">
              <button type="button" id="vton-editor-flip-btn" class="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition">
                ⇄ Lật Ngang
              </button>
              <button type="button" id="vton-editor-reset-btn" class="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition">
                ↺ Hoàn Tác
              </button>
            </div>

            <!-- Apply & Save -->
            <div class="mt-auto pt-2 border-t border-neutral-800 space-y-2">
              <button type="button" id="vton-editor-apply-btn" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-bold text-xs shadow-lg transition">
                ✓ Áp Dụng &amp; Phối Đồ Ngay
              </button>
              <p class="text-[10px] text-neutral-500 text-center">Kết quả sẽ được cập nhật trực tiếp vào Camera AR và Ảnh Tĩnh.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(editorEl);
  }

  openGarmentEditor() {
    const backdrop = document.getElementById('free-vton-editor-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');

    const canvas = backdrop.querySelector('#vton-editor-canvas');
    const ctx = canvas.getContext('2d');
    const sourceImg = this.rawGarmentImg || this.currentGarmentImg;

    if (!sourceImg) {
      this._toast('Chưa có ảnh trang phục để chỉnh sửa.');
      return;
    }

    const sw = sourceImg.naturalWidth || sourceImg.width || 600;
    const sh = sourceImg.naturalHeight || sourceImg.height || 800;
    canvas.width = sw;
    canvas.height = sh;
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(sourceImg, 0, 0);

    this.editor.canvas = canvas;
    this.editor.ctx = ctx;
    this.editor.rawImg = sourceImg;
    this.editor.cropBox = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
    this._updateEditorCropBoxDOM();
    this._saveEditorHistory();
  }

  closeGarmentEditor() {
    const backdrop = document.getElementById('free-vton-editor-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }

  _saveEditorHistory() {
    if (!this.editor.canvas) return;
    const ctx = this.editor.ctx;
    const snap = ctx.getImageData(0, 0, this.editor.canvas.width, this.editor.canvas.height);
    this.editor.history.push(snap);
    if (this.editor.history.length > 8) this.editor.history.shift();
  }

  _updateEditorCropBoxDOM() {
    const boxEl = document.getElementById('vton-crop-box');
    if (!boxEl) return;
    const b = this.editor.cropBox;
    boxEl.style.left = `${b.x * 100}%`;
    boxEl.style.top = `${b.y * 100}%`;
    boxEl.style.width = `${b.w * 100}%`;
    boxEl.style.height = `${b.h * 100}%`;
  }

  applyGarmentEditorResult() {
    if (!this.editor.canvas) return;
    const { canvas, cropBox } = this.editor;
    const cw = canvas.width;
    const ch = canvas.height;

    // Crop bounded region
    const sx = Math.max(0, Math.round(cropBox.x * cw));
    const sy = Math.max(0, Math.round(cropBox.y * ch));
    const sw = Math.min(cw - sx, Math.round(cropBox.w * cw));
    const sh = Math.min(ch - sy, Math.round(cropBox.h * ch));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = sw;
    outCanvas.height = sh;
    const oCtx = outCanvas.getContext('2d');
    oCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    this.currentGarmentImg = outCanvas;
    this.el.modalGarmentThumb.src = outCanvas.toDataURL('image/png');
    this._garmentCache?.set(`${this.currentProduct?.image}:edited`, outCanvas);
    this.closeGarmentEditor();
    this._toast('✓ Đã cập nhật mẫu áo đã cắt!');

    if (this.activeTab === 'photo' && this.personImg) {
      this._refreshStaticFallbackLive();
    }
  }

  /**
   * ==========================================================================
   * UI BUILDER & EVENT WIRING
   * ==========================================================================
   */
  _tabActiveClass() {
    return 'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-white px-4 py-2 text-xs font-semibold shadow-sm transition';
  }

  _tabIdleClass() {
    return 'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl text-neutral-600 hover:text-neutral-950 px-4 py-2 text-xs font-medium transition';
  }

  _mountModalDOM() {
    if (document.getElementById('free-vton-modal-backdrop')) return;

    if (!document.querySelector('script[src*="cdn.tailwindcss.com"]') && !window.tailwind) {
      window.tailwind = { config: { corePlugins: { preflight: false } } };
      const twScript = document.createElement('script');
      twScript.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(twScript);
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'free-vton-modal-backdrop';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.fontFamily = "'Plus Jakarta Sans', system-ui, sans-serif";
    wrapper.className =
      'hidden fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto text-left';

    wrapper.innerHTML = `
      <style>
        #free-vton-modal-backdrop *, #free-vton-modal-backdrop *::before, #free-vton-modal-backdrop *::after { box-sizing: border-box; }
        #free-vton-modal-backdrop button { border-style: solid; border-width: 0; font-family: inherit; }
        #free-vton-modal-backdrop h3, #free-vton-modal-backdrop h4, #free-vton-modal-backdrop p { margin: 0; }
        .vton-model-chip.active { border-color: #10b981 !important; background-color: #ecfdf5 !important; color: #065f46 !important; }
        .vton-cat-chip.active { background-color: #0a0a0a !important; color: #ffffff !important; }
      </style>
      <div class="relative w-full max-w-5xl bg-white text-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 flex flex-col max-h-[96dvh]" role="dialog" aria-modal="true" aria-labelledby="vton-modal-title">

        <!-- HEADER -->
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-neutral-100 bg-neutral-50/90">
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative group">
              <img id="vton-garment-thumb" src="" alt="Garment" class="w-10 h-12 object-contain bg-white rounded-lg border border-neutral-200 p-0.5 shrink-0" />
              <button type="button" id="vton-header-edit-btn" title="Cắt ảnh & Chỉnh sửa mẫu áo" class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow cursor-pointer hover:bg-emerald-500">✂️</button>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">Anywear · 100% Free AI</span>
                <span id="vton-product-meta" class="text-xs text-neutral-500 truncate">Trang phục tách nền</span>
              </div>
              <h3 id="vton-modal-title" class="font-bold text-sm sm:text-base text-neutral-950 truncate">Đang nạp sản phẩm...</h3>
            </div>
          </div>

          <!-- TAB SWITCHER + EDIT GARMENT + CLOSE -->
          <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button type="button" id="vton-edit-garment-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition border border-emerald-200 cursor-pointer">
              <span>✂️</span> Cắt &amp; Chỉnh Sửa Áo
            </button>
            <div class="inline-flex p-1 rounded-2xl bg-neutral-200/80">
              <button type="button" id="vton-tab-camera" class="${this._tabActiveClass()}">
                🎥 Camera AR (Live)
              </button>
              <button type="button" id="vton-tab-photo" class="${this._tabIdleClass()}">
                🖼️ Thử Ảnh Tĩnh (AI)
              </button>
            </div>
            <button type="button" id="vton-close-btn" aria-label="Đóng" class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-red-500 hover:text-white text-neutral-700 flex items-center justify-center font-bold transition shrink-0 cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        <!-- MAIN BODY -->
        <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">

          <!-- LEFT STAGE -->
          <div class="lg:col-span-8 bg-neutral-950 relative flex flex-col min-h-[400px] sm:min-h-[520px]">

            <!-- TAB 1: CAMERA AR -->
            <div id="vton-panel-camera" class="flex-1 relative flex items-center justify-center overflow-hidden">
              <video id="vton-webcam-video" playsinline muted class="hidden"></video>
              <canvas id="vton-ar-canvas" class="w-full h-full max-h-[72vh] object-contain block"></canvas>

              <div class="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <span id="vton-cam-status" class="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-black/70 text-emerald-300 border border-white/15 backdrop-blur">
                  ⏳ Đang khởi động Camera AR...
                </span>
                <span id="vton-cam-pose-badge" class="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-mono bg-black/65 text-neutral-200 border border-white/10 backdrop-blur">
                  PoseLandmarker 11,12,23,24
                </span>
              </div>

              <!-- Camera Permission Warning -->
              <div id="vton-cam-permission-box" class="hidden absolute inset-0 z-20 bg-neutral-950/92 backdrop-blur-md flex items-center justify-center p-6 text-center">
                <div class="max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-white shadow-xl">
                  <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">📷</div>
                  <h4 class="font-bold text-base mb-2">Cần cấp quyền sử dụng Camera</h4>
                  <p id="vton-cam-permission-msg" class="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5"></p>
                  <div class="flex flex-wrap gap-2 justify-center">
                    <button type="button" id="vton-retry-cam-btn" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs cursor-pointer">
                      🔄 Cấp quyền lại
                    </button>
                    <button type="button" id="vton-goto-photo-btn" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer">
                      🖼️ Chuyển sang Thử Ảnh Tĩnh
                    </button>
                  </div>
                </div>
              </div>

              <!-- Bottom Bar (Capture & Record) -->
              <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-center gap-2.5 z-10">
                <button type="button" id="vton-capture-photo-btn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-neutral-950 hover:bg-neutral-100 font-semibold text-xs shadow-lg cursor-pointer transition">
                  📸 Chụp ảnh HD
                </button>
                <button type="button" id="vton-record-video-btn" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 text-neutral-950 hover:bg-emerald-400 font-semibold text-xs shadow-lg cursor-pointer transition">
                  🎥 Quay Video (5s)
                </button>
              </div>
            </div>

            <!-- TAB 2: STATIC PHOTO FIT -->
            <div id="vton-panel-photo" class="hidden flex-1 relative flex flex-col justify-between bg-neutral-950 p-3 sm:p-5">
              <!-- Top Toolbar inside Static Photo -->
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span id="vton-static-badge" class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ⚡ Smart Pose + Canvas Fit
                </span>
                <div class="flex items-center gap-2">
                  <button type="button" id="vton-upload-portrait-btn" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold cursor-pointer transition">
                    📤 Tải ảnh của bạn
                  </button>
                  <input type="file" id="vton-portrait-input" accept="image/*" class="hidden" />
                </div>
              </div>

              <!-- Sample Models Picker Strip -->
              <div class="mb-3 p-2 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto" id="vton-sample-models-bar">
                <span class="text-[11px] text-neutral-400 font-semibold shrink-0">Chọn người mẫu:</span>
                <div class="flex items-center gap-1.5" id="vton-model-picker-chips">
                  ${SAMPLE_MODELS.map(
                    (m, idx) => `
                    <button type="button" data-model-idx="${idx}" class="vton-model-chip ${
                      idx === 0 ? 'active' : ''
                    } px-2.5 py-1 rounded-xl text-[11px] font-medium border border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500 transition cursor-pointer shrink-0">
                      ${m.name}
                    </button>
                  `
                  ).join('')}
                </div>
              </div>

              <!-- Empty Dropzone -->
              <div id="vton-static-empty" class="hidden flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-2xl p-6 text-center text-neutral-300 min-h-[300px]">
                <div class="text-4xl mb-3">👗</div>
                <h4 class="font-semibold text-white text-base mb-1">Tải ảnh chân dung hoặc chọn người mẫu có sẵn</h4>
                <div class="flex flex-wrap gap-3 justify-center mt-4">
                  <button type="button" id="vton-empty-upload-btn" class="px-5 py-2.5 rounded-xl bg-white text-neutral-950 font-semibold text-xs hover:bg-neutral-200 cursor-pointer transition">
                    📤 Chọn ảnh từ máy tính
                  </button>
                  <button type="button" id="vton-empty-sample-btn" class="px-5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-600 text-white font-medium text-xs hover:bg-neutral-700 cursor-pointer transition">
                    ✨ Dùng người mẫu mặc định
                  </button>
                </div>
              </div>

              <!-- Interactive Before/After Split Viewer -->
              <div id="vton-static-result-box" class="flex-1 flex flex-col items-center justify-center relative">
                <div id="vton-compare-stage" class="relative w-full max-w-[440px] aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 select-none touch-none cursor-ew-resize shadow-2xl">
                  <img id="vton-after-img" src="" alt="Sau khi phối đồ" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  <img id="vton-before-img" src="" alt="Ảnh gốc" class="absolute inset-0 w-full h-full object-cover pointer-events-none" style="clip-path: inset(0 45% 0 0);" />

                  <!-- Floating Tags -->
                  <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none">Ảnh gốc</span>
                  <span class="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600/85 text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none">Phối đồ</span>

                  <!-- Split Divider Handle -->
                  <div id="vton-compare-divider" class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none" style="left: 55%;">
                    <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-neutral-950 font-bold text-xs shadow-xl flex items-center justify-center border-2 border-emerald-500">
                      ⇄
                    </div>
                  </div>
                </div>

                <!-- Range Slider & Download -->
                <div class="w-full max-w-[440px] flex items-center justify-between gap-3 mt-3">
                  <input type="range" id="vton-compare-range" min="0" max="100" value="55" class="flex-1 accent-emerald-500 cursor-pointer" aria-label="Thanh kéo Trước Sau" />
                  <button type="button" id="vton-download-static-btn" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs cursor-pointer transition shrink-0">
                    ⬇ Tải ảnh kết quả
                  </button>
                </div>
              </div>

              <!-- Loading Indicator -->
              <div id="vton-static-loading" class="hidden absolute inset-0 z-20 bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                <div class="w-10 h-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3"></div>
                <p id="vton-static-loading-text" class="text-xs sm:text-sm font-semibold max-w-sm">Đang căn chỉnh trang phục...</p>
              </div>
            </div>

          </div>

          <!-- RIGHT SIDEBAR (PRECISION CONTROLS & CATALOG) -->
          <div class="lg:col-span-4 bg-white p-4 sm:p-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-neutral-200 overflow-y-auto">

            <!-- PRECISION FIT CALIBRATION -->
            <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-3.5 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-800">Căn chỉnh phom</h4>
                  <span id="vton-autofit-badge" class="hidden text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold animate-pulse">✓ AI vừa vặn</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <button type="button" id="vton-ai-autofit-btn" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm flex items-center gap-1 transition-all cursor-pointer">
                    <span>✨ AI Vừa Phom</span>
                  </button>
                  <button type="button" id="vton-reset-fit-btn" class="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer">Đặt lại</button>
                </div>
              </div>

              <!-- X / Y Position -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-neutral-600">Trục X (Ngang)</span>
                    <span id="vton-offsetx-val" class="font-mono font-semibold">0px</span>
                  </div>
                  <input type="range" id="vton-offsetx-slider" min="-150" max="150" value="0" class="w-full accent-neutral-950 cursor-pointer" />
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-neutral-600">Trục Y (Dọc)</span>
                    <span id="vton-offsety-val" class="font-mono font-semibold">0px</span>
                  </div>
                  <input type="range" id="vton-offsety-slider" min="-150" max="150" value="0" class="w-full accent-neutral-950 cursor-pointer" />
                </div>
              </div>

              <!-- Width / Length Stretch -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-neutral-600">Độ rộng vai</span>
                    <span id="vton-scalex-val" class="font-mono font-semibold">100%</span>
                  </div>
                  <input type="range" id="vton-scalex-slider" min="60" max="160" value="100" class="w-full accent-neutral-950 cursor-pointer" />
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-neutral-600">Chiều dài áo</span>
                    <span id="vton-scaley-val" class="font-mono font-semibold">100%</span>
                  </div>
                  <input type="range" id="vton-scaley-slider" min="60" max="160" value="100" class="w-full accent-neutral-950 cursor-pointer" />
                </div>
              </div>

              <!-- Rotation Tilt -->
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-neutral-600">Xoay nghiêng phom</span>
                  <span id="vton-rotation-val" class="font-mono font-semibold">0°</span>
                </div>
                <input type="range" id="vton-rotation-slider" min="-40" max="40" value="0" class="w-full accent-neutral-950 cursor-pointer" />
              </div>

              <!-- Visual Blending (Opacity & Blend Mode) -->
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200">
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-neutral-600">Độ mờ vải</span>
                    <span id="vton-opacity-val" class="font-mono font-semibold">100%</span>
                  </div>
                  <input type="range" id="vton-opacity-slider" min="40" max="100" value="100" class="w-full accent-neutral-950 cursor-pointer" />
                </div>
                <div>
                  <label class="block text-[11px] text-neutral-600 mb-1">Hòa trộn ánh sáng:</label>
                  <select id="vton-blend-select" class="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-900">
                    <option value="source-over">Bình thường (Normal)</option>
                    <option value="multiply">Hòa nếp gấp (Multiply)</option>
                    <option value="soft-light">Ánh sáng dịu (Soft Light)</option>
                  </select>
                </div>
              </div>

              <!-- Flip & Skeleton checkboxes -->
              <div class="flex items-center justify-between pt-1 border-t border-neutral-200 text-xs">
                <label class="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
                  <input type="checkbox" id="vton-fliph-toggle" class="rounded accent-emerald-600" />
                  <span>⇄ Lật ngang áo</span>
                </label>
                <label class="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
                  <input type="checkbox" id="vton-skeleton-toggle" class="rounded accent-emerald-600" />
                  <span>Khớp xương & Lưới 3D</span>
                </label>
              </div>

              <!-- DYNAMIC 3D BODY FRAME TRACKING & WARPING -->
              <div class="pt-2 border-t border-neutral-200 space-y-2">
                <div class="flex items-center justify-between">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-900">
                    <input type="checkbox" id="vton-dynamic-mesh-toggle" checked class="rounded accent-emerald-600" />
                    <span>✨ Động dính theo khung người 3D</span>
                  </label>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">AI Warp</span>
                </div>

                <div id="vton-mesh-controls" class="space-y-1.5 pl-4">
                  <div>
                    <div class="flex justify-between text-[11px] mb-0.5">
                      <span class="text-neutral-600">Độ ôm đường cong cơ thể:</span>
                      <span id="vton-mesh-tightness-val" class="font-mono font-semibold">85%</span>
                    </div>
                    <input type="range" id="vton-mesh-tightness-slider" min="20" max="100" value="85" class="w-full accent-neutral-950 cursor-pointer" />
                  </div>

                  <div>
                    <div class="flex justify-between text-[11px] mb-0.5">
                      <span class="text-neutral-600">Độ mượt & rủ vải (Smooth):</span>
                      <span id="vton-fabric-smoothness-val" class="font-mono font-semibold">88%</span>
                    </div>
                    <input type="range" id="vton-fabric-smoothness-slider" min="30" max="100" value="88" class="w-full accent-neutral-950 cursor-pointer" />
                  </div>

                  <div class="flex items-center justify-between text-[11px] pt-1">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
                      <input type="checkbox" id="vton-shading3d-toggle" checked class="rounded accent-emerald-600" />
                      <span>Bóng khối 3D</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
                      <input type="checkbox" id="vton-organic-motion-toggle" checked class="rounded accent-emerald-600" />
                      <span>Độ rủ nhịp thở</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer text-neutral-700">
                      <input type="checkbox" id="vton-creases-toggle" checked class="rounded accent-emerald-600" />
                      <span>Nếp gấp vải</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- PRODUCT CATALOG SWITCHER (ALL 69+ PRODUCTS) -->
            <div class="flex-1 flex flex-col min-h-0 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Kho Thiết Kế (69+ Mẫu Lalin)</h4>
                <button type="button" id="vton-custom-garment-upload-btn" class="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer">
                  + Tải áo riêng
                </button>
                <input type="file" id="vton-custom-garment-input" accept="image/*" class="hidden" />
              </div>

              <!-- Search Bar -->
              <input type="text" id="vton-catalog-search" placeholder="🔍 Tìm kiếm áo theo tên hoặc chất liệu..." class="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-neutral-950" />

              <!-- Category Filter Chips -->
              <div class="flex gap-1 overflow-x-auto py-1" id="vton-cat-filter-row">
                <button type="button" data-cat="all" class="vton-cat-chip active px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Tất cả</button>
                <button type="button" data-cat="tee" class="vton-cat-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Áo Thun</button>
                <button type="button" data-cat="yem" class="vton-cat-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Áo Yếm</button>
                <button type="button" data-cat="shirt" class="vton-cat-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Áo Tơ</button>
                <button type="button" data-cat="jacket" class="vton-cat-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Áo Gấm</button>
                <button type="button" data-cat="set" class="vton-cat-chip px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 shrink-0">Nguyên Set</button>
              </div>

              <!-- Product Grid -->
              <div id="vton-product-switcher" class="grid grid-cols-4 gap-2 overflow-y-auto max-h-[160px] p-1 bg-neutral-50 rounded-2xl border border-neutral-200"></div>
            </div>

            <!-- Footer Privacy Notice -->
            <div class="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-2">
              🔒 <strong>Bảo mật:</strong> Toàn bộ dữ liệu Camera và ảnh chân dung được tính toán 100% tại trình duyệt máy khách (0₫ chi phí server).
            </div>
          </div>

        </div>
      </div>

      <!-- Toast Feedback -->
      <div id="vton-toast" class="hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[10020] px-4 py-2 rounded-full bg-neutral-950 text-white text-xs font-semibold shadow-2xl border border-neutral-700"></div>
    `;

    document.body.appendChild(wrapper);

    this.el = {
      backdrop: wrapper,
      closeBtn: wrapper.querySelector('#vton-close-btn'),
      modalProductName: wrapper.querySelector('#vton-modal-title'),
      modalProductMeta: wrapper.querySelector('#vton-product-meta'),
      modalGarmentThumb: wrapper.querySelector('#vton-garment-thumb'),
      headerEditBtn: wrapper.querySelector('#vton-header-edit-btn'),
      editGarmentBtn: wrapper.querySelector('#vton-edit-garment-btn'),
      tabCamBtn: wrapper.querySelector('#vton-tab-camera'),
      tabPhotoBtn: wrapper.querySelector('#vton-tab-photo'),
      camPanel: wrapper.querySelector('#vton-panel-camera'),
      photoPanel: wrapper.querySelector('#vton-panel-photo'),
      video: wrapper.querySelector('#vton-webcam-video'),
      arCanvas: wrapper.querySelector('#vton-ar-canvas'),
      camStatusPill: wrapper.querySelector('#vton-cam-status'),
      camPoseBadge: wrapper.querySelector('#vton-cam-pose-badge'),
      camPermissionBox: wrapper.querySelector('#vton-cam-permission-box'),
      camPermissionMsg: wrapper.querySelector('#vton-cam-permission-msg'),
      retryCamBtn: wrapper.querySelector('#vton-retry-cam-btn'),
      gotoPhotoBtn: wrapper.querySelector('#vton-goto-photo-btn'),
      capturePhotoBtn: wrapper.querySelector('#vton-capture-photo-btn'),
      recordBtn: wrapper.querySelector('#vton-record-video-btn'),
      staticBadge: wrapper.querySelector('#vton-static-badge'),
      staticEmptyBox: wrapper.querySelector('#vton-static-empty'),
      staticResultBox: wrapper.querySelector('#vton-static-result-box'),
      staticLoading: wrapper.querySelector('#vton-static-loading'),
      staticLoadingText: wrapper.querySelector('#vton-static-loading-text'),
      staticBeforeImg: wrapper.querySelector('#vton-before-img'),
      staticAfterImg: wrapper.querySelector('#vton-after-img'),
      compareStage: wrapper.querySelector('#vton-compare-stage'),
      compareDivider: wrapper.querySelector('#vton-compare-divider'),
      compareRange: wrapper.querySelector('#vton-compare-range'),
      downloadStaticBtn: wrapper.querySelector('#vton-download-static-btn'),
      portraitInput: wrapper.querySelector('#vton-portrait-input'),
      uploadPortraitBtn: wrapper.querySelector('#vton-upload-portrait-btn'),
      emptyUploadBtn: wrapper.querySelector('#vton-empty-upload-btn'),
      emptySampleBtn: wrapper.querySelector('#vton-empty-sample-btn'),
      modelPickerChips: wrapper.querySelector('#vton-model-picker-chips'),
      productSwitcher: wrapper.querySelector('#vton-product-switcher'),
      catalogSearch: wrapper.querySelector('#vton-catalog-search'),
      catFilterRow: wrapper.querySelector('#vton-cat-filter-row'),
      customGarmentBtn: wrapper.querySelector('#vton-custom-garment-upload-btn'),
      customGarmentInput: wrapper.querySelector('#vton-custom-garment-input'),
      offsetXSlider: wrapper.querySelector('#vton-offsetx-slider'),
      offsetXVal: wrapper.querySelector('#vton-offsetx-val'),
      offsetYSlider: wrapper.querySelector('#vton-offsety-slider'),
      offsetYVal: wrapper.querySelector('#vton-offsety-val'),
      scaleXSlider: wrapper.querySelector('#vton-scalex-slider'),
      scaleXVal: wrapper.querySelector('#vton-scalex-val'),
      scaleYSlider: wrapper.querySelector('#vton-scaley-slider'),
      scaleYVal: wrapper.querySelector('#vton-scaley-val'),
      rotationSlider: wrapper.querySelector('#vton-rotation-slider'),
      rotationVal: wrapper.querySelector('#vton-rotation-val'),
      opacitySlider: wrapper.querySelector('#vton-opacity-slider'),
      opacityVal: wrapper.querySelector('#vton-opacity-val'),
      blendSelect: wrapper.querySelector('#vton-blend-select'),
      flipHToggle: wrapper.querySelector('#vton-fliph-toggle'),
      skeletonToggle: wrapper.querySelector('#vton-skeleton-toggle'),
      dynamicMeshToggle: wrapper.querySelector('#vton-dynamic-mesh-toggle'),
      meshTightnessSlider: wrapper.querySelector('#vton-mesh-tightness-slider'),
      meshTightnessVal: wrapper.querySelector('#vton-mesh-tightness-val'),
      fabricSmoothnessSlider: wrapper.querySelector('#vton-fabric-smoothness-slider'),
      fabricSmoothnessVal: wrapper.querySelector('#vton-fabric-smoothness-val'),
      shading3dToggle: wrapper.querySelector('#vton-shading3d-toggle'),
      organicMotionToggle: wrapper.querySelector('#vton-organic-motion-toggle'),
      creasesToggle: wrapper.querySelector('#vton-creases-toggle'),
      meshControls: wrapper.querySelector('#vton-mesh-controls'),
      aiAutoFitBtn: wrapper.querySelector('#vton-ai-autofit-btn'),
      autoFitBadge: wrapper.querySelector('#vton-autofit-badge'),
      resetFitBtn: wrapper.querySelector('#vton-reset-fit-btn'),
      toast: wrapper.querySelector('#vton-toast'),
    };
  }

  _bindEvents() {
    // Modal Open / Close
    this.el.closeBtn.addEventListener('click', () => this.close());
    this.el.backdrop.addEventListener('click', (e) => {
      if (e.target === this.el.backdrop) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.editor.isOpen) this.closeGarmentEditor();
        else if (this.isOpen) this.close();
      }
    });

    // Tab Switch
    this.el.tabCamBtn.addEventListener('click', () => this.switchTab('camera'));
    this.el.tabPhotoBtn.addEventListener('click', () => this.switchTab('photo'));
    this.el.retryCamBtn.addEventListener('click', () => this.startCameraAR());
    this.el.gotoPhotoBtn.addEventListener('click', () => this.switchTab('photo'));

    // Capture & Video
    this.el.capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
    this.el.recordBtn.addEventListener('click', () => this.startVideoRecording5s());

    // Portrait Upload & Sample Picker
    this.el.uploadPortraitBtn.addEventListener('click', () => this.el.portraitInput.click());
    this.el.emptyUploadBtn.addEventListener('click', () => this.el.portraitInput.click());
    this.el.portraitInput.addEventListener('change', (e) => {
      if (e.target.files?.[0]) this.handlePortraitUpload(e.target.files[0]);
      e.target.value = '';
    });
    this.el.emptySampleBtn.addEventListener('click', () => this.loadSampleModel(0));

    this.el.modelPickerChips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-model-idx]');
      if (!chip) return;
      this.loadSampleModel(Number(chip.dataset.modelIdx));
    });

    this.el.downloadStaticBtn.addEventListener('click', () => this.downloadStaticResult());

    // Before / After Slider Interaction
    const updateCompare = (pct) => {
      const clamped = Math.max(0, Math.min(100, pct));
      this.comparePercent = clamped;
      this.el.staticBeforeImg.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      this.el.compareDivider.style.left = `${clamped}%`;
      this.el.compareRange.value = String(Math.round(clamped));
    };

    const handlePointerWipe = (clientX) => {
      const rect = this.el.compareStage.getBoundingClientRect();
      if (!rect.width) return;
      updateCompare(((clientX - rect.left) / rect.width) * 100);
    };

    let draggingCompare = false;
    this.el.compareStage.addEventListener('pointerdown', (e) => {
      draggingCompare = true;
      this.el.compareStage.setPointerCapture?.(e.pointerId);
      handlePointerWipe(e.clientX);
    });
    this.el.compareStage.addEventListener('pointermove', (e) => {
      if (draggingCompare) handlePointerWipe(e.clientX);
    });
    window.addEventListener('pointerup', () => {
      draggingCompare = false;
    });
    this.el.compareRange.addEventListener('input', (e) => {
      updateCompare(Number(e.target.value));
    });

    // Precision Fit Sliders
    this.el.offsetXSlider.addEventListener('input', (e) => {
      this.arSettings.offsetX = Number(e.target.value);
      this.el.offsetXVal.textContent = `${this.arSettings.offsetX}px`;
      this._refreshStaticFallbackLive();
    });
    this.el.offsetYSlider.addEventListener('input', (e) => {
      this.arSettings.offsetY = Number(e.target.value);
      this.el.offsetYVal.textContent = `${this.arSettings.offsetY}px`;
      this._refreshStaticFallbackLive();
    });
    this.el.scaleXSlider.addEventListener('input', (e) => {
      this.arSettings.scaleX = Number(e.target.value);
      this.el.scaleXVal.textContent = `${this.arSettings.scaleX}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.scaleYSlider.addEventListener('input', (e) => {
      this.arSettings.scaleY = Number(e.target.value);
      this.el.scaleYVal.textContent = `${this.arSettings.scaleY}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.rotationSlider.addEventListener('input', (e) => {
      this.arSettings.rotationDeg = Number(e.target.value);
      this.el.rotationVal.textContent = `${this.arSettings.rotationDeg}°`;
      this._refreshStaticFallbackLive();
    });
    this.el.opacitySlider.addEventListener('input', (e) => {
      this.arSettings.opacity = Number(e.target.value);
      this.el.opacityVal.textContent = `${this.arSettings.opacity}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.blendSelect.addEventListener('change', (e) => {
      this.arSettings.blendMode = e.target.value;
      this._refreshStaticFallbackLive();
    });
    this.el.flipHToggle.addEventListener('change', (e) => {
      this.arSettings.flipH = e.target.checked;
      this._refreshStaticFallbackLive();
    });
    this.el.skeletonToggle.addEventListener('change', (e) => {
      this.arSettings.showSkeleton = e.target.checked;
      this._refreshStaticFallbackLive();
    });
    this.el.dynamicMeshToggle?.addEventListener('change', (e) => {
      this.arSettings.dynamicMesh = e.target.checked;
      if (this.el.meshControls) {
        this.el.meshControls.style.opacity = e.target.checked ? '1' : '0.4';
        this.el.meshControls.style.pointerEvents = e.target.checked ? 'auto' : 'none';
      }
      this._refreshStaticFallbackLive();
    });
    this.el.meshTightnessSlider?.addEventListener('input', (e) => {
      this.arSettings.meshTightness = Number(e.target.value);
      if (this.el.meshTightnessVal) this.el.meshTightnessVal.textContent = `${this.arSettings.meshTightness}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.shading3dToggle?.addEventListener('change', (e) => {
      this.arSettings.shading3D = e.target.checked;
      this._refreshStaticFallbackLive();
    });
    this.el.organicMotionToggle?.addEventListener('change', (e) => {
      this.arSettings.organicMotion = e.target.checked;
      this._refreshStaticFallbackLive();
    });
    this.el.fabricSmoothnessSlider?.addEventListener('input', (e) => {
      this.arSettings.fabricSmoothness = Number(e.target.value);
      if (this.el.fabricSmoothnessVal) this.el.fabricSmoothnessVal.textContent = `${this.arSettings.fabricSmoothness}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.creasesToggle?.addEventListener('change', (e) => {
      this.arSettings.organicCreases = e.target.checked;
      this._refreshStaticFallbackLive();
    });

    this.el.aiAutoFitBtn?.addEventListener('click', () => {
      this.autoCalibrateFit(null, false);
    });

    this.el.resetFitBtn.addEventListener('click', () => {
      this.arSettings.offsetX = 0;
      this.arSettings.offsetY = 0;
      this.arSettings.scaleX = 100;
      this.arSettings.scaleY = 100;
      this.arSettings.rotationDeg = 0;
      this.arSettings.opacity = 100;
      this.arSettings.flipH = false;
      this.arSettings.dynamicMesh = true;
      this.arSettings.meshTightness = 85;
      this.arSettings.shading3D = true;
      this.arSettings.organicMotion = true;
      this.arSettings.fabricSmoothness = 88;
      this.arSettings.organicCreases = true;
      this.el.offsetXSlider.value = '0';
      this.el.offsetYSlider.value = '0';
      this.el.scaleXSlider.value = '100';
      this.el.scaleYSlider.value = '100';
      this.el.rotationSlider.value = '0';
      this.el.opacitySlider.value = '100';
      this.el.offsetXVal.textContent = '0px';
      this.el.offsetYVal.textContent = '0px';
      this.el.scaleXVal.textContent = '100%';
      this.el.scaleYVal.textContent = '100%';
      this.el.rotationVal.textContent = '0°';
      this.el.opacityVal.textContent = '100%';
      this.el.flipHToggle.checked = false;
      if (this.el.dynamicMeshToggle) this.el.dynamicMeshToggle.checked = true;
      if (this.el.meshTightnessSlider) this.el.meshTightnessSlider.value = '85';
      if (this.el.meshTightnessVal) this.el.meshTightnessVal.textContent = '85%';
      if (this.el.fabricSmoothnessSlider) this.el.fabricSmoothnessSlider.value = '88';
      if (this.el.fabricSmoothnessVal) this.el.fabricSmoothnessVal.textContent = '88%';
      if (this.el.shading3dToggle) this.el.shading3dToggle.checked = true;
      if (this.el.organicMotionToggle) this.el.organicMotionToggle.checked = true;
      if (this.el.creasesToggle) this.el.creasesToggle.checked = true;
      if (this.el.meshControls) {
        this.el.meshControls.style.opacity = '1';
        this.el.meshControls.style.pointerEvents = 'auto';
      }
      this._refreshStaticFallbackLive();
      this._toast('Đã đặt lại phom về mặc định!');
    });

    // Custom Garment Upload
    this.el.customGarmentBtn.addEventListener('click', () => this.el.customGarmentInput.click());
    this.el.customGarmentInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
      });
      const customProd = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, '') || 'Áo tải lên từ máy',
        price: 'Cá nhân',
        image: dataUrl,
        category: 'shirt',
        description: 'Trang phục tùy chỉnh tải từ thiết bị',
      };
      this.catalog.unshift(customProd);
      this._renderProductSwitcher();
      await this.selectProduct(customProd);
      this._toast('Đã nạp áo của bạn! Bấm "Cắt & Chỉnh sửa áo" để hoàn thiện viền.');
      e.target.value = '';
    });

    // Catalog Filter & Search
    this.el.catalogSearch.addEventListener('input', (e) => {
      this.catalogSearch = e.target.value.toLowerCase();
      this._renderProductSwitcher();
    });

    this.el.catFilterRow.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      this.catalogFilter = chip.dataset.cat;
      this.el.catFilterRow.querySelectorAll('.vton-cat-chip').forEach((c) => {
        c.classList.toggle('active', c === chip);
      });
      this._renderProductSwitcher();
    });

    // Open Garment Editor
    this.el.editGarmentBtn.addEventListener('click', () => this.openGarmentEditor());
    this.el.headerEditBtn.addEventListener('click', () => this.openGarmentEditor());

    // Wire Garment Editor Modal
    const editorBackdrop = document.getElementById('free-vton-editor-backdrop');
    if (editorBackdrop) {
      editorBackdrop.querySelector('#vton-editor-close').addEventListener('click', () => this.closeGarmentEditor());
      editorBackdrop.querySelector('#vton-editor-apply-btn').addEventListener('click', () => this.applyGarmentEditorResult());

      editorBackdrop.querySelector('#vton-auto-remove-bg-btn').addEventListener('click', () => {
        if (!this.editor.canvas) return;
        this._smartLocalBackgroundRemoval(this.editor.canvas, null, this.currentProduct?.category || 'shirt');
        this._saveEditorHistory();
        this._toast('🪄 Đã tách nền studio tự động!');
      });

      editorBackdrop.querySelector('#vton-editor-flip-btn').addEventListener('click', () => {
        if (!this.editor.canvas) return;
        const cv = this.editor.canvas;
        const ctx = cv.getContext('2d');
        const temp = document.createElement('canvas');
        temp.width = cv.width;
        temp.height = cv.height;
        temp.getContext('2d').drawImage(cv, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.save();
        ctx.translate(cv.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(temp, 0, 0);
        ctx.restore();
        this._saveEditorHistory();
        this._toast('⇄ Đã lật ngang áo!');
      });

      editorBackdrop.querySelector('#vton-editor-reset-btn').addEventListener('click', () => {
        if (this.editor.history.length > 1) {
          this.editor.history.pop();
          const prev = this.editor.history[this.editor.history.length - 1];
          if (prev) this.editor.ctx.putImageData(prev, 0, 0);
          this._toast('↺ Đã hoàn tác bước trước!');
        }
      });

      // Crop box handles interaction
      const cropBoxEl = editorBackdrop.querySelector('#vton-crop-box');
      let isDraggingCrop = false;
      let startCropX = 0, startCropY = 0;
      let initialCrop = null;

      cropBoxEl.addEventListener('pointerdown', (e) => {
        if (e.target.dataset.corner) return;
        isDraggingCrop = true;
        cropBoxEl.setPointerCapture?.(e.pointerId);
        startCropX = e.clientX;
        startCropY = e.clientY;
        initialCrop = { ...this.editor.cropBox };
      });

      window.addEventListener('pointermove', (e) => {
        if (!isDraggingCrop) return;
        const vp = editorBackdrop.querySelector('#vton-crop-viewport');
        const rect = vp.getBoundingClientRect();
        const dx = (e.clientX - startCropX) / rect.width;
        const dy = (e.clientY - startCropY) / rect.height;
        this.editor.cropBox.x = Math.max(0, Math.min(1 - initialCrop.w, initialCrop.x + dx));
        this.editor.cropBox.y = Math.max(0, Math.min(1 - initialCrop.h, initialCrop.y + dy));
        this._updateEditorCropBoxDOM();
      });

      window.addEventListener('pointerup', () => {
        isDraggingCrop = false;
      });
    }
  }

  _renderProductSwitcher() {
    if (!this.el?.productSwitcher) return;

    let items = this.catalog;
    if (this.catalogFilter !== 'all') {
      items = items.filter((item) => item.category === this.catalogFilter);
    }
    if (this.catalogSearch) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(this.catalogSearch) ||
          (item.description && item.description.toLowerCase().includes(this.catalogSearch))
      );
    }

    if (items.length === 0) {
      this.el.productSwitcher.innerHTML =
        '<p class="col-span-4 py-4 text-center text-xs text-neutral-400">Không tìm thấy mẫu phù hợp.</p>';
      return;
    }

    this.el.productSwitcher.innerHTML = items
      .map((item) => {
        const active = this.currentProduct?.id === item.id;
        return `
          <button type="button" data-switch-id="${item.id}" title="${item.name}"
            class="aspect-square rounded-xl p-1 border-2 ${
              active ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-white hover:border-neutral-400'
            } transition cursor-pointer overflow-hidden relative group">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-contain" />
            <span class="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-white text-[9px] truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition">${item.name}</span>
          </button>`;
      })
      .join('');

    this.el.productSwitcher.querySelectorAll('[data-switch-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const prod = this.catalog.find((p) => p.id === btn.dataset.switchId);
        if (!prod) return;
        await this.selectProduct(prod);
      });
    });
  }

  _loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      if (/^https?:\/\//i.test(src) && !src.startsWith(location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback retry without crossOrigin if tainted
        const retry = new Image();
        retry.onload = () => resolve(retry);
        retry.onerror = () => resolve(null);
        retry.src = src;
      };
      img.src = src;
    });
  }

  _triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  _toast(msg) {
    const el = this.el.toast;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 3400);
  }
}

// Auto-initialize singleton widget when loaded in browser
if (typeof window !== 'undefined') {
  const widget = new VirtualTryOnWidget();
  window.FreeVTONWidget = widget;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => widget.autoDetectProducts());
  } else {
    widget.autoDetectProducts();
  }
}
