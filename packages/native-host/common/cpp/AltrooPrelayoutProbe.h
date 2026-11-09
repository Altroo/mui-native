// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#if __has_include("AltrooMuiNativeHostSpecJSI.h")
#include <AltrooMuiNativeHostSpecJSI.h>
#else
#include <react/renderer/components/AltrooMuiNativeHostSpec/AltrooMuiNativeHostSpecJSI.h>
#endif
#include <memory>
#include <mutex>
#include "PrelayoutJournal.h"
#include <react/renderer/uimanager/UIManagerCommitHook.h>
#include <string>

namespace facebook::react {
class UIManagerBinding;
class AltrooPrelayoutProbe final
    : public NativeAltrooPrelayoutProbeCxxSpec<AltrooPrelayoutProbe>,
      private UIManagerCommitHook {
public:
  explicit AltrooPrelayoutProbe(std::shared_ptr<CallInvoker> invoker);
  ~AltrooPrelayoutProbe() override;
  void enable(jsi::Runtime &runtime);
  void disable(jsi::Runtime &runtime);
  std::string getReport(jsi::Runtime &runtime);
  void armPassiveWitness(jsi::Runtime &runtime, std::int32_t surface,
                         const std::string &programme);
  void stopPassiveWitness() noexcept;
  std::string passiveWitnessReport();
  std::weak_ptr<altroo::prelayout::probe::PassiveRuntimeSink> passiveWitnessSink() const;
  void expectPassiveGeneration(std::uint64_t generation) noexcept;

private:
  struct Shared;
  std::shared_ptr<Shared> shared_;
  std::shared_ptr<UIManagerBinding> binding_;
  UIManager *manager_ = nullptr;
  bool registered_ = false;
  mutable std::mutex control_;
  void stop() noexcept;
  void stopLocked() noexcept;
  void commitHookWasRegistered(const UIManager &) noexcept override;
  void commitHookWasUnregistered(const UIManager &) noexcept override;
  RootShadowNode::Unshared
  shadowTreeWillCommit(const ShadowTree &, const RootShadowNode::Shared &,
                       const RootShadowNode::Unshared &,
                       const ShadowTreeCommitOptions &) noexcept override;
  void shadowTreeDidCommit(
      const ShadowTree &, const RootShadowNode::Shared &,
      const std::vector<const LayoutableShadowNode *> &) noexcept override;
};
} // namespace facebook::react
