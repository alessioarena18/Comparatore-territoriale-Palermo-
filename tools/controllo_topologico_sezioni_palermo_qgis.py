#!/usr/bin/env python3
"""
Verifica e prepara una copia candidata delle tre sezioni censuarie ISTAT 2021
con auto-intersezione note. Non sovrascrive mai il GeoJSON pubblicato.

Esecuzione:
  Aprire QGIS, aprire la console Python e lanciare dal repository:
  exec(open("tools/controllo_topologico_sezioni_palermo_qgis.py", encoding="utf-8").read())

Prerequisiti:
  QGIS 3.28 o successivo. Il progetto deve essere aperto dalla cartella
  principale del repository oppure aggiornare SOURCE e OUTPUT qui sotto.

Output:
  data/geo/candidate/sezioni_palermo_2021_candidate.geojson
  data/geo/candidate/rapporto_topologico_candidate.json

La copia candidata va confrontata in QGIS con l'originale e con le ortofoto.
Il completamento dello script non equivale a validazione amministrativa.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsProject,
    QgsVectorFileWriter,
    QgsVectorLayer,
)

ROOT = Path.cwd()
SOURCE = ROOT / "data/geo/sezioni_palermo_2021.geojson"
OUTPUT_DIR = ROOT / "data/geo/candidate"
TARGET_IDS = {
    "820530000008",
    "820530002119",
    "820530003803",
}
ID_FIELD = "SEZ21_ID"
AREA_CRS = QgsCoordinateReferenceSystem("EPSG:32632")


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(
            f"GeoJSON non trovato: {SOURCE}. Avviare QGIS dalla cartella principale del repository."
        )

    layer = QgsVectorLayer(str(SOURCE), "Sezioni ISTAT 2021 originali", "ogr")
    if not layer.isValid():
        raise RuntimeError("Il layer GeoJSON non è leggibile da QGIS.")
    if ID_FIELD not in [field.name() for field in layer.fields()]:
        raise RuntimeError(f"Campo identificativo {ID_FIELD} assente.")

    source_crs = layer.crs()
    if not source_crs.isValid():
        raise RuntimeError("CRS sorgente non valido: nessuna trasformazione o riparazione eseguita.")

    transform = QgsCoordinateTransform(source_crs, AREA_CRS, QgsProject.instance())
    features_by_id = {str(f[ID_FIELD]): f for f in layer.getFeatures()}
    missing = sorted(TARGET_IDS - set(features_by_id))
    if missing:
        raise RuntimeError("ID attesi non trovati: " + ", ".join(missing))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "title": "Verifica topologica candidata delle sezioni censuarie Palermo 2021",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "source": str(SOURCE),
        "source_crs": source_crs.authid(),
        "area_comparison_crs": "EPSG:32632",
        "method": "QgsGeometry.makeValid() applicato esclusivamente ai tre ID segnalati; originale conservato.",
        "target_ids": sorted(TARGET_IDS),
        "features": [],
        "candidate_file": str(OUTPUT_DIR / "sezioni_palermo_2021_candidate.geojson"),
        "limitations": [
            "Il risultato è una copia tecnica candidata, non sostituisce il controllo visivo dei confini.",
            "Le variazioni di area sono misurate in EPSG:32632 e devono essere valutate caso per caso.",
            "Nessun dato POP21 o attributo è modificato intenzionalmente.",
            "Il file candidato non deve sostituire il layer pubblicato senza revisione e approvazione.",
        ],
    }

    if not layer.startEditing():
        raise RuntimeError("Impossibile avviare la modifica del layer in memoria.")

    for section_id in sorted(TARGET_IDS):
        feature = features_by_id[section_id]
        original = feature.geometry()
        if original.isNull() or original.isEmpty():
            raise RuntimeError(f"Geometria nulla o vuota: {section_id}")

        original_valid = original.isGeosValid()
        original_projected = original.clone()
        original_projected.transform(transform)
        original_area = original_projected.area()

        candidate = original.makeValid()
        if candidate.isNull() or candidate.isEmpty() or not candidate.isGeosValid():
            raise RuntimeError(f"makeValid non ha prodotto una geometria valida: {section_id}")

        candidate_projected = candidate.clone()
        candidate_projected.transform(transform)
        candidate_area = candidate_projected.area()
        delta = candidate_area - original_area
        delta_pct = (delta / original_area * 100.0) if original_area else None

        if not layer.changeGeometry(feature.id(), candidate):
            raise RuntimeError(f"Impossibile sostituire la geometria in memoria: {section_id}")

        report["features"].append({
            "SEZ21_ID": section_id,
            "valid_before": bool(original_valid),
            "valid_after": bool(candidate.isGeosValid()),
            "geometry_type_before": original.wkbType(),
            "geometry_type_after": candidate.wkbType(),
            "area_before_m2": original_area,
            "area_after_m2": candidate_area,
            "area_delta_m2": delta,
            "area_delta_percent": delta_pct,
            "review_required": True,
        })

    if not layer.commitChanges():
        errors = layer.commitErrors()
        layer.rollBack()
        raise RuntimeError("Commit del layer temporaneo fallito: " + "; ".join(errors))

    output = OUTPUT_DIR / "sezioni_palermo_2021_candidate.geojson"
    options = QgsVectorFileWriter.SaveVectorOptions()
    options.driverName = "GeoJSON"
    options.fileEncoding = "UTF-8"
    result = QgsVectorFileWriter.writeAsVectorFormatV3(
        layer, str(output), QgsProject.instance().transformContext(), options
    )
    if result[0] != QgsVectorFileWriter.NoError:
        raise RuntimeError("Esportazione GeoJSON fallita: " + str(result))

    candidate_layer = QgsVectorLayer(str(output), "Sezioni ISTAT 2021 - candidata makeValid", "ogr")
    if not candidate_layer.isValid():
        raise RuntimeError("Il GeoJSON candidato è stato scritto ma non è ricaricabile.")
    QgsProject.instance().addMapLayer(candidate_layer)

    report["candidate_valid"] = all(item["valid_after"] for item in report["features"])
    report["export_error"] = result[0]
    report_path = OUTPUT_DIR / "rapporto_topologico_candidate.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("\nATTENZIONE: confrontare ogni poligono candidato con l'originale e con le fonti cartografiche prima di qualsiasi pubblicazione.")


main()
