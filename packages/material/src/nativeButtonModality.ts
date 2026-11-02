// Only library-observed input and explicit focus requests are tracked. No device listeners.
let keyboard = true;
export const nativeButtonModality = {
  keyboard: () => {
    keyboard = true;
  },
  pointer: () => {
    keyboard = false;
  },
  isKeyboard: () => keyboard,
};
