import { createScopedStrykerConfig } from './stryker.shared.config.mjs';

export const mutationTestFiles = [
  'tests/unit/modules/refindery/**/*.unit.spec.ts',
  'tests/unit/modules/refindery/**/*.unit.test.ts',
];

export const mutationSourceFiles = [
  'src/modules/refindery/domain/**/*.ts',
  '!**/*.spec.ts',
  '!**/*.test.ts',
  '!**/index.ts',
  '!**/api-types.ts',
  '!**/*.gen.ts',
];

export default createScopedStrykerConfig({
  moduleName: 'refindery',
  mutationSourceFiles,
  mutationTestFiles,
  tsconfigFile: 'tsconfig.stryker.refindery.json',
});
