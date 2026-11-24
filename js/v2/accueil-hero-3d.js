/**
 * Scène 3D Hero v2.2 — AZERTY Global (Option 3 · Duo règle Olivetti + éventail de marteaux)
 * - Arrière-plan 2D SVG ultra-léger : règle graduée de chariot, feuille engagée et éventail
 *   de 27 barres à caractères rayonnant vers le point de frappe (compatible clair / sombre).
 * - Clavier ISO-62 sculpté en Blender 5.2 (data/home-keyboard-glb.js), vue plongeante 65°,
 *   clic-glisser pur (zéro parallaxe au survol), rendu à la demande 60 fps (0 % CPU au repos).
 * - Balayage optique Avant / Après synchronisé avec la scène « Bœuf ou poulet ? »,
 *   contrôles Avant / Après · Réinitialiser · Pause, prise de main au clavier physique.
 */
import * as THREE from "/js/vendor/three.module.min.js";
import { GLTFLoader } from "/js/vendor/GLTFLoader.js";

const svgEl = document.getElementById("hero-backdrop-svg");
const canvas = document.getElementById("hero-3d-canvas");
const fallbackImg = document.getElementById("hero-fallback-img");
const controlsWrap = document.getElementById("hero-controls");
const glyphStage = document.getElementById("hero-glyph-stage");
const readoutEl = document.getElementById("hero-3d-readout");
const resetBtn = document.getElementById("hero-3d-reset");
const pauseBtn = document.getElementById("hero-3d-pause");
const modeBtns = document.querySelectorAll("[data-hero-mode]");

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =========================================================================
// 1. ARRIÈRE-PLAN OPTION 3 · DUO RÈGLE OLIVETTI + ÉVENTAIL DE MARTEAUX (SVG)
// =========================================================================
let typedLine = "«\u00a0Bœuf ou poulet\u202f?\u00a0» ";
let activeHammer = 14;
let strikeFlash = 0;
let activeStampChar = "É";

function buildRulerMarkup(yTop) {
  let ticks = "";
  for (let i = 0; i <= 80; i++) {
    const x = 96 + i * 15.6;
    const isTen = i % 10 === 0;
    const isFive = i % 5 === 0;
    const h = isTen ? 16 : isFive ? 10 : 5;
    ticks += `<line class="hero-svg-ink-stroke" x1="${x.toFixed(1)}" y1="${yTop}" x2="${x.toFixed(1)}" y2="${yTop + h}" stroke-opacity="${isTen ? 0.34 : 0.16}" stroke-width="1"/>`;
    if (isTen && i > 0) {
      ticks += `<text class="hero-svg-ink-fill" x="${x.toFixed(1)}" y="${yTop + 29}" text-anchor="middle" fill-opacity="0.34" font-family="JetBrains Mono, monospace" font-size="11">${i}</text>`;
    }
  }
  const caretX = Math.min(1300, 560 + (typedLine.length % 28) * 23);
  return (
    `<line class="hero-svg-ink-stroke" x1="0" y1="${yTop}" x2="1440" y2="${yTop}" stroke-opacity="0.14" stroke-width="1"/>` +
    ticks +
    `<polygon class="hero-svg-vermilion-fill" points="96,${yTop + 2} 90,${yTop + 14} 102,${yTop + 14}" fill-opacity="0.72"/>` +
    `<polygon class="hero-svg-vermilion-fill" points="1344,${yTop + 2} 1338,${yTop + 14} 1350,${yTop + 14}" fill-opacity="0.72"/>` +
    `<polygon class="hero-svg-klein-fill" points="${caretX},${yTop} ${caretX - 6},${yTop + 11} ${caretX + 6},${yTop + 11}"/>` +
    `<line class="hero-svg-klein-stroke" x1="${caretX}" y1="${yTop + 11}" x2="${caretX}" y2="${yTop + 112}" stroke-opacity="0.22" stroke-dasharray="3 4"/>` +
    `<line class="hero-svg-vermilion-stroke" x1="96" y1="${yTop}" x2="96" y2="842" stroke-opacity="0.14" stroke-width="1"/>`
  );
}

function buildPaperSheetLines(yBase) {
  const displayStr = typedLine.slice(-26);
  const lastChar = displayStr.slice(-1);
  const headStr = displayStr.slice(0, -1);
  return (
    `<line class="hero-svg-ink-stroke" x1="520" y1="${yBase + 12}" x2="1360" y2="${yBase + 12}" stroke-opacity="0.13" stroke-width="1"/>` +
    `<text class="hero-svg-ink-fill" x="536" y="${yBase}" font-family="Instrument Serif, Georgia, serif" font-size="56" fill-opacity="0.16" letter-spacing="-0.01em">` +
    `${escapeXml(headStr)}<tspan class="hero-svg-klein-fill" fill-opacity="${strikeFlash > 0 ? 0.85 : 0.50}">${escapeXml(lastChar)}</tspan>` +
    `</text>`
  );
}

function buildTypebarsMarkup(cx, cy, rOuter, rInner) {
  const count = 27;
  let bars = "";
  for (let i = 0; i < count; i++) {
    const a = (-165 + (i / (count - 1)) * 150) * Math.PI / 180;
    const isActive = i === activeHammer;
    const reach = isActive && strikeFlash > 0 ? rInner * 0.22 : rInner;
    const x1 = cx + Math.cos(a) * rOuter;
    const y1 = cy - Math.sin(a) * rOuter;
    const x2 = cx + Math.cos(a) * reach;
    const y2 = cy - Math.sin(a) * reach;
    const strokeCls = isActive ? "hero-svg-klein-stroke" : "hero-svg-ink-stroke";
    const fillCls = isActive ? "hero-svg-klein-fill" : "hero-svg-ink-fill";
    const op = isActive ? (strikeFlash > 0 ? 0.92 : 0.55) : 0.14;
    const sw = isActive ? 2.4 : 1.1;
    bars += `<line class="${strokeCls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-opacity="${op}" stroke-width="${sw}" stroke-linecap="round"/>`;
    bars += `<circle class="${fillCls}" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${isActive ? 4.5 : 2.2}" fill-opacity="${op}"/>`;
  }
  const arcStartX = cx + Math.cos(-165 * Math.PI / 180) * (rOuter - 28);
  const arcStartY = cy - Math.sin(-165 * Math.PI / 180) * (rOuter - 28);
  const arcEndX = cx + Math.cos(-15 * Math.PI / 180) * (rOuter - 28);
  const arcEndY = cy - Math.sin(-15 * Math.PI / 180) * (rOuter - 28);
  return (
    `<path class="hero-svg-ink-stroke" d="M ${arcStartX.toFixed(1)} ${arcStartY.toFixed(1)} A ${rOuter - 28} ${rOuter - 28} 0 0 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}" stroke-opacity="0.16" stroke-width="1.2" stroke-dasharray="4 5"/>` +
    `<circle class="hero-svg-ink-stroke" cx="${cx}" cy="${cy}" r="34" stroke-opacity="0.14" stroke-width="1"/>` +
    `<line class="hero-svg-klein-stroke" x1="${cx - 16}" y1="${cy}" x2="${cx + 16}" y2="${cy}" stroke-opacity="0.35" stroke-width="1"/>` +
    `<line class="hero-svg-klein-stroke" x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy + 16}" stroke-opacity="0.35" stroke-width="1"/>` +
    bars +
    `<text class="hero-svg-klein-fill" x="${cx}" y="${cy - 44}" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="38" fill-opacity="${strikeFlash > 0 ? 0.95 : 0.62}">${escapeXml(activeStampChar)}</text>`
  );
}

function renderBackdrop() {
  if (!svgEl) return;
  svgEl.innerHTML =
    buildRulerMarkup(12) +
    buildPaperSheetLines(106) +
    buildTypebarsMarkup(990, 212, 540, 172);
}

renderBackdrop();

function showFallback() {
  if (canvas) canvas.hidden = true;
  if (controlsWrap) controlsWrap.hidden = true;
  if (fallbackImg) fallbackImg.hidden = false;
}

if (canvas && window.AG_DATA && window.AG_KEY_UV_MAP && window.AG_HERO_GLB_B64) {
  initHero3D();
} else {
  showFallback();
}

function initHero3D() {
  const DATA = window.AG_DATA;
  const UV_MAP = window.AG_KEY_UV_MAP;
  const KEYS_BY_CODE = new Map(DATA.keys.filter((k) => k.code).map((k) => [k.code, k]));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallMobile = window.matchMedia("(max-width: 767px)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (_) {
    showFallback();
    return;
  }

  if (controlsWrap) controlsWrap.hidden = false;

  const glCtx = renderer.getContext();
  const dbgExt = glCtx ? glCtx.getExtension("WEBGL_debug_renderer_info") : null;
  const gpuName = dbgExt ? String(glCtx.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) || "") : "";
  const isSoftwareGL = /SwiftShader|llvmpipe|Software/i.test(gpuName);

  renderer.setPixelRatio(isSoftwareGL ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 40);

  const keyLight = new THREE.DirectionalLight(0xfffdf8, 1.85);
  keyLight.position.set(-2.4, 6.2, 2.6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xd9e5ff, 0.78);
  rimLight.position.set(3.2, 3.6, -2.8);
  scene.add(rimLight);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d5cb, 0.72));

  // Ombre de contact douce analytique (zéro bord rectangulaire, zéro artefact AgX)
  const shadowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        vec2 q = abs(p) - vec2(0.56, 0.42);
        float d = length(max(q, 0.0));
        float contact = exp(-d * 10.5) * 0.28;
        float soft = exp(-d * 3.8) * 0.16;
        float edgeFade = (1.0 - smoothstep(0.68, 0.96, abs(p.x))) * (1.0 - smoothstep(0.68, 0.96, abs(p.y)));
        float alpha = clamp((contact + soft) * edgeFade, 0.0, 0.42);
        gl_FragColor = vec4(0.067, 0.071, 0.082, alpha);
      }
    `,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.4), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(1.16, -0.08, 0.22);
  scene.add(shadowPlane);

  // =========================================================================
  // 2. ATLAS 2048x2048 NET (AVANT / APRÈS) + BALAYAGE OPTIQUE BLEU KLEIN
  // =========================================================================
  const CLASSIC_LEGENDS = {
    E00: ["", "²", "", ""], E01: ["1", "&", "", ""], E02: ["2", "é", "~", ""], E03: ["3", "\"", "#", ""],
    E04: ["4", "'", "{", ""], E05: ["5", "(", "[", ""], E06: ["6", "-", "|", ""], E07: ["7", "è", "`", ""],
    E08: ["8", "_", "\\", ""], E09: ["9", "ç", "^", ""], E10: ["0", "à", "@", ""], E11: ["°", ")", "]", ""],
    E12: ["+", "=", "}", ""],
    D01: ["A", "", "", ""], D02: ["Z", "", "", ""], D03: ["E", "", "€", ""], D04: ["R", "", "", ""], D05: ["T", "", "", ""],
    D06: ["Y", "", "", ""], D07: ["U", "", "", ""], D08: ["I", "", "", ""], D09: ["O", "", "", ""], D10: ["P", "", "", ""],
    D11: ["¨", "^", "", ""], D12: ["£", "$", "¤", ""],
    C01: ["Q", "", "", ""], C02: ["S", "", "", ""], C03: ["D", "", "", ""], C04: ["F", "", "", ""], C05: ["G", "", "", ""],
    C06: ["H", "", "", ""], C07: ["J", "", "", ""], C08: ["K", "", "", ""], C09: ["L", "", "", ""], C10: ["M", "", "", ""],
    C11: ["%", "ù", "", ""], C12: ["µ", "*", "", ""],
    B00: [">", "<", "", ""], B01: ["W", "", "", ""], B02: ["X", "", "", ""], B03: ["C", "", "", ""], B04: ["V", "", "", ""],
    B05: ["B", "", "", ""], B06: ["N", "", "", ""], B07: ["?", ",", "", ""], B08: [".", ";", "", ""], B09: ["/", ":", "", ""],
    B10: ["§", "!", "", ""],
  };

  const GLOBAL_LEGENDS = {
    E00: ["#", "@", "→", ""], E01: ["1", "&", "", ""], E02: ["2", "é", "", "É"], E03: ["3", "\"", "", ""],
    E04: ["4", "'", "’", ""], E05: ["5", "(", "", ""], E06: ["6", "-", "ɛ", ""], E07: ["7", "è", "", "È"],
    E08: ["8", "_", "", ""], E09: ["9", "ç", "", "Ç"], E10: ["0", "à", "@", "À"], E11: ["%", ")", "°", ""],
    E12: ["+", "=", "±", ""],
    D01: ["A", "", "æ", ""], D02: ["Z", "", "", ""], D03: ["E", "", "€", ""], D04: ["R", "", "", ""], D05: ["T", "", "–", ""],
    D06: ["Y", "", "", ""], D07: ["U", "", "ù", ""], D08: ["I", "", "^", ""], D09: ["O", "", "œ", ""], D10: ["P", "", "", ""],
    D11: ["¨", "^", "", ""], D12: ["£", "$", "¥", ""],
    C01: ["Q", "", "", ""], C02: ["S", "", "", ""], C03: ["D", "", "{", ""], C04: ["F", "", "}", ""], C05: ["G", "", "\\", ""],
    C06: ["H", "", "|", ""], C07: ["J", "", "[", ""], C08: ["K", "", "]", ""], C09: ["L", "", "`", ""], C10: ["M", "", "", ""],
    C11: ["`", "´", "~", ""], C12: ["α", "*", "ж", ""],
    B00: [">", "<", "≤", ""], B01: ["W", "", "«", ""], B02: ["X", "", "»", ""], B03: ["C", "", "", ""], B04: ["V", "", "", ""],
    B05: ["B", "", "ß", ""], B06: ["N", "", "~", ""], B07: ["?", ",", "<", ""], B08: [";", ".", ">", ""], B09: ["/", ":", "#", ""],
    B10: ["§", "!", "¡", ""],
  };

  const KLEIN_QUADS = {
    E00: [0, 1, 2], E02: [3], E04: [2], E06: [2], E07: [3], E09: [3], E10: [3], E11: [0, 2], E12: [2],
    D01: [2], D05: [2], D07: [2], D08: [2], D09: [2], D12: [2],
    C03: [2], C04: [2], C05: [2], C06: [2], C07: [2], C08: [2], C09: [2], C11: [0, 1, 2], C12: [0, 2],
    B00: [2], B01: [2], B02: [2], B05: [2], B06: [2], B07: [2], B08: [0, 1, 2], B09: [2], B10: [0, 2],
  };

  const MOD_TEXT = {
    BKSP: "⌫", TAB: "Tab", CAPS: "Verr. Maj.", ENTER: "Entrée",
    LSHIFT: "Maj", RSHIFT: "Maj", LCTRL: "Ctrl", LWIN: "Win",
    LALT: "Alt", A03: "", ALTGR: "AltGr", RWIN: "Fn", MENU: "≡", RCTRL: "Ctrl",
  };

  const TINTED_KEYCAPS = new Set(["E00", "E02", "E07", "E09", "E10", "B08", "C11", "E11"]);

  function paintKeyAtlas(canvasEl, isGlobal) {
    const W = isSoftwareGL ? 1024 : 2048;
    const sc = W / 2048;
    const tile = W / 8;
    canvasEl.width = W;
    canvasEl.height = W;
    const ctx = canvasEl.getContext("2d");
    ctx.fillStyle = "#FCFBF8";
    ctx.fillRect(0, 0, W, W);

    for (const [pos, meta] of Object.entries(UV_MAP)) {
      const x0 = meta.col * tile;
      const y0 = meta.row * tile;
      const isKleinMod = isGlobal && (pos === "CAPS" || pos === "ALTGR");
      if (isKleinMod) ctx.fillStyle = "#0038FF";
      else if (meta.isMod) ctx.fillStyle = "#D2CFC5";
      else if (isGlobal && TINTED_KEYCAPS.has(pos)) ctx.fillStyle = "#F0F3FF";
      else ctx.fillStyle = "#FCFBF8";
      ctx.fillRect(x0, y0, tile, tile);

      if (pos in MOD_TEXT) {
        const label = MOD_TEXT[pos];
        if (pos === "A03") {
          ctx.fillStyle = isGlobal ? "#0038FF" : "rgba(17,18,21,0.28)";
          ctx.fillRect(x0 + tile * 0.36, y0 + tile * 0.48, tile * 0.28, Math.max(3, 7 * sc));
        } else {
          ctx.fillStyle = isKleinMod ? "#FFFFFF" : "#181A20";
          ctx.font = `600 ${Math.round((label.length > 5 ? 40 : 48) * sc)}px "IBM Plex Sans", "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, x0 + tile * 0.5, y0 + tile * 0.52);
        }
        continue;
      }

      const leg = (isGlobal ? GLOBAL_LEGENDS : CLASSIC_LEGENDS)[pos] || ["", "", "", ""];
      const kleinSet = isGlobal ? new Set(KLEIN_QUADS[pos] || []) : new Set();
      const isAlpha = pos[0] !== "E" && leg[0] && /^[A-Z]$/.test(leg[0]);
      const padX = 26 * sc;
      const padY = 24 * sc;

      const slots = [
        { idx: 0, x: x0 + padX, y: y0 + padY, align: "left", base: "top", sz: (isAlpha ? 90 : 66) * sc },
        { idx: 1, x: x0 + padX, y: y0 + tile - padY, align: "left", base: "bottom", sz: (leg[1] === "." ? 128 : 74) * sc },
        { idx: 2, x: x0 + tile - padX, y: y0 + tile - padY, align: "right", base: "bottom", sz: 78 * sc },
        { idx: 3, x: x0 + tile - padX, y: y0 + padY, align: "right", base: "top", sz: 78 * sc },
      ];

      for (const s of slots) {
        const txt = leg[s.idx];
        if (!txt) continue;
        const isKlein = kleinSet.has(s.idx);
        if (isKlein) ctx.fillStyle = "#0038FF";
        else if (isGlobal && isAlpha && s.idx === 0) ctx.fillStyle = "#2A2E38";
        else ctx.fillStyle = s.idx === 2 ? "#484D59" : "#111215";
        const fontFam = isKlein ? '"Bricolage Grotesque", "IBM Plex Sans", sans-serif' : '"IBM Plex Sans", "Segoe UI", sans-serif';
        ctx.font = `${isKlein ? "700" : "600"} ${Math.round(s.sz)}px ${fontFam}`;
        ctx.textAlign = s.align;
        ctx.textBaseline = s.base;
        ctx.fillText(txt, s.x, s.y);
      }
    }
  }

  function createKeyAtlas(isGlobal) {
    const c = document.createElement("canvas");
    if (isGlobal || !isSoftwareGL) {
      paintKeyAtlas(c, isGlobal);
    } else {
      c.width = 16;
      c.height = 16;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = isSoftwareGL ? 4 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.flipY = false;
    tex.needsUpdate = true;
    return { canvas: c, tex };
  }

  const classicAtlas = createKeyAtlas(false);
  const globalAtlas = createKeyAtlas(true);
  const texClassic = classicAtlas.tex;
  const texGlobal = globalAtlas.tex;

  const revealUniform = { value: 4.0 };
  const topSharedMat = new THREE.MeshStandardMaterial({
    map: texGlobal,
    roughness: 0.36,
    metalness: 0.0,
  });

  topSharedMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTexClassic = { value: texClassic };
    shader.uniforms.uRevealX = revealUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldTop;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvWorldTop = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uTexClassic;\nuniform float uRevealX;\nvarying vec3 vWorldTop;"
      )
      .replace(
        "#include <map_fragment>",
        `
        #ifdef USE_MAP
          vec4 gSample = texture2D( map, vMapUv );
          vec4 cSample = texture2D( uTexClassic, vMapUv );
          float mixMask = smoothstep(uRevealX - 0.14, uRevealX + 0.14, vWorldTop.x);
          vec4 finalTex = mix(gSample, cSample, mixMask);
          float beam = exp(-abs(vWorldTop.x - uRevealX) * 18.0);
          finalTex.rgb = mix(finalTex.rgb, vec3(0.0, 0.22, 1.0), beam * 0.55);
          diffuseColor *= finalTex;
        #endif
        `
      );
  };

  // =========================================================================
  // 3. CHARGEMENT DU CLAVIER 3D BLENDER 5.2
  // =========================================================================
  const kbGroup = new THREE.Group();
  kbGroup.position.set(1.12, 0.0, 0.20);
  scene.add(kbGroup);

  const keyNodes = new Map();
  const keySprings = new Map();

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  // Caméra par défaut : VUE PLONGEANTE 65° + CLIC-GLISSER PUR (zéro parallaxe au survol)
  const DEFAULT_AZ = -8;
  const DEFAULT_ELEV = 65;

  const state = {
    paused: prefersReduced || isSmallMobile,
    mode: "after",
    targetReveal: 4.0,
    az: DEFAULT_AZ,
    elev: DEFAULT_ELEV,
    dragging: false,
    lastX: 0,
    lastY: 0,
    inView: true,
    userTookOver: false,
    demoIdx: 0,
    animRunning: false,
    lastT: performance.now(),
  };

  function updateCamera() {
    const w = window.innerWidth;
    if (w < 768) {
      const az = -2 * Math.PI / 180;
      const elev = 62 * Math.PI / 180;
      const halfTan = Math.tan((camera.fov * 0.5) * Math.PI / 180);
      const safeAspect = Math.max(0.42, Math.min(1.1, camera.aspect || 0.52));
      const dist = Math.max(10.8, 1.78 / (halfTan * safeAspect));
      const targetZ = 0.22 - 0.52 * dist * halfTan;
      const target = new THREE.Vector3(1.15, 0.22, targetZ);
      camera.position.set(
        target.x + Math.sin(az) * Math.cos(elev) * dist,
        target.y + Math.sin(elev) * dist,
        target.z + Math.cos(az) * Math.cos(elev) * dist
      );
      camera.lookAt(target);
      return;
    }
    if (w < 1180) {
      const az = (state.az * 0.6) * Math.PI / 180;
      const elev = Math.max(46, Math.min(78, state.elev - 6)) * Math.PI / 180;
      const dist = w < 900 ? 6.6 : 6.0;
      const target = new THREE.Vector3(1.12, 0.14, -0.78);
      camera.position.set(
        target.x + Math.sin(az) * Math.cos(elev) * dist,
        target.y + Math.sin(elev) * dist,
        target.z + Math.cos(az) * Math.cos(elev) * dist
      );
      camera.lookAt(target);
      return;
    }
    const az = state.az * Math.PI / 180;
    const elev = state.elev * Math.PI / 180;
    const dist = 5.75;
    const target = new THREE.Vector3(0.42, 0.0, 0.16);
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(elev) * dist,
      target.y + Math.sin(elev) * dist,
      target.z + Math.cos(az) * Math.cos(elev) * dist
    );
    camera.lookAt(target);
  }

  function renderOnce() {
    updateCamera();
    renderer.render(scene, camera);
  }

  function ensureAnimating() {
    if (state.animRunning) return;
    state.animRunning = true;
    state.lastT = performance.now();
    requestAnimationFrame(step);
  }

  function step(now) {
    const dt = Math.min(0.05, (now - state.lastT) / 1000);
    state.lastT = now;
    let moving = false;

    if (Math.abs(state.targetReveal - revealUniform.value) > 0.005) {
      if (isSoftwareGL || prefersReduced) {
        revealUniform.value = state.targetReveal;
      } else {
        revealUniform.value += (state.targetReveal - revealUniform.value) * Math.min(1, dt * 6.5);
        moving = true;
      }
    } else {
      revealUniform.value = state.targetReveal;
    }

    for (const [pos, sp] of keySprings.entries()) {
      if (Math.abs(sp.target - sp.y) > 0.0004 || Math.abs(sp.v) > 0.002) {
        const f = (sp.target - sp.y) * 340 - sp.v * 24;
        sp.v += f * dt;
        sp.y += sp.v * dt;
        const n = keyNodes.get(pos);
        if (n) n.obj.position.y = n.baseY + sp.y;
        moving = true;
      }
    }

    if (strikeFlash > 0) {
      strikeFlash = Math.max(0, strikeFlash - dt * 2.2);
      if (strikeFlash === 0) renderBackdrop();
      moving = true;
    }

    renderOnce();

    if (moving || state.dragging) {
      requestAnimationFrame(step);
    } else {
      state.animRunning = false;
    }
  }

  // =========================================================================
  // 4. CLIC-GLISSER PUR (ZÉRO PARALLAXE AU SURVOL)
  // =========================================================================
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    canvas.classList.add("is-dragging");
    ensureAnimating();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.az = Math.max(-42, Math.min(28, state.az - dx * 0.25));
    state.elev = Math.max(36, Math.min(86, state.elev + dy * 0.22));
    renderOnce();
  });

  const endDrag = () => {
    state.dragging = false;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // =========================================================================
  // 5. SÉQUENCE DE FRAPPE DOUCE (TOUTES LES 3,5 S) + CLAVIER PHYSIQUE
  // =========================================================================
  const DEMO_SEQUENCE = [
    { keys: ["CAPS", "E02"], main: "E02", glyph: "É", pain: "Alt+0201", hammer: 5, text: "Verr.\u00a0Maj. + é → É (sans code Alt+0201)" },
    { keys: ["B08"], main: "B08", glyph: ".", pain: "Maj + ;", hammer: 22, text: "Touche . directe → . (sans maintenir Maj)" },
    { keys: ["E00"], main: "E00", glyph: "@", pain: "AltGr+0", hammer: 2, text: "Touche @ directe (# avec Maj)" },
    { keys: ["ALTGR", "D09"], main: "D09", glyph: "œ", pain: "Alt+0156", hammer: 18, text: "AltGr + O → œ (sans code Alt+0156)" },
    { keys: ["ALTGR", "B01", "B02"], main: "B01", glyph: "«\u00a0»", pain: "Alt+0171", hammer: 7, text: "AltGr + W / X → guillemets français «\u00a0»" },
    { keys: ["ALTGR", "C03", "C04"], main: "C03", glyph: "{ }", pain: "AltGr+4", hammer: 11, text: "AltGr + D / F → accolades sur la rangée de repos" },
    { keys: ["ALTGR", "E06", "D03"], main: "E06", glyph: "ɛ", pain: "Absent", hammer: 14, text: "AltGr + 6 puis e → ɛ (plus de 120\u00a0caractères des langues africaines)" },
  ];

  const DEAD_KEY_INFO = {
    dk_acute: { sym: "´", name: "Accent aigu (touche morte)" },
    dk_grave: { sym: "`", name: "Accent grave (touche morte)" },
    dk_tilde: { sym: "~", name: "Tilde (touche morte)" },
    dk_circumflex: { sym: "^", name: "Accent circonflexe (touche morte)" },
    dk_diaeresis: { sym: "¨", name: "Tréma (touche morte)" },
    dk_double_acute: { sym: "˝", name: "Double accent aigu (touche morte)" },
    dk_double_grave: { sym: "̏", name: "Double accent grave (touche morte)" },
    dk_breve: { sym: "˘", name: "Brève (touche morte)" },
    dk_inverted_breve: { sym: "̑", name: "Brève inversée (touche morte)" },
    dk_macron: { sym: "¯", name: "Macron (touche morte)" },
    dk_cedilla: { sym: "¸", name: "Cédille (touche morte)" },
    dk_comma: { sym: "̦", name: "Virgule souscrite (touche morte)" },
    dk_caron: { sym: "ˇ", name: "Caron (touche morte)" },
    dk_ogonek: { sym: "˛", name: "Ogonek (touche morte)" },
    dk_dot_below: { sym: "ẹ", name: "Point souscrit (touche morte)" },
    dk_dot_above: { sym: "˙", name: "Point en chef (touche morte)" },
    dk_hook: { sym: "ɓ", name: "Crochet en chef (touche morte)" },
    dk_horn: { sym: "̛", name: "Corne (touche morte)" },
    dk_extended_latin: { sym: "ɛ", name: "Latin étendu (touche morte)" },
    dk_stroke: { sym: "ø", name: "Barre diagonale (touche morte)" },
    dk_horizontal_stroke: { sym: "đ", name: "Barre horizontale (touche morte)" },
    dk_ring_above: { sym: "˚", name: "Rond en chef (touche morte)" },
    dk_scientific: { sym: "±", name: "Symboles scientifiques (touche morte)" },
    dk_misc_symbols: { sym: "→", name: "Symboles divers (touche morte)" },
    dk_greek: { sym: "α", name: "Alphabet grec (touche morte)" },
    dk_cyrillic: { sym: "ж", name: "Alphabet cyrillique (touche morte)" },
    dk_cyrillic_ext: { sym: "ө", name: "Cyrillique étendu (touche morte)" },
    dk_punctuation: { sym: "§", name: "Ponctuation (touche morte)" },
    dk_currencies: { sym: "¤", name: "Devises (touche morte)" },
    dk_phonetic: { sym: "ɐ", name: "Symboles phonétiques (touche morte)" },
  };

  function keyDisplayName(k) {
    const b = k && k.ag && k.ag.base;
    if (b && /^[a-z]$/.test(b)) return b.toUpperCase();
    if (k && k.pos && k.pos.startsWith("E") && k.ag && k.ag.shift && /^[0-9]$/.test(k.ag.shift)) return k.ag.shift;
    if (b && String(b).startsWith("dk_")) return DEAD_KEY_INFO[b] ? DEAD_KEY_INFO[b].sym : "accent";
    return b || (k && k.modLabel) || "";
  }

  function spawnFloatingGlyph(pos, glyphText, isBefore) {
    if (!glyphStage || isSmallMobile || window.innerWidth < 1180 || !glyphText || prefersReduced) return;
    const node = keyNodes.get(pos);
    if (!node) return;
    const worldPos = new THREE.Vector3();
    node.obj.getWorldPosition(worldPos);
    worldPos.y += 0.14;
    worldPos.project(camera);
    const rect = canvas.getBoundingClientRect();
    const sx = (worldPos.x * 0.5 + 0.5) * rect.width;
    const sy = (-worldPos.y * 0.5 + 0.5) * rect.height;
    if (sx < rect.width * 0.36 || sx > rect.width - 28 || sy < 48 || sy > rect.height - 56) return;

    const el = document.createElement("span");
    el.className = "hero-float-glyph" + (isBefore ? " is-before" : "");
    el.textContent = glyphText;
    el.style.left = `${sx.toFixed(1)}px`;
    el.style.top = `${sy.toFixed(1)}px`;
    glyphStage.appendChild(el);
    setTimeout(() => el.remove(), 1450);
  }

  function triggerKeys(posList, mainPos, glyphText, labelText, hammerIdx, appendChar) {
    for (const p of posList) {
      const sp = keySprings.get(p);
      if (sp) {
        sp.v -= 1.8;
        sp.target = -0.052;
        setTimeout(() => {
          sp.target = 0;
          ensureAnimating();
        }, 220);
      }
    }
    if (typeof hammerIdx === "number") activeHammer = hammerIdx;
    if (appendChar) {
      typedLine += appendChar;
      activeStampChar = appendChar.trim() || activeStampChar;
    }
    strikeFlash = 1.0;
    renderBackdrop();
    if (glyphText) spawnFloatingGlyph(mainPos, glyphText, state.mode === "before");
    if (readoutEl && labelText) readoutEl.textContent = labelText;
    ensureAnimating();
  }

  function strikeDemo() {
    if (!keyNodes.size) return;
    const item = DEMO_SEQUENCE[state.demoIdx % DEMO_SEQUENCE.length];
    state.demoIdx++;
    if (state.mode === "after") {
      triggerKeys(item.keys, item.main, item.glyph, item.text, item.hammer, item.glyph.slice(0, 1));
    } else {
      triggerKeys([item.main], item.main, item.pain, `AZERTY traditionnel de Windows — ${item.pain} requis`, item.hammer, "");
    }
  }

  setInterval(() => {
    if (!state.paused && !state.userTookOver && state.inView && !document.hidden && !state.dragging && !isSoftwareGL) {
      strikeDemo();
    }
  }, 3500);

  // Prise de main au clavier physique
  document.addEventListener("keydown", (e) => {
    const targetEl = e.target;
    const tag = (targetEl && targetEl.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (targetEl && targetEl.isContentEditable)) return;
    if ((e.code === "Space" || e.code === "Enter") && (tag === "BUTTON" || tag === "A" || tag === "SUMMARY")) return;

    const isAltGr = Boolean((e.getModifierState && e.getModifierState("AltGraph")) || (e.ctrlKey && e.altKey));
    if ((e.ctrlKey && !isAltGr) || e.metaKey) return;
    const k = KEYS_BY_CODE.get(e.code);
    if (!k) return;

    state.userTookOver = true;
    const isBefore = state.mode === "before";
    const hammerIdx = (e.code.charCodeAt(e.code.length - 1) * 7) % 27;

    if (k.pos === "CAPS") {
      triggerKeys(["CAPS"], "CAPS", isBefore ? "2 7 9 0" : "É È Ç À",
        isBefore ? "Verr.\u00a0Maj. traditionnel\u00a0: écrit 2, 7, 9, 0 au lieu de É, È, Ç, À" : "Verrouillage majuscule intelligent\u00a0: écrit É, È, Ç, À sans bloquer les chiffres",
        3, "");
      return;
    }
    if (k.pos === "ALTGR") {
      triggerKeys(["ALTGR"], "ALTGR", isBefore ? "AltGr" : "«\u00a0» { }",
        isBefore ? "AltGr traditionnel\u00a0: symboles dispersés sur la rangée des chiffres" : "AltGr\u00a0: ouvre «\u00a0» œ, { } [ ] \\ | et plus de 300\u00a0langues",
        21, "");
      return;
    }
    if (k.pos === "A03") {
      const txt = isAltGr && !isBefore ? "AltGr + Espace → Espace fine insécable" : "Espace";
      triggerKeys(["A03"], "A03", isAltGr && !isBefore ? "⍽" : "", txt, 13, " ");
      return;
    }
    if (!k.ag) {
      triggerKeys([k.pos], k.pos, "", k.modLabel || k.pos, hammerIdx, "");
      return;
    }

    const layerObj = isBefore ? (k.trad || k.ag) : k.ag;
    const caps = Boolean(e.getModifierState && e.getModifierState("CapsLock"));
    let rawVal = layerObj.base;
    let prefix = "Touche";

    if (isAltGr && e.shiftKey && layerObj.shift_alt_gr) {
      rawVal = layerObj.shift_alt_gr;
      prefix = `Maj + AltGr + ${keyDisplayName(k)}`;
    } else if (isAltGr && layerObj.alt_gr) {
      rawVal = layerObj.alt_gr;
      prefix = `AltGr + ${keyDisplayName(k)}`;
    } else if (e.shiftKey && layerObj.shift) {
      rawVal = layerObj.shift;
      prefix = `Maj + ${keyDisplayName(k)}`;
    } else if (caps && layerObj.caps) {
      rawVal = layerObj.caps;
      prefix = `Verr.\u00a0Maj. + ${keyDisplayName(k)}`;
    }

    if (!rawVal) {
      triggerKeys([k.pos], k.pos, "", `${prefix} — aucun caractère sur cette couche`, hammerIdx, "");
      return;
    }

    const isDead = String(rawVal).startsWith("dk_");
    const dk = isDead ? DEAD_KEY_INFO[rawVal] : null;
    const glyph = dk ? dk.sym : rawVal;
    let desc;
    if (dk) {
      desc = `${prefix} → ${dk.name}`;
    } else if (!isBefore && !isAltGr && !e.shiftKey && !caps && /^[a-z]$/.test(rawVal)) {
      desc = `Touche ${rawVal.toUpperCase()} — les lettres A à Z ne bougent pas`;
    } else if (!isBefore && k.pos === "B08" && !e.shiftKey && !isAltGr) {
      desc = "Point direct (.) — sans maintenir Maj";
    } else if (!isBefore && k.pos === "E00" && !isAltGr) {
      desc = e.shiftKey ? "Maj + touche @ → #" : "Touche @ directe (# avec Maj)";
    } else {
      desc = `${prefix} → ${glyph}`;
    }

    triggerKeys([k.pos], k.pos, glyph, desc, hammerIdx, glyph);
  });

  // =========================================================================
  // 6. CONTRÔLES : AVANT / APRÈS · RÉINITIALISER · PAUSE
  // =========================================================================
  function syncPauseUi() {
    if (!pauseBtn) return;
    pauseBtn.setAttribute("aria-pressed", String(state.paused));
    pauseBtn.setAttribute("aria-label", state.paused ? "Reprendre l'animation" : "Mettre en pause l'animation");
    pauseBtn.textContent = state.paused ? "▶" : "❚❚";
  }
  syncPauseUi();

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      state.paused = !state.paused;
      syncPauseUi();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.az = DEFAULT_AZ;
      state.elev = DEFAULT_ELEV;
      state.userTookOver = false;
      renderOnce();
    });
  }

  function setHeroMode(mode, broadcast) {
    state.mode = mode;
    state.targetReveal = mode === "after" ? 4.0 : -1.8;
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.heroMode === mode)));
    if (mode === "before" && classicAtlas.canvas.width < 100) {
      paintKeyAtlas(classicAtlas.canvas, false);
      texClassic.needsUpdate = true;
    }
    if (readoutEl) {
      readoutEl.textContent = mode === "after"
        ? "AZERTY Global actif — même clavier, logiciel libre (0\u00a0€)"
        : "AZERTY traditionnel de Windows — codes Alt+0xxx requis";
    }
    ensureAnimating();
    if (broadcast) {
      window.dispatchEvent(new CustomEvent("ag:hero-mode", { detail: { mode } }));
    }
  }

  modeBtns.forEach((b) => b.addEventListener("click", () => setHeroMode(b.dataset.heroMode, true)));
  window.addEventListener("ag:global-mode", (ev) => {
    if (ev.detail && ev.detail.mode) setHeroMode(ev.detail.mode, false);
  });

  const heroSec = document.getElementById("hero");
  if ("IntersectionObserver" in window && heroSec) {
    new IntersectionObserver((entries) => {
      state.inView = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(heroSec);
  }

  // Charger le modèle GLB Blender 5.2
  new GLTFLoader().parse(b64ToBuf(window.AG_HERO_GLB_B64), "", (gltf) => {
    const root = gltf.scene;
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const mName = obj.material && obj.material.name ? obj.material.name : "";
      if (mName.startsWith("MAT_KEY_TOP")) {
        obj.material = topSharedMat;
      } else if (mName === "MAT_CHASSIS_ALU") {
        obj.material = new THREE.MeshStandardMaterial({ color: "#262930", roughness: 0.32, metalness: 0.65 });
      } else if (mName === "MAT_PLATE_DARK") {
        obj.material = new THREE.MeshStandardMaterial({ color: "#121419", roughness: 0.55, metalness: 0.35 });
      } else if (mName === "MAT_PBT_STONE") {
        obj.material = new THREE.MeshStandardMaterial({ color: "#D2CFC5", roughness: 0.44, metalness: 0.0 });
      } else if (mName === "MAT_PBT_IVORY") {
        obj.material = new THREE.MeshStandardMaterial({ color: "#FCFBF8", roughness: 0.36, metalness: 0.0 });
      }
    });

    root.traverse((obj) => {
      if (obj.name && obj.name.startsWith("KEY_")) {
        const pos = obj.name.slice(4);
        keyNodes.set(pos, { obj, baseY: obj.position.y });
        keySprings.set(pos, { y: 0, v: 0, target: 0 });
      }
    });

    kbGroup.add(root);

    const onReadyRender = () => {
      if (!isSoftwareGL) {
        paintKeyAtlas(classicAtlas.canvas, false);
        texClassic.needsUpdate = true;
      }
      paintKeyAtlas(globalAtlas.canvas, true);
      texGlobal.needsUpdate = true;
      renderOnce();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(onReadyRender);
    } else {
      onReadyRender();
    }
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderOnce();
  }

  resize();
  window.addEventListener("resize", resize);
}
