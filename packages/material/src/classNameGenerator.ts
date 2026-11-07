/* Generator adapts MIT MUI Utils 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/box.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
const identity = (componentName: string) => componentName;
let generate = identity;
/** Canonical configuration object shared by participating native component families. */
export const unstable_ClassNameGenerator = {
  configure(generator: (componentName: string) => string): void {
    generate = generator;
  },
  generate(componentName: string): string {
    return generate(componentName);
  },
  reset(): void {
    generate = identity;
  },
};
