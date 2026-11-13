// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Title-ID context adapts MIT Material UI 9.5.0. See NOTICE and upstream/dialog-title.json.
import { createContext } from 'react';

// Keep the provider inside the dialog paper. Nested dialogs get their own ID,
// while standalone titles preserve their explicitly authored native identifier.
export const DialogContext = createContext<{ titleId?: string | undefined }>({});
DialogContext.displayName = 'DialogContext';
