// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StructuralObservationProbe } from './StructuralObservationProbe';
import { createStructuralObserverClient } from '../../packages/native-host/src/structuralObserverClient';
import native from '../../packages/native-host/src/NativeAltrooStructuralObserver';
const createClient = () => createStructuralObserverClient();
const diagnostics = () => {
  if (!native) throw Error('Rebuild the development app with the structural observer before this probe');
  return native.getDiagnostics();
};
/** Internal native dependency fixture, not a Material component. */
export function StructuralObservationProbeEntry() {
  return <StructuralObservationProbe createClient={createClient} diagnostics={diagnostics} />;
}
