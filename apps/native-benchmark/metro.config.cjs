// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
const { getDefaultConfig } = require('expo/metro-config');
const { withMuiNative } = require('@altroo/mui-native-compat/metro');
module.exports = withMuiNative(getDefaultConfig(__dirname));
