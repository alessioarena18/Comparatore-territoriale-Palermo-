#!/usr/bin/env python3
"""Audit strutturale e di coerenza minima degli archivi pubblicati."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors, warnings = [], []

def load(rel):
    path = ROOT / rel
    if not path.is_file():
        errors.append(f"File mancante: {rel}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"JSON non valido {rel}: {exc}")
        return None

def check(ok, message):
    if not ok:
        errors.append(message)

points = load("data/scuole_points.json")
census = load("data/censimento_scolastico_v81.json")
classes = load("data/scuole_classificazione.json")
geo_files = {
    "ASC1": ("data/geo/circoscrizioni_palermo_2021.geojson", 8),
    "ASC2": ("data/geo/aree_subcomunali_liv2_palermo_2021.geojson", 25),
    "ASC3": ("data/geo/aree_subcomunali_liv3_palermo_2021.geojson", 55),
    "sezioni censuarie": ("data/geo/sezioni_palermo_2021.geojson", 3600),
}
if isinstance(points, list):
    ids = [str(x.get("id", "")) for x in points]
    check(len(points) == 292, f"Punti scolastici: attesi 292, trovati {len(points)}")
    check(len(ids) == len(set(ids)), "ID duplicati nel catalogo scolastico")
    check(all(isinstance(x.get("lat"), (int, float)) and isinstance(x.get("lon"), (int, float)) for x in points), "Coordinate mancanti/non numeriche nel catalogo scolastico")
    outside = [x for x in points if x.get("spatial_validation", {}).get("status") == "OUTSIDE_PALERMO_BOUNDARIES"]
    check(len(outside) == 1 and outside[0].get("id") == "kml-school-264", "Il punto storico esterno al confine comunale non coincide con la riserva documentata attesa")
    if outside:
        warnings.append("Punto esterno mantenuto nell'archivio, ma da escludere dai conteggi comunali: " + str(outside[0].get("id")))

if isinstance(census, dict):
    records = census.get("records", [])
    ids = [str(x.get("id", "")) for x in records]
    check(len(records) == 305, f"Censimento V81: attese 305 schede, trovate {len(records)}")
    check(len(ids) == len(set(ids)), "ID duplicati nel censimento V81")
    check(census.get("meta", {}).get("records_total") == len(records), "records_total V81 non coincide con le schede")
    check(census.get("meta", {}).get("coordinate_count") == 294, "Coordinate V81: atteso conteggio 294")

if isinstance(classes, dict):
    records = classes.get("records", [])
    ids = [str(x.get("point_id", "")) for x in records]
    check(len(records) == 229, f"Classificazioni scolastiche: attese 229, trovate {len(records)}")
    check(len(ids) == len(set(ids)), "point_id duplicati nella classificazione scolastica")

for label, (rel, expected) in geo_files.items():
    data = load(rel)
    if isinstance(data, dict):
        check(len(data.get("features", [])) == expected, f"{label}: attese {expected} geometrie, trovate {len(data.get('features', []))}")

prg = load("data/geo/prg/qa_prg.json")
if isinstance(prg, dict):
    check(prg.get("status") == "passed", "QA strutturale PRG non superata")
std = load("data/geo/qa_prg_standard_2004.json")
if isinstance(std, dict):
    check(std.get("structural_status") == "passed", "QA strutturale standard PRG non superata")
    if std.get("topology_status") != "passed":
        warnings.append("Topologia standard PRG da revisionare: " + str(std.get("duplicate_geometry_count")) + " duplicati e " + str(std.get("overlap_pair_count_over_1m2")) + " coppie sovrapposte oltre 1 m².")

social = load("data/sociale_palermo_idise_2023.json")
if isinstance(social, dict):
    meta = social.get("meta", {})
    upl, city = meta.get("popolazione_upl_somma"), meta.get("popolazione_comune_istat")
    if isinstance(upl, (int, float)) and isinstance(city, (int, float)) and upl != city:
        warnings.append(f"IDISE UPL: somma {upl} diversa dal totale comunale {city}; differenza {city-upl} da documentare.")

for item in warnings:
    print("AVVISO:", item)
for item in errors:
    print("ERRORE:", item)
if errors:
    raise SystemExit(1)
print("Audit dataset superato: conteggi e integrità strutturale coerenti.")
