"""Assemble l'application en un seul fichier HTML autonome : docs/index.html.

Entrées : src/template.html, src/*.js, data/kb.json, data/cases.json
Sortie  : docs/index.html (servi tel quel par GitHub Pages, ou ouvert en local)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, DATA, OUT = ROOT / "src", ROOT / "data", ROOT / "docs" / "index.html"
D3 = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"


def read(p):
    return Path(p).read_text(encoding="utf-8")


def js(name):
    s = read(SRC / name)
    return re.sub(r"\nif\(typeof module!=='undefined'\) module\.exports=\{[^}]*\};?\n?", "\n", s)


body = (
    "const KB=" + read(DATA / "kb.json").strip() + ";\n"
    + js("lexicon.js") + "\n" + js("engine.js") + "\n" + js("nlp.js") + "\n"
    + "const CASES=" + read(DATA / "cases.json").strip() + ";\n"
    + js("app.js")
).replace("</script", "<\\/script")

html = (read(SRC / "template.html") + f'\n<script src="{D3}"></script>\n<script>\n'
        + body + "\n</script>\n</body>\n</html>\n")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"{OUT.relative_to(ROOT)} : {len(html):,} octets".replace(",", " "))
