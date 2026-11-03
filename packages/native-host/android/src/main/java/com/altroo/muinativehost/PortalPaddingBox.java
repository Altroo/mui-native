/* Padding-box calculation adapts React Native 0.88.1 BackgroundStyleApplicator.
 * Copyright (c) Meta Platforms, Inc. and affiliates. MIT; see native-rendering provenance.
 * Java accesses the pinned JVM API without Kotlin internal-name mangling or reflection. */
package com.altroo.muinativehost;

import android.graphics.Rect;
import android.graphics.RectF;
import android.view.View;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.drawable.CompositeBackgroundDrawable;

final class PortalPaddingBox {
  static Rect bounds(View view) {
    Rect result = new Rect(0, 0, view.getWidth(), view.getHeight());
    if (!(view.getBackground() instanceof CompositeBackgroundDrawable)) return result;
    CompositeBackgroundDrawable drawable = (CompositeBackgroundDrawable) view.getBackground();
    if (drawable.getBorderInsets() == null) return result;
    RectF insets = drawable.getBorderInsets().resolve(drawable.getLayoutDirection(), view.getContext());
    result.set((int) PixelUtil.toPixelFromDIP(insets.left), (int) PixelUtil.toPixelFromDIP(insets.top),
        (int) (view.getWidth() - PixelUtil.toPixelFromDIP(insets.right)),
        (int) (view.getHeight() - PixelUtil.toPixelFromDIP(insets.bottom)));
    return result;
  }
}
