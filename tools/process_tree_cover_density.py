#!/usr/bin/env python3
"""Calcola statistiche Tree Cover Density (TCD) per poligoni territoriali.

Input:
  - raster Copernicus TCD 10 m (COG/GeoTIFF, valori 0-100, NoData 255)
  - layer poligonale con circoscrizioni, quartieri o UPL

Esempio:
  python tools/process_tree_cover_density.py TCD_2024.tif upl.gpkg \
    --id-field COD_ASC3 --name-field DEN_ASC3 --output tcd_upl_2024.csv

Dipendenze: geopandas, rasterio, shapely, numpy.
Le statistiche usano i pixel il cui centro ricade nel poligono (all_touched=False).
Non misurano verde pubblico o accessibilità: misurano copertura arborea.
"""
from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.mask import mask
from shapely.geometry import mapping
from shapely.validation import make_valid


def main() -> None:
    parser = argparse.ArgumentParser(description="Statistiche TCD 10 m per unità territoriali")
    parser.add_argument("raster", type=Path, help="GeoTIFF TCD annuale 10 m")
    parser.add_argument("polygons", type=Path, help="Shapefile, GeoPackage o altro layer vettoriale poligonale")
    parser.add_argument("--layer", default=None, help="Nome layer, se il GeoPackage ne contiene più di uno")
    parser.add_argument("--id-field", default="id", help="Campo identificativo territoriale")
    parser.add_argument("--name-field", default="name", help="Campo nome territoriale")
    parser.add_argument("--output", type=Path, default=Path("tcd_statistics.csv"))
    args = parser.parse_args()

    territories = gpd.read_file(args.polygons, layer=args.layer)
    if territories.empty:
        raise SystemExit("Il layer territoriale è vuoto.")
    if territories.crs is None:
        raise SystemExit("Il layer territoriale non dichiara il CRS.")
    for field in (args.id_field, args.name_field):
        if field not in territories.columns:
            raise SystemExit(f"Campo richiesto non trovato: {field}")

    results = []
    with rasterio.open(args.raster) as src:
        if src.crs is None:
            raise SystemExit("Il raster non dichiara il CRS.")
        if not src.crs.is_projected:
            raise SystemExit("Il raster deve avere un CRS proiettato in metri per calcolare le superfici.")
        pixel_area = abs(src.transform.a * src.transform.e - src.transform.b * src.transform.d)
        if not math.isfinite(pixel_area) or pixel_area <= 0:
            raise SystemExit("Dimensione del pixel non valida.")
        work = territories.to_crs(src.crs)

        for _, feature in work.iterrows():
            geom = feature.geometry
            base = {
                "territory_id": feature[args.id_field],
                "territory_name": feature[args.name_field],
                "valid_pixels": 0,
                "mean_tree_cover_pct": None,
                "canopy_equivalent_ha": None,
                "area_with_any_canopy_ha": None,
                "area_tcd_ge_10pct_ha": None,
                "area_tcd_ge_30pct_ha": None,
                "valid_observation_area_ha": None,
                "status": "ok",
            }
            if geom is None or geom.is_empty:
                base["status"] = "geometria vuota"
                results.append(base)
                continue
            geom = make_valid(geom)
            try:
                image, _ = mask(
                    src,
                    [mapping(geom)],
                    crop=True,
                    all_touched=False,
                    filled=False,
                )
                values = image[0].compressed().astype(np.float64)
                values = values[np.isfinite(values) & (values >= 0) & (values <= 100)]
            except ValueError:
                values = np.array([], dtype=np.float64)
            if values.size == 0:
                base["status"] = "nessun pixel valido"
                results.append(base)
                continue

            pixel_ha = pixel_area / 10000.0
            base.update({
                "valid_pixels": int(values.size),
                "mean_tree_cover_pct": round(float(values.mean()), 3),
                "canopy_equivalent_ha": round(float((values.sum() / 100.0) * pixel_ha), 4),
                "area_with_any_canopy_ha": round(float(np.count_nonzero(values >= 1) * pixel_ha), 4),
                "area_tcd_ge_10pct_ha": round(float(np.count_nonzero(values >= 10) * pixel_ha), 4),
                "area_tcd_ge_30pct_ha": round(float(np.count_nonzero(values >= 30) * pixel_ha), 4),
                "valid_observation_area_ha": round(float(values.size * pixel_ha), 4),
            })
            results.append(base)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)
    print(f"Creato {args.output}: {len(results)} unità territoriali")
    print("Canopy equivalent = somma dei valori TCD/100 moltiplicata per l'area pixel.")
    print("Le superfici sono stime raster per pixel; non rappresentano verde pubblico o fruibile.")


if __name__ == "__main__":
    main()
