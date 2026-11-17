#!/usr/bin/env python3
"""Acquisisce il dataset comunale 321 e converte separatamente vincoli areali e lineari."""
from __future__ import annotations
import datetime,hashlib,json,pathlib,subprocess,sys,tempfile,time,urllib.request,zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
URL="https://opendata.comune.palermo.it/js/server/uploads/dataset/shp/_10012018141049.zip"
OUTDIR=ROOT/"data/geo"
META=OUTDIR/"prg_vincoli_2021_metadata.json"
EXPECTED={
 "areali":("Vincoli_Ariali.shp","prg_vincoli_areali_2021.geojson"),
 "lineari":("Vincoli_Lineari.shp","prg_vincoli_lineari_2021.geojson")
}

def download(path):
 last=None
 for attempt in range(3):
  try:
   req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; ComparatoreTerritorialePalermo/1.0)","Accept":"application/zip,application/octet-stream,*/*"})
   with urllib.request.urlopen(req,timeout=120) as response,path.open("wb") as f:
    digest=hashlib.sha256()
    while True:
     block=response.read(1024*1024)
     if not block:break
     f.write(block);digest.update(block)
   if not zipfile.is_zipfile(path):raise RuntimeError("Il server non ha restituito uno ZIP valido")
   return digest.hexdigest()
  except Exception as exc:
   last=exc;path.unlink(missing_ok=True)
   if attempt<2:time.sleep(2**attempt)
 raise RuntimeError(f"Download fallito dopo 3 tentativi: {last}")

def main():
 for cmd in ("ogr2ogr","ogrinfo"):
  if subprocess.run(["bash","-lc",f"command -v {cmd}"],capture_output=True).returncode:
   raise RuntimeError(f"Comando richiesto non trovato: {cmd}")
 OUTDIR.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix="prg-vincoli-") as tmp:
  tmp=pathlib.Path(tmp);archive=tmp/"vincoli.zip";digest=download(archive)
  extract=tmp/"src";extract.mkdir()
  with zipfile.ZipFile(archive) as z:z.extractall(extract)
  shapes={p.name.lower():p for p in extract.rglob("*.shp")}
  if len(shapes)!=2:
   raise RuntimeError(f"Attesi due shapefile nel dataset 321, trovati {len(shapes)}: {sorted(shapes)}")
  layers={}
  for key,(expected_name,out_name) in EXPECTED.items():
   source=shapes.get(expected_name.lower())
   if source is None:raise RuntimeError(f"Shapefile richiesto non trovato: {expected_name}; trovati {sorted(shapes)}")
   subprocess.run(["ogrinfo","-ro","-so",str(source)],check=True)
   target=OUTDIR/out_name
   subprocess.run(["ogr2ogr","-f","GeoJSON","-t_srs","EPSG:4326","-lco","RFC7946=YES",str(target),str(source)],check=True)
   fc=json.loads(target.read_text(encoding="utf-8"))
   if fc.get("type")!="FeatureCollection" or not fc.get("features"):
    raise RuntimeError(f"{out_name}: GeoJSON vuoto/non valido")
   geom_types={}
   for f in fc["features"]:
    typ=(f.get("geometry") or {}).get("type","MISSING");geom_types[typ]=geom_types.get(typ,0)+1
   layers[key]={"source_shapefile":expected_name,"output_file":out_name,"feature_count":len(fc["features"]),"geometry_types":geom_types}
  meta={
   "dataset":321,"title":"Vincoli vigenti della Variante Generale al PRG",
   "publisher":"Comune di Palermo, Open Data",
   "source_url":"https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321",
   "download_url":URL,"catalog_update":"2021-09-06",
   "resolution":"Variante Generale PRG, DCC 7/2004","license":"CC BY 4.0 IT",
   "source_archive_sha256":digest,"source_archive_bytes":archive.stat().st_size,
   "output_crs":"OGC:CRS84 / GeoJSON RFC 7946","layers":layers,
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
