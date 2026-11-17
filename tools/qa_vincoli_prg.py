#!/usr/bin/env python3
"""QA strutturale e geografica preliminare del layer PRG vincoli dataset 321."""
import json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
GEO=ROOT/"data/geo/prg_vincoli_2021.geojson"
META=ROOT/"data/geo/prg_vincoli_2021_metadata.json"
OUT=ROOT/"data/geo/qa_prg_vincoli_2021.json"
ENV=(12.9,37.7,13.8,38.5)
def walk(v,pts):
 if isinstance(v,list):
  if len(v)>=2 and isinstance(v[0],(int,float)) and isinstance(v[1],(int,float)):pts.append((float(v[0]),float(v[1])))
  else:
   for x in v:walk(x,pts)
def main():
 fc=json.loads(GEO.read_text(encoding="utf-8"));meta=json.loads(META.read_text(encoding="utf-8"))
 assert fc.get("type")=="FeatureCollection" and fc.get("features"),"FeatureCollection vuota/non valida"
 assert meta.get("dataset")==321 and meta.get("license")=="CC BY 4.0 IT","Metadati fonte/licenza mancanti"
 pts=[];types={};missing=0;invalid=0
 for i,f in enumerate(fc["features"]):
  g=f.get("geometry") or {};t=g.get("type","MISSING");types[t]=types.get(t,0)+1
  if t=="MISSING":missing+=1
  walk(g.get("coordinates",[]),pts)
 if missing:raise ValueError(f"{missing} feature senza geometria")
 if not pts:raise ValueError("Nessuna coordinata")
 if any(not(-180<=x<=180 and -90<=y<=90) for x,y in pts):raise ValueError("Coordinate fuori dai limiti WGS84")
 bbox=[min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts)]
 w,s,e,n=ENV
 if bbox[2]<w or bbox[0]>e or bbox[3]<s or bbox[1]>n:raise ValueError(f"Estensione {bbox} non intercetta Palermo; verificare CRS")
 report={"status":"passed","dataset":321,"feature_count":len(fc["features"]),"geometry_types":types,"coordinate_count":len(pts),"bbox_wgs84":[round(x,8) for x in bbox],"source_archive_sha256":meta.get("source_archive_sha256"),"scope":"structural and coarse geographic plausibility; not topological/legal validation"}
 OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=="__main__":
 try:main()
 except Exception as exc:print(f"QA VINCOLI FALLITA: {exc}",file=sys.stderr);raise SystemExit(1)
