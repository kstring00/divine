export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest', sourceType: 'module',
      globals: { window:'readonly', document:'readonly', performance:'readonly', requestAnimationFrame:'readonly', cancelAnimationFrame:'readonly', localStorage:'readonly', navigator:'readonly', console:'readonly', setTimeout:'readonly', URL:'readonly', Blob:'readonly', innerWidth:'readonly', innerHeight:'readonly', devicePixelRatio:'readonly' }
    },
    rules: { 'no-unused-vars':['warn',{argsIgnorePattern:'^_'}], 'no-constant-binary-expression':'error' }
  },
  {
    files: ['src/sim/**/*.js','src/terrain/**/*.js','src/entities/**/*.js','src/systems/**/*.js'],
    rules: { 'no-restricted-imports':['error',{patterns:[{group:['**/rendering/**'],message:'Simulation code must never import from rendering/.'}]}] }
  }
];
