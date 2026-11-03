package com.altroo.muinativehost
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

// Calibration is consumed by the Fabric shadow node, never by the physical View transform.
@ReactModule(name = "AltrooMUIPortalCanvas")
class AltrooMUIPortalCanvasManager : ReactViewManager() {
  override fun getName() = "AltrooMUIPortalCanvas"
  @ReactProp(name="calibrationX",defaultDouble=0.0) fun setCalibrationX(view:ReactViewGroup,value:Double) = Unit
  @ReactProp(name="calibrationY",defaultDouble=0.0) fun setCalibrationY(view:ReactViewGroup,value:Double) = Unit
  @ReactProp(name="calibrationA",defaultDouble=1.0) fun setCalibrationA(view:ReactViewGroup,value:Double) = Unit
  @ReactProp(name="calibrationB",defaultDouble=0.0) fun setCalibrationB(view:ReactViewGroup,value:Double) = Unit
  @ReactProp(name="calibrationC",defaultDouble=0.0) fun setCalibrationC(view:ReactViewGroup,value:Double) = Unit
  @ReactProp(name="calibrationD",defaultDouble=1.0) fun setCalibrationD(view:ReactViewGroup,value:Double) = Unit
}
