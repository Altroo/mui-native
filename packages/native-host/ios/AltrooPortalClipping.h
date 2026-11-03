#import <React/RCTViewComponentView.h>
// RN-specific adapter is source-pinned and validated before mounting into any custom container.
BOOL AltrooPortalSupportsContainer(RCTViewComponentView *view);
BOOL AltrooPortalClipsSubviews(RCTViewComponentView *view);
void AltrooRemovePortalRoot(RCTViewComponentView *view, UIView<RCTComponentViewProtocol> *root);
