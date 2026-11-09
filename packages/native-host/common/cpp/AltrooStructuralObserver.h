// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#if __has_include("AltrooMuiNativeHostSpecJSI.h")
#include "AltrooMuiNativeHostSpecJSI.h"
#else
#include <react/renderer/components/AltrooMuiNativeHostSpec/AltrooMuiNativeHostSpecJSI.h>
#endif
#include <memory>
#include <react/renderer/uimanager/UIManagerCommitHook.h>
#include <react/renderer/uimanager/UIManagerMountHook.h>
#include <string>
#include <vector>

namespace facebook::react {
class UIManagerBinding;
class AltrooPrelayoutProbe;
class AltrooStructuralStyleRuntime;
using AltrooStructuralChange =
    NativeAltrooStructuralObserverStructuralChange<double, std::string, double,
                                                   bool>;
template <>
struct Bridging<AltrooStructuralChange>
    : NativeAltrooStructuralObserverStructuralChangeBridging<
          AltrooStructuralChange> {};

using AltrooStructuralDiagnostics =
    NativeAltrooStructuralObserverStructuralDiagnostics<
        bool, bool, bool, double, double, double, bool>;
template <>
struct Bridging<AltrooStructuralDiagnostics>
    : NativeAltrooStructuralObserverStructuralDiagnosticsBridging<
          AltrooStructuralDiagnostics> {};

// Internal opt-in prototype. This observes existing logical families and never
// inserts a host, changes a feature flag, mutates props, or polls a frame
// clock.
class AltrooStructuralObserver final
    : public NativeAltrooStructuralObserverCxxSpec<AltrooStructuralObserver>,
      private UIManagerCommitHook,
      private UIManagerMountHook {
public:
  explicit AltrooStructuralObserver(std::shared_ptr<CallInvoker> jsInvoker);
  ~AltrooStructuralObserver() override;
  void connect(jsi::Runtime &runtime, AsyncCallback<> notify);
  double observe(jsi::Runtime &runtime, double tag, std::string lease,
                 std::string mode);
  bool unobserve(jsi::Runtime &runtime, double subscriptionId,
                 std::string lease);
  std::vector<AltrooStructuralChange> takeRecords(jsi::Runtime &runtime);
  void disconnect(jsi::Runtime &runtime);
  AltrooStructuralDiagnostics getDiagnostics(jsi::Runtime &runtime);
  void enablePrelayoutProbe(jsi::Runtime &runtime);
  void disablePrelayoutProbe(jsi::Runtime &runtime);
  std::string getPrelayoutReport(jsi::Runtime &runtime);
  void armFirstOwnedCandidateWitness(jsi::Runtime &runtime, double surface,
                                     std::string programme);
  void stopFirstOwnedCandidateWitness(jsi::Runtime &runtime);
  std::string getFirstOwnedCandidateWitness(jsi::Runtime &runtime);
  void enableStructuralStyleRuntime(jsi::Runtime &runtime, std::string owner,
                                    std::string generation, AsyncCallback<> notify);
  bool disableStructuralStyleRuntime(jsi::Runtime &runtime, std::string owner,
                                     std::string generation);
  std::string getStructuralStyleRuntimeStatus(jsi::Runtime &runtime);
  std::string getStructuralStyleMetadata(jsi::Runtime &runtime);

private:
  // Lazy and separate ownership: disconnect stops observation, not this probe.
  std::unique_ptr<AltrooPrelayoutProbe> prelayout_;
  AltrooPrelayoutProbe &prelayoutProbe();
  std::unique_ptr<AltrooStructuralStyleRuntime> styleRuntime_;
  AltrooStructuralStyleRuntime &styleRuntime();
  struct Shared;
  std::shared_ptr<Shared> shared_;
  // The binding owns UIManager. Keep it alive until both hooks are removed;
  // cache the manager pointer before invalidation and never call a dead
  // binding.
  std::shared_ptr<UIManagerBinding> binding_;
  UIManager *manager_ = nullptr;
  bool commitRegistered_ = false;
  bool mountRegistered_ = false;
  void stop() noexcept;
  void scheduleNotification();
  void commitHookWasRegistered(const UIManager &) noexcept override {}
  void commitHookWasUnregistered(const UIManager &) noexcept override {}
  void shadowTreeDidCommit(
      const ShadowTree &, const RootShadowNode::Shared &root,
      const std::vector<const LayoutableShadowNode *> &) noexcept override;
  void shadowTreeDidMount(const RootShadowNode::Shared &,
                          HighResTimeStamp) noexcept override {}
  void shadowTreeDidUnmount(SurfaceId surfaceId,
                            HighResTimeStamp) noexcept override;
};
} // namespace facebook::react
