# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal site for **darkesthj.com**. A Flask app that is rendered once and frozen to plain HTML via Frozen-Flask. The static output in `docs/` is what GitHub Pages serves — the Flask server itself never runs in production.

## Commands

```bash
# Install deps (Python 3.10+ recommended for PEP 604 / dataclass syntax used in app.py)
pip install -r requirements.txt

# Dev server with reload (http://127.0.0.1:5000)
python app.py

# Regenerate the static site into docs/ (this is what gets deployed)
python freeze.py
```

There is no test suite, linter, or build script beyond the two above.

## Deployment flow

1. Edit templates / `app.py`.
2. Run `python freeze.py` — this calls `Freezer(app).freeze()` and writes every route to `docs/` (configured via `FREEZER_DESTINATION` in `app.py`). If a `CNAME` file exists at the repo root, `freeze.py` copies it into `docs/CNAME`.
3. Commit `docs/` along with the source. GitHub Pages is configured to serve from `docs/` on the `main` branch, mapped to `darkesthj.com`.

Forgetting step 2 means the live site will not reflect template/code changes.

## Architecture notes

- **Routes** (`app.py`): `/` (landing with `SLIDES` tuple of dataclass cards), `/music/`, `/easytech/`. Trailing slashes matter for Frozen-Flask's output paths.
- **Music page data**: `get_latest_releases()` is the single entry point. It calls Spotify first (`_fetch_spotify_releases`), then Apple (`_fetch_apple_releases`), then dedupes by `(title-lowercased, release-date)`. Output is always Spanish-formatted dates (`_format_spanish_date`) and Spanish release kinds (`_localise_kind`). All `platform_url` / `platform_label` fields point to Spotify regardless of source — Apple data is currently only used to fill gaps, not surface as a separate link.
- **Spotify auth**: client-credentials flow in `_get_spotify_token()`, cached in `_SPOTIFY_TOKEN_CACHE` until ~60s before expiry. Returns `None` (and the whole music section degrades to a "Próximamente..." placeholder) if either env var is missing or the request fails — handle this when changing the music template.
- **Release cache**: `_CACHE_TTL_SECONDS = 0` means the cache is effectively disabled and every page load refetches. This is intentional for the frozen build (so each `freeze.py` run pulls fresh data) but be aware if you ever run the live server.
- **Meta defaults**: `inject_meta_defaults` (context processor) exposes `site_origin`, `social_image`, `favicon_path`, `site_name` to every template. Driven by `SITE_ORIGIN` env var, defaulting to `https://darkesthj.com`.

## Environment variables

| Var | Purpose | Required? |
|---|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify Web API client-credentials | Required for real release data; without them the music page shows a placeholder |
| `SPOTIFY_MARKET` | Market code for `/albums` endpoint | Optional, defaults to `US` |
| `SITE_ORIGIN` | Absolute origin used in canonical / OG meta tags | Optional, defaults to `https://darkesthj.com` |

Set these before running `python freeze.py` if you want the generated `docs/music/index.html` to contain the live catalog.

## Conventions

- User-facing copy is **Spanish**. Keep it that way (titles, CTAs, dates, error placeholders).
- Hardcoded artist IDs live at the top of `app.py` (`SPOTIFY_ARTIST_ID`, `APPLE_ARTIST_ID`). Update both when porting the site to another artist.
- `static/assets/favicon.png` doubles as the OG/social image — keep it square.
