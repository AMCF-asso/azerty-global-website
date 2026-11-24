/**
 * Logique interactive de la page d'accueil v2.2 — AZERTY Global
 * - Détection OS (Windows, macOS, Linux, mobile / iPadOS 13+) + pont mobile réversible
 *   (sans doublon de menu mobile, déjà géré par js/v2/shell.js + v2/entete.njk)
 * - Scène cinétique « Bœuf ou poulet ? » avec contraction FLIP et synchronisation héros 3D
 * - Clavier Blender 5.2 haute-lumière + 62 touches vectorielles exactes (30 touches mortes,
 *   bascule explicite Global/Traditionnel, badges 1/2 en coin extérieur, roving tabindex).
 */
(function () {
  "use strict";

  const DATA = window.AG_DATA;
  const HK = window.AG_HIGHKEY_RECTS;
  if (!DATA || !HK) return;

  const KEYS_BY_POS = new Map(DATA.keys.map((k) => [k.pos, k]));
  const KEYS_BY_CODE = new Map(DATA.keys.filter((k) => k.code).map((k) => [k.code, k]));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =========================================================================
  // 1. OS & PONT MOBILE (iPadOS 13+ INCLUS + FALLBACK PRESSE-PAPIERS + RÉVERSIBLE)
  // =========================================================================
  function detectOS() {
    const ua = navigator.userAgent || "";
    const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
    if ((/Mac/i.test(plat) || /Mac OS/i.test(ua)) && navigator.maxTouchPoints > 1) return "mobile";
    if (/Mac/i.test(plat) || /Mac OS/i.test(ua)) return "macos";
    if (/Linux/i.test(plat) || /Linux/i.test(ua)) return "linux";
    return "windows";
  }

  const userOS = detectOS();
  document.documentElement.classList.add(userOS === "mobile" ? "is-touch-mobile" : "is-desktop-os");

  const OS_META = {
    windows: {
      href: DATA.kits.store.url,
      label: "Installer sur Windows",
      footerLabel: "Installer sur Windows",
      note: "Microsoft Store, sans droits administrateur",
      canal: null,
    },
    macos: {
      href: DATA.kits.macos.url,
      label: "Télécharger pour macOS",
      footerLabel: "Télécharger pour macOS",
      note: "macOS · Fichier clavier libre (1,56\u00a0Mo)",
      canal: "r2",
    },
    linux: {
      href: DATA.kits.linux.url,
      label: "Télécharger pour Linux",
      footerLabel: "Télécharger pour Linux",
      note: "Linux · Archive libre (2,33\u00a0Mo)",
      canal: "r2",
    },
  };

  const WA_URL =
    "https://wa.me/?text=AZERTY%20Global%20%E2%80%94%20logiciel%20libre%20(0%20%E2%82%AC)%20pour%20mon%20clavier%20PC%20(%C3%89%2C%20%C3%87%2C%20point%20direct%2C%20%C2%AB%20%C2%BB%20%C5%93%2C%20plus%20de%20300%20langues%2C%20rien%20%C3%A0%20acheter)%20%3A%20https%3A%2F%2Fazerty.global%2Fdownload%3Fref%3Dmob-wa";

  const heroCta = document.getElementById("hero-cta");
  const heroOsNote = document.getElementById("hero-os-note");
  const bottomCta = document.getElementById("bottom-cta");
  const mobBackBtn = document.getElementById("mob-back-btn");

  function setCtaMesure(el, osKey, canal) {
    if (!el) return;
    if (canal) {
      el.setAttribute("data-mesure", "telechargement");
      el.setAttribute("data-mesure-os", osKey);
      el.setAttribute("data-mesure-canal", canal);
    } else {
      el.removeAttribute("data-mesure");
      el.removeAttribute("data-mesure-os");
      el.removeAttribute("data-mesure-canal");
    }
  }

  function applyOsLinks(osKey) {
    if (osKey === "mobile") {
      if (bottomCta) {
        bottomCta.href = WA_URL;
        bottomCta.textContent = "M’envoyer sur WhatsApp (PC)";
        setCtaMesure(bottomCta, null, null);
      }
      return;
    }
    const cfg = OS_META[osKey] || OS_META.windows;
    if (heroCta) {
      heroCta.href = cfg.href;
      heroCta.textContent = cfg.label;
      setCtaMesure(heroCta, osKey, cfg.canal);
    }
    if (heroOsNote) heroOsNote.textContent = cfg.note;
    if (bottomCta) {
      bottomCta.href = cfg.href;
      bottomCta.textContent = cfg.footerLabel;
      setCtaMesure(bottomCta, osKey, cfg.canal);
    }
  }
  applyOsLinks(userOS);

  async function copyTextSafe(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {}
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  const mobShare = document.getElementById("mob-share");
  if (mobShare) {
    mobShare.addEventListener("click", async () => {
      const shareData = { title: "AZERTY Global — logiciel libre pour clavier PC", url: "https://azerty.global/download?ref=mob-share" };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          if (window.AGMesure) window.AGMesure.evenement("relais_mobile", { moyen: "partage" });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      const ok = await copyTextSafe(shareData.url);
      if (ok && window.AGMesure) window.AGMesure.evenement("relais_mobile", { moyen: "copie" });
      mobShare.textContent = ok ? "Lien copié" : "Copie indisponible";
      setTimeout(() => { mobShare.textContent = "Partager"; }, 2200);
    });
  }

  const mobCopy = document.getElementById("mob-copy");
  if (mobCopy) {
    mobCopy.addEventListener("click", async () => {
      const ok = await copyTextSafe("https://azerty.global/download?ref=mob-copy");
      if (ok && window.AGMesure) window.AGMesure.evenement("relais_mobile", { moyen: "copie" });
      mobCopy.textContent = ok ? "Lien copié" : "Copie indisponible";
      setTimeout(() => { mobCopy.textContent = "Copier le lien"; }, 2200);
    });
  }

  const mobShowPc = document.getElementById("mob-show-pc");
  if (mobShowPc) {
    mobShowPc.addEventListener("click", () => {
      document.documentElement.classList.remove("is-touch-mobile");
      document.documentElement.classList.add("is-desktop-os");
      if (mobBackBtn) mobBackBtn.hidden = false;
      applyOsLinks("windows");
    });
  }
  if (mobBackBtn) {
    mobBackBtn.addEventListener("click", () => {
      document.documentElement.classList.remove("is-desktop-os");
      document.documentElement.classList.add("is-touch-mobile");
      mobBackBtn.hidden = true;
      applyOsLinks("mobile");
    });
  }

  // =========================================================================
  // 2. SCÈNE CINÉTIQUE « BŒUF OU POULET ? » + FLIP + ESPACES FINES CALIBRÉES
  // =========================================================================
  const PHRASES = {
    fr: {
      cls: "",
      noteBefore: "27 frappes (dont 5 codes Alt+0xxx impossibles sans pavé numérique) pour ces 6 signes.",
      noteAfter: "6 gestes directs sur votre clavier actuel · survolez un signe bleu pour voir sa touche.",
      groups: [
        [
          { ch: "«", pain: "Alt+0171", keys: ["ALTGR", "B01"], layer: "altgr", recipe: "AltGr + W → « (avant\u00a0: Alt+0171)" },
          { thin: true },
          { t: "B" },
          { ch: "œ", pain: "Alt+0156", keys: ["ALTGR", "D09"], layer: "altgr", recipe: "AltGr + O → œ (avant\u00a0: Alt+0156)" },
          { t: "uf" },
        ],
        [{ t: " ou " }],
        [
          { t: "poulet" },
          { thin: true },
          { t: "?" },
          { thin: true },
          { ch: "»", pain: "Alt+0187", keys: ["ALTGR", "B02"], layer: "altgr", recipe: "AltGr + X → » (avant\u00a0: Alt+0187)" },
        ],
        [{ t: " " }],
        [
          { ch: "Ç", pain: "Alt+0199", keys: ["CAPS", "E09"], layer: "verrmaj", recipe: "Verr.\u00a0Maj. + ç → Ç (avant\u00a0: Alt+0199)" },
          { t: "a" },
        ],
        [{ t: " va, " }],
        [
          { ch: "É", pain: "Alt+0201", keys: ["CAPS", "E02"], layer: "verrmaj", recipe: "Verr.\u00a0Maj. + é → É (avant\u00a0: Alt+0201)" },
          { t: "ric" },
          { ch: ".", pain: "Maj + ;", keys: ["B08"], layer: "essentiel", recipe: "Touche . directe → . (avant\u00a0: Maj + ;)" },
        ],
      ],
    },
    afrique: {
      cls: "is-afrique",
      noteBefore: "Bambara («\u00a0On se revoit\u00a0»)\u00a0: caractères absents de l’AZERTY traditionnel de Windows.",
      noteAfter: "Bambara («\u00a0On se revoit\u00a0»)\u00a0: la touche Latin étendu (AltGr + 6) saisit ɛ, ɲ, ɔ, parmi plus de 120\u00a0caractères des langues africaines.",
      groups: [
        [{ t: "An " }],
        [
          { t: "b" },
          { ch: "ɛ", pain: "Copier ɛ", keys: ["ALTGR", "E06", "D03"], twoStep: { k1: "E06", k2: "D03", mod: "ALTGR" }, layer: "langues", recipe: "1. AltGr + 6, puis 2. e → ɛ (absent sur Windows)" },
        ],
        [{ t: " " }],
        [
          { ch: "ɲ", pain: "Copier ɲ", keys: ["ALTGR", "E06", "C07"], twoStep: { k1: "E06", k2: "C07", mod: "ALTGR" }, layer: "langues", recipe: "1. AltGr + 6, puis 2. j → ɲ (absent sur Windows)" },
          { ch: "ɔ", pain: "Copier ɔ", keys: ["ALTGR", "E06", "D09"], twoStep: { k1: "E06", k2: "D09", mod: "ALTGR" }, layer: "langues", recipe: "1. AltGr + 6, puis 2. o → ɔ (absent sur Windows)" },
          { t: "g" },
          { ch: "ɔ", pain: "Copier ɔ", keys: ["ALTGR", "E06", "D09"], twoStep: { k1: "E06", k2: "D09", mod: "ALTGR" }, layer: "langues", recipe: "1. AltGr + 6, puis 2. o → ɔ (absent sur Windows)" },
          { t: "n" },
        ],
        [{ t: " " }],
        [
          { t: "ye" },
          { ch: ".", pain: "Maj + ;", keys: ["B08"], layer: "essentiel", recipe: "Touche . directe → . (avant\u00a0: Maj + ;)" },
        ],
      ],
    },
    code: {
      cls: "is-code",
      noteBefore: "Extensions inconfortables sur la rangée des chiffres (AltGr + 4 / 5 / 6 / 7 / ) / =).",
      noteAfter: "Symboles de programmation alignés sur la rangée de repos (AltGr + D F G H J K L).",
      groups: [
        [{ ch: "{", pain: "AltGr+4", keys: ["ALTGR", "C03"], layer: "altgr", recipe: "AltGr + D → { (avant\u00a0: AltGr + 4)" }],
        [{ t: " " }],
        [
          { t: "tags" },
          { ch: "[", pain: "AltGr+5", keys: ["ALTGR", "C07"], layer: "altgr", recipe: "AltGr + J → [ (avant\u00a0: AltGr + 5)" },
          { t: "0" },
          { ch: "]", pain: "AltGr+)", keys: ["ALTGR", "C08"], layer: "altgr", recipe: "AltGr + K → ] (avant\u00a0: AltGr + ))" },
        ],
        [{ t: " " }],
        [{ ch: "|", pain: "AltGr+6", keys: ["ALTGR", "C06"], layer: "altgr", recipe: "AltGr + H → | (avant\u00a0: AltGr + 6)" }],
        [{ t: " " }],
        [
          { ch: "`", pain: "AltGr+7", keys: ["ALTGR", "C09"], layer: "altgr", recipe: "AltGr + L → ` (avant\u00a0: AltGr + 7 puis Espace)" },
          { t: "ok" },
          { ch: "`", pain: "AltGr+7", keys: ["ALTGR", "C09"], layer: "altgr", recipe: "AltGr + L → ` (avant\u00a0: AltGr + 7 puis Espace)" },
        ],
        [{ t: " " }],
        [{ ch: "}", pain: "AltGr+=", keys: ["ALTGR", "C04"], layer: "altgr", recipe: "AltGr + F → } (avant\u00a0: AltGr + =)" }],
      ],
    },
  };

  let activeReg = "fr";
  let isFixed = false;
  let kbView = "global";
  let activeLayer = "essentiel";

  const phraseEl = document.getElementById("kinetic-phrase");
  const phraseNoteEl = document.getElementById("kinetic-note");
  const switchBtn = document.getElementById("repair-switch");
  const switchLabelBefore = document.getElementById("sw-label-before");
  const switchLabelAfter = document.getElementById("sw-label-after");
  const regBtns = document.querySelectorAll("[data-phrase-reg]");

  function attrSafe(s) {
    return String(s || "").replace(/’/g, "'");
  }

  function renderPhrase(withFlip) {
    if (!phraseEl) return;
    const cfg = PHRASES[activeReg];

    const oldRects = new Map();
    if (withFlip && !prefersReduced) {
      phraseEl.querySelectorAll("[data-word-id]").forEach((el) => {
        oldRects.set(el.dataset.wordId, el.getBoundingClientRect());
      });
    }

    phraseEl.className = "kinetic-phrase " + cfg.cls + (isFixed ? " is-healed" : " is-broken");
    phraseEl.innerHTML = "";

    let tokUid = 0;
    cfg.groups.forEach((grp) => {
      const container = grp.length > 1 ? document.createElement("span") : null;
      if (container) container.className = "kp-nowrap";

      grp.forEach((tok) => {
        const id = String(tokUid++);
        let node;
        if (tok.thin) {
          node = document.createElement("span");
          node.className = "kp-thin";
          node.textContent = "\u202f";
          node.dataset.wordId = id;
        } else if (tok.t !== undefined) {
          node = document.createElement("span");
          node.className = "kp-word";
          node.dataset.wordId = id;
          node.textContent = tok.t;
        } else {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "kp-tok " + (isFixed ? "is-clean" : "is-alt");
          btn.dataset.wordId = id;
          btn.textContent = isFixed ? tok.ch : tok.pain;
          btn.setAttribute("aria-label", attrSafe(tok.recipe));

          const highlightThis = (btnEl) => {
            phraseEl.querySelectorAll(".kp-tok").forEach((b) => b.classList.remove("is-focus"));
            if (btnEl) btnEl.classList.add("is-focus");
            if (kbView !== "global") setKbView("global");
            if (tok.twoStep) {
              setKbLayer("langues", activeReg === "afrique" ? 2 : 0, true);
              drawTwoStepArc(tok.twoStep.k1, tok.twoStep.k2, tok.twoStep.mod, tok.recipe);
            } else {
              if (isFixed && tok.layer) setKbLayer(tok.layer, 0, true);
              highlightKbKeys(tok.keys, tok.recipe, true);
            }
          };

          btn.addEventListener("mouseenter", () => highlightThis(btn));
          btn.addEventListener("focus", () => highlightThis(btn));
          btn.addEventListener("click", () => {
            if (!isFixed) {
              setFixedState(true, true, true);
              const freshBtn = phraseEl.querySelector(`[data-word-id="${id}"]`);
              highlightThis(freshBtn);
              if (freshBtn) freshBtn.focus();
            } else {
              highlightThis(btn);
            }
          });
          node = btn;
        }
        (container || phraseEl).appendChild(node);
      });

      if (container) phraseEl.appendChild(container);
    });

    if (oldRects.size > 0) {
      phraseEl.querySelectorAll("[data-word-id]").forEach((el) => {
        const prev = oldRects.get(el.dataset.wordId);
        if (!prev) return;
        const next = el.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
            { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          );
        }
      });
    }

    if (phraseNoteEl) phraseNoteEl.textContent = isFixed ? cfg.noteAfter : cfg.noteBefore;
    if (switchBtn) switchBtn.setAttribute("aria-checked", String(isFixed));
    if (switchLabelBefore) switchLabelBefore.classList.toggle("is-on", !isFixed);
    if (switchLabelAfter) switchLabelAfter.classList.toggle("is-on", isFixed);
  }

  function setFixedState(fixed, withFlip, broadcast) {
    isFixed = fixed;
    renderPhrase(withFlip);
    if (broadcast) {
      window.dispatchEvent(new CustomEvent("ag:global-mode", { detail: { mode: fixed ? "after" : "before" } }));
    }
    if (fixed) {
      if (kbView !== "global") setKbView("global");
      const firstTok = PHRASES[activeReg].groups.flat().find((t) => t.keys);
      if (firstTok && firstTok.twoStep) {
        setKbLayer("langues", activeReg === "afrique" ? 2 : 0, true);
        drawTwoStepArc(firstTok.twoStep.k1, firstTok.twoStep.k2, firstTok.twoStep.mod, firstTok.recipe);
      } else if (firstTok) {
        highlightKbKeys(firstTok.keys, firstTok.recipe, false);
      }
    } else {
      clearKbHighlight();
      if (hkReadout) hkReadout.textContent = "Cliquez un code rouge ou basculez l’interrupteur pour voir son raccourci AZERTY Global.";
    }
  }

  if (switchBtn) switchBtn.addEventListener("click", () => setFixedState(!isFixed, true, true));
  if (switchLabelBefore) switchLabelBefore.addEventListener("click", () => setFixedState(false, true, true));
  if (switchLabelAfter) switchLabelAfter.addEventListener("click", () => setFixedState(true, true, true));

  window.addEventListener("ag:hero-mode", (ev) => {
    if (!ev.detail || !ev.detail.mode) return;
    const nextFixed = ev.detail.mode === "after";
    if (nextFixed !== isFixed) setFixedState(nextFixed, true, false);
  });

  regBtns.forEach((b) => {
    b.addEventListener("click", () => {
      activeReg = b.dataset.phraseReg;
      regBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      clearTwoStepArc();
      if (kbView !== "global") setKbView("global");
      if (activeReg === "afrique") setKbLayer("langues", 2, false);
      else if (activeReg === "code") setKbLayer("altgr", 0, false);
      else setKbLayer("essentiel", 0, false);
      renderPhrase(false);
    });
  });

  // =========================================================================
  // 3. CLAVIER BLENDER 5.2 HIGH-KEY + 62 LÉGENDES VECTORIELLES
  // =========================================================================
  const hkKeysWrap = document.getElementById("hk-keys-layer");
  const hkArcsSvg = document.getElementById("hk-arcs-svg");
  const hkReadout = document.getElementById("hk-readout");
  const hkViewNote = document.getElementById("hk-view-note");
  const hkScrollShell = document.getElementById("hk-scroll-shell");
  const hkScrollWrap = hkScrollShell ? hkScrollShell.parentElement : null;
  const layerBtns = document.querySelectorAll("[data-kb-layer]");
  const viewBtns = document.querySelectorAll("[data-kb-view]");
  const langBarWrap = document.getElementById("lang-quick-bar");
  const langPillsWrap = document.getElementById("lang-quick-strip");
  const langStepCallout = document.getElementById("lang-step-callout");

  if (hkScrollShell && hkScrollWrap) {
    const syncScrollFade = () => {
      const atEnd = hkScrollShell.scrollLeft + hkScrollShell.clientWidth >= hkScrollShell.scrollWidth - 8;
      hkScrollWrap.classList.toggle("is-scrolled-end", atEnd);
    };
    hkScrollShell.addEventListener("scroll", syncScrollFade, { passive: true });
    syncScrollFade();
  }

  const OVERVIEW_TINT = new Set([
    "E00", "E02", "E07", "E09", "E10", "E11", "B08", "C11", "D07",
    "C03", "C04", "C05", "C06", "C07", "C08", "C09", "B01", "B02", "D09", "CAPS", "ALTGR",
  ]);

  const MOD_SHORT = {
    BKSP: "⌫", TAB: "Tab", CAPS: "Verr.\u00a0Maj.", ENTER: "Entrée",
    LSHIFT: "Maj", RSHIFT: "Maj", LCTRL: "Ctrl", LWIN: "Win",
    LALT: "Alt", A03: "", ALTGR: "AltGr", RWIN: "Fn", MENU: "≡", RCTRL: "Ctrl",
  };

  const DEAD_MAP = {
    dk_acute: { sym: "´", label: "Accent aigu (´)" },
    dk_grave: { sym: "`", label: "Accent grave (`)" },
    dk_tilde: { sym: "~", label: "Tilde (~)" },
    dk_circumflex: { sym: "^", label: "Accent circonflexe (^)" },
    dk_diaeresis: { sym: "¨", label: "Tréma (¨)" },
    dk_double_acute: { sym: "˝", label: "Double accent aigu (˝)" },
    dk_double_grave: { sym: "̏", label: "Double accent grave" },
    dk_breve: { sym: "˘", label: "Brève (˘)" },
    dk_inverted_breve: { sym: "̑", label: "Brève inversée" },
    dk_macron: { sym: "¯", label: "Macron (¯)" },
    dk_cedilla: { sym: "¸", label: "Cédille (¸)" },
    dk_comma: { sym: "̦", label: "Virgule souscrite" },
    dk_caron: { sym: "ˇ", label: "Caron (ˇ)" },
    dk_ogonek: { sym: "˛", label: "Ogonek (˛)" },
    dk_dot_below: { sym: "ẹ", label: "Point souscrit (ẹ, ọ…)" },
    dk_dot_above: { sym: "˙", label: "Point en chef (˙)" },
    dk_hook: { sym: "ɓ", label: "Crochet en chef (ɓ, ɗ, ƙ…)" },
    dk_horn: { sym: "̛", label: "Corne (ơ, ư)" },
    dk_extended_latin: { sym: "ɛ", label: "Latin étendu (ɛ, ɔ, ɲ, ŋ…)" },
    dk_stroke: { sym: "ø", label: "Barre diagonale (ø, ł…)" },
    dk_horizontal_stroke: { sym: "đ", label: "Barre horizontale (đ, ħ…)" },
    dk_ring_above: { sym: "˚", label: "Rond en chef (å…)" },
    dk_scientific: { sym: "±", label: "Symboles scientifiques (±, ×, ≠…)" },
    dk_misc_symbols: { sym: "→", label: "Symboles divers (→, …, ™…)" },
    dk_greek: { sym: "α", label: "Alphabet grec (α, β, π…)" },
    dk_cyrillic: { sym: "ж", label: "Alphabet cyrillique (ж, д, я…)" },
    dk_cyrillic_ext: { sym: "ө", label: "Cyrillique étendu" },
    dk_punctuation: { sym: "§", label: "Ponctuation (§, †, •…)" },
    dk_currencies: { sym: "¤", label: "Devises (¤, ₹, ₦…)" },
    dk_phonetic: { sym: "ɐ", label: "Symboles phonétiques" },
  };

  const LANG_DEMOS = [
    { ch: "á", lang: "Espagnol / portugais", k1: "C11", k2: "D01", mod: null, step: "1. Touche ´ (à droite du M) → 2. a = á" },
    { ch: "ñ", lang: "Wolof / espagnol", k1: "C11", k2: "B06", mod: "ALTGR", step: "1. AltGr + touche ´ → 2. n = ñ" },
    { ch: "ɛ", lang: "Bambara / lingala / éwé", k1: "E06", k2: "D03", mod: "ALTGR", step: "1. AltGr + 6 (Latin étendu) → 2. e = ɛ" },
    { ch: "ɓ", lang: "Peul / haoussa", k1: "E01", k2: "B05", mod: "ALTGR", step: "1. AltGr + 1 (Crochet en chef) → 2. b = ɓ" },
    { ch: "ø", lang: "Danois / norvégien", k1: "E07", k2: "D09", mod: "ALTGR", step: "1. AltGr + 7 (Barre diagonale) → 2. o = ø" },
    { ch: "π", lang: "Maths / grec", k1: "C12", k2: "D10", mod: "LSHIFT", step: "1. Maj + * (Alphabet grec) → 2. p = π" },
  ];

  function cleanSym(v) {
    if (!v) return "";
    if (String(v).startsWith("dk_")) return DEAD_MAP[v] ? DEAD_MAP[v].sym : "";
    return v;
  }

  function describeValue(v) {
    if (!v) return "";
    if (String(v).startsWith("dk_")) return DEAD_MAP[v] ? `Touche morte\u00a0: ${DEAD_MAP[v].label}` : "";
    return v;
  }

  function kbdTag(cls, txt) {
    const safe = String(txt).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<kbd class="${cls}">${safe}</kbd>`;
  }

  const keyBtns = new Map();
  const keyOrder = [];
  if (hkKeysWrap && HK.rects) {
    const entries = Object.entries(HK.rects);
    entries.forEach(([pos, r], idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hk-key";
      btn.dataset.pos = pos;
      btn.tabIndex = idx === 0 ? 0 : -1;
      btn.style.left = `${(r.x * 100).toFixed(3)}%`;
      btn.style.top = `${(r.y * 100).toFixed(3)}%`;
      btn.style.width = `${(r.w * 100).toFixed(3)}%`;
      btn.style.height = `${(r.h * 100).toFixed(3)}%`;

      btn.addEventListener("click", () => {
        if (activeLayer === "langues") clearTwoStepArc();
        handleKeyInspect(pos, true);
      });
      btn.addEventListener("mouseenter", () => handleKeyInspect(pos, false));
      btn.addEventListener("focus", () => {
        keyBtns.forEach((b) => { b.tabIndex = -1; });
        btn.tabIndex = 0;
        handleKeyInspect(pos, false);
      });
      btn.addEventListener("keydown", (e) => {
        if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
        e.preventDefault();
        const curIdx = keyOrder.indexOf(pos);
        const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 13 : -13;
        const nextIdx = (curIdx + delta + keyOrder.length) % keyOrder.length;
        const nextBtn = keyBtns.get(keyOrder[nextIdx]);
        if (nextBtn) nextBtn.focus();
      });

      hkKeysWrap.appendChild(btn);
      keyBtns.set(pos, btn);
      keyOrder.push(pos);
    });
  }

  function setKbView(view) {
    kbView = view;
    viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kbView === view)));
    if (view === "classic") {
      clearTwoStepArc();
      clearKbHighlight();
      if (langBarWrap) langBarWrap.hidden = true;
      if (hkViewNote) hkViewNote.textContent = "Affichage\u00a0: AZERTY traditionnel de Windows";
    } else {
      if (langBarWrap) langBarWrap.hidden = activeLayer !== "langues";
      if (hkViewNote) hkViewNote.textContent = "Même clavier physique · A à Z inchangés";
    }
    renderKeyboardLayer();
  }

  viewBtns.forEach((b) => {
    b.addEventListener("click", () => setKbView(b.dataset.kbView));
  });

  function renderKeyboardLayer() {
    if (!keyBtns.size) return;
    const showClassic = kbView === "classic";

    for (const [pos, btn] of keyBtns.entries()) {
      const k = KEYS_BY_POS.get(pos);
      btn.classList.remove("is-accent", "is-dim", "is-mod", "is-step1", "is-step2");

      if (pos in MOD_SHORT) {
        btn.classList.add("is-mod");
        const label = MOD_SHORT[pos];
        if (pos === "A03") {
          btn.innerHTML = !showClassic && activeLayer === "altgr"
            ? kbdTag("hk-main is-blue", "Espace fine insécable")
            : "";
        } else {
          const lit = !showClassic && ((activeLayer === "verrmaj" && pos === "CAPS") || (activeLayer === "altgr" && pos === "ALTGR"));
          if (lit) btn.classList.add("is-accent");
          btn.innerHTML = kbdTag("hk-mod-lbl", label);
        }
        btn.setAttribute("aria-label", attrSafe(label || "Espace"));
        continue;
      }

      if (!k || !k.ag) continue;
      const base = k.ag.base || "";
      const shift = k.ag.shift || "";
      const caps = k.ag.caps || "";
      const altgr = cleanSym(k.ag.alt_gr);
      const isAlpha = /^[a-z]$/.test(base);
      const tradBase = (k.trad && k.trad.base) || "";
      const tradShift = (k.trad && k.trad.shift) || "";
      const tradAlt = (k.trad && k.trad.alt_gr) || "";
      const altIsAdded = Boolean(k.ag.alt_gr) && k.ag.alt_gr !== tradAlt;

      if (showClassic) {
        const primary = isAlpha ? tradShift : cleanSym(tradBase);
        const sec = isAlpha ? "" : cleanSym(tradShift);
        const agOld = cleanSym(tradAlt);
        btn.innerHTML =
          (sec && !isAlpha ? kbdTag("hk-tl", sec) : "") +
          kbdTag("hk-bl is-calm", primary) +
          (agOld ? kbdTag("hk-br is-muted", agOld) : "");
      } else if (activeLayer === "verrmaj") {
        const isAccCap = ["E02", "E07", "E09", "E10"].includes(pos);
        if (isAccCap) {
          btn.classList.add("is-accent");
          btn.innerHTML = kbdTag("hk-sub-tl", base) + kbdTag("hk-hero-sym is-blue", caps);
        } else if (isAlpha) {
          btn.innerHTML = kbdTag("hk-main is-calm", shift);
        } else {
          btn.classList.add("is-dim");
          btn.innerHTML = kbdTag("hk-main is-calm", cleanSym(base) || shift);
        }
      } else if (activeLayer === "altgr") {
        if (altgr) {
          if (altIsAdded) btn.classList.add("is-accent");
          const hint = isAlpha ? shift : (pos.startsWith("E") && /^[0-9]$/.test(shift) ? shift : cleanSym(base));
          const symCls = altIsAdded ? "hk-hero-sym is-blue" : "hk-hero-sym is-calm";
          btn.innerHTML = kbdTag("hk-sub-tl", hint) + kbdTag(symCls, altgr);
        } else {
          btn.classList.add("is-dim");
          btn.innerHTML = kbdTag("hk-main is-calm", isAlpha ? shift : cleanSym(base));
        }
      } else if (activeLayer === "langues") {
        const LANG_TRIGGERS = {
          E01: { hint: "1", badge: "ɓ ɗ ƙ" },
          E03: { hint: "3", badge: "ẹ ọ" },
          E06: { hint: "6", badge: "ɛ ɔ ŋ" },
          E07: { hint: "7", badge: "ø ł" },
          C11: { hint: "´", badge: "´ ` ~" },
          C12: { hint: "*", badge: "α β π" },
        };
        if (pos in LANG_TRIGGERS) {
          const lt = LANG_TRIGGERS[pos];
          btn.classList.add("is-accent");
          btn.innerHTML = kbdTag("hk-sub-tl", lt.hint) + kbdTag("hk-dead-lbl is-blue", lt.badge);
        } else {
          const mainLbl = isAlpha ? shift : (pos.startsWith("E") && /^[0-9]$/.test(shift) ? shift : cleanSym(base));
          btn.innerHTML = kbdTag("hk-main is-calm", mainLbl);
        }
      } else {
        if (OVERVIEW_TINT.has(pos)) btn.classList.add("is-accent");
        if (pos === "E00") {
          btn.innerHTML = kbdTag("hk-tl is-blue is-bold", "#") + kbdTag("hk-hero-sym is-blue", "@") + kbdTag("hk-tr is-origin", "²");
        } else if (pos === "B08") {
          btn.innerHTML = kbdTag("hk-tl is-blue is-bold", ";") + kbdTag("hk-hero-sym is-dot is-blue", ".");
        } else if (pos === "C11") {
          btn.innerHTML = kbdTag("hk-tl hk-diacritic is-blue", "`") + kbdTag("hk-bl hk-diacritic is-blue", "´") + kbdTag("hk-br hk-diacritic is-blue", "~") + kbdTag("hk-tr is-origin", "ù");
        } else if (["E02", "E07", "E09", "E10"].includes(pos)) {
          btn.innerHTML = kbdTag("hk-tl", shift) + kbdTag("hk-bl", base) + kbdTag("hk-tr is-blue is-bold", caps);
        } else if (isAlpha) {
          const altCls = altIsAdded ? "hk-br is-blue is-bold" : "hk-br is-calm";
          const extraCls = pos === "C09" ? " hk-diacritic" : "";
          btn.innerHTML =
            kbdTag("hk-tl is-calm", shift) +
            (altgr ? kbdTag(altCls + extraCls, altgr) : "");
        } else {
          const bStr = cleanSym(base);
          const sStr = cleanSym(shift);
          const blueTop = pos === "E11" || pos === "C12" || pos === "B10";
          const showAltInOverview = !["E01", "E03", "E05", "E08", "D11"].includes(pos) && altgr && altIsAdded;
          const diacCls = (pos === "D11" || pos === "E04") ? " hk-diacritic" : "";
          btn.innerHTML =
            (sStr ? kbdTag(`hk-tl${blueTop ? " is-blue is-bold" : ""}${pos === "D11" ? " hk-diacritic" : ""}`, sStr) : "") +
            (bStr ? kbdTag(`hk-bl${pos === "D11" ? " hk-diacritic" : ""}`, bStr) : "") +
            (showAltInOverview ? kbdTag(`hk-br is-blue${diacCls}`, altgr) : "");
        }
      }
      btn.setAttribute("aria-label", attrSafe(`Touche ${isAlpha ? shift : cleanSym(base) || pos}`));
    }
  }

  function scrollMobileKeyIntoView(pos) {
    if (!hkScrollShell || window.innerWidth >= 768) return;
    const b = keyBtns.get(pos);
    if (b && b.scrollIntoView) {
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: prefersReduced ? "auto" : "smooth" });
    }
  }

  function clearKbHighlight() {
    keyBtns.forEach((b) => b.classList.remove("is-lit", "is-pressed"));
  }

  function highlightKbKeys(posList, message, centerOnMobile) {
    clearKbHighlight();
    posList.forEach((p) => {
      const b = keyBtns.get(p);
      if (b) b.classList.add("is-lit");
    });
    if (centerOnMobile && posList.length) {
      scrollMobileKeyIntoView(posList[posList.length - 1]);
    }
    if (hkReadout && message) hkReadout.textContent = message;
  }

  function clearTwoStepArc() {
    if (hkArcsSvg) hkArcsSvg.innerHTML = "";
    keyBtns.forEach((b) => b.classList.remove("is-step1", "is-step2"));
  }

  function drawTwoStepArc(pos1, pos2, modPos, text) {
    clearTwoStepArc();
    clearKbHighlight();
    const r1 = HK.rects[pos1];
    const r2 = HK.rects[pos2];
    const b1 = keyBtns.get(pos1);
    const b2 = keyBtns.get(pos2);
    if (modPos) {
      const bm = keyBtns.get(modPos);
      if (bm) bm.classList.add("is-lit");
    }
    if (b1) b1.classList.add("is-step1", "is-lit");
    if (b2) b2.classList.add("is-step2", "is-lit");
    if (hkReadout) hkReadout.textContent = text;
    if (langStepCallout) langStepCallout.textContent = text;
    scrollMobileKeyIntoView(pos1);
    if (!hkArcsSvg || !r1 || !r2) return;

    const W = HK.width;
    const H = HK.height;
    const x1 = (r1.x + r1.w) * W - 8;
    const y1 = r1.y * H + 8;
    const x2 = (r2.x + r2.w) * W - 8;
    const y2 = r2.y * H + 8;
    const mx = (x1 + x2) * 0.5;
    const my = Math.min(y1, y2) - 72;

    const dx = x2 - mx;
    const dy = y2 - my;
    const len = Math.hypot(dx, dy) || 1;
    const ex = x2 - (dx / len) * 20;
    const ey = y2 - (dy / len) * 20;

    hkArcsSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    hkArcsSvg.innerHTML =
      `<defs><marker id="ag-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1 L 10 5 L 0 9 z" fill="#0038FF"></path></marker></defs>` +
      `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#0038FF" stroke-width="4.5" stroke-dasharray="9 6" marker-end="url(#ag-arrow)"></path>` +
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="15" fill="#0038FF" stroke="#F6F5F0" stroke-width="3"></circle>` +
      `<text x="${x1.toFixed(1)}" y="${(y1 + 5.5).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans, sans-serif" font-weight="600" font-size="17">1</text>` +
      `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="15" fill="#111215" stroke="#F6F5F0" stroke-width="3"></circle>` +
      `<text x="${x2.toFixed(1)}" y="${(y2 + 5.5).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans, sans-serif" font-weight="600" font-size="17">2</text>`;
  }

  function handleKeyInspect(pos, pressed) {
    const k = KEYS_BY_POS.get(pos);
    const btn = keyBtns.get(pos);
    if (pressed && btn) {
      btn.classList.add("is-pressed");
      setTimeout(() => btn.classList.remove("is-pressed"), 180);
    }
    if (!k || !hkReadout) return;

    const showClassic = kbView === "classic";
    if (pos === "CAPS") {
      hkReadout.textContent = showClassic
        ? "Verr.\u00a0Maj. traditionnel\u00a0: tape 2, 7, 9, 0 au lieu de É, È, Ç, À."
        : "Verrouillage majuscule intelligent\u00a0: écrit É, È, Ç, À sans verrouiller les chiffres.";
      return;
    }
    if (pos === "ALTGR") {
      hkReadout.textContent = showClassic
        ? "AltGr traditionnel\u00a0: symboles techniques dispersés sur la rangée des chiffres."
        : "AltGr\u00a0: ouvre «\u00a0» œ æ, { } [ ] \\ | sur la rangée de repos et plus de 300\u00a0langues.";
      return;
    }
    if (pos === "A03") {
      hkReadout.textContent = showClassic
        ? "Direct\u00a0: Espace (pas d’espace fine insécable)."
        : "Direct\u00a0: Espace · AltGr\u00a0: Espace fine insécable · Maj + AltGr\u00a0: Espace insécable";
      return;
    }

    const src = showClassic ? k.trad : k.ag;
    if (!src) return;
    const parts = [];
    const bDesc = describeValue(src.base);
    const sDesc = describeValue(src.shift);
    const cDesc = src.caps && src.caps !== src.shift ? describeValue(src.caps) : "";
    const aDesc = describeValue(src.alt_gr);
    if (bDesc) parts.push(`Direct\u00a0: ${bDesc}`);
    if (sDesc) parts.push(`Maj\u00a0: ${sDesc}`);
    if (cDesc) parts.push(`Verr.\u00a0Maj.\u00a0: ${cDesc}`);
    if (aDesc) parts.push(`AltGr\u00a0: ${aDesc}`);
    hkReadout.textContent = parts.join(" · ");
  }

  function setKbLayer(layer, demoIndex, silent) {
    activeLayer = layer;
    layerBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kbLayer === layer)));
    clearTwoStepArc();
    clearKbHighlight();
    if (kbView !== "global") setKbView("global");
    if (langBarWrap) langBarWrap.hidden = layer !== "langues";
    renderKeyboardLayer();
    if (silent) return;

    if (layer === "langues") {
      const idx = typeof demoIndex === "number" ? demoIndex : 0;
      const demo = LANG_DEMOS[idx] || LANG_DEMOS[0];
      drawTwoStepArc(demo.k1, demo.k2, demo.mod, demo.step);
      if (langPillsWrap) {
        langPillsWrap.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === idx)));
      }
    } else if (layer === "verrmaj") {
      highlightKbKeys(["CAPS", "E02", "E07", "E09", "E10"], "Verrouillage majuscule intelligent\u00a0: É, È, Ç, À directs, chiffres intacts.", false);
    } else if (layer === "altgr") {
      highlightKbKeys(["ALTGR", "B01", "B02", "D09", "C03", "C04", "C05", "C06", "C07", "C08"], "AltGr\u00a0: guillemets «\u00a0», œ et symboles { } [ ] \\ | sous les doigts.", false);
    } else if (hkReadout) {
      hkReadout.textContent = "Survolez une touche ou cliquez un caractère ci-dessus pour inspecter son raccourci.";
    }
  }

  layerBtns.forEach((b) => {
    b.addEventListener("click", () => {
      setKbLayer(b.dataset.kbLayer, 0, false);
    });
  });

  if (langPillsWrap) {
    LANG_DEMOS.forEach((d, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lang-pill";
      b.setAttribute("aria-pressed", String(idx === 0));
      b.innerHTML = `<span class="lang-pill__g">${d.ch}</span><span>${d.lang}</span>`;
      b.addEventListener("click", () => {
        langPillsWrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawTwoStepArc(d.k1, d.k2, d.mod, d.step);
      });
      langPillsWrap.appendChild(b);
    });
  }

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    if ((e.code === "Space" || e.code === "Enter") && (tag === "BUTTON" || tag === "A" || tag === "SUMMARY")) return;
    const isAltGr = Boolean((e.getModifierState && e.getModifierState("AltGraph")) || (e.ctrlKey && e.altKey));
    if ((e.ctrlKey && !isAltGr) || e.metaKey) return;
    const k = KEYS_BY_CODE.get(e.code);
    if (!k) return;
    handleKeyInspect(k.pos, true);
  });

  renderPhrase(false);
  renderKeyboardLayer();
})();
