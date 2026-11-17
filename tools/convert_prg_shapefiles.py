#!/usr/bin/env python3
import datetime,hashlib,json,pathlib,re,shutil,subprocess,sys,tempfile,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/"data/geo/prg"
SRC=[(320,"zonizzazione","Perimetrazione zonizzazione PRG vigente","https://opendata.comune.palermo.it/opendata-dataset.php?dataset=320","2018-01-10"),(321,"vincoli","Vincoli vigenti della Variante Generale al PRG","https://opendata.comune.palermo.it/opendata-dataset.php?dataset=321","2021-09-06")]
def slug(x): return re.sub(r"[^a-z0-9]+","_",x.lower()).strip("_")[:55] or "layer"
def extract(p,d):
 if p.suffix.lower()==".zip":
  d.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(p) as z:
   bad=z.testzip()
   if bad: raise ValueError("ZIP danneggiato: "+bad)
   z.extractall(d)
  a=sorted(d.rglob("*.shp"))+sorted(d.rglob("*.SHP"))
  return list({str(x.resolve()):x for x in a}.values())
 if p.suffix.lower()==".shp": return [p]
 raise ValueError("Input deve essere ZIP o SHP: "+str(p))
def read_geojson(path):
 raw=path.read_bytes()
 try:text=raw.decode("utf-8")
 except UnicodeDecodeError:text=raw.decode("cp1252")
 return json.loads(text)
def family(fs):
 ts={f.get("geometry",{}).get("type","") for f in fs if f.get("geometry")}
 if ts and ts<={"Polygon","MultiPolygon"}:return "areali"
 if ts and ts<={"LineString","MultiLineString"}:return "lineari"
 if ts and ts<={"Point","MultiPoint"}:return "puntuali"
 return "misti"
def main():
 if len(sys.argv)!=3: raise SystemExit("Uso: convert_prg_shapefiles.py dataset320.zip dataset321.zip")
 if not shutil.which("ogr2ogr") or not shutil.which("ogrinfo"):raise RuntimeError("GDAL non installato")
 inputs=[pathlib.Path(x).resolve() for x in sys.argv[1:]];OUT.mkdir(parents=True,exist_ok=True)
 for p in list(OUT.glob("prg_320_*.geojson"))+list(OUT.glob("prg_vincoli_*.geojson")):p.unlink()
 manifest=[];sources=[]
 with tempfile.TemporaryDirectory() as td:
  td=pathlib.Path(td)
  for (ds,key,title,url,upd),src in zip(SRC,inputs):
   shps=extract(src,td/key)
   if not shps:raise RuntimeError("Nessuno shapefile nel dataset "+str(ds))
   sources.append({"dataset":ds,"nome":title,"url":url,"aggiornamento_catalogo":upd,"sha256":hashlib.sha256(src.read_bytes()).hexdigest(),"bytes":src.stat().st_size,"shapefile_count":len(shps)})
   groups={}
   for shp in shps:
    subprocess.run(["ogrinfo","-ro","-so","-al",str(shp)],check=True,capture_output=True)
    tmp=td/(slug(shp.stem)+".geojson")
    subprocess.run(["ogr2ogr","-f","GeoJSON","-t_srs","EPSG:4326","-lco","RFC7946=YES",str(tmp),str(shp)],check=True)
    fc=read_geojson(tmp)
    if fc.get("type")!="FeatureCollection" or not fc.get("features"):raise ValueError("GeoJSON vuoto: "+shp.name)
    fam=family(fc["features"])
    if ds==320:
     fn="prg_320_"+slug(shp.stem)+".geojson"
     for f in fc["features"]:f.setdefault("properties",{})["_source_shapefile"]=shp.name
     (OUT/fn).write_text(json.dumps(fc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
     manifest.append({"dataset":ds,"group":"zonizzazione","name":"Zonizzazione · "+shp.stem,"file":fn,"geometry_family":fam,"feature_count":len(fc["features"])})
    else:
     for f in fc["features"]:
      p=f.setdefault("properties",{});p["_source_shapefile"]=shp.name;p["_source_dataset"]=321
      feature_family=family([f])
      groups.setdefault(feature_family,[]).append(f)
   if ds==321:
    for fam,features in groups.items():
     fn="prg_vincoli_"+fam+".geojson";fc={"type":"FeatureCollection","name":fn,"features":features}
     (OUT/fn).write_text(json.dumps(fc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
     manifest.append({"dataset":321,"group":"vincoli_"+fam,"name":"Vincoli "+fam,"file":fn,"geometry_family":fam,"feature_count":len(features),"source_shapefiles":sorted({f["properties"]["_source_shapefile"] for f in features})})
 if not any(x["dataset"]==320 for x in manifest) or not any(x["dataset"]==321 for x in manifest):raise RuntimeError("Dataset 320/321 incompleto")
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 meta={"titolo":"Cartografia PRG Palermo","riferimento":"Variante Generale PRG, presa d'atto DCC 7/2004","data_acquisizione_utc":now,"fonti":sources,"crs_output":"OGC:CRS84 / GeoJSON RFC 7946","licenza":"CC BY 4.0 IT","layers":manifest,"stato":"convertito; QA preliminare richiesto; vigenza da verificare","nota":"Il dataset 321 è suddiviso per famiglia geometrica. Le date catalogo non certificano la disciplina urbanistica attuale."}
 (OUT/"metadata.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 (OUT/"layers.json").write_text(json.dumps({"layers":manifest},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({"layers":manifest},ensure_ascii=False,indent=2))
if __name__=="__main__":
 try:main()
 except Exception as e:print("ERRORE PRG:",e,file=sys.stderr);raise SystemExit(1)
