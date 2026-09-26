# Silsila : commandes usuelles (Python ≥ 3.9 et Node ≥ 18, sans dépendance externe)
.PHONY: all build test data kb curation serve clean

all: test build

build:            ## Assemble docs/index.html à partir de src/ et data/
	python3 scripts/assemble.py

test:             ## Cas de référence + extraction française/darija
	node tests/test_engine.js
	node tests/test_nlp.js

data:             ## Télécharge HPO (version figée par défaut)
	./scripts/download_hpo.sh

kb: data          ## Reconstruit data/kb.json depuis HPO + curation Maghreb
	python3 scripts/build_kb.py
	python3 scripts/curate.py
	python3 scripts/fr_patch.py
	python3 scripts/export_curation.py

curation:         ## Régénère docs/revue-curation.md (à faire relire par un généticien)
	python3 scripts/export_curation.py

serve: build      ## Sert l'application sur http://localhost:8000
	cd docs && python3 -m http.server 8000

clean:
	rm -rf build data/hpo
