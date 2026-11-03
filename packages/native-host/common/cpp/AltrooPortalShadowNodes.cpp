#include "AltrooPortalShadowNodes.h"
namespace facebook::react {
extern const char AltrooPortalHostName[]="AltrooMUIPortalHost";
extern const char AltrooPortalCanvasName[]="AltrooMUIPortalCanvas";
static Transform affine(double a,double b,double c,double d,double x,double y) {
  auto transform=Transform::Identity();
  transform.matrix[0]=a; transform.matrix[1]=b; transform.matrix[4]=c; transform.matrix[5]=d;
  transform.matrix[12]=x; transform.matrix[13]=y;
  return transform;
}
Transform AltrooPortalHostShadowNode::getTransform() const {
  const auto &props=getConcreteProps();
  // RootNodeKind applies this only for window/viewport measurements.
  return affine(props.viewportA,props.viewportB,props.viewportC,props.viewportD,props.viewportX,props.viewportY);
}
Transform AltrooPortalCanvasShadowNode::getTransform() const {
  const auto &props=getConcreteProps();
  const auto center=getLayoutMetrics().frame.size;
  const auto x=center.width/2.0,y=center.height/2.0;
  // Fabric applies a View transform around its center. This calibration is origin-based.
  return affine(props.calibrationA,props.calibrationB,props.calibrationC,props.calibrationD,
    props.calibrationX+(props.calibrationA-1)*x+props.calibrationC*y,
    props.calibrationY+props.calibrationB*x+(props.calibrationD-1)*y);
}
}
