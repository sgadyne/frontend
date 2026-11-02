import ts from 'typescript';

/** TypeScript-only JSX transform for constrained Windows builds that block esbuild child processes. */
export function typescriptTransformPlugin() {
  return {
    name: 'component-typescript-transform',
    enforce: 'pre',
    transform(source, id) {
      const filename = id.split('?', 1)[0];
      if (!/\.(?:ts|tsx)$/.test(filename) || /\.d\.ts$/.test(filename) || filename.includes('/node_modules/')) return null;
      const result = ts.transpileModule(source, {
        fileName: filename,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
          importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        },
      });
      const error = result.diagnostics?.find(item => item.category === ts.DiagnosticCategory.Error);
      if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
      return {code: result.outputText, map: null};
    },
  };
}
