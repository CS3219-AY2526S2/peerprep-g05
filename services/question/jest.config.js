/** @type {import('jest').Config} */
export default {
    transform: {},
    testMatch: ["**/tests/**/*.test.js"],
    testEnvironment: "node",
    coverageDirectory: "coverage",
    collectCoverageFrom: [
        "api/**/*.js",
        "infrastructure/**/*.js",
        "!**/node_modules/**",
    ],
};
