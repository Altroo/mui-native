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
// Source dependencies are monitored and licensed, but are not native import targets.
export const referenceDependencies = [
  {
    name: '@mui/utils',
    family: 'core',
    repository: 'mui/material-ui',
    directory: 'packages/mui-utils',
    channel: 'stable',
    role: 'reference-dependency',
  },
];
export const monitoredPackages = [...packages, ...referenceDependencies];
export function assertSourceEligible(name) {
  if (!monitoredPackages.some((pkg) => pkg.name === name) || /-(pro|premium)(\/|$)/.test(name))
    throw new Error(`Package outside the MIT Community allowlist: ${name}`);
}
export function assertEligible(name) {
  if (!packages.some((p) => p.name === name) || /-(pro|premium)(\/|$)/.test(name))
    throw new Error(`Package outside the MIT Community allowlist: ${name}`);
}
