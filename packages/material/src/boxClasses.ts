/* Classes adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/box.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { unstable_ClassNameGenerator } from './classNameGenerator';
export interface BoxClasses {
  root: string;
}
export type BoxClassKey = keyof BoxClasses;
// As upstream, this object captures utility generation when the module loads.
// Declaration augmentation does not add runtime slots to the pinned vocabulary.
export const boxClasses = {
  root: `${unstable_ClassNameGenerator.generate('MuiBox')}-root`,
} as BoxClasses;
