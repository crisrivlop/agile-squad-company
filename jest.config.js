/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/demo*.ts',
    '!src/cli.ts',
    '!src/WebSearchTool.ts'
  ],
  coverageReporters: ['text', 'lcov']
};
