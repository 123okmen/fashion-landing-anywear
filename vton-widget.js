/**
 * ============================================================================
 * FREE VIRTUAL TRY-ON WIDGET (AR REAL-TIME CAMERA + AI STATIC PHOTO FIT)
 * ----------------------------------------------------------------------------
 * - Zero paid APIs: 100% Free Client-Side AR (@mediapipe/tasks-vision) +
 *   Free Open-Source Hugging Face Spaces (@gradio/client) with automatic
 *   Canvas + PoseLandmarker fallback when public Spaces are busy/overloaded.
 * - Embeddable on ANY ecommerce website via:
 *     <script type="module" src="./vton-widget.js" data-auto-init="true"></script>
 *   Or programmatically via window.FreeVTONWidget.open({ image, name, category })
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
 * Garment geometry multipliers per category so each garment silhouette
 * maps naturally onto detected shoulders (11, 12) and hips (23, 24).
 */
const GARMENT_FIT_PRESETS = {
  tee: {
    label: 'Áo thun',
    hfCategory: 'upper_body',
    widthMultiplier: 2.04,
    shoulderYRatio: 0.20,
    torsoLengthMultiplier: 1.24,
  },
  jacket: {
    label: 'Áo khoác',
    hfCategory: 'upper_body',
    widthMultiplier: 1.66,
    shoulderYRatio: 0.17,
    torsoLengthMultiplier: 1.25,
  },
  shirt: {
    label: 'Áo sơ mi',
    hfCategory: 'upper_body',
    widthMultiplier: 1.98,
    shoulderYRatio: 0.175,
    torsoLengthMultiplier: 1.22,
  },
  dress: {
    label: 'Váy / Đầm',
    hfCategory: 'dresses',
    widthMultiplier: 1.48,
    shoulderYRatio: 0.08,
    torsoLengthMultiplier: 1.95,
  },
};

export class VirtualTryOnWidget {
  constructor(options = {}) {
    this.options = {
      defaultSamplePortrait: './assets/sample-model.jpg',
      autoDetectSelector: '[data-vton-product]',
      ...options,
    };

    // Core UI state
    this.isOpen = false;
    this.activeTab = 'camera'; // 'camera' | 'photo'
    this.currentProduct = null;
    this.currentGarmentImg = null;
    this.catalog = [];

    // MediaPipe PoseLandmarker instances (separate VIDEO & IMAGE instances avoid WebGL teardown) + ImageSegmenter
    this.visionModule = null;
    this.poseVideoLandmarker = null;
    this.poseImageLandmarker = null;
    this.clothesSegmenter = null;
    this._selectSeq = 0;

    // Tab 1: Real-time AR Camera state
    this.mediaStream = null;
    this.arLoopRaf = null;
    this.lastVideoTime = -1;
    this.smoothedPose = null; // EMA smoothed landmarks
    this.arSettings = {
      scalePct: 100, // 70%..150%
      offsetY: 0,    // -120px..+120px
      showSkeleton: false,
      mirrorCamera: true,
    };
    this.mediaRecorder = null;
    this.isRecording = false;
    this.recordTimerId = null;

    // Tab 2: Static Photo Virtual Try-On state
    this.personFile = null;
    this.personImg = null;
    this.personDataUrl = '';
    this.afterDataUrl = '';
    this.comparePercent = 55;
    this.staticEngine = 'auto'; // 'auto' (HF -> fallback) | 'pose-canvas'
    this.hfSpace = 'yisol/IDM-VTON';

    this._garmentCache = new Map();
    this._mountModalDOM();
    this._bindEvents();
  }

  setCatalog(items = []) {
    this.catalog = Array.isArray(items) ? items : [];
    this._renderProductSwitcher();
  }

  /**
   * --------------------------------------------------------------------------
   * 1. AUTO-DETECT PRODUCT CARDS ON ANY HOST PAGE
   * Scans elements matching `[data-vton-product]` and wires their Try-On
   * trigger button (or injects a default "Thử đồ ảo (Try-On)" button).
   * --------------------------------------------------------------------------
   */
  autoDetectProducts(root = document) {
    const cards = Array.from(root.querySelectorAll(this.options.autoDetectSelector));
    this.catalog = [];

    cards.forEach((card, index) => {
      if (card.dataset.vtonBound === '1') return;
      card.dataset.vtonBound = '1';

      const imgEl = card.querySelector('img');
      const product = {
        id: card.dataset.vtonId || `vton-item-${index + 1}`,
        name: card.dataset.vtonName || imgEl?.alt || `Sản phẩm #${index + 1}`,
        price: card.dataset.vtonPrice || '',
        image: card.dataset.vtonSrc || imgEl?.getAttribute('src') || '',
        category: card.dataset.vtonCategory || 'tee',
        description: card.dataset.vtonDesc || 'Trang phục thời trang tách nền PNG',
      };
      this.catalog.push(product);

      // Find an existing button marked `[data-vton-trigger]` or inject one automatically
      let triggerBtn = card.querySelector('[data-vton-trigger]');
      if (!triggerBtn) {
        triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className =
          'vton-auto-btn w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 text-white px-4 py-2.5 text-xs font-semibold tracking-wide hover:bg-emerald-600 transition-colors cursor-pointer';
        triggerBtn.innerHTML = '<span>✨</span> Thử đồ ảo (Try-On)';
        card.appendChild(triggerBtn);
      }

      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.open(product);
      });
    });

    this._renderProductSwitcher();
    return this.catalog;
  }

  /**
   * Open Modal immediately (<1ms) while loading/segmenting garment in parallel!
   */
  async open(product, initialTab = null) {
    this.isOpen = true;
    this.el.backdrop.classList.remove('hidden');
    this.el.backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const target = product || (!this.currentProduct && this.catalog[0]) || null;
    if (target) {
      this._selectingPromise = this.selectProduct(target);
    }

    if (initialTab) {
      this.switchTab(initialTab);
    } else if (this.activeTab === 'camera') {
      this.startCameraAR();
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
    const seq = ++this._selectSeq;
    this.currentProduct = product;
    this.el.modalProductName.textContent = product.name;
    this.el.modalProductMeta.textContent = '⏳ Đang nạp & tách nền trang phục bằng AI...';
    this.el.modalGarmentThumb.src = product.image;

    // Preload HTMLImageElement & run MediaPipe AI Clothes Segmentation for opaque studio/editorial photos
    const rawImg = await this._loadImage(product.image);
    if (seq !== this._selectSeq) return;
    let bestCutout = rawImg
      ? await this._prepareGarmentRenderSource(rawImg, product.category || 'tee')
      : null;

    // If primary editorial photo had heavy prop occlusion (e.g. bouquet covering half the chest),
    // automatically pick the cleanest unoccluded pose-verified angle from product.gallery!
    if (bestCutout?._occluded && Array.isArray(product.gallery) && product.gallery.length > 1) {
      let bestRatio = bestCutout._symmetryRatio || 0;
      for (const altUrl of product.gallery.slice(1, 4)) {
        if (!altUrl || altUrl === product.image) continue;
        const altImg = await this._loadImage(altUrl);
        if (seq !== this._selectSeq) return;
        if (!altImg) continue;
        const altCut = await this._prepareGarmentRenderSource(altImg, product.category || 'tee');
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

    this.el.modalProductMeta.textContent = `${
      GARMENT_FIT_PRESETS[product.category]?.label || 'Trang phục'
    }${product.price ? ` · ${product.price}` : ''}`;
    this._renderProductSwitcher();
  }

  /**
   * Automatically separates pure clothes from model body/face/background!
   * 1. If the image is already a transparent RGBA PNG, returns it untouched.
   * 2. If opaque (e.g. Lalin editorial/studio JPGs), runs MediaPipe ImageSegmenter
   *    (`selfie_multiclass_256x256.tflite`, class 4 = CLOTHES) + PoseLandmarker
   *    (`11,12,23,24`) to extract ONLY the garment pixels with exact shoulder anchor metadata.
   */
  async _prepareGarmentRenderSource(img, category = 'tee') {
    const key = `${img.src}:${category}`;
    if (this._garmentCache?.has(key)) return this._garmentCache.get(key);

    const nw = img.naturalWidth || img.width || 600;
    const nh = img.naturalHeight || img.height || 800;

    // 1. Fast check for pre-cut transparent RGBA PNGs
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
    } catch {
      return img;
    }

    // 2. Render working copy (max 720px) for fast high-precision segmentation + pose detection
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(nw, nh));
    const w = Math.max(64, Math.round(nw * scale));
    const h = Math.max(64, Math.round(nh * scale));

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const sCtx = srcCanvas.getContext('2d');
    sCtx.drawImage(img, 0, 0, w, h);

    // Run MediaPipe Clothes Segmenter (class 4) + PoseLandmarker on the garment model photo
    let clothesMask = null;
    let mw = 0;
    let mh = 0;
    let lalinPose = null;

    try {
      const [segmenter, landmarker] = await Promise.all([
        this._ensureClothesSegmenter(),
        this._ensurePoseLandmarker('IMAGE'),
      ]);

      const segRes = segmenter.segment(srcCanvas);
      const maskObj = segRes?.confidenceMasks?.[4] || segRes?.confidenceMasks?.[1];
      if (maskObj) {
        mw = maskObj.width;
        mh = maskObj.height;
        clothesMask = new Float32Array(maskObj.getAsFloat32Array());
      }
      segRes?.close?.();

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
    } catch (err) {
      console.warn('[VTON] AI clothes segmentation fallback notice:', err);
    }

    if (!clothesMask || !mw || !mh) {
      this._garmentCache?.set(key, img);
      return img;
    }

    const isDress = category === 'dress' || category === 'dresses';

    // Compute pose-guided upper/full body clipping limits so pants don't bleed into upper shirts
    let topCutY = 0;
    let botCutY = h;
    let minXLimit = 0;
    let maxXLimit = w;
    if (lalinPose) {
      const shY = (lalinPose.lShoulder.y + lalinPose.rShoulder.y) / 2;
      const hipY = (lalinPose.lHip.y + lalinPose.rHip.y) / 2;
      const shSpan = Math.max(30, Math.hypot(lalinPose.rShoulder.x - lalinPose.lShoulder.x, lalinPose.rShoulder.y - lalinPose.lShoulder.y));
      const torsoH = Math.max(shSpan * 1.1, Math.abs(hipY - shY));
      topCutY = Math.max(0, shY - shSpan * 0.28);
      botCutY = isDress ? h : Math.min(h, hipY + torsoH * 0.22);
      const midX = (lalinPose.lShoulder.x + lalinPose.rShoulder.x) / 2;
      const sidePad = isDress ? shSpan * 1.02 : shSpan * 0.85;
      minXLimit = Math.max(0, midX - sidePad);
      maxXLimit = Math.min(w, midX + sidePad);
    }

    // Bilinear upsample of smooth clothes probability mask -> apply alpha + find tight garment bbox
    const imgData = sCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let upperLeftCount = 0;
    let upperRightCount = 0;
    const symCenterX = lalinPose
      ? (lalinPose.lShoulder.x + lalinPose.rShoulder.x) / 2
      : w * 0.5;
    const upperBandMaxY = lalinPose
      ? lalinPose.lShoulder.y + Math.abs(lalinPose.lHip.y - lalinPose.lShoulder.y) * 0.68
      : h * 0.6;

    for (let y = 0; y < h; y++) {
      const fy = ((y + 0.5) / h) * mh - 0.5;
      const y0 = Math.max(0, Math.min(mh - 1, Math.floor(fy)));
      const y1 = Math.max(0, Math.min(mh - 1, y0 + 1));
      const wy = Math.max(0, Math.min(1, fy - y0));

      // Vertical feather near top/bottom pose crop limits
      let regionWeight = 1;
      if (y < topCutY || y > botCutY) regionWeight = 0;
      else if (!isDress && y > botCutY - 16) regionWeight = (botCutY - y) / 16;

      // Track scanline row alphas to strip detached floating props/veils far from torso center
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

        // Smooth probability ramp [0.34..0.68] for crisp anti-aliased fabric contour
        const alphaNorm = Math.max(0, Math.min(1, (prob - 0.34) / 0.34)) * regionWeight;
        d[idx + 3] = Math.round(alphaNorm * 255);
      }

      // Scanline island filter: keep only main central garment run contiguous across torso center
      if (regionWeight > 0) {
        const cX = Math.max(0, Math.min(w - 1, Math.round(symCenterX)));
        // Find nearest opaque pixel near center
        let seedX = -1;
        for (let off = 0; off <= 45; off++) {
          if (cX + off < w && d[(rowStart + cX + off) * 4 + 3] > 35) { seedX = cX + off; break; }
          if (cX - off >= 0 && d[(rowStart + cX - off) * 4 + 3] > 35) { seedX = cX - off; break; }
        }
        if (seedX !== -1) {
          let lx = seedX;
          let gap = 0;
          while (lx > 0 && gap < 14) {
            lx--;
            if (d[(rowStart + lx) * 4 + 3] > 28) gap = 0;
            else gap++;
          }
          let rx = seedX;
          gap = 0;
          while (rx < w - 1 && gap < 14) {
            rx++;
            if (d[(rowStart + rx) * 4 + 3] > 28) gap = 0;
            else gap++;
          }
          for (let x = 0; x < w; x++) {
            const idx = (rowStart + x) * 4;
            if (x < lx || x > rx) {
              d[idx + 3] = 0;
            } else if (d[idx + 3] > 45) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              if (y <= upperBandMaxY) {
                if (x < symCenterX) upperLeftCount++;
                else upperRightCount++;
              }
            }
          }
        } else {
          for (let x = 0; x < w; x++) {
            const idx = (rowStart + x) * 4;
            if (d[idx + 3] > 45) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              if (y <= upperBandMaxY) {
                if (x < symCenterX) upperLeftCount++;
                else upperRightCount++;
              }
            }
          }
        }
      }
    }
    sCtx.putImageData(imgData, 0, 0);

    if (maxX <= minX + 16 || maxY <= minY + 16) {
      this._garmentCache?.set(key, img);
      return img;
    }

    // Tight crop with 10px margin onto final transparent garment canvas
    const pad = 10;
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(w - cx, maxX - minX + pad * 2);
    const ch = Math.min(h - cy, maxY - minY + pad * 2);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cw;
    outCanvas.height = ch;
    outCanvas.getContext('2d').drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);

    // Track left/right symmetry specifically across the upper chest band so bouquet/prop occlusion triggers alt image
    const symMax = Math.max(1, upperLeftCount, upperRightCount);
    const symMin = Math.min(upperLeftCount, upperRightCount);
    outCanvas._hasPose = Boolean(lalinPose);
    outCanvas._edgeClipped = minX <= 8 || maxX >= w - 8;
    outCanvas._symmetryRatio = symMin / symMax;
    outCanvas._occluded = outCanvas._hasPose && outCanvas._symmetryRatio < 0.62;

    // Attach exact measured shoulder geometry inside the cropped canvas so it aligns 1:1 with user pose
    if (lalinPose) {
      const shMidX = (lalinPose.lShoulder.x + lalinPose.rShoulder.x) / 2 - cx;
      const shMidY = (lalinPose.lShoulder.y + lalinPose.rShoulder.y) / 2 - cy;
      const shSpan = Math.hypot(
        lalinPose.rShoulder.x - lalinPose.lShoulder.x,
        lalinPose.rShoulder.y - lalinPose.lShoulder.y
      );
      outCanvas._vtonMeta = {
        shoulderCenterRatioX: Math.max(0.25, Math.min(0.75, shMidX / cw)),
        shoulderYRatio: Math.max(0.04, Math.min(0.32, shMidY / ch)),
        shoulderSpanRatioW: Math.max(0.28, Math.min(0.88, shSpan / cw)),
      };
    }

    this._garmentCache?.set(key, outCanvas);
    return outCanvas;
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
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 2. TAB 1: REAL-TIME CAMERA AR (@mediapipe/tasks-vision PoseLandmarker)
   * Zero Server Cost — runs 100% client-side in WebAssembly + GPU delegate
   * --------------------------------------------------------------------------
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
        } catch (gpuErr) {
          console.warn('[VTON] GPU delegate unavailable, falling back to CPU WASM:', gpuErr);
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

      // Backwards-compatible alias for inspection
      this.poseLandmarker = this[targetProp];
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
        } catch (gpuErr) {
          console.warn('[VTON] Segmenter GPU fallback to CPU:', gpuErr);
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

  async startCameraAR() {
    this.el.camPermissionBox.classList.add('hidden');
    this.el.camStatusPill.textContent = '⏳ Đang xin quyền Camera & tải MediaPipe AI...';
    this.el.camStatusPill.dataset.state = 'loading';

    // Check browser secure context & MediaDevices API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._showCameraError(
        !window.isSecureContext
          ? 'Trình duyệt yêu cầu kết nối bảo mật HTTPS (hoặc localhost) để truy cập Camera.'
          : 'Trình duyệt hiện tại không hỗ trợ API getUserMedia.'
      );
      return;
    }

    try {
      // Stop any stale stream before requesting a fresh one
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

      // Match canvas internal resolution to real camera frame aspect ratio
      const canvas = this.el.arCanvas;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Load MediaPipe PoseLandmarker (dedicated VIDEO instance)
      this.el.camStatusPill.textContent = '🧠 Đang khởi động AI PoseLandmarker (client-side)...';
      await this._ensurePoseLandmarker('VIDEO');

      this.el.camStatusPill.textContent = '● AR LIVE · Đang nhận diện vai & hông (11,12,23,24)';
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
      return 'Bạn đã chặn quyền truy cập Camera. Vui lòng bấm biểu tượng Ổ khóa (🔒) trên thanh địa chỉ trình duyệt -> Cho phép Camera -> bấm "Thử lại".';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Không tìm thấy Webcam / Camera trên thiết bị này. Bạn có thể chuyển sang Tab "Thử qua Ảnh Tĩnh" để trải nghiệm ngay!';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera đang được sử dụng bởi ứng dụng khác (Zoom, Meet, OBS...). Hãy tắt ứng dụng kia rồi bấm "Thử lại".';
    }
    return `Không thể mở Camera (${err?.message || 'Lỗi không xác định'}). Hãy kiểm tra quyền trình duyệt hoặc dùng Tab Ảnh Tĩnh.`;
  }

  _showCameraError(message) {
    this.el.camStatusPill.textContent = '⚠ Camera bị chặn hoặc chưa sẵn sàng';
    this.el.camStatusPill.dataset.state = 'error';
    this.el.camPermissionMsg.textContent = message;
    this.el.camPermissionBox.classList.remove('hidden');
  }

  /**
   * --------------------------------------------------------------------------
   * REAL-TIME POSE TRACKING & GARMENT OVERLAY MATH (60 FPS REQUESTANIMATIONFRAME)
   *
   * MediaPipe PoseLandmarker indices used:
   *   - 11: Left Shoulder   (vai trái thực của người dùng)
   *   - 12: Right Shoulder  (vai phải thực của người dùng)
   *   - 23: Left Hip        (hông trái)
   *   - 24: Right Hip       (hông phải)
   *
   * NOTE ON MIRRORED CAMERA COORDINATES:
   * Because selfie video is rendered mirrored horizontally (scaleX(-1)),
   * a normalized MediaPipe coordinate `lm.x` (0..1 on the raw video) maps to:
   *   canvasX = mirrorCamera ? (1 - lm.x) * W : lm.x * W
   *   canvasY = lm.y * H
   * --------------------------------------------------------------------------
   */
  _runARFrameLoop() {
    const video = this.el.video;
    const canvas = this.el.arCanvas;
    const ctx = canvas.getContext('2d');

    const step = () => {
      if (!this.isOpen || this.activeTab !== 'camera') return;

      const W = canvas.width;
      const H = canvas.height;

      if (video.readyState >= 2) {
        // 1. Draw webcam video frame onto <canvas> (mirrored like a fitting-room mirror)
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        if (this.arSettings.mirrorCamera) {
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, W, H);
        ctx.restore();

        // 2. Run PoseLandmarker inference (dedicated VIDEO instance) when a new video frame arrives
        if (this.poseVideoLandmarker && video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = video.currentTime;
          try {
            const result = this.poseVideoLandmarker.detectForVideo(video, performance.now());
            const rawLm = result?.landmarks?.[0];
            if (rawLm && rawLm.length > 24) {
              this._updateSmoothedPose(rawLm, W, H);
            }
          } catch (e) {
            // Gracefully skip rare frame decode glitch
          }
        }

        // 3. Draw garment overlay aligned to smoothed Shoulder (11,12) & Hip (23,24) coordinates
        if (this.smoothedPose && this.currentGarmentImg) {
          const fit = this.computeGarmentGeometry(
            this.smoothedPose,
            this.currentProduct?.category || 'tee',
            this.arSettings,
            this.currentGarmentImg
          );
          this.drawGarmentOverlay(ctx, this.currentGarmentImg, fit);

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

  /**
   * Exponential Moving Average (EMA) low-pass filter on landmarks 11, 12, 23, 24.
   * Eliminates subtle landmark trembling while keeping body movement responsive.
   */
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

    // Alpha = 0.36 balances responsiveness (fast arm turns) and smoothness
    const alpha = 0.36;
    for (const key of ['lShoulder', 'rShoulder', 'lHip', 'rHip']) {
      this.smoothedPose[key].x += (target[key].x - this.smoothedPose[key].x) * alpha;
      this.smoothedPose[key].y += (target[key].y - this.smoothedPose[key].y) * alpha;
      this.smoothedPose[key].visibility = target[key].visibility;
    }
  }

  /**
   * --------------------------------------------------------------------------
   * CORE GEOMETRY FORMULA: SHOULDER & HIP LANDMARKS -> GARMENT TRANSFORM
   *
   * 1. Mid-Shoulder Point:   S_mid = (L11 + R12) / 2
   * 2. Mid-Hip Point:        H_mid = (L23 + R24) / 2
   * 3. Shoulder Vector & Width:
   *      Sort Leftmost/Rightmost visual shoulder points (pLeft, pRight) so angle
   *      never flips 180deg regardless of camera mirror state:
   *        dx = pRight.x - pLeft.x
   *        dy = pRight.y - pLeft.y
   *        shoulderWidth = sqrt(dx^2 + dy^2)
   *        tiltAngle     = atan2(dy, dx)
   * 4. Torso Axis & Height (Perspective-aware Aspect Ratio Preservation):
   *        torsoHeight   = hypot(H_mid.x - S_mid.x, H_mid.y - S_mid.y)
   *        naturalH      = drawW / (garmentImg.naturalWidth / garmentImg.naturalHeight)
   *        torsoTargetH  = torsoHeight * preset.torsoLengthMultiplier
   *        drawH         = 0.55 * naturalH + 0.45 * torsoTargetH
   *    Blends exact body hip height with natural PNG aspect ratio so collars,
   *    sleeves and hems never stretch unnaturally on any camera aspect ratio.
   * 5. Shoulder Pivot Transform:
   *      Pivot at (S_mid.x, S_mid.y + userOffsetY) -> rotate(tiltAngle) ->
   *      draw at (-drawW / 2, -drawH * preset.shoulderYRatio) so shoulder seams
   *      stay locked right atop landmarks (11, 12) when bending/tilting!
   * --------------------------------------------------------------------------
   */
  computeGarmentGeometry(
    pose,
    category = 'tee',
    settings = { scalePct: 100, offsetY: 0 },
    garmentImg = null
  ) {
    const preset = GARMENT_FIT_PRESETS[category] || GARMENT_FIT_PRESETS.tee;

    const shoulderMid = {
      x: (pose.lShoulder.x + pose.rShoulder.x) / 2,
      y: (pose.lShoulder.y + pose.rShoulder.y) / 2,
    };

    const hipMid = {
      x: (pose.lHip.x + pose.rHip.x) / 2,
      y: (pose.lHip.y + pose.rHip.y) / 2,
    };

    // Order horizontally on screen so tiltAngle stays within [-32°, +32°]
    const leftScreenShoulder =
      pose.lShoulder.x <= pose.rShoulder.x ? pose.lShoulder : pose.rShoulder;
    const rightScreenShoulder =
      pose.lShoulder.x <= pose.rShoulder.x ? pose.rShoulder : pose.lShoulder;

    const dx = rightScreenShoulder.x - leftScreenShoulder.x;
    const dy = rightScreenShoulder.y - leftScreenShoulder.y;
    const shoulderWidth = Math.max(40, Math.hypot(dx, dy));

    // Clamp angle gently for natural wearability
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
    const userOffsetY = Number(settings.offsetY) || 0;

    // Use measured shoulder metadata when available from segmented Lalin studio garments
    const meta = garmentImg?._vtonMeta;
    const widthMult = meta ? 1 / meta.shoulderSpanRatioW : preset.widthMultiplier;
    const effectiveShoulderYRatio = meta ? meta.shoulderYRatio : preset.shoulderYRatio;

    const drawW = shoulderWidth * widthMult * userScale;
    const torsoTargetH = torsoHeight * preset.torsoLengthMultiplier * userScale;

    let drawH = torsoTargetH;
    const gw = garmentImg?.naturalWidth || garmentImg?.width;
    const gh = garmentImg?.naturalHeight || garmentImg?.height;
    if (gw && gh) {
      const naturalAspect = gw / gh;
      const naturalH = drawW / naturalAspect;
      drawH = meta ? naturalH : hipsVisible ? 0.55 * naturalH + 0.45 * torsoTargetH : naturalH;
    }

    // Center garment horizontally by actual shoulder midpoint inside extracted canvas
    const centerShiftX = meta ? (0.5 - meta.shoulderCenterRatioX) * drawW : 0;

    // Pivot directly at shoulder midpoint so collar locks onto neck & shoulders while tilting
    const anchorX = shoulderMid.x;
    const anchorY = shoulderMid.y + userOffsetY;

    return {
      shoulderMid,
      hipMid,
      shoulderWidth,
      torsoHeight,
      angle,
      drawW,
      drawH,
      centerShiftX,
      shoulderYRatio: effectiveShoulderYRatio,
      anchorX,
      anchorY,
    };
  }

  /**
   * Renders the transparent garment PNG rotated around the shoulder midpoint pivot,
   * with subtle ambient drop-shadow so it blends realistically onto the body.
   */
  drawGarmentOverlay(ctx, garmentImg, fit) {
    ctx.save();
    ctx.translate(fit.anchorX, fit.anchorY);
    ctx.rotate(fit.angle);

    // Subtle fabric contact shadow against shirt/skin underneath
    ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    const topY = -fit.drawH * (fit.shoulderYRatio ?? 0.14);
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
   * Optional visual overlay showing landmarks 11, 12, 23, 24 & shoulder-hip vectors.
   */
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

    const joints = [
      ['11', pose.lShoulder],
      ['12', pose.rShoulder],
      ['23', pose.lHip],
      ['24', pose.rHip],
    ];
    for (const [id, pt] of joints) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(id, pt.x + 10, pt.y + 4);
    }

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(fit.shoulderMid.x, fit.shoulderMid.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * --------------------------------------------------------------------------
   * CAPTURE PHOTO & 5-SECOND VIDEO RECORDING (MediaRecorder API)
   * --------------------------------------------------------------------------
   */
  capturePhoto() {
    const canvas = this.el.arCanvas;
    if (!canvas || !canvas.width || !canvas.height) {
      this._toast('⚠ Camera chưa sẵn sàng khung hình để chụp.');
      return;
    }
    this._toast('📸 Đang lưu ảnh thử đồ PNG...');
    const fallbackDownload = () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        this._triggerDownload(dataUrl, `vton-look-${Date.now()}.png`);
        this._toast('📸 Đã chụp & lưu ảnh thử đồ về máy!');
      } catch (err) {
        this._toast(`⚠ Không thể xuất ảnh (${err?.message || 'Canvas error'}).`);
      }
    };

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (!blob) {
          fallbackDownload();
          return;
        }
        const url = URL.createObjectURL(blob);
        this._triggerDownload(url, `vton-look-${Date.now()}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        this._toast('📸 Đã chụp & lưu ảnh thử đồ về máy!');
      }, 'image/png');
    } else {
      fallbackDownload();
    }
  }

  startVideoRecording5s() {
    if (this.isRecording) {
      this._stopVideoRecording(false);
      return;
    }

    const canvas = this.el.arCanvas;
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      this._toast('Trình duyệt này chưa hỗ trợ quay video Canvas (MediaRecorder API).');
      return;
    }

    const stream = canvas.captureStream(30);
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
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
      this._triggerDownload(url, `vton-video-5s-${Date.now()}.${ext}`);
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
   * --------------------------------------------------------------------------
   * 3. TAB 2: STATIC PHOTO AI TRY-ON (@gradio/client + POSE CANVAS FALLBACK)
   * Zero paid APIs: connects to open-source Hugging Face Spaces (IDM-VTON / CatVTON),
   * with instant local MediaPipe PoseLandmarker (IMAGE mode) fallback if busy.
   * --------------------------------------------------------------------------
   */
  async loadSamplePortrait() {
    const url = this.options.defaultSamplePortrait;
    const img = await this._loadImage(url);
    if (!img) {
      this._toast('Không tải được ảnh mẫu. Vui lòng tải ảnh chân dung từ máy!');
      return;
    }
    this.personImg = img;
    this.personDataUrl = url;
    this.personFile = null;
    this.el.staticBeforeImg.src = url;
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
    this.el.staticBeforeImg.src = dataUrl;
    this.el.staticResultBox.classList.remove('hidden');
    this.el.staticEmptyBox.classList.add('hidden');

    await this.runStaticPhotoTryOn();
  }

  /**
   * Main Tab 2 pipeline:
   * 1. If AI mode selected ("auto"), try free open-source Hugging Face Space
   *    via `@gradio/client` with strict 18s timeout protection.
   * 2. If Space is overloaded / ZeroGPU quota / paused / offline, fall back
   *    seamlessly to local MediaPipe Pose Detection (IMAGE mode) + Canvas Fit.
   */
  async runStaticPhotoTryOn() {
    if (this._selectingPromise) {
      this.el.staticLoading.classList.remove('hidden');
      this.el.staticLoadingText.textContent = 'Đang tách nền trang phục AI...';
      await this._selectingPromise;
    }
    if (!this.personImg || !this.currentGarmentImg) {
      this.el.staticLoading.classList.add('hidden');
      this._toast('Vui lòng tải lên 1 ảnh chân dung (nửa người hoặc toàn thân).');
      return;
    }

    this.el.staticLoading.classList.remove('hidden');
    this.el.staticBadge.textContent = '⏳ Đang phân tích ảnh & thử kết nối AI miễn phí...';

    try {
      let usedFallbackReason = '';

      if (this.staticEngine === 'auto') {
        try {
          this.el.staticLoadingText.textContent =
            `Đang gửi yêu cầu tới Hugging Face (${this.hfSpace}) qua @gradio/client...`;

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
          console.info('[VTON] Hugging Face Space unavailable, activating Pose+Canvas fallback:', usedFallbackReason);
        }
      }

      // Smart Fallback (or Instant Local Mode): MediaPipe PoseLandmarker (IMAGE mode) + Canvas
      this.el.staticLoadingText.textContent =
        'Đang chạy PoseLandmarker (IMAGE mode) + Canvas Smart Fit (100% Client-Side)...';
      const fittedDataUrl = await this._runStaticPoseCanvasFallback(
        this.personImg,
        this.currentGarmentImg,
        this.currentProduct?.category || 'tee'
      );

      this.afterDataUrl = fittedDataUrl;
      this.el.staticAfterImg.src = fittedDataUrl;
      this.el.staticBadge.textContent = usedFallbackReason
        ? `⚡ Smart Pose + Canvas Fallback (${usedFallbackReason})`
        : '⚡ Smart Pose + Canvas AI (Client-side 0s)';
      this.el.staticBadge.dataset.mode = 'fallback';
    } finally {
      this.el.staticLoading.classList.add('hidden');
    }
  }

  /**
   * Free Open-Source Hugging Face Inference via `@gradio/client`.
   * Matches live API schemas of `yisol/IDM-VTON` (`/tryon`) and `zhengchong/CatVTON`.
   */
  async _callFreeHuggingFaceSpace(spaceId, personBlob, garmentBlob, product) {
    const TIMEOUT_MS = 16000;
    const preset = GARMENT_FIT_PRESETS[product?.category || 'tee'] || GARMENT_FIT_PRESETS.tee;

    // Fast 3s preflight check: fail fast if Hugging Face public Space returns 503/404/paused
    const spaceSubdomain = spaceId.replace('/', '-').toLowerCase();
    const preController = new AbortController();
    const preTimer = setTimeout(() => preController.abort(), 3000);
    try {
      const infoRes = await fetch(`https://${spaceSubdomain}.hf.space/info`, {
        signal: preController.signal,
      });
      if (!infoRes.ok) {
        throw new Error(`Hugging Face Space ${spaceId} đang bận/ngủ đông (HTTP ${infoRes.status})`);
      }
    } catch (preErr) {
      clearTimeout(preTimer);
      throw new Error(
        preErr.name === 'AbortError'
          ? `Hugging Face Space ${spaceId} phản hồi chậm`
          : preErr.message
      );
    }
    clearTimeout(preTimer);

    const task = (async () => {
      const { Client, handle_file } = await import(GRADIO_CLIENT_CDN);
      const app = await Client.connect(spaceId);

      if (spaceId === 'zhengchong/CatVTON') {
        const res = await app.predict('/submit_function', {
          person_image: {
            background: handle_file(personBlob),
            layers: [],
            composite: null,
          },
          cloth_image: handle_file(garmentBlob),
          cloth_type: preset.hfCategory === 'dresses' ? 'overall' : 'upper',
          num_inference_steps: 40,
          guidance_scale: 2.5,
          seed: 42,
        });
        const out = res?.data?.[0];
        const url = typeof out === 'string' ? out : out?.url;
        if (!url) throw new Error('CatVTON không trả về ảnh');
        return url;
      }

      // Default: yisol/IDM-VTON (/tryon exact parameter contract)
      const res = await app.predict('/tryon', {
        dict: {
          background: handle_file(personBlob),
          layers: [],
          composite: null,
        },
        garm_img: handle_file(garmentBlob),
        garment_des: product?.name || 'Fashion upper garment',
        is_checked: true,       // Auto human parsing mask
        is_checked_crop: false, // Preserve original aspect framing
        denoise_steps: 30,
        seed: 42,
      });
      const out = res?.data?.[0];
      const url = typeof out === 'string' ? out : out?.url;
      if (!url) throw new Error('IDM-VTON không trả về ảnh');
      return url;
    })();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Hugging Face ZeroGPU quá tải/hết thời gian chờ')), TIMEOUT_MS)
    );

    return Promise.race([task, timeout]);
  }

  /**
   * Smart Fallback Engine: Runs MediaPipe PoseLandmarker (`runningMode: "IMAGE"`)
   * directly on the uploaded static portrait, locates landmarks (11,12,23,24),
   * composites the transparent PNG with body-matched tilt, scale & soft contact shadow.
   */
  async _runStaticPoseCanvasFallback(personImg, garmentImg, category = 'tee') {
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
        console.warn('[VTON] Static image pose detection fallback notice:', e);
      }

      // Geometric chest fallback if photo is extreme close-up without clear hips/shoulders
      if (!detectedPose) {
        detectedPose = {
          lShoulder: { x: W * 0.34, y: H * 0.32, visibility: 0.9 },
          rShoulder: { x: W * 0.66, y: H * 0.32, visibility: 0.9 },
          lHip: { x: W * 0.37, y: H * 0.64, visibility: 0.9 },
          rHip: { x: W * 0.63, y: H * 0.64, visibility: 0.9 },
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

    const fit = this.computeGarmentGeometry(
      detectedPose,
      category,
      {
        scalePct: this.arSettings.scalePct,
        offsetY: this.arSettings.offsetY * (H / 720), // normalize offset to portrait resolution
      },
      garmentImg
    );

    this.drawGarmentOverlay(ctx, garmentImg, fit);
    if (this.arSettings.showSkeleton) {
      this.drawDebugSkeleton(ctx, detectedPose, fit);
    }
    return canvas.toDataURL('image/png');
  }

  _refreshStaticFallbackLive() {
    if (
      this.activeTab !== 'photo' ||
      !this.personImg ||
      !this.currentGarmentImg ||
      !this.staticDetectedPose ||
      this.el.staticBadge.dataset.mode === 'hf'
    ) {
      return;
    }
    const url = this._renderStaticPoseCanvas(
      this.personImg,
      this.currentGarmentImg,
      this.currentProduct?.category || 'tee',
      this.staticDetectedPose
    );
    this.afterDataUrl = url;
    this.el.staticAfterImg.src = url;
  }

  downloadStaticResult() {
    if (!this.afterDataUrl) return;
    this._triggerDownload(this.afterDataUrl, `ai-tryon-result-${Date.now()}.png`);
    this._toast('⬇ Đã tải ảnh kết quả thử đồ về máy!');
  }

  /**
   * --------------------------------------------------------------------------
   * UI BUILDER & EVENT WIRING (TAILWIND CSS)
   * --------------------------------------------------------------------------
   */
  _tabActiveClass() {
    return 'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition';
  }

  _tabIdleClass() {
    return 'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-neutral-600 hover:text-neutral-950 px-3.5 py-2 text-xs font-medium transition';
  }

  _mountModalDOM() {
    if (document.getElementById('free-vton-modal-backdrop')) return;

    // Auto-inject Tailwind Play CDN (with preflight disabled so host site CSS stays intact!)
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
      'hidden fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-y-auto text-left';

    wrapper.innerHTML = `
      <style>
        #free-vton-modal-backdrop *, #free-vton-modal-backdrop *::before, #free-vton-modal-backdrop *::after {
          box-sizing: border-box;
        }
        #free-vton-modal-backdrop button {
          border-style: solid;
          border-width: 0;
          font-family: inherit;
        }
        #free-vton-modal-backdrop h3, #free-vton-modal-backdrop h4, #free-vton-modal-backdrop p {
          margin: 0;
        }
      </style>
      <div class="relative w-full max-w-5xl bg-white text-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 flex flex-col max-h-[95dvh]" role="dialog" aria-modal="true" aria-labelledby="vton-modal-title">

        <!-- TOP HEADER BAR -->
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-neutral-100 bg-neutral-50/80">
          <div class="flex items-center gap-3 min-w-0">
            <img id="vton-garment-thumb" src="" alt="Garment" class="w-10 h-12 object-contain bg-white rounded-lg border border-neutral-200 p-0.5 shrink-0" />
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">100% Free AI</span>
                <span id="vton-product-meta" class="text-xs text-neutral-500 truncate">Trang phục tách nền PNG</span>
              </div>
              <h3 id="vton-modal-title" class="font-bold text-sm sm:text-base text-neutral-950 truncate">Đang nạp sản phẩm...</h3>
            </div>
          </div>

          <!-- TAB SWITCHER + CLOSE -->
          <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div class="inline-flex p-1 rounded-xl bg-neutral-200/75 w-full sm:w-auto">
              <button type="button" id="vton-tab-camera" class="${this._tabActiveClass()}">
                🎥 Camera AR (0₫)
              </button>
              <button type="button" id="vton-tab-photo" class="${this._tabIdleClass()}">
                🖼️ Thử Ảnh Tĩnh (AI)
              </button>
            </div>
            <button type="button" id="vton-close-btn" aria-label="Đóng" class="w-9 h-9 rounded-full bg-neutral-100 hover:bg-red-500 hover:text-white text-neutral-700 flex items-center justify-center font-bold transition shrink-0 cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        <!-- BODY -->
        <div class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">

          <!-- LEFT STAGE (CANVAS AR OR STATIC COMPARISON) -->
          <div class="lg:col-span-8 bg-neutral-950 relative flex flex-col min-h-[380px] sm:min-h-[500px]">

            <!-- TAB 1: REAL-TIME CAMERA AR PANEL -->
            <div id="vton-panel-camera" class="flex-1 relative flex items-center justify-center overflow-hidden">
              <video id="vton-webcam-video" playsinline muted class="hidden"></video>
              <canvas id="vton-ar-canvas" class="w-full h-full max-h-[68vh] object-contain block"></canvas>

              <!-- Floating HUD Telemetry -->
              <div class="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <span id="vton-cam-status" class="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-black/70 text-emerald-300 border border-white/15 backdrop-blur">
                  ⏳ Đang khởi động Camera AR...
                </span>
                <span id="vton-cam-pose-badge" class="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-mono bg-black/65 text-neutral-200 border border-white/10 backdrop-blur">
                  PoseLandmarker 11,12,23,24
                </span>
              </div>

              <!-- Camera Permission / Fallback Alert Card -->
              <div id="vton-cam-permission-box" class="hidden absolute inset-0 z-20 bg-neutral-950/92 backdrop-blur-md flex items-center justify-center p-6 text-center">
                <div class="max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-white shadow-xl">
                  <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">📷</div>
                  <h4 class="font-bold text-base mb-2">Cần cấp quyền sử dụng Camera</h4>
                  <p id="vton-cam-permission-msg" class="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5"></p>
                  <div class="flex flex-wrap gap-2 justify-center">
                    <button type="button" id="vton-retry-cam-btn" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs cursor-pointer">
                      🔄 Thử cấp quyền lại
                    </button>
                    <button type="button" id="vton-goto-photo-btn" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer">
                      🖼️ Chuyển sang Thử Ảnh Tĩnh
                    </button>
                  </div>
                </div>
              </div>

              <!-- Bottom Action Bar: Capture Photo & Record 5s Video -->
              <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-center gap-2.5 z-10">
                <button type="button" id="vton-capture-photo-btn" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-100 font-semibold text-xs shadow-lg cursor-pointer transition">
                  📸 Chụp ảnh
                </button>
                <button type="button" id="vton-record-video-btn" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-500 text-neutral-950 hover:bg-emerald-400 font-semibold text-xs shadow-lg cursor-pointer transition">
                  🎥 Quay Video (5s)
                </button>
              </div>
            </div>

            <!-- TAB 2: STATIC PHOTO AI FIT PANEL -->
            <div id="vton-panel-photo" class="hidden flex-1 relative flex flex-col justify-between bg-neutral-950 p-3 sm:p-5">
              <!-- Top Toolbar inside Static Photo -->
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span id="vton-static-badge" class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  🤖 AI Generative (@gradio/client) + Smart Pose Fallback
                </span>
                <div class="flex items-center gap-2">
                  <button type="button" id="vton-use-sample-btn" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition">
                    👤 Dùng ảnh mẫu
                  </button>
                  <button type="button" id="vton-upload-portrait-btn" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold cursor-pointer transition">
                    📤 Tải ảnh của bạn
                  </button>
                  <input type="file" id="vton-portrait-input" accept="image/*" class="hidden" />
                </div>
              </div>

              <!-- Empty Dropzone before user uploads -->
              <div id="vton-static-empty" class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-2xl p-6 text-center text-neutral-300 min-h-[300px]">
                <div class="text-4xl mb-3">👗</div>
                <h4 class="font-semibold text-white text-base mb-1">Tải lên 1 tấm ảnh toàn thân hoặc nửa người</h4>
                <p class="text-xs text-neutral-400 max-w-md mb-5">
                  Hỗ trợ kết nối Hugging Face (<code class="text-emerald-300">yisol/IDM-VTON</code> / <code class="text-emerald-300">zhengchong/CatVTON</code>) miễn phí hoặc ghép trực tiếp bằng MediaPipe Pose + Canvas nếu Space đang bận.
                </p>
                <div class="flex flex-wrap gap-3 justify-center">
                  <button type="button" id="vton-empty-upload-btn" class="px-5 py-2.5 rounded-xl bg-white text-neutral-950 font-semibold text-xs hover:bg-neutral-200 cursor-pointer transition">
                    📤 Chọn ảnh từ thiết bị
                  </button>
                  <button type="button" id="vton-empty-sample-btn" class="px-5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-600 text-white font-medium text-xs hover:bg-neutral-700 cursor-pointer transition">
                    ✨ Thử ngay với ảnh người mẫu
                  </button>
                </div>
              </div>

              <!-- Interactive Before / After Comparison Slider -->
              <div id="vton-static-result-box" class="hidden flex-1 flex flex-col items-center justify-center relative">
                <div id="vton-compare-stage" class="relative w-full max-w-[440px] aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 select-none touch-none cursor-ew-resize shadow-2xl">
                  <!-- AFTER (Full layer beneath) -->
                  <img id="vton-after-img" src="" alt="Kết quả thử đồ AI" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  <!-- BEFORE (Clipped on left side of slider handle) -->
                  <img id="vton-before-img" src="" alt="Ảnh gốc" class="absolute inset-0 w-full h-full object-cover pointer-events-none" style="clip-path: inset(0 45% 0 0);" />

                  <!-- Labels -->
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider">Trước (Gốc)</span>
                  <span class="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-600/85 text-white text-[10px] font-bold uppercase tracking-wider">Sau (Try-On)</span>

                  <!-- Vertical Divider Handle -->
                  <div id="vton-compare-divider" class="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none" style="left: 55%;">
                    <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-neutral-950 font-bold text-xs shadow-xl flex items-center justify-center border-2 border-emerald-500">
                      ⇄
                    </div>
                  </div>
                </div>

                <!-- Range Fallback + Download Result -->
                <div class="w-full max-w-[440px] flex items-center justify-between gap-3 mt-3">
                  <input type="range" id="vton-compare-range" min="0" max="100" value="55" class="flex-1 accent-emerald-500 cursor-pointer" aria-label="Thanh kéo so sánh Trước Sau" />
                  <button type="button" id="vton-download-static-btn" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs cursor-pointer transition shrink-0">
                    ⬇ Tải ảnh kết quả
                  </button>
                </div>
              </div>

              <!-- Loading Overlay inside Tab 2 -->
              <div id="vton-static-loading" class="hidden absolute inset-0 z-20 bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                <div class="w-10 h-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3"></div>
                <p id="vton-static-loading-text" class="text-xs sm:text-sm font-semibold max-w-sm">Đang xử lý ảnh...</p>
              </div>
            </div>
          </div>

          <!-- RIGHT CONTROL SIDEBAR (FIT SLIDERS, PRODUCT PICKER, AI OPTIONS) -->
          <div class="lg:col-span-4 bg-white p-4 sm:p-5 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-neutral-200 overflow-y-auto">

            <!-- Product Switcher -->
            <div>
              <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">Chọn nhanh sản phẩm (PNG tách nền)</h4>
              <div id="vton-product-switcher" class="grid grid-cols-4 gap-2"></div>
            </div>

            <!-- Manual Fit Calibration Sliders -->
            <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Tinh chỉnh phom thủ công</h4>
                <button type="button" id="vton-reset-fit-btn" class="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer">Đặt lại</button>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-neutral-600">Phóng to / Thu nhỏ</span>
                  <span id="vton-scale-val" class="font-mono font-semibold">100%</span>
                </div>
                <input type="range" id="vton-scale-slider" min="70" max="150" value="100" class="w-full accent-neutral-950 cursor-pointer" />
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-neutral-600">Dịch chuyển lên / xuống</span>
                  <span id="vton-offsety-val" class="font-mono font-semibold">0px</span>
                </div>
                <input type="range" id="vton-offsety-slider" min="-120" max="120" value="0" class="w-full accent-neutral-950 cursor-pointer" />
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-neutral-200 text-xs">
                <label class="inline-flex items-center gap-2 cursor-pointer text-neutral-700">
                  <input type="checkbox" id="vton-skeleton-toggle" class="rounded accent-emerald-600" />
                  <span>Hiện khớp vai &amp; hông (11,12,23,24)</span>
                </label>
              </div>
            </div>

            <!-- Static Photo Engine Selector -->
            <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-4 space-y-2.5">
              <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Cấu hình Tab Ảnh Tĩnh (Miễn Phí)</h4>
              <label class="block text-xs text-neutral-600">Mô hình Hugging Face (@gradio/client):</label>
              <select id="vton-hf-space-select" class="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs font-medium text-neutral-900">
                <option value="yisol/IDM-VTON">yisol/IDM-VTON (Public Space + Auto Fallback)</option>
                <option value="zhengchong/CatVTON">zhengchong/CatVTON (Lightweight + Auto Fallback)</option>
              </select>
              <div class="flex items-center gap-3 pt-1 text-xs">
                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="vtonEngineMode" value="auto" checked class="accent-emerald-600" />
                  <span>HF AI + Auto Fallback</span>
                </label>
                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="vtonEngineMode" value="pose-canvas" class="accent-emerald-600" />
                  <span>Canvas + Pose Tức thì</span>
                </label>
              </div>
              <button type="button" id="vton-rerun-static-btn" class="w-full mt-2 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer transition">
                ✨ Ghép lại ảnh tĩnh với cấu hình mới
              </button>
            </div>

            <div class="mt-auto text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-3">
              🔒 <strong>Quyền riêng tư:</strong> Luồng Camera AR và PoseLandmarker xử lý hoàn toàn tại trình duyệt của bạn (0₫ chi phí server).
            </div>
          </div>

        </div>
      </div>

      <!-- Toast Feedback -->
      <div id="vton-toast" class="hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-medium shadow-2xl border border-neutral-700"></div>
    `;

    document.body.appendChild(wrapper);

    this.el = {
      backdrop: wrapper,
      closeBtn: wrapper.querySelector('#vton-close-btn'),
      modalProductName: wrapper.querySelector('#vton-modal-title'),
      modalProductMeta: wrapper.querySelector('#vton-product-meta'),
      modalGarmentThumb: wrapper.querySelector('#vton-garment-thumb'),
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
      beforeImg: wrapper.querySelector('#vton-before-img'),
      staticBeforeImg: wrapper.querySelector('#vton-before-img'),
      staticAfterImg: wrapper.querySelector('#vton-after-img'),
      compareStage: wrapper.querySelector('#vton-compare-stage'),
      compareDivider: wrapper.querySelector('#vton-compare-divider'),
      compareRange: wrapper.querySelector('#vton-compare-range'),
      downloadStaticBtn: wrapper.querySelector('#vton-download-static-btn'),
      portraitInput: wrapper.querySelector('#vton-portrait-input'),
      uploadPortraitBtn: wrapper.querySelector('#vton-upload-portrait-btn'),
      emptyUploadBtn: wrapper.querySelector('#vton-empty-upload-btn'),
      useSampleBtn: wrapper.querySelector('#vton-use-sample-btn'),
      emptySampleBtn: wrapper.querySelector('#vton-empty-sample-btn'),
      productSwitcher: wrapper.querySelector('#vton-product-switcher'),
      scaleSlider: wrapper.querySelector('#vton-scale-slider'),
      scaleVal: wrapper.querySelector('#vton-scale-val'),
      offsetYSlider: wrapper.querySelector('#vton-offsety-slider'),
      offsetYVal: wrapper.querySelector('#vton-offsety-val'),
      resetFitBtn: wrapper.querySelector('#vton-reset-fit-btn'),
      skeletonToggle: wrapper.querySelector('#vton-skeleton-toggle'),
      hfSpaceSelect: wrapper.querySelector('#vton-hf-space-select'),
      rerunStaticBtn: wrapper.querySelector('#vton-rerun-static-btn'),
      toast: wrapper.querySelector('#vton-toast'),
    };
  }

  _bindEvents() {
    this.el.closeBtn.addEventListener('click', () => this.close());
    this.el.backdrop.addEventListener('click', (e) => {
      if (e.target === this.el.backdrop) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    this.el.tabCamBtn.addEventListener('click', () => this.switchTab('camera'));
    this.el.tabPhotoBtn.addEventListener('click', () => this.switchTab('photo'));
    this.el.retryCamBtn.addEventListener('click', () => this.startCameraAR());
    this.el.gotoPhotoBtn.addEventListener('click', () => this.switchTab('photo'));

    this.el.capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
    this.el.recordBtn.addEventListener('click', () => this.startVideoRecording5s());

    // Portrait file upload & sample portrait
    const openPicker = () => this.el.portraitInput.click();
    this.el.uploadPortraitBtn.addEventListener('click', openPicker);
    this.el.emptyUploadBtn.addEventListener('click', openPicker);
    this.el.portraitInput.addEventListener('change', (e) => {
      if (e.target.files?.[0]) this.handlePortraitUpload(e.target.files[0]);
      e.target.value = '';
    });

    this.el.useSampleBtn.addEventListener('click', () => this.loadSamplePortrait());
    this.el.emptySampleBtn.addEventListener('click', () => this.loadSamplePortrait());
    this.el.downloadStaticBtn.addEventListener('click', () => this.downloadStaticResult());

    // Interactive Before-After Slider (supports mouse drag, touch drag, and range input)
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

    // Manual Fit Calibration Sliders (updates both AR Camera & Static Canvas fallback!)
    this.el.scaleSlider.addEventListener('input', (e) => {
      this.arSettings.scalePct = Number(e.target.value);
      this.el.scaleVal.textContent = `${this.arSettings.scalePct}%`;
      this._refreshStaticFallbackLive();
    });
    this.el.offsetYSlider.addEventListener('input', (e) => {
      this.arSettings.offsetY = Number(e.target.value);
      this.el.offsetYVal.textContent = `${this.arSettings.offsetY}px`;
      this._refreshStaticFallbackLive();
    });
    this.el.resetFitBtn.addEventListener('click', () => {
      this.arSettings.scalePct = 100;
      this.arSettings.offsetY = 0;
      this.el.scaleSlider.value = '100';
      this.el.offsetYSlider.value = '0';
      this.el.scaleVal.textContent = '100%';
      this.el.offsetYVal.textContent = '0px';
      this._refreshStaticFallbackLive();
    });
    this.el.skeletonToggle.addEventListener('change', (e) => {
      this.arSettings.showSkeleton = e.target.checked;
      this._refreshStaticFallbackLive();
    });

    this.el.hfSpaceSelect.addEventListener('change', (e) => {
      this.hfSpace = e.target.value;
    });
    this.el.backdrop.querySelectorAll('input[name="vtonEngineMode"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.staticEngine = e.target.value;
      });
    });
    this.el.rerunStaticBtn.addEventListener('click', () => {
      if (this.personImg) this.runStaticPhotoTryOn();
      else this.loadSamplePortrait();
    });
  }

  _renderProductSwitcher() {
    if (!this.el?.productSwitcher) return;
    this.el.productSwitcher.innerHTML = this.catalog
      .slice(0, 8)
      .map((item) => {
        const active = this.currentProduct?.id === item.id;
        return `
          <button type="button" data-switch-id="${item.id}" title="${item.name}"
            class="aspect-square rounded-xl p-1 border-2 ${
              active ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
            } transition cursor-pointer overflow-hidden">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-contain" />
          </button>`;
      })
      .join('');

    this.el.productSwitcher.querySelectorAll('[data-switch-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const prod = this.catalog.find((p) => p.id === btn.dataset.switchId);
        if (!prod) return;
        if (this.activeTab === 'photo' && this.personImg) {
          this.el.staticLoading.classList.remove('hidden');
          this.el.staticLoadingText.textContent = `Đang tách nền AI cho "${prod.name}"...`;
        }
        await this.selectProduct(prod);
        if (this.activeTab === 'photo' && this.personImg) {
          await this.runStaticPhotoTryOn();
        }
      });
    });
  }

  _loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      if (/^https?:\/\//i.test(src) && !src.startsWith(location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
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
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
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
