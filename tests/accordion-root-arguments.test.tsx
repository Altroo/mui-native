// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { forwardRef } from 'react';
import { View, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { Accordion, ThemeProvider, createTheme } from '@altroo/mui-native';
import reference from './fixtures/mui-accordion-9.5.0.json';

afterEach(cleanup);

test.each(reference.rootArguments)(
  'matches pinned original styled root arguments: $mode',
  ({ mode, seen: expected }) => {
    const seen: unknown[] = [];
    const Component = forwardRef<ViewInstance, { children?: React.ReactNode }>(function Component(
      { children },
      ref,
    ) {
      return <View ref={ref}>{children}</View>;
    });
    Component.displayName = 'Component';
    const theme = createTheme({
      components: {
        MuiAccordion: {
          styleOverrides: {
            root: (args) => {
              if (!String(args.className).split(/\s+/).includes('MuiAccordion-root')) return {};
              const scalar: Record<string, unknown> = {};
              for (const key of [
                'disabled',
                'expanded',
                'disableGutters',
                'defaultExpanded',
                'onChange',
                'classes',
                'component',
                'style',
                'sx',
                'slots',
                'slotProps',
              ]) {
                const value = args[key];
                scalar[key] = {
                  present: Object.hasOwn(args, key),
                  value:
                    key === 'component'
                      ? ((value as { displayName?: string })?.displayName ?? value ?? null)
                      : typeof value === 'function'
                        ? 'function'
                        : (value ?? null),
                };
              }
              const owner = args.ownerState as { expanded?: boolean; extra?: unknown };
              seen.push({
                keys: Object.keys(args).sort(),
                scalar,
                children: React.Children.toArray(args.children as React.ReactNode).map((node) => {
                  const child = node as React.ReactElement<{
                    className?: string;
                    in?: boolean;
                    timeout?: string;
                    ownerState?: { expanded?: boolean };
                  }>;
                  return {
                    className: child.props.className ?? null,
                    expanded: child.props.in ?? null,
                    timeout: child.props.timeout ?? null,
                    ownerExpanded: child.props.ownerState?.expanded ?? null,
                  };
                }),
                owner: { expanded: owner.expanded, extra: owner.extra ?? null },
              });
              return {};
            },
          },
        },
      },
    });
    // Native-only slot owner extensions exercise the same runtime merge as the
    // source fixture without widening the public augmentation contract.
    const props: Record<string, unknown> = {};
    if (mode !== 'defaults')
      Object.assign(props, {
        defaultExpanded: true,
        disabled: true,
        disableGutters: true,
        component: Component,
        classes: { root: 'authored-root' },
        style: { paddingTop: 7, paddingBottom: 11 },
        sx: { opacity: 0.8 },
        onChange() {},
      });
    if (mode === 'slot-overrides')
      props.slotProps = {
        root: {
          component: undefined,
          classes: { root: 'slot-root' },
          style: { paddingBottom: 13 },
          sx: undefined,
          disabled: false,
          ownerState: { extra: 'kept', expanded: false },
        },
      };
    render(
      <ThemeProvider theme={theme}>
        <Accordion {...props}>
          <View id="summary" aria-controls="body" />
          <View />
        </Accordion>
      </ThemeProvider>,
    );
    expect(seen).toEqual(expected);
  },
);
