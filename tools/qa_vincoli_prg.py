#!/usr/bin/env python3
"""QA strutturale e geografica preliminare dei due layer vincoli PRG dataset 321."""
import json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
META=ROOT/"data/geo/prg_vincoli_2021_metadata.json"
OUT=ROOT/"data/geo/qa_prg_vincoli_2021.json"
LAYERS={
 "areali":("prg_vincoli_areali_2021.geojson",{"Polygon","MultiPolygon"}),
 "lineari":("prg_vincoli_lineari_2021.geojson",{"LineString","MultiLineString"})
}
ENV=(12.9,37.7,13.8,38.5)
def walk(v,pts):
 if isinstance(v,list):
  if len(v)>=2 and isinstance(v[0],(int,float)) and isinstance(v[1],(int,float)):pts.append((float(v[0]),float(v[1])))
  else:
   for x in v:walk(x,pts)
def main():
 meta=json.loads(META.read_text(encoding="utf-8"))
 assert meta.get("dataset")==321 and meta.get("license")=="CC BY 4.0 IT","Metadati fonte/licenza mancanti"
 reports={}
 for key,(filename,allowed) in LAYERS.items():
  fc=json.loads((ROOT/"data/geo"/filename).read_text(encoding="utf-8"))
  assert fc.get("type")=="FeatureCollection" and fc.get("features"),f"{filename}: FeatureCollection vuota/non valida"
  pts=[];types={};missing=0
  for f in fc["features"]:
   g=f.get("geometry") or {};t=g.get("type","MISSING");types[t]=types.get(t,0)+1
   if t=="MISSING":missing+=1
   if t not in allowed:raise ValueError(f"{filename}: geometria inattesa {t}")
   walk(g.get("coordinates",[]),pts)
  if missing:raise ValueError(f"{filename}: {missing} feature senza geometria")
  if not pts:raise ValueError(f"{filename}: nessuna coordinata")
  if any(not(-180<=x<=180 and -90<=y<=90) for x,y in pts):raise ValueError(f"{filename}: coordinate fuori WGS84")
  bbox=[min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts)]
  w,s,e,n=ENV
  if bbox[2]<w or bbox[0]>e or bbox[3]<s or bbox[1]>n:raise ValueError(f"{filename}: estensione {bbox} non intercetta Palermo")
  declared=meta["layers"][key]["feature_count"]
  if declared!=len(fc["features"]):raise ValueError(f"{filename}: conteggio feature diverso dai metadati")
  reports[key]={"file":filename,"feature_count":len(fc["features"]),"geometry_types":types,"coordinate_count":len(pts),"bbox_wgs84":[round(x,8) for x in bbox]}
 report={"status":"passed","dataset":321,"source_archive_sha256":meta.get("source_archive_sha256"),"layers":reports,"scope":"structural and coarse geographic plausibility; not topological/legal validation"}
 OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=="__main__":
 try:main()
 except Exception as exc:print(f"QA VINCOLI FALLITA: {exc}",file=sys.stderr);raise SystemExit(1)
