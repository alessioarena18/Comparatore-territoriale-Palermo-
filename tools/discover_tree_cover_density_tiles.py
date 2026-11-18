#!/usr/bin/env python3
"""Individua i tile Copernicus TCD 10 m 2024 che intersecano Palermo.

Il catalogo STAC è consultabile pubblicamente. Il download degli asset può
richiedere un token CDSE: impostare CDSE_ACCESS_TOKEN nell'ambiente.
Non scarica né inventa dati se il catalogo non restituisce asset utilizzabili.

Dipendenze: pystac-client, requests
Esempio:
  python tools/discover_tree_cover_density_tiles.py
  CDSE_ACCESS_TOKEN="..." python tools/discover_tree_cover_density_tiles.py --download-dir data/green/tcd_2024
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

import requests
from pystac_client import Client

COLLECTION = "clms_vlcc_tree-cover-density_europe_10m_yearly_v1"
STAC_URL = "https://stac.dataspace.copernicus.eu/v1"
PALERMO_BBOX = (13.27, 38.07, 13.42, 38.21)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ricerca i tile TCD 2024 che coprono Palermo")
    parser.add_argument("--bbox", nargs=4, type=float, default=PALERMO_BBOX, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    parser.add_argument("--download-dir", type=Path, default=None, help="Cartella di download degli asset raster, se accessibili")
    parser.add_argument("--output", type=Path, default=Path("data/green/tcd_2024_stac_items.json"))
    args = parser.parse_args()

    catalog = Client.open(STAC_URL)
    search = catalog.search(collections=[COLLECTION], bbox=args.bbox, datetime=
        "2024-01-01T00:00:00Z/2024-12-31T23:59:59Z", max_items=100)
    items = list(search.items())
    if not items:
        raise SystemExit("Nessun item restituito: verificare bbox, anno e disponibilità della collection STAC.")

    token = os.environ.get("CDSE_ACCESS_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    report = []
    for item in items:
        assets = []
        for key, asset in item.assets.items():
            href = asset.href
            entry = {
                "key": key, "href": href, "title": asset.title,
                "media_type": asset.media_type, "roles": asset.roles,
                "file_size": asset.extra_fields.get("file:size"),
            }
            media = (asset.media_type or "").lower()
            if args.download_dir and href and ("tif" in media or "geotiff" in media or key.lower() in {"data", "tcd", "raster"}):
                args.download_dir.mkdir(parents=True, exist_ok=True)
                name = Path(urlparse(href).path).name or f"{item.id}_{key}.tif"
                destination = args.download_dir / name
                response = requests.get(href, headers=headers, stream=True, timeout=180)
                response.raise_for_status()
                with destination.open("wb") as stream:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            stream.write(chunk)
                entry["downloaded_to"] = str(destination)
                entry["download_bytes"] = destination.stat().st_size
            assets.append(entry)
        report.append({
            "id": item.id, "collection": item.collection_id,
            "datetime": item.datetime.isoformat() if item.datetime else None,
            "bbox": item.bbox,
            "properties": {key: item.properties.get(key) for key in ("proj:epsg", "proj:shape", "proj:transform", "gsd") if item.properties.get(key) is not None},
            "assets": assets,
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"collection": COLLECTION, "search_bbox_wgs84": list(args.bbox), "reference_year": 2024, "item_count": len(report), "items": report}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Item STAC trovati: {len(report)}")
    for item in report:
        print(f"- {item['id']} | bbox={item['bbox']}")
        for asset in item['assets']:
            print(f"  asset {asset['key']}: {asset['href']}")
            if asset.get('downloaded_to'):
                print(f"  scaricato: {asset['downloaded_to']} ({asset['download_bytes']} byte)")
    print(f"Report: {args.output}")
    if args.download_dir and not token:
        print("Nota: nessun CDSE_ACCESS_TOKEN impostato; il download potrebbe richiedere autenticazione.")


if __name__ == "__main__":
    main()
