#!/usr/bin/env python3
import collections,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];DIR=ROOT/"data/geo/prg";ENV=(12.9,37.7,13.8,38.5)
def walk(v,p):
 if isinstance(v,list):
  if len(v)>=2 and all(isinstance(x,(int,float)) for x in v[:2]):p.append((float(v[0]),float(v[1])))
  else:
   for x in v:walk(x,p)
def check(item):
 f=DIR/item["file"];o=json.loads(f.read_text(encoding="utf-8"))
 if o.get("type")!="FeatureCollection" or not o.get("features"):raise ValueError(f.name+": FeatureCollection vuota")
 pts=[];types=collections.Counter()
 for i,x in enumerate(o["features"]):
  g=x.get("geometry")
  if x.get("type")!="Feature" or not g or g.get("coordinates") is None:raise ValueError(f"{f.name}: feature {i} senza geometria")
  types[g.get("type","?")]+=1;walk(g["coordinates"],pts)
 if not pts:raise ValueError(f.name+": nessuna coordinata")
 xs=[x for x,y in pts];ys=[y for x,y in pts]
 if any(not(-180<=x<=180 and -90<=y<=90) for x,y in pts):raise ValueError(f.name+": coordinate non WGS84")
 b=[min(xs),min(ys),max(xs),max(ys)];w,s,e,n=ENV
 if b[2]<w or b[0]>e or b[3]<s or b[1]>n:raise ValueError(f.name+": estensione non intercetta Palermo")
 return {"file":f.name,"dataset":item["dataset"],"group":item["group"],"features":len(o["features"]),"geometry_types":dict(types),"bbox_wgs84":[round(x,7) for x in b]}
def main():
 layers=json.loads((DIR/"layers.json").read_text())["layers"]
 if not layers or not {320,321}.issubset({x["dataset"] for x in layers}):raise ValueError("manifest 320/321 incompleto")
 reports=[check(x) for x in layers]
 meta=json.loads((DIR/"metadata.json").read_text())
 source_quality=[{"dataset":s.get("dataset"),"shapefiles":s.get("shapefiles",[])} for s in meta.get("fonti",[])]
 excluded=sum(x.get("excluded_without_geometry",0) for s in source_quality for x in s["shapefiles"])
 split=sum(x.get("geometry_collection_parts_added",0) for s in source_quality for x in s["shapefiles"])
 if len(meta.get("fonti",[]))!=2:raise ValueError("fonti metadata incomplete")
 (DIR/"qa_prg.json").write_text(json.dumps({"status":"passed","scope":"structural and coarse geographic plausibility only; not topology/legal validation","reports":reports,"source_quality":{"excluded_without_geometry":excluded,"geometry_collection_parts_added":split,"details":source_quality}},ensure_ascii=False,indent=2)+"\n")
 print("QA superato:",len(reports),"layer; topologia e vigenza non certificate.")
if __name__=="__main__":
 try:main()
 except Exception as e:print("QA PRG fallito:",e,file=sys.stderr);raise SystemExit(1)
