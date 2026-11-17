#!/usr/bin/env python3
"""Confronto spaziale indipendente tra inventario comunale verde 2013 (dataset 278) e PRG 2004."""
import json
from pathlib import Path
from collections import Counter
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
HIST=ROOT/"data/geo/verde_comunale_2013.geojson"
PRG=ROOT/"data/geo/verde_prg.geojson"
OUT=ROOT/"data/verde_confronto_278_prg.json"
FILES={
 "circoscrizioni":(ROOT/"data/geo/circoscrizioni_palermo_2021.geojson","COD_ASC1","DEN_ASC1"),
 "quartieri":(ROOT/"data/geo/aree_subcomunali_liv2_palermo_2021.geojson","COM_ASC2","DEN_ASC2"),
 "upl":(ROOT/"data/geo/aree_subcomunali_liv3_palermo_2021.geojson","COM_ASC3","DEN_ASC3"),
}
TO_UTM=Transformer.from_crs("EPSG:4326","EPSG:32633",always_xy=True).transform
def load(path):
    return json.loads(path.read_text(encoding="utf-8"))
def geom(feature):
    g=shape(feature["geometry"])
    if not g.is_valid:g=g.buffer(0)
    return transform(TO_UTM,g) if not g.is_empty else None
def prg_class(p):
    c=str(p.get("green_class") or "").strip().lower()
    if c in {"pubblico","gioco","sport","attrezzato","impianti","agricolo","collinare","storico","parco_urbano","misto"}:return c
    z=str(p.get("ZTO") or p.get("zto") or p.get("COD_ZTO") or "").upper().replace(" ","")
    return {"V3":"pubblico","V1":"gioco","V2":"sport","V4":"attrezzato","V5":"impianti","E1":"agricolo","E2":"collinare","VS":"storico","F4":"parco_urbano"}.get(z,"misto" if z.startswith("V") else None)
def ha(m2):return round(m2/10000,4)
def summary_area(g):return {"m2":round(g.area,2),"ha":ha(g.area)}
def main():
    h=load(HIST); p=load(PRG)
    hist=[];types=Counter();invalid_h=0;repaired_h=0
    for f in h.get("features",[]):
        try:
            original=shape(f['geometry']); repaired=not original.is_valid
            if repaired:repaired_h+=1
            g=geom(f)
            if g and g.area>0:
                typ=str((f.get("properties") or {}).get("TIPO") or "N.D.")
                hist.append((g,typ));types[typ]+=1
        except Exception:invalid_h+=1
    byclass={};invalid_p=0
    for f in p.get("features",[]):
        try:
            c=prg_class(f.get("properties") or {})
            if not c:continue
            g=geom(f)
            if g and g.area>0:byclass.setdefault(c,[]).append(g)
        except Exception:invalid_p+=1
    if not hist or not byclass:raise RuntimeError("Layer storici o PRG senza geometrie utilizzabili")
    h_union=unary_union([x[0] for x in hist])
    p_union=unary_union([g for group in byclass.values() for g in group])
    urban_keys={'pubblico','gioco','sport','attrezzato','impianti','storico','parco_urbano','misto'}
    standard_keys={'pubblico','gioco','sport','attrezzato'}
    natural_keys={'agricolo','collinare'}
    urban_union=unary_union([g for c,group in byclass.items() if c in urban_keys for g in group])
    standard_union=unary_union([g for c,group in byclass.items() if c in standard_keys for g in group])
    natural_union=unary_union([g for c,group in byclass.items() if c in natural_keys for g in group])
    def group_stats(u):
        i=h_union.intersection(u)
        return {'superficie_prg':summary_area(u),'intersezione_inventario_2013':summary_area(i),
                'inventario_2013_fuori_gruppo':summary_area(h_union.difference(u)),
                'prg_non_censito_2013':summary_area(u.difference(h_union)),
                'quota_inventario_2013_intersecata_pct':round(i.area/h_union.area*100,2) if h_union.area else None}
    overlap=h_union.intersection(p_union)
    outside=h_union.difference(p_union)
    prg_without=p_union.difference(h_union)
    hist_index=STRtree([x[0] for x in hist])
    hist_by_type={}
    for typ in sorted(types):
        u=unary_union([g for g,t in hist if t==typ])
        inter=u.intersection(p_union)
        hist_by_type[typ]={"features":types[typ],"area_totale":summary_area(u),"intersezione_prg_verde":summary_area(inter),"fuori_dalle_classi_verdi_prg":summary_area(u.difference(p_union))}
    class_rows=[]
    for c,geoms in sorted(byclass.items()):
        u=unary_union(geoms);inter=u.intersection(h_union)
        class_rows.append({"classe_prg":c,"geometrie_prg":len(geoms),"superficie_prg":summary_area(u),"intersezione_inventario_2013":summary_area(inter),"superficie_prg_non_censita_nel_2013":summary_area(u.difference(h_union))})
    territorial={}
    for level,(path,codekey,namekey) in FILES.items():
        fc=load(path);rows=[]
        for f in fc.get("features",[]):
            props=f.get("properties") or {}
            try:
                b=geom(f)
                if not b or b.area<=0:continue
                hi=h_union.intersection(b);pi=p_union.intersection(b);oi=hi.intersection(pi)
                rows.append({"codice":props.get(codekey),"nome":props.get(namekey) or str(props.get(codekey) or "N.D."),
                  "verde_comunale_2013":summary_area(hi),"verde_prg_classificato":summary_area(pi),
                  "intersezione":summary_area(oi),"inventario_2013_fuori_prg":summary_area(hi.difference(pi)),
                  "prg_non_censito_2013":summary_area(pi.difference(hi)),\n                  "classi_urbane_prg":group_stats(urban_union.intersection(b)),\n                  "candidati_standard_v1_v4":group_stats(standard_union.intersection(b)),\n                  "aree_agricole_collinari_e1_e2":group_stats(natural_union.intersection(b))})
            except Exception:continue
        territorial[level]=rows
    result={
      "schema_version":"1.0","status":"completed","generated_from":"dataset comunale 278 (ricognizione 2013) e layer tematico derivato dal dataset PRG 320 (Variante Generale DCC 7/2004)",
      "method":{"crs_area":"EPSG:32633 / UTM 33N","overlay":"intersezione geometrica di unioni topologiche; superfici in m² e ha","historic_source":"data/geo/verde_comunale_2013.geojson","prg_source":"data/geo/verde_prg.geojson","no_double_count":"Le metriche complessive usano l'unione geometrica dei poligoni, evitando il doppio conteggio interno alle rispettive fonti.","limits":["Il dataset 278 è una ricognizione storica 2013, non un inventario aggiornato.","La sovrapposizione cartografica non prova proprietà, destinazione effettiva, accessibilità o fruibilità.","Le classi PRG rappresentano previsioni/destinazioni del piano 2004 e non attestano attuazione o vigenza aggiornata.","Fuori dalle classi verdi PRG non significa assenza di vegetazione; non censito nel 2013 non significa assenza di verde.","Il confronto non è un bilancio normativo degli standard urbanistici."]},
      "global":{"geometrie_storiche_utilizzate":len(hist),"geometrie_prg_per_classe":sum(map(len,byclass.values())),
        "inventario_2013":summary_area(h_union),"classi_verdi_prg":summary_area(p_union),"intersezione":summary_area(overlap),
        "inventario_2013_fuori_prg":summary_area(outside),"prg_non_censito_2013":summary_area(prg_without),
        "quota_inventario_2013_intersecata_pct":round(overlap.area/h_union.area*100,2) if h_union.area else None,
        "quota_prg_intersecata_inventario_2013_pct":round(overlap.area/p_union.area*100,2) if p_union.area else None},
      "per_tipo_inventario_2013":hist_by_type,"per_classe_prg":class_rows,"perimetri_territoriali":territorial,
      "qa":{"geometrie_storiche_scartate":invalid_h,"geometrie_prg_scartate":invalid_p,"geometrie_storiche_non_valide_riparate_con_buffer0":repaired_h}
    }
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"completed","global":result["global"],"counts":{k:len(v) for k,v in territorial.items()}},ensure_ascii=False,indent=2))
if __name__=="__main__":main()
