#!/usr/bin/env python3
"""
Prepara layer GeoJSON da archivi shapefile ISTAT delle Basi Territoriali 2021.
Non scarica dati e non corregge geometrie automaticamente: opera su archivi
scaricati dall'utente e registra controlli/esiti in un rapporto JSON.

Uso:
  python tools/prepara_cartografia_istat.py \
    --sezioni /percorso/R19_21 \
    --asc /percorso/ASC_21 \
    --out data/geo

Dipendenze: geopandas, pyogrio (oppure Fiona), shapely.
Codice ISTAT del Comune di Palermo: 082053.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import geopandas as gpd
except ImportError:
    sys.exit("Dipendenza mancante. Installare con: pip install geopandas pyogrio")


PALERMO = "082053"
COMUNE_FIELDS = ("PRO_COM", "PROCOM", "COD_COM", "COD_COMUNE", "CODISTAT", "PRO_COM_T")
SECTION_FIELDS = ("SEZ", "SEZIONE", "COD_SEZ", "COD_SEZIONE", "SEZ2021", "COD_SEZ21")
ASC_CODE_FIELDS = ("COD_ASCn", "COD_ASC", "COD_ASC3", "COD_AS3")
ASC_NAME_FIELDS = ("DEN_ASCn", "DEN_ASC", "DEN_ASC3", "DEN_AS3")


def find_shapefiles(folder: Path) -> list[Path]:
    if not folder.exists():
        raise FileNotFoundError(f"Cartella non trovata: {folder}")
    return sorted(folder.rglob("*.shp"))


def find_field(columns, candidates):
    lookup = {str(c).casefold(): c for c in columns}
    for name in candidates:
        if name.casefold() in lookup:
            return lookup[name.casefold()]
    return None


def normalize_code(value):
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text.zfill(6) if text.isdigit() else text


def process_layer(shp_files, kind, output):
    attempts, selected = [], []
    for shp in shp_files:
        try:
            gdf = gpd.read_file(shp)
            if gdf.empty or gdf.geometry.name not in gdf.columns:
                attempts.append({"file": str(shp), "status": "vuoto_o_senza_geometria"})
                continue
            comune_field = find_field(gdf.columns, COMUNE_FIELDS)
            if not comune_field:
                attempts.append({"file": str(shp), "status": "campo_comune_non_trovato",
                                 "campi": [str(c) for c in gdf.columns]})
                continue
            codes = gdf[comune_field].map(normalize_code)
            subset = gdf.loc[codes == PALERMO].copy()
            attempts.append({"file": str(shp), "campo_comune": str(comune_field),
                             "record_origine": int(len(gdf)),
                             "record_palermo": int(len(subset))})
            if not subset.empty:
                selected.append((shp, subset, comune_field))
        except Exception as exc:
            attempts.append({"file": str(shp), "errore": str(exc)})

    if not selected:
        return {"stato": "non_prodotto", "motivo": "Nessuno shapefile ha restituito record con PRO_COM 082053.",
                "tentativi": attempts}

    frames = []
    for shp, subset, _ in selected:
        subset = subset.copy()
        subset["_file_origine"] = shp.name
        frames.append(subset)
    merged = gpd.GeoDataFrame(
        __import__("pandas").concat(frames, ignore_index=True),
        geometry=frames[0].geometry.name,
        crs=frames[0].crs
    )

    source_crs = str(merged.crs) if merged.crs else None
    if not source_crs:
        return {"stato": "bloccato", "motivo": "CRS assente: definire il sistema di riferimento in QGIS dopo verifica del .prj; nessuna riproiezione eseguita.",
                "tentativi": attempts}

    geom = merged.geometry
    null_count = int(geom.isna().sum())
    empty_count = int(geom.is_empty.sum())
    invalid_count = int((~geom.is_valid & geom.notna() & ~geom.is_empty).sum())
    type_counts = {str(k): int(v) for k, v in geom.geom_type.value_counts(dropna=False).items()}
    if null_count or empty_count or invalid_count:
        return {"stato": "bloccato", "motivo": "Sono presenti geometrie nulle, vuote o non valide. Correggere e documentare in QGIS prima dell'esportazione.",
                "crs_origine": source_crs, "geometrie_nulle": null_count,
                "geometrie_vuote": empty_count, "geometrie_non_valide": invalid_count,
                "tipi_geometrici": type_counts, "tentativi": attempts}

    # Codici e denominazioni sono conservati; la trasformazione è effettuata
    # solo se il CRS sorgente è dichiarato nello shapefile.
    web = merged.to_crs("EPSG:4326")
    out = output / ("sezioni_palermo_2021.geojson" if kind == "sezioni" else "aree_subcomunali_palermo_2021.geojson")
    output.mkdir(parents=True, exist_ok=True)
    web.to_file(out, driver="GeoJSON", index=False)

    code_field = find_field(web.columns, SECTION_FIELDS if kind == "sezioni" else ASC_CODE_FIELDS)
    name_field = find_field(web.columns, ASC_NAME_FIELDS) if kind == "asc" else None
    duplicate_codes = None
    if code_field:
        duplicate_codes = int(web[code_field].astype(str).duplicated().sum())

    bounds = [float(x) for x in web.total_bounds]
    return {
        "stato": "esportato_da_sottoporre_a_verifica",
        "file_output": str(out),
        "record": int(len(web)),
        "crs_origine": source_crs,
        "crs_output": "EPSG:4326",
        "campo_codice": str(code_field) if code_field else None,
        "campo_denominazione": str(name_field) if name_field else None,
        "codici_duplicati": duplicate_codes,
        "geometrie_nulle": null_count,
        "geometrie_vuote": empty_count,
        "geometrie_non_valide": invalid_count,
        "tipi_geometrici": type_counts,
        "bbox_wgs84": bounds,
        "tentativi": attempts,
        "nota": "Esportazione tecnica, non certificazione topologica o amministrativa. Verificare codici, copertura, sovrapposizioni e corrispondenza con le tabelle ISTAT."
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sezioni", type=Path, help="Cartella estratta R19_21")
    parser.add_argument("--asc", type=Path, help="Cartella estratta ASC_21")
    parser.add_argument("--out", type=Path, default=Path("data/geo"), help="Cartella output")
    args = parser.parse_args()
    if not args.sezioni and not args.asc:
        parser.error("Specificare almeno --sezioni o --asc")

    report = {
        "ente": "ISTAT",
        "riferimento_geometrie": "Basi territoriali 2021",
        "comune": "Palermo",
        "codice_istat_comune": PALERMO,
        "eseguito_utc": datetime.now(timezone.utc).isoformat(),
        "avvertenza": "I risultati richiedono verifica manuale e non attivano automaticamente i layer nell'applicazione."
    }
    for kind, folder in (("sezioni", args.sezioni), ("asc", args.asc)):
        if folder:
            try:
                report[kind] = process_layer(find_shapefiles(folder), kind, args.out)
            except Exception as exc:
                report[kind] = {"stato": "errore", "motivo": str(exc)}
    args.out.mkdir(parents=True, exist_ok=True)
    report_path = args.out / "rapporto_acquisizione_istat.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Rapporto scritto in: {report_path}")


if __name__ == "__main__":
    main()
