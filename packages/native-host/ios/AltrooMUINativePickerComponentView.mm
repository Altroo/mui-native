#import "AltrooMUINativePickerComponentView.h"
#import <UIKit/UIKit.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/ComponentDescriptors.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/EventEmitters.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/Props.h>
using namespace facebook::react;

@interface AltrooPickerCell : UITableViewCell
@property(nonatomic, copy) NSString *optionId;
@property(nonatomic, copy) NSString *revision;
@end
@implementation AltrooPickerCell
@end

@interface AltrooPickerTable : UITableViewController
@property(nonatomic, copy) NSArray<NSDictionary *> *options;
@property(nonatomic, copy) NSString *revision;
@property(nonatomic, assign) BOOL multiple;
@property(nonatomic, copy) void (^choose)(NSString *, NSString *, BOOL);
@property(nonatomic, copy) void (^finish)(NSString *);
- (void)reloadOptions;
- (void)done;
- (void)cancel;
@end
@implementation AltrooPickerTable {
  NSArray<NSArray<NSDictionary *> *> *_sections;
}
- (void)viewDidLoad {
  [super viewDidLoad];
  self.tableView.estimatedRowHeight = 48;
  self.tableView.rowHeight = UITableViewAutomaticDimension;
  [self reloadOptions];
}
- (void)reloadOptions {
  NSMutableArray<NSMutableArray *> *sections = [NSMutableArray array];
  NSString *previous = nil;
  for (NSDictionary *option in self.options) {
    NSString *group = option[@"groupId"];
    if (!previous || ![previous isEqualToString:group]) [sections addObject:[NSMutableArray array]];
    [sections.lastObject addObject:option]; previous = group;
  }
  _sections = sections;
  if (self.isViewLoaded) [self.tableView reloadData];
}
- (NSDictionary *)optionAtIndexPath:(NSIndexPath *)indexPath {
  if (indexPath.section >= _sections.count || indexPath.row >= _sections[indexPath.section].count) return nil;
  return _sections[indexPath.section][indexPath.row];
}
- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView { return _sections.count; }
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section { return section < _sections.count ? _sections[section].count : 0; }
- (NSString *)tableView:(UITableView *)tableView titleForHeaderInSection:(NSInteger)section {
  NSString *label = section < _sections.count ? _sections[section].firstObject[@"groupLabel"] : nil;
  return label.length ? label : nil;
}
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
  AltrooPickerCell *cell = [tableView dequeueReusableCellWithIdentifier:@"option"];
  if (!cell) cell = [[AltrooPickerCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:@"option"];
  NSDictionary *option = [self optionAtIndexPath:indexPath];
  BOOL enabled = [option[@"enabled"] boolValue], selected = [option[@"selected"] boolValue];
  cell.optionId = option[@"id"]; cell.revision = self.revision;
  cell.textLabel.text = option[@"label"];
  cell.textLabel.font = [UIFont preferredFontForTextStyle:UIFontTextStyleBody];
  cell.textLabel.adjustsFontForContentSizeCategory = YES;
  cell.textLabel.numberOfLines = 0;
  cell.textLabel.textColor = enabled ? UIColor.labelColor : UIColor.tertiaryLabelColor;
  cell.accessoryType = selected ? UITableViewCellAccessoryCheckmark : UITableViewCellAccessoryNone;
  cell.selectionStyle = enabled ? UITableViewCellSelectionStyleDefault : UITableViewCellSelectionStyleNone;
  cell.accessibilityTraits = UIAccessibilityTraitButton | (enabled ? 0 : UIAccessibilityTraitNotEnabled) | (selected ? UIAccessibilityTraitSelected : 0);
  return cell;
}
- (NSIndexPath *)tableView:(UITableView *)tableView willSelectRowAtIndexPath:(NSIndexPath *)indexPath {
  return [[self optionAtIndexPath:indexPath][@"enabled"] boolValue] ? indexPath : nil;
}
- (BOOL)tableView:(UITableView *)tableView canFocusRowAtIndexPath:(NSIndexPath *)indexPath {
  return [[self optionAtIndexPath:indexPath][@"enabled"] boolValue];
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
  [tableView deselectRowAtIndexPath:indexPath animated:YES];
  AltrooPickerCell *cell = (AltrooPickerCell *)[tableView cellForRowAtIndexPath:indexPath];
  if (!cell || ![cell.revision isEqualToString:self.revision]) return;
  NSDictionary *option = nil;
  for (NSDictionary *item in self.options) if ([item[@"id"] isEqualToString:cell.optionId]) { option = item; break; }
  if (!option || ![option[@"enabled"] boolValue]) return;
  BOOL selected = self.multiple ? ![option[@"selected"] boolValue] : YES;
  if (selected != [option[@"selected"] boolValue] && self.choose) self.choose(cell.optionId, cell.revision, selected);
  // Checkmarks remain controlled by authored props, including rejected changes.
  if (!self.multiple && self.finish) self.finish(@"selected");
}
- (void)done { if (self.finish) self.finish(@"done"); }
- (void)cancel { if (self.finish) self.finish(@"cancel"); }
@end

@interface AltrooPickerNavigation : UINavigationController
@property(nonatomic, copy) void (^removed)(void);
@end
@implementation AltrooPickerNavigation
- (void)viewDidDisappear:(BOOL)animated {
  [super viewDidDisappear:animated];
  if ((self.isBeingDismissed || !self.presentingViewController) && self.removed) self.removed();
}
@end

@interface AltrooMUINativePickerComponentView () <UIAdaptivePresentationControllerDelegate, UIPopoverPresentationControllerDelegate>
@end
@implementation AltrooMUINativePickerComponentView {
  BOOL _active, _multiple, _scheduled, _presenting, _closing;
  NSString *_sessionId, *_revision, *_closedSession, *_presentedSession;
  NSString *_title, *_doneText, *_cancelText, *_scheme;
  NSArray<NSDictionary *> *_options;
  AltrooPickerTable *_table;
  AltrooPickerNavigation *_navigation;
  NSString *_pendingReason;
  BOOL _pendingNotify;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AltrooMUINativePickerComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const AltrooMUINativePickerProps>();
    _sessionId = @""; _revision = @""; _closedSession = @""; _options = @[];
    _title = @""; _doneText = @""; _cancelText = @""; _scheme = @"system";
    self.userInteractionEnabled = NO;
    self.accessibilityElementsHidden = YES;
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(backgrounded:) name:UIApplicationDidEnterBackgroundNotification object:nil];
  }
  return self;
}
- (void)dealloc { [[NSNotificationCenter defaultCenter] removeObserver:self]; }
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<AltrooMUINativePickerProps const>(props);
  _active = next.active; _multiple = next.multiple;
  _sessionId = RCTNSStringFromString(next.sessionId); _revision = RCTNSStringFromString(next.revision);
  _title = RCTNSStringFromString(next.title); _doneText = RCTNSStringFromString(next.doneText);
  _cancelText = RCTNSStringFromString(next.cancelText); _scheme = RCTNSStringFromString(toString(next.colorScheme));
  NSMutableArray *options = [NSMutableArray array];
  for (const auto &item : next.options) [options addObject:@{
    @"id": RCTNSStringFromString(item.id), @"label": RCTNSStringFromString(item.label),
    @"groupId": RCTNSStringFromString(item.groupId), @"groupLabel": RCTNSStringFromString(item.groupLabel),
    @"enabled": @(item.enabled), @"selected": @(item.selected)}];
  _options = options;
  [super updateProps:props oldProps:oldProps];
  [self scheduleSync];
}
- (void)scheduleSync {
  if (_scheduled) return;
  _scheduled = YES;
  __weak auto weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{ auto strongSelf = weakSelf; if (!strongSelf) return; strongSelf->_scheduled = NO; [strongSelf syncPicker]; });
}
- (void)emitDismiss:(NSString *)session reason:(NSString *)reason {
  if (!_eventEmitter) return;
  auto emitter = std::static_pointer_cast<AltrooMUINativePickerEventEmitter const>(_eventEmitter);
  emitter->onPickerDismiss({RCTStringFromNSString(session), RCTStringFromNSString(reason)});
}
- (void)finishDismiss:(AltrooPickerNavigation *)navigation session:(NSString *)session reason:(NSString *)reason notify:(BOOL)notify {
  if (_navigation != navigation) return;
  _navigation = nil; _table = nil; _presentedSession = nil; _closing = NO; _presenting = NO;
  _pendingReason = nil;
  if (notify) { _closedSession = session; [self emitDismiss:session reason:reason]; }
  [self scheduleSync];
}
- (void)requestDismiss:(NSString *)reason notify:(BOOL)notify {
  if (!_navigation || _closing) return;
  if (_presenting) { _pendingReason = reason; _pendingNotify = notify; return; }
  _closing = YES;
  AltrooPickerNavigation *navigation = _navigation;
  NSString *session = _presentedSession;
  __weak auto weakSelf = self;
  [navigation dismissViewControllerAnimated:self.window != nil completion:^{
    [weakSelf finishDismiss:navigation session:session reason:reason notify:notify];
  }];
}
- (void)configureTable {
  _table.title = _title;
  _table.multiple = _multiple;
  if (![_table.revision isEqualToString:_revision]) {
    _table.options = _options; _table.revision = _revision; [_table reloadOptions];
  }
  _table.navigationItem.leftBarButtonItem = _cancelText.length
    ? [[UIBarButtonItem alloc] initWithTitle:_cancelText style:UIBarButtonItemStylePlain target:_table action:@selector(cancel)]
    : [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemCancel target:_table action:@selector(cancel)];
  _table.navigationItem.rightBarButtonItem = _multiple ? (_doneText.length
    ? [[UIBarButtonItem alloc] initWithTitle:_doneText style:UIBarButtonItemStyleDone target:_table action:@selector(done)]
    : [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemDone target:_table action:@selector(done)]) : nil;
  _navigation.overrideUserInterfaceStyle = [_scheme isEqualToString:@"dark"] ? UIUserInterfaceStyleDark : [_scheme isEqualToString:@"light"] ? UIUserInterfaceStyleLight : UIUserInterfaceStyleUnspecified;
}
- (void)syncPicker {
  if (!_active) { _closedSession = @""; [self requestDismiss:@"programmatic" notify:NO]; return; }
  if (!_sessionId.length || !self.window || _closing) return;
  if ([_closedSession isEqualToString:_sessionId]) return;
  if (_navigation && ![_presentedSession isEqualToString:_sessionId]) { [self requestDismiss:@"replaced" notify:NO]; return; }
  NSMutableSet *ids = [NSMutableSet set]; NSInteger selected = 0;
  for (NSDictionary *option in _options) { if ([option[@"id"] length]) [ids addObject:option[@"id"]]; if ([option[@"selected"] boolValue]) selected++; }
  if (!_options.count || ids.count != _options.count || (!_multiple && selected > 1)) {
    if (_navigation) [self requestDismiss:@"unavailable" notify:YES];
    else { _closedSession = _sessionId; [self emitDismiss:_sessionId reason:@"unavailable"]; }
    return;
  }
  if (_navigation) { [self configureTable]; return; }
  UIResponder *responder = self;
  while (responder && ![responder isKindOfClass:UIViewController.class]) responder = responder.nextResponder;
  UIViewController *presenter = (UIViewController *)responder;
  while (presenter.presentedViewController && !presenter.presentedViewController.isBeingDismissed) presenter = presenter.presentedViewController;
  if (!presenter || !presenter.view.window || presenter.isBeingDismissed || UIApplication.sharedApplication.applicationState != UIApplicationStateActive) {
    _closedSession = _sessionId; [self emitDismiss:_sessionId reason:@"unavailable"]; return;
  }
  if (presenter.transitionCoordinator) {
    __weak auto weakSelf = self;
    [presenter.transitionCoordinator animateAlongsideTransition:nil completion:^(id<UIViewControllerTransitionCoordinatorContext> context) { [weakSelf scheduleSync]; }];
    return;
  }
  _table = [[AltrooPickerTable alloc] initWithStyle:UITableViewStyleInsetGrouped];
  _navigation = [[AltrooPickerNavigation alloc] initWithRootViewController:_table];
  _presentedSession = _sessionId;
  NSString *session = _presentedSession;
  __weak auto weakSelf = self;
  _table.choose = ^(NSString *optionId, NSString *revision, BOOL value) {
    auto host = weakSelf;
    if (!host || !host->_active || host->_closing || ![host->_sessionId isEqualToString:session] || ![host->_revision isEqualToString:revision] || !host->_eventEmitter) return;
    auto emitter = std::static_pointer_cast<AltrooMUINativePickerEventEmitter const>(host->_eventEmitter);
    emitter->onPickerSelection({RCTStringFromNSString(session), RCTStringFromNSString(revision), RCTStringFromNSString(optionId), (bool)value});
  };
  _table.finish = ^(NSString *reason) { auto host = weakSelf; if (host && [host->_presentedSession isEqualToString:session]) [host requestDismiss:reason notify:YES]; };
  __weak AltrooPickerNavigation *weakNavigation = _navigation;
  _navigation.removed = ^{ auto host = weakSelf; auto navigation = weakNavigation; if (host && !host->_closing) [host finishDismiss:navigation session:session reason:navigation.isBeingDismissed ? @"cancel" : @"unavailable" notify:YES]; };
  [self configureTable];
  if (self.traitCollection.userInterfaceIdiom == UIUserInterfaceIdiomPad) {
    _navigation.modalPresentationStyle = UIModalPresentationPopover;
    _navigation.preferredContentSize = CGSizeMake(360, MIN(600, MAX(200, _options.count * 52 + 56)));
    _navigation.popoverPresentationController.sourceView = self;
    _navigation.popoverPresentationController.sourceRect = CGRectMake(0, 0, MAX(1, self.bounds.size.width), MAX(1, self.bounds.size.height));
    _navigation.popoverPresentationController.delegate = self;
  } else {
    _navigation.modalPresentationStyle = UIModalPresentationPageSheet;
    _navigation.sheetPresentationController.detents = @[UISheetPresentationControllerDetent.mediumDetent, UISheetPresentationControllerDetent.largeDetent];
    _navigation.sheetPresentationController.prefersGrabberVisible = YES;
  }
  _navigation.presentationController.delegate = self;
  _presenting = YES;
  [presenter presentViewController:_navigation animated:YES completion:^{
    auto host = weakSelf; if (!host) return; host->_presenting = NO;
    if (host->_pendingReason) { NSString *reason = host->_pendingReason; BOOL notify = host->_pendingNotify; host->_pendingReason = nil; [host requestDismiss:reason notify:notify]; }
    else [host scheduleSync];
  }];
}
- (void)presentationControllerDidDismiss:(UIPresentationController *)presentationController {
  if (presentationController.presentedViewController == _navigation) [self finishDismiss:_navigation session:_presentedSession reason:@"cancel" notify:YES];
}
- (void)popoverPresentationControllerDidDismissPopover:(UIPopoverPresentationController *)popoverPresentationController {
  [self presentationControllerDidDismiss:popoverPresentationController];
}
- (void)layoutSubviews {
  [super layoutSubviews];
  if (_navigation.popoverPresentationController) _navigation.popoverPresentationController.sourceRect = CGRectMake(0, 0, MAX(1, self.bounds.size.width), MAX(1, self.bounds.size.height));
}
- (void)didMoveToWindow {
  [super didMoveToWindow];
  if (self.window) [self scheduleSync]; else [self requestDismiss:@"unavailable" notify:YES];
}
- (void)backgrounded:(NSNotification *)notification { [self requestDismiss:@"background" notify:YES]; }
- (void)prepareForRecycle {
  _active = NO; [self requestDismiss:@"programmatic" notify:NO]; _closedSession = @"";
  [super prepareForRecycle];
}
@end
Class<RCTComponentViewProtocol> AltrooMUINativePickerCls(void) { return AltrooMUINativePickerComponentView.class; }
