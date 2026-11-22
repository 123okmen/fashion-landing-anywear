#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply the design-system upgrade to the Anywear landing page."""
import os, re, datetime

ROOT = r'C:\Users\pc\Desktop\Plan\websites-redesign\fashion-landing-anywear'
CSS = os.path.join(ROOT, 'styles.css')
HTML = os.path.join(ROOT, 'index.html')
JS = os.path.join(ROOT, 'app.js')

log = []
def rep(text, old, new, tag):
    if old not in text:
        log.append(f"!! MISSING [{tag}]: {old[:80]}")
        return text
    n = text.count(old)
    text = text.replace(old, new)
    log.append(f"[{tag}] x{n}: {old[:70]!r} -> {new[:60]!r}")
    return text

def load(name):
    with open(name, encoding='utf-8') as f:
        return f.read()

def save(name, text):
    with open(name, 'w', encoding='utf-8') as f:
        f.write(text)

# ---------------- HTML ----------------
h = load(HTML)

# 1) Google Fonts: Manrope only
h = rep(h,
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">',
    'font-link')

# 2) Wrap main content in a max-width container
h = rep(h, '</header>\n\n  <!-- HERO SECTION -->',
        '</header>\n\n  <main class="page-main">\n  <!-- HERO SECTION -->', 'main-open')
h = rep(h, '  <!-- Bag Drawer -->',
        '  </main>\n\n  <!-- Bag Drawer -->', 'main-close')

# 3) Copy / CTA fixes
h = rep(h, 'Xem Cơ Chế Nhúng 1 Dòng Code &amp; Chính Sách',
        'Xem Cơ Chế Nhúng 1 Dòng Code', 'cta-1')
h = rep(h, '<button type="submit" class="btn-aw-use-link">Thử Link Này</button>',
        '<button type="submit" class="btn-aw-use-link">Dùng Link Này</button>', 'cta-2')
h = rep(h, '<button type="button" class="btn-secondary-outline" id="studioConfirmBuyBtn" style="justify-content: center; padding: 13px;">Mua / Đặt May Riêng</button>',
        '<button type="button" class="btn-secondary-outline" id="studioConfirmBuyBtn" style="justify-content: center; padding: 13px;">Mua Sở Hữu</button>', 'cta-3')

# 4) HTML accent variables + lime
h = rep(h, 'var(--accent-gold)', 'var(--accent)', 'html-var-gold')
h = rep(h, 'var(--accent-jade)', 'var(--accent)', 'html-var-jade')
h = rep(h, 'color: #b8ff2c;', 'color: var(--accent);', 'html-lime')
h = rep(h, 'var(--accent-red)', 'var(--accent)', 'html-var-red')

save(HTML, h)

# ---------------- CSS ----------------
css = load(CSS)

# 1) :root design values (single typeface + flat palette + single accent)
css = rep(css,
    """:root {
  --bg-obsidian: #0a0a0c;
  --bg-charcoal: #121216;
  --bg-card: #17171c;
  --bg-ivory: #f5f2eb;
  --bg-sand: #eae4d7;
  --text-light: #f7f5f0;
  --text-muted: #9e9a91;
  --text-dark: #111113;
  --accent-red: #d91e2a;
  --accent-red-glow: rgba(217, 30, 42, 0.45);
  --accent-gold: #c9a96e;
  --accent-jade: #2dd4bf;
  --border-subtle: rgba(247, 245, 240, 0.12);
  --border-strong: rgba(247, 245, 240, 0.28);
  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-display: 'Syne', sans-serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
}""",
    """:root {
  --bg-obsidian: #181818;
  --bg-charcoal: #1F1F1F;
  --bg-card: #272727;
  --bg-footer: #181818;
  --bg-modal: #1F1F1F;
  --bg-stage: #1F1F1F;
  --bg-canvas: #181818;
  --bg-hub: #1F1F1F;
  --text-light: #f7f5f0;
  --text-muted: #9e9a91;
  --text-dark: #111113;
  --accent: #d91e2a;
  --accent-glow: rgba(217, 30, 42, 0.45);
  --border-subtle: rgba(247, 245, 240, 0.12);
  --border-strong: rgba(247, 245, 240, 0.28);
  --font: 'Manrope', system-ui, sans-serif;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}""", 'root')

# 2) Undeclarared variable name replacements
css = rep(css, 'var(--bg-ivory)', '', 'bg-ivory-remove')
css = rep(css, 'var(--bg-sand)', '', 'bg-sand-remove')
css = rep(css, 'var(--accent-red)', 'var(--accent)', 'var-accent-red')
css = rep(css, 'var(--font-serif)', 'var(--font)', 'var-font-serif')
css = rep(css, 'var(--font-display)', 'var(--font)', 'var-font-display')
css = rep(css, 'var(--font-sans)', 'var(--font)', 'var-font-sans')
css = rep(css, 'var(--font-mono)', 'var(--font)', 'var-font-mono')

# 3) Easing -> base curve (word boundaries, only standalone tokens)
css = re.sub(r'(?<=[\s;(])ease(?=[\s;)])', 'var(--ease)', css)
css = re.sub(r'(?<=[\s;(])linear(?=[\s;)])', 'var(--ease)', css)
css = re.sub(r'(?<=[\s;(])ease-in-out(?=[\s;)])', 'var(--ease)', css)
css = re.sub(r'(?<=[\s;(])ease-out(?=[\s;)])', 'var(--ease)', css)

# 4) Transition declarations -> durations (500ms movement, 300ms colour/opacity)
def fix_transition(m):
    decl = m.group(0).strip()
    if re.match(r'^(none|initial|inherit)\b', decl):
        return m.group(0)
    items = [i.strip() for i in decl.split(',')]
    out = []
    for it in items:
        m2 = re.match(r'^(\S+)\s+([\d.]+)(ms|s)\s*(.*)$', it)
        if not m2:
            out.append(it)
            continue
        prop, num, unit, rest = m2.groups()
        if 'transform' in prop or 'translate' in prop or 'scale' in prop or 'rotate' in prop or 'skew' in prop or 'width' in prop or 'height' in prop or 'clip-path' in prop:
            dur = '0.5s' if unit == 's' else '500ms'
        elif 'opacity' in prop or 'color' in prop or 'background' in prop or 'border-color' in prop or 'fill' in prop or 'filter' in prop:
            dur = '0.3s' if unit == 's' else '300ms'
        else:
            dur = '0.3s' if unit == 's' else '300ms'
        out.append(f"{prop} {dur} var(--ease)")
    return 'transition: ' + ', '.join(out) + ';'

css = re.sub(r'transition\s*:\s*[^;{}]+;', fix_transition, css)

# 5) Single-side borders -> 4-sided (or remove / inset-accent)
css = rep(css, 'border-left: 2px solid var(--accent-gold);', 'background: rgba(217, 30, 42, 0.08);', 'border-price-col')
css = rep(css, 'border-left: 4px solid var(--accent-red);', 'box-shadow: inset 4px 0 0 var(--accent);', 'border-manifesto')
css = re.sub(r'border-(left|right|top|bottom)\s*:\s*([^;]+);', lambda m: f'border: 1px solid {m.group(2).strip().split(" ", 2)[2]};', css)

# 6) Background gradients -> flat
css = rep(css, 'background: linear-gradient(90deg, var(--accent-red), var(--accent-gold), var(--accent-jade));', 'background: var(--accent);', 'grad-scrollbar')
css = rep(css, 'background: radial-gradient(circle, rgba(217, 30, 42, 0.22) 0%, rgba(201, 169, 110, 0.08) 45%, transparent 70%);', 'background: rgba(217, 30, 42, 0.18);', 'grad-hero-bg')
css = rep(css, 'background: radial-gradient(circle at center, #171a24 0%, #090a0e 100%);', 'background: var(--bg-canvas);', 'grad-canvas')
css = rep(css, 'background: linear-gradient(180deg, #0a0a0c 0%, #19080a 50%, #0a0a0c 100%);', 'background: var(--bg-obsidian);', 'grad-manifesto')
css = rep(css, 'background: linear-gradient(140deg, rgba(217, 30, 42, 0.2), rgba(18, 18, 22, 0.95));', 'background: var(--bg-charcoal);', 'grad-redvilla-card')
css = rep(css, 'background:\n    linear-gradient(90deg, rgba(45, 212, 191, 0.07) 1px, transparent 1px) 0 0 / 28px 28px,\n    linear-gradient(0deg, rgba(45, 212, 191, 0.07) 1px, transparent 1px) 0 0 / 28px 28px;',
            'background: rgba(217, 30, 42, 0.06);', 'grad-mesh-overlay')
css = rep(css, 'background: linear-gradient(135deg, rgba(45, 212, 191, 0.16), rgba(201, 169, 110, 0.12));', 'background: var(--bg-charcoal);', 'grad-fit-score')
css = rep(css, 'background: linear-gradient(160deg, rgba(26, 28, 35, 0.95), rgba(16, 17, 22, 0.98));', 'background: var(--bg-charcoal);', 'grad-verdict')
css = rep(css, 'background: linear-gradient(90deg, #2dd4bf, #c8ff2e);', 'background: var(--accent);', 'grad-skin-bar')
css = rep(css, 'background: radial-gradient(circle at 50% 45%, rgba(200, 255, 46, 0.14), rgba(10, 11, 14, 0.55));', 'background: rgba(217, 30, 42, 0.08);', 'grad-ai-overlay')
css = rep(css, 'background: radial-gradient(circle at 82% 25%, rgba(184, 255, 44, 0.10), transparent 45%),\n    radial-gradient(circle at 15% 80%, rgba(217, 30, 42, 0.12), transparent 50%),\n    #0d0e12;',
            'background: var(--bg-obsidian);', 'grad-hub')
css = rep(css, 'background: linear-gradient(0deg, rgba(8, 8, 10, 0.94) 65%, transparent);', 'background: var(--bg-obsidian);', 'grad-bottom-bar')
css = rep(css, 'background: linear-gradient(180deg, rgba(8, 8, 10, 0.88), transparent);', 'background: var(--bg-stage);', 'grad-top-bar')
css = rep(css, 'background: linear-gradient(135deg, rgba(201, 169, 110, 0.14), rgba(217, 30, 42, 0.12));', 'background: var(--bg-card);', 'grad-policy')
css = rep(css, 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(201, 169, 110, 0.08));', 'background: var(--bg-charcoal);', 'grad-oss-box')
css = rep(css, 'background: linear-gradient(135deg, #10b981, #059669);', 'background: var(--accent);', 'grad-oss-cta')
css = rep(css, 'background: linear-gradient(135deg, #b8ff2c, #34d399);', 'background: var(--accent);', 'grad-vton-generate')

# 7) Accent colour normalisation (single accent #d91e2a)
css = rep(css, 'var(--accent-gold)', 'var(--accent)', 'css-var-gold')
css = rep(css, 'var(--accent-jade)', 'var(--accent)', 'css-var-jade')
css = rep(css, 'var(--aw-lime)', 'var(--accent)', 'css-var-awlime')
css = rep(css, 'var(--aw-lime-glow)', '--accent-glow', 'css-var-awlime-glow')
css = rep(css, 'var(--accent-red-glow)', '--accent-glow', 'css-var-redglow')
css = rep(css, '#b8ff2c', 'var(--accent)', 'css-lime-1')
css = rep(css, '#c8ff2e', 'var(--accent)', 'css-lime-2')
css = rep(css, '#6ee7b7', 'var(--accent)', 'css-mint')
css = rep(css, '#a7f3d0', 'var(--accent)', 'css-teal')
css = rep(css, '#34d399', 'var(--accent)', 'css-green')
css = rep(css, '#10b981', 'var(--accent)', 'css-emerald-1')
css = rep(css, '#059669', 'var(--accent)', 'css-emerald-2')
css = rep(css, '#2dd4bf', 'var(--accent)', 'css-teal-2')
css = rep(css, '#99f6e4', '#f7d9d7', 'css-harmony-text')

css = re.sub(r'rgba\(200, ?255, ?46,', 'rgba(217, 30, 42,', css)
css = re.sub(r'rgba\(184, ?255, ?44,', 'rgba(217, 30, 42,', css)
css = re.sub(r'rgba\(16, ?185, ?129,', 'rgba(217, 30, 42,', css)
css = re.sub(r'rgba\(110, ?231, ?183,', 'rgba(217, 30, 42,', css)

# 8) Radius -> Tailwind scale (4/8/12/16/24) except pills (999px) & circles (50%)
css = rep(css, 'border-radius: 18px;', 'border-radius: 16px;', 'rad-18')
css = rep(css, 'border-radius: 20px;', 'border-radius: 24px;', 'rad-20')
css = rep(css, 'border-radius: 22px;', 'border-radius: 24px;', 'rad-22')
css = rep(css, 'border-radius: 14px;', 'border-radius: 12px;', 'rad-14')
css = rep(css, 'border-radius: 10px;', 'border-radius: 8px;', 'rad-10')
css = rep(css, 'border-radius: 12px;', 'border-radius: 12px;', 'rad-12')  # no-op but logs
css = rep(css, 'border-radius: 6px;', 'border-radius: 4px;', 'rad-6')
css = rep(css, 'border-radius: 7px;', 'border-radius: 8px;', 'rad-7')
css = rep(css, 'border-radius: 9px;', 'border-radius: 8px;', 'rad-9')
css = rep(css, 'border-radius: 5px;', 'border-radius: 4px;', 'rad-5')
css = rep(css, 'border-radius: 99px;', 'border-radius: 999px;', 'rad-99')

# 9) 100vh -> 100dvh
css = rep(css, 'min-height: 100vh;', 'min-height: 100dvh;', 'dvh-1')
css = rep(css, 'max-height: 100vh;', 'max-height: 100dvh;', 'dvh-2')
css = rep(css, 'min-height: min(100vh, 980px);', 'min-height: min(100dvh, 980px);', 'dvh-3')

# 10) Hero title max-width 680px
css = rep(css, '.hero-title {\n  font-family: var(--font-serif);',
        '.hero-title {\n  max-width: 680px;\n  font-family: var(--font-serif);', 'hero-maxw')

# 11) Reveal timing/position (600-800ms, 32px rise)
css = rep(css, '.reveal {\n  opacity: 0;\n  transform: translateY(48px);\n  transition: opacity 0.9s var(--ease-out-expo), transform 0.9s var(--ease-out-expo); }',
        '.reveal {\n  opacity: 0;\n  transform: translateY(32px);\n  transition: opacity 0.7s var(--ease), transform 0.7s var(--ease); }', 'reveal-base')
css = rep(css, '.reveal-wipe .product-media,\n.reveal-wipe .lookbook-media-wrap {\n  clip-path: inset(100% 0 0 0);\n  transition: clip-path 1.1s var(--ease-in-out-quart); }',
        '.reveal-wipe .product-media,\n.reveal-wipe .lookbook-media-wrap {\n  clip-path: inset(100% 0 0 0);\n  transition: clip-path 0.7s var(--ease); }', 'reveal-wipe')

# 12) New global UI-state rules + container
css = rep(css,
    '/* ==========================================================================\n   AI GARMENT SYNTHESIS, MEDIAPIPE 3D POSE MESH WARP & ON-CARD AI LIVE FIT\n   ========================================================================== */',
    '''/* ==========================================================================
   UI STATES: FOCUS-VISIBLE RING, HOVER + ACTIVE
   ========================================================================== */

a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
textarea:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

:focus:not(:focus-visible) {
  outline: none;
}

a:active, button:active, input:active, select:active {
  transform: translateY(1px) scale(0.98);
}

/* Max-width content container (1200-1440px) */
.page-main {
  max-width: 1360px;
  margin: 0 auto;
}

/* ==========================================================================
   AI GARMENT SYNTHESIS, MEDIAPIPE 3D POSE MESH WARP & ON-CARD AI LIVE FIT
   ========================================================================== */''', 'states')

save(CSS, css)

# ---------------- JS: reveal observer ----------------
j = load(JS)
old_rev = """  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');
        revealObserver.unobserve(el);
        setTimeout(() => el.classList.remove('reveal'), 1000);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    : null;"""
new_rev = """  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealObserver = 'IntersectionObserver' in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');
        revealObserver.unobserve(el);
        setTimeout(() => el.classList.remove('reveal'), 700);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    : null;"""
j = rep(j, old_rev, new_rev, 'reveal-obs')
save(JS, j)

# ---------------- Report ----------------
print('\n'.join(log))
print('\n=== DONE ===')
