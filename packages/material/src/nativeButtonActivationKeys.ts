import { createContext } from 'react';
// Native toggles use Space while ordinary ButtonBase controls retain Enter/Space.
export const NativeButtonActivationKeys = createContext<readonly string[]>(['Enter', ' ']);
