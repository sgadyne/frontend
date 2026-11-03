import {defineConfig} from 'vite';
import postcss from 'postcss';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {relative,resolve} from 'node:path';
const directory=fileURLToPath(new URL('.',import.meta.url)),root=resolve(directory,'../..');
const shared=new Set(['react','react/jsx-runtime','react/jsx-dev-runtime','react-dom','react-dom/client','@sampo/sdk-react','@sampo/contracts']);
export default defineConfig(({mode})=>{
  if(!['risk','vfo','cluster','replication'].includes(mode))throw Error('Select one app with --mode risk|vfo|cluster|replication');
  return {base:"./",root:directory,esbuild:{jsx:'automatic'},plugins:[{
    name:'scope-installed-app-css',enforce:'post',
    generateBundle:{order:'post',async handler(_options,bundle){
      const modules=new Set(),imports=new Set();
      for(const asset of Object.values(bundle)){
        if(asset.type==='chunk'){
          for(const id of Object.keys(asset.modules))modules.add(relative(root,id).split('\\').join('/'));
          for(const id of [...asset.imports,...asset.dynamicImports])imports.add(id);
        }
        if(asset.type!=='asset'||!asset.fileName.endsWith('.css'))continue;
        const css=postcss.parse(String(asset.source));
        const animations=new Map();
        css.walkAtRules(rule=>{if(/keyframes$/i.test(rule.name)){const original=rule.params.trim();const scoped='fixture-'+mode+'-'+original;animations.set(original,scoped);rule.params=scoped;}});
        css.walkDecls(declaration=>{
          if(!/^(?:-webkit-)?animation(?:-name)?$/.test(declaration.prop))return;
          for(const [original,scoped] of animations)declaration.value=declaration.value.replace(new RegExp('(?<![a-zA-Z0-9_-])'+original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-zA-Z0-9_-])','g'),scoped);
        });
        css.walkRules(rule=>{
          for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule'&&/keyframes$/i.test(p.name))return;
          rule.selectors=rule.selectors.map(selector=>{
            const value=selector.replace(/^(html|body|:root)\b/,'.sampo-analysis-fixture');
            const suffix=value.match(/::[\w-]+(?:\([^)]*\))?(?::[\w-]+(?:\([^)]*\))?)?$/)?.[0]??'';
            const target=suffix?value.slice(0,-suffix.length):value;
            return target+':where(.sampo-analysis-fixture,.sampo-analysis-fixture *,.risk-lens-portal-root,.risk-lens-portal-root *,.frontend-presentation:has(>.sampo-analysis-fixture))'+suffix;
          });
        });
        asset.source=css.toString();
      }
      const report={app:mode,entry:mode+'-entry.tsx',modules:[...modules].sort(),imports:[...imports].sort(),
        outputs:Object.values(bundle).map(a=>({file:a.fileName,bytes:Buffer.byteLength(a.type==='chunk'?a.code:a.source)}))};
      await mkdir(resolve(root,'.review/app-closures'),{recursive:true});
      await writeFile(resolve(root,'.review/app-closures',mode+'.json'),JSON.stringify(report,null,2)+'\n');
    }}
  }],build:{outDir:'dist-'+mode,emptyOutDir:true,cssCodeSplit:false,minify:true,target:'es2022',rollupOptions:{
    input:resolve(directory,mode+'-entry.tsx'),external:id=>shared.has(id),preserveEntrySignatures:'strict',
    output:{format:'es',entryFileNames:'entry.mjs',chunkFileNames:'chunks/[name]-[hash].mjs',assetFileNames:'assets/[name][extname]'}
  }}};
});
