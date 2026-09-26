"""Génère docs/revue-curation.md : la couche Maghreb à faire relire par un généticien.

Tout ce qui n'est pas une annotation HPO brute est listé ici, maladie par maladie,
avec une case à cocher pour la relecture.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
kb = json.loads((ROOT / "data" / "kb.json").read_text(encoding="utf-8"))
ONS = {"neo": "néonatal", "inf": "nourrisson", "child": "1–5 ans", "juv": "5–15 ans", "adult": "adulte"}
V = kb["V"]

out = [
    "# Revue de la couche Maghreb",
    "",
    f"Base générée depuis HPO {kb['hpo']} (annotations {kb['hpoa']}). "
    "Ce document liste tout ce que la curation Silsila ajoute aux données HPO : prévalences, "
    "variants fondateurs, examens, prise en charge et fréquences corrigées à la main. "
    "Chaque ligne doit être validée, corrigée ou sourcée par un généticien avant tout usage clinique.",
    "",
    "Régénérer après modification : `python3 scripts/export_curation.py`.",
    "",
]
for d in kb["D"]:
    fq = {t: f for t, f, *_ in d["annots"]}
    cur = [(t, fq[t]) for t in d.get("curated", []) if t in fq]
    out += [
        f"## {d['name']}",
        "",
        f"- Statut : {'liste projet' if d.get('sheet') else 'ajout proposé'} · gènes *{', '.join(d['genes'])}* · sources {', '.join(d['src'])}",
        f"- [ ] Prévalence Maghreb : **{d['prevM']} / 100 000** (mondiale : {d['prevG']} / 100 000)",
        f"- [ ] Âge de début : {', '.join(ONS.get(o, o) for o in d['onset'])}",
        f"- [ ] Contexte : {d['maghreb']}",
    ]
    for g, v, c in d["variants"]:
        out.append(f"- [ ] Variant à tester en premier : *{g}* {v} — {c}")
    out.append("- [ ] Examens, dans l'ordre : " + " → ".join(d["tests"]))
    out.append(f"- [ ] Prise en charge : {d['care']}")
    if cur:
        out.append("- [ ] Fréquences corrigées à la main : " + ", ".join(
            f"{(V[t][0] or V[t][1])} ({t}) = {round(f*100)} %" for t, f in cur))
    if d.get("pmids"):
        out.append("- Références : " + ", ".join(f"[PMID {p}](https://pubmed.ncbi.nlm.nih.gov/{p}/)" for p in d["pmids"]))
    out.append("")
(ROOT / "docs" / "revue-curation.md").write_text("\n".join(out), encoding="utf-8")
print("docs/revue-curation.md :", len(kb["D"]), "maladies")
