#!/usr/bin/env python3
"""Controllo riproducibile dei dataset del modulo Metabolismo urbano."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load_geo(path):
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    assert data.get("type") == "FeatureCollection", f"{path}: FeatureCollection non valida"
    features = data.get("features")
    assert isinstance(features, list) and features, f"{path}: nessuna feature"
    for i, feature in enumerate(features):
        geometry = feature.get("geometry")
        assert geometry and geometry.get("type") in {"Polygon", "MultiPolygon"}, f"{path}: geometria {i} non valida"
        coordinates = geometry.get("coordinates")
        polygons = coordinates if geometry["type"] == "MultiPolygon" else [coordinates]
        assert isinstance(polygons, list) and polygons, f"{path}: coordinate vuote alla feature {i}"
        for polygon in polygons:
            assert isinstance(polygon, list) and polygon, f"{path}: poligono vuoto alla feature {i}"
            for ring in polygon:
                assert isinstance(ring, list) and len(ring) >= 4, f"{path}: anello incompleto alla feature {i}"
                for position in ring:
                    assert isinstance(position, list) and len(position) >= 2 and all(isinstance(v, (int, float)) and math.isfinite(v) for v in position[:2]), f"{path}: coordinate non finite alla feature {i}"
                    lon, lat = position[:2]
                    assert -180 <= lon <= 180 and -90 <= lat <= 90, f"{path}: coordinate fuori CRS84 alla feature {i}"
                assert ring[0][:2] == ring[-1][:2], f"{path}: anello non chiuso alla feature {i}"
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
        assert math.isfinite(area) and area > 0, f"{path}: area_sqm non valida alla feature {i}"
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
for path, count, area in [
    ("data/geo/copernicus_verde_accessibile_2021.geojson", cop_count, cop_area),
    ("data/geo/osm_verde_accessibile_2025.geojson", osm_count, osm_area),
]:
    record = next((d for d in metadata["datasets"] if d.get("file") == path), None)
    assert record is not None, f"{path}: metadati dataset mancanti"
    assert record.get("feature_count") == count, f"{path}: conteggio metadati non coerente"
    declared_area = float(record.get("area_sum_sqm", 0) or 0)
    assert math.isclose(declared_area, area, rel_tol=1e-9, abs_tol=0.01), f"{path}: somma area_sqm non coerente con metadati"
module = (ROOT / "metabolism-data.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
assert "metabolism-data.js" in index, "Modulo dati metabolismo non caricato in index.html"
assert "metabolismMap" in module and "pointOnFeature" in module, "Analisi spaziale o aggregazione UPL mancante"
assert "const refreshTerritory=()=>{" in module, "Refresh dati territoriali mancante"
assert "if(panel)render(panel).catch(showError);else attach();" in module, "Refresh del pannello al cambio selezione mancante"
assert "setTimeout(refreshTerritory,150)" in module, "Listener di selezione territoriale non collegato"
print("QA Metabolismo urbano superata.")
print(f"Copernicus: {cop_count} poligoni, {cop_area/1e6:.3f} km² (somma attributi area_sqm)")
print(f"OSM: {osm_count} poligoni, {osm_area/1e6:.3f} km² (somma attributi area_sqm)")
print(f"Geometrie territoriali: circoscrizioni {len(circs)}, quartieri {len(quarts)}, UPL {len(upl)}")
print(f"POP21 UPL: {population:,}")
