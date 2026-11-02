"""Snapshot official 2024 adult tables without modifying MET values. Python stdlib only."""
import json, re, hashlib, urllib.request
from pathlib import Path
from html import unescape
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://pacompendium.com/'
CATEGORIES = [
 ('bicycling','骑行'), ('conditioning-exercise','健身训练'), ('dancing','舞蹈'),
 ('fishing-hunting','钓鱼与狩猎'), ('home-activities','家务'), ('home-repair','家居维修'),
 ('inactivity','静态活动'), ('lawn-garden','园艺'), ('miscellaneous','其他活动'),
 ('music-playing','演奏音乐'), ('occupation','职业活动'), ('running','跑步'),
 ('self-care','个人护理'), ('sexual-activity','亲密活动'), ('sports','体育运动'),
 ('transportation','交通'), ('walking','步行'), ('water-activities','水上活动'),
 ('winter-activities','冬季活动'), ('religious-activities','宗教活动'),
 ('volunteer-activities','志愿活动'), ('video-games','电子游戏')]

def clean(s):
 return ' '.join(unescape(re.sub('<[^>]+>', ' ', s)).split())

def fetch(pair):
 slug, category = pair
 cache = ROOT / 'work/exercise-source' / (slug + '.html')
 cache.parent.mkdir(parents=True, exist_ok=True)
 if not cache.exists():
  req = urllib.request.Request(BASE + slug + '/', headers={'User-Agent':'LovelyRabbit data import'})
  cache.write_bytes(urllib.request.urlopen(req, timeout=90).read())
 raw = cache.read_bytes()
 rows = []
 for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', raw.decode(), re.S|re.I):
  cells = re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', row, re.S|re.I)
  vals = [clean(c) for c in cells]
  if len(vals) >= 3 and re.fullmatch(r'\d{5}', vals[0]) and re.fullmatch(r'\d+(?:\.\d+)?', vals[1]):
   rows.append({'code':vals[0], 'met':float(vals[1]), 'description':vals[2],
     'category':category, 'source':BASE+slug+'/',
     'estimatedMET':bool(re.search(r'(?:#ff0000|#f00\b|#bb0000|#b80000|#cf2e2e|color:\s*red)', cells[0], re.I))})
 if not rows: raise ValueError('No activity rows: '+slug)
 return rows, {'url':BASE+slug+'/', 'sha256':hashlib.sha256(raw).hexdigest(), 'count':len(rows)}

if __name__ == '__main__':
 with ThreadPoolExecutor(max_workers=6) as pool:
  parts = list(pool.map(fetch, CATEGORIES))
 rows = sorted([v for part,_ in parts for v in part], key=lambda v:v['code'])
 assert len({v['code'] for v in rows}) == len(rows)
 out = ROOT / 'public/data'
 out.mkdir(parents=True,exist_ok=True)
 (out/'exercises.json').write_text(json.dumps({'edition':'2024 Adult','activities':rows},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (out/'exercise-source.json').write_text(json.dumps({'edition':'2024 Adult','ages':'19–59',
  'retrieved':'2026-11-02','source':BASE+'adult-compendium/', 'count':len(rows),
  'terms':'Free including commercial use; cite source; do not change MET values or combine different MET levels.',
  'formula':'gross kcal = MET * kg * minutes / 60; net kcal = max(0, MET - 1) * kg * minutes / 60',
  'pages':[info for _,info in parts]},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'Imported {len(rows)} official activities from {len(parts)} tables')
