"""Generate the file://-compatible browser bundle from the shared locale data."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/locales.json').read_text(encoding='utf-8'))
assert set(data['en'])==set(data['es']), 'Locale keys must match'
(ROOT/'locales.js').write_text('window.TRACKER_LOCALES='+json.dumps(data,ensure_ascii=True,separators=(',',':'))+';\n',encoding='utf-8')
