"""Construit ethone-next/public/downloads/ethone-extension.zip depuis ce dossier : python extension/pack.py"""
import json, pathlib, zipfile

here = pathlib.Path(__file__).parent
out = here.parent / "ethone-next" / "public" / "downloads" / "ethone-extension.zip"
out.parent.mkdir(parents=True, exist_ok=True)
skip = {"pack.py"}
# store/ = dossier de publication Chrome Web Store (textes, captures) : jamais dans l'extension elle-même.
files = [f for f in sorted(here.rglob("*")) if f.is_file() and f.name not in skip and f.relative_to(here).parts[0] != "store"]

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, "ethone-extension/" + f.relative_to(here).as_posix())

# Chrome Web Store : manifest.json à la racine du zip, sans le README.
store = here / "store" / "ethone-webstore.zip"
store.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(store, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        if f.name != "README.md":
            z.write(f, f.relative_to(here).as_posix())

version = json.loads((here / "manifest.json").read_text(encoding="utf-8"))["version"]
# Lu par la page /extension : version et taille réelles du zip publié.
out.with_suffix(".json").write_text(json.dumps({"version": version, "size": out.stat().st_size}), encoding="utf-8")
print(f"{out} ({out.stat().st_size // 1024} Ko, v{version})")
print(f"{store} ({store.stat().st_size // 1024} Ko) : à envoyer sur le Chrome Web Store")
