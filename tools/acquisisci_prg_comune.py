#!/usr/bin/env python3
import hashlib,pathlib,subprocess,sys,tempfile,time,urllib.request,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
URLS=[("dataset320","https://opendata.comune.palermo.it/js/server/uploads/dataset/shp/_10012018124836.zip"),("dataset321","https://opendata.comune.palermo.it/js/server/uploads/dataset/shp/_10012018141049.zip")]
def get(url,p):
 last=None
 for n in range(3):
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ComparatoreTerritorialePalermo/1.0)","Accept":"application/zip,application/octet-stream,*/*"})
   with urllib.request.urlopen(req,timeout=120) as r,p.open("wb") as f:
    h=hashlib.sha256();size=0
    while True:
     b=r.read(1048576)
     if not b:break
     f.write(b);h.update(b);size+=len(b)
   if size<1024 or not zipfile.is_zipfile(p):raise ValueError("risposta non ZIP")
   return h.hexdigest(),size
  except Exception as e:
   last=e;p.unlink(missing_ok=True)
   if n<2:time.sleep(2**n)
 raise RuntimeError("download fallito: "+str(last))
def main():
 with tempfile.TemporaryDirectory() as td:
  paths=[]
  for name,url in URLS:
   p=pathlib.Path(td)/(name+".zip");sha,size=get(url,p);print(name,size,"SHA256",sha);paths.append(p)
  return subprocess.run([sys.executable,str(ROOT/"tools/convert_prg_shapefiles.py"),str(paths[0]),str(paths[1])],cwd=ROOT).returncode
if __name__=="__main__":raise SystemExit(main())
