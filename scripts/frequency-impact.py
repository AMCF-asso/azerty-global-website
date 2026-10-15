#!/usr/bin/env python3
"""Pondère les caractères déplacés par leur fréquence, et rend la part des frappes touchées.

Produit les deux lignes du tableau « Impact chiffré sur la frappe » de /comparatif :

  - **part du répertoire** : combien des caractères déjà disponibles sur l'AZERTY
    traditionnel changent de touche ou de niveau, sur les 109 qu'il porte. Un
    comptage, sans fréquence : chaque caractère y pèse pareil.
  - **part des frappes** : les mêmes caractères pondérés par leur fréquence dans un
    texte français. Trois caractères rares déplacés ne coûtent pas ce que coûte le point.

Là où `count-displaced-chars.py` classe les déplacements, ce script les rapporte à
une base : un répertoire pour la première mesure, un corpus pour la seconde.

Deux entrées :

  - les positions, via `count-displaced-chars.py` (même source, même définition du
    déplacement) ;
  - les fréquences, via `data/Frequences-caracteres.csv`, deux colonnes de registre
    (formel, informel).

La part publiée est la moyenne des deux registres, chacun normalisé par la somme de
sa propre colonne : le CSV ne somme pas exactement à 1 (0,932 en formel, 0,951 en
informel), et normaliser après coup évite de prendre le manquant pour du texte.

  ⚠️ CE QUE « DEUX REGISTRES » RECOUVRE RÉELLEMENT — mesuré le 2026-08-31.

  Les deux colonnes ne sont pas deux mesures indépendantes du même texte. Sur les 148
  caractères de la table, 44 portent une valeur identique dans les deux colonnes — et
  ce sont les lettres, donc 92,9 % de la masse. Les 104 caractères où les registres
  divergent sont la ponctuation et les symboles, qui pèsent 7,1 %.

  La moyenne des deux registres n'agit donc que sur ces 7,1 %. Elle change le poids
  du dièse, de l'arobase ou du point d'exclamation ; elle ne change rien à celui du
  « e ». Décrire le corpus comme « à moitié formel, à moitié informel » laisse croire
  à deux mesures indépendantes sur tout le volume : c'est faux de l'essentiel.

  Le calcul, lui, fait exactement ce qu'il annonce. C'est la description qui était
  trompeuse, et elle seule est corrigée ici.

  Le CSV porte une quatrième colonne, `Prog`, renseignée pour les 148 caractères et
  jamais lue. Elle reste hors calcul par décision du 2026-08-31 (D37) : sa couverture
  est incomplète (somme 0,8353 contre 0,9320 en formel) et la composante code du
  corpus 2026 la remplacera. Mesure de son effet :
  `Keyboard Layouts/projects/amcf/operations/corpus-2026/pilote/mesurer_registre_prog.py`.

  ⚠️ EXCLUSION DU DIÈSE — décision d'Antoine du 2026-08-29.

  Le corpus de fréquences surévalue `#` : 0,00021 en registre formel contre 0,01149
  en informel, soit 55 fois plus. L'écart vient d'une couche de messages Twitter d'une
  époque où un post portait plusieurs hashtags ; il ne décrit pas l'usage du dièse dans
  un texte français. Compté tel quel, ce seul caractère vaut 0,615 % des frappes et
  pèse plus que tous les autres déplacements d'AZERTY Global réunis.

  Il est donc retiré du calcul. Il l'est **des deux dispositions à la fois** : les
  chiffres publiés jusqu'au 2026-08-29 l'excluaient d'AZERTY Global et le comptaient
  dans l'AFNOR, ce qui gonflait l'écart d'un facteur 4,1 à 4,8. Toute exclusion future
  s'applique aux deux colonnes ou à aucune, et se justifie ici, dans le code.

  L'exclusion ne touche **que la part des frappes**. La part du répertoire est un
  comptage : le dièse y change bien de touche, et aucun corpus n'y intervient qui
  puisse le surévaluer. `--sans-exclusion` rend la version sans aucun retrait, pour
  vérifier l'effet sur la seconde mesure.

Usage :
    python scripts/frequency-impact.py [--data data] [--json] [--sans-exclusion]
"""

import argparse
import csv
import json
import sys
from pathlib import Path

# `count-displaced-chars.py` porte des tirets dans son nom : import par chemin.
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "count_displaced_chars", Path(__file__).resolve().parent / "count-displaced-chars.py"
)
_compte = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_compte)

FREQUENCES = "Frequences-caracteres.csv"
REGISTRES = ("formel", "informel")

# Caractères retirés du calcul, avec le motif. Voir l'avertissement du docstring :
# une exclusion vaut pour les deux dispositions.
EXCLUSIONS = {
    "#": "corpus surévalué par une couche de messages Twitter (55x entre registres)",
}


def charger_frequences(chemin):
    """Rend {caractère: (fréquence formelle, fréquence informelle)}.

    Le CSV a une colonne vide en tête et des décimales à la virgule, entre guillemets.
    """
    frequences = {}
    with open(chemin, encoding="utf-8-sig", newline="") as fichier:
        for ligne in csv.reader(fichier):
            if len(ligne) < 4:
                continue
            caractere = ligne[1]
            if not caractere or caractere == "Symboles":
                continue
            try:
                formel = float(ligne[2].replace(",", "."))
                informel = float(ligne[3].replace(",", "."))
            except ValueError:
                continue
            frequences[caractere] = (formel, informel)
    return frequences


def part_des_frappes(caracteres, frequences, totaux):
    """Part des frappes que ces caractères représentent, en % et par registre.

    Un caractère absent du corpus (les touches mortes `dk_*`) ne pèse rien : il ne
    s'invente pas de fréquence.
    """
    presents = [c for c in caracteres if c in frequences]
    parts = []
    for rang, total in enumerate(totaux):
        somme = sum(frequences[c][rang] for c in presents)
        parts.append(somme / total * 100)
    return {
        "par_registre": dict(zip(REGISTRES, parts)),
        "moyenne": sum(parts) / len(parts),
        "comptes": {"retenus": len(presents), "hors_corpus": len(caracteres) - len(presents)},
    }


def mesurer(dossier, exclure):
    reference = _compte.charger_positions(dossier / _compte.REFERENCE)
    frequences = charger_frequences(dossier / FREQUENCES)
    totaux = [sum(v[rang] for v in frequences.values()) for rang in range(len(REGISTRES))]

    resultats = {}
    for nom, fichier in _compte.CIBLES:
        classement = _compte.comparer(reference, _compte.charger_positions(dossier / fichier))
        tous = [c for c, _, _ in classement["change_de_touche"] + classement["meme_touche"]]
        change = [c for c, _, _ in classement["change_de_touche"]]
        retires = sorted(c for c in tous if c in exclure)
        garder = lambda liste: [c for c in liste if c not in exclure]
        resultats[nom] = {
            "deplaces": len(garder(tous)),
            "changent_de_touche": len(garder(change)),
            "exclus": retires,
            "part_repertoire": {
                "deplaces": len(tous),
                "repertoire": len(reference),
                "pourcentage": len(tous) / len(reference) * 100,
            },
            "part_deplaces": part_des_frappes(garder(tous), frequences, totaux),
            "part_changements": part_des_frappes(garder(change), frequences, totaux),
        }
    resultats["_base"] = {
        "repertoire": {
            "source": str(dossier / _compte.REFERENCE),
            "caracteres": len(reference),
        },
        "corpus": str(dossier / FREQUENCES),
        "caracteres_du_corpus": len(frequences),
        "somme_par_registre": dict(zip(REGISTRES, totaux)),
        "exclusions": {c: EXCLUSIONS[c] for c in exclure},
    }
    return resultats


def main():
    _compte.forcer_sortie_utf8()
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", default="data", help="dossier des dispositions et du corpus")
    parser.add_argument("--json", action="store_true", help="sortie JSON au lieu du texte")
    parser.add_argument(
        "--sans-exclusion",
        action="store_true",
        help="compte tous les caractères, dièse compris (contrôle)",
    )
    args = parser.parse_args()

    dossier = Path(args.data)
    manquants = [f for f in (_compte.REFERENCE, FREQUENCES) if not (dossier / f).exists()]
    if manquants:
        print("ERREUR : absent de %s : %s" % (dossier, ", ".join(manquants)), file=sys.stderr)
        return 1

    exclure = {} if args.sans_exclusion else EXCLUSIONS
    resultats = mesurer(dossier, exclure)

    if args.json:
        print(json.dumps(resultats, ensure_ascii=False, indent=2))
        return 0

    base = resultats.pop("_base")
    print(
        "Répertoire : %s, %d caractères"
        % (base["repertoire"]["source"], base["repertoire"]["caracteres"])
    )
    print("Corpus : %s, %d caractères" % (base["corpus"], base["caracteres_du_corpus"]))
    if base["exclusions"]:
        for caractere, motif in base["exclusions"].items():
            print("Exclu des deux dispositions : « %s » — %s" % (caractere, motif))
    else:
        print("Aucune exclusion (mode contrôle)")
    print("Part = moyenne des deux registres, chacun normalisé par sa propre somme.")

    for nom, mesure in resultats.items():
        print()
        print("=== %s ===" % nom)
        repertoire = mesure["part_repertoire"]
        print(
            "  part du répertoire                : %.1f %%   (%d des %d caractères de la référence,"
            " dièse compris)"
            % (repertoire["pourcentage"], repertoire["deplaces"], repertoire["repertoire"])
        )
        print("  caractères déplacés, après retrait : %d" % mesure["deplaces"])
        print("  dont changent de touche           : %d" % mesure["changent_de_touche"])
        for etiquette, cle in (
            ("part des frappes, tous déplacés  ", "part_deplaces"),
            ("part des frappes, changements    ", "part_changements"),
        ):
            part = mesure[cle]
            registres = ", ".join(
                "%s %.2f %%" % (r, part["par_registre"][r]) for r in REGISTRES
            )
            print(
                "  %s : %.2f %%   (%s ; %d hors corpus)"
                % (etiquette, part["moyenne"], registres, part["comptes"]["hors_corpus"])
            )
        if mesure["exclus"]:
            print("  retirés du calcul                 : %s" % " ".join(mesure["exclus"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
