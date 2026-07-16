#!/usr/bin/env bash
set -euo pipefail

file="${1:-docs/data/listing.csv}"
column="${2:-5}"

if [[ ! -f "$file" ]]; then
  echo "Fichier introuvable : $file" >&2
  exit 1
fi

echo "Lignes avec plusieurs numéros de série dans la colonne $column :"
awk -F, -v col="$column" '
NR == 1 {
  next
}
{
  if (col > NF) {
    next
  }
  value = $col
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
  count = split(value, parts, "/")
  if (count > 1) {
    print NR ":" value
  }
}
' "$file"
