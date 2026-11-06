// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { parseSync } from '@babel/core';

/** System must stay installable without the higher-level Material package. */
export function assertSystemDeclarationIsolation(files) {
  for (const [file, source] of files) {
    const ast = parseSync(source, {
      filename: file,
      configFile: false,
      babelrc: false,
      parserOpts: { sourceType: 'module', plugins: [['typescript', { dts: true }]] },
    });
    const check = (specifier) => {
      if (
        typeof specifier === 'string' &&
        ['@altroo/mui-native', '@mui/material'].some(
          (name) => specifier === name || specifier.startsWith(name + '/'),
        )
      )
        throw new Error(`System declaration depends on Material: ${file}: ${specifier}`);
    };
    // Only leading triple-slash directives create dependencies. Ordinary prose,
    // block comments and references after a statement do not have that meaning.
    const codeStart = Math.min(
      source.length,
      ...[...(ast.program.body ?? []), ...(ast.program.directives ?? [])].map((node) => node.start),
    );
    for (const comment of ast.comments ?? []) {
      if (comment.type !== 'CommentLine' || comment.start >= codeStart) continue;
      const directive = comment.value.match(/^\/\s*<reference\s+([^>]*?)\/?>/);
      if (directive) check(directive[1].match(/\btypes\s*=\s*(['"])(.*?)\1/)?.[2]);
    }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const specifier =
        node.type === 'TSExternalModuleReference'
          ? node.expression?.value
          : node.type === 'TSImportType'
            ? node.argument?.value
            : node.type === 'TSModuleDeclaration'
              ? node.id?.value
              : node.source?.value;
      check(specifier);
      for (const [key, child] of Object.entries(node))
        if (!['loc', 'leadingComments', 'innerComments', 'trailingComments'].includes(key))
          visit(child);
    };
    visit(ast);
  }
}
