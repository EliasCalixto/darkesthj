from __future__ import annotations

import shutil
from pathlib import Path

from flask_frozen import Freezer

from app import app

freezer = Freezer(app)


def _copy_static_subsite(src: Path, dest: Path) -> None:
    if not src.exists():
        print(f"WARNING: {src} no existe, se omite (¿corriste el sync/build correspondiente?)")
        return
    shutil.copytree(src, dest, dirs_exist_ok=True)


if __name__ == "__main__":
    freezer.freeze()

    cname_src = Path("CNAME")
    if cname_src.exists():
        destination = Path(app.config["FREEZER_DESTINATION"]) / "CNAME"
        destination.write_text(cname_src.read_text(encoding="utf-8"), encoding="utf-8")

    destination_root = Path(app.config["FREEZER_DESTINATION"]) / "monitor"
    _copy_static_subsite(Path("monitor_src/finanzas"), destination_root / "finanzas")

    # docs/monitor/health/ se genera aparte (build de Next.js) y se copia
    # DESPUES de correr este script, ya que Frozen-Flask borra archivos
    # "extra" del destino en cada freeze().
