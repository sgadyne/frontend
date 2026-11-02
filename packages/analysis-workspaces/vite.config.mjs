import {defineConfig} from 'vite';

const peers = new Set(['react', 'react/jsx-runtime', 'react-dom', '@sampo/contracts', '@sampo/sdk-react']);
export default defineConfig({build: {
  outDir: 'dist', emptyOutDir: true, target: 'es2022', cssCodeSplit: false,
  rollupOptions: {input: 'src/index.tsx', external: id => peers.has(id), preserveEntrySignatures: 'strict',
    output: {format: 'es', entryFileNames: 'entry.mjs', assetFileNames: 'assets/[name][extname]'}},
}});
