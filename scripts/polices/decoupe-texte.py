"""AG Texte et AG Code — Source Sans 3 et Source Code Pro découpées par plage.

Usage, depuis la racine du site : python scripts/polices/decoupe-texte.py

P-02 (audit perf du 2026-10-05) : Source Sans 3 400/600 (59 Ko chacune) et
Source Code Pro 400 (40 Ko) étaient servies entières, sans `unicode-range`,
et les deux Source Sans 3 étaient préchargées sur chaque page. Ce script les
coupe en trois fichiers disjoints, comme Literata :

- latin : plage latin de Literata (css/v2/fontes.css), plus les flèches
  U+2190-2199, que 50 pages affichent (→) ;
- latin-ext : plage latin-ext de Literata, moins ce qui est déjà en latin ;
- reste : tout ce que la police dessine en plus (grec, cyrillique, symboles).

Chaque `unicode-range` de fontes.css est le cmap RÉEL du fichier (imprimé
ici) : un fichier n'est téléchargé que par une page qui affiche l'un de ses
signes, et l'union des trois rend exactement le cmap de la police d'origine.

Sources : les fichiers pleins assets/fonts/source-sans-3-{400,600}.woff2 et
source-code-pro-400.woff2, gardés tels quels (ag-clavier.py et couverture.py
les lisent ; ils ne sont plus référencés par aucune page).

Renommage : un sous-ensemble est une version modifiée au sens de l'OFL, et le
nom « Source » est réservé (Reserved Font Name) ; même règle que pour
AG Clavier. Les familles deviennent « AG Texte » et « AG Code ». Copyright
d'origine conservé (nameID 0), licence OFL 1.1 dans les nameID 13-14 et dans
assets/fonts/ag-texte.OFL.txt et ag-code.OFL.txt.

À relancer après tout changement des fichiers sources, puis
scripts/polices/couverture.py.
"""

import hashlib
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POLICES = os.path.join(RACINE, 'assets', 'fonts')


def plages(texte):
    points = set()
    for morceau in texte.replace('U+', '').split(','):
        morceau = morceau.strip()
        if not morceau:
            continue
        debut, _, fin = morceau.partition('-')
        points.update(range(int(debut, 16), int(fin or debut, 16) + 1))
    return points


# Plages de Literata (css/v2/fontes.css), mêmes coupes que Google Fonts.
LATIN = plages('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, '
               'U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, '
               'U+FEFF, U+FFFD') | plages('U+2190-2199')
LATIN_EXT = plages('U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, '
                   'U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, '
                   'U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF')

POLICES_A_COUPER = [
    # (source, famille, graisse, préfixe de sortie, licence)
    ('source-sans-3-400.woff2', 'AG Texte', 400, 'ag-texte-400', 'ag-texte.OFL.txt'),
    ('source-sans-3-600.woff2', 'AG Texte', 600, 'ag-texte-600', 'ag-texte.OFL.txt'),
    ('source-code-pro-400.woff2', 'AG Code', 400, 'ag-code-400', 'ag-code.OFL.txt'),
]
STYLE = {400: 'Regular', 600: 'SemiBold'}


def en_plage(points):
    points = sorted(points)
    morceaux, i = [], 0
    while i < len(points):
        j = i
        while j + 1 < len(points) and points[j + 1] == points[j] + 1:
            j += 1
        morceaux.append('U+%04X' % points[i] if i == j else 'U+%04X-%04X' % (points[i], points[j]))
        i = j + 1
    return ', '.join(morceaux)


def renommer(police, famille, graisse):
    style = STYLE[graisse]
    postscript = famille.replace(' ', '') + '-' + style
    table = police['name']
    for enregistrement in list(table.names):
        if enregistrement.nameID in (16, 17, 21, 22, 25):
            table.removeNames(nameID=enregistrement.nameID)
    # Graisse 600 : famille « AG Texte SemiBold » pour les applications à
    # quatre styles, famille typographique « AG Texte » (16/17) pour le reste.
    nom_famille = famille if graisse == 400 else f'{famille} {style}'
    valeurs = [(1, nom_famille), (2, 'Regular'), (3, f'{postscript}-2026'),
               (4, f'{famille} {style}'), (6, postscript),
               (13, 'This Font Software is licensed under the SIL Open Font License, Version 1.1.'),
               (14, 'https://openfontlicense.org')]
    if graisse != 400:
        valeurs += [(16, famille), (17, style)]
    for nid, valeur in valeurs:
        table.setName(valeur, nid, 3, 1, 0x409)
        table.setName(valeur, nid, 1, 0, 0)


def ecrire(source, points, sortie, famille, graisse):
    police = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    sous = subset.Subsetter(options)
    sous.populate(unicodes=points)
    sous.subset(police)
    renommer(police, famille, graisse)
    police.flavor = 'woff2'
    police.save(sortie)
    return set(TTFont(sortie).getBestCmap())


def main():
    rapport = {}
    for source, famille, graisse, prefixe, licence in POLICES_A_COUPER:
        chemin = os.path.join(POLICES, source)
        with open(chemin, 'rb') as flux:
            empreinte = hashlib.sha256(flux.read()).hexdigest()
        cmap = set(TTFont(chemin).getBestCmap())
        coupes = {'latin': cmap & LATIN}
        coupes['latin-ext'] = (cmap & LATIN_EXT) - coupes['latin']
        coupes['reste'] = cmap - coupes['latin'] - coupes['latin-ext']
        union = set()
        for nom, points in coupes.items():
            if not points:
                continue
            sortie = os.path.join(POLICES, f'{prefixe}-{nom}.woff2')
            reel = ecrire(chemin, points, sortie, famille, graisse)
            if reel != points:
                sys.exit(f'{sortie} : cmap {len(reel)} au lieu de {len(points)} points demandés')
            union |= reel
            plage = en_plage(reel)
            rapport[os.path.basename(sortie)] = {
                'source': source, 'sha256_source': empreinte, 'famille': famille, 'graisse': graisse,
                'points': len(reel), 'octets': os.path.getsize(sortie), 'unicode_range': plage,
            }
            print(f'{os.path.basename(sortie)} : {len(reel)} points, {os.path.getsize(sortie)} o')
            print(f'  unicode-range: {plage};')
        if union != cmap:
            sys.exit(f'{source} : l\'union des coupes ne rend pas le cmap d\'origine')
    for famille, fichier in (('AG Texte', 'ag-texte'), ('AG Code', 'ag-code')):
        provenance = {
            'police': f'{famille} — sous-ensembles par plage de '
                      + ('Source Sans 3 (Adobe), graisses 400 et 600' if famille == 'AG Texte'
                         else 'Source Code Pro (Adobe), graisse 400'),
            'licence': f'SIL Open Font License 1.1, texte : {fichier}.OFL.txt ; version modifiée '
                       '(sous-ensemble), renommée : le nom « Source » est réservé par la licence',
            'methode': 'scripts/polices/decoupe-texte.py : fontTools subset, toutes les fonctions '
                       'OpenType gardées, hinting conservé, noms d\'origine conservés sauf famille',
            'fichiers': {k: v for k, v in rapport.items() if v['famille'] == famille},
        }
        with open(os.path.join(POLICES, f'{fichier}.provenance.json'), 'w', encoding='utf-8', newline='\n') as flux:
            json.dump(provenance, flux, ensure_ascii=False, indent=2)
            flux.write('\n')


if __name__ == '__main__':
    main()
