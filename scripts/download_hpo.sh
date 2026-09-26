#!/usr/bin/env bash
# Télécharge les fichiers HPO utilisés pour construire data/kb.json.
# Par défaut : la version figée v2026-09-01, celle de la base livrée.
# Pour la dernière version : HPO_VERSION=latest ./scripts/download_hpo.sh
set -euo pipefail
cd "$(dirname "$0")/.."
V="${HPO_VERSION:-v2026-09-01}"
mkdir -p data/hpo
if [ "$V" = "latest" ]; then
  REL="https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download"
  RAW="https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/master"
else
  REL="https://github.com/obophenotype/human-phenotype-ontology/releases/download/$V"
  RAW="https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/$V"
fi
for f in hp.obo phenotype.hpoa genes_to_disease.txt; do
  echo "→ $f"; curl -fsSL -o "data/hpo/$f" "$REL/$f"
done
echo "→ hp-fr.babelon.tsv (libellés français officiels)"
curl -fsSL -o data/hpo/hp-fr.babelon.tsv "$RAW/src/translations/hp-fr.babelon.tsv"
ls -lh data/hpo
