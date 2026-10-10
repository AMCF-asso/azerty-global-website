"""Point de coupe C1 : conversion minimale d'une page v1 vers le socle v2.

Ce que la conversion fait, et rien de plus :
  1. layout: base.njk -> v2/base.njk
  2. ajoute /css/v2/compat-v1.css aux extraStyles (cree la cle si absente)
  3. retire le <main> de la page : le layout v2 en pose deja un, deux <main>
     imbriques sont du HTML invalide
  4. retire les scripts du shell v1 (theme, app, gtm, header-zoom-fix,
     easter-eggs, conversion-tracking) : le layout v2 charge les siens.
     Les scripts propres a la page sont conserves tels quels.
  5. retire les blocs JSON-LD FAQPage : inertes hors sites gouvernementaux et de
     sante depuis 2023, meme arbitrage que /comparatif, /faq et la home.

Ce que la conversion ne fait PAS : reecrire le contenu, toucher au `title`,
changer une description, remplacer une classe v1. C'est le principe du point de
coupe — le soin est reserve aux pages de trafic.

Usage : python convertir-c1.py <fichier.njk> [<fichier.njk> ...] [--dry-run]
"""
import io
import re
import sys

SCRIPTS_DU_SHELL = (
    "js/theme.js", "js/app.js", "js/gtm-loader.js", "js/header-zoom-fix.js",
    "js/easter-eggs.js", "js/conversion-tracking.js",
)


def coupe_front_matter(texte):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", texte, re.S)
    if not m:
        raise ValueError("pas de front matter")
    return m.group(1), texte[m.end():]


def retire_faqpage(front):
    """Retire les entrees jsonLd dont le bloc contient "@type": "FAQPage"."""
    lignes = front.split("\n")
    sortie = []
    i = 0
    while i < len(lignes):
        if re.match(r"^  - \|-\s*$", lignes[i]):
            j = i + 1
            bloc = []
            while j < len(lignes) and (lignes[j].startswith("    ") or not lignes[j].strip()):
                bloc.append(lignes[j])
                j += 1
            if any('"FAQPage"' in b for b in bloc):
                i = j
                continue
            sortie.extend(lignes[i:j])
            i = j
            continue
        sortie.append(lignes[i])
        i += 1
    return "\n".join(sortie)


# Feuilles v1 du shell : elles redefinissent .container, .card, .btn a partir des
# variables v1 et se battraient avec le socle v2. Elles partent.
# Les autres feuilles v1 sont des feuilles DE PAGE (le guide typographique, le
# pilote) : elles portent du contenu qu'aucune feuille v2 ne remplace encore, et
# le pont de variables de compat-v1.css les rend lisibles. Elles restent.
FEUILLES_DU_SHELL = ("base.css", "components.css", "utilities.css", "pages.css",
                     "variables.css")


def retire_styles_v1(front):
    lignes = front.split("\n")
    sortie = []
    for ligne in lignes:
        if re.match(r'^  - "(?!/css/v2/)(?:/)?css/[^"]+"\s*$', ligne) and \
                any(f in ligne for f in FEUILLES_DU_SHELL):
            continue
        sortie.append(ligne)
    return "\n".join(sortie)


def ajoute_style(front):
    if "compat-v1.css" in front:
        return front
    if re.search(r"^extraStyles: \[\]\s*$", front, re.M):
        return re.sub(r"^extraStyles: \[\]\s*$",
                      'extraStyles:\n  - "/css/v2/compat-v1.css"', front, flags=re.M)
    if re.search(r"^extraStyles:\s*$", front, re.M):
        return re.sub(r"^extraStyles:\s*$",
                      'extraStyles:\n  - "/css/v2/compat-v1.css"', front, flags=re.M)
    return front.rstrip() + '\nextraStyles:\n  - "/css/v2/compat-v1.css"'


def retire_scripts_du_shell(front, retires=None):
    """Retire les scripts du shell v1, et les scripts en forme objet.

    La forme `- src: "…"` + `attrs:` n'existe que dans le layout v1 : le filtre
    `versionne` du layout v2 recoit un objet et casse le build. Ces scripts sont
    de toute facon des fonctions v1 (testeur en modale, carrousel) qui dependent
    du CSS v1 qu'on vient de retirer. Ils reviennent a la refonte de la page.
    """
    lignes = front.split("\n")
    sortie = []
    i = 0
    while i < len(lignes):
        ligne = lignes[i]
        if re.match(r"^  - src:", ligne):
            if retires is not None:
                retires.append(ligne.strip())
            i += 1
            while i < len(lignes) and re.match(r"^    \w+:", lignes[i]):
                i += 1
            continue
        if re.match(r"^  - ", ligne) and any(s in ligne for s in SCRIPTS_DU_SHELL):
            i += 1
            continue
        sortie.append(ligne)
        i += 1
    front = "\n".join(sortie)
    # une cle scripts: devenue vide n'a plus de raison d'etre
    front = re.sub(r"^scripts:\s*\n(?=\S|\Z)", "", front, flags=re.M)
    return front


def retire_main(corps):
    corps = re.sub(r"<main[^>]*>\s*\n?", "", corps, count=1)
    corps = re.sub(r"\n?\s*</main>\s*", "\n", corps, count=1)
    return corps


def convertit(chemin, dry_run=False, retires=None):
    texte = io.open(chemin, encoding="utf-8").read()
    front, corps = coupe_front_matter(texte)
    avant = texte

    if "layout: v2/base.njk" in front:
        return "deja en v2"
    if "layout: base-en.njk" in front:
        # le layout v2 est commun aux deux langues ; c'est `locale` qui tranche
        front = front.replace("layout: base-en.njk", "layout: v2/base.njk")
        if not re.search(r"^locale:", front, re.M):
            front = re.sub(r"^(layout: v2/base\.njk)$", "\\1\nlocale: \"en\"",
                           front, flags=re.M)
    else:
        front = front.replace("layout: base.njk", "layout: v2/base.njk")
    front = retire_faqpage(front)
    front = retire_scripts_du_shell(front, retires)
    front = retire_styles_v1(front)
    front = ajoute_style(front)
    # une cle extraStyles devenue vide se referme proprement
    front = re.sub(r"^extraStyles:\s*\n(?=\S|\Z)", "extraStyles: []\n", front, flags=re.M)
    corps = retire_main(corps)

    sortie = "---\n" + front.strip("\n") + "\n---\n" + corps
    if sortie == avant:
        return "inchange"
    if not dry_run:
        io.open(chemin, "w", encoding="utf-8", newline="").write(sortie)
    return "converti"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    for chemin in args:
        try:
            retires = []
            etat = convertit(chemin, dry, retires)
            print(f"{etat:10} {chemin}" + (f"   [retire: {', '.join(retires)}]" if retires else ""))
        except Exception as erreur:
            print(f"{'ECHEC':10} {chemin} : {erreur}")


if __name__ == "__main__":
    main()
