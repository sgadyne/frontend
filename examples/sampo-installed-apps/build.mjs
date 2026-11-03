import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,rmSync,writeFileSync} from 'node:fs';
const cwd=fileURLToPath(new URL('.',import.meta.url)),root=resolve(cwd,'../..');
const run=(path,args=[])=>execFileSync(process.execPath,[resolve(root,path),...args],{cwd,stdio:'inherit'});
const ownership={risk:['apps/pod-risk-lens/','packages/risk-lens-data/','examples/sampo-installed-apps/RiskApp.tsx','examples/sampo-installed-apps/risk-fixture.ts'],
  vfo:['packages/vfo-workspace-core/','assets/market-universe/','examples/sampo-installed-apps/VfoMarket.tsx','examples/sampo-installed-apps/market-universe-data.ts','examples/sampo-installed-apps/coverage-fixture.json'],
  cluster:['packages/analysis-workspaces/src/cluster/','examples/sampo-installed-apps/ClusterApp.tsx','examples/sampo-installed-apps/cluster-data.tsx'],
  replication:['packages/analysis-workspaces/src/replication/','packages/analysis-workspaces/tests/fixtures/reports','examples/sampo-installed-apps/ReplicationApp.tsx','examples/sampo-installed-apps/replication-data.tsx']};
const packages=[];
for(const app of Object.keys(ownership)){
  run('node_modules/vite/bin/vite.js',['build','--mode',app]);
  const report=JSON.parse(readFileSync(resolve(root,'.review/app-closures',app+'.json'),'utf8'));
  for(const [other,prefixes] of Object.entries(ownership))if(other!==app){
    const leaks=report.modules.filter(id=>!['packages/vfo-workspace-core/src/market/universe-model.ts','packages/analysis-workspaces/src/replication/widgets.tsx','packages/analysis-workspaces/src/replication/replication.css'].includes(id)&&prefixes.some(prefix=>id.startsWith(prefix)));
    if(leaks.length)throw Error(app+' includes '+other+'-only modules: '+leaks.join(', '));
  }
  if(report.modules.some(id=>/node_modules\/(?:react(?:-dom)?\/|@sampo\/(?:sdk-react|contracts)\/)/.test(id)))
    throw Error('React and Sampo SDK must remain host externals');
  run('examples/sampo-installed-apps/manifest.mjs',[app]);
  rmSync(resolve(root,'.review/installed-'+app+'-layout'),{recursive:true,force:true});
  run('node_modules/@sampo/tooling/src/cli.mjs',['pack','dist-'+app,resolve(root,'.review/installed-'+app+'-layout')]);
  const manifest=JSON.parse(readFileSync(resolve(cwd,'dist-'+app,'manifest.json'),'utf8'));
  const index=JSON.parse(readFileSync(resolve(root,'.review/installed-'+app+'-layout/index.json'),'utf8'));
  packages.push({app,id:manifest.id,version:manifest.version,sdk:manifest.runtime.sdk,digest:index.manifests[0].digest,
    layout:'.review/installed-'+app+'-layout',modules:report.modules.length,imports:report.imports,outputs:report.outputs});
}
writeFileSync(resolve(root,'.review/installed-packages.json'),JSON.stringify({sourceSha:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),packages},null,2)+'\n');
console.log('Four independent app closures packed; module and byte receipts: .review/app-closures');
