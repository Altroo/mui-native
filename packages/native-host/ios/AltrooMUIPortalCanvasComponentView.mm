#import "AltrooMUIPortalCanvasComponentView.h"
#import "AltrooPortalShadowNodes.h"
using namespace facebook::react;
@implementation AltrooMUIPortalCanvasComponentView
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) _props = std::make_shared<const AltrooMUIPortalCanvasProps>();
  return self;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<AltrooPortalCanvasComponentDescriptor>(); }
@end
