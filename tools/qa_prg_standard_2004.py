#!/usr/bin/env python3
"""Audit riproducibile del GeoJSON PRG 2004 già integrato nel comparatore.

Controlli strutturali e di plausibilità geografica; non sostituisce QGIS,
la verifica topologica o il controllo della vigenza urbanistica.
"""
from __future__ import annotations
import collections, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/geo/prg_standard_2004.geojson"
OUT = ROOT / "data/geo/qa_prg_standard_2004.json"
EXPECTED = {
    "S": {"features": 282, "area_m2": 2096892.34},
    "IC": {"features": 229, "area_m2": 1627694.68},
    "V": {"features": 392, "area_m2": 3505708.90},
    "P": {"features": 434, "area_m2": 1497104.24},
    "F": {"features": 291, "area_m2": 15313777.14},
}
# Inviluppo volutamente ampio, usato soltanto per intercettare errori di CRS.
PALERMO = (12.9, 37.7, 13.8, 38.5)

def walk(value, coords):
    if isinstance(value, list):
        if len(value) >= 2 and isinstance(value[0], (int, float)) and isinstance(value[1], (int, float)):
            coords.append((float(value[0]), float(value[1])))
        else:
            for child in value:
                walk(child, coords)

def main():
    fc = json.loads(SOURCE.read_text(encoding="utf-8"))
    assert fc.get("type") == "FeatureCollection", "type GeoJSON non valido"
    assert fc.get("feature_count") == len(fc.get("features", [])), "feature_count non coincide"
    assert len(fc["features"]) == 1628, f"attese 1628 feature, trovate {len(fc['features'])}"
    assert "Comune di Palermo" in fc.get("source", ""), "fonte comunale non dichiarata"
    assert "gbvitrano/prg_pa_2004" in fc.get("source", ""), "rielaborazione non attribuita"
    assert fc.get("license") == "CC BY 4.0 IT", "licenza non dichiarata"
    assert fc.get("crs", {}).get("properties", {}).get("name", "").endswith("CRS84"), "CRS atteso CRS84"
    counts = collections.Counter()
    areas = collections.defaultdict(float)
    geom_types = collections.Counter()
    coords = []
    missing = []
    invalid_rings = 0
    for i, feature in enumerate(fc["features"]):
        props = feature.get("properties") or {}
        group = props.get("PRG_GROUP")
        if group not in EXPECTED:
            raise ValueError(f"feature {i}: gruppo PRG non previsto {group!r}")
        if not props.get("PRG_ID") or not props.get("PRG_CODE"):
            missing.append(i)
        area = float(props.get("AREA_M2") or 0)
        if area <= 0:
            raise ValueError(f"feature {i}: AREA_M2 assente o non positiva")
        counts[group] += 1
        areas[group] += area
        geom = feature.get("geometry") or {}
        typ = geom.get("type")
        geom_types[typ] += 1
        if typ != "Polygon":
            raise ValueError(f"feature {i}: geometria {typ!r}, atteso Polygon")
        for ring in geom.get("coordinates", []):
            if len(ring) < 4 or ring[0] != ring[-1]:
                invalid_rings += 1
        walk(geom.get("coordinates", []), coords)
    if missing:
        raise ValueError(f"attributi PRG_ID/PRG_CODE mancanti in {len(missing)} feature")
    if invalid_rings:
        raise ValueError(f"anelli non chiusi o troppo corti: {invalid_rings}")
    if not coords:
        raise ValueError("nessuna coordinata")
    if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in coords):
        raise ValueError("coordinate fuori dai limiti WGS84")
    bbox = [min(x for x, _ in coords), min(y for _, y in coords), max(x for x, _ in coords), max(y for _, y in coords)]
    west, south, east, north = PALERMO
    if bbox[2] < west or bbox[0] > east or bbox[3] < south or bbox[1] > north:
        raise ValueError(f"bbox non intercetta Palermo: {bbox}")
    groups = {}
    for group, expected in EXPECTED.items():
        area = round(areas[group], 2)
        if counts[group] != expected["features"]:
            raise ValueError(f"{group}: conteggio {counts[group]} != {expected['features']}")
        if abs(area - expected["area_m2"]) > 0.05:
            raise ValueError(f"{group}: area {area} != {expected['area_m2']}")
        groups[group] = {"features": counts[group], "area_m2": area, "area_ha": round(area / 10000, 2)}
    report = {
        "status": "passed",
        "file": "data/geo/prg_standard_2004.geojson",
        "source": fc["source"],
        "license": fc["license"],
        "crs": fc["crs"],
        "feature_count": len(fc["features"]),
        "geometry_types": dict(geom_types),
        "bbox_wgs84": [round(x, 8) for x in bbox],
        "coordinate_count": len(coords),
        "groups": groups,
        "limitations": [
            "Controllo strutturale e geografico preliminare, non validazione topologica completa.",
            "Le superfici geometriche non attestano attuazione, proprietà pubblica o disponibilità effettiva.",
            "Il dataset 321 dei vincoli non è incluso nel GeoJSON analizzato.",
            "La base è riferita alla Variante Generale PRG presa d'atto con DCC 7/2004; verificare atti e varianti successive."
        ]
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"QA PRG FALLITA: {exc}", file=sys.stderr)
        raise SystemExit(1)
