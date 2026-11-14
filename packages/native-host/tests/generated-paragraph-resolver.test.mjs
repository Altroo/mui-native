// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Compile exact production resolver with finite data/COW doubles, not RN/Yoga.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const production = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../common/cpp');
const sources = {
  // language=TEXT
  'adapter/Framework.h': String.raw`// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite scheduling/data double. No RN/Yoga layout or runtime-reference proof.
#pragma once
#include <atomic>
#include <functional>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
#include <array>
#include <optional>
namespace facebook::yoga {
enum class Edge { Bottom, Vertical, All };
struct FloatOptional { float number; float unwrap() const {return number;} };
struct StyleLength {
 float number{};bool defined{};
 static StyleLength points(float value){return {value,true};}
 bool isUndefined() const{return !defined;}
 bool isPoints() const{return defined;}
 FloatOptional value() const{return {number};}
 bool operator==(const StyleLength&)const=default;
};
struct Style {
 using Length=StyleLength;
 std::array<Length,3> values{};
 bool hidden{};float width{40},height{40};
 Length padding(Edge edge)const{return values[static_cast<int>(edge)];}
 void setPadding(Edge edge,Length value){values[static_cast<int>(edge)]=value;}
};
}
namespace facebook::react {
#ifdef MODEL_DOUBLE_FLOAT
using Float=double;
#else
using Float=float;
#endif
using Tag = int;
using SurfaceId = int;
using ComponentHandle = const void *;
inline std::atomic<int> rawParses{0}, cloneCalls{0}, failCloneAt{0};
inline bool rejectParsing = false;
inline std::atomic<std::size_t> observedChildEntries{0};
struct PropsParserContext {};
struct RawProps {};
struct ComponentDescriptorParameters {};
class Props {
public:
  using Shared = std::shared_ptr<const Props>;
  mutable bool sealed = false;
  std::string nativeId;
  Props() = default;
  Props(const Props &source) : sealed(false), nativeId(source.nativeId) {};
  virtual ~Props() = default;
  void ensureUnsealed() const {
    if (sealed)
      throw std::logic_error("mutated sealed props");
  }
  void seal() const { sealed = true; }
};
class ViewProps : public Props {
public:
  yoga::Style yogaStyle;
  ViewProps() = default;
  ViewProps(const PropsParserContext &, const ViewProps &source,
            const RawProps &)
      : Props(source), yogaStyle(source.yogaStyle) {
    ++rawParses;
    if (rejectParsing)
      throw std::runtime_error("raw props parser rerun");
  }
};
template <class T>
T convertRawProp(const PropsParserContext &, const RawProps &, const char *,
                 T source, T) {
  return source;
}
struct ScrollViewState { int contentRevision{7}; };
struct ShadowNode;
struct ShadowNodeFragment {
  const Props::Shared &props = propsPlaceholder();
  const std::shared_ptr<const std::vector<std::shared_ptr<const ShadowNode>>>
      &children = childrenPlaceholder();
  const bool runtimeShadowNodeReference = true;
  static const Props::Shared &propsPlaceholder() {
    static Props::Shared p;
    return p;
  }
  static const std::shared_ptr<
      const std::vector<std::shared_ptr<const ShadowNode>>> &
  childrenPlaceholder() {
    static std::shared_ptr<const std::vector<std::shared_ptr<const ShadowNode>>>
        p;
    return p;
  }
};
struct ShadowNodeFamily {
  using Shared = std::shared_ptr<const ShadowNodeFamily>;
  Tag tag;
  SurfaceId surface;
  ComponentHandle handle;
  std::function<std::shared_ptr<ShadowNode>(const ShadowNode &,
                                            const ShadowNodeFragment &)>
      clone;
};
struct ShadowNodeTraits {
 enum class Trait : unsigned {ViewKind=1,RootNodeKind=2,Hidden=4,FormsView=64};
 unsigned bits{};
 void set(Trait value){bits|=static_cast<unsigned>(value);}
 bool check(Trait value)const{return (bits&static_cast<unsigned>(value))==static_cast<unsigned>(value);}
};
struct ShadowNode {
  Props::Shared props;
  std::shared_ptr<const std::vector<std::shared_ptr<const ShadowNode>>>
      children;
  ShadowNodeFamily::Shared family;
  ShadowNodeTraits traits;
  mutable bool sealed = false;
  std::shared_ptr<const ScrollViewState> scrollState;
  ShadowNode(const ShadowNodeFragment &fragment,
             const ShadowNodeFamily::Shared &owner, ShadowNodeTraits initialTraits)
      : props(fragment.props), children(fragment.children), family(owner), traits(initialTraits) {
    if (!children)
      children = std::make_shared<
          const std::vector<std::shared_ptr<const ShadowNode>>>();
  }
  ShadowNode(const ShadowNode &source, const ShadowNodeFragment &fragment)
      : props(fragment.props ? fragment.props : source.props),
        children(fragment.children ? fragment.children : source.children),
        family(source.family), traits(source.traits), scrollState(source.scrollState) {}
  virtual ~ShadowNode() = default;
  const auto &getChildren() const {
    observedChildEntries += children->size();
    return *children;
  }
  const auto &getFamilyShared() const { return family; }
  const auto &getProps() const {return props;}
  Tag getTag() const { return family->tag; }
  SurfaceId getSurfaceId() const { return family->surface; }
  ComponentHandle getComponentHandle() const { return family->handle; }
  const ShadowNodeTraits &getTraits() const{return traits;}
  const char *getComponentName()const{return static_cast<const char*>(family->handle);}
  std::shared_ptr<ShadowNode> clone(const ShadowNodeFragment &fragment) const {
    const int count = ++cloneCalls;
    if (failCloneAt > 0 && count == failCloneAt)
      throw std::bad_alloc();
    return family->clone(*this, fragment);
  }
  void sealRecursive() const {
    sealed = true;
    props->seal();
    for (const auto &child : *children)
      if (child)
        child->sealRecursive();
  }
};
struct YogaLayoutableShadowNode : ShadowNode {
  using ShadowNode::ShadowNode;
};
template <const char *Name, class P = ViewProps>
struct ConcreteViewShadowNode : YogaLayoutableShadowNode {
  using YogaLayoutableShadowNode::YogaLayoutableShadowNode;
  const P &getConcreteProps() const { return static_cast<const P &>(*props); }
  static ComponentHandle Handle() { return Name; }
  static ShadowNodeTraits BaseTraits(){ShadowNodeTraits traits;traits.set(ShadowNodeTraits::Trait::ViewKind);return traits;}
};
template <class T> struct ConcreteComponentDescriptor {
  explicit ConcreteComponentDescriptor(const ComponentDescriptorParameters &) {
  };
};
inline const char ParagraphComponentName[]="Paragraph", RawTextComponentName[]="RawText";
struct ParagraphShadowNode final : ConcreteViewShadowNode<ParagraphComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct RawTextShadowNode final : ConcreteViewShadowNode<RawTextComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;static ShadowNodeTraits BaseTraits(){return {};}};
inline constexpr char fakeParagraphName[]="Paragraph";
struct FakeParagraph final : ConcreteViewShadowNode<fakeParagraphName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
inline constexpr char viewName[] = "View", rootName[] = "Root",
                      otherName[] = "Other";
struct ViewShadowNode : ConcreteViewShadowNode<viewName> {
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
};
struct RootShadowNode : ConcreteViewShadowNode<rootName> {
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  using Unshared = std::shared_ptr<RootShadowNode>;
  static ShadowNodeTraits BaseTraits(){auto traits=ConcreteViewShadowNode::BaseTraits();traits.set(ShadowNodeTraits::Trait::RootNodeKind);return traits;}
};
struct OtherShadowNode : ConcreteViewShadowNode<otherName> {
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
};

inline constexpr char AndroidHorizontalScrollContentViewShadowNodeComponentName[]="AndroidHorizontalScrollContentView";
inline const char ImageComponentName[]="Image", ScrollViewComponentName[]="ScrollView";
inline const char AndroidTextInputComponentName[]="AndroidTextInput", TextInputComponentName[]="TextInput";
inline constexpr char imageLookalike[]="Image", scrollLookalike[]="ScrollView", inputLookalike[]="TextInput";
inline const char AltrooPortalHostName[]="AltrooMUIPortalHost", AltrooPortalCanvasName[]="AltrooMUIPortalCanvas";
inline constexpr char textName[]="Text", traitName[]="OtherViewKind";
struct ImageShadowNode final : ConcreteViewShadowNode<ImageComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct AndroidTextInputShadowNode final : ConcreteViewShadowNode<AndroidTextInputComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct TextInputShadowNode final : ConcreteViewShadowNode<TextInputComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct ImageLookalike final : ConcreteViewShadowNode<imageLookalike> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct ScrollLookalike final : ConcreteViewShadowNode<scrollLookalike> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct InputLookalike final : ConcreteViewShadowNode<inputLookalike> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct PortalHost final : ConcreteViewShadowNode<AltrooPortalHostName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct PortalCanvas final : ConcreteViewShadowNode<AltrooPortalCanvasName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
inline constexpr char duplicateName[]="AndroidHorizontalScrollContentView";
struct AndroidHorizontalScrollContentViewShadowNode final : ConcreteViewShadowNode<AndroidHorizontalScrollContentViewShadowNodeComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct ScrollViewShadowNode final : ConcreteViewShadowNode<ScrollViewComponentName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct TextShadowNode final : ConcreteViewShadowNode<textName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;static ShadowNodeTraits BaseTraits(){ShadowNodeTraits traits;
#ifdef ANDROID
traits.set(ShadowNodeTraits::Trait::FormsView);
#endif
return traits;}};
struct ArbitraryViewKindShadowNode final : ConcreteViewShadowNode<traitName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
inline const char interactiveName[]="AltrooMUIInteractiveView",pickerName[]="AltrooMUINativePicker",editorName[]="AltrooMUITextInput",svgName[]="RNSVGSvgView",svgAndroidName[]="RNSVGSvgViewAndroid",virtualName[]="VirtualView",virtualCopyName[]="VirtualView",modalName[]="ModalHostView",accessoryName[]="InputAccessory",layoutOnlyName[]="LayoutConformance";
struct InteractiveHost final : ConcreteViewShadowNode<interactiveName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct PickerHost final : ConcreteViewShadowNode<pickerName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct EditorHost final : ConcreteViewShadowNode<editorName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct SvgHost final : ConcreteViewShadowNode<svgName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct SvgAndroidHost final : ConcreteViewShadowNode<svgAndroidName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct VirtualHost final : ConcreteViewShadowNode<virtualName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct VirtualCopyHost final : ConcreteViewShadowNode<virtualCopyName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;};
struct ModalHost final : ConcreteViewShadowNode<modalName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;static ShadowNodeTraits BaseTraits(){auto traits=ConcreteViewShadowNode::BaseTraits();traits.set(ShadowNodeTraits::Trait::RootNodeKind);return traits;}};
struct AccessoryHost final : ConcreteViewShadowNode<accessoryName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;static ShadowNodeTraits BaseTraits(){return ModalHost::BaseTraits();}};
struct LayoutOnly final : ConcreteViewShadowNode<layoutOnlyName>{using ConcreteViewShadowNode::ConcreteViewShadowNode;static ShadowNodeTraits BaseTraits(){return {};}};
struct SameNameWrongHandle final : ConcreteViewShadowNode<duplicateName> {using ConcreteViewShadowNode::ConcreteViewShadowNode;};
} // namespace facebook::react
`,
  // language=TEXT
  'adapter/AltrooStructuralViewShadowNode.h': String.raw`// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Bounded typed-props/model only. Does not implement RN conversion/Yoga/layout/state transport.
#pragma once
#include "Framework.h"
namespace altroo::owned_transport_proof {
struct PeerClass {std::string cacheKey,css;bool eligible{};};
struct PeerIdentity {bool expanded{};std::vector<PeerClass> classes;};
struct PeerObservation {int surface{},subject{},parent{},previous{};bool expanded{};};
enum class Programme {Numeric,ExplicitPair,PeerOnly};
struct Pair {
 std::shared_ptr<const facebook::react::ViewProps> normal,last;
 std::vector<std::shared_ptr<const facebook::react::ViewProps>> cases{std::size_t(8)};
 bool structural()const{return cases[0]!=nullptr;}
 std::size_t count()const{return structural()?cases.size():8;}
 std::uint8_t ordinaryIndex()const{return static_cast<std::uint8_t>(count());}
 const auto& at(std::uint8_t facts)const{return structural()?cases.at(facts):(facts&1?last:normal);}
};
struct Prepared {std::shared_ptr<const facebook::react::ViewProps> unselected;Pair candidates;bool parentSelector{};std::string owner;std::shared_ptr<const PeerIdentity> peer;std::optional<PeerObservation> observation;Programme programme{Programme::Numeric};};
using PreparedData=Prepared;
struct OwnedProps : facebook::react::ViewProps {
 double normalPaddingBottom{16},lastPaddingBottom{24};bool selectedLast{};std::uint8_t selectedCase{};
 std::shared_ptr<const Prepared> prepared;
};
inline std::shared_ptr<const OwnedProps> select(std::shared_ptr<const OwnedProps> source,std::uint8_t facts){
 if(source->selectedCase==facts)return source;
 auto next=std::make_shared<OwnedProps>(*source);next->selectedCase=facts;next->selectedLast=facts!=source->prepared->candidates.ordinaryIndex()&&(facts&1);
 next->yogaStyle=(facts==source->prepared->candidates.ordinaryIndex()?source->prepared->unselected:source->prepared->candidates.at(facts))->yogaStyle;
 return next;
}
}
namespace facebook::react {
inline constexpr char ownedName[]="AltrooMUIStructuralView";
struct AltrooStructuralViewShadowNode final : ConcreteViewShadowNode<ownedName,altroo::owned_transport_proof::OwnedProps> {
 using ConcreteViewShadowNode::ConcreteViewShadowNode;
};
}
`,
  // language=TEXT
  'adapter/react/renderer/core/ShadowNode.h': String.raw`#pragma once
#include "Framework.h"
`,
  // language=TEXT
  'adapter/react/renderer/components/root/RootShadowNode.h': String.raw`#pragma once
#include "Framework.h"
`,
  // language=TEXT
  'adapter/react/renderer/components/view/ViewShadowNode.h': String.raw`#pragma once
#include "Framework.h"
`,
  // C++ is compiled below; this is not a JavaScript code fragment.
  // language=TEXT
  'ParentControls.cpp': String.raw`// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Exact current production resolver with bounded RN/COW/typed-props doubles.
// No native RN/Yoga execution, scrolling, RTL or platform state transport proof.
#include "PrelayoutResolver.h"
#include <iostream>
#include <limits>
using namespace facebook::react;
using namespace altroo::prelayout;
using Owned=altroo::owned_transport_proof::OwnedProps;
using Node=std::shared_ptr<const ShadowNode>;
int assertions=0;
void check(bool value,const char *message){++assertions;if(!value)throw std::runtime_error(message);}
template<class N>std::shared_ptr<N> node(Tag tag,Props::Shared props,std::vector<Node> children={}){
 auto family=std::make_shared<ShadowNodeFamily>();family->tag=tag;family->surface=1;family->handle=N::Handle();
 family->clone=[](const ShadowNode&old,const ShadowNodeFragment&fragment){return std::make_shared<N>(old,fragment);};
 auto list=std::make_shared<const std::vector<Node>>(std::move(children));
 return std::make_shared<N>(ShadowNodeFragment{.props=props,.children=list},family,N::BaseTraits());
}
auto target(Tag tag){
 auto normal=std::make_shared<ViewProps>(),last=std::make_shared<ViewProps>();
 normal->yogaStyle.setPadding(facebook::yoga::Edge::Bottom,facebook::yoga::StyleLength::points(16));
 last->yogaStyle.setPadding(facebook::yoga::Edge::Bottom,facebook::yoga::StyleLength::points(24));
 normal->seal();last->seal();
 auto prepared=std::make_shared<altroo::owned_transport_proof::Prepared>();prepared->candidates={normal,last};
 auto props=std::make_shared<Owned>();props->prepared=prepared;props->yogaStyle=normal->yogaStyle;
 return node<AltrooStructuralViewShadowNode>(tag,props);
}
auto structuralTarget(Tag tag,std::size_t count=8){
 auto prepared=std::make_shared<altroo::owned_transport_proof::Prepared>();
 prepared->candidates.cases.resize(count);
 for(std::uint8_t facts=0;facts<count;++facts){
  auto value=std::make_shared<ViewProps>();
  value->yogaStyle.setPadding(facebook::yoga::Edge::Bottom,facebook::yoga::StyleLength::points(100+facts));
  value->seal();prepared->candidates.cases[facts]=value;
 }
 auto ordinary=std::make_shared<ViewProps>();ordinary->yogaStyle.setPadding(facebook::yoga::Edge::Bottom,facebook::yoga::StyleLength::points(77));ordinary->seal();prepared->unselected=ordinary;
 prepared->candidates.normal=prepared->candidates.cases[0];prepared->candidates.last=prepared->candidates.cases[1];
 auto props=std::make_shared<Owned>();props->prepared=prepared;props->yogaStyle=prepared->candidates.normal->yogaStyle;
 return node<AltrooStructuralViewShadowNode>(tag,props);
}
auto root(std::vector<Node> children){return node<RootShadowNode>(1,std::make_shared<ViewProps>(),std::move(children));}
template<class N>auto parent(std::vector<Node> children){return node<N>(10,std::make_shared<ViewProps>(),std::move(children));}
template<class Fn>void rejectWithoutClone(Fn fn,const char *message){
 cloneCalls=0;bool failed=false;try{fn();}catch(const std::exception&){failed=true;}
 check(failed,message);check(cloneCalls==0,"rejection precedes every clone");
}
int main(){try{
 auto a=target(2),b=target(3);auto content=parent<AndroidHorizontalScrollContentViewShadowNode>({a,b});
 auto state=std::make_shared<const ScrollViewState>();content->scrollState=state;auto input=root({content});input->sealRecursive();
 cloneCalls=0;rejectParsing=true;
#ifdef ANDROID
 // Source-backed regression: ordinary Android horizontal ScrollView's content parent.
 auto result=resolve(input);check(result.root!=input,"Android horizontal content parent must be admitted");
 check(result.decisions.size()==2&&!result.decisions[0].lastChild&&result.decisions[1].lastChild,"ordered normal/last choice");
 check(result.decisions[0].bottom==16&&result.decisions[1].bottom==24,"ordinary candidate values retained");
 check(result.counts.participatingParents==1&&result.counts.siblingChecks==2,"one exact sibling-region validation");
 check(result.counts.requestedClones==3&&cloneCalls==3,"COW only last target and its two ancestors");
 auto next=result.root->getChildren()[0];
 check(next->getComponentHandle()==content->getComponentHandle()&&next->getTag()==10&&next->getSurfaceId()==1,"canonical parent handle/tag/surface retained");
 check(next->getFamilyShared()==content->getFamilyShared(),"exact parent family retained");
 check(next->scrollState==state&&state->contentRevision==7,"ScrollViewState ownership retained without mutation");
 check(next->getProps()==content->getProps(),"unchanged scroll parent props shared");
 check(next->getChildren()[0]==a&&next->getChildren()[1]!=b,"only changed owned child copied");
 check(!b->getConcreteProps().selectedLast&&content->getChildren()[1]==b,"sealed input remains original normal branch");
 auto replay=resolve(result.root);check(replay.root==result.root&&replay.counts.requestedClones==0,"idempotent resolved tree has no clones");
 auto zeroProps=std::make_shared<ViewProps>();zeroProps->yogaStyle.width=0;zeroProps->yogaStyle.height=0;zeroProps->yogaStyle.hidden=true;
 auto zero=node<ViewShadowNode>(4,zeroProps);auto reordered=parent<AndroidHorizontalScrollContentViewShadowNode>({a,next->getChildren()[1],zero});
 reordered->scrollState=state;auto withZero=resolve(root({reordered}));
 check(withZero.decisions.size()==2&&!withZero.decisions[1].lastChild&&withZero.decisions[1].bottom==16,"zero/hidden ordinary View still participates by source order");
 check(withZero.root->getChildren()[0]->scrollState==state,"ordinary sibling change retains scroll state");
 auto reversed=resolve(root({parent<AndroidHorizontalScrollContentViewShadowNode>({b,a})}));
 check(!reversed.decisions[0].lastChild&&reversed.decisions[1].lastChild&&reversed.decisions[1].tag==2,"order uses candidate children, never React counts");
#else
 rejectWithoutClone([&]{resolve(input);},"Android-only parent remains rejected on iOS/other platforms");
#endif
 check(detail::controlledView(*a),"owned sibling admission retained");
 check(!detail::controlledView(*content),"horizontal content node is never admitted as an immediate View sibling");
 for(auto build:{0,1,2}){
  if(build==0)rejectWithoutClone([&]{resolve(root({parent<ScrollViewShadowNode>({target(20)})}));},"ScrollView parent is unsupported");
  if(build==1)rejectWithoutClone([&]{resolve(root({parent<TextShadowNode>({target(20)})}));},"Text parent is unsupported");
  if(build==2)rejectWithoutClone([&]{resolve(root({parent<ArbitraryViewKindShadowNode>({target(20)})}));},"arbitrary View-kind parent remains unsupported");
 }
 rejectWithoutClone([&]{resolve(root({parent<SameNameWrongHandle>({target(20)})}));},"matching component name text without canonical handle remains unsupported");
 check(!resolve(root({parent<ViewShadowNode>({target(20),node<AndroidHorizontalScrollContentViewShadowNode>(30,std::make_shared<ViewProps>())})})).decisions.front().lastChild,"ordinary View-kind content sibling counts without becoming controlled View");
 rejectWithoutClone([&]{resolve(root({parent<AndroidHorizontalScrollContentViewShadowNode>({target(20),node<TextShadowNode>(30,std::make_shared<ViewProps>())})}));},"Text sibling remains unsupported under horizontal parent");
 #ifdef ANDROID
 check(!resolve(root({parent<AndroidHorizontalScrollContentViewShadowNode>({target(20),node<AndroidHorizontalScrollContentViewShadowNode>(30,std::make_shared<ViewProps>())})})).decisions.front().lastChild,"View-kind nested content sibling counts under admitted Android parent");
#else
 rejectWithoutClone([&]{resolve(root({parent<AndroidHorizontalScrollContentViewShadowNode>({target(20),node<AndroidHorizontalScrollContentViewShadowNode>(30,std::make_shared<ViewProps>())})}));},"Android-only parent still rejected on iOS");
#endif
 // Existing safe parents and COW identity paths remain eligible.
 for(auto kind:{0,1}){
  auto child=target(40);auto tree=kind==0?root({child}):root({parent<ViewShadowNode>({child})});auto result=resolve(tree);
  check(result.decisions.size()==1&&result.decisions[0].lastChild&&result.decisions[0].bottom==24,"existing Root/View parent selection preserved");
 }
 auto duplicate=target(20);
 rejectWithoutClone([&]{resolve(root({parent<ViewShadowNode>({duplicate,duplicate})}));},"duplicate candidate family/tag rejected before clone");
 auto foreign=target(20);auto mutableFamily=std::const_pointer_cast<ShadowNodeFamily>(foreign->family);mutableFamily->surface=2;
 rejectWithoutClone([&]{resolve(root({parent<ViewShadowNode>({foreign})}));},"cross-surface candidate remains rejected");
 auto broken=target(20);// clone callback override is deliberately model-only.
 auto brokenFamily=std::const_pointer_cast<ShadowNodeFamily>(broken->family);
 brokenFamily->clone=[](const ShadowNode&old,const ShadowNodeFragment&fragment){auto wrong=std::make_shared<ViewShadowNode>(old,fragment);auto family=std::make_shared<ShadowNodeFamily>(*old.family);family->handle=ViewShadowNode::Handle();wrong->family=family;return wrong;};
 bool badClone=false;try{resolve(root({broken}));}catch(const std::logic_error&){badClone=true;}check(badClone,"existing identity check rejects wrong clone descriptor");
 // Exercise the exact production selector over mixed semantic host types.
 auto first=structuralTarget(60),second=structuralTarget(61);
 auto singleton=resolve(root({first}));
 check(singleton.decisions.front().bottom==107,"singleton is last-child and both first/last of View type");
 auto pair=resolve(root({first,second}));
 check(pair.decisions[0].bottom==102&&pair.decisions[1].bottom==105,"first/last View cases selected before layout");
 auto retainedFirst=pair.root->getChildren()[0],retainedSecond=pair.root->getChildren()[1];
 auto reorder=resolve(root({retainedSecond,retainedFirst}));
 check(reorder.decisions[0].bottom==102&&reorder.decisions[1].bottom==105,"memoized reordered nodes use incoming order");
 check(reorder.root->getChildren()[0]->getFamilyShared()==second->getFamilyShared(),"reorder preserves exact native family");
 auto boundary=node<ViewShadowNode>(62,std::make_shared<ViewProps>());
 auto tail=node<ViewShadowNode>(63,std::make_shared<ViewProps>());
 auto bounded=resolve(root({boundary,reorder.root->getChildren()[0],reorder.root->getChildren()[1],tail}));
 check(bounded.decisions[0].bottom==100&&bounded.decisions[1].bottom==100,"real View bounds suppress both of-type endpoints");
 auto other=node<ArbitraryViewKindShadowNode>(64,std::make_shared<ViewProps>());
 auto mixed=resolve(root({other,first,node<ArbitraryViewKindShadowNode>(65,std::make_shared<ViewProps>())}));
 check(mixed.decisions.front().bottom==106&&!mixed.decisions.front().lastChild,"foreign View-kind siblings affect last-child but preserve singleton View type");
 check(resolve(reorder.root).root==reorder.root,"resolved structural tree is idempotent");
 auto nativeContainer=resolve(root({parent<ArbitraryViewKindShadowNode>({first})}));
 check(nativeContainer.decisions.front().bottom==107,"structural cases admit truthful ordinary native View-kind parents");
 auto fallback=resolve(root({parent<TextShadowNode>({retainedFirst})}));
 check(fallback.decisions.front().bottom==77,"non-host parent restores genuine ordinary presentation instead of case0");
 check(resolve(fallback.root).root==fallback.root,"ordinary fallback is idempotent");
 // Parent facts require the exact source-owned immediate native parent.
 const auto pseudo=[](Tag tag){auto n=structuralTarget(tag);auto p=std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(n->getConcreteProps().prepared);p->parentSelector=true;p->owner="panel";auto props=std::const_pointer_cast<Owned>(std::static_pointer_cast<const Owned>(n->getProps()));props->nativeId="altroo:accordion-before:v1:";return n;};
 const auto panel=[](Tag tag,std::vector<Node>children,std::string owner="panel"){auto n=structuralTarget(tag);auto p=std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(n->getConcreteProps().prepared);p->owner=std::move(owner);n->children=std::make_shared<const std::vector<Node>>(std::move(children));return n;};
 auto ornamentA=pseudo(81),ornamentB=pseudo(83);
 auto panelA=panel(80,{ornamentA}),panelB=panel(82,{ornamentB});
 auto projected=resolve(root({panelA,panelB}));
 check(projected.decisions[1].bottom==102&&projected.decisions[3].bottom==105,"pseudo case uses first/last facts of its source-owned parent");
 auto moved=resolve(root({projected.root->getChildren()[1],projected.root->getChildren()[0]}));
 check(moved.decisions[1].bottom==102&&moved.decisions[3].bottom==105,"retained pseudo updates on parent reorder without JS repaint");
 auto acceptedPseudo=moved.root->getChildren()[1]->getChildren()[0];
 check(acceptedPseudo->getFamilyShared()==ornamentA->getFamilyShared(),"pseudo COW preserves exact native family");
 auto realChild=structuralTarget(85);auto internal=pseudo(86);
 auto logical=resolve(root({panel(84,{realChild,internal})}));
 check(logical.decisions[1].bottom==107,"owned source ornament is excluded from logical sibling order");
 auto forgedProps=std::make_shared<ViewProps>();forgedProps->nativeId="altroo:accordion-before:v1:";
 auto forged=resolve(root({panel(87,{structuralTarget(88),node<ViewShadowNode>(89,forgedProps)})}));
 check(forged.decisions[1].bottom==102,"ordinary nativeID cannot impersonate owned pseudo projection");
 auto wrapped=resolve(root({panel(90,{node<ViewShadowNode>(91,std::make_shared<ViewProps>(),{pseudo(92)})})}));
 check(wrapped.decisions.back().bottom==77,"intervening View cannot supply source root position");
 auto mismatched=resolve(root({panel(93,{pseudo(94)},"another-owner")}));
 check(mismatched.decisions.back().bottom==77,"different source owner keeps ordinary pseudo presentation");
 auto nestedPseudo=pseudo(96);nestedPseudo->children=std::make_shared<const std::vector<Node>>(std::vector<Node>{pseudo(97)});
 auto nested=resolve(root({panel(95,{nestedPseudo})}));
 check(nested.decisions.back().bottom==77,"a pseudo cannot impersonate its source parent");
 auto unsupported=resolve(root({pseudo(98)}));
 check(unsupported.decisions.front().bottom==77,"root/projection parent retains ordinary pseudo presentation");
 // Candidate-bound peer matching and explicitly observed fallback are separate.
 const auto peer=[](auto n,std::string key,std::string css,bool expanded,bool eligible){
  auto p=std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(n->getConcreteProps().prepared);
  p->peer=std::make_shared<const altroo::owned_transport_proof::PeerIdentity>(altroo::owned_transport_proof::PeerIdentity{expanded,{{std::move(key),std::move(css),eligible}}});return n;
 };
 const auto adjacent=[&](std::optional<altroo::owned_transport_proof::PeerObservation> observation=std::nullopt){
  auto decoration=structuralTarget(204,16);auto d=std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(decoration->getConcreteProps().prepared);
  d->parentSelector=true;d->owner="panel";d->observation=observation;
  std::const_pointer_cast<Owned>(std::static_pointer_cast<const Owned>(decoration->getProps()))->nativeId="altroo:accordion-before:v1:";
  return peer(panel(202,{decoration}),"css","same-class",true,true);
 };
 auto previousPeer=peer(panel(201,{},"previous"),"css","same-class",true,false);
 auto matching=resolve(root({previousPeer,adjacent()}));
 check(matching.decisions.back().bottom==113,"matching native peers select adjacency bit before layout");
 auto different=peer(panel(201,{},"previous"),"css","different-class",true,false);
 check(resolve(root({different,adjacent()})).decisions.back().bottom==105,"different emitted CSS does not match even when expanded");
 auto prefix=peer(panel(201,{},"previous"),"other-prefix","same-class",true,false);
 check(resolve(root({prefix,adjacent()})).decisions.back().bottom==105,"same CSS with a different cache prefix stays distinct");
 auto collapsed=peer(panel(201,{},"previous"),"css","same-class",false,false);
 check(resolve(root({collapsed,adjacent({{1,202,1,201,true}})})).decisions.back().bottom==105,"fresh native collapsed state overrides a stale observed true");
 auto raw=node<ViewShadowNode>(203,std::make_shared<ViewProps>());
 check(resolve(root({previousPeer,raw,adjacent({{1,202,1,201,true}})})).decisions.back().bottom==105,"new raw boundary invalidates prior peer observation while preserving positional bits");
 check(resolve(root({previousPeer,adjacent({{1,202,1,203,false}})})).decisions.back().bottom==113,"boundary removal uses matching current native peers immediately");
 check(resolve(root({raw,adjacent({{1,202,1,203,true}})})).decisions.back().bottom==113,"unknown identity can retain its exact matched JS observation as fallback");
 check(resolve(root({raw,adjacent({{1,202,1,203,false}})})).decisions.back().bottom==105,"later observed mismatch converges without inferring CSS from paint");
 check(resolve(root({raw,adjacent({{2,202,1,203,true}})})).decisions.back().bottom==105,"observation from another surface is rejected");
 check(resolve(root({raw,adjacent({{1,999,1,203,true}})})).decisions.back().bottom==105,"observation for another source subject is rejected");
 check(resolve(root({parent<ViewShadowNode>({raw,adjacent({{1,202,1,203,true}})})})).decisions.back().bottom==105,"reparented peer observation is rejected");
 check(resolve(root({adjacent({{1,202,1,0,true}})})).decisions.back().bottom==107,"first child has no expanded predecessor even with contradictory observation");



 // Fresh known absence overrides a formerly positive JS observation.
 check(resolve(root({previousPeer,peer(adjacent({{1,202,1,201,true}}),"css","same-class",false,true)})).decisions.back().bottom==105,"collapsed current peer overrides observed true");
 check(resolve(root({previousPeer,peer(adjacent({{1,202,1,201,true}}),"css","same-class",true,false)})).decisions.back().bottom==105,"ineligible current source token overrides observed true");
 auto emptyPeer=panel(201,{},"previous");
 std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(emptyPeer->getConcreteProps().prepared)->peer=std::make_shared<const altroo::owned_transport_proof::PeerIdentity>(altroo::owned_transport_proof::PeerIdentity{true,{}});
 check(resolve(root({emptyPeer,adjacent({{1,202,1,201,true}})})).decisions.back().bottom==105,"known empty CSS identity overrides observed true");
 auto unknownPeer=panel(201,{},"previous");
 check(resolve(root({unknownPeer,adjacent({{1,202,1,201,true}})})).decisions.back().bottom==113,"null CSS identity retains its bound JS fallback");
 auto wrongOwner=adjacent();
 std::const_pointer_cast<altroo::owned_transport_proof::Prepared>(wrongOwner->getConcreteProps().prepared)->owner="different";
 check(resolve(root({previousPeer,wrongOwner})).decisions.back().bottom==77,"sixteen-case mismatched owner selects ordinary index16 instead of case8");
 auto generatedProps=std::make_shared<ViewProps>();generatedProps->nativeId="altroo:generated-paragraph:v1:peer";
 auto generatedPeer=node<ParagraphShadowNode>(205,generatedProps,{node<RawTextShadowNode>(206,std::make_shared<Props>())});
 check(resolve(root({previousPeer,generatedPeer,adjacent()})).decisions.back().bottom==113,"generated literal paragraphs do not interrupt logical peer adjacency");
 auto explicitPeer=node<ParagraphShadowNode>(205,std::make_shared<ViewProps>(),{node<RawTextShadowNode>(206,std::make_shared<Props>())});
 check(resolve(root({previousPeer,explicitPeer,adjacent()})).decisions.back().bottom==105,"an explicit Paragraph interrupts source peer adjacency");
 check(resolve(root({previousPeer,pseudo(205),adjacent()})).decisions.back().bottom==113,"private projected ornaments do not interrupt source peer adjacency");
 check(rawParses==0,"selection never evaluates raw conversion/callbacks");
 std::cout<<"{\"assertions\":"<<assertions<<",\"platform\":\""
#ifdef ANDROID
 <<"android"
#else
 <<"ios-or-other"
#endif
 <<"\",\"nativeExecution\":false}\n";
return 0;
}catch(const std::exception&e){std::cerr<<"source-backed failure: "<<e.what()<<'\n';return 1;}}
`,
  // language=TEXT
  'GeneratedParagraphControls.cpp': String.raw`// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Exact production resolver, finite framework doubles only. No native layout/topology proof.
#include "GeneratedParagraphOrigin.h"
#define main preservedParentControls
#include "ParentControls.cpp"
#undef main
using altroo::generated_text_origin::ParagraphRole;
using altroo::generated_text_origin::classifyParagraph;
const std::string prefix="altroo:generated-paragraph:v1:";
auto propsWithID(std::string id){auto p=std::make_shared<ViewProps>();p->nativeId=std::move(id);return p;}
auto raw(Tag tag){return node<RawTextShadowNode>(tag,std::make_shared<Props>());}
auto paragraph(Tag tag,std::string id,std::vector<Node> children){return node<ParagraphShadowNode>(tag,propsWithID(std::move(id)),std::move(children));}
auto generated(Tag tag,Tag child){return paragraph(tag,prefix+"_r_0_",{raw(child)});}
auto region(std::vector<Node> children){return root({parent<ViewShadowNode>(std::move(children))});}
void decision(const Result&r,std::size_t index,Tag tag,bool last){check(r.decisions.at(index).tag==tag,"candidate traversal retains decision identity");check(r.decisions[index].lastChild==last,"logical last choice follows actual classified children");check(r.decisions[index].bottom==(last?24:16),"typed normal/last props selected");}
int preservedGeneratedControls(){try{
 if(preservedParentControls()!=0)return 1;
 const int before=assertions;
 auto a=target(2),b=target(3);auto g=generated(4,5),h=generated(6,7);
 auto input=region({a,g,b,h});input->sealRecursive();cloneCalls=0;
 auto result=resolve(input);decision(result,0,2,false);decision(result,1,3,true);
 check(result.counts.participatingParents==1&&result.counts.siblingChecks==4,"one full classification per participating parent");
 auto children=result.root->getChildren()[0]->getChildren();
 check(children.size()==4&&children[0]==a&&children[1]==g&&children[3]==h,"physical children and order are not projected away");
 check(children[2]->getFamilyShared()==b->getFamilyShared(),"selected target family stays exact");
 check(children[2]->getTag()==b->getTag()&&children[2]->getSurfaceId()==1,"selected tag and surface stay exact");
 check(g->getProps()->nativeId==prefix+"_r_0_"&&g->getChildren()[0]->getComponentHandle()==RawTextComponentName,"stock paragraph props and canonical Raw child remain shared");
 check(!b->getConcreteProps().selectedLast,"sealed input branch was not mutated");
 auto replay=resolve(result.root);check(replay.root==result.root&&replay.counts.requestedClones==0,"resolved candidate idempotence");
 auto explicitText=paragraph(8,"consumer-text",{});auto blocked=resolve(region({a,g,explicitText,h}));decision(blocked,0,2,false);
 auto beforeTarget=resolve(region({explicitText,g,a,h}));decision(beforeTarget,0,2,true);
 auto zero=std::make_shared<ViewProps>();zero->yogaStyle.hidden=true;zero->yogaStyle.width=zero->yogaStyle.height=0;
 auto explicitZero=paragraph(8,"",{});explicitZero->props=zero;auto zeroAfter=resolve(region({a,explicitZero,g}));decision(zeroAfter,0,2,false);
 auto plainZero=node<ViewShadowNode>(8,zero);auto zeroView=resolve(region({a,plainZero,g}));decision(zeroView,0,2,false);
 auto ordinaryView=node<ViewShadowNode>(8,propsWithID("consumer:generated-like"));decision(resolve(region({a,ordinaryView,g})),0,2,false);
 auto reverse=resolve(region({b,g,a,h}));decision(reverse,0,3,false);decision(reverse,1,2,true);
 auto nestedView=node<ViewShadowNode>(9,std::make_shared<ViewProps>());auto explicitComplex=paragraph(8,"explicit",{nestedView});decision(resolve(region({a,explicitComplex})),0,2,false);
 auto secondParent=node<ViewShadowNode>(11,std::make_shared<ViewProps>(),{target(12),generated(13,14)});auto multi=resolve(root({parent<ViewShadowNode>({a,g}),secondParent}));
 check(multi.counts.participatingParents==2&&multi.counts.siblingChecks==4,"parents have independent cached plans");decision(multi,0,2,true);decision(multi,1,12,true);
 for(const auto &id:std::vector<std::string>{"altroo:generated-paragraph:","altroo:generated-paragraph:v2:x",prefix,prefix+std::string(1025,'x')})
  rejectWithoutClone([&]{resolve(region({a,paragraph(4,id,{raw(5)})}));},"malformed reserved marker fails closed before clones");
 auto largest=paragraph(4,prefix+std::string(1024,'x'),{raw(5)});decision(resolve(region({a,largest})),0,2,true);
 auto exotic=paragraph(4,prefix+"opaque:useId_suffix-1",{raw(5),raw(6)});decision(resolve(region({a,exotic})),0,2,true);
 rejectWithoutClone([&]{resolve(region({a,node<ViewShadowNode>(4,propsWithID(prefix+"x"))}));},"reserved marker on View is not accepted");
 auto reservedOwned=target(4);auto reservedOwnedProps=std::make_shared<Owned>(reservedOwned->getConcreteProps());reservedOwnedProps->nativeId=prefix+"x";reservedOwned->props=reservedOwnedProps;
 rejectWithoutClone([&]{resolve(region({a,reservedOwned}));},"reserved marker on owned class is not accepted");
 rejectWithoutClone([&]{resolve(region({a,node<FakeParagraph>(4,propsWithID(prefix+"x"),{raw(5)})}));},"same display name with noncanonical handle is rejected");
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{})}));},"empty generated run must be elided by System");
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{nullptr})}));},"null Raw child rejected");
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{node<ViewShadowNode>(5,std::make_shared<ViewProps>())})}));},"generated inline View child rejected");
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{paragraph(5,"",{raw(6)})})}));},"generated nested Text child rejected");
 auto nestedRaw=node<RawTextShadowNode>(5,std::make_shared<Props>(),{raw(6)});
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{nestedRaw})}));},"Raw leaf cannot have children");
 auto rawMarked=node<RawTextShadowNode>(5,propsWithID(prefix+"x"));
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{rawMarked})}));},"reserved origin cannot be placed on Raw leaf");
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{node<RawTextShadowNode>(5,nullptr)})}));},"missing Raw props rejected");
 rejectWithoutClone([&]{resolve(region({a,raw(4)}));},"unwrapped Raw sibling remains unsupported");
 rejectWithoutClone([&]{classifyParagraph(*paragraph(4,prefix+"x",{raw(5),raw(6)}),1);},"paragraph leaf budget is bounded");
 check(classifyParagraph(*explicitText,0)==ParagraphRole::ExplicitElement,"explicit Paragraph does not inherit generated shape restriction");
 check(classifyParagraph(*ordinaryView,0)==ParagraphRole::NotParagraph,"ordinary nativeID does not acquire reserved policy");
 auto duplicateRaw=raw(5);rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{duplicateRaw,duplicateRaw})}));},"whole-tree duplicate family preflight remains active");
 auto foreignRaw=raw(5);std::const_pointer_cast<ShadowNodeFamily>(foreignRaw->family)->surface=2;
 rejectWithoutClone([&]{resolve(region({a,paragraph(4,prefix+"x",{foreignRaw})}));},"whole-tree cross-surface preflight remains active");
 // A changed first region must not clone before another region's bad marker rejects.
 auto badParent=node<ViewShadowNode>(11,std::make_shared<ViewProps>(),{target(12),paragraph(13,prefix,{raw(14)})});
 rejectWithoutClone([&]{resolve(root({parent<ViewShadowNode>({a,g}),badParent}));},"entire plan validates before any COW");
 auto stable=region({target(2),generated(3,4)});stable->sealRecursive();auto oldChild=stable->getChildren()[0]->getChildren()[0];cloneCalls=0;failCloneAt=2;bool thrown=false;
 try{resolve(stable);}catch(const std::bad_alloc&){thrown=true;}failCloneAt=0;
 check(thrown,"clone failure propagates");check(stable->getChildren()[0]->getChildren()[0]==oldChild,"failed COW never installs partial root");
 check(!static_cast<const AltrooStructuralViewShadowNode&>(*oldChild).getConcreteProps().selectedLast,"failed COW cannot mutate old props");
 for(int n:{32,64,128}){
  std::vector<Node> siblings;for(int i=0;i<n;i++){siblings.push_back(target(100+i*3));siblings.push_back(generated(101+i*3,102+i*3));}
  auto tree=region(std::move(siblings));observedChildEntries=0;auto value=resolve(tree);
  check(value.counts.siblingChecks==std::size_t(2*n),"exact once-parent sibling count is linear");
  check(value.decisions.size()==std::size_t(n)&&value.decisions.back().lastChild,"many targets share one classification result");
  check(observedChildEntries<=std::size_t(12*n+16),"finite traversal-entry count excludes quadratic suffix scans");
 }
 std::vector<Node> manyLeaves(10000,raw(5));auto bigA=paragraph(4,prefix+"a",manyLeaves);auto bigB=paragraph(6,prefix+"b",manyLeaves);
 cloneCalls=0;bool budgetFailure=false;try{resolve(region({a,bigA,bigB}));}catch(const std::invalid_argument&e){budgetFailure=std::string(e.what()).find("bounded Core RawText")!=std::string::npos;}
 check(budgetFailure,"all generated siblings share a finite raw-leaf classification budget");check(cloneCalls==0,"classification budget failure precedes COW");
 check(rawParses==0,"no raw conversion callback is evaluated by projection");
 std::cout<<"{\"generatedAssertions\":"<<assertions-before<<",\"totalAssertions\":"<<assertions<<",\"nativeExecution\":false}\n";
return 0;
}catch(const std::exception&e){std::cerr<<"generated paragraph failure: "<<e.what()<<'\n';return 1;}}
`,

  // language=TEXT
  'SiblingControls.cpp': String.raw`// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Exact production resolver with finite family/props/COW doubles, not RN layout.
#include "GeneratedParagraphControls.cpp"
#ifdef ANDROID
using PlatformInput=AndroidTextInputShadowNode;
using OtherPlatformInput=TextInputShadowNode;
#else
using PlatformInput=TextInputShadowNode;
using OtherPlatformInput=AndroidTextInputShadowNode;
#endif
template<class S>void ordinarySiblingControls(){
 auto a=target(2);auto tree=region({a});tree->sealRecursive();auto alone=resolve(tree);decision(alone,0,2,true);
 auto selected=alone.root->getChildren()[0]->getChildren()[0];
 auto owner=selected->getFamilyShared();auto sibling=node<S>(8,std::make_shared<ViewProps>());
 auto appended=region({selected,sibling});appended->sealRecursive();auto ordinary=resolve(appended);decision(ordinary,0,2,false);
 auto current=ordinary.root->getChildren()[0]->getChildren()[0];
 check(current->getFamilyShared()==owner&&current->getTag()==2,"adding native sibling retains owned target family/tag");
 check(ordinary.root->getChildren()[0]->getChildren()[1]==sibling,"native sibling props/state/children remain shared");
 check(ordinary.counts.targets==1&&ordinary.counts.participatingParents==1&&ordinary.counts.siblingChecks==2,"core sibling is counted but never becomes target");
 check(ordinary.counts.requestedClones==3,"only selected target and changed ancestry cloned");
 auto restored=resolve(region({current}));decision(restored,0,2,true);
 check(restored.root->getChildren()[0]->getChildren()[0]->getFamilyShared()==owner,"removal restores last candidate without re-rendering target");
 decision(resolve(region({sibling,current})),0,2,true);
 auto b=target(3);auto ordered=resolve(region({a,sibling,b}));decision(ordered,0,2,false);decision(ordered,1,3,true);
 auto reordered=resolve(region({b,a,sibling}));decision(reordered,0,3,false);decision(reordered,1,2,false);
 for(int kind=0;kind<4;++kind){
  auto p=std::make_shared<ViewProps>();p->yogaStyle.width=(kind&1)?0:40;p->yogaStyle.height=(kind&1)?0:40;p->yogaStyle.hidden=(kind&2)!=0;
  auto value=node<S>(8,p);decision(resolve(region({a,value,generated(9,11)})),0,2,false);
 }
 check(!detail::controlledView(*sibling)&&!detail::controlledParent(*sibling),"sibling policy never widens target or parent policy");
 rejectWithoutClone([&]{resolve(root({parent<S>({a})}));},"new core sibling does not become an eligible parent");
 for(auto id:{prefix+"x",std::string("altroo:generated-paragraph:v2:x")})
  rejectWithoutClone([&]{resolve(region({a,node<S>(8,propsWithID(id))}));},"reserved origin cannot bypass paragraph class restriction");
 rejectWithoutClone([&]{resolve(region({a,sibling,sibling}));},"duplicate core sibling family remains rejected");
 auto sameTag=node<S>(2,std::make_shared<ViewProps>());
 rejectWithoutClone([&]{resolve(region({a,sameTag}));},"distinct sibling family sharing target tag is rejected");
 auto foreign=node<S>(8,std::make_shared<ViewProps>());std::const_pointer_cast<ShadowNodeFamily>(foreign->family)->surface=2;
 rejectWithoutClone([&]{resolve(region({a,foreign}));},"new core sibling never bypasses surface validation");
 auto invalid=node<S>(0,std::make_shared<ViewProps>());
 rejectWithoutClone([&]{resolve(region({a,invalid}));},"invalid core sibling tag rejected");
 auto second=node<ViewShadowNode>(12,std::make_shared<ViewProps>(),{target(13),node<S>(14,propsWithID(prefix+"bad"))});
 rejectWithoutClone([&]{resolve(root({parent<ViewShadowNode>({a}),second}));},"later malformed sibling prevents earlier region COW");
 for(int n:{32,64,128}){
  std::vector<Node> items;for(int i=0;i<n;++i){items.push_back(target(100+2*i));items.push_back(node<S>(101+2*i,std::make_shared<ViewProps>()));}
  observedChildEntries=0;auto value=resolve(region(items));
  check(value.counts.targets==std::size_t(n)&&value.counts.siblingChecks==std::size_t(2*n),"once-parent bounded classification preserved for core hosts");
  check(!value.decisions.back().lastChild,"last core host blocks final owned target");
  check(observedChildEntries<=std::size_t(12*n+16),"new classifier does not add quadratic traversal");
 }
}
int main(){try{
 if(preservedGeneratedControls()!=0) {
  return 1;
 }
 const int before=assertions;
 ordinarySiblingControls<ImageShadowNode>();ordinarySiblingControls<ScrollViewShadowNode>();ordinarySiblingControls<PlatformInput>();
 ordinarySiblingControls<InteractiveHost>();ordinarySiblingControls<PickerHost>();ordinarySiblingControls<EditorHost>();ordinarySiblingControls<SvgHost>();ordinarySiblingControls<SvgAndroidHost>();ordinarySiblingControls<ArbitraryViewKindShadowNode>();
 ordinarySiblingControls<ImageLookalike>();ordinarySiblingControls<OtherPlatformInput>();
 auto a=target(2);
 for(int kind=0;kind<9;++kind){
  Node bad;
  switch(kind){
   case 0:bad=node<VirtualHost>(8,std::make_shared<ViewProps>());break;
   case 1:bad=node<VirtualCopyHost>(8,std::make_shared<ViewProps>());break;
   case 2:bad=node<ModalHost>(8,std::make_shared<ViewProps>());break;
   case 3:bad=node<TextShadowNode>(8,std::make_shared<ViewProps>());break;
   case 4:bad=raw(8);break;
   case 5:bad=node<PortalHost>(8,std::make_shared<ViewProps>());break;
   case 6:bad=node<PortalCanvas>(8,std::make_shared<ViewProps>());break;
   case 7:bad=node<AccessoryHost>(8,std::make_shared<ViewProps>());break;
   default:bad=node<LayoutOnly>(8,std::make_shared<ViewProps>());break;
  }
  rejectWithoutClone([&]{resolve(region({a,bad}));},"root/virtual/Portal/non-host sibling rejected before clone");
 }
 auto rootBoundary=node<ViewShadowNode>(8,std::make_shared<ViewProps>());rootBoundary->traits.set(ShadowNodeTraits::Trait::RootNodeKind);
 rejectWithoutClone([&]{resolve(region({a,rootBoundary}));},"RootNodeKind is rejected before a controlled View fast path");
 auto unnamed=node<InteractiveHost>(8,std::make_shared<ViewProps>());std::const_pointer_cast<ShadowNodeFamily>(unnamed->family)->handle=nullptr;
 rejectWithoutClone([&]{resolve(region({a,unnamed}));},"null component name fails closed without constructing string_view");
 auto flattened=node<InteractiveHost>(8,std::make_shared<ViewProps>());flattened->traits.set(ShadowNodeTraits::Trait::Hidden);
 check(!flattened->getTraits().check(ShadowNodeTraits::Trait::FormsView),"model host has no physical FormsView requirement");
 decision(resolve(region({a,flattened})),0,2,false);
 auto fakeExplicit=node<FakeParagraph>(8,std::make_shared<ViewProps>());decision(resolve(region({a,fakeExplicit})),0,2,false);
 rejectWithoutClone([&]{resolve(region({a,node<FakeParagraph>(8,propsWithID(prefix+"x"),{raw(9)})}));},"reserved noncanonical Paragraph cannot become generated-ignore");
 auto nested=node<ScrollViewShadowNode>(8,std::make_shared<ViewProps>(),{node<ViewShadowNode>(9,std::make_shared<ViewProps>(),{target(12)})});
 auto inside=resolve(region({a,nested}));decision(inside,0,2,false);decision(inside,1,12,true);
 check(inside.counts.participatingParents==2,"real scroll and nested plain View keep separate physical sibling regions");
 auto tooDeep=Node(node<ViewShadowNode>(500,std::make_shared<ViewProps>()));
 for(int i=0;i<130;++i)tooDeep=node<ScrollViewShadowNode>(600+i,std::make_shared<ViewProps>(),{tooDeep});
 rejectWithoutClone([&]{resolve(region({a,tooDeep}));},"new accepted siblings do not bypass full depth budget");
 std::vector<Node> tooMany;for(int i=0;i<20001;++i)tooMany.push_back(node<ImageShadowNode>(100+i,std::make_shared<ViewProps>()));tooMany.insert(tooMany.begin(),a);
 rejectWithoutClone([&]{resolve(region(tooMany));},"new accepted siblings do not bypass sibling budget");
 check(rawParses==0,"no props parser/getter/callback introduced by handle classification");
 std::cout<<"{\"siblingAssertions\":"<<assertions-before<<",\"totalAssertions\":"<<assertions<<",\"nativeExecution\":false}\n";
 return 0;
}catch(const std::exception&e){std::cerr<<"core sibling failure: "<<e.what()<<'\n';return 1;}}
`,
};
for (const [profile, defines] of [
  ['android', ['-DANDROID']],
  ['ios-float-model', ['-DMODEL_DOUBLE_FLOAT']],
]) {
  test(
    'generated paragraph exact resolver finite controls: ' + profile,
    { timeout: 60000 },
    async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), 'mui-generated-paragraph-'));
      try {
        // Quoted includes search the including header's directory first. Isolate
        // the exact two production headers so only framework dependencies use
        // the finite doubles, even when the real native build tree is present.
        const isolatedProduction = path.join(temp, 'production');
        await mkdir(isolatedProduction);
        for (const header of ['PrelayoutResolver.h', 'GeneratedParagraphOrigin.h']) {
          const original = path.join(production, header);
          const isolated = path.join(isolatedProduction, header);
          await copyFile(original, isolated);
          assert.deepEqual(await readFile(isolated), await readFile(original));
        }
        for (const [name, source] of Object.entries(sources)) {
          const target = path.join(temp, name);
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, source);
        }
        const output = path.join(temp, 'controls');
        const compile = spawnSync(
          process.env.CXX ?? 'c++',
          [
            '-std=c++20',
            '-Wall',
            '-Wextra',
            '-Werror',
            '-O1',
            ...defines,
            '-I' + isolatedProduction,
            '-I' + path.join(temp, 'adapter'),
            path.join(temp, 'SiblingControls.cpp'),
            '-o',
            output,
          ],
          { encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 },
        );
        assert.equal(compile.status, 0, compile.error?.message ?? compile.stdout + compile.stderr);
        const run = spawnSync(output, [], {
          encoding: 'utf8',
          timeout: 10000,
          maxBuffer: 1024 * 1024,
        });
        assert.equal(run.status, 0, run.error?.message ?? run.stdout + run.stderr);
        const rows = run.stdout
          .trim()
          .split('\n')
          .map((row) => JSON.parse(row));
        assert.equal(rows.length, 3);
        assert.equal(rows[1].generatedAssertions, 105);
        assert.equal(rows[1].nativeExecution, false);
        assert.equal(rows[2].siblingAssertions, 780);
        assert.equal(rows[2].nativeExecution, false);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  );
}
