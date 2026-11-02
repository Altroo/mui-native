module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@altroo/mui-native-x-(.*)$': '<rootDir>/packages/x-$1/src',
    '^@altroo/mui-native-system$': '<rootDir>/packages/system/src',
    '^@altroo/mui-native$': '<rootDir>/packages/material/src',
    '^@altroo/mui-native-icons$': '<rootDir>/packages/icons/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|react-native/|@react-native/|react-native-svg/|@shopify/flash-list/)',
  ],
};
