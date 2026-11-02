"""Build the user-approved 179-food supplement; never write user IndexedDB data."""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'scripts/data/reviewed-100g.json'
d=json.loads(source.read_text(encoding='utf-8'))
foods=[]
for f in d['foods']:
 assert isinstance(f['kcalPer100g'],(int,float))
 item={'id':'review:'+f['id'],'name':f['name'],'category':'补充资料 · '+f['categories'][0],'kcal100':f['kcalPer100g'],'source':'用户提供资料（每100g均值）'}
 if f['commonUnits']:
  item['portions']=[{'unit':s['unit'],'kcal':round(s['kcal']/s['quantity'],4),'source':'用户提供资料（常用单位热量）'} for s in f['commonUnits']]
 foods.append(item)
assert len(foods)==179 and len({f['id'] for f in foods})==179
(root/'public/data/reviewed-foods.json').write_text(json.dumps({'version':'reviewed-100g-v3','foods':foods},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(root/'public/data/reviewed-food-source.json').write_text(json.dumps({'version':'reviewed-100g-v3','count':179,'commonUnits':1,'basis':'kcal/100g','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'note':'用户明确批准的资料整理均值，未逐项外部核验；不混入缺少每100g热量的623条食物。'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported 179 approved foods and 1 cup calorie reference.')
