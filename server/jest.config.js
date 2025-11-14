"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
    coverageDirectory: '<rootDir>/coverage',
    setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.ts'],
    projects: [
        {
            displayName: 'unit',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
        },
        {
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
        },
    ],
    moduleNameMapper: {
        '^#src/(.*)$': '<rootDir>/src/$1',
    },
    clearMocks: true,
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map