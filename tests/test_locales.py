import unittest,json,re,tempfile
from pathlib import Path
import tracker
ROOT=Path(__file__).resolve().parents[1]
class LocaleTests(unittest.TestCase):
 def test_key_and_placeholder_parity(self):
  data=tracker.LOCALES
  self.assertEqual(set(data['en']),set(data['es']))
  for key,value in data['en'].items():self.assertEqual(set(re.findall(r'{(\w+)}',value)),set(re.findall(r'{(\w+)}',data['es'][key])),key)
  bundle=(ROOT/'locales.js').read_text(encoding='utf-8')
  self.assertEqual(json.loads(bundle.removeprefix('window.TRACKER_LOCALES=').strip().removesuffix(';')),data)
 def test_bilingual_export(self):
  ex={'schema':1,'game_version':'2.50','source':'synthetic','complete':True,'registered_count':0,'points':[],'errors':[]}
  for lang in ['en','es']:
   with self.subTest(lang=lang),tempfile.TemporaryDirectory() as tmp:
    out=Path(tmp);tracker.publish(ex,out,lang)
    self.assertIn('window.TRACKER_DEFAULT_LANGUAGE="'+lang+'"',(out/'extraction.js').read_text())
    self.assertIn('state_code',(out/'comparison.csv').read_text(encoding='utf-8-sig'))
    for name in ['REPORT.md','RESULTADO.md','locales.js','i18n.js']:self.assertTrue((out/name).exists())
    self.assertIn(tracker.LOCALES['en']['reportMissing'],(out/'REPORT.md').read_text(encoding='utf-8'))
    self.assertIn(tracker.LOCALES['es']['reportMissing'],(out/'RESULTADO.md').read_text(encoding='utf-8'))
