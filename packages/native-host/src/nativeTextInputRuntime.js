/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* Native editor adapter of React Native 0.88.1. The upstream notice above applies.
 * Altroo substitutes native host identity while retaining text/ref synchronization. */
import {
  usePressability,
  StyleSheet,
  Text,
  unstable_TextAncestorContext as TextAncestorContext,
  Platform,
  UIManager,
} from 'react-native';
import useMergeRefs from 'react-native/Libraries/Utilities/useMergeRefs';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';
import { invariant, nullthrows, assertNativeInputBaseline } from './nativeInputAssertions';
import * as React from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { jsx as _jsx } from 'react/jsx-runtime';
const flattenStyle = StyleSheet.flatten;
assertNativeInputBaseline(
  require('react-native/package.json').version,
  Platform.constants.reactNativeVersion,
  UIManager.hasViewManagerConfig('AltrooMUITextInput'),
);
let AndroidTextInput;
let AndroidTextInputCommands;
let RCTSinglelineTextInputView;
let RCTSinglelineTextInputNativeCommands;
let RCTMultilineTextInputView;
let RCTMultilineTextInputNativeCommands;
if (Platform.OS === 'android') {
  AndroidTextInput = require('./nativeTextInputNativeComponent').default;
  AndroidTextInputCommands = require('./nativeTextInputNativeComponent').EditorCommands;
} else if (Platform.OS === 'ios') {
  RCTSinglelineTextInputView = require('./nativeTextInputNativeComponent').default;
  RCTSinglelineTextInputNativeCommands = require('./nativeTextInputNativeComponent').EditorCommands;
  RCTMultilineTextInputView = require('./nativeTextInputNativeComponent').default;
  RCTMultilineTextInputNativeCommands = require('./nativeTextInputNativeComponent').EditorCommands;
}
const emptyFunctionThatReturnsTrue = () => true;
/** Keep controlled text/selection updates ordered by the native event count. */
function useTextInputStateSynchronization({
  props,
  mostRecentEventCount,
  selection,
  inputRef,
  text,
  viewCommands,
}) {
  const [lastNativeText, setLastNativeText] = useState(props.value);
  const [lastNativeSelectionState, setLastNativeSelection] = useState({
    mostRecentEventCount,
    selection: {
      end: -1,
      start: -1,
    },
  });
  const lastNativeSelection = lastNativeSelectionState.selection;
  useLayoutEffect(() => {
    const nativeUpdate = {};
    if (lastNativeText !== props.value && typeof props.value === 'string') {
      nativeUpdate.text = props.value;
      setLastNativeText(props.value);
    }
    if (
      selection &&
      lastNativeSelection &&
      (lastNativeSelection.start !== selection.start || lastNativeSelection.end !== selection.end)
    ) {
      nativeUpdate.selection = selection;
      setLastNativeSelection({
        mostRecentEventCount,
        selection,
      });
    }
    if (Object.keys(nativeUpdate).length === 0) {
      return;
    }
    if (inputRef.current != null) {
      viewCommands.setTextAndSelection(
        inputRef.current,
        mostRecentEventCount,
        text,
        selection?.start ?? -1,
        selection?.end ?? -1,
      );
    }
  }, [
    mostRecentEventCount,
    inputRef,
    props.value,
    props.defaultValue,
    lastNativeText,
    selection,
    lastNativeSelection,
    text,
    viewCommands,
  ]);
  return {
    setLastNativeSelection,
    setLastNativeText,
  };
}
function InternalTextInput(props) {
  const {
    'aria-busy': ariaBusy,
    'aria-checked': ariaChecked,
    'aria-disabled': ariaDisabled,
    'aria-expanded': ariaExpanded,
    'aria-selected': ariaSelected,
    accessibilityState,
    id,
    tabIndex,
    selection: propsSelection,
    selectionColor,
    selectionHandleColor,
    cursorColor,
    ...otherProps
  } = props;
  const inputRef = useRef(null);
  const selection =
    propsSelection == null
      ? null
      : {
          end: propsSelection.end ?? propsSelection.start,
          start: propsSelection.start,
        };
  const text =
    typeof props.value === 'string'
      ? props.value
      : typeof props.defaultValue === 'string'
        ? props.defaultValue
        : undefined;
  const viewCommands =
    AndroidTextInputCommands ||
    (props.multiline === true
      ? RCTMultilineTextInputNativeCommands
      : RCTSinglelineTextInputNativeCommands);
  const [mostRecentEventCount, setMostRecentEventCount] = useState(0);
  const { setLastNativeText, setLastNativeSelection } = useTextInputStateSynchronization({
    inputRef,
    mostRecentEventCount,
    props,
    selection,
    text,
    viewCommands,
  });
  useLayoutEffect(() => {
    const inputRefValue = inputRef.current;
    if (inputRefValue != null) {
      TextInputState.registerInput(inputRefValue);
      return () => {
        if (TextInputState.currentlyFocusedInput() === inputRefValue) {
          nullthrows(inputRefValue).blur();
        }
        TextInputState.unregisterInput(inputRefValue);
      };
    }
  }, []);
  const setLocalRef = useCallback(
    (instance) => {
      inputRef.current = instance;
      if (instance != null) {
        // Register before forwarding the ref so immediate caller focus uses the shared registry.
        TextInputState.registerInput(instance);
        Object.assign(instance, {
          clear() {
            if (inputRef.current != null) {
              viewCommands.setTextAndSelection(inputRef.current, mostRecentEventCount, '', 0, 0);
            }
          },
          getNativeRef() {
            return inputRef.current;
          },
          isFocused() {
            const currentlyFocusedInput = TextInputState.currentlyFocusedInput();
            return currentlyFocusedInput != null && currentlyFocusedInput === inputRef.current;
          },
          setSelection(start, end) {
            if (inputRef.current != null) {
              viewCommands.setTextAndSelection(
                inputRef.current,
                mostRecentEventCount,
                null,
                start,
                end,
              );
            }
          },
        });
      }
    },
    [mostRecentEventCount, viewCommands],
  );
  const ref = useMergeRefs(setLocalRef, props.forwardedRef);
  const _onChange = (event) => {
    const currentText = event.nativeEvent.text;
    props.onChange && props.onChange(event);
    props.onChangeText && props.onChangeText(currentText);
    if (inputRef.current == null) {
      return;
    }
    setLastNativeText(currentText);
    setMostRecentEventCount(event.nativeEvent.eventCount);
  };
  const _onSelectionChange = (event) => {
    props.onSelectionChange && props.onSelectionChange(event);
    if (inputRef.current == null) {
      return;
    }
    setLastNativeSelection({
      mostRecentEventCount,
      selection: event.nativeEvent.selection,
    });
  };
  const _onFocus = (event) => {
    TextInputState.focusInput(inputRef.current);
    if (props.onFocus) {
      props.onFocus(event);
    }
  };
  const _onBlur = (event) => {
    TextInputState.blurInput(inputRef.current);
    if (props.onBlur) {
      props.onBlur(event);
    }
  };
  const _onScroll = (event) => {
    props.onScroll && props.onScroll(event);
  };
  let textInput = null;
  const multiline = props.multiline ?? false;
  let submitBehavior;
  if (props.submitBehavior != null) {
    if (!multiline && props.submitBehavior === 'newline') {
      submitBehavior = 'blurAndSubmit';
    } else {
      submitBehavior = props.submitBehavior;
    }
  } else if (multiline) {
    if (props.blurOnSubmit === true) {
      submitBehavior = 'blurAndSubmit';
    } else {
      submitBehavior = 'newline';
    }
  } else {
    if (props.blurOnSubmit !== false) {
      submitBehavior = 'blurAndSubmit';
    } else {
      submitBehavior = 'submit';
    }
  }
  const accessible = props.accessible !== false;
  const focusable = props.focusable !== false;
  const { editable, hitSlop, onPress, onPressIn, onPressOut, rejectResponderTermination } = props;
  const config = useMemo(
    () => ({
      cancelable: Platform.OS === 'ios' ? !rejectResponderTermination : null,
      hitSlop,
      onPress: (event) => {
        onPress?.(event);
        if (editable !== false) {
          if (inputRef.current != null) {
            inputRef.current.focus();
          }
        }
      },
      onPressIn,
      onPressOut,
    }),
    [editable, hitSlop, onPress, onPressIn, onPressOut, rejectResponderTermination],
  );
  let caretHidden = props.caretHidden;
  if (Platform.isTesting) {
    caretHidden = true;
  }
  const { onBlur, onFocus, ...eventHandlers } = usePressability(config);
  const _accessibilityLabel = props?.['aria-label'] ?? props?.accessibilityLabel;
  let _accessibilityState;
  if (
    accessibilityState != null ||
    ariaBusy != null ||
    ariaChecked != null ||
    ariaDisabled != null ||
    ariaExpanded != null ||
    ariaSelected != null
  ) {
    _accessibilityState = {
      busy: ariaBusy ?? accessibilityState?.busy,
      checked: ariaChecked ?? accessibilityState?.checked,
      disabled: ariaDisabled ?? accessibilityState?.disabled,
      expanded: ariaExpanded ?? accessibilityState?.expanded,
      selected: ariaSelected ?? accessibilityState?.selected,
    };
  }
  let _style = props.style;
  const flattenedStyle = flattenStyle(props.style);
  if (flattenedStyle != null) {
    let overrides = null;
    if (typeof flattenedStyle?.fontWeight === 'number') {
      overrides = {};
      overrides.fontWeight = flattenedStyle.fontWeight.toString();
    }
    if (flattenedStyle.verticalAlign != null) {
      overrides = overrides || {};
      overrides.textAlignVertical =
        verticalAlignToTextAlignVerticalMap[flattenedStyle.verticalAlign];
      overrides.verticalAlign = undefined;
    }
    if (overrides != null) {
      _style = [_style, overrides];
    }
  }
  if (Platform.OS === 'ios') {
    const RCTTextInputView =
      props.multiline === true ? RCTMultilineTextInputView : RCTSinglelineTextInputView;
    const useMultilineDefaultStyle =
      props.multiline === true &&
      (flattenedStyle == null ||
        (flattenedStyle.padding == null &&
          flattenedStyle.paddingVertical == null &&
          flattenedStyle.paddingTop == null));
    const _accessibilityElementsHidden = props['aria-hidden'] ?? props.accessibilityElementsHidden;
    // Core iOS switches native host types here. A matching key preserves its
    // remount/ref lifecycle while both modes share our registered identity.
    textInput = /*#__PURE__*/ _jsx(
      RCTTextInputView,
      {
        ref: ref,
        ...otherProps,
        ...eventHandlers,
        acceptDragAndDropTypes: props.experimental_acceptDragAndDropTypes,
        accessibilityLabel: _accessibilityLabel,
        accessibilityState: _accessibilityState,
        accessibilityElementsHidden: _accessibilityElementsHidden,
        accessible: accessible,
        submitBehavior: submitBehavior,
        caretHidden: caretHidden,
        dataDetectorTypes: props.dataDetectorTypes,
        focusable: tabIndex !== undefined ? !tabIndex : focusable,
        mostRecentEventCount: mostRecentEventCount,
        nativeID: id ?? props.nativeID,
        numberOfLines: props.rows ?? props.numberOfLines,
        onBlur: _onBlur,
        onChange: _onChange,
        onContentSizeChange: props.onContentSizeChange,
        onFocus: _onFocus,
        onScroll: _onScroll,
        onSelectionChange: _onSelectionChange,
        onSelectionChangeShouldSetResponder: emptyFunctionThatReturnsTrue,
        selection: selection,
        selectionColor: selectionColor,
        style: StyleSheet.compose(
          useMultilineDefaultStyle ? styles.multilineDefault : null,
          _style,
        ),
        text: text,
      },
      props.multiline === true ? 'multiline' : 'singleline',
    );
  } else if (Platform.OS === 'android') {
    const autoCapitalize = props.autoCapitalize || 'sentences';
    const _accessibilityLabelledBy = props?.['aria-labelledby'] ?? props?.accessibilityLabelledBy;
    const _importantForAccessibility =
      props['aria-hidden'] === true ? 'no-hide-descendants' : undefined;
    const placeholder = props.placeholder ?? '';
    let children = props.children;
    const childCount = React.Children.count(children);
    invariant(!(props.value != null && childCount), 'Cannot specify both value and children.');
    if (childCount > 1) {
      children = /*#__PURE__*/ _jsx(Text, {
        children: children,
      });
    }
    const colorProps = {
      cursorColor: cursorColor === undefined ? selectionColor : cursorColor,
      selectionColor,
      selectionHandleColor:
        selectionHandleColor === undefined ? selectionColor : selectionHandleColor,
    };
    textInput = /*#__PURE__*/ _jsx(AndroidTextInput, {
      ref: ref,
      ...otherProps,
      ...colorProps,
      ...eventHandlers,
      accessibilityLabel: _accessibilityLabel,
      accessibilityLabelledBy: _accessibilityLabelledBy,
      accessibilityState: _accessibilityState,
      accessible: accessible,
      acceptDragAndDropTypes: props.experimental_acceptDragAndDropTypes,
      autoCapitalize: autoCapitalize,
      submitBehavior: submitBehavior,
      caretHidden: caretHidden,
      children: children,
      disableFullscreenUI: props.disableFullscreenUI,
      focusable: tabIndex !== undefined ? !tabIndex : focusable,
      importantForAccessibility: _importantForAccessibility,
      mostRecentEventCount: mostRecentEventCount,
      nativeID: id ?? props.nativeID,
      numberOfLines: props.rows ?? props.numberOfLines,
      onBlur: _onBlur,
      onChange: _onChange,
      onFocus: _onFocus,
      onScroll: _onScroll,
      onSelectionChange: _onSelectionChange,
      placeholder: placeholder,
      style: _style,
      text: text,
      textBreakStrategy: props.textBreakStrategy,
    });
  }
  return /*#__PURE__*/ _jsx(TextAncestorContext, {
    value: true,
    children: textInput,
  });
}
const enterKeyHintToReturnTypeMap = {
  done: 'done',
  enter: 'default',
  go: 'go',
  next: 'next',
  previous: 'previous',
  search: 'search',
  send: 'send',
};
const inputModeToKeyboardTypeMap = {
  decimal: 'decimal-pad',
  email: 'email-address',
  none: 'default',
  numeric: 'number-pad',
  search: Platform.OS === 'ios' ? 'web-search' : 'default',
  tel: 'phone-pad',
  text: 'default',
  url: 'url',
};
const autoCompleteWebToAutoCompleteAndroidMap = {
  'additional-name': 'name-middle',
  'address-line1': 'postal-address-region',
  'address-line2': 'postal-address-locality',
  bday: 'birthdate-full',
  'bday-day': 'birthdate-day',
  'bday-month': 'birthdate-month',
  'bday-year': 'birthdate-year',
  'cc-csc': 'cc-csc',
  'cc-exp': 'cc-exp',
  'cc-exp-month': 'cc-exp-month',
  'cc-exp-year': 'cc-exp-year',
  'cc-number': 'cc-number',
  country: 'postal-address-country',
  'current-password': 'password',
  email: 'email',
  'family-name': 'name-family',
  'given-name': 'name-given',
  'honorific-prefix': 'name-prefix',
  'honorific-suffix': 'name-suffix',
  name: 'name',
  'new-password': 'password-new',
  off: 'off',
  'one-time-code': 'sms-otp',
  'postal-code': 'postal-code',
  sex: 'gender',
  'street-address': 'street-address',
  tel: 'tel',
  'tel-country-code': 'tel-country-code',
  'tel-national': 'tel-national',
  username: 'username',
};
const autoCompleteWebToTextContentTypeMap = {
  'additional-name': 'middleName',
  'address-line1': 'streetAddressLine1',
  'address-line2': 'streetAddressLine2',
  bday: 'birthdate',
  'bday-day': 'birthdateDay',
  'bday-month': 'birthdateMonth',
  'bday-year': 'birthdateYear',
  'cc-additional-name': 'creditCardMiddleName',
  'cc-csc': 'creditCardSecurityCode',
  'cc-exp': 'creditCardExpiration',
  'cc-exp-month': 'creditCardExpirationMonth',
  'cc-exp-year': 'creditCardExpirationYear',
  'cc-family-name': 'creditCardFamilyName',
  'cc-given-name': 'creditCardGivenName',
  'cc-name': 'creditCardName',
  'cc-number': 'creditCardNumber',
  'cc-type': 'creditCardType',
  country: 'countryName',
  'current-password': 'password',
  email: 'emailAddress',
  'family-name': 'familyName',
  'given-name': 'givenName',
  'honorific-prefix': 'namePrefix',
  'honorific-suffix': 'nameSuffix',
  name: 'name',
  'new-password': 'newPassword',
  nickname: 'nickname',
  off: 'none',
  'one-time-code': 'oneTimeCode',
  organization: 'organizationName',
  'organization-title': 'jobTitle',
  'postal-code': 'postalCode',
  'street-address': 'fullStreetAddress',
  tel: 'telephoneNumber',
  url: 'URL',
  username: 'username',
};
const TextInput = function TextInput({
  ref: forwardedRef,
  allowFontScaling = true,
  rejectResponderTermination = true,
  underlineColorAndroid = 'transparent',
  autoComplete,
  textContentType,
  readOnly,
  editable,
  enterKeyHint,
  returnKeyType,
  inputMode,
  showSoftInputOnFocus,
  keyboardType,
  ...restProps
}) {
  return /*#__PURE__*/ _jsx(InternalTextInput, {
    allowFontScaling: allowFontScaling,
    rejectResponderTermination: rejectResponderTermination,
    underlineColorAndroid: underlineColorAndroid,
    editable: readOnly !== undefined ? !readOnly : editable,
    returnKeyType: enterKeyHint ? enterKeyHintToReturnTypeMap[enterKeyHint] : returnKeyType,
    keyboardType: inputMode ? inputModeToKeyboardTypeMap[inputMode] : keyboardType,
    showSoftInputOnFocus: inputMode == null ? showSoftInputOnFocus : inputMode !== 'none',
    autoComplete:
      Platform.OS === 'android'
        ? (autoCompleteWebToAutoCompleteAndroidMap[autoComplete] ?? autoComplete)
        : undefined,
    textContentType:
      textContentType != null
        ? textContentType
        : Platform.OS === 'ios' &&
            autoComplete &&
            autoComplete in autoCompleteWebToTextContentTypeMap
          ? autoCompleteWebToTextContentTypeMap[autoComplete]
          : textContentType,
    ...restProps,
    forwardedRef: forwardedRef,
  });
};
TextInput.displayName = 'TextInput';
TextInput.State = {
  blurTextInput: TextInputState.blurTextInput,
  currentlyFocusedField: TextInputState.currentlyFocusedField,
  currentlyFocusedInput: TextInputState.currentlyFocusedInput,
  focusTextInput: TextInputState.focusTextInput,
};
const styles = StyleSheet.create({
  multilineDefault: {
    paddingTop: 5,
  },
});
const verticalAlignToTextAlignVerticalMap = {
  auto: 'auto',
  bottom: 'bottom',
  middle: 'center',
  top: 'top',
};
export default TextInput;
