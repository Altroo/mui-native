// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include "OwnedProgramme.h"
#include "PrelayoutResolver.h"
#include "StructuralStyleRuntimeState.h"
#include "StructuralStyleErrorNotification.h"
#include <folly/json.h>
#include <memory>
#include <mutex>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/UIManagerCommitHook.h>

namespace facebook::react {
// Long-lived selection service for the existing controlled View resolver.
// No private Journal, constructor probes, accepted history or JSI in hooks.
class AltrooStructuralStyleRuntime final : private UIManagerCommitHook {
public:
  ~AltrooStructuralStyleRuntime() override { stop(); }
  void enable(jsi::Runtime &runtime, const std::string &ownerText,
              const std::string &generationText, AsyncCallback<> notify) {
    const auto owner = altroo::style_runtime::owner(ownerText);
    const auto ticket = altroo::style_runtime::generation(generationText);
    std::lock_guard lifecycle(control_);
    altroo::style_runtime::Status prepared;
    {
      std::lock_guard state(stateMutex_);
      if (state_.active || state_.hookRegistered || manager_ || registered_)
        throw std::logic_error("Structural style runtime is already owned");
      if (state_.generation == std::numeric_limits<std::uint64_t>::max() ||
          ticket != state_.generation + 1)
        throw std::logic_error(
            "Structural style generation is stale or exhausted");
      prepared.owner = owner;
      prepared.generation = ticket;
      prepared.active = true;
      prepared.hookRegistered = true;
    }
    auto notification = altroo::style_runtime::ErrorNotification::prepare(
        std::move(notify), ticket);
    auto binding = UIManagerBinding::getBinding(runtime);
    if (!binding)
      throw std::runtime_error("Structural style runtime requires Fabric");
    auto *manager = &binding->getUIManager();
    binding_ = std::move(binding);
    manager_ = manager;
    try {
      // Registration can allocate. Until it succeeds callbacks see inactive
      // state and return the original candidate. The registration hook is
      // no-op.
      manager_->registerCommitHook(*this);
      registered_ = true;
      std::lock_guard state(stateMutex_);
      static_assert(noexcept(state_ = prepared));
      notification->activate();
      notification_ = std::move(notification);
      state_ = prepared;
      // Void native return publishes no allocating token/status after enable.
    } catch (...) {
      if (registered_)
        manager_->unregisterCommitHook(*this);
      registered_ = false;
      manager_ = nullptr;
      binding_.reset();
      throw;
    }
  }
  bool disable(const std::string &ownerText,
               const std::string &generationText) {
    const auto owner = altroo::style_runtime::owner(ownerText);
    const auto ticket = altroo::style_runtime::generation(generationText);
    std::lock_guard lifecycle(control_);
    {
      std::lock_guard state(stateMutex_);
      if (!state_.active || state_.owner != owner ||
          state_.generation != ticket)
        return false;
    }
    stopLocked();
    return true;
  }
  std::string getStatus() const {
    altroo::style_runtime::Status snapshot;
    {
      std::lock_guard lifecycle(control_);
      std::lock_guard state(stateMutex_);
      snapshot = state_;
    }
    // All formatting/profile allocation is outside hook and state locks.
    folly::dynamic result = folly::dynamic::object;
    result["schema"] = 1;
    result["service"] = "owned-structural-style";
    result["errorNotification"] = "async-once-per-generation-v1";
    result["active"] = snapshot.active;
    result["hookRegistered"] = snapshot.hookRegistered;
    result["owner"] = std::string(snapshot.owner.data());
    result["generation"] = std::to_string(snapshot.generation);
    result["attempts"] = std::to_string(snapshot.attempts);
    result["returnedCandidates"] = std::to_string(snapshot.returnedCandidates);
    result["changedCandidates"] = std::to_string(snapshot.changedCandidates);
    result["cancelledCandidates"] =
        std::to_string(snapshot.cancelledCandidates);
    result["errors"] = std::to_string(snapshot.errors);
    result["degraded"] = snapshot.degraded;
    result["lastErrorCode"] = snapshot.errorCode ? "resolver-failure" : "none";
    result["lastError"] = std::string(snapshot.detail.data());
    result["errorPolicy"] = "original-candidate-returned-status-degraded";
    result["scope"] = "controlled-view-resolver";
    result["resolverMaxNodes"] =
        static_cast<double>(altroo::prelayout::detail::maxNodes);
    result["resolverMaxDepth"] =
        static_cast<double>(altroo::prelayout::detail::maxDepth);
    result["lastResolutionCounts"] = folly::dynamic::array;
    for (const auto count : snapshot.lastCounts)
      result["lastResolutionCounts"].push_back(static_cast<double>(count));
    result["acceptanceChronologyProved"] = false;
    result["mountedOrDrawnProved"] = false;
    result["ownedProgrammeProfile"] = altroo::owned_channel::nativeProfile();
    return folly::toJson(result);
  }

private:
  mutable std::mutex control_, stateMutex_;
  altroo::style_runtime::Status state_;
  std::shared_ptr<UIManagerBinding> binding_;
  UIManager *manager_ = nullptr;
  bool registered_ = false;
  std::shared_ptr<altroo::style_runtime::ErrorNotification> notification_;
  void stopLocked() noexcept {
    std::shared_ptr<altroo::style_runtime::ErrorNotification> retired;
    {
      std::lock_guard state(stateMutex_);
      state_.active = false;
      retired = std::move(notification_);
      if (retired)
        retired->cancel();
    }
    // RN unregister drains its owned callbacks. Never hold stateMutex_ here.
    if (manager_ && registered_)
      manager_->unregisterCommitHook(*this);
    registered_ = false;
    manager_ = nullptr;
    binding_.reset();
    std::lock_guard state(stateMutex_);
    state_.hookRegistered = false;
  }
  void stop() noexcept {
    std::lock_guard lifecycle(control_);
    stopLocked();
  }
  void commitHookWasRegistered(const UIManager &) noexcept override {}
  void commitHookWasUnregistered(const UIManager &) noexcept override {}
  RootShadowNode::Unshared
  shadowTreeWillCommit(const ShadowTree &, const RootShadowNode::Shared &,
                       const RootShadowNode::Unshared &candidate,
                       const ShadowTreeCommitOptions &) noexcept override {
    std::uint64_t ticket;
    {
      std::lock_guard state(stateMutex_);
      if (!state_.active)
        return candidate;
      ticket = state_.generation;
      altroo::style_runtime::increment(state_.attempts);
    }
    try {
      auto result = altroo::prelayout::resolve(candidate);
      if (!result.root)
        throw std::logic_error("Structural resolver returned a null root");
      std::lock_guard state(stateMutex_);
      if (!state_.active || state_.generation != ticket) {
        if (state_.generation == ticket)
          altroo::style_runtime::increment(state_.cancelledCandidates);
        return candidate;
      }
      altroo::style_runtime::increment(state_.returnedCandidates);
      if (result.root != candidate)
        altroo::style_runtime::increment(state_.changedCandidates);
      const auto &c = result.counts;
      state_.lastCounts = {c.scanned,        c.targets,
                           c.changedTargets, c.participatingParents,
                           c.siblingChecks,  c.requestedClones};
      return result.root;
    } catch (const std::exception &exception) {
      recordFailure(ticket, exception.what());
      return candidate;
    } catch (...) {
      recordFailure(ticket, "Unknown structural resolver failure");
      return candidate;
    }
  }
  void recordFailure(std::uint64_t ticket, const char *message) noexcept {
    std::shared_ptr<altroo::style_runtime::ErrorNotification> notification;
    {
      std::lock_guard state(stateMutex_);
      if (state_.active && state_.generation == ticket) {
        altroo::style_runtime::error(state_, message);
        notification = notification_;
      } else if (state_.generation == ticket) {
        altroo::style_runtime::increment(state_.cancelledCandidates);
      }
    }
    // Do not schedule under stateMutex_: even an invoker that queues eagerly
    // must not deadlock a status read or ownership cleanup on another thread.
    if (notification)
      notification->request();
  }
};
} // namespace facebook::react
