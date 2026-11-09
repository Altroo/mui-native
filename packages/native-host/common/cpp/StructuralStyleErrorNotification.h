// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <react/bridging/Function.h>

namespace altroo::style_runtime {
// One queued error notification per generation. No runtime is borrowed by us.
// RN AsyncCallback owns the weak runtime/function delivery contract.
class ErrorNotification final {
public:
  static std::shared_ptr<ErrorNotification>
  prepare(facebook::react::AsyncCallback<> notify, std::uint64_t generation) {
    auto gate = std::shared_ptr<ErrorNotification>(
        new ErrorNotification(std::move(notify), generation));
    std::weak_ptr<ErrorNotification> weak = gate;
    // Allocate the delivery closure before hook registration/publication.
    gate->delivery_ = [weak, generation](facebook::jsi::Runtime &runtime,
                                       facebook::jsi::Function &function) {
      auto current = weak.lock();
      if (!current || !current->active_.load(std::memory_order_acquire) ||
          current->generation_ != generation)
        return;
      // No native lock spans JavaScript. A call already admitted here cannot
      // be withdrawn by concurrent stop; JS also checks its live lease.
      function.call(runtime);
    };
    return gate;
  }
  void activate() noexcept { active_.store(true, std::memory_order_release); }
  void cancel() noexcept { active_.store(false, std::memory_order_release); }
  void request() noexcept {
    if (!active_.load(std::memory_order_acquire) ||
        requested_.exchange(true, std::memory_order_acq_rel))
      return;
    // This queues through RN's ordinary CallInvoker, never executes JSI here.
    notify_.call(std::move(delivery_));
  }
private:
  ErrorNotification(facebook::react::AsyncCallback<> notify,
                    std::uint64_t generation)
      : notify_(std::move(notify)), generation_(generation) {}
  facebook::react::AsyncCallback<> notify_;
  const std::uint64_t generation_;
  std::atomic<bool> active_{false}, requested_{false};
  std::function<void(facebook::jsi::Runtime &, facebook::jsi::Function &)> delivery_;
};
} // namespace altroo::style_runtime
