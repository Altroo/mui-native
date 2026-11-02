package com.altroo.muinativehost;

import androidx.annotation.Nullable;
import com.facebook.react.uimanager.ViewManagerDelegate;
import com.facebook.react.viewmanagers.AltrooMUIInteractiveViewManagerDelegate;
import com.facebook.react.views.view.ReactViewGroup;

/**
 * Keep generated native props and the complete inherited View setters.
 *
 * Java matches codegen's legacy JVM entry points without producing duplicate
 * Kotlin/Java bridge methods on React Native 0.88.
 */
@SuppressWarnings("deprecation")
final class AltrooMUIInteractiveViewDelegate extends
    AltrooMUIInteractiveViewManagerDelegate<ReactViewGroup, AltrooMUIInteractiveViewManager> {
  private final ViewManagerDelegate<ReactViewGroup> inherited;

  AltrooMUIInteractiveViewDelegate(
      AltrooMUIInteractiveViewManager manager,
      ViewManagerDelegate<ReactViewGroup> inherited) {
    super(manager);
    this.inherited = inherited;
  }

  @Override
  public void setProperty(ReactViewGroup view, String name, @Nullable Object value) {
    switch (name) {
      case "nativeFocusable":
      case "nativeTabIndex":
      case "managedKeys":
      case "rippleEnabled":
      case "rippleColor":
      case "rippleRadius":
      case "rippleBorderless":
      case "rippleForeground":
        super.setProperty(view, name, value);
        break;
      default:
        inherited.setProperty(view, name, value);
    }
  }
}
