export default {
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      useESM: true,
      diagnostics: false,
    }],
  },
  testEnvironment: 'node',
  testRegex: '/__tests__/.*\\.(test|spec)?\\.(ts|tsx|js)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@ainblockchain/ain-js$': '<rootDir>/__mocks__/@ainblockchain/ain-js.ts',
    '^ethers$': '<rootDir>/__mocks__/ethers.ts',
    '^express$': '<rootDir>/__mocks__/express.ts',
  },
};
