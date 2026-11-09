// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Compile the actual adapter bytes against a finite framework scheduling double.
// Actual RN declarations are checked separately with both platform SDK headers.
const framework = String.raw`
#pragma once
#include <algorithm>
#include <cstdint>
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <stdexcept>
#include <utility>
#include <vector>
namespace altroo::prelayout::probe { struct PassiveRuntimeSink; }
namespace facebook::jsi { struct Runtime {}; struct Function { void call(Runtime&) {} }; }
namespace facebook::react {
using SurfaceId=int; using Tag=int; using HighResTimeStamp=double;
struct CallInvoker {};
template<class...A> struct AsyncCallback {template<class F> void call(F&&) const {}};
template<class T> struct NativeAltrooStructuralObserverCxxSpec {std::shared_ptr<CallInvoker> jsInvoker_;explicit NativeAltrooStructuralObserverCxxSpec(std::shared_ptr<CallInvoker> invoker):jsInvoker_(std::move(invoker)){} virtual ~NativeAltrooStructuralObserverCxxSpec()=default;};
struct ShadowNode; struct RootShadowNode;
struct ShadowNodeFamily {
 using Shared=std::shared_ptr<const ShadowNodeFamily>;
 using Ancestors=std::vector<std::pair<std::reference_wrapper<const ShadowNode>,std::size_t>>;
 Ancestors getAncestors(const RootShadowNode&) const;
};
struct ShadowNode {
 using Shared=std::shared_ptr<const ShadowNode>;
 Tag tag; SurfaceId surface; ShadowNodeFamily::Shared family; std::vector<Shared> children;
 Tag getTag()const{return tag;} SurfaceId getSurfaceId()const{return surface;}
 const ShadowNodeFamily::Shared& getFamilyShared()const{return family;}
 const std::vector<Shared>& getChildren()const{return children;}
};
struct RootShadowNode:ShadowNode{using Shared=std::shared_ptr<const RootShadowNode>;};
inline ShadowNodeFamily::Ancestors ShadowNodeFamily::getAncestors(const RootShadowNode& root)const {
 Ancestors out;
 std::function<bool(const ShadowNode&)> walk=[&](const ShadowNode& node){
  for(std::size_t i=0;i<node.children.size();++i){out.emplace_back(std::cref(node),i);if(node.children[i]->family.get()==this||walk(*node.children[i]))return true;out.pop_back();}return false;
 };walk(root);return out;
}
struct LayoutableShadowNode{};
struct Revision {RootShadowNode::Shared rootShadowNode;};
struct TreeState {RootShadowNode::Shared root;std::optional<Revision> react;};
struct ShadowTree {
 SurfaceId id;std::shared_ptr<TreeState> state;
 ShadowTree(SurfaceId s,RootShadowNode::Shared r):id(s),state(std::make_shared<TreeState>(TreeState{std::move(r),{}})){}
 SurfaceId getSurfaceId()const{return id;}
 Revision getCurrentRevision()const{return {state->root};}
 std::optional<Revision> getCurrentReactRevision()const{return state->react;}
 void setRoot(RootShadowNode::Shared r){state->root=std::move(r);}
};
struct UIManager;
struct UIManagerCommitHook {virtual ~UIManagerCommitHook()=default;virtual void shadowTreeDidCommit(const ShadowTree&,const RootShadowNode::Shared&,const std::vector<const LayoutableShadowNode*>&) noexcept=0;};
struct UIManagerMountHook {virtual ~UIManagerMountHook()=default;virtual void shadowTreeDidUnmount(SurfaceId,HighResTimeStamp) noexcept=0;};
struct Registry {
 std::vector<ShadowTree> trees;std::function<void(bool)> afterVisit;
 template<class F>void enumerate(F&&f){bool stop=false;for(auto&tree:trees){f(tree,stop);if(stop)break;}}
 template<class F>bool visit(SurfaceId s,F&&f){
  bool found=false;for(auto&tree:trees)if(tree.id==s){f(tree);found=true;break;}
  if(afterVisit){auto once=std::move(afterVisit);afterVisit={};once(found);}return found;
 }
};
struct Provider {Registry& registry;std::function<void()> afterRead;
 RootShadowNode::Shared getCurrentRevision(SurfaceId id){RootShadowNode::Shared r;for(auto&t:registry.trees)if(t.id==id)r=t.getCurrentReactRevision().value_or(t.getCurrentRevision()).rootShadowNode;if(afterRead){auto once=std::move(afterRead);afterRead={};once();}return r;}
};
struct UIManager {
 Registry registry;Provider provider{registry,{}};std::vector<UIManagerCommitHook*> commits;std::vector<UIManagerMountHook*> mounts;
 Registry& getShadowTreeRegistry(){return registry;}Provider*getShadowTreeRevisionProvider(){return &provider;}
 void registerCommitHook(UIManagerCommitHook&h){commits.push_back(&h);}void unregisterCommitHook(UIManagerCommitHook&h){std::erase(commits,&h);}
 void registerMountHook(UIManagerMountHook&h){mounts.push_back(&h);}void unregisterMountHook(UIManagerMountHook&h){std::erase(mounts,&h);}
 void commit(const ShadowTree&t,const RootShadowNode::Shared&r){for(auto*h:commits)h->shadowTreeDidCommit(t,r,{});}
 void remove(SurfaceId s){std::erase_if(registry.trees,[&](auto&t){return t.id==s;});}
 void notifyUnmount(SurfaceId s){for(auto*h:mounts)h->shadowTreeDidUnmount(s,0);}
 void unmount(SurfaceId s){remove(s);notifyUnmount(s);}
};
struct UIManagerBinding {std::shared_ptr<UIManager> manager;static inline std::shared_ptr<UIManagerBinding> current;static auto getBinding(jsi::Runtime&){return current;}UIManager& getUIManager(){return *manager;}};
struct AltrooStructuralChange {double subscriptionId;std::string lease;double revision;bool closed;};
struct AltrooStructuralDiagnostics {bool connected,commitHookRegistered,mountHookRegistered;double subscriptions,observedRoots,pendingRecords;bool notificationPending;};
// Lazy probe/style dependencies are outside this observation scheduling model.
// Fail if observation calls them; SDK/runtime suites test their implementations.
class AltrooPrelayoutProbe {
public:
 explicit AltrooPrelayoutProbe(std::shared_ptr<CallInvoker>){throw std::logic_error("Unexpected prelayout allocation");}
 void enable(jsi::Runtime&){throw std::logic_error("Unexpected prelayout enable");}
 void disable(jsi::Runtime&){throw std::logic_error("Unexpected prelayout disable");}
 std::string getReport(jsi::Runtime&){throw std::logic_error("Unexpected prelayout report");}
 void armPassiveWitness(jsi::Runtime&,std::int32_t,const std::string&){throw std::logic_error("Unexpected passive arm");}
 void stopPassiveWitness(){throw std::logic_error("Unexpected passive stop");}
 std::string passiveWitnessReport(){throw std::logic_error("Unexpected passive report");}
 std::weak_ptr<altroo::prelayout::probe::PassiveRuntimeSink> passiveWitnessSink()const{throw std::logic_error("Unexpected passive sink");}
 void expectPassiveGeneration(std::uint64_t){throw std::logic_error("Unexpected passive generation");}
};
class AltrooStructuralStyleRuntime {
public:
 AltrooStructuralStyleRuntime(){throw std::logic_error("Unexpected style allocation");}
 void enable(jsi::Runtime&,const std::string&,const std::string&,AsyncCallback<>){throw std::logic_error("Unexpected style enable");}
 bool disable(const std::string&,const std::string&){throw std::logic_error("Unexpected style disable");}
 std::string getStatus(){throw std::logic_error("Unexpected style status");}
 std::uint64_t installPassiveWitness(const std::weak_ptr<altroo::prelayout::probe::PassiveRuntimeSink>&){throw std::logic_error("Unexpected passive install");}
 void clearPassiveWitness(const std::weak_ptr<altroo::prelayout::probe::PassiveRuntimeSink>&){throw std::logic_error("Unexpected passive clear");}
};
class AltrooStructuralObserver final:public NativeAltrooStructuralObserverCxxSpec<AltrooStructuralObserver>,private UIManagerCommitHook,private UIManagerMountHook{
public:
 explicit AltrooStructuralObserver(std::shared_ptr<CallInvoker>);~AltrooStructuralObserver() override;
 void connect(jsi::Runtime&,AsyncCallback<>);double observe(jsi::Runtime&,double,std::string,std::string);bool unobserve(jsi::Runtime&,double,std::string);std::vector<AltrooStructuralChange>takeRecords(jsi::Runtime&);void disconnect(jsi::Runtime&);AltrooStructuralDiagnostics getDiagnostics(jsi::Runtime&);
 void enablePrelayoutProbe(jsi::Runtime&);void disablePrelayoutProbe(jsi::Runtime&);std::string getPrelayoutReport(jsi::Runtime&);
 void armFirstOwnedCandidateWitness(jsi::Runtime&,double,std::string);void stopFirstOwnedCandidateWitness(jsi::Runtime&);std::string getFirstOwnedCandidateWitness(jsi::Runtime&);
 void enableStructuralStyleRuntime(jsi::Runtime&,std::string,std::string,AsyncCallback<>);bool disableStructuralStyleRuntime(jsi::Runtime&,std::string,std::string);std::string getStructuralStyleRuntimeStatus(jsi::Runtime&);std::string getStructuralStyleMetadata(jsi::Runtime&);
private:
 std::unique_ptr<AltrooPrelayoutProbe>prelayout_;AltrooPrelayoutProbe& prelayoutProbe();std::unique_ptr<AltrooStructuralStyleRuntime>styleRuntime_;AltrooStructuralStyleRuntime& styleRuntime();
 struct Shared;std::shared_ptr<Shared>shared_;std::shared_ptr<UIManagerBinding>binding_;UIManager*manager_=nullptr;bool commitRegistered_=false,mountRegistered_=false;
 void stop()noexcept;void scheduleNotification();
 void shadowTreeDidCommit(const ShadowTree&,const RootShadowNode::Shared&,const std::vector<const LayoutableShadowNode*>&)noexcept override;
 void shadowTreeDidUnmount(SurfaceId,HighResTimeStamp)noexcept override;
};
}
namespace altroo::owned_channel {inline std::string structuralStyleMetadata(){throw std::logic_error("Unexpected style metadata");}}
`;
const probe = String.raw`
#include "AltrooStructuralObserver.h"
#include <iostream>
#include <stdexcept>
using namespace facebook;using namespace facebook::react;
int checks=0;void check(bool ok,const char* message){if(!ok)throw std::runtime_error(message);++checks;}
struct Scene {
 std::shared_ptr<ShadowNodeFamily>rf=std::make_shared<ShadowNodeFamily>(),a=std::make_shared<ShadowNodeFamily>(),b=std::make_shared<ShadowNodeFamily>();
 RootShadowNode::Shared root(bool reverse=false) {
  auto r=std::make_shared<RootShadowNode>();r->tag=1;r->surface=1;r->family=rf;
  auto one=std::make_shared<ShadowNode>();one->tag=11;one->surface=1;one->family=a;
  auto two=std::make_shared<ShadowNode>();two->tag=12;two->surface=1;two->family=b;
  r->children=reverse?std::vector<ShadowNode::Shared>{two,one}:std::vector<ShadowNode::Shared>{one,two};return r;
 }
};
struct Fixture{
 jsi::Runtime rt;Scene scene;std::shared_ptr<UIManager>manager=std::make_shared<UIManager>();AltrooStructuralObserver observer{std::make_shared<CallInvoker>()};
 Fixture(){manager->registry.trees.emplace_back(1,scene.root());UIManagerBinding::current=std::make_shared<UIManagerBinding>(UIManagerBinding{manager});observer.connect(rt,{});}
 ~Fixture(){observer.disconnect(rt);UIManagerBinding::current.reset();}
};
int main(){
 {Fixture f;f.observer.observe(f.rt,11,"ordinary-close","siblings");f.observer.takeRecords(f.rt);f.manager->unmount(1);auto v=f.observer.takeRecords(f.rt);auto d=f.observer.getDiagnostics(f.rt);check(v.size()==1&&v[0].closed&&d.observedRoots==0,"ordinary close");}
 {Fixture f;f.manager->provider.afterRead=[&]{f.manager->unmount(1);};bool rejected=false;try{f.observer.observe(f.rt,11,"stop-before-insert","siblings");}catch(const std::runtime_error&){rejected=true;}auto d=f.observer.getDiagnostics(f.rt);check(rejected&&d.observedRoots==0&&d.subscriptions==0&&f.observer.takeRecords(f.rt).empty(),"stopped surface registration must reject without retention");}
 {Fixture f;f.manager->provider.afterRead=[&]{auto r=std::make_shared<RootShadowNode>(*f.scene.root());r->children.clear();f.manager->registry.trees[0].setRoot(r);};bool rejected=false;try{f.observer.observe(f.rt,11,"removed-before-insert","siblings");}catch(const std::runtime_error&){rejected=true;}check(rejected&&f.observer.getDiagnostics(f.rt).observedRoots==0,"removed family registration must reject");}
 {Fixture f;auto id=f.observer.observe(f.rt,11,"ordered","siblings");f.observer.takeRecords(f.rt);auto a=f.scene.root(),b=f.scene.root(true);auto tree=f.manager->registry.trees[0];tree.setRoot(b);f.manager->commit(tree,b);auto v=f.observer.takeRecords(f.rt);check(v.size()==1&&v[0].subscriptionId==id,"serialized forward order");tree.setRoot(a);f.manager->commit(tree,a);check(f.observer.takeRecords(f.rt).size()==1,"serialized reverse order");}
 {Fixture f;f.observer.observe(f.rt,11,"delayed","siblings");f.observer.takeRecords(f.rt);auto a=f.scene.root(),b=f.scene.root(true);auto tree=f.manager->registry.trees[0];tree.setRoot(b);f.manager->commit(tree,b);f.manager->commit(tree,a);check(f.observer.takeRecords(f.rt).size()==1,"newer accepted B remains observed");tree.setRoot(a);f.manager->commit(tree,a);check(f.observer.takeRecords(f.rt).size()==1,"delayed A must not hide next B to A");}
 {Fixture f;auto a=f.scene.root(),b=f.scene.root(true);f.manager->provider.afterRead=[&]{f.manager->registry.trees[0].setRoot(b);};f.observer.observe(f.rt,11,"catch-up","siblings");f.observer.takeRecords(f.rt);auto tree=f.manager->registry.trees[0];tree.setRoot(a);f.manager->commit(tree,a);check(f.observer.takeRecords(f.rt).size()==1,"registration catches accepted change after provider read");}
 {Fixture f;f.observer.observe(f.rt,11,"react-priority","siblings");f.observer.takeRecords(f.rt);auto a=f.scene.root(),b=f.scene.root(true);auto tree=f.manager->registry.trees[0];tree.state->react=Revision{b};f.manager->commit(tree,a);check(f.observer.takeRecords(f.rt).size()==1,"outstanding React root wins over main root");tree.state->react.reset();tree.setRoot(a);f.manager->commit(tree,b);check(f.observer.takeRecords(f.rt).size()==1,"React promotion/reset samples current main");}
 {Fixture f;f.observer.observe(f.rt,11,"old-generation","siblings");f.observer.takeRecords(f.rt);auto oldTree=f.manager->registry.trees[0];f.manager->remove(1);Scene next;f.manager->registry.trees.emplace_back(1,next.root());auto id=f.observer.observe(f.rt,11,"new-generation","siblings");f.observer.takeRecords(f.rt);f.manager->notifyUnmount(1);auto v=f.observer.takeRecords(f.rt);auto d=f.observer.getDiagnostics(f.rt);check(v.size()==1&&v[0].closed&&v[0].lease=="old-generation"&&d.observedRoots==1,"stale unmount closes only old root generation");f.manager->commit(oldTree,oldTree.getCurrentRevision().rootShadowNode);check(f.observer.takeRecords(f.rt).empty(),"old tree commit cannot change new generation");auto tree=f.manager->registry.trees[0];tree.setRoot(next.root(true));f.manager->commit(tree,tree.getCurrentRevision().rootShadowNode);v=f.observer.takeRecords(f.rt);check(v.size()==1&&v[0].subscriptionId==id&&!v[0].closed,"new generation remains live");}
 {Fixture f;f.observer.observe(f.rt,11,"old-before-read","siblings");f.observer.takeRecords(f.rt);f.manager->remove(1);Scene next;double newId=0;f.manager->registry.afterVisit=[&](bool found){check(!found,"old unmount observes absence");f.manager->registry.trees.emplace_back(1,next.root());newId=f.observer.observe(f.rt,11,"new-after-read","siblings");};f.manager->notifyUnmount(1);auto v=f.observer.takeRecords(f.rt);bool closedOld=false,liveNew=false;for(auto&r:v){closedOld|=r.lease=="old-before-read"&&r.closed;liveNew|=r.subscriptionId==newId&&!r.closed;}check(closedOld&&liveNew&&f.observer.getDiagnostics(f.rt).observedRoots==1,"late new lease cannot be swept up by old absence read");}
 {Fixture f;f.observer.observe(f.rt,11,"unrelated","siblings");f.observer.takeRecords(f.rt);auto tree=f.manager->registry.trees[0];tree.setRoot(f.scene.root());f.manager->commit(tree,tree.getCurrentRevision().rootShadowNode);check(f.observer.takeRecords(f.rt).empty(),"same families remain silent");f.observer.disconnect(f.rt);auto d=f.observer.getDiagnostics(f.rt);check(!d.connected&&!d.commitHookRegistered&&!d.mountHookRegistered&&d.observedRoots==0&&d.subscriptions==0,"complete adapter teardown");}
 std::cout<<checks<<" production-adapter interleaving assertions passed\n";
}
`;

test('actual C++ adapter rejects stale registration and obsolete commit/unmount callbacks', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'mui-structural-adapter-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  await writeFile(join(folder, 'AltrooStructuralObserver.h'), framework);
  for (const file of [
    'AltrooPrelayoutProbe.h',
    'AltrooStructuralStyleRuntime.h',
    'OwnedStyleMetadata.h',
  ])
    await writeFile(join(folder, file), '#pragma once\n');
  for (const file of ['AltrooStructuralObserver.cpp', 'StructuralObservationState.h']) {
    await writeFile(
      join(folder, file),
      await readFile(new URL('../common/cpp/' + file, import.meta.url)),
    );
  }
  for (const path of [
    'mounting/ShadowTree.h',
    'mounting/ShadowTreeRegistry.h',
    'uimanager/UIManager.h',
    'uimanager/UIManagerBinding.h',
  ]) {
    const target = join(folder, 'react/renderer', path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, '#pragma once\n');
  }
  await writeFile(join(folder, 'probe.cpp'), probe);
  const executable = join(folder, 'probe');
  const args = ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-I', folder];
  if (process.platform === 'darwin' && process.env.SDKROOT)
    args.push('-isysroot', process.env.SDKROOT);
  args.push(
    join(folder, 'AltrooStructuralObserver.cpp'),
    join(folder, 'probe.cpp'),
    '-o',
    executable,
  );
  const compile = spawnSync(process.env.CXX ?? 'c++', args, { encoding: 'utf8', timeout: 30000 });
  assert.equal(compile.status, 0, compile.error?.message ?? compile.stderr);
  const run = spawnSync(executable, [], { encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.error?.message ?? run.stderr);
  assert.match(run.stdout, /17 production-adapter interleaving assertions passed/);
});
