import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {handleRiskLensDemoRequest} from '../../packages/risk-lens-data/synthetic-api.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const sampo=process.env.SAMPO_SOURCE_ROOT;
if(!sampo)throw Error('Set SAMPO_SOURCE_ROOT to a qualified Sampo source checkout containing workspace-themes. This synthetic preview does not install a host-private package into apps.');
const middleware=server=>{server.middlewares.use((req,res,next)=>{void handleRiskLensDemoRequest(req,res).then(handled=>{if(!handled)next()}).catch(next)});};
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),esbuild:{jsx:'automatic'},resolve:{dedupe:['react','react-dom'],alias:{'@preview/optics':path.resolve(sampo,'packages/workspace-themes/src/optics/useOpticalScene.ts'),'@preview/interaction.css':path.resolve(sampo,'packages/workspace-themes/src/interaction/styles.css'),'@preview/themes':path.resolve(sampo,'packages/workspace-themes/src/index.mjs'),'@sampo/design-tokens':path.resolve(root,'node_modules/@sampo/design-tokens/src/index.mjs')}},plugins:[{name:'synthetic-only-risk',configureServer:middleware,configurePreviewServer:middleware}],server:{host:'127.0.0.1',port:5186,strictPort:true,fs:{allow:[root,sampo]}},preview:{host:'127.0.0.1',port:5186,strictPort:true},build:{outDir:'../../dist/analysis-demo',emptyOutDir:true}});
