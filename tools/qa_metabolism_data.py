#!/usr/bin/env python3
"""Controllo riproducibile dei dataset del modulo Metabolismo urbano."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load_geo(path):
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    assert data.get("type") == "FeatureCollection", f"{path}: FeatureCollection non valida"
    features = data.get("features")
    assert isinstance(features, list) and features, f"{path}: nessuna feature"
    for i, feature in enumerate(features):
        assert feature.get("geometry") and feature["geometry"].get("type") in {"Polygon", "MultiPolygon"}, f"{path}: geometria {i} non valida"
        props = feature.get("properties") or {}
        assert isinstance(props, dict), f"{path}: properties non valide"
    return data

def check_green(path, expected_count):
    data = load_geo(path)
    features = data["features"]
    assert len(features) == expected_count, f"{path}: attese {expected_count} feature, trovate {len(features)}"
    areas = []
    for i, f in enumerate(features):
        area = float((f.get("properties") or {}).get("area_sqm", 0) or 0)
        assert area > 0, f"{path}: area_sqm non positiva alla feature {i}"
        areas.append(area)
    return len(features), sum(areas)

def check_territory(path, code_field, expected_count):
    data = load_geo(path)
    features = data["features"]
    assert len(features) == expected_count, f"{path}: attese {expected_count} feature, trovate {len(features)}"
    codes = [str((f.get("properties") or {}).get(code_field, "")) for f in features]
    assert all(codes), f"{path}: codice territoriale vuoto"
    assert len(set(codes)) == len(codes), f"{path}: codici duplicati"
    return features

cop_count, cop_area = check_green("data/geo/copernicus_verde_accessibile_2021.geojson", 129)
osm_count, osm_area = check_green("data/geo/osm_verde_accessibile_2025.geojson", 118)
circs = check_territory("data/geo/circoscrizioni_palermo_2021.geojson", "COM_ASC1", 8)
quarts = check_territory("data/geo/aree_subcomunali_liv2_palermo_2021.geojson", "COM_ASC2", 25)
upl = check_territory("data/geo/aree_subcomunali_liv3_palermo_2021.geojson", "COM_ASC3", 55)
population = sum(int((f.get("properties") or {}).get("POP21", 0) or 0) for f in upl)
assert population == 635439, f"POP21 UPL inattesa: {population}"

metadata = json.loads((ROOT / "data/metabolism/metadata.json").read_text(encoding="utf-8"))
assert metadata.get("territorial_levels", {}).get("upl") == 55
assert len(metadata.get("datasets", [])) == 2
module = (ROOT / "metabolism-data.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
assert "metabolism-data.js" in index, "Modulo dati metabolismo non caricato in index.html"
assert "metabolismMap" in module and "pointOnFeature" in module, "Analisi spaziale o aggregazione UPL mancante"
print("QA Metabolismo urbano superata.")
print(f"Copernicus: {cop_count} poligoni, {cop_area/1e6:.3f} km² (somma attributi area_sqm)")
print(f"OSM: {osm_count} poligoni, {osm_area/1e6:.3f} km² (somma attributi area_sqm)")
print(f"Geometrie territoriali: circoscrizioni {len(circs)}, quartieri {len(quarts)}, UPL {len(upl)}")
print(f"POP21 UPL: {population:,}")
