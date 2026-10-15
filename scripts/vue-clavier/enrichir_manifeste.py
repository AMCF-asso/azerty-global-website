"""Operation unique et rejouable : verse dans le manifeste OKLM ce que la vue
du site porte et que le coeur OKLM 0.1 ne modelise pas, sous
`metadata.OKLM_siteView` (membre prefixe OKLM_, accepte par validate.py
--strict, decisions D31-D44 ; jamais un fichier a cote).

    python scripts/vue-clavier/enrichir_manifeste.py \
           "data/azerty-global.oklm.json" "data/AZERTY Global.json"

Ecrit en Python et non en Node : `JSON.stringify` remonte les cles
entieres ("0".."9") en tete d'objet, ce qui reordonnerait les tables de
compositions. Python conserve l'ordre d'insertion.

Rien n'est invente : chaque valeur est lue dans la vue actuelle. Ce qui est
deja derivable du coeur (niveaux, compositions, doigts, nom, version, licence
SPDX) n'est PAS recopie ici - le generateur le prend au coeur.
"""

import json
import os
import sys
from collections import OrderedDict

# Champs de tete deja portes par le coeur du manifeste, ou reconstruits par le
# generateur : tout le reste de la tete de la vue part dans OKLM_siteView.tete,
# dans son ordre d'origine.
DERIVABLES = {"layout_name", "version", "rows", "dead_keys"}

# Champs d'une touche que le coeur du manifeste sait rendre : les huit niveaux
# (levels) et le doigt (metadata.training.fingers). Tout autre champ - scancode,
# code virtuel Windows - est materiel et part dans OKLM_siteView.materiel.
NIVEAUX = {
    "base", "shift", "caps", "caps_shift",
    "alt_gr", "shift_alt_gr", "caps_alt_gr", "caps_shift_alt_gr",
}
DERIVABLES_TOUCHE = NIVEAUX | {"position", "finger"}

LISEZMOI = (
    "Ce que la vue data/AZERTY Global.json porte et que le coeur OKLM 0.1 ne "
    "modelise pas : prose editoriale, groupement en rangees, correspondance "
    "materielle (scancode, code virtuel) et exemples des touches mortes. Le "
    "reste de la vue est genere depuis le coeur du manifeste."
)


def enrichir(manifeste, vue):
    tete = OrderedDict(
        (champ, valeur) for champ, valeur in vue.items() if champ not in DERIVABLES
    )
    if vue["layout_name"] != manifeste["name"]:
        raise SystemExit(
            f"nom incoherent : coeur {manifeste['name']!r}, vue {vue['layout_name']!r}"
        )
    if vue["version"] != manifeste["version"]:
        raise SystemExit(
            f"version incoherente : coeur {manifeste['version']!r}, vue {vue['version']!r}"
        )

    rangees = [
        OrderedDict(row_id=r["row_id"], row_name=r["row_name"],
                    touches=[k["position"] for k in r["keys"]])
        for r in vue["rows"]
    ]

    materiel = OrderedDict()
    for r in vue["rows"]:
        for k in r["keys"]:
            materiel[k["position"]] = OrderedDict(
                champs=OrderedDict(
                    (champ, valeur) for champ, valeur in k.items()
                    if champ not in DERIVABLES_TOUCHE
                ),
                # Quels champs de niveau la vue ecrit, et dans quel ordre. Ce
                # n'est pas derivable : AZERTY Traditionnel ecrit par exemple
                # "caps_shift": null sur E00 la ou le manifeste n'a pas de
                # niveau 6. Les VALEURS restent prises au coeur.
                niveaux=[champ for champ in k if champ in NIVEAUX],
            )

    touches_mortes = OrderedDict()
    for nom, bloc in vue["dead_keys"].items():
        ident = nom[3:].replace("_", "-") if nom.startswith("dk_") else nom
        entree = OrderedDict(example=bloc["example"])
        if "design_notes" in bloc:
            entree["design_notes"] = bloc["design_notes"]
        touches_mortes[ident] = entree

    metadata = OrderedDict(manifeste.get("metadata") or {})
    metadata["OKLM_siteView"] = OrderedDict(
        _lisezmoi=LISEZMOI,
        tete=tete,
        rangees=rangees,
        materiel=materiel,
        touchesMortes=touches_mortes,
    )
    enrichi = OrderedDict(manifeste)
    enrichi["metadata"] = metadata
    return enrichi


def serialiser(objet):
    return (json.dumps(objet, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def principal(argv):
    if len(argv) != 2:
        print("usage : enrichir_manifeste.py <manifeste.oklm.json> <vue.json>", file=sys.stderr)
        return 2
    chemin_manifeste, chemin_vue = argv

    with open(chemin_manifeste, "rb") as f:
        brut = f.read()
    manifeste = json.loads(brut.decode("utf-8"), object_pairs_hook=OrderedDict)

    # Garde-fou : la serialisation doit etre reproductible avant qu'on y touche,
    # sinon l'enrichissement ferait deriver les octets du manifeste.
    if serialiser(manifeste) != brut:
        print("[enrichir] ECHEC : serialisation du manifeste non reproductible, rien reecrit.", file=sys.stderr)
        return 1

    with open(chemin_vue, encoding="utf-8") as f:
        vue = json.load(f, object_pairs_hook=OrderedDict)

    enrichi = enrichir(manifeste, vue)
    tmp = chemin_manifeste + ".tmp"
    with open(tmp, "wb") as f:
        f.write(serialiser(enrichi))
    os.replace(tmp, chemin_manifeste)
    sections = [c for c in enrichi["metadata"]["OKLM_siteView"] if c != "_lisezmoi"]
    print(f"[enrichir] {chemin_manifeste} : metadata.OKLM_siteView pose ({', '.join(sections)}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal(sys.argv[1:]))
