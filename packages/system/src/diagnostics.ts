export type Diagnostic = { code: string; message: string };
let handler: (diagnostic: Diagnostic) => void = ({ code, message }) => {
  console.warn(`[mui-native:${code}] ${message}`);
};
export function configureDiagnostics(next: (diagnostic: Diagnostic) => void) {
  const previous = handler;
  handler = next;
  return () => {
    handler = previous;
  };
}
export function diagnostic(code: string, message: string) {
  handler({ code, message });
}
