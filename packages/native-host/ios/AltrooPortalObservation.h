#import <UIKit/UIKit.h>
#include <optional>

struct AltrooObservedRect {
  double x = 0, y = 0, width = 0, height = 0;
  bool operator==(const AltrooObservedRect &) const = default;
};
struct AltrooObservedClip {
  bool valid = true;
  std::optional<AltrooObservedRect> rect;
};
AltrooObservedRect AltrooIntersectObservedRect(AltrooObservedRect a, AltrooObservedRect b);
// UIWindow is its own geometry window; ordinary views use their attached window.
UIWindow *AltrooObservationWindow(UIView *view);
bool AltrooCanObserveView(UIView *view);
std::optional<AltrooObservedRect> AltrooObserveRect(UIView *view, CGRect bounds, UIView *relativeTo = nil, CGPoint origin = CGPointZero, bool clipping = false);
AltrooObservedClip AltrooObserveClippingParents(UIView *view, UIView *relativeTo = nil, CGPoint origin = CGPointZero);
AltrooObservedRect AltrooObserveViewport(UIWindow *window);

CGRect AltrooPositionPaddingFrame(UIView *view);
CGRect AltrooPositionLayoutFrame(UIView *view);
bool AltrooPositionSwapsInsets(UIView *view);
