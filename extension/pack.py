"""Construit ethone-next/public/downloads/ethone-extension.zip depuis ce dossier : python extension/pack.py"""
import json, pathlib, zipfile

here = pathlib.Path(__file__).parent
out = here.parent / "ethone-next" / "public" / "downloads" / "ethone-extension.zip"
out.parent.mkdir(parents=True, exist_ok=True)
skip = {"pack.py"}

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(here.rglob("*")):
        if f.is_file() and f.name not in skip:
            z.write(f, "ethone-extension/" + f.relative_to(here).as_posix())

version = json.loads((here / "manifest.json").read_text(encoding="utf-8"))["version"]
# Lu par la page /extension : version et taille réelles du zip publié.
out.with_suffix(".json").write_text(json.dumps({"version": version, "size": out.stat().st_size}), encoding="utf-8")
print(f"{out} ({out.stat().st_size // 1024} Ko, v{version})")
