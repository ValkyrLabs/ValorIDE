const { transformSync } = require('esbuild');

module.exports = {
  process(source, filename) {
    const isTs = filename.endsWith('.ts');
    const isTsx = filename.endsWith('.tsx');
    const loader = isTs ? 'ts' : isTsx ? 'tsx' : 'js';

    const result = transformSync(source, {
      loader,
      format: 'cjs',
      target: 'es2020',
      sourcemap: 'inline',
      jsx: 'automatic',
    });

    return {
      code: result.code,
      map: result.map,
    };
  },
};
