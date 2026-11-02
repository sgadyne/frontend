import {build} from 'vite';
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import {copyFile,mkdir} from 'node:fs/promises';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');
await build({root,configFile:false,esbuild:{jsx:'automatic'},define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:out,emptyOutDir:true,lib:{entry:path.join(root,'src/index.ts'),formats:['es'],fileName:()=> 'workspace-core.js'},rollupOptions:{external:['react','react-dom','react/jsx-runtime'],output:{assetFileNames:'workspace-core.css'}}}});
const require=createRequire(import.meta.url);for(const [name,license,target]of [['plotly.js-gl3d-dist-min','LICENSE','PLOTLY-LICENSE'],['motion','LICENSE.md','MOTION-LICENSE']])await copyFile(path.join(path.dirname(require.resolve(name+'/package.json')),license),path.join(out,target));
console.log('Independent core build complete; no private application or data integration was imported.');
