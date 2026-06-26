from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import os
import time

import requests
from flask import Flask, render_template, url_for


@dataclass(frozen=True)
class Slide:
    title: str
    description: str
    status: str  # "live", "soon" or "inactive"
    cta: str
    endpoint: Optional[str] = None
    image: Optional[str] = None
    image_alt: Optional[str] = None

    @property
    def is_live(self) -> bool:
        return self.status == "live"


app = Flask(__name__)
app.config.update(
    FREEZER_DESTINATION="docs",
)

SITE_ORIGIN = os.getenv("SITE_ORIGIN", "https://darkesthj.com").rstrip("/")
SOCIAL_IMAGE_PATH = "/static/assets/favicon.png"


@app.context_processor
def inject_meta_defaults():
    return {
        "site_origin": SITE_ORIGIN,
        "social_image": f"{SITE_ORIGIN}{SOCIAL_IMAGE_PATH}",
        "favicon_path": SOCIAL_IMAGE_PATH,
        "site_name": "darkesthj",
    }

SLIDES: tuple[Slide, ...] = (
    Slide(
        title="Music",
        description="Escucha mis lanzamientos, playlists y colaboraciones.",
        status="live",
        cta="Entrar →",
        endpoint="music",
        image="assets/artist-spotify.jpg",
        image_alt="Foto de perfil de darkesthj",
    ),
    Slide(
        title="Monitor",
        description="Dashboards personales de finanzas y salud, sincronizados con Notion.",
        status="live",
        cta="Ver dashboards →",
        endpoint="monitor",
        image="assets/monitor-logo.svg",
        image_alt="Logo Monitor",
    ),
    Slide(
        title="EasyTech",
        description="Landing pages, portafolios y automatizaciones que convierten.",
        status="inactive",
        cta="Temporalmente inactivo",
        image="assets/easytech-logo.png",
        image_alt="Logo EasyTech",
    ),
    Slide(
        title="Budgetly",
        description="Toma el control de tus finanzas personales con una app simple y visual.",
        status="inactive",
        cta="Temporalmente inactivo",
        image_alt="Budgetly",
    ),
)


def _inject_links(slides: tuple[Slide, ...]):
    enriched = []
    for slide in slides:
        href = url_for(slide.endpoint) if slide.endpoint else None
        enriched.append(
            {
                "title": slide.title,
                "description": slide.description,
                "status": slide.status,
                "cta": slide.cta,
                "href": href,
                "image": url_for("static", filename=slide.image) if slide.image else None,
                "image_alt": slide.image_alt,
            }
        )
    return enriched


@app.route("/")
def landing():
    return render_template("index.html", slides=_inject_links(SLIDES))


@app.route("/music/")
def music():
    releases = get_latest_releases()
    return render_template("music.html", releases=releases)


@app.route("/easytech/")
def easytech():
    year = datetime.now().year
    return render_template("easytech.html", current_year=year)


@app.route("/monitor/")
def monitor():
    return render_template("monitor.html")


@app.route("/budgetly/")
def budgetly():
    year = datetime.now().year
    return render_template("budgetly.html", current_year=year)


SPOTIFY_ARTIST_ID = "4O1lEcAIIK039J4iOba1wr"
APPLE_ARTIST_ID = "1835796146"

_SPOTIFY_TOKEN_CACHE: dict[str, float | str | None] = {
    "token": None,
    "expires_at": 0.0,
}

_RELEASE_CACHE: dict[str, float | list[dict[str, object]]] = {
    "timestamp": 0.0,
    "data": [],
}

_CACHE_TTL_SECONDS = 0  # siempre refrescar

_SPANISH_MONTHS = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}


def _format_spanish_date(date_obj: datetime) -> str:
    month = _SPANISH_MONTHS.get(date_obj.month, "")
    return f"{date_obj.day} de {month} de {date_obj.year}" if month else date_obj.strftime("%Y-%m-%d")


def _localise_kind(kind: Optional[str]) -> str:
    if not kind:
        return "Lanzamiento"
    mapping = {
        "album": "Álbum",
        "Album": "Álbum",
        "single": "Single",
        "Single": "Single",
        "ep": "EP",
        "EP": "EP",
    }
    return mapping.get(kind, "Lanzamiento")


def _normalise_release_date(date_str: str | None, precision: str | None = None) -> datetime:
    if not date_str:
        return datetime.now(timezone.utc)
    if precision == "year":
        return datetime.fromisoformat(f"{date_str}-01-01T00:00:00+00:00")
    if precision == "month":
        return datetime.fromisoformat(f"{date_str}-01T00:00:00+00:00")

    try:
        if date_str.endswith("Z"):
            date_str = date_str.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(date_str)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return datetime.now(timezone.utc)


def _get_spotify_token() -> Optional[str]:
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    now = time.time()
    cached = _SPOTIFY_TOKEN_CACHE.get("token")
    expires_at = _SPOTIFY_TOKEN_CACHE.get("expires_at", 0)
    if cached and isinstance(expires_at, (int, float)) and now < expires_at:
        return str(cached)

    token_url = "https://accounts.spotify.com/api/token"
    try:
        response = requests.post(
            token_url,
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException:
        return None

    data = response.json()
    token = data.get("access_token")
    if not token:
        return None

    expires_in = data.get("expires_in", 3600)
    _SPOTIFY_TOKEN_CACHE["token"] = token
    _SPOTIFY_TOKEN_CACHE["expires_at"] = now + max(int(expires_in) - 60, 0)
    return str(token)


def _fetch_spotify_releases(max_items: int = 200) -> list[dict[str, object]]:
    token = _get_spotify_token()
    if not token:
        return []

    api_url = f"https://api.spotify.com/v1/artists/{SPOTIFY_ARTIST_ID}/albums"
    headers = {"Authorization": f"Bearer {token}"}

    releases: list[dict[str, object]] = []
    limit = 50
    offset = 0
    market = os.getenv("SPOTIFY_MARKET", "US")
    seen_ids: set[str] = set()

    while len(releases) < max_items:
        params = {
            "include_groups": "album,single",
            "market": market,
            "limit": min(limit, max_items - len(releases)),
            "offset": offset,
        }
        try:
            response = requests.get(api_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.RequestException:
            break

        payload = response.json()
        items = payload.get("items", [])
        if not items:
            break

        for item in items:
            spotify_url = item.get("external_urls", {}).get("spotify")
            album_id = item.get("id")
            if not spotify_url or not album_id or album_id in seen_ids:
                continue

            release_date = _normalise_release_date(
                item.get("release_date"),
                item.get("release_date_precision"),
            )
            images = item.get("images") or []
            cover = images[0]["url"] if images else None

            releases.append(
                {
                    "id": album_id,
                    "title": item.get("name", ""),
                    "release_date": release_date,
                    "cover": cover,
                    "kind": _localise_kind(item.get("album_type", "single")),
                    "spotify_url": spotify_url,
                }
            )
            seen_ids.add(album_id)
            if len(releases) >= max_items:
                break

        next_url = payload.get("next")
        if not next_url:
            break
        offset += params["limit"]

    releases.sort(key=lambda entry: entry["release_date"], reverse=True) # type: ignore
    return releases


def _normalise_apple_image(url: str | None) -> str | None:
    if not url:
        return None
    # Apple gives 100x100 by default; request a higher size for better quality.
    return url.replace("100x100bb", "600x600bb")


def _fetch_apple_releases(max_items: int = 200) -> list[dict[str, object]]:
    api_url = f"https://itunes.apple.com/lookup?id={APPLE_ARTIST_ID}&entity=album&limit={max_items}"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
    except requests.RequestException:
        return []

    payload = response.json()
    results = payload.get("results", [])
    releases: list[dict[str, object]] = []
    seen_ids: set[int] = set()

    for item in results:
        collection_id = item.get("collectionId")
        if not collection_id or collection_id in seen_ids:
            continue
        seen_ids.add(collection_id)
        title = item.get("collectionName", "")
        release_date_raw = item.get("releaseDate")
        release_date = _normalise_release_date(release_date_raw, precision="day") if release_date_raw else datetime.now(timezone.utc)
        artwork = _normalise_apple_image(item.get("artworkUrl100"))
        releases.append(
            {
                "id": str(collection_id),
                "title": title,
                "release_date": release_date,
                "cover": artwork,
                "kind": _localise_kind(item.get("collectionType", "album")),
                "apple_url": item.get("collectionViewUrl"),
                "platform_label": "Apple Music",
            }
        )
        if len(releases) >= max_items:
            break

    releases.sort(key=lambda entry: entry["release_date"], reverse=True) # type: ignore
    return releases


def get_latest_releases(max_items: int | None = None) -> list[dict[str, object]]:
    now = time.time()
    timestamp = _RELEASE_CACHE.get("timestamp", 0)
    cached_data = _RELEASE_CACHE.get("data", [])

    if _CACHE_TTL_SECONDS and isinstance(timestamp, (int, float)) and now - float(timestamp) < _CACHE_TTL_SECONDS:
        if isinstance(cached_data, list):
            return cached_data

    fetch_limit = max_items or 200
    spotify_releases = _fetch_spotify_releases(max_items=fetch_limit)
    apple_releases: list[dict[str, object]] = []
    if not spotify_releases:
        apple_releases = _fetch_apple_releases(max_items=fetch_limit)
    else:
        # Try to enrich with Apple releases without duplicating titles/dates
        apple_releases = _fetch_apple_releases(max_items=fetch_limit)

    combined: list[dict[str, object]] = []
    seen_keys: set[str] = set()
    for release in spotify_releases + apple_releases:
        title = str(release.get("title", "")).strip().lower()
        date_obj = release.get("release_date")
        date_key = ""
        if isinstance(date_obj, datetime):
            date_key = date_obj.date().isoformat()
        key = f"{title}-{date_key}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        combined.append(release)

    formatted: list[dict[str, object]] = []
    for release in combined:
        date_obj = release.get("release_date")
        if isinstance(date_obj, datetime):
            display_date = _format_spanish_date(date_obj.astimezone(timezone.utc))
            iso_date = date_obj.date().isoformat()
        else:
            display_date = ""
            iso_date = ""

        spotify_url = release.get("spotify_url")
        platform_url = spotify_url or f"https://open.spotify.com/artist/{SPOTIFY_ARTIST_ID}"
        platform_label = "Spotify"

        formatted.append(
            {
                "title": str(release.get("title", "")).strip(),
                "cover": release.get("cover"),
                "kind": release.get("kind", "Lanzamiento"),
                "display_date": display_date,
                "iso_date": iso_date,
                "spotify_url": spotify_url,
                "platform_url": platform_url,
                "platform_label": platform_label,
            }
        )

    if not formatted:
        placeholder = [
            {
                "is_placeholder": True,
                "title": "Próximamente...",
                "message": "Aún no hay lanzamientos disponibles en plataformas.",
            }
        ]
        _RELEASE_CACHE["timestamp"] = now
        _RELEASE_CACHE["data"] = placeholder
        return placeholder

    _RELEASE_CACHE["timestamp"] = now
    _RELEASE_CACHE["data"] = formatted
    if max_items is None:
        return formatted
    return formatted[:max_items]


if __name__ == "__main__":
    # macOS usa el puerto 5000 para AirPlay Receiver, así que servimos en 5050.
    app.run(debug=True, port=5050)
