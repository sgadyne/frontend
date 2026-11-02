import {defineConfig} from 'vite';import {fileURLToPath} from 'node:url';
import {handleRiskLensDemoRequest} from '../../packages/risk-lens-data/synthetic-api.mjs';
const middleware=server=>{server.middlewares.use((req,res,next)=>{void handleRiskLensDemoRequest(req,res).then(handled=>{if(!handled)next();}).catch(next);});};
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),esbuild:{jsx:'automatic'},plugins:[{name:'synthetic-risk-fixtures',configureServer:middleware,configurePreviewServer:middleware}],server:{host:'127.0.0.1',port:5179,strictPort:true,fs:{allow:[fileURLToPath(new URL('../..',import.meta.url))]}},preview:{host:'127.0.0.1',port:5179,strictPort:true},build:{outDir:'../../dist/risk-lens-demo',emptyOutDir:true}});
