export const packages = [
  ...['material', 'system', 'icons-material'].map((name) => ({
    name: `@mui/${name}`,
    family: 'core',
    repository: 'mui/material-ui',
    directory: `packages/mui-${name}`,
    channel: 'stable',
  })),
  ...['data-grid', 'date-pickers', 'charts', 'tree-view'].map((name) => ({
    name: `@mui/x-${name}`,
    family: `x-${name}`,
    repository: 'mui/mui-x',
    directory: `packages/x-${name}`,
    channel: 'stable',
  })),
  ...['scheduler', 'chat'].map((name) => ({
    name: `@mui/x-${name}`,
    family: `x-${name}`,
    repository: 'mui/mui-x',
    directory: `packages/x-${name}`,
    channel: 'preview',
  })),
];
export function assertEligible(name) {
  if (!packages.some((p) => p.name === name) || /-(pro|premium)(\/|$)/.test(name))
    throw new Error(`Package outside the MIT Community allowlist: ${name}`);
}
