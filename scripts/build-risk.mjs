import {build} from 'vite';
import path from 'node:path';
const external=['react','react/jsx-runtime','react-dom','react-dom/client','@sampo/contracts','@sampo/sdk-react'];
await build({configFile:false,root:process.cwd(),esbuild:{jsx:'automatic'},build:{outDir:'dist/risk-lens',emptyOutDir:true,target:'es2022',lib:{entry:path.resolve('apps/pod-risk-lens/src/index.ts'),formats:['es'],fileName:()=> 'index.mjs'},rollupOptions:{external}}});
