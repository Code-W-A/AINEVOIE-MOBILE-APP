module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/unit'],
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
  ],
};
