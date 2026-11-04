import base64
import hashlib
import io
import json
import pathlib
import tempfile
import unittest
import zipfile
from unittest.mock import patch
from artwork import sanitize_svg
from simple_icons_artwork import _index_icons, identity_key, normalize_company_name
import us_exchange_ticker_logo_artwork as logos

class ArtworkImportTests(unittest.TestCase):
    def test_issuer_matching_is_exact_and_ambiguity_remains_visible(self):
        names, _ = _index_icons([{'slug':'alpha-one','title':'Alpha Example Inc.'},{'slug':'alpha-two','title':'Alpha Example Corporation'}])
        self.assertEqual(names[normalize_company_name('Alpha Example PLC')], {'alpha-one','alpha-two'})
        self.assertNotIn(normalize_company_name('Alpha Example Payments'), names)
        self.assertNotEqual(identity_key({'name':'Alpha Example','listingCountry':'US'}), identity_key({'name':'Alpha Example','listingCountry':'GB'}))
        self.assertEqual(identity_key({'issuerId':'verified-issuer','name':'Other'}),'issuer-id:verified-issuer')

    def test_active_svg_and_external_requests_are_rejected(self):
        for body in [b'<script>alert(1)</script>',b'<image href="https://outside.example/image.png"/>',b'<path onclick="alert(1)"/>',b'<path fill="url(https://outside.example/paint)"/>',b'<foreignObject/>']:
            with self.assertRaises(ValueError):sanitize_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">'+body+b'</svg>')

    def test_opt_in_join_requires_country_venue_type_symbol_and_full_name(self):
        # A synthetic pinned archive exercises the resolver without network access.
        record={'symbol':'ABC','name':'Alpha Example Inc.','logoUrl':'https://cdn.jsdelivr.net/gh/fixture/logos/logos/_abc.png'}
        rows=[record]+[{'symbol':'OTHER'+str(i),'name':'Other Company','logoUrl':''} for i in range(999)]
        png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZb0AAAAASUVORK5CYII=')
        buffer=io.BytesIO()
        with zipfile.ZipFile(buffer,'w') as archive:
            archive.writestr('fixture/logos.json',json.dumps(rows));archive.writestr('fixture/logos/_abc.png',png)
        raw=buffer.getvalue()
        collection={**logos.COLLECTIONS[0],'repo':'fixture/logos','jsonFile':'logos.json','archiveSha256':hashlib.sha256(raw).hexdigest(),'archiveBytes':len(raw)}
        base={'instrumentType':'Equity','listingCountry':'US','mic':'XNAS','localSymbol':'ABC','name':'Alpha Example Corporation'}
        assets=[{**base,'assetId':'good'},*[{**base,'assetId':name,**change} for name,change in [('venue',{'mic':'XNYS'}),('country',{'listingCountry':'GB'}),('type',{'instrumentType':'ETF'}),('symbol',{'localSymbol':'ABCD'}),('company',{'name':'Alpha Example Payments'})]]]
        class Cache:
            def get(self,url):return raw,{'retrievedAt':'2026-11-04T00:00:00Z'}
        with tempfile.TemporaryDirectory() as folder, patch.object(logos,'COLLECTIONS',(collection,)):
            bundle=pathlib.Path(folder);(bundle/'logos').mkdir();files={}
            bindings, metadata, errors=logos.import_us_exchange_ticker_logos(assets,files,Cache(),sanitize_svg,bundle)
            self.assertEqual(set(bindings),{'good'});self.assertFalse(errors);self.assertFalse(metadata['defaultDistribution'])
            entry=files[bindings['good']['file']];self.assertTrue(entry['optInOnlyUnclearRights']);self.assertIn('No logo copyright or trademark grant',entry['rights'])
            self.assertEqual(entry['sourceRow']['venueMic'],'XNAS');self.assertEqual(entry['sourceRow']['ticker'],'ABC')
            self.assertNotIn(b'https://',next((bundle/'logos').iterdir()).read_bytes())
            with patch.object(logos,'COLLECTIONS',({**collection,'archiveSha256':'0'*64},)):
                with self.assertRaisesRegex(ValueError,'hash/size mismatch'):logos.import_us_exchange_ticker_logos(assets,{},Cache(),sanitize_svg,bundle)

if __name__ == '__main__':unittest.main()
