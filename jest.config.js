/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            dynamicImport: true
          },
          transform: {
            react: {
              runtime: 'automatic'
            }
          }
        }
      }
    ]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
    '<rootDir>/tests/**/*.spec.[jt]s?(x)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node']
};
