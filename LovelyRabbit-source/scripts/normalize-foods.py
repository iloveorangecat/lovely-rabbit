import json,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
base=root/'work'/'food-source';sha=json.loads((base/'tree.json').read_text(encoding='utf-8'))['sha']
foods={};excluded=[];duplicates=0
for file in sorted((base/'fixed').glob('merged_*.json')):
    rows=json.loads(file.read_text(encoding='utf-8'))
    if not isinstance(rows,list):raise RuntimeError(f'Unexpected shape: {file.name}')
    for row in rows:
        code=str(row.get('foodCode','')).strip();name=str(row.get('foodName','')).strip();energy=str(row.get('energyKCal','')).strip()
        if not code or not name or not re.fullmatch(r'\d+(?:\.\d+)?',energy) or not 0<=float(energy)<=1000:
            excluded.append({'file':file.name,'code':code,'name':name,'energy':energy});continue
        key='cn:'+code+':'+hashlib.sha1(name.encode()).hexdigest()[:8]
        if key in foods:
            duplicates+=1
            if foods[key]['kcal100']!=float(energy):raise RuntimeError('Conflicting duplicate: '+key)
            continue
        foods[key]={'id':key,'name':name,'category':file.stem.removeprefix('merged_').replace('-',' · '),'kcal100':float(energy),'source':'中国食物成分整理库（OCR）'}
out=root/'public'/'data';out.mkdir(parents=True,exist_ok=True)
data={'version':'cn-'+sha,'foods':list(foods.values())}
(out/'foods.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
meta={'repository':'https://github.com/Sanotsu/china-food-composition-data','commit':sha,'directory':'json_data_v3_20260825_qwen38max_kimi_k3_fixed','count':len(foods),'duplicatesSkipped':duplicates,'excluded':excluded,'notice':'食物成分表截图识别整理数据，准确性需核对；原始数据权利归原作者，公开分发前需核实授权。本项目不调用 OCR 或付费 API。无标准份量重量。'}
(out/'food-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'foods':len(foods),'duplicates':duplicates,'excluded':len(excluded),'bytes':(out/'foods.json').stat().st_size},ensure_ascii=False))
