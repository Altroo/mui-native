#import <UIKit/UIKit.h>
@protocol AltrooPortalLogicalParent <NSObject>
@property(nonatomic, weak, readonly) UIView *portalSource;
@end
// React ancestry crosses from a physically redirected root to its original placeholder.
static inline UIView *AltrooLogicalParent(UIView *view) {
  return [view conformsToProtocol:@protocol(AltrooPortalLogicalParent)] ? [(id<AltrooPortalLogicalParent>)view portalSource] : view.superview;
}
