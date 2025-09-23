from __future__ import annotations

from pathlib import Path

from flask_frozen import Freezer

from app import app

freezer = Freezer(app)


if __name__ == "__main__":
    freezer.freeze()

    cname_src = Path("CNAME")
    if cname_src.exists():
        destination = Path(app.config["FREEZER_DESTINATION"]) / "CNAME"
        destination.write_text(cname_src.read_text(encoding="utf-8"), encoding="utf-8")
