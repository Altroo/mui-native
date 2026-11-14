// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Differential property controls against the exact pinned stock initializer.
// Framework doubles do not establish native mounting or accessibility behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const host = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(host, '../..');
const sourcePath = 'ReactCommon/react/renderer/components/view/ViewShadowNode.cpp';
const framework = String.raw`
#pragma once
#include <array>
#include <bitset>
#include <optional>
#include <string>
#include <vector>
namespace facebook::yoga {
enum class Edge { Left,Top,Right,Bottom,Start,End,Horizontal,Vertical,All };
enum class Display { Flex,None };
enum class PositionType { Static,Relative };
template<class E> auto ordinals(){return std::array{E::Left,E::Top,E::Right,E::Bottom,E::Start,E::End,E::Horizontal,E::Vertical,E::All};}
struct Length{bool defined{};bool isDefined()const{return defined;}};
struct Style{
 std::array<Length,9> borders{};Display displayValue{Display::Flex};PositionType position{PositionType::Static};
 Length border(Edge e)const{return borders[static_cast<int>(e)];}
 Display display()const{return displayValue;} PositionType positionType()const{return position;}
};
}
namespace facebook::react {
enum class PointerEventsMode {Auto,BoxOnly,None,BoxNone};
enum class ImportantForAccessibility {Auto,No};
enum class Cursor {Auto,Pointer};enum class BlendMode {Normal,Multiply};enum class Isolation {Auto,Isolate};
struct Transform{int value{};bool operator==(const Transform&)const=default;};
struct ViewProps{
 bool collapsable{true},collapsableChildren{true},accessible{},clips{},accessibilityElementsHidden{},accessibilityViewIsModal{},removeClippedSubviews{},platformStack{},platformView{};
 PointerEventsMode pointerEvents{PointerEventsMode::Auto};std::string nativeId,testId;
 double opacity{1};Transform transform;std::optional<int> zIndex;yoga::Style yogaStyle;
 struct{std::bitset<8> bits;}events;int shadowColor{},backgroundColor{};ImportantForAccessibility importantForAccessibility{ImportantForAccessibility::Auto};Cursor cursor{Cursor::Auto};
 std::vector<int> filter,accessibilityOrder,boxShadow,backgroundImage;BlendMode mixBlendMode{BlendMode::Normal};Isolation isolation{Isolation::Auto};double outlineWidth{};
 bool getClipsContentToBounds()const{return clips;}
};
inline bool isColorMeaningful(int value){return value!=0;}
struct HostPlatformViewTraitsInitializer{
 static bool formsStackingContext(const ViewProps&p){return p.platformStack;}
 static bool formsView(const ViewProps&p){return p.platformView;}
};
struct ShadowNodeTraits{
 enum class Trait{FormsView=1,FormsStackingContext=2,ChildrenFormStackingContext=4,ViewKind=8,Hidden=16,KeyboardFocusable=32};
 unsigned bits{};void set(Trait t){bits|=static_cast<unsigned>(t);}void unset(Trait t){bits&=~static_cast<unsigned>(t);}
};
class ViewShadowNode{
 const ViewProps*props_;ShadowNodeTraits traits_;void initialize()noexcept;
 public:ViewShadowNode(const ViewProps&p,ShadowNodeTraits t):props_(&p),traits_(t){initialize();}
 const ShadowNodeTraits&getTraits()const{return traits_;}
};
}
`;
const controls = String.raw`
#include "OwnedViewTraits.h"
#include <functional>
#include <iostream>
#include <stdexcept>
using namespace facebook::react;
int main(){try{
 std::vector<std::function<void(ViewProps&)>> changes{
 [](auto&p){p.collapsable=false;},[](auto&p){p.collapsableChildren=false;},
 [](auto&p){p.pointerEvents=PointerEventsMode::BoxOnly;},[](auto&p){p.pointerEvents=PointerEventsMode::None;},
 [](auto&p){p.pointerEvents=PointerEventsMode::BoxNone;},[](auto&p){p.nativeId="source";},
 [](auto&p){p.accessible=true;},[](auto&p){p.opacity=0.999;},[](auto&p){p.transform.value=1;},
 [](auto&p){p.zIndex=0;},[](auto&p){p.yogaStyle.position=facebook::yoga::PositionType::Relative;},
 [](auto&p){p.yogaStyle.displayValue=facebook::yoga::Display::None;},[](auto&p){p.clips=true;},
 [](auto&p){p.events.bits.set(0);},[](auto&p){p.shadowColor=1;},
 [](auto&p){p.accessibilityElementsHidden=true;},[](auto&p){p.accessibilityViewIsModal=true;},
 [](auto&p){p.importantForAccessibility=ImportantForAccessibility::No;},[](auto&p){p.removeClippedSubviews=true;},
 [](auto&p){p.cursor=Cursor::Pointer;},[](auto&p){p.filter={1};},[](auto&p){p.mixBlendMode=BlendMode::Multiply;},
 [](auto&p){p.isolation=Isolation::Isolate;},[](auto&p){p.platformStack=true;},
 [](auto&p){p.accessibilityOrder={1};},[](auto&p){p.backgroundColor=1;},[](auto&p){p.testId="panel";},
 [](auto&p){p.boxShadow={1};},[](auto&p){p.backgroundImage={1};},[](auto&p){p.platformView=true;},
 [](auto&p){p.outlineWidth=1;}
 };
 std::size_t checks=0;
 auto compare=[&](const ViewProps&p){
  // Preserve unrelated base traits while clearing even stale stacking bits.
  for(unsigned initial:{0u,7u,63u}){
   ShadowNodeTraits actual{initial};ViewShadowNode stock(p,actual);
   altroo::owned_view_traits::initialize(p,actual);
   if(actual.bits!=stock.getTraits().bits)throw std::runtime_error("stock trait mismatch");
   ViewProps empty;ViewShadowNode reset(empty,actual);
   altroo::owned_view_traits::initialize(empty,actual);
   if(actual.bits!=reset.getTraits().bits)throw std::runtime_error("stale trait after reset");
   checks+=2;
  }
 };
 compare({});
 ViewProps indexed;indexed.zIndex=0;indexed.yogaStyle.position=facebook::yoga::PositionType::Relative;
 compare(indexed);
 ShadowNodeTraits indexedTraits{};altroo::owned_view_traits::initialize(indexed,indexedTraits);
 if(indexedTraits.bits!=3)throw std::runtime_error("relative zero zIndex must form a stacking boundary");
 for(const auto&change:changes){ViewProps p;change(p);compare(p);}
 for(unsigned edge=0;edge<9;++edge){ViewProps p;p.yogaStyle.borders[edge].defined=true;compare(p);}
 // This catalog shape forms a physical View, but not a stacking boundary.
 ViewProps panel;panel.testId="accordion";panel.yogaStyle.borders[0].defined=true;
 ShadowNodeTraits traits{7};altroo::owned_view_traits::initialize(panel,traits);
 if(traits.bits!=1)throw std::runtime_error("bordered/test-ID panel must retain stock flattening");compare(panel);
 unsigned seed=0x72e4a89u;
 for(unsigned i=0;i<256;++i){ViewProps p;for(const auto&change:changes){seed=1664525u*seed+1013904223u;if(seed&0x80000000u)change(p);}compare(p);}
 std::cout<<"PASS "<<checks<<" pinned stock trait controls; framework doubles only\n";
}catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}}
`;

test('owned View mounting traits match pinned stock creation and reset properties', async (t) => {
  const baseline = JSON.parse(
    await readFile(join(host, 'structural-observation-baseline.json'), 'utf8'),
  );
  const source = await readFile(join(root, 'node_modules/react-native', sourcePath), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), baseline.files[sourcePath]);
  const start = source.indexOf('void ViewShadowNode::initialize() noexcept {');
  const end = source.lastIndexOf('\n} // namespace facebook::react');
  assert(start > 0 && end > start);
  const scratch = await mkdtemp(join(tmpdir(), 'mui-stock-view-traits-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  await writeFile(join(scratch, 'Framework.h'), framework);
  for (const name of ['ViewShadowNode.h', 'HostPlatformViewTraitsInitializer.h', 'primitives.h']) {
    const file = join(scratch, 'react/renderer/components/view', name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, '#pragma once\n#include "Framework.h"\n');
  }
  await copyFile(join(host, 'common/cpp/OwnedViewTraits.h'), join(scratch, 'OwnedViewTraits.h'));
  await writeFile(
    join(scratch, 'Stock.cpp'),
    '#include "Framework.h"\nnamespace facebook::react {\n' + source.slice(start, end) + '\n}\n',
  );
  await writeFile(join(scratch, 'Controls.cpp'), controls);
  const compile = spawnSync(
    process.env.CXX || 'c++',
    [
      '-std=c++20',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-I',
      scratch,
      join(scratch, 'Stock.cpp'),
      join(scratch, 'Controls.cpp'),
      '-o',
      join(scratch, 'controls'),
    ],
    { encoding: 'utf8' },
  );
  assert.equal(compile.status, 0, compile.stdout + compile.stderr);
  const result = spawnSync(join(scratch, 'controls'), [], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS \d+ pinned stock trait controls/);
});
