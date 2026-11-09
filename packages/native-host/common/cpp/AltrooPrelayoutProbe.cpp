// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#include "AltrooPrelayoutProbe.h"
#include "OwnedProgramme.h"
#include "ChannelProbe.h"
#include "OwnedConversionProbe.h"
#include "PrelayoutJournal.h"
#include "PrelayoutResolver.h"
#include <mutex>
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
} // namespace
struct AltrooPrelayoutProbe::Shared {
  std::mutex mutex;
  proof::Journal journal;
  std::string conversionReport;
  std::string programmeDiagnostic;
};
AltrooPrelayoutProbe::AltrooPrelayoutProbe(std::shared_ptr<CallInvoker> invoker)
    : NativeAltrooPrelayoutProbeCxxSpec(std::move(invoker)),
      shared_(std::make_shared<Shared>()) {}
AltrooPrelayoutProbe::~AltrooPrelayoutProbe() { stop(); }
void AltrooPrelayoutProbe::enable(jsi::Runtime &runtime) {
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
    stop();
    throw;
  }
}
void AltrooPrelayoutProbe::disable(jsi::Runtime &) { stop(); }
void AltrooPrelayoutProbe::stop() noexcept {
  {
    std::lock_guard lock(shared_->mutex);
    shared_->journal.deactivate();
  }
  if (registered_) {
    manager_->unregisterCommitHook(*this);
    registered_ = false;
  }
  {
    std::lock_guard lock(shared_->mutex);
    shared_->journal.hookRegistered = false;
  }
  manager_ = nullptr;
  binding_.reset();
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
    const ShadowTree &, const RootShadowNode::Shared &accepted,
    const std::vector<const LayoutableShadowNode *> &) noexcept {
  try {
    std::vector<proof::Observation> observations;
    std::size_t scanned = 0;
    // This is the accepted callback argument, not the latest attempt/current
    // tree. Callback chronology, native mounting and drawing require separate
    // proof.
    collect(accepted, observations, scanned);
    std::lock_guard lock(shared_->mutex);
    shared_->journal.accept(accepted, observations);
  } catch (...) {
    std::lock_guard lock(shared_->mutex);
    ++shared_->journal.callbackErrors;
    try {
      shared_->journal.error("Accepted callback could not be journaled");
    } catch (...) {
    }
  }
}
} // namespace facebook::react
