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
bool AltrooCanObserveView(UIView *view);
std::optional<AltrooObservedRect> AltrooObserveRect(UIView *view, CGRect bounds);
AltrooObservedClip AltrooObserveClippingParents(UIView *view);
AltrooObservedRect AltrooObserveViewport(UIWindow *window);
