module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '../tsconfig.json', useESM: true }] },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};