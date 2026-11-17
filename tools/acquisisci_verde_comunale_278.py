#!/usr/bin/env python3
"""Acquisisce il dataset comunale 278 e lo pubblica come layer storico separato."""
from __future__ import annotations
import datetime, hashlib, json, pathlib, subprocess, sys, tempfile, time, urllib.request, zipfile, shutil
ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = "https://opendata.comune.palermo.it/js/server/uploads/dataset/shp/_10012018113342.zip"
PAGE = "https://opendata.comune.palermo.it/opendata-dataset.php?dataset=278"
OUT = ROOT / "data/geo/verde_comunale_2013.geojson"
META = ROOT / "data/geo/verde_comunale_2013_metadata.json"
ENV = (13.0, 37.9, 13.8, 38.4)

def download(path: pathlib.Path) -> tuple[str, int]:
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, headers={"User-Agent":"Mozilla/5.0 (compatible; ComparatoreTerritorialePalermo/1.0)", "Accept":"application/zip,application/octet-stream,*/*"})
            with urllib.request.urlopen(req, timeout=120) as response, path.open("wb") as target:
                digest = hashlib.sha256(); size = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk: break
                    target.write(chunk); digest.update(chunk); size += len(chunk)
            if size < 1024 or not zipfile.is_zipfile(path):
                raise ValueError("Risposta non ZIP o archivio troppo piccolo")
            return digest.hexdigest(), size
        except Exception as exc:
            last = exc; path.unlink(missing_ok=True)
            if attempt < 2: time.sleep(2 ** attempt)
    raise RuntimeError(f"Download del dataset 278 non riuscito: {last}")

def main() -> int:
    for cmd in ("ogr2ogr", "ogrinfo"):
        if not shutil.which(cmd): raise RuntimeError(f"GDAL non disponibile: {cmd}")
    with tempfile.TemporaryDirectory(prefix="verde-palermo-") as temp:
        temp = pathlib.Path(temp); archive = temp / "dataset278.zip"
        sha, size = download(archive)
        extract = temp / "shp"; extract.mkdir()
        with zipfile.ZipFile(archive) as z:
            bad = z.testzip()
            if bad: raise RuntimeError(f"Archivio ZIP danneggiato: {bad}")
            z.extractall(extract)
        shapefiles = sorted(extract.rglob("*.shp")) + sorted(extract.rglob("*.SHP"))
        unique = list({str(p.resolve()):p for p in shapefiles}.values())
        if len(unique) != 1: raise RuntimeError(f"Atteso un solo shapefile nel dataset 278, trovati {len(unique)}")
        shp = unique[0]
        subprocess.run(["ogrinfo", "-ro", "-so", "-al", str(shp)], check=True, capture_output=True, text=True)
        converted = temp / "verde_comunale_2013.geojson"
        subprocess.run(["ogr2ogr", "-f", "GeoJSON", "-t_srs", "EPSG:4326", "-lco", "RFC7946=YES", str(converted), str(shp)], check=True)
        raw = converted.read_bytes()
        try: geo = json.loads(raw.decode("utf-8"))
        except UnicodeDecodeError: geo = json.loads(raw.decode("cp1252"))
        features = geo.get("features", [])
        if geo.get("type") != "FeatureCollection" or not features: raise RuntimeError("GeoJSON convertito vuoto o non valido")
        types = {}; points=[]; fields=[]
        def walk(value):
            if isinstance(value,list):
                if len(value)>=2 and isinstance(value[0],(int,float)) and isinstance(value[1],(int,float)): points.append((float(value[0]),float(value[1])))
                else:
                    for part in value: walk(part)
        for feature in features:
            geometry=feature.get("geometry")
            if not geometry or geometry.get("type") not in ("Polygon","MultiPolygon"): raise RuntimeError("Il dataset verde contiene geometrie mancanti o non areali")
            types[geometry["type"]]=types.get(geometry["type"],0)+1
            walk(geometry.get("coordinates",[]))
            if not fields and feature.get("properties"): fields=list(feature["properties"].keys())
        if not points: raise RuntimeError("Nessuna coordinata trovata")
        west,south,east,north=ENV
        if not any(west<=x<=east and south<=y<=north for x,y in points): raise RuntimeError("Il layer non intercetta l'inviluppo geografico di Palermo")
        bbox=[min(x for x,y in points),min(y for x,y in points),max(x for x,y in points),max(y for x,y in points)]
        OUT.parent.mkdir(parents=True,exist_ok=True)
        OUT.write_text(json.dumps({"type":"FeatureCollection","name":"verde_comunale_2013","features":features},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        meta={"title":"Perimetrazione area verde comunale · ricognizione 2013","dataset":278,"publisher":"Comune di Palermo","source_page":PAGE,"source_download":URL,"published":"2013-02-22","catalog_updated":"2021-09-06","temporal_coverage":"2013-01-01/2013-12-31","technical_documentation":None,"license":"CC BY 4.0 IT","acquired_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_sha256":sha,"source_bytes":size,"source_shapefile":shp.name,"feature_count":len(features),"geometry_types":types,"property_fields":fields,"bbox_wgs84":bbox,"output":"data/geo/verde_comunale_2013.geojson","status":"acquired_converted_preliminary_qa_passed","limitations":["Ricognizione storica con copertura temporale 2013, non inventario aggiornato.","Il dataset non contiene documentazione tecnica secondo il catalogo comunale.","Non sostituisce la zonizzazione PRG e non certifica proprietà pubblica o privata, attuazione, accessibilità o fruibilità.","Le geometrie non devono essere sommate alle superfici PRG: il layer è un confronto indipendente.","Il controllo geografico preliminare non certifica topologia, completezza o validità catastale."]}
        META.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({"file":str(OUT),"feature_count":len(features),"geometry_types":types,"bbox_wgs84":bbox,"metadata":str(META)},ensure_ascii=False))
    return 0
if __name__ == "__main__":
    try: raise SystemExit(main())
    except Exception as exc: print("ERRORE dataset verde 278:",exc,file=sys.stderr); raise SystemExit(1)