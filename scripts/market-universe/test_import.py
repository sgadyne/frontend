import unittest, pathlib, json, tempfile, io, zipfile
from unittest.mock import patch
import openpyxl
import refresh
from artwork import sanitize_svg
BASE={'id':'fixture','adapter':'nasdaq','mic':'XNAS','region':'Americas','country':'US','url':'https://example.test/directory','scope':'Fixture only','license':'Fixture','minRows':1}
class ImportTests(unittest.TestCase):
    def test_real_nasdaq_structure_and_footer(self):
        data=(pathlib.Path(__file__).parent/'fixtures/nasdaq.txt').read_bytes();rows,report=refresh.parse(BASE,data)
        self.assertEqual(len(rows),3);self.assertNotIn('currency',rows[0]);self.assertEqual(report['asof'],'2026-11-03')
        with self.assertRaisesRegex(ValueError,'footer'):refresh.parse(BASE,b'\n'.join(data.splitlines()[:-1]))
    def test_full_workbook_ignores_stale_dimension_and_keeps_zeros(self):
        sample=json.loads((pathlib.Path(__file__).parent/'fixtures/hkex.json').read_text());w=openpyxl.Workbook();s=w.active
        for row in sample['rows']:s.append(row)
        out=io.BytesIO();w.save(out);bad=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(out.getvalue())) as z,zipfile.ZipFile(bad,'w') as dest:
            for item in z.infolist():
                data=z.read(item.filename)
                if item.filename=='xl/worksheets/sheet1.xml':
                    import re;data=re.sub(b'<dimension ref="[^"]+"',b'<dimension ref="A1:R4"',data)
                dest.writestr(item,data)
        rows,report=refresh.parse({**BASE,'adapter':'hkex','mic':'XHKG','country':'HK'},bad.getvalue())
        self.assertEqual(len(rows),len(sample['rows'])-3);self.assertEqual(rows[0]['localSymbol'],'00001')
        self.assertEqual(rows[0]['currency'],'HKD')
    def test_global_symbol_identity_and_numeric_normalization(self):
        a=refresh.listing(BASE,'0010','One');b=refresh.listing({**BASE,'mic':'XNYS'},'0010','Other')
        self.assertNotEqual(refresh.canonical(a),refresh.canonical(b));self.assertEqual(a['localSymbol'],'0010')
        hk=refresh.listing({**BASE,'mic':'XHKG'},'700','Tencent');self.assertEqual(hk['localSymbol'],'00700');self.assertEqual(hk['sourceSymbols']['provider'],'700')
    def test_alternate_names_retain_every_contributing_source_on_replay(self):
        preferred={'name':'官方名'}
        refresh.supplement_alternate_name(preferred,{'name':'Official English Name'},'official')
        refresh.supplement_alternate_name(preferred,{'name':'Provider English Name'},'provider')
        before=json.dumps(preferred,sort_keys=True)
        refresh.supplement_alternate_name(preferred,{'name':'Official English Name'},'official')
        self.assertEqual(preferred['metadataFieldSources']['alternateNames'],['official','provider'])
        self.assertEqual(json.dumps(preferred,sort_keys=True),before)
    def test_provider_truncation_is_not_a_complete_snapshot(self):
        class Fake:
            def get(self,url,body=None):
                start=body['range'][0];n=1000 if start==0 else 0
                rows=[{'s':'SSE:'+str(i),'d':[str(i),'Company','SSE','CNY','stock','common',None]} for i in range(n)]
                return json.dumps({'totalCount':1001,'data':rows}).encode(),{'retrievedAt':'2026-11-03T00:00:00Z'}
        with self.assertRaisesRegex(ValueError,'Truncated'):refresh.tradingview({**BASE,'exchange':'SSE'},Fake())
    def test_failed_source_retains_last_good(self):
        class Failed:
            def get(self,*args,**kwargs):raise ValueError('Source unavailable')
        with tempfile.TemporaryDirectory() as d,patch.object(refresh,'BUNDLE',pathlib.Path(d)):
            p=pathlib.Path(d)/'snapshots/fixture.json';p.parent.mkdir();old={'rows':[{'ticker':'OLD'}],'report':{'retrievedAt':'2026-10-31T00:00:00Z'}};refresh.write_json(p,old)
            report=refresh.run_source(BASE,Failed());self.assertEqual(report['status'],'error-retained');self.assertEqual(json.loads(p.read_text()),old)
    def test_missing_fields_fail_instead_of_guessing(self):
        with self.assertRaises(ValueError):refresh.listing(BASE,'','Missing')
        data=b'SYMBOL,NAME OF COMPANY, SERIES\nABC,Example,EQ\n';rows,_=refresh.parse({**BASE,'adapter':'nse'},data)
        self.assertNotIn('currency',rows[0]);self.assertNotIn('isin',rows[0])
    def test_fetch_cache_is_idempotent_and_offline(self):
        class Response:
            status_code=200;headers={'Content-Type':'text/plain','ETag':'test'};content=b'directory'
            def raise_for_status(self):pass
            def iter_content(self,chunk_size):return [self.content]
            def close(self):pass
        with tempfile.TemporaryDirectory() as d,patch.object(refresh.requests,'request',return_value=Response()) as request:
            f=refresh.Fetcher(d);first=f.get('https://example.test/dir');second=f.get('https://example.test/dir');self.assertEqual(first,second);self.assertEqual(request.call_count,1)
            self.assertEqual(refresh.Fetcher(d,offline=True).get('https://example.test/dir'),first)
    def test_svg_refuses_html_scripts_external_refs_and_bounds(self):
        for value in [b'<html>error</html>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script/></svg>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><use href="https://example.test/x"/></svg>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99999 10"/>']:
            with self.assertRaises(ValueError):sanitize_svg(value)
        self.assertIn(b'<rect',sanitize_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'))
if __name__=='__main__':unittest.main()
