/* Galerie visuelle : rend un dossier de captures (produites par capture-page.js)
   en une ou plusieurs pages HTML autonomes — JPEG qualité 80 en data URI,
   vignette + plein écran au clic, légende page / largeur / thème, numéro de
   vignette stable pour les remarques d'Antoine (roadmap D8 : aucune image
   n'est chargée dans la fenêtre de la session, la galerie se regarde en
   artifact ou via SendUserFile).

   Usage :
     node scripts/galerie.js <dossier-captures> <sortie.html>
          [--titre "Galerie v2"] [--planche planche.json] [--max-mo 16] [--vignette 420]

   - Les fichiers attendus suivent la convention de capture-page.js :
     <page>-<largeur>-<ivoire|sombre|fold>.png (ou .jpg).
   - Au-delà de --max-mo (16 par défaut, plafond des artifacts), la galerie est
     découpée par lot : <sortie>-1.html, <sortie>-2.html… Les captures d'une même
     page restent groupées quand elles tiennent ensemble.
   - --planche : JSON décrivant une ou plusieurs planches côte à côte (D27), placées
     en tête de la première galerie :
       [{ "titre": "…", "note": "…",
          "colonnes": [{ "titre": "v1 — prod", "image": "chemin.png", "texte": "extrait.html" }, …] }]
     `texte` est un fragment HTML ou un .txt inséré tel quel (source locale de confiance).
   - Un index <sortie>.index.json liste chaque vignette (numéro, fichier, page,
     largeur, thème, dimensions) pour citer les remarques par numéro.

   Requiert sharp (déjà dans node_modules via les dépendances de build). */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MIO = 1024 * 1024;

function parseArgs(argv) {
  const opts = { titre: 'Galerie des captures', planche: null, maxMo: 16, vignette: 420 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--titre') opts.titre = argv[++i];
    else if (a === '--planche') opts.planche = argv[++i];
    else if (a === '--max-mo') opts.maxMo = Number(argv[++i]);
    else if (a === '--vignette') opts.vignette = Number(argv[++i]);
    else positional.push(a);
  }
  if (positional.length < 2) {
    console.error('Usage : node scripts/galerie.js <dossier-captures> <sortie.html> [--titre …] [--planche …] [--max-mo 16] [--vignette 420]');
    process.exit(2);
  }
  opts.dossier = positional[0];
  opts.sortie = positional[1];
  return opts;
}

const RE_CAPTURE = /^(.+?)-(\d{3,4})-(ivoire|sombre|fold)\.(png|jpe?g)$/i;
const ORDRE_THEME = { ivoire: 0, sombre: 1, fold: 2 };
const LIBELLE_THEME = { ivoire: 'ivoire', sombre: 'sombre', fold: 'au-dessus de la ligne de flottaison' };

function listerCaptures(dossier) {
  return fs.readdirSync(dossier)
    .map((nom) => {
      const m = nom.match(RE_CAPTURE);
      if (!m) return null;
      return { fichier: path.join(dossier, nom), nom, page: m[1], largeur: Number(m[2]), theme: m[3].toLowerCase() };
    })
    .filter(Boolean)
    .sort((a, b) => a.page.localeCompare(b.page) || b.largeur - a.largeur || ORDRE_THEME[a.theme] - ORDRE_THEME[b.theme]);
}

async function encoder(fichier, vignetteLargeur) {
  const img = sharp(fichier);
  const meta = await img.metadata();
  const plein = await sharp(fichier).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  // La vignette cadre le haut de la capture : une pleine page de 6 000 px de haut
  // ne se lit pas en miniature, on montre la zone de flottaison et le clic ouvre le reste.
  const hauteurVignette = Math.round(vignetteLargeur * 4 / 3);
  const vignette = await sharp(fichier)
    .resize({ width: vignetteLargeur, height: hauteurVignette, fit: 'cover', position: 'top' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return {
    largeurPx: meta.width, hauteurPx: meta.height,
    plein: 'data:image/jpeg;base64,' + plein.toString('base64'),
    vignette: 'data:image/jpeg;base64,' + vignette.toString('base64'),
  };
}

function echapper(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function routeDepuisSlug(slug) {
  return slug === 'accueil' ? '/' : '/' + slug;
}

function figureHtml(item) {
  const legende = `n° ${item.numero} · ${routeDepuisSlug(item.page)} · ${item.largeur} px · ${LIBELLE_THEME[item.theme]}`;
  return `<figure class="vignette" data-numero="${item.numero}" data-page="${echapper(item.page)}" data-theme="${item.theme}">
<button type="button" class="vignette__bouton" data-plein="${item.plein}" data-legende="${echapper(legende)} · ${item.largeurPx}×${item.hauteurPx}" aria-label="Ouvrir la capture ${item.numero} en plein écran">
<img src="${item.vignette}" alt="" width="${item.vignetteLargeur}" loading="lazy" decoding="async">
</button>
<figcaption><span class="numero">${item.numero}</span> ${echapper(routeDepuisSlug(item.page))} · <strong>${item.largeur} px</strong> · ${echapper(LIBELLE_THEME[item.theme])} <span class="dim">${item.largeurPx}×${item.hauteurPx}</span></figcaption>
</figure>
`;
}

function sectionPageHtml(page, figures) {
  return `<section class="page-groupe" id="page-${echapper(page)}">
<h2>${echapper(routeDepuisSlug(page))} <span class="compte">${figures.length} capture${figures.length > 1 ? 's' : ''}</span></h2>
<div class="grille">
${figures.join('')}</div>
</section>
`;
}

async function plancheHtml(planche, baseDir, vignetteLargeur) {
  const colonnes = [];
  for (const col of planche.colonnes) {
    let imageHtml = '';
    if (col.image) {
      const chemin = path.resolve(baseDir, col.image);
      const enc = await encoder(chemin, vignetteLargeur);
      imageHtml = `<button type="button" class="vignette__bouton planche__image" data-plein="${enc.plein}" data-legende="${echapper(col.titre)} · ${enc.largeurPx}×${enc.hauteurPx}" aria-label="Ouvrir en plein écran">
<img src="${enc.plein}" alt="" width="${enc.largeurPx}" height="${enc.hauteurPx}" decoding="async">
</button>`;
    }
    let texteHtml = '';
    if (col.texte) {
      const chemin = path.resolve(baseDir, col.texte);
      const brut = fs.readFileSync(chemin, 'utf8');
      texteHtml = chemin.toLowerCase().endsWith('.txt')
        ? `<div class="planche__texte prose">${brut.split(/\n\s*\n/).map((p) => `<p>${echapper(p.trim())}</p>`).join('')}</div>`
        : `<div class="planche__texte prose">${brut}</div>`;
    }
    colonnes.push(`<div class="planche__colonne">
<h3>${echapper(col.titre)}</h3>
${col.sousTitre ? `<p class="planche__sous-titre">${echapper(col.sousTitre)}</p>` : ''}
${texteHtml}
${imageHtml}
</div>`);
  }
  return `<section class="planche" id="planche-${echapper((planche.id || planche.titre).toLowerCase().replace(/\W+/g, '-'))}">
<h2>${echapper(planche.titre)}</h2>
${planche.note ? `<p class="planche__note">${planche.note}</p>` : ''}
<div class="planche__colonnes" style="--colonnes:${planche.colonnes.length}">
${colonnes.join('\n')}
</div>
</section>
`;
}

const STYLE = `<style>
:root{--fond:#f7f4ee;--encre:#1d1b17;--sourdine:#6b665c;--carte:#fffdf8;--bord:#e2dcd0;--accent:#8a3b12;--voile:rgba(0,0,0,.82)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fond:#17161a;--encre:#ece8e0;--sourdine:#a39d92;--carte:#201f24;--bord:#34323a;--accent:#e2915f}}
:root[data-theme="dark"]{--fond:#17161a;--encre:#ece8e0;--sourdine:#a39d92;--carte:#201f24;--bord:#34323a;--accent:#e2915f}
body{margin:0;background:var(--fond);color:var(--encre);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
header{padding:28px 32px 12px}
h1{margin:0 0 6px;font-size:1.6rem;font-weight:600}
.meta{color:var(--sourdine);margin:0}
nav.sommaire{display:flex;flex-wrap:wrap;gap:8px 18px;padding:8px 32px 20px;border-bottom:1px solid var(--bord)}
nav.sommaire a{color:var(--accent);text-decoration:none}
nav.sommaire a:hover{text-decoration:underline}
section{padding:24px 32px}
h2{font-size:1.15rem;font-weight:600;margin:0 0 14px}
h2 .compte{color:var(--sourdine);font-weight:400;font-size:.9rem;margin-left:8px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
.vignette{margin:0;background:var(--carte);border:1px solid var(--bord);border-radius:8px;overflow:hidden}
.vignette__bouton{display:block;padding:0;border:0;background:none;cursor:zoom-in;width:100%}
.vignette__bouton img{display:block;width:100%;height:auto}
figcaption{padding:8px 10px 10px;font-size:.85rem;color:var(--sourdine)}
figcaption strong{color:var(--encre);font-weight:600}
.numero{display:inline-block;min-width:1.6em;padding:0 .35em;border-radius:4px;background:var(--accent);color:#fff;font-weight:700;text-align:center;font-size:.8rem}
.dim{float:right;font-variant-numeric:tabular-nums}
.planche{background:var(--carte);border-top:1px solid var(--bord);border-bottom:1px solid var(--bord)}
.planche__note{color:var(--sourdine);margin:-6px 0 16px;max-width:70ch}
.planche__colonnes{display:grid;grid-template-columns:repeat(var(--colonnes,2),minmax(0,1fr));gap:28px}
@media (max-width:900px){.planche__colonnes{grid-template-columns:1fr}}
.planche__colonne h3{margin:0 0 4px;font-size:1rem}
.planche__sous-titre{margin:0 0 12px;color:var(--sourdine);font-size:.9rem}
.planche__texte{border-left:3px solid var(--accent);padding:4px 16px;margin:0 0 16px;background:var(--fond);border-radius:0 6px 6px 0}
.planche__texte p{margin:.6em 0}
.planche__image{border:1px solid var(--bord);border-radius:6px;overflow:hidden}
.planche__image img{width:100%;height:auto;display:block}
dialog.plein{border:0;padding:0;margin:0;max-width:100vw;max-height:100vh;width:100vw;height:100vh;background:var(--voile)}
dialog.plein::backdrop{background:var(--voile)}
.plein__barre{position:sticky;top:0;display:flex;align-items:center;gap:16px;padding:10px 16px;background:rgba(0,0,0,.6);color:#fff;font-size:.9rem;z-index:1}
.plein__barre button{background:#fff2;color:#fff;border:1px solid #fff5;border-radius:6px;padding:4px 10px;cursor:pointer}
.plein__barre .legende{flex:1}
.plein__zone{overflow:auto;height:calc(100vh - 44px)}
.plein__zone img{display:block;margin:0 auto;max-width:none}
.plein__zone.ajuste img{max-width:100%}
</style>`;

const SCRIPT = `<script>
(function(){
  var dlg=document.getElementById('plein'),img=dlg.querySelector('img'),leg=dlg.querySelector('.legende'),zone=dlg.querySelector('.plein__zone');
  var boutons=Array.prototype.slice.call(document.querySelectorAll('.vignette__bouton')),courant=-1;
  function ouvrir(i){courant=i;var b=boutons[i];img.src=b.getAttribute('data-plein');leg.textContent=b.getAttribute('data-legende');zone.scrollTop=0;if(!dlg.open)dlg.showModal();}
  boutons.forEach(function(b,i){b.addEventListener('click',function(){ouvrir(i);});});
  dlg.querySelector('.fermer').addEventListener('click',function(){dlg.close();});
  dlg.querySelector('.precedent').addEventListener('click',function(){ouvrir((courant-1+boutons.length)%boutons.length);});
  dlg.querySelector('.suivant').addEventListener('click',function(){ouvrir((courant+1)%boutons.length);});
  dlg.querySelector('.ajuster').addEventListener('click',function(){zone.classList.toggle('ajuste');});
  dlg.addEventListener('click',function(e){if(e.target===dlg||e.target===zone)dlg.close();});
  document.addEventListener('keydown',function(e){if(!dlg.open)return;if(e.key==='ArrowRight'){ouvrir((courant+1)%boutons.length);}else if(e.key==='ArrowLeft'){ouvrir((courant-1+boutons.length)%boutons.length);}else if(e.key==='a'){zone.classList.toggle('ajuste');}});
  dlg.addEventListener('close',function(){img.removeAttribute('src');});
})();
</script>`;

function documentHtml({ titre, sousTitre, sommaire, corps }) {
  return `<title>${echapper(titre)}</title>
${STYLE}
<header>
<h1>${echapper(titre)}</h1>
<p class="meta">${echapper(sousTitre)}</p>
</header>
<nav class="sommaire">${sommaire.map((s) => `<a href="#${s.id}">${echapper(s.libelle)}</a>`).join('')}</nav>
${corps}
<dialog class="plein" id="plein">
<div class="plein__barre"><button type="button" class="fermer">Fermer (Échap)</button><button type="button" class="precedent">← Précédente</button><button type="button" class="suivant">Suivante →</button><button type="button" class="ajuster">Ajuster à la largeur (a)</button><span class="legende"></span></div>
<div class="plein__zone"><img alt=""></div>
</dialog>
${SCRIPT}
`;
}

function nomLot(sortie, n, total) {
  if (total === 1) return sortie;
  const ext = path.extname(sortie);
  return sortie.slice(0, -ext.length) + '-' + n + ext;
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const maxOctets = Math.floor(opts.maxMo * MIO * 0.97); // marge pour le squelette et l'enrobage
  const captures = listerCaptures(opts.dossier);
  if (!captures.length && !opts.planche) {
    console.error(`Aucune capture reconnue dans ${opts.dossier} (attendu : <page>-<largeur>-<ivoire|sombre|fold>.png)`);
    process.exit(1);
  }

  // Encodage et numérotation globale, dans l'ordre d'affichage.
  const items = [];
  let numero = 0;
  for (const c of captures) {
    const enc = await encoder(c.fichier, opts.vignette);
    numero += 1;
    const item = { ...c, ...enc, numero, vignetteLargeur: opts.vignette };
    item.html = figureHtml(item);
    items.push(item);
    process.stderr.write(`  ${numero}. ${c.nom} → ${(enc.plein.length / MIO).toFixed(2)} Mio\n`);
  }

  // Planches (D27 et suivantes) : en tête du premier lot.
  let plancheHtmlTotal = '';
  const planchesSommaire = [];
  if (opts.planche) {
    const planches = JSON.parse(fs.readFileSync(opts.planche, 'utf8'));
    const baseDir = path.dirname(path.resolve(opts.planche));
    for (const p of (Array.isArray(planches) ? planches : [planches])) {
      const html = await plancheHtml(p, baseDir, opts.vignette);
      plancheHtmlTotal += html;
      planchesSommaire.push({ id: html.match(/id="([^"]+)"/)[1], libelle: p.titre });
    }
  }

  // Découpage en lots : par page, sans dépasser maxOctets ; une page trop lourde se scinde.
  const pages = [];
  for (const it of items) {
    const dernier = pages[pages.length - 1];
    if (dernier && dernier.page === it.page) dernier.items.push(it);
    else pages.push({ page: it.page, items: [it] });
  }
  const lots = [];
  let lot = { octets: plancheHtmlTotal.length, sections: [], planches: plancheHtmlTotal, sommaire: [...planchesSommaire] };
  const pousserLot = () => { if (lot.sections.length || lot.planches) lots.push(lot); lot = { octets: 0, sections: [], planches: '', sommaire: [] }; };
  for (const p of pages) {
    let groupe = [];
    let octetsGroupe = 0;
    const flushGroupe = () => {
      if (!groupe.length) return;
      lot.sections.push(sectionPageHtml(p.page, groupe.map((g) => g.html)));
      lot.sommaire.push({ id: `page-${p.page}`, libelle: `${routeDepuisSlug(p.page)} (${groupe[0].numero}–${groupe[groupe.length - 1].numero})` });
      lot.octets += octetsGroupe;
      groupe = []; octetsGroupe = 0;
    };
    const total = p.items.reduce((s, it) => s + it.html.length, 0);
    if (lot.octets + total > maxOctets && lot.sections.length) pousserLot();
    for (const it of p.items) {
      if (lot.octets + octetsGroupe + it.html.length > maxOctets && (groupe.length || lot.sections.length)) {
        flushGroupe();
        pousserLot();
      }
      groupe.push(it); octetsGroupe += it.html.length;
    }
    flushGroupe();
  }
  pousserLot();

  const date = new Date().toISOString().slice(0, 10);
  const index = { titre: opts.titre, date, dossier: path.resolve(opts.dossier), lots: [], vignettes: [] };
  lots.forEach((l, i) => {
    const nom = nomLot(opts.sortie, i + 1, lots.length);
    const sousTitre = `${date} · ${items.length} capture${items.length > 1 ? 's' : ''} · lot ${i + 1}/${lots.length} · JPEG q80 · clic = plein écran, ← → pour naviguer, a = ajuster. Remarques : citer le numéro de vignette.`;
    const html = documentHtml({ titre: lots.length > 1 ? `${opts.titre} (${i + 1}/${lots.length})` : opts.titre, sousTitre, sommaire: l.sommaire, corps: l.planches + l.sections.join('') });
    fs.writeFileSync(nom, html);
    const octets = Buffer.byteLength(html);
    index.lots.push({ fichier: path.resolve(nom), octets, mio: +(octets / MIO).toFixed(2) });
    console.log(`${nom} : ${(octets / MIO).toFixed(2)} Mio${octets > opts.maxMo * MIO ? '  ⚠️ dépasse le plafond' : ''}`);
  });
  // Quelle vignette dans quel lot : l'index le retrouve par section.
  lots.forEach((l, i) => {
    const nom = nomLot(opts.sortie, i + 1, lots.length);
    for (const s of l.sections) {
      const nums = [...s.matchAll(/data-numero="(\d+)"/g)].map((m) => Number(m[1]));
      for (const n of nums) {
        const it = items[n - 1];
        index.vignettes.push({ numero: n, lot: path.basename(nom), fichier: it.nom, page: routeDepuisSlug(it.page), largeur: it.largeur, theme: it.theme, dimensions: `${it.largeurPx}×${it.hauteurPx}` });
      }
    }
  });
  const indexNom = opts.sortie.replace(/\.html?$/i, '') + '.index.json';
  fs.writeFileSync(indexNom, JSON.stringify(index, null, 2) + '\n');
  console.log(`${indexNom} : ${items.length} vignettes, ${lots.length} lot(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
