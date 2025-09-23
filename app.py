from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional

import os
import time

import requests
from flask import Flask, render_template, url_for


@dataclass(frozen=True)
class Slide:
    title: str
    description: str
    status: str  # "live" or "soon"
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

SLIDES: tuple[Slide, ...] = (
    Slide(
        title="darkesthj",
        description="Escucha mis lanzamientos, playlists y colaboraciones.",
        status="live",
        cta="Entrar →",
        endpoint="music",
        image="assets/artist-spotify.jpg",
        image_alt="Foto de perfil de darkesthj",
    ),
    Slide(
        title="Visuals",
        description="Visualizers, arte y material detrás de cámaras.",
        status="soon",
        cta="En construcción",
    ),
    Slide(
        title="Live Sets",
        description="Sets en vivo, sesiones y remezclas exclusivas.",
        status="soon",
        cta="En construcción",
    ),
)


def _inject_links(slides: Iterable[Slide]):
    enriched = []
    for slide in slides:
        href = url_for(slide.endpoint) if slide.endpoint else None
        enriched.append({
            "title": slide.title,
            "description": slide.description,
            "status": slide.status,
            "cta": slide.cta,
            "href": href,
            "image": url_for("static", filename=slide.image) if slide.image else None,
            "image_alt": slide.image_alt,
        })
    return enriched


@app.route("/")
def landing():
    return render_template("index.html", slides=_inject_links(SLIDES))


@app.route("/music/")
def music():
    releases = get_latest_releases()
    return render_template("music.html", releases=releases)


APPLE_ARTIST_ID = "1835796146"
APPLE_COUNTRY_CODE = os.getenv("APPLE_MUSIC_COUNTRY", "pe")
SPOTIFY_ARTIST_ID = "4O1lEcAIIK039J4iOba1wr"

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


def _apple_music_artwork(url: str | None) -> Optional[str]:
    if not url:
        return None
    return url.replace("100x100bb", "512x512bb")


def _normalise_release_date(date_str: str, precision: str | None = None) -> datetime:
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


def _release_key(title: str, release_date: datetime) -> tuple[str, str]:
    return (title.strip().lower(), release_date.date().isoformat())


def _fetch_apple_music_releases(max_items: int = 200) -> list[dict[str, object]]:
    url = "https://itunes.apple.com/lookup"
    params = {
        "id": APPLE_ARTIST_ID,
        "entity": "album",
        "limit": max_items,
        "country": APPLE_COUNTRY_CODE,
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
    except requests.RequestException:
        return []

    payload = response.json()
    releases: list[dict[str, object]] = []
    for item in payload.get("results", []):
        if item.get("wrapperType") != "collection":
            continue
        release_date_str = item.get("releaseDate")
        release_date = _normalise_release_date(release_date_str)
        releases.append(
            {
                "title": item.get("collectionName", ""),
                "release_date": release_date,
                "cover": _apple_music_artwork(item.get("artworkUrl100")),
                "platform": "apple_music",
                "platform_label": "Apple Music",
                "url": item.get("collectionViewUrl"),
                "kind": item.get("collectionType", "Album"),
            }
        )
    return releases


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
            release_date = _normalise_release_date(
                item.get("release_date"),
                item.get("release_date_precision"),
            )
            images = item.get("images") or []
            cover = images[0]["url"] if images else None
            releases.append(
                {
                    "title": item.get("name", ""),
                    "release_date": release_date,
                    "cover": cover,
                    "platform": "spotify",
                    "platform_label": "Spotify",
                    "url": item.get("external_urls", {}).get("spotify"),
                    "kind": item.get("album_type", "single"),
                    "spotify_url": item.get("external_urls", {}).get("spotify"),
                }
            )
            if len(releases) >= max_items:
                break

        next_url = payload.get("next")
        if not next_url:
            break
        offset += params["limit"]

    return releases


def _merge_releases(*sources: Iterable[dict[str, object]]) -> list[dict[str, object]]:
    merged: dict[tuple[str, str], dict[str, object]] = {}

    for source in sources:
        for item in source:
            title = str(item.get("title", "")).strip()
            release_date = item.get("release_date")
            if not title or not isinstance(release_date, datetime):
                continue
            key = _release_key(title, release_date)
            current = merged.setdefault(
                key,
                {
                    "title": title,
                    "release_date": release_date,
                    "cover": item.get("cover"),
                    "links": {},
                    "kind": _localise_kind(item.get("kind")), # type: ignore
                },
            )

            # Sólo reemplazar portada si aún no hay una y la nueva existe.
            if not current.get("cover") and item.get("cover"):
                current["cover"] = item.get("cover")

            platform = str(item.get("platform"))
            url = item.get("url")
            label = item.get("platform_label")
            if platform and url and label:
                current_links = current.setdefault("links", {})
                current_links[platform] = {"label": label, "url": url} # type: ignore
                if platform == "spotify":
                    current["spotify_url"] = url

    releases = list(merged.values())
    releases.sort(key=lambda entry: entry["release_date"], reverse=True) # type: ignore

    for release in releases:
        date_obj = release.get("release_date")
        if isinstance(date_obj, datetime):
            release["display_date"] = _format_spanish_date(date_obj.astimezone(timezone.utc))
            release["iso_date"] = date_obj.date().isoformat()
        links = release.get("links", {})
        if isinstance(links, dict):
            # Priorizar Spotify y Apple Music.
            order = ["spotify", "apple_music"]
            sorted_links = []
            for key in order:
                if key in links:
                    sorted_links.append({"service": key, **links[key]})
            for service, data in links.items():
                if service not in {"spotify", "apple_music"}:
                    sorted_links.append({"service": service, **data})
            release["links"] = sorted_links
    return releases


def get_latest_releases(max_items: int | None = None) -> list[dict[str, object]]:
    now = time.time()
    timestamp = _RELEASE_CACHE.get("timestamp", 0)
    cached_data = _RELEASE_CACHE.get("data", [])

    if _CACHE_TTL_SECONDS and isinstance(timestamp, (int, float)) and now - float(timestamp) < _CACHE_TTL_SECONDS:
        if isinstance(cached_data, list):
            return cached_data

    fetch_limit = max_items or 200
    apple = _fetch_apple_music_releases(max_items=fetch_limit)
    spotify = _fetch_spotify_releases(max_items=fetch_limit)
    merged = _merge_releases(apple, spotify)

    _RELEASE_CACHE["timestamp"] = now
    _RELEASE_CACHE["data"] = merged
    if max_items is None:
        return merged
    return merged[:max_items]


if __name__ == "__main__":
    app.run(debug=True)
