// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#include "AltrooStructuralObserver.h"
#include "AltrooPrelayoutProbe.h"
#include "AltrooStructuralStyleRuntime.h"
#include "StructuralObservationState.h"
#include "OwnedStyleMetadata.h"
#include <cmath>
#include <cstdint>
#include <map>
#include <mutex>
#include <optional>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowTreeRegistry.h>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <stdexcept>

namespace facebook::react {
namespace {
using Signature = altroo::structural::Signature;
enum class Mode { Siblings, Children };
struct Watch {
  SurfaceId surface;
  ShadowNodeFamily::Shared family;
  ShadowNodeFamily::Shared surfaceFamily;
  Mode mode;
};
std::uint64_t identifier(double value, const char *name) {
  if (!std::isfinite(value) || value < 1 ||
      value > altroo::structural::State::maxJSInteger ||
      std::floor(value) != value)
    throw std::invalid_argument(name);
  return static_cast<std::uint64_t>(value);
}
std::shared_ptr<const ShadowNode>
findByTag(const std::shared_ptr<const ShadowNode> &node, Tag tag) {
  if (node->getTag() == tag)
    return node;
  for (const auto &child : node->getChildren())
    if (auto found = findByTag(child, tag))
      return found;
  return nullptr;
}
// The JS-visible current-root policy prefers an outstanding React branch. Read
// it while holding the observer mutex, so delayed commit callbacks cannot put
// an older callback argument back over a newer accepted signature.
RootShadowNode::Shared acceptedRoot(const ShadowTree &tree) {
  return tree.getCurrentReactRevision()
      .value_or(tree.getCurrentRevision())
      .rootShadowNode;
}
Signature signature(const RootShadowNode::Shared &root, const Watch &watch) {
  Signature result;
  const ShadowNode *target = nullptr;
  const ShadowNode *parent = nullptr;
  if (root->getFamilyShared() == watch.family) {
    target = root.get();
  } else {
    // Family ancestry identifies the actual committed target without a frame,
    // native-view traversal or React.Children approximation.
    const auto ancestors = watch.family->getAncestors(*root);
    if (ancestors.empty())
      return result;
    const auto &last = ancestors.back();
    parent = &last.first.get();
    target = parent->getChildren().at(last.second).get();
  }
  result.present = true;
  const auto *container = watch.mode == Mode::Children ? target : parent;
  if (container == nullptr) {
    result.children.push_back(watch.family);
    return result;
  }
  result.parent = container->getFamilyShared();
  for (const auto &child : container->getChildren())
    result.children.push_back(child->getFamilyShared());
  return result;
}
} // namespace

struct AltrooStructuralObserver::Shared {
  std::mutex mutex;
  altroo::structural::State state;
  std::map<std::uint64_t, Watch> watches;
  std::optional<AsyncCallback<>> notify;
};

AltrooStructuralObserver::AltrooStructuralObserver(
    std::shared_ptr<CallInvoker> jsInvoker)
    : NativeAltrooStructuralObserverCxxSpec(std::move(jsInvoker)),
      shared_(std::make_shared<Shared>()) {}

AltrooStructuralObserver::~AltrooStructuralObserver() { stop(); }

AltrooPrelayoutProbe &AltrooStructuralObserver::prelayoutProbe() {
  if (!prelayout_)
    prelayout_ = std::make_unique<AltrooPrelayoutProbe>(jsInvoker_);
  return *prelayout_;
}
void AltrooStructuralObserver::enablePrelayoutProbe(jsi::Runtime &runtime) {
  prelayoutProbe().enable(runtime);
}
void AltrooStructuralObserver::disablePrelayoutProbe(jsi::Runtime &runtime) {
  if (prelayout_)
    prelayout_->disable(runtime);
}
std::string AltrooStructuralObserver::getPrelayoutReport(jsi::Runtime &runtime) {
  return prelayoutProbe().getReport(runtime);
}

AltrooStructuralStyleRuntime &AltrooStructuralObserver::styleRuntime() {
  if (!styleRuntime_)
    styleRuntime_ = std::make_unique<AltrooStructuralStyleRuntime>();
  return *styleRuntime_;
}
void AltrooStructuralObserver::enableStructuralStyleRuntime(
    jsi::Runtime &runtime, std::string owner, std::string generation,
    AsyncCallback<> notify) {
  styleRuntime().enable(runtime, owner, generation, std::move(notify));
}
bool AltrooStructuralObserver::disableStructuralStyleRuntime(
    jsi::Runtime &, std::string owner, std::string generation) {
  return styleRuntime_ ? styleRuntime_->disable(owner, generation) : false;
}
std::string
AltrooStructuralObserver::getStructuralStyleRuntimeStatus(jsi::Runtime &) {
  return styleRuntime().getStatus();
}

std::string
AltrooStructuralObserver::getStructuralStyleMetadata(jsi::Runtime &) {
  return altroo::owned_channel::structuralStyleMetadata();
}

void AltrooStructuralObserver::connect(jsi::Runtime &runtime,
                                       AsyncCallback<> notify) {
  if (manager_ != nullptr)
    throw std::logic_error("Structural observer already connected");
  auto binding = UIManagerBinding::getBinding(runtime);
  if (!binding)
    throw std::runtime_error("Structural observation requires Fabric");
  auto *manager = &binding->getUIManager();
  {
    std::lock_guard lock(shared_->mutex);
    shared_->state.begin();
    shared_->notify.emplace(std::move(notify));
  }
  binding_ = std::move(binding);
  manager_ = manager;
  try {
    manager_->registerCommitHook(*this);
    commitRegistered_ = true;
    manager_->registerMountHook(*this);
    mountRegistered_ = true;
  } catch (...) {
    stop();
    throw;
  }
}

double AltrooStructuralObserver::observe(jsi::Runtime &, double rawTag,
                                         std::string lease, std::string mode) {
  const auto numericTag =
      identifier(rawTag, "Expected a positive native root tag");
  if (numericTag > 0x7fffffff)
    throw std::invalid_argument("Native root tag exceeds int32");
  const auto tag = static_cast<Tag>(numericTag);
  Mode parsedMode;
  if (mode == "siblings")
    parsedMode = Mode::Siblings;
  else if (mode == "children")
    parsedMode = Mode::Children;
  else
    throw std::invalid_argument(
        "Expected siblings or children observation mode");
  if (manager_ == nullptr)
    throw std::logic_error("Connect the structural observer first");

  // Resolve once on the JS thread using the same revision provider as
  // NativeDOM. Do not hold our mutex while visiting the framework's tree
  // registry.
  std::shared_ptr<const ShadowNode> target;
  std::vector<SurfaceId> surfaces;
  manager_->getShadowTreeRegistry().enumerate(
      [&](const ShadowTree &tree, bool &) {
        surfaces.push_back(tree.getSurfaceId());
      });
  // The revision provider visits the registry too. Resolve only after releasing
  // enumerate's shared lock; recursive acquisition is not a supported contract.
  for (const auto surface : surfaces) {
    auto current =
        manager_->getShadowTreeRevisionProvider()->getCurrentRevision(surface);
    if (current) {
      target = findByTag(current, tag);
      if (target) {
        break;
      }
    }
  }
  if (!target)
    throw std::runtime_error(
        "Structural root is not in the current Fabric tree");
  const auto surface = target->getSurfaceId();
  const auto family = target->getFamilyShared();
  std::optional<std::uint64_t> id;
  // Installation is linearized with registry removal. A source-consistent JS
  // revision may outlive its surface; never install from that cached root
  // alone.
  manager_->getShadowTreeRegistry().visit(surface, [&](const ShadowTree &tree) {
    std::lock_guard lock(shared_->mutex);
    auto current = acceptedRoot(tree);
    Watch watch{surface, family, current->getFamilyShared(), parsedMode};
    auto initial = signature(current, watch);
    if (!initial.present)
      return;
    id = shared_->state.subscribe(lease, std::move(initial));
    shared_->watches.emplace(*id, std::move(watch));
  });
  if (!id)
    throw std::runtime_error(
        "Structural root left its Fabric surface before registration");
  scheduleNotification();
  return static_cast<double>(*id);
}

bool AltrooStructuralObserver::unobserve(jsi::Runtime &, double rawId,
                                         std::string lease) {
  const auto id = identifier(rawId, "Expected a structural subscription ID");
  std::lock_guard lock(shared_->mutex);
  if (!shared_->state.unsubscribe(id, lease))
    return false;
  shared_->watches.erase(id);
  return true;
}

std::vector<AltrooStructuralChange>
AltrooStructuralObserver::takeRecords(jsi::Runtime &) {
  std::vector<AltrooStructuralChange> result;
  std::lock_guard lock(shared_->mutex);
  for (auto &change : shared_->state.drain())
    result.push_back({static_cast<double>(change.subscriptionId),
                      std::move(change.lease),
                      static_cast<double>(change.revision), change.closed});
  return result;
}

void AltrooStructuralObserver::scheduleNotification() {
  std::optional<AsyncCallback<>> callback;
  std::optional<std::uint64_t> epoch;
  {
    std::lock_guard lock(shared_->mutex);
    epoch = shared_->state.requestNotification();
    if (epoch)
      callback = shared_->notify;
  }
  if (!callback)
    return;
  std::weak_ptr<Shared> weak = shared_;
  callback->call(
      [weak, epoch = *epoch](jsi::Runtime &runtime, jsi::Function &notify) {
        auto state = weak.lock();
        if (!state)
          return;
        {
          std::lock_guard lock(state->mutex);
          if (!state->state.notificationIsCurrent(epoch))
            return;
        }
        // AsyncCallback owns the runtime-aware weak wrapper. No native lock is
        // held across JS, and disconnected epochs cannot steal a later
        // connection's task.
        notify.call(runtime);
      });
}

void AltrooStructuralObserver::shadowTreeDidCommit(
    const ShadowTree &tree, const RootShadowNode::Shared &,
    const std::vector<const LayoutableShadowNode *> &) noexcept {
  {
    std::lock_guard lock(shared_->mutex);
    if (!shared_->state.active())
      return;
    const auto current = acceptedRoot(tree);
    for (const auto &[id, watch] : shared_->watches)
      if (watch.surface == tree.getSurfaceId() &&
          watch.surfaceFamily == current->getFamilyShared())
        shared_->state.update(id, signature(current, watch));
  }
  scheduleNotification();
}

void AltrooStructuralObserver::shadowTreeDidUnmount(SurfaceId surface,
                                                    HighResTimeStamp) noexcept {
  std::vector<std::uint64_t> eligible;
  {
    std::lock_guard lock(shared_->mutex);
    if (!shared_->state.active())
      return;
    for (const auto &[id, watch] : shared_->watches)
      if (watch.surface == surface)
        eligible.push_back(id);
  }
  // reportMount releases the registry before dispatching an unmount callback.
  // A same-ID surface can restart during that gap. Snapshot exact IDs first,
  // then recheck liveness without holding our mutex; never close a watch that
  // registered after this lifecycle read, or one belonging to the live root.
  ShadowNodeFamily::Shared liveSurface;
  manager_->getShadowTreeRegistry().visit(surface, [&](const ShadowTree &tree) {
    liveSurface = acceptedRoot(tree)->getFamilyShared();
  });
  {
    std::lock_guard lock(shared_->mutex);
    if (!shared_->state.active())
      return;
    for (const auto id : eligible) {
      const auto it = shared_->watches.find(id);
      if (it != shared_->watches.end() &&
          it->second.surfaceFamily != liveSurface) {
        shared_->state.close(id);
        shared_->watches.erase(it);
      }
    }
  }
  scheduleNotification();
}

void AltrooStructuralObserver::stop() noexcept {
  {
    std::lock_guard lock(shared_->mutex);
    shared_->state.end();
    shared_->watches.clear();
    shared_->notify.reset();
  }
  // Never wait for the framework's hook locks while holding our state mutex.
  if (manager_ && mountRegistered_)
    manager_->unregisterMountHook(*this);
  if (manager_ && commitRegistered_)
    manager_->unregisterCommitHook(*this);
  mountRegistered_ = false;
  commitRegistered_ = false;
  manager_ = nullptr;
  binding_.reset();
}

AltrooStructuralDiagnostics
AltrooStructuralObserver::getDiagnostics(jsi::Runtime &) {
  std::lock_guard lock(shared_->mutex);
  return {shared_->state.active(),
          commitRegistered_,
          mountRegistered_,
          static_cast<double>(shared_->state.size()),
          static_cast<double>(shared_->watches.size()),
          static_cast<double>(shared_->state.pendingSize()),
          shared_->state.notificationPending()};
}

void AltrooStructuralObserver::disconnect(jsi::Runtime &) { stop(); }
} // namespace facebook::react
