/* Native editor manager adapts React Native 0.88.1's MIT-licensed defaults.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE and upstream/native-text-input.json. */
package com.altroo.muinativehost

import android.text.InputType
import android.view.ViewGroup
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager

/** Inherit every stock setter, event, state update and command. */
@ReactModule(name = "AltrooMUITextInput")
class AltrooMUITextInputManager : ReactTextInputManager() {
  override fun getName() = "AltrooMUITextInput"
  override fun updateState(view: ReactEditText, props: com.facebook.react.uimanager.ReactStylesDiffMap, stateWrapper: com.facebook.react.uimanager.StateWrapper): Any? {
    val update = super.updateState(view, props, stateWrapper)
    if (update == null || view !is AltrooMUITextInput) return update
    val metadata = if (view.needsLayoutMetadata() && AltrooTextInputState.isMetadataCandidate(update)) textInputMetadata(stateWrapper.stateDataMapBuffer, view.id) else null
    return if (view.acknowledgeEmptyEdit(update, props, metadata)) null else update
  }
  override fun updateExtraData(view: ReactEditText, extraData: Any) {
    super.updateExtraData(view, extraData)
    (view as? AltrooMUITextInput)?.completeStateUpdate(extraData)
  }
  override fun updateProperties(viewToUpdate: ReactEditText, props: com.facebook.react.uimanager.ReactStylesDiffMap) {
    if (viewToUpdate is AltrooMUITextInput && !viewToUpdate.acceptsAcknowledgementProps(props)) viewToUpdate.retireEmptyEdit()
    super.updateProperties(viewToUpdate, props)
  }
  override fun receiveCommand(reactEditText: ReactEditText, commandId: String, args: com.facebook.react.bridge.ReadableArray?) {
    (reactEditText as? AltrooMUITextInput)?.retireEmptyEdit()
    super.receiveCommand(reactEditText, commandId, args)
  }

  override fun createViewInstance(context: ThemedReactContext): ReactEditText {
    val editor = AltrooMUITextInput(context)
    editor.inputType = editor.inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE.inv()
    editor.returnKeyType = "done"
    editor.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    return editor
  }
}
