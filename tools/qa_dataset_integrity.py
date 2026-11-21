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

# Controllo del verde comunale storico: conteggi e schema del dataset 2013.
historic_green = load("data/geo/verde_comunale_2013.geojson")
if isinstance(historic_green, dict):
    features = historic_green.get("features", [])
    green_types = {}
    for feature in features:
        kind = feature.get("properties", {}).get("TIPO")
        green_types[kind] = green_types.get(kind, 0) + 1
    check(len(features) == 2089, f"Verde comunale 2013: attese 2089 geometrie, trovate {len(features)}")
    check(green_types == {"aiuola": 2086, "alberi": 3}, f"Classi TIPO del verde comunale 2013 inattese: {green_types}")
    check(all(set(feature.get("properties", {}).keys()) == {"ID", "TIPO"} for feature in features),
          "Schema attributi del verde comunale 2013 cambiato: verificare interpretazione e classificazione")

# Audit mirato del modulo verde urbano: evita registri incompleti e report non validati.
green_sites = load("data/green/current-public-sites.json")
if isinstance(green_sites, dict):
    facilities = green_sites.get("facilities", [])
    ids = [str(x.get("id", "")) for x in facilities]
    check(len(facilities) == 9, f"Registro verde documentato: attesi 9 siti, trovati {len(facilities)}")
    check(len(ids) == len(set(ids)) and all(ids), "ID mancanti o duplicati nel registro verde")
    check(all(x.get("hours", {}).get("current_as_of") and
              x.get("hours", {}).get("current_open") and
              x.get("hours", {}).get("current_close") and
              x.get("hours", {}).get("current_source_id") for x in facilities),
          "Orari correnti o fonte di aggiornamento mancanti in uno o più siti del registro verde")

# Controlli quantitativi del confronto verde storico/PRG.
green_comparison = load("data/verde_confronto_278_prg.json")
if isinstance(green_comparison, dict):
    check(green_comparison.get("status") == "completed" and isinstance(green_comparison.get("global"), dict),
          "Report confronto geometrico verde 278/PRG non completato o privo di aggregato comunale")
    global_green = green_comparison.get("global", {})
    classes = green_comparison.get("per_classe_prg", [])
    class_names = [x.get("classe_prg") for x in classes]
    expected_green_classes = {"agricolo", "attrezzato", "collinare", "gioco", "impianti",
                             "misto", "parco_urbano", "pubblico", "sport", "storico"}
    check(len(classes) == 10 and len(class_names) == len(set(class_names)),
          f"Classi PRG verde: attese 10 classi univoche, trovate {len(classes)}")
    check(set(class_names) == expected_green_classes,
          f"Schema classi PRG verde inatteso: mancanti={sorted(expected_green_classes-set(class_names))}, "
          f"extra={sorted(set(class_names)-expected_green_classes)}")
    check(all(isinstance(x.get("geometrie_prg"), int) and x.get("geometrie_prg") >= 0 for x in classes),
          "Conteggi geometrie PRG verde mancanti o negativi")
    check(all(isinstance(x.get("superficie_prg", {}).get("m2"), (int, float)) and
              x.get("superficie_prg", {}).get("m2") >= 0 for x in classes),
          "Superfici PRG verde mancanti o negative")
    check(global_green.get("geometrie_prg_per_classe") == sum(int(x.get("geometrie_prg", 0)) for x in classes),
          "Conteggio geometrie PRG verde globale non coincide con la somma per classe")
    for label, metrics in [("inventario 2013", global_green.get("inventario_2013")),
                            ("classi PRG", global_green.get("classi_verdi_prg")),
                            ("intersezione", global_green.get("intersezione"))]:
        if isinstance(metrics, dict):
            m2, ha_value = metrics.get("m2"), metrics.get("ha")
            check(isinstance(m2, (int, float)) and isinstance(ha_value, (int, float)) and
                  abs(ha_value - m2 / 10000) <= 0.001,
                  f"Conversione m²/ha incoerente nel report verde: {label}")
    overlap = global_green.get("intersezione", {}).get("m2")
    hist_area = global_green.get("inventario_2013", {}).get("m2")
    prg_area = global_green.get("classi_verdi_prg", {}).get("m2")
    if all(isinstance(x, (int, float)) for x in [overlap, hist_area, prg_area]):
        check(0 <= overlap <= min(hist_area, prg_area),
              "Intersezione verde/PRG supera una delle superfici di origine")

