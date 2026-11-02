"""Download only food JSON files from the user-selected source, pinned to a commit.
No OCR/model API is called. Raw files stay under work/food-source for provenance.
"""
import json, urllib.request, urllib.parse, concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'work'/'food-source';out.mkdir(parents=True,exist_ok=True)
PINNED='d15675c27582748307023b7ee7aca2a63fc52756'
if not (out/'tree.json').exists():
    request=urllib.request.Request('https://api.github.com/repos/Sanotsu/china-food-composition-data/git/trees/'+PINNED+'?recursive=1',headers={'User-Agent':'LovelyRabbit-local-import'})
    (out/'tree.json').write_bytes(urllib.request.urlopen(request,timeout=30).read())
tree=json.loads((out/'tree.json').read_text(encoding='utf-8'))
if tree['sha']!=PINNED:raise RuntimeError('Unexpected source commit; inspect before changing the pinned version')
sha=tree['sha']
paths=[x['path'] for x in tree['tree'] if x['path'].startswith('json_data_v3_20260825_qwen38max_kimi_k3_fixed/') and '/merged_' in x['path'] and x['path'].endswith('.json')]
if not paths: raise RuntimeError('No supported food JSON directory; inspect source before importing')
def get(p):
    dest=out/'fixed'/Path(p).name;dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():return
    url='https://raw.githubusercontent.com/Sanotsu/china-food-composition-data/'+sha+'/'+urllib.parse.quote(p)
    for attempt in range(3):
        try:
            data=urllib.request.urlopen(url,timeout=30).read()
            json.loads(data)
            dest.write_bytes(data)
            return
        except Exception:
            if attempt==2:raise
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:list(ex.map(get,paths))
print('Downloaded',len(paths),'files at',sha,flush=True)
sample=json.loads((out/'fixed'/Path(paths[0]).name).read_text(encoding='utf-8'))
print(json.dumps(sample[:1] if isinstance(sample,list) else sample,ensure_ascii=False)[:2200],flush=True)

