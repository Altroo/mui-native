import { createContext } from 'react';
// Native anchored surfaces can wait for asynchronous geometry without changing
// their public `in` value or losing the initial appear lifecycle.
export const NativeTransitionReadiness = createContext(true);
