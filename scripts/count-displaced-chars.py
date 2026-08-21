#!/usr/bin/env python3
"""Compte les caractères déjà présents sur l'AZERTY traditionnel qui changent de place.

Produit les chiffres publiés sur /comparatif, /entreprises et /ecoles pour comparer
le coût de réapprentissage d'AZERTY Global et de la norme AFNOR NF Z71-300.

Trois populations, et seule la première coûte quelque chose à l'utilisateur :

  - change de touche : la gravure du clavier devient fausse, il faut mémoriser
    une nouvelle position ;
  - reste sur la même touche : seul le niveau change (base contre majuscule),
    les deux symboles sont déjà gravés sur la touche, rien à réapprendre
    visuellement ;
  - ajouté : absent de la référence, donc rien à désapprendre.

Le nombre de touches de destination distinctes mesure la dispersion : six
caractères qui atterrissent sur six touches contiguës font une règle à retenir,
là où trente et un caractères dispersés sur vingt-deux touches font vingt-deux
positions à apprendre une par une.

Attention : il n'existe pas de « caractère AltGr non gravé » sur un clavier
AZERTY français du commerce. Les caractères AltGr de la rangée des chiffres
(~ # { [ | \\ ^ @ ] }) sont gravés en troisième position sur les touches. Tout
déplacement est donc visible pour l'utilisateur, et il ne faut pas chercher à
distinguer des déplacements « invisibles ».

Usage :
    python scripts/count-displaced-chars.py [--data data] [--json]
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

MODIFIER_LEVELS = ["base", "shift", "alt_gr", "shift_alt_gr"]
REFERENCE = "AZERTY Traditionnel.json"
CIBLES = [("AFNOR", "AZERTY AFNOR.json"), ("AZERTY Global", "AZERTY Global.json")]


def forcer_sortie_utf8():
    """Une console Windows est en cp1252 : sans cela, tout accent tue le script."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(encoding="utf-8", errors="backslashreplace")
            except (OSError, ValueError):
                pass


def charger_positions(chemin):
    """Rend {caractère: {(position, niveau), ...}} pour une disposition."""
    disposition = json.loads(Path(chemin).read_text(encoding="utf-8"))
    positions = defaultdict(set)
    for rangee in disposition.get("rows", []):
        for touche in rangee.get("keys", []):
            for niveau in MODIFIER_LEVELS:
                caractere = touche.get(niveau)
                if caractere:
                    positions[caractere].add((touche.get("position"), niveau))
    return positions


def comparer(reference, cible):
    """Classe les caractères de la référence selon ce que la cible leur fait."""
    change_de_touche, meme_touche, disparus = [], [], []
    for caractere, places in reference.items():
        if caractere not in cible:
            disparus.append(caractere)
            continue
        if cible[caractere] & places:
            continue
        touches_avant = {position for position, _ in places}
        touches_apres = {position for position, _ in cible[caractere]}
        entree = (caractere, sorted(touches_avant), sorted(touches_apres))
        if touches_avant & touches_apres:
            meme_touche.append(entree)
        else:
            change_de_touche.append(entree)
    ajoutes = [c for c in cible if c not in reference]
    destinations = sorted({d for _, _, apres in change_de_touche for d in apres})
    return {
        "change_de_touche": sorted(change_de_touche),
        "meme_touche": sorted(meme_touche),
        "disparus": sorted(disparus),
        "ajoutes": sorted(ajoutes),
        "destinations": destinations,
    }


def main():
    forcer_sortie_utf8()
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", default="data", help="dossier des dispositions JSON")
    parser.add_argument("--json", action="store_true", help="sortie JSON au lieu du texte")
    args = parser.parse_args()

    dossier = Path(args.data)
    reference = charger_positions(dossier / REFERENCE)
    resultats = {}

    for nom, fichier in CIBLES:
        chemin = dossier / fichier
        if not chemin.exists():
            print(f"ERREUR : {chemin} est absent", file=sys.stderr)
            return 1
        resultats[nom] = comparer(reference, charger_positions(chemin))

    if args.json:
        sortie = {
            "reference": REFERENCE,
            "caracteres_de_reference": len(reference),
            "dispositions": {
                nom: {
                    "change_de_touche": len(r["change_de_touche"]),
                    "meme_touche": len(r["meme_touche"]),
                    "deplaces_total": len(r["change_de_touche"]) + len(r["meme_touche"]),
                    "touches_de_destination": len(r["destinations"]),
                    "ajoutes": len(r["ajoutes"]),
                    "disparus": len(r["disparus"]),
                }
                for nom, r in resultats.items()
            },
        }
        print(json.dumps(sortie, ensure_ascii=False, indent=2))
        return 0

    print(f"Référence : {REFERENCE}, {len(reference)} caractères\n")
    for nom, r in resultats.items():
        deplaces = len(r["change_de_touche"]) + len(r["meme_touche"])
        print(f"=== {nom} ===")
        print(f"  déplacés au total                 : {deplaces}")
        print(f"  dont changent de touche           : {len(r['change_de_touche'])}")
        print(f"  dont restent sur la même touche   : {len(r['meme_touche'])}")
        print(f"  touches de destination distinctes : {len(r['destinations'])}")
        print(f"  ajoutés, rien à désapprendre      : {len(r['ajoutes'])}")
        print(f"  disparus                          : {len(r['disparus'])}"
              f"  {' '.join(r['disparus'])}")
        print("  changent de touche :")
        for caractere, avant, apres in r["change_de_touche"]:
            print(f"      {caractere!r:18} {', '.join(avant):10} -> {', '.join(apres)}")
        print("  même touche, niveau seul :")
        for caractere, avant, apres in r["meme_touche"]:
            print(f"      {caractere!r:18} {', '.join(avant)}")
        print(f"  destinations : {' '.join(r['destinations'])}")
        print()

    afnor = len(resultats["AFNOR"]["change_de_touche"])
    globale = len(resultats["AZERTY Global"]["change_de_touche"])
    if globale:
        print(f"L'AFNOR fait changer de touche {afnor / globale:.1f} fois plus de "
              f"caractères qu'AZERTY Global ({afnor} contre {globale}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
