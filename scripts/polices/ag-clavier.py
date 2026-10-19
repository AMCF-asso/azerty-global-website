"""AG Clavier — sous-ensemble de Source Code Pro pour le composant clavier.

Usage, depuis la racine du site :

    python scripts/polices/ag-clavier.py <chemin de SourceCodePro[wght].ttf>
    python scripts/polices/couverture.py

Source : https://raw.githubusercontent.com/google/fonts/main/ofl/sourcecodepro/SourceCodePro%5Bwght%5D.ttf
(téléchargement accordé par Antoine, QCM du 2026-10-01).

1. Lit les caractères que le composant écrit en police mono (champ
   `caracteresAffiches` de src/_data/clavier.js, lu par Node).
2. Écarte ceux que le Source Code Pro du site dessine déjà
   (source-code-pro-400) : AG Clavier ne fait que le combler. Un signe
   qu'AG Symboles dessine reste dans AG Clavier quand Source Code Pro l'a :
   AG Clavier passe avant AG Symboles dans `--police-mono`, et un même
   clavier ne mêle plus deux dessins (α β γ δ π σ ω Ω d'AG Symboles à côté
   des autres lettres grecques d'AG Clavier, critique du 2026-10-03).
3. Garde ceux que Source Code Pro complet dessine, instancié en wght 400.
4. Renomme la famille « AG Clavier » : la licence OFL de Source Code Pro
   réserve le nom « Source » aux versions non modifiées, et un sous-ensemble
   est une version modifiée (même règle qu'AG Symboles).
5. Écrit assets/fonts/ag-clavier-400.woff2, sa licence et sa provenance, et
   imprime la `unicode-range` à reporter dans css/v2/fontes.css.
6. Écrit un second fichier de la même famille, ag-clavier-etendu-400.woff2,
   pour ce que l'explorateur des touches mortes et la recherche écrivent en
   plus (sorties des tables mortes et caractères de l'index du testeur) :
   cyrillique, grec, symboles (décision d'Antoine du 2026-10-02, sans
   police Noto). Plages disjointes du premier : une page qui n'affiche que
   le clavier ne télécharge pas ce second fichier.

Les caractères que ni le site ni Source Code Pro ne dessinent sont listés :
src/_data/clavier.js les affiche décomposés quand c'est possible, et échoue
au build sinon. Ceux de l'explorateur restent en police du système.
"""

import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import unicodedata

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POLICES = os.path.join(RACINE, 'assets', 'fonts')
SORTIE = os.path.join(POLICES, 'ag-clavier-400.woff2')
SORTIE_ETENDU = os.path.join(POLICES, 'ag-clavier-etendu-400.woff2')
PROVENANCE = os.path.join(POLICES, 'ag-clavier.provenance.json')
LICENCE = os.path.join(POLICES, 'ag-clavier.OFL.txt')
URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sourcecodepro/SourceCodePro%5Bwght%5D.ttf'
NOM = 'AG Clavier'


def caracteres_affiches():
    env = dict(os.environ, CLAVIER_SANS_COUVERTURE='1')
    code = "process.stdout.write(JSON.stringify(require('./src/_data/clavier.js').caracteresAffiches))"
    sortie = subprocess.run(['node', '-e', code], cwd=RACINE, env=env, capture_output=True, check=True)
    return json.loads(sortie.stdout.decode('utf-8'))


def caracteres_explorateur():
    """Ce que l'explorateur et la recherche écrivent en police mono : les
    sorties des tables mortes et les caractères de l'index, sans espaces ni
    caractères de format (écrits ␣)."""
    with open(os.path.join(RACINE, 'tester', 'azerty-global.json'), encoding='utf-8') as flux:
        tables = json.load(flux).get('deadkeys', {})
    with open(os.path.join(RACINE, 'tester', 'character-index.json'), encoding='utf-8') as flux:
        index = json.load(flux).get('characters', {})
    textes = [valeur for table in tables.values() for valeur in table.values()
              if isinstance(valeur, str) and not valeur.startswith('dk_')]
    textes += [caractere for caractere in index if not caractere.startswith('dk:')]
    return {ord(c) for texte in textes for c in texte if unicodedata.category(c)[0] not in 'ZC'}


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


def renommer(police, postscript):
    table = police['name']
    for enregistrement in list(table.names):
        if enregistrement.nameID in (16, 17, 21, 22, 25):
            table.removeNames(nameID=enregistrement.nameID)
    for nid, valeur in ((1, NOM), (2, 'Regular'), (3, f'{postscript}-2026'), (4, f'{NOM} Regular'),
                        (6, postscript)):
        table.setName(valeur, nid, 3, 1, 0x409)
        table.setName(valeur, nid, 1, 0, 0)


def ecrire(source, points, sortie, postscript):
    """Sous-ensemble de Source Code Pro en 400, renommé ; rend son cmap réel."""
    police = instantiateVariableFont(TTFont(source), {'wght': 400})
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]
    options.name_languages = ['*']
    options.hinting = False
    options.notdef_outline = True
    sous = subset.Subsetter(options)
    sous.populate(unicodes=points)
    sous.subset(police)
    renommer(police, postscript)
    police.flavor = 'woff2'
    police.save(sortie)
    return sorted(TTFont(sortie).getBestCmap())


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    with open(source, 'rb') as flux:
        empreinte = hashlib.sha256(flux.read()).hexdigest()

    voulus = {ord(c) for c in caracteres_affiches()}
    site = cmap(os.path.join(POLICES, 'source-code-pro-400.woff2'))
    symboles = cmap(os.path.join(POLICES, 'ag-symboles-400.woff2'))
    police = TTFont(source)
    complet = set(police.getBestCmap())

    manquants = sorted(voulus - site)
    gardes = [p for p in manquants if p in complet]
    absents = [p for p in manquants if p not in complet and p not in symboles]

    explorateur = caracteres_explorateur() - site - set(gardes)
    # Les marques combinantes vont avec ◌ dans le premier fichier : la suite
    # ◌ + marque ne se dessine que par une face qui a les deux, et 15 marques
    # retombaient sur Consolas (critique du 2026-10-02).
    marques = {p for p in explorateur if unicodedata.category(chr(p)) == 'Mn' and p in complet}
    gardes = sorted(set(gardes) | marques)
    explorateur -= marques
    etendus = sorted(p for p in explorateur if p in complet)
    sans_police = sorted(p for p in explorateur if p not in complet and p not in symboles)

    version = police['name'].getDebugName(5)
    droits = police['name'].getDebugName(0)

    reel = ecrire(source, gardes, SORTIE, 'AGClavier-Regular')
    reel_etendu = ecrire(source, etendus, SORTIE_ETENDU, 'AGClavierEtendu-Regular')

    licence_source = os.path.join(os.path.dirname(source), 'OFL.txt')
    if os.path.exists(licence_source):
        shutil.copyfile(licence_source, LICENCE)

    octets = os.path.getsize(SORTIE)
    octets_etendu = os.path.getsize(SORTIE_ETENDU)
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
        'etendu': {
            'usage': 'même famille, second fichier : ce que l’explorateur des touches mortes et la recherche '
                     'écrivent en plus (sorties des tables mortes, caractères de l’index du testeur) ; '
                     'plages disjointes du premier fichier, téléchargé seulement quand l’un de ces signes s’affiche',
            'caracteres': ''.join(chr(p) for p in reel_etendu),
            'unicode_range': plages(reel_etendu),
            'octets': octets_etendu,
            'sans_police_du_site': len(sans_police),
        },
        'fichiers': {'400': os.path.basename(SORTIE), '400 étendu': os.path.basename(SORTIE_ETENDU)},
    }
    with open(PROVENANCE, 'w', encoding='utf-8', newline='\n') as flux:
        json.dump(provenance, flux, ensure_ascii=False, indent=2)
        flux.write('\n')

    print(f'{os.path.basename(SORTIE)} : {len(reel)} points de code, {octets} octets')
    print('unicode-range:', plages(reel))
    print(f'{os.path.basename(SORTIE_ETENDU)} : {len(reel_etendu)} points de code, {octets_etendu} octets')
    print('unicode-range:', plages(reel_etendu))
    print(f'Explorateur et recherche, sans police du site : {len(sans_police)} caractères (police du système)')
    if absents:
        print('Absents de Source Code Pro (décomposés ou refusés au build) :',
              ' '.join(f'{chr(p)} U+{p:04X}' for p in absents))


if __name__ == '__main__':
    main()
