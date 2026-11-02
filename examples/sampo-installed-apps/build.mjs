import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {resolve} from 'node:path';
const cwd=fileURLToPath(new URL('.',import.meta.url)),root=resolve(cwd,'../..');
const run=(path,args=[])=>execFileSync(process.execPath,[resolve(root,path),...args],{cwd,stdio:'inherit'});
run('node_modules/vite/bin/vite.js',['build']);
for(const app of ['risk','vfo','cluster','replication']){run('examples/sampo-installed-apps/manifest.mjs',[app]);run('node_modules/@sampo/tooling/src/cli.mjs',['pack','dist-'+app,resolve(root,'.review/installed-'+app+'-layout')]);}
