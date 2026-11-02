import postcss from 'postcss';

const DEFAULT_ROOTS = ['risk-lens-shell', 'risk-lens-widget', 'risk-lens-portal-root'];

function splitSelectorList(selector) {
  const result = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ''; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === ',' && parentheses === 0 && brackets === 0) {
      result.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(selector.slice(start).trim());
  return result.filter(Boolean);
}

function isKeyframesStep(rule) {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true;
  }
  return false;
}

export function scopeWidgetCss(css) {

  const prefix = `:where(${DEFAULT_ROOTS.map(name => `.${name}`).join(', ')})`;
  const rootClass = new RegExp(`^\\s*\\.(?:${DEFAULT_ROOTS.join('|')})(?=[\\s.#:[>+~,*]|$)`);
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isKeyframesStep(rule)) return;
    const selectors = splitSelectorList(rule.selector);
    if (!selectors.length) return;
    for (const selector of selectors) {
      if (/^(?:html|body|:root)(?:\b|[.#:[>+~])/i.test(selector)) {
        throw new Error(`Private CSS contains a document-global selector: ${selector}`);
      }
    }
    rule.selector = selectors.map((selector) => rootClass.test(selector) || selector.startsWith(prefix)
      ? selector : `${prefix} ${selector}`).join(', ');
  });
  return root.toString();
}

/** Build-time scoping after Vite has combined imports, including the private tokens. */
export function widgetCssScopePlugin() {
  return {
    name: 'component-css-scope',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'asset' && output.fileName.toLowerCase().endsWith('.css')) {
          output.source = scopeWidgetCss(String(output.source));
        }
      }
    },
  };
}
