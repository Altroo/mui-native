// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import type { CatalogRoute } from './catalogSections';

/** The index is the catalog root; leaving a specimen returns to the same search. */
export function useCatalogNavigation() {
  const [section, setSection] = useState<CatalogRoute>('Explore');
  const navigate = useCallback((route: CatalogRoute) => {
    Keyboard.dismiss();
    setSection(route);
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (section === 'Explore') return false;
      navigate('Explore');
      return true;
    });
    return () => subscription.remove();
  }, [section, navigate]);
  return { section, navigate };
}
