#!/usr/bin/env python3
"""Acquisisce il dataset comunale 321 (vincoli PRG) e lo converte in GeoJSON."""
from __future__ import annotations
import datetime, hashlib, json, pathlib, subprocess, sys, tempfile, time, urllib.request, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
URL="https://opendata.comune.palermo.it/js/server/uploads/dataset/shp/_10012018141049.zip"
OUT=ROOT/"data/geo/prg_vincoli_2021.geojson"
META=ROOT/"data/geo/prg_vincoli_2021_metadata.json"

def download(path: pathlib.Path) -> str:
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; ComparatoreTerritorialePalermo/1.0)","Accept":"application/zip,application/octet-stream,*/*"})
            with urllib.request.urlopen(req,timeout=120) as response,path.open("wb") as f:
                digest=hashlib.sha256()
                while True:
                    block=response.read(1024*1024)
                    if not block: break
                    f.write(block);digest.update(block)
            if not zipfile.is_zipfile(path):
                raise RuntimeError("Il server non ha restituito un archivio ZIP valido")
            return digest.hexdigest()
        except Exception as exc:
            last=exc;path.unlink(missing_ok=True)
            if attempt<2:time.sleep(2**attempt)
    raise RuntimeError(f"Download fallito dopo 3 tentativi: {last}")

def main():
    for cmd in ("ogr2ogr","ogrinfo"):
        if subprocess.run(["bash","-lc",f"command -v {cmd}"],capture_output=True).returncode:
            raise RuntimeError(f"Comando richiesto non trovato: {cmd}")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prg-vincoli-") as tmp:
        tmp=pathlib.Path(tmp);archive=tmp/"vincoli.zip";digest=download(archive)
        extract=tmp/"src";extract.mkdir()
        with zipfile.ZipFile(archive) as z:z.extractall(extract)
        shapes=sorted(extract.rglob("*.shp"))+sorted(extract.rglob("*.SHP"))
        shapes=list(dict.fromkeys(shapes))
        if len(shapes)!=1:
            raise RuntimeError(f"Atteso un solo shapefile nel dataset 321, trovati {len(shapes)}: {[str(x.relative_to(extract)) for x in shapes]}")
        source=shapes[0]
        subprocess.run(["ogrinfo","-ro","-so",str(source)],check=True)
        subprocess.run(["ogr2ogr","-f","GeoJSON","-t_srs","EPSG:4326","-lco","RFC7946=YES",str(OUT),str(source)],check=True)
        fc=json.loads(OUT.read_text(encoding="utf-8"))
        if fc.get("type")!="FeatureCollection" or not fc.get("features"):
            raise RuntimeError("GeoJSON convertito vuoto o non valido")
        geom_types={}
        for f in fc["features"]:
            typ=(f.get("geometry") or {}).get("type","MISSING")
            geom_types[typ]=geom_types.get(typ,0)+1
        meta={
          "dataset":321,
          "title":"Vincoli vigenti della Variante Generale al PRG",
          "publisher":"Comune di Palermo, Open Data",
          "source_url":"https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321",
          "download_url":URL,
          "catalog_update":"2021-09-06",
          "resolution":"Variante Generale PRG, DCC 7/2004",
          "license":"CC BY 4.0 IT",
          "source_archive_sha256":digest,
          "source_archive_bytes":archive.stat().st_size,
          "output_file":OUT.name,
          "output_crs":"OGC:CRS84 / GeoJSON RFC 7946",
          "feature_count":len(fc["features"]),
          "geometry_types":geom_types,
          "acquired_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "status":"downloaded_and_converted_pending_qa",
          "limitations":["La data catalogo non certifica la vigenza attuale.","La conversione non costituisce validazione topologica o legale."]
        }
        META.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps(meta,ensure_ascii=False,indent=2))
if __name__=="__main__":
    try:main()
    except Exception as exc:
        print(f"ACQUISIZIONE VINCOLI FALLITA: {exc}",file=sys.stderr);raise SystemExit(1)
