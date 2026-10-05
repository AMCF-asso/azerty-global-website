"""Couverture des polices du site — ce qu'elles dessinent vraiment.

Usage, depuis la racine du site : python scripts/polices/couverture.py

Relève les points de code des fichiers WOFF2 servis et écrit
data/derives/couverture-polices.json, que lit src/_data/clavier.js : un
caractère de l'infobulle qu'aucune police ne dessine tomberait sur une police
du système (Consolas, Menlo…), au dessin et à l'alignement différents. Le
composant l'affiche alors décomposé, ou refuse le build.

À relancer après tout changement d'un fichier de assets/fonts/.
"""

import datetime
import json
import os

from fontTools.ttLib import TTFont

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
POLICES = os.path.join(RACINE, 'assets', 'fonts')
SORTIE = os.path.join(RACINE, 'data', 'derives', 'couverture-polices.json')

# Mêmes piles que --police-mono et --police-sans (css/v2/jetons.css).
PILES = {
    # AG Code et AG Texte (P-02, 2026-10-05) : les coupes servies de Source
    # Code Pro et Source Sans 3 (scripts/polices/decoupe-texte.py).
    'mono': ['ag-code-400-latin.woff2', 'ag-code-400-latin-ext.woff2', 'ag-code-400-reste.woff2',
             'ag-clavier-400.woff2', 'ag-clavier-etendu-400.woff2', 'ag-symboles-400.woff2'],
    'sans': ['ag-texte-400-latin.woff2', 'ag-texte-400-latin-ext.woff2', 'ag-texte-400-reste.woff2',
             'ag-symboles-400.woff2'],
}


def main():
    sortie = {
        'genere_par': 'scripts/polices/couverture.py — ne pas éditer',
        'genere': datetime.date.today().isoformat(),
    }
    for pile, fichiers in PILES.items():
        points = set()
        for fichier in fichiers:
            chemin = os.path.join(POLICES, fichier)
            if os.path.exists(chemin):
                points |= set(TTFont(chemin).getBestCmap())
        sortie[pile] = sorted(points)
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, 'w', encoding='utf-8', newline='\n') as flux:
        json.dump(sortie, flux, separators=(',', ':'))
        flux.write('\n')
    print(f"{os.path.relpath(SORTIE, RACINE)} : mono {len(sortie['mono'])}, sans {len(sortie['sans'])} points de code")


if __name__ == '__main__':
    main()
