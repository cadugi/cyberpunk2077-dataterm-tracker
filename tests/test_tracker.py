import unittest,tempfile,json,copy,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tracker import parse_copy,compare,validate,publish
from synthetic_save import make_save
REF=json.loads((ROOT/'data/reference.json').read_text(encoding='utf-8'))
def extraction(points=None):
    pts=points or []
    return {'schema':1,'game_version':'2.50','source':'save-copy','complete':True,'registered_count':len(pts),'last_achievement_count':0,'points':pts,'errors':[]}
class TrackerTests(unittest.TestCase):
    def test_synthetic_save_parser_and_read_only_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            file=make_save(Path(tmp),[{'id':'12345','marker':'#invented','is_ep1':False},{'id':'67890','marker':'#invented2','is_ep1':True}]);before=file.read_bytes();ex=parse_copy(file.parent)
            self.assertEqual(ex['points'],[{'id':'12345','marker':'#invented','is_ep1':False},{'id':'67890','marker':'#invented2','is_ep1':True}]);self.assertEqual(file.read_bytes(),before)
    def test_unsupported_and_truncated_save_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            f=make_save(Path(tmp),[]);f.write_bytes(b'VASC'+bytes(8))
            with self.assertRaises(ValueError):parse_copy(f.parent)
            f.write_bytes(b'VASC')
            with self.assertRaises(ValueError):parse_copy(f.parent)
    def test_complete_vs_partial(self):
        ex=extraction();self.assertGreater(compare(REF,ex)['counts']['PENDIENTES'],100);ex['complete']=False;self.assertEqual(compare(REF,ex)['counts']['PENDIENTES'],0)
    def test_known_discovery_and_hidden_icon(self):
        p=next(x for x in REF['points'] if x['verified_destination']);ex=extraction([{'id':p['id'],'marker':'#test','is_ep1':False,'mappin_visible':False}]);r=compare(REF,ex);self.assertEqual(next(x for x in r['rows'] if x['id']==p['id'])['state'],'DESCUBIERTOS');self.assertEqual(r['achievement_count'],1)
    def test_camp_absence_is_never_second_required_camp(self):
        r=compare(REF,extraction());c=[p for p in r['rows'] if p.get('location_group')=='aldecaldos-camp'];self.assertEqual(len(c),2);self.assertTrue(all(p['state']=='NO VERIFICADOS' for p in c))
    def test_unknown_and_bad_ids(self):
        ex=extraction([{'id':'12345','is_ep1':False}]);self.assertIsNone(compare(REF,ex)['achievement_count']);ex['points'][0]['id']=12345
        with self.assertRaises(ValueError):validate(ex)
    def test_ep1_does_not_count(self):
        p=next(p for p in REF['points'] if p['scope']=='expansion');r=compare(REF,extraction([{'id':p['id'],'is_ep1':True}]));self.assertEqual(r['achievement_count'],0)
    def test_runtime_mismatch_suppresses_pending(self):
        ex=extraction();ex.update(source='cet',engine_achievement_count=555);self.assertEqual(compare(REF,ex)['counts']['PENDIENTES'],0)
    def test_reference_invariants(self):
        self.assertEqual(len(REF['points']),245);self.assertEqual(REF['location_groups_total'],164);self.assertEqual(len({p['id'] for p in REF['points']}),245)
        for p in REF['points']:
            if p['verified_destination']:self.assertTrue(p['world_evidence']);self.assertEqual(p['scope'],'base')
    def test_portable_output_has_no_personal_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            publish(extraction(),Path(tmp));self.assertTrue((Path(tmp)/'index.html').exists());self.assertTrue((Path(tmp)/'map.html').exists());self.assertIsNone(json.loads((Path(tmp)/'extraction.json').read_text()) .get('save_metadata'))
if __name__=='__main__':unittest.main()
