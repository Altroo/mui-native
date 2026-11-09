// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/native-editor.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  // Unpacked consumer archives must not become duplicate Haste packages.
  modulePathIgnorePatterns: ['<rootDir>/.cache/'],
  moduleNameMapper: {
    // Internal first-party imports must share source context and style carriers.
    '^@altroo/mui-native/internal/card-content$':
      '<rootDir>/packages/material/src/internal/card-content',
    '^@altroo/mui-native-host/internal/owned-view$':
      '<rootDir>/packages/native-host/src/internal/owned-view',
    '^@altroo/mui-native-system/internal/generated-paragraph$':
      '<rootDir>/packages/system/src/internal/generated-paragraph',
    '^@altroo/mui-native-system/internal/prepared-style$':
      '<rootDir>/packages/system/src/internal/prepared-style',
    '^@altroo/mui-native-x-(.*)$': '<rootDir>/packages/x-$1/src',
    '^@altroo/mui-native-system$': '<rootDir>/packages/system/src',
    '^@altroo/mui-native-host$': '<rootDir>/packages/native-host/src',
    '^@altroo/mui-native$': '<rootDir>/packages/material/src',
    '^@altroo/mui-native-icons$': '<rootDir>/packages/icons/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|react-native/|@react-native/|react-native-svg/|@shopify/flash-list/)',
  ],
};
