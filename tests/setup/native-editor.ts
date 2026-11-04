import { Platform, UIManager } from 'react-native';

// The Jest renderer has no application binary. Register the reviewed mock host
// explicitly; real native builds and the runtime keep their strict ABI guards.
beforeEach(() => {
  const method = UIManager.hasViewManagerConfig;
  const registered =
    (jest.isMockFunction(method) ? method.getMockImplementation() : method) ?? (() => false);
  jest
    .spyOn(UIManager, 'hasViewManagerConfig')
    .mockImplementation((name) => name === 'AltrooMUITextInput' || registered(name));
  jest.replaceProperty(Platform.constants, 'reactNativeVersion', {
    major: 0,
    minor: 88,
    patch: 1,
    prerelease: undefined,
  });
});
afterEach(() => jest.restoreAllMocks());

jest.mock('../../packages/native-host/src/nativeTextInputNativeComponent', () => ({
  ...jest.requireActual('../../packages/native-host/src/nativeTextInputNativeComponent'),
  EditorCommands: { setTextAndSelection: jest.fn(), focus: jest.fn(), blur: jest.fn() },
}));
