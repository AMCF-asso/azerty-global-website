#!/bin/sh
# Alerte quand une poussée change un des trois JSON que l'app AZERTY Global
# recopie (action alerte-json-partages-site-app, 2026-10-13).
#
# Le dépôt de l'app (AZERTYGlobal/azerty-global-app) embarque des copies de
# data/AZERTY Global.json, tester/character-index.json et tester/lessons.json ;
# son scripts/check-layout-provenance.py les compare à ce dépôt (branche main).
# Une modification ici casse la CI de l'app au push suivant, sans signal :
# mesuré le 2026-09-07, six runs ci/verif en échec, 24 h après le commit du site.
#
# Usage : sh scripts/alerte-json-app.sh <ancien>:<nouveau> [...]
#   un couple par référence poussée (format des lignes de pre-push) ; un
#   <ancien> fait de zéros (branche nouvelle) se compare à origin/main.
# Ne bloque jamais : code de sortie 0, message sur stderr si un fichier change.
set -u

FICHIERS="data/AZERTY Global.json
tester/character-index.json
tester/lessons.json"

touches=""
for range in "$@"; do
  old=${range%%:*}
  new=${range#*:}
  case "$old" in
    *[!0]*) base=$old ;;
    *) base=$(git rev-parse --verify --quiet origin/main) || continue ;;
  esac
  # Un <ancien> absent localement (poussée forcée par-dessus un commit inconnu)
  # ne doit pas faire échouer la poussée.
  git cat-file -e "$base^{commit}" 2>/dev/null || continue
  changed=$(git diff --name-only "$base" "$new" -- "data/AZERTY Global.json" tester/character-index.json tester/lessons.json 2>/dev/null) || continue
  [ -n "$changed" ] && touches="$touches
$changed"
done

touches=$(printf '%s\n' "$touches" | sed '/^$/d' | sort -u)
[ -z "$touches" ] && exit 0

{
  echo ""
  echo "pre-push: ⚠️  JSON partagé avec l'app modifié :"
  printf '%s\n' "$touches" | sed 's/^/  - /'
  echo "  L'app en garde une copie vérifiée par scripts/check-layout-provenance.py :"
  echo "  sa CI échouera au prochain push tant que la copie n'est pas mise à jour."
  echo "  Correspondance (site -> app) :"
  printf '%s\n' "$FICHIERS" | sed -e 's/^/    /' -e 's/data\/AZERTY Global.json$/data\/AZERTY Global.json -> src\/AZERTY Global 2026.json/' -e 's/tester\/\(.*\)$/tester\/\1 -> src\/\1/'
  echo ""
} >&2
exit 0
