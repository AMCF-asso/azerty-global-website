"""AG Clavier — sous-ensemble de Source Code Pro pour le composant clavier.

Usage, depuis la racine du site :

    python scripts/polices/ag-clavier.py <chemin de SourceCodePro[wght].ttf>
    python scripts/polices/couverture.py

Source : https://raw.githubusercontent.com/google/fonts/main/ofl/sourcecodepro/SourceCodePro%5Bwght%5D.ttf
(téléchargement accordé par Antoine, QCM du 2026-10-01).

1. Lit les caractères que le composant écrit en police mono (champ
   `caracteresAffiches` de src/_data/clavier.js, lu par Node).
2. Écarte ceux que les polices déjà servies dessinent (source-code-pro-400,
   ag-symboles-400) : AG Clavier ne fait que combler.
3. Garde ceux que Source Code Pro complet dessine, instancié en wght 400.
4. Renomme la famille « AG Clavier » : la licence OFL de Source Code Pro
   réserve le nom « Source » aux versions non modifiées, et un sous-ensemble
   est une version modifiée (même règle qu'AG Symboles).
5. Écrit assets/fonts/ag-clavier-400.woff2, sa licence et sa provenance, et
   imprime la `unicode-range` à reporter dans css/v2/fontes.css.

Les caractères que ni le site ni Source Code Pro ne dessinent sont listés :
src/_data/clavier.js les affiche décomposés quand c'est possible, et échoue
au build sinon.
"""

import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POLICES = os.path.join(RACINE, 'assets', 'fonts')
SORTIE = os.path.join(POLICES, 'ag-clavier-400.woff2')
PROVENANCE = os.path.join(POLICES, 'ag-clavier.provenance.json')
LICENCE = os.path.join(POLICES, 'ag-clavier.OFL.txt')
URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sourcecodepro/SourceCodePro%5Bwght%5D.ttf'
NOM = 'AG Clavier'


def caracteres_affiches():
    env = dict(os.environ, CLAVIER_SANS_COUVERTURE='1')
    code = "process.stdout.write(JSON.stringify(require('./src/_data/clavier.js').caracteresAffiches))"
    sortie = subprocess.run(['node', '-e', code], cwd=RACINE, env=env, capture_output=True, check=True)
    return json.loads(sortie.stdout.decode('utf-8'))


def cmap(chemin):
    return set(TTFont(chemin).getBestCmap())


def plages(points):
    morceaux = []
    points = sorted(points)
    debut = precedent = points[0]
    for point in points[1:] + [None]:
        if point is not None and point == precedent + 1:
            precedent = point
            continue
        morceaux.append(f'U+{debut:04X}' if debut == precedent else f'U+{debut:04X}-{precedent:04X}')
        if point is not None:
            debut = precedent = point
    return ', '.join(morceaux)


def renommer(police):
    table = police['name']
    for enregistrement in list(table.names):
        if enregistrement.nameID in (16, 17, 21, 22, 25):
            table.removeNames(nameID=enregistrement.nameID)
    for nid, valeur in ((1, NOM), (2, 'Regular'), (3, 'AGClavier-Regular-2026'), (4, f'{NOM} Regular'),
                        (6, 'AGClavier-Regular')):
        table.setName(valeur, nid, 3, 1, 0x409)
        table.setName(valeur, nid, 1, 0, 0)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    with open(source, 'rb') as flux:
        empreinte = hashlib.sha256(flux.read()).hexdigest()

    voulus = {ord(c) for c in caracteres_affiches()}
    deja = cmap(os.path.join(POLICES, 'source-code-pro-400.woff2')) | cmap(os.path.join(POLICES, 'ag-symboles-400.woff2'))
    police = TTFont(source)
    complet = set(police.getBestCmap())

    manquants = sorted(voulus - deja)
    gardes = [p for p in manquants if p in complet]
    absents = [p for p in manquants if p not in complet]

    version = police['name'].getDebugName(5)
    droits = police['name'].getDebugName(0)
    police = instantiateVariableFont(police, {'wght': 400})

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]
    options.name_languages = ['*']
    options.hinting = False
    options.notdef_outline = True
    sous = subset.Subsetter(options)
    sous.populate(unicodes=gardes)
    sous.subset(police)
    renommer(police)
    police.flavor = 'woff2'
    police.save(SORTIE)

    licence_source = os.path.join(os.path.dirname(source), 'OFL.txt')
    if os.path.exists(licence_source):
        shutil.copyfile(licence_source, LICENCE)

    reel = sorted(TTFont(SORTIE).getBestCmap())
    octets = os.path.getsize(SORTIE)
    provenance = {
        'police': f'{NOM} — sous-ensemble de Source Code Pro (Adobe), instancié en graisse 400',
        'licence': 'SIL Open Font License 1.1, texte : ag-clavier.OFL.txt (copie de ofl/sourcecodepro/OFL.txt de google/fonts) ; '
                   'version modifiée (sous-ensemble), renommée « AG Clavier » : le nom « Source » est réservé par la licence',
        'genere': datetime.date.today().isoformat(),
        'methode': 'scripts/polices/ag-clavier.py : fontTools instancer (wght 400) + subset, toutes les fonctions OpenType '
                   'gardées (placement des marques sur ◌), sans hinting ; fontTools ' + __import__('fontTools').version,
        'usage': 'secours de --police-mono (css/v2/jetons.css) : comble Source Code Pro pour le composant clavier '
                 '(gravures des touches mortes, ◌ et marques combinantes, exemples de l’infobulle) ; '
                 'unicode-range = cmap réel, téléchargée seulement par les pages qui affichent l’un de ces signes',
        'caracteres': ''.join(chr(p) for p in reel),
        'unicode_range': plages(reel),
        'source': {
            'fichier': os.path.basename(source),
            'url': URL,
            'version': version,
            'copyright': droits,
            'sha256': empreinte,
        },
        'octets': octets,
        'fichiers': {'400': os.path.basename(SORTIE)},
    }
    with open(PROVENANCE, 'w', encoding='utf-8', newline='\n') as flux:
        json.dump(provenance, flux, ensure_ascii=False, indent=2)
        flux.write('\n')

    print(f'{os.path.basename(SORTIE)} : {len(reel)} points de code, {octets} octets')
    print('unicode-range:', plages(reel))
    if absents:
        print('Absents de Source Code Pro (décomposés ou refusés au build) :',
              ' '.join(f'{chr(p)} U+{p:04X}' for p in absents))


if __name__ == '__main__':
    main()
