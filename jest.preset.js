const { workspaceRoot } = require('@nx/devkit');

module.exports = {
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  transform: {
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  coverageDirectory: `${workspaceRoot}/coverage`,
  coverageReporters: ['html'],
};
