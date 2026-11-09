// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#include "AltrooPrelayoutProbe.h"
#include "OwnedProgramme.h"
#include "ChannelProbe.h"
#include "OwnedConversionProbe.h"
#include "PrelayoutJournal.h"
#include "PrelayoutResolver.h"
#include <mutex>
#include <atomic>
#include <limits>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowTreeRegistry.h>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

namespace facebook::react {
namespace {
namespace proof = altroo::prelayout::probe;
using Node = std::shared_ptr<const ShadowNode>;
void collect(const Node &node, std::vector<proof::Observation> &observations,
             std::size_t &scanned, std::size_t depth = 0) {
  if (!node || ++scanned > 20000 || depth > 128)
    throw std::length_error("Accepted tree exceeds private probe budget");
  if (const auto *target =
          dynamic_cast<const AltrooStructuralViewShadowNode *>(node.get())) {
    const auto &props = target->getConcreteProps();
    const auto bottom = altroo::prelayout::bottomPadding(props.yogaStyle);
    const auto layout = target->getLayoutMetrics();
    observations.push_back(
        {target->getTag(),
         target->getSurfaceId(),
         target->getFamilyShared(),
         bottom.isPoints() ? bottom.value().unwrap() : 0,
         props.normalPaddingBottom,
         props.lastPaddingBottom,
         bottom.isPoints(),
         {layout.frame.origin.x, layout.frame.origin.y, layout.frame.size.width,
          layout.frame.size.height, layout.contentInsets.top,
          layout.contentInsets.left, layout.contentInsets.bottom,
          layout.contentInsets.right, layout.borderWidth.top,
          layout.borderWidth.left, layout.borderWidth.bottom,
          layout.borderWidth.right, layout.pointScaleFactor,
          layout.fontSizeMultiplier}});
  }
  for (const auto &child : node->getChildren())
    collect(child, observations, scanned, depth + 1);
}
struct PassiveExpected {
  folly::dynamic programme;
  float normal{}, last{};
};
float expectedBottom(const folly::dynamic &map) {
  for (const char *key : {"paddingBottom", "paddingVertical", "padding"})
    if (map.count(key) && !map.at(key).isNull()) {
      const auto &value = map.at(key);
      if (!value.isNumber() || !std::isfinite(value.asDouble()) || value.asDouble() < 0 ||
          value.asDouble() > std::numeric_limits<float>::max())
        throw std::invalid_argument("Witness requires finite point padding candidates");
      return static_cast<float>(value.asDouble());
    }
  throw std::invalid_argument("Witness requires explicit native padding candidates");
}
void collectPassive(const Node &node, const PassiveExpected &expected,
                    proof::PassiveNode &result, std::size_t &scanned,
                    std::size_t depth = 0) {
  if (!node || ++scanned > 20000 || depth > 128)
    throw std::length_error("Passive tree exceeds bounded scope");
  if (const auto *target = dynamic_cast<const AltrooStructuralViewShadowNode *>(node.get())) {
    if (++result.count > 1) throw std::logic_error("Passive scope has multiple owned hosts");
    const auto &props = target->getConcreteProps();
    if (!props.prepared) throw std::logic_error("Passive scope has unprepared owned props");
    result.tag = target->getTag(); result.surface = target->getSurfaceId();
    result.family = target->getFamilyShared(); result.programme = props.prepared;
    result.selectedLast = props.selectedLast;
    const auto actual = altroo::prelayout::bottomPadding(props.yogaStyle);
    const auto normal = altroo::prelayout::bottomPadding(props.prepared->candidates.normal->yogaStyle);
    const auto last = altroo::prelayout::bottomPadding(props.prepared->candidates.last->yogaStyle);
    result.bottomIsPoints = actual.isPoints();
    result.bottom = actual.isPoints() ? actual.value().unwrap() : 0;
    result.expectedWire = props.prepared->unselected->ownedProgramme == expected.programme &&
        normal.isPoints() && last.isPoints() && normal.value().unwrap() == expected.normal &&
        last.value().unwrap() == expected.last && result.bottomIsPoints &&
        result.bottom == (props.selectedLast ? expected.last : expected.normal);
    const auto layout = target->getLayoutMetrics();
    result.layout = {layout.frame.origin.x, layout.frame.origin.y, layout.frame.size.width,
        layout.frame.size.height, layout.contentInsets.top, layout.contentInsets.left,
        layout.contentInsets.bottom, layout.contentInsets.right, layout.borderWidth.top,
        layout.borderWidth.left, layout.borderWidth.bottom, layout.borderWidth.right,
        layout.pointScaleFactor, layout.fontSizeMultiplier};
  }
  for (const auto &child : node->getChildren()) collectPassive(child, expected, result, scanned, depth + 1);
}
proof::PassiveNode passiveSnapshot(const Node &root, const PassiveExpected &expected) {
  proof::PassiveNode result; std::size_t scanned = 0;
  collectPassive(root, expected, result, scanned); return result;
}

} // namespace
struct AltrooPrelayoutProbe::Shared final : proof::PassiveRuntimeSink {
  std::mutex mutex;
  proof::Journal journal;
  std::string conversionReport;
  std::string programmeDiagnostic;
  bool witnessMode{};
  std::atomic<bool> witnessFailed{false};
  proof::PassiveJournal passive;
  std::shared_ptr<const PassiveExpected> expected;
  void bad(const char *reason) noexcept {
    witnessFailed.store(true, std::memory_order_release);
    try { std::lock_guard lock(mutex); passive.fail(reason); } catch (...) {}
  }
  bool scope(const Node &root, std::uint64_t &epoch,
             std::shared_ptr<const PassiveExpected> &copy) {
    if (witnessFailed.load(std::memory_order_acquire)) return false;
    std::lock_guard lock(mutex);
    if (!root || root->getSurfaceId() != passive.surface) return false;
    if (!passive.active || passive.invalid) {
      if (!passive.active && passive.closed && passive.hookRegistered)
        passive.fail("Scoped callback arrived during witness stop");
      return false;
    }
    if (!proof::sameOwner(passive.surfaceFamily, root->getFamilyShared())) {
      passive.fail("Surface root family was replaced"); return false;
    }
    epoch = passive.epoch; copy = expected; return true;
  }
  void runtimeInput(const proof::Identity &identity, std::uint64_t generation,
                    std::uint64_t attempt) noexcept override {
    try {
      const auto root = std::static_pointer_cast<const RootShadowNode>(identity);
      std::uint64_t epoch; std::shared_ptr<const PassiveExpected> value;
      if (!scope(root, epoch, value)) return;
      const auto node = passiveSnapshot(root, *value);
      std::lock_guard lock(mutex);
      if (passive.active && passive.epoch == epoch) passive.entered(identity, generation, attempt, node);
      else passive.fail("Stale runtime input after witness stop");
    } catch (...) { bad("Runtime input could not be observed"); }
  }
  void runtimeReturn(const proof::Identity &input, const proof::Identity &identity,
                     std::uint64_t generation, std::uint64_t attempt,
                     bool completed) noexcept override {
    try {
      const auto root = std::static_pointer_cast<const RootShadowNode>(identity);
      std::uint64_t epoch; std::shared_ptr<const PassiveExpected> value;
      if (!scope(root, epoch, value)) return;
      const auto node = passiveSnapshot(root, *value);
      std::lock_guard lock(mutex);
      if (passive.active && passive.epoch == epoch) passive.returned(input, identity, generation, attempt, completed, node);
      else passive.fail("Stale runtime return after witness stop");
    } catch (...) { bad("Runtime return could not be observed"); }
  }
};
AltrooPrelayoutProbe::AltrooPrelayoutProbe(std::shared_ptr<CallInvoker> invoker)
    : NativeAltrooPrelayoutProbeCxxSpec(std::move(invoker)),
      shared_(std::make_shared<Shared>()) {}
AltrooPrelayoutProbe::~AltrooPrelayoutProbe() { stop(); }
void AltrooPrelayoutProbe::enable(jsi::Runtime &runtime) {
  std::lock_guard lifecycle(control_);
  if (manager_ || registered_)
    throw std::logic_error("Disable the active prelayout probe first");
  auto binding = UIManagerBinding::getBinding(runtime);
  if (!binding)
    throw std::runtime_error("Private prelayout probe requires Fabric");
  auto *manager = &binding->getUIManager();
  // This diagnostic conversion runs on the ordinary synchronous module call,
  // before registering any commit hook. Surface0 is a constructor-only context,
  // not a claim about a mounted host or the catalog's actual Fabric surface.
  const auto contextContainer = manager->getContextContainer();
  if (!contextContainer)
    throw std::logic_error("Owned conversion probe requires the app context");
  PropsParserContext conversionContext(0, *contextContainer);
  auto conversionReport = altroo::owned_adapter_proof::runConversionProbe(
      conversionContext, contextContainer);
  conversionReport["constructorOnlySurfaceId"] = 0;
  auto conversionJson = folly::toJson(conversionReport);
  // Ordinary programme construction is a separate diagnostic. Prepare both
  // complete JSON values before activation; failures preserve prior history.
  auto programmeReport = altroo::owned_channel::runChannelProbe(
      conversionContext, contextContainer);
  programmeReport["constructorOnlySurfaceId"] = 0;
  auto programmeJson = folly::toJson(programmeReport);
  static_assert(noexcept(shared_->conversionReport.swap(conversionJson)));
  static_assert(noexcept(shared_->programmeDiagnostic.swap(programmeJson)));
  {
    std::lock_guard lock(shared_->mutex);
    shared_->witnessMode = false;
    shared_->journal.begin();
    // Journal activation must not be followed by an allocating publication.
    shared_->conversionReport.swap(conversionJson);
    shared_->programmeDiagnostic.swap(programmeJson);
  }
  binding_ = std::move(binding);
  manager_ = manager;
  try {
    // RN invokes registration callbacks while holding its hook mutex.
    // Never hold our journal mutex across register/unregister.
    manager_->registerCommitHook(*this);
    registered_ = true;
    std::lock_guard lock(shared_->mutex);
    shared_->journal.hookRegistered = true;
  } catch (...) {
    stopLocked();
    throw;
  }
}
void AltrooPrelayoutProbe::disable(jsi::Runtime &) { stop(); }
void AltrooPrelayoutProbe::stop() noexcept {
  std::lock_guard lifecycle(control_);
  stopLocked();
}
void AltrooPrelayoutProbe::stopLocked() noexcept {
  {
    std::lock_guard lock(shared_->mutex);
    shared_->journal.deactivate();
    if (shared_->witnessMode) shared_->passive.stop();
  }
  if (registered_) {
    manager_->unregisterCommitHook(*this);
    registered_ = false;
  }
  {
    std::lock_guard lock(shared_->mutex);
    shared_->journal.hookRegistered = false;
    shared_->passive.hookRegistered = false;
  }
  manager_ = nullptr;
  binding_.reset();
}
void AltrooPrelayoutProbe::commitHookWasRegistered(const UIManager &) noexcept {
  try { std::lock_guard lock(shared_->mutex);
    if (shared_->witnessMode) shared_->passive.hookRegistered = true;
  } catch (...) { shared_->bad("Witness registration was not observed"); }
}
void AltrooPrelayoutProbe::commitHookWasUnregistered(const UIManager &) noexcept {}
std::weak_ptr<proof::PassiveRuntimeSink> AltrooPrelayoutProbe::passiveWitnessSink() const { return shared_; }
void AltrooPrelayoutProbe::expectPassiveGeneration(std::uint64_t generation) noexcept {
  try { std::lock_guard lock(shared_->mutex); shared_->passive.expect(generation); }
  catch (...) { shared_->bad("Runtime generation could not be associated"); }
}
void AltrooPrelayoutProbe::armPassiveWitness(jsi::Runtime &runtime, std::int32_t surface,
                                           const std::string &programme) {
  std::lock_guard lifecycle(control_);
  if (manager_ || registered_) throw std::logic_error("Disable the current probe first");
  if (surface <= 0 || programme.size() > 65536 ||
      ReactNativeFeatureFlags::enableFabricCommitBranching())
    throw std::invalid_argument("Passive witness requires one nonbranching Fabric surface");
  auto value = folly::parseJson(programme);
  if (!altroo::owned_channel::fullProgramme(value)) throw std::invalid_argument("Expected full owned programme");
  auto prepared = std::make_shared<const PassiveExpected>(PassiveExpected{
      value, expectedBottom(value.at("normal")), expectedBottom(value.at("last"))});
  if (prepared->normal == prepared->last) throw std::invalid_argument("Witness needs distinct normal and last padding");
  auto binding = UIManagerBinding::getBinding(runtime);
  if (!binding) throw std::runtime_error("Passive witness requires Fabric");
  auto *manager = &binding->getUIManager();
  RootShadowNode::Shared initial;
  manager->getShadowTreeRegistry().visit(surface, [&](const ShadowTree &tree) {
    initial = tree.getCurrentRevision().rootShadowNode;
  });
  if (!initial || passiveSnapshot(initial, *prepared).count)
    throw std::logic_error("Passive witness requires accepted owned-host absence");
  {
    std::lock_guard lock(shared_->mutex);
    shared_->passive.begin(surface, initial->getFamilyShared());
    shared_->expected = std::move(prepared); shared_->witnessMode = true;
    shared_->witnessFailed.store(false, std::memory_order_release);
  }
  binding_ = std::move(binding); manager_ = manager;
  try {
    manager_->registerCommitHook(*this); registered_ = true;
    bool absent = false;
    manager_->getShadowTreeRegistry().visit(surface, [&](const ShadowTree &tree) {
      const auto current = tree.getCurrentRevision().rootShadowNode;
      std::shared_ptr<const PassiveExpected> expected;
      { std::lock_guard lock(shared_->mutex); expected = shared_->expected; }
      absent = current && proof::sameOwner(shared_->passive.surfaceFamily, current->getFamilyShared()) &&
          passiveSnapshot(current, *expected).count == 0;
    });
    std::lock_guard lock(shared_->mutex); shared_->passive.baseline(absent);
  } catch (...) { stopLocked(); throw; }
}
void AltrooPrelayoutProbe::stopPassiveWitness() noexcept {
  std::lock_guard lifecycle(control_);
  bool mode; { std::lock_guard lock(shared_->mutex); mode = shared_->witnessMode; }
  if (mode) stopLocked();
}
std::string AltrooPrelayoutProbe::passiveWitnessReport() {
  proof::PassiveJournal snapshot; std::shared_ptr<const PassiveExpected> expected;
  { std::lock_guard lock(shared_->mutex); snapshot = shared_->passive; expected = shared_->expected;
    if (shared_->witnessFailed.load(std::memory_order_acquire)) snapshot.fail("Passive observation failed");
  }
  auto report = folly::parseJson(snapshot.json());
  report["ownedProgrammeProfile"] = altroo::owned_channel::nativeProfile();
  report["fabricCommitBranching"] = ReactNativeFeatureFlags::enableFabricCommitBranching();
  if (expected) report["expectedProgramme"] = expected->programme;
  return folly::toJson(report);
}
std::string AltrooPrelayoutProbe::getReport(jsi::Runtime &) {
  proof::Journal snapshot;
  std::string conversionReport;
  std::string programmeDiagnostic;
  {
    std::lock_guard lock(shared_->mutex);
    snapshot = shared_->journal;
    conversionReport = shared_->conversionReport;
    programmeDiagnostic = shared_->programmeDiagnostic;
  }
  auto report = folly::parseJson(snapshot.json());
  if (!conversionReport.empty())
    report["ownedConversionProbe"] = folly::parseJson(conversionReport);
  if (!programmeDiagnostic.empty())
    report["ownedProgrammeDiagnostic"] = folly::parseJson(programmeDiagnostic);
  report["ownedProgrammeProfile"] = altroo::owned_channel::nativeProfile();
  return folly::toJson(report);
}
RootShadowNode::Unshared AltrooPrelayoutProbe::shadowTreeWillCommit(
    const ShadowTree &, const RootShadowNode::Shared &,
    const RootShadowNode::Unshared &candidate,
    const ShadowTreeCommitOptions &) noexcept {
  try {
    bool mode; { std::lock_guard lock(shared_->mutex); mode = shared_->witnessMode; }
    if (mode) {
      std::uint64_t epoch; std::shared_ptr<const PassiveExpected> expected;
      if (shared_->scope(candidate, epoch, expected)) {
        const auto node = passiveSnapshot(candidate, *expected);
        std::lock_guard lock(shared_->mutex);
        if (shared_->passive.active && shared_->passive.epoch == epoch)
          shared_->passive.early(candidate, node);
        else shared_->passive.fail("Stale passive candidate after stop");
      }
      return candidate;
    }
  } catch (...) { shared_->bad("Passive input could not be observed"); return candidate; }
  std::uint64_t ticket;
  {
    std::lock_guard lock(shared_->mutex);
    if (!shared_->journal.active)
      return candidate;
    ticket = shared_->journal.epoch;
  }
  try {
    auto result = altroo::prelayout::resolve(candidate);
    std::vector<proof::Observation> targets;
    std::size_t scanned = 0;
    // Exact returned identities only. These pre-layout metrics are discarded.
    collect(result.root, targets, scanned);
    if (targets.size() != result.decisions.size())
      throw std::logic_error("Controlled result count mismatch");
    std::vector<proof::Choice> choices;
    for (std::size_t i = 0; i < result.decisions.size(); ++i) {
      const auto &decision = result.decisions[i];
      const auto &target = targets[i];
      if (decision.tag != target.tag)
        throw std::logic_error("Controlled result order mismatch");
      choices.push_back({decision.tag, target.surface, target.family,
                         decision.lastChild, decision.changed,
                         decision.bottom});
    }
    const auto &c = result.counts;
    std::lock_guard lock(shared_->mutex);
    if (!shared_->journal.record(ticket, result.root,
                                 {c.scanned, c.targets, c.changedTargets,
                                  c.participatingParents, c.siblingChecks,
                                  c.requestedClones},
                                 std::move(choices)))
      return candidate;
    return result.root;
  } catch (const std::exception &error) {
    std::lock_guard lock(shared_->mutex);
    ++shared_->journal.callbackErrors;
    try {
      const auto message =
          std::string("Prelayout attempt failed; original candidate returned: ") +
          error.what();
      shared_->journal.error(message.c_str());
    } catch (...) {
    }
    return candidate;
  } catch (...) {
    std::lock_guard lock(shared_->mutex);
    ++shared_->journal.callbackErrors;
    try {
      shared_->journal.error(
          "Prelayout attempt failed; original candidate returned");
    } catch (...) {
    }
    return candidate;
  }
}
void AltrooPrelayoutProbe::shadowTreeDidCommit(
    const ShadowTree &tree, const RootShadowNode::Shared &accepted,
    const std::vector<const LayoutableShadowNode *> &) noexcept {
  // If even reading the mode fails, the optional witness must not pass.
  bool passiveMode = true;
  try {
    { std::lock_guard lock(shared_->mutex); passiveMode = shared_->witnessMode; }
    if (passiveMode) {
      std::uint64_t epoch; std::shared_ptr<const PassiveExpected> expected;
      if (!shared_->scope(accepted, epoch, expected)) return;
      const auto node = passiveSnapshot(accepted, *expected);
      const auto current = tree.getCurrentRevision();
      const bool branching = ReactNativeFeatureFlags::enableFabricCommitBranching();
      std::lock_guard lock(shared_->mutex);
      if (shared_->passive.active && shared_->passive.epoch == epoch)
        shared_->passive.accept(accepted, node, current.number,
            current.rootShadowNode == accepted && proof::sameOwner(current.rootShadowNode, accepted), branching);
      else shared_->passive.fail("Stale accepted callback after witness stop");
      return;
    }
    std::vector<proof::Observation> observations;
    std::size_t scanned = 0;
    // This is the accepted callback argument, not the latest attempt/current
    // tree. Callback chronology, native mounting and drawing require separate
    // proof.
    collect(accepted, observations, scanned);
    std::lock_guard lock(shared_->mutex);
    shared_->journal.accept(accepted, observations);
  } catch (...) {
    if (passiveMode) {
      shared_->bad("Accepted callback could not be passively observed");
      return;
    }
    std::lock_guard lock(shared_->mutex);
    ++shared_->journal.callbackErrors;
    try {
      shared_->journal.error("Accepted callback could not be journaled");
    } catch (...) {
    }
  }
}
} // namespace facebook::react
