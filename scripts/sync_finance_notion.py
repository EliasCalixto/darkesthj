"""Descarga todas las databases hijas de la pagina Finance en Notion y escribe
monitor_src/finance/data.json.

Variables de entorno requeridas:
  NOTION_TOKEN               - integration token (secret_xxx)
  NOTION_PAGE_ID_FINANZAS    - id de la pagina raiz "Finance" (ex "Monitor")
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

NOTION_VERSION = "2022-06-28"
API_BASE = "https://api.notion.com/v1"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "monitor_src" / "finance" / "data.json"


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, method=method, headers=_headers(token))
    for attempt in range(5):
        try:
            with request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            if exc.code == 429 and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            payload = exc.read().decode("utf-8", errors="replace")
            raise SystemExit(f"Notion API {exc.code} on {url}: {payload}") from exc
        except error.URLError as exc:
            if attempt < 4:
                time.sleep(2 ** attempt)
                continue
            raise SystemExit(f"Network error: {exc}") from exc
    raise SystemExit("Exhausted retries")


def list_child_databases(page_id: str, token: str) -> list[dict]:
    """Recorre los bloques de una pagina y devuelve las child_database encontradas (recursivo)."""
    databases: list[dict] = []
    seen: set[str] = set()

    def walk(block_id: str) -> None:
        cursor: str | None = None
        while True:
            url = f"{API_BASE}/blocks/{block_id}/children?page_size=100"
            if cursor:
                url += f"&start_cursor={cursor}"
            payload = _request("GET", url, token)
            for block in payload.get("results", []):
                btype = block.get("type")
                bid = block.get("id")
                if btype == "child_database" and bid not in seen:
                    seen.add(bid)
                    title = block.get("child_database", {}).get("title", "Untitled")
                    databases.append({"id": bid, "title": title})
                if block.get("has_children") and btype not in {"child_database", "unsupported"}:
                    walk(bid)
            if not payload.get("has_more"):
                break
            cursor = payload.get("next_cursor")

    walk(page_id)
    return databases


def query_database(database_id: str, token: str) -> list[dict]:
    rows: list[dict] = []
    cursor: str | None = None
    while True:
        body: dict[str, Any] = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        payload = _request("POST", f"{API_BASE}/databases/{database_id}/query", token, body)
        rows.extend(payload.get("results", []))
        if not payload.get("has_more"):
            break
        cursor = payload.get("next_cursor")
    return rows


def get_database_meta(database_id: str, token: str) -> dict:
    return _request("GET", f"{API_BASE}/databases/{database_id}", token)


def _plain_text(rich: list[dict]) -> str:
    return "".join(part.get("plain_text", "") for part in rich or [])


def normalize_property(prop: dict) -> Any:
    """Convierte una property de Notion a un valor JSON-friendly."""
    ptype = prop.get("type")
    if ptype is None:
        return None
    value = prop.get(ptype)

    if ptype in {"title", "rich_text"}:
        return _plain_text(value or [])
    if ptype == "number":
        return value
    if ptype == "select":
        return value.get("name") if value else None
    if ptype == "multi_select":
        return [item.get("name") for item in value or []]
    if ptype == "status":
        return value.get("name") if value else None
    if ptype == "date":
        if not value:
            return None
        return {"start": value.get("start"), "end": value.get("end")}
    if ptype == "checkbox":
        return bool(value)
    if ptype == "url":
        return value
    if ptype == "email":
        return value
    if ptype == "phone_number":
        return value
    if ptype == "people":
        return [p.get("name") or p.get("id") for p in value or []]
    if ptype == "files":
        out = []
        for f in value or []:
            name = f.get("name")
            link = (f.get("file") or {}).get("url") or (f.get("external") or {}).get("url")
            out.append({"name": name, "url": link})
        return out
    if ptype == "formula":
        ftype = value.get("type") if value else None
        return value.get(ftype) if ftype else None
    if ptype == "rollup":
        rtype = value.get("type") if value else None
        if rtype == "array":
            return [normalize_property({"type": item.get("type"), item.get("type"): item.get(item.get("type"))}) for item in value.get("array", [])]
        return value.get(rtype) if rtype else None
    if ptype == "relation":
        return [r.get("id") for r in value or []]
    if ptype == "created_time":
        return value
    if ptype == "created_by":
        return (value or {}).get("name") or (value or {}).get("id")
    if ptype == "last_edited_time":
        return value
    if ptype == "last_edited_by":
        return (value or {}).get("name") or (value or {}).get("id")
    if ptype == "unique_id":
        prefix = (value or {}).get("prefix") or ""
        number = (value or {}).get("number")
        return f"{prefix}-{number}" if prefix else number
    return value


def serialize_row(page: dict) -> dict:
    props = page.get("properties", {})
    row: dict[str, Any] = {
        "_id": page.get("id"),
        "_url": page.get("url"),
        "_created": page.get("created_time"),
        "_edited": page.get("last_edited_time"),
    }
    for name, prop in props.items():
        row[name] = normalize_property(prop)
    return row


def serialize_schema(db_meta: dict) -> dict:
    """Devuelve {nombre: tipo} para que el frontend sepa como renderizar cada columna."""
    schema: dict[str, str] = {}
    for name, prop in (db_meta.get("properties") or {}).items():
        schema[name] = prop.get("type", "unknown")
    return schema


def main() -> int:
    token = os.environ.get("NOTION_TOKEN")
    page_id = os.environ.get("NOTION_PAGE_ID_FINANZAS")
    if not token or not page_id:
        print("ERROR: faltan NOTION_TOKEN o NOTION_PAGE_ID_FINANZAS en el entorno", file=sys.stderr)
        return 1

    print(f"Buscando databases hijas en pagina {page_id}...")
    databases = list_child_databases(page_id, token)
    print(f"Encontradas {len(databases)} database(s)")

    out_databases = []
    for db in databases:
        print(f"  -> {db['title']} ({db['id']})")
        meta = get_database_meta(db["id"], token)
        rows = query_database(db["id"], token)
        title_text = _plain_text(meta.get("title", [])) or db["title"]
        out_databases.append({
            "id": db["id"],
            "title": title_text,
            "schema": serialize_schema(meta),
            "rows": [serialize_row(r) for r in rows],
        })

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "page_id": page_id,
        "databases": out_databases,
    }

    passphrase = os.environ.get("DATA_PASSPHRASE")
    if passphrase:
        try:
            output = encrypt_payload(payload, passphrase)
            print("data.json will be written ENCRYPTED (AES-256-GCM / PBKDF2-SHA256).")
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR encrypting payload: {exc}", file=sys.stderr)
            return 1
    else:
        output = payload
        print(
            "WARNING: DATA_PASSPHRASE secret is not set — data.json will be written "
            "in PLAINTEXT and is publicly readable on GitHub Pages.",
            file=sys.stderr,
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} ({sum(len(d['rows']) for d in out_databases)} rows total)")
    return 0


def encrypt_payload(plaintext_dict: dict, passphrase: str, iterations: int = 600_000) -> dict:
    """Wrap the plaintext JSON in an AES-256-GCM envelope keyed off PBKDF2(passphrase).

    Returns a JSON-serializable dict that the browser dashboard can decrypt via
    WebCrypto using the same passphrase. The salt and IV are random per write,
    so two snapshots with identical data still produce different ciphertexts.
    """
    import base64
    import hashlib
    from Crypto.Cipher import AES  # type: ignore[import-untyped]
    from Crypto.Random import get_random_bytes  # type: ignore[import-untyped]

    plaintext = json.dumps(plaintext_dict, ensure_ascii=False).encode("utf-8")
    salt = get_random_bytes(16)
    iv = get_random_bytes(12)
    key = hashlib.pbkdf2_hmac(
        "sha256", passphrase.encode("utf-8"), salt, iterations, dklen=32
    )
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return {
        "v": 1,
        "kdf": "pbkdf2-sha256",
        "iters": iterations,
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
        "ct": base64.b64encode(ciphertext + tag).decode("ascii"),
    }


if __name__ == "__main__":
    raise SystemExit(main())
