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
    id: 'sample-female-01',
    name: 'Nữ 01 · Chính diện Studio',
    desc: 'Dáng chuẩn thời trang, ánh sáng studio cân bằng',
    src: './assets/sample-model.jpg',
    gender: 'female',
  },
  {
    id: 'sample-female-02',
    name: 'Nữ 02 · Nắng nhẹ thanh lịch',
    desc: 'Dáng đứng thanh thoát, phù hợp áo tơ tằm & cổ yếm',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
    gender: 'female',
  },
  {
    id: 'sample-female-03',
    name: 'Nữ 03 · Thời trang dạ tiệc',
    desc: 'Dáng bán thân gần, tôn chi tiết cổ và ngực áo',
    src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    gender: 'female',
  },
  {
    id: 'sample-male-01',
    name: 'Nam / Unisex · Phom suông',
    desc: 'Dáng nam vai rộng, thử áo khoác & áo suông',
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80',
    gender: 'male',
  },
];

export class VirtualTryOnWidget {
  constructor(options = {}) {
    this.options = {
      defaultSamplePortrait: './assets/sample-model.jpg',
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

    // Auto-load catalog from window.LALIN_PRODUCTS if present on page
    if (typeof window !== 'undefined' && Array.isArray(window.LALIN_PRODUCTS)) {
      this.setCatalog(this._convertLalinCatalog(window.LALIN_PRODUCTS));
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
    const mapPt = (lm) => ({
      x: (this.arSettings.mirrorCamera ? 1 - lm.x : lm.x) * W,
      y: lm.y * H,
      visibility: lm.visibility ?? 1,
    });

    const target = {
      lShoulder: mapPt(rawLm[11]),
      rShoulder: mapPt(rawLm[12]),
      lHip: mapPt(rawLm[23]),
      rHip: mapPt(rawLm[24]),
    };

    if (!this.smoothedPose) {
      this.smoothedPose = target;
      return;
    }

    const alpha = 0.38;
    for (const key of ['lShoulder', 'rShoulder', 'lHip', 'rHip']) {
      this.smoothedPose[key].x += (target[key].x - this.smoothedPose[key].x) * alpha;
      this.smoothedPose[key].y += (target[key].y - this.smoothedPose[key].y) * alpha;
      this.smoothedPose[key].visibility = target[key].visibility;
    }
  }

  /**
   * Core Geometry Formula with Separate Width, Length, Shift and Tilt
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

    const leftScreenShoulder =
      pose.lShoulder.x <= pose.rShoulder.x ? pose.lShoulder : pose.rShoulder;
    const rightScreenShoulder =
      pose.lShoulder.x <= pose.rShoulder.x ? pose.rShoulder : pose.lShoulder;

    const dx = rightScreenShoulder.x - leftScreenShoulder.x;
    const dy = rightScreenShoulder.y - leftScreenShoulder.y;
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
    };
  }

  /**
   * Render Garment with Opacity, Shading, Filters, and Flip
   */
  drawGarmentOverlay(ctx, garmentImg, fit, settings = {}) {
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

  drawDebugSkeleton(ctx, pose, fit) {
    ctx.save();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
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
      try {
        const landmarker = await this._ensurePoseLandmarker('IMAGE');
        const result = landmarker.detect(personImg);
        const lm = result?.landmarks?.[0];
        if (lm && lm.length > 24) {
          detectedPose = {
            lShoulder: { x: lm[11].x * W, y: lm[11].y * H, visibility: lm[11].visibility ?? 1 },
            rShoulder: { x: lm[12].x * W, y: lm[12].y * H, visibility: lm[12].visibility ?? 1 },
            lHip: { x: lm[23].x * W, y: lm[23].y * H, visibility: lm[23].visibility ?? 1 },
            rHip: { x: lm[24].x * W, y: lm[24].y * H, visibility: lm[24].visibility ?? 1 },
          };
        }
      } catch (e) {
        console.warn('[VTON] Static pose detection fallback:', e);
      }

      if (!detectedPose) {
        detectedPose = {
          lShoulder: { x: W * 0.35, y: H * 0.32, visibility: 0.9 },
          rShoulder: { x: W * 0.65, y: H * 0.32, visibility: 0.9 },
          lHip: { x: W * 0.38, y: H * 0.65, visibility: 0.9 },
          rHip: { x: W * 0.62, y: H * 0.65, visibility: 0.9 },
        };
      }

      this.staticDetectedPersonSrc = personImg.src;
      this.staticDetectedPose = detectedPose;
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
                <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-800">Căn chỉnh phom chuẩn xác</h4>
                <button type="button" id="vton-reset-fit-btn" class="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer">Đặt lại</button>
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
                  <span>Khớp vai (11,12)</span>
                </label>
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

    this.el.resetFitBtn.addEventListener('click', () => {
      this.arSettings.offsetX = 0;
      this.arSettings.offsetY = 0;
      this.arSettings.scaleX = 100;
      this.arSettings.scaleY = 100;
      this.arSettings.rotationDeg = 0;
      this.arSettings.opacity = 100;
      this.arSettings.flipH = false;
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
