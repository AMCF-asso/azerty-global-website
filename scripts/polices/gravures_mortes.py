"""Gravures des touches mortes : marques sur ◌ lisibles à la taille des touches.

Usage, depuis la racine du site (appelé aussi par ag-clavier.py) :

    python scripts/polices/gravures_mortes.py

À 11-18 px, ◌̦ et ◌̧ (touche 9) avaient la même queue au même endroit, et
◌̌ ◌̂ (touches 5 et ^) se lisaient comme les brèves voisines. Choix d'Antoine
sur rendus, 2026-10-22 (operations/2026-10-22-gravures-souscrites) :
A · virgule pleine pour les souscrites, C · pointues pour le dessus.

Ajoute à AG Clavier un glyphe composé « ◌ + marque » par marque retouchée
et une ligature ccmp ◌ + marque → ce glyphe. Seules les suites qui
commencent par ◌ changent : une lettre décomposée (s + U+0326) garde la
marque de Source Code Pro. Ni le cmap ni la unicode-range ne bougent.
"""

import os
import sys

from fontTools.otlLib.builder import buildLigatureSubstSubtable, buildLookup
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

POLICES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'fonts')
POLICE = os.path.join(POLICES, 'ag-clavier-400.woff2')
AG_CODE = os.path.join(POLICES, 'ag-code-400-latin.woff2')

CERCLE = 0x25CC
VIRGULE = 'comma.ag'
# Marque : (autre dessin, sinon None ; échelle, point fixe (x, y), décalage vertical).
# Le point fixe est l'endroit où la marque touche ◌ : grossir autour de lui
# garde l'accroche. Les ancres de ◌ sont à y = 0 / −20 dessous, 507 dessus.
RETOUCHES = {
    # Vraie virgule (celle de Source Code Pro, prise dans AG Code), détachée
    # sous ◌ : la virgule souscrite d'origine est une cédille plus courte.
    0x0326: (VIRGULE, 0.75, (296, 155), -235),
    0x0327: (None, 1.45, (300, 8), 0),
    0x0328: (None, 1.45, (300, 3), 0),
    0x0323: (None, 1.7, (300, -87), -20),
    # Caron et circonflexe ×1,5 posés au même pied ; brèves inchangées.
    0x030C: (None, 1.5, (300, 568), 0),
    0x0302: (None, 1.5, (300, 568), 0),
}
PROVENANCE = {
    'methode': 'scripts/polices/gravures_mortes.py : glyphe composé ◌ + marque (échelle autour du point fixe, '
               'décalage vertical) et ligature ccmp ◌ + marque → composé ; virgule U+0326 dessinée par la '
               'virgule de ag-code-400-latin.woff2',
    'decision': 'Antoine, sur rendus, 2026-10-22 : A · virgule pleine (souscrites), C · pointues (dessus)',
    'parametres': {f'U+{p:04X}': [e, list(f), d] for p, (_, e, f, d) in RETOUCHES.items()},
}


def copier_virgule(police, ag_code):
    code = TTFont(ag_code)
    source = code['glyf'][code.getBestCmap()[ord(',')]]
    source.expand(code['glyf'])
    glyphe = Glyph()
    glyphe.numberOfContours = source.numberOfContours
    glyphe.coordinates = source.coordinates.copy()
    glyphe.endPtsOfContours = list(source.endPtsOfContours)
    glyphe.flags = source.flags[:]
    glyphe.program = ttProgram.Program()
    glyphe.program.fromBytecode(b'')  # AG Clavier n'a pas de hinting
    ajouter(police, VIRGULE, glyphe)


def ajouter(police, nom, glyphe):
    police.setGlyphOrder(police.getGlyphOrder() + [nom])
    police['glyf'][nom] = glyphe
    glyphe.recalcBounds(police['glyf'])
    police['hmtx'][nom] = (600, getattr(glyphe, 'xMin', 0))


def composer(police, nom, cercle, marque, echelle, fixe, dy):
    fx, fy = fixe
    glyphe = Glyph()
    glyphe.numberOfContours = -1
    glyphe.components = []
    for source, x, y, transformation in ((cercle, 0, 0, None),
                                         (marque, round(fx * (1 - echelle)), round(fy * (1 - echelle) + dy),
                                          [[echelle, 0], [0, echelle]])):
        composant = GlyphComponent()
        composant.glyphName, composant.x, composant.y = source, x, y
        composant.flags = 0x4  # ROUND_XY_TO_GRID
        if transformation and echelle != 1:
            composant.transform = transformation
        glyphe.components.append(composant)
    ajouter(police, nom, glyphe)


def deja_retouchee(police, cercle):
    """Vrai si une ligature ccmp part de ◌. Les noms de glyphes ne se lisent
    pas : le sous-ensemble est écrit sans noms (post 3)."""
    gsub = police['GSUB'].table
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != 'ccmp':
            continue
        for index in fr.Feature.LookupListIndex:
            for table in gsub.LookupList.Lookup[index].SubTable:
                if getattr(table, 'ligatures', None) and cercle in table.ligatures:
                    return True
    return False


def retoucher(chemin=POLICE, ag_code=AG_CODE):
    police = TTFont(chemin)
    cmap = police.getBestCmap()
    cercle = cmap[CERCLE]
    if deja_retouchee(police, cercle):
        sys.exit(f'{os.path.basename(chemin)} est déjà retouchée : régénérer avec ag-clavier.py.')
    copier_virgule(police, ag_code)
    table = {}
    for point, (source, echelle, fixe, dy) in RETOUCHES.items():
        marque = cmap[point]
        dessin = source or marque
        nom = f'uni25CC_uni{point:04X}.ag'
        composer(police, nom, cercle, dessin, echelle, fixe, dy)
        table[(cercle, marque)] = nom

    gsub = police['GSUB'].table
    gsub.LookupList.Lookup.append(buildLookup([buildLigatureSubstSubtable(table)]))
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'ccmp':
            fr.Feature.LookupListIndex.append(gsub.LookupList.LookupCount - 1)
            fr.Feature.LookupCount = len(fr.Feature.LookupListIndex)
    classes = police['GDEF'].table.GlyphClassDef.classDefs
    for nom in table.values():
        classes[nom] = 1  # base : les marques suivantes s'y accrochent encore

    police.flavor = 'woff2'
    police.save(chemin)
    return len(table)


if __name__ == '__main__':
    n = retoucher(*sys.argv[1:3])
    print(f'{os.path.basename(sys.argv[1] if len(sys.argv) > 1 else POLICE)} : {n} gravures retouchées')
