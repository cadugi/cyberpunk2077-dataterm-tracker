import unittest,tempfile,json,sys
from pathlib import Path
from unittest.mock import patch
import tracker
class RuntimeTests(unittest.TestCase):
 def test_normal_launch_opens_generated_report(self):
  ex={'schema':1,'game_version':'2.50','source':'synthetic','complete':True,'registered_count':0,'points':[],'errors':[]}
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);source=root/'input.json';source.write_text(json.dumps(ex));out=root/'report'
   with patch.object(sys,'argv',['tracker','--import-json',str(source),'--output',str(out)]),patch.object(tracker.webbrowser,'open',return_value=True) as open_browser:
    tracker.main()
   open_browser.assert_called_once_with((out.resolve()/'index.html').as_uri())
   self.assertTrue((out/'index.html').exists())
 def test_runtime_check_has_no_browser_side_effect(self):
  with patch.object(sys,'argv',['tracker','--check-runtime']),patch.object(tracker.webbrowser,'open') as open_browser:
   tracker.main()
  open_browser.assert_not_called()
