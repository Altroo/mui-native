// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Exact candidate-bank header with finite parser/props doubles. No RN mounting claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, copyFile, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const framework = String.raw`
#pragma once
#include <map>
#include <memory>
#include <string>
#include <vector>
#include <cstddef>
namespace folly {
struct dynamic {
  bool array{}, null{}; int number{}; std::string text; std::vector<dynamic> values; std::map<std::string,dynamic> fields;
  dynamic()=default; dynamic(std::nullptr_t):null(true){}
  bool isNull()const{return null;} double asDouble()const{return number;}
  const std::string& getString()const{return text;}
  std::size_t count(const char* key)const{return fields.count(key);}
  const dynamic& at(const char* key)const{return fields.at(key);}
  bool isArray()const{return array;} std::size_t size()const{return values.size();}
  const dynamic& operator[](std::size_t i)const{return values.at(i);}
  dynamic& operator[](const char* key){return fields[key];}
  bool operator==(const dynamic&)const=default;
};
}
namespace facebook::react {
struct PropsParserContext {};
struct RawProps {folly::dynamic value;explicit RawProps(folly::dynamic input):value(std::move(input)){};};
struct Props {using Shared=std::shared_ptr<const Props>;virtual ~Props()=default;};
struct AltrooMUIStructuralViewProps:Props {
  int value; mutable bool sealed{}; folly::dynamic ownedProgramme{nullptr};
  explicit AltrooMUIStructuralViewProps(int input):value(input){}
  void seal()const{sealed=true;}
};
inline int parses{};
struct ModelDescriptor {
  std::shared_ptr<const Props> cloneProps(const PropsParserContext&,
      const std::shared_ptr<const AltrooMUIStructuralViewProps>&,RawProps raw)const {
    ++parses;return std::make_shared<const AltrooMUIStructuralViewProps>(raw.value.number);
  }
};
}
namespace altroo::owned_channel {using ConversionDescriptor=facebook::react::ModelDescriptor;}
`;
const program = String.raw`
#include "PreparedOwnedCandidates.h"
#include <iostream>
using namespace facebook::react;
using namespace altroo::owned_adapter_proof;
void require(bool value){if(!value)throw std::runtime_error("candidate-bank assertion failed");}
int main(){try{
  altroo::owned_channel::ConversionDescriptor descriptor;PropsParserContext context;
  auto baseline=std::make_shared<const AltrooMUIStructuralViewProps>(999);
  for(const std::size_t count:{8,16}){
    folly::dynamic input;input.array=true;input.values.resize(count);
    for(std::size_t i=0;i<count;++i)input.values[i].number=i%3;
    parses=0;auto bank=prepareStructural(descriptor,context,baseline,input);
    require(bank.structural()&&bank.count()==count&&bank.ordinaryIndex()==count);
    require(parses==3);
    for(std::size_t i=0;i<count;++i){
      require(bank.at(i)->value==int(i%3)&&bank.at(i)->sealed);
      if(i>=3)require(bank.at(i)==bank.at(i-3));
    }
    require(baseline->value==999&&!baseline->sealed);
    bool rejected=false;try{bank.at(bank.ordinaryIndex());}catch(const std::invalid_argument&){rejected=true;}
    require(rejected);
    if(count==16)require(bank.at(8)->value==2&&bank.at(8)!=baseline);
  }
  for(const std::size_t count:{0,1,7,9,15,17}){
    folly::dynamic input;input.array=true;input.values.resize(count);parses=0;
    bool rejected=false;try{prepareStructural(descriptor,context,baseline,input);}catch(const std::invalid_argument&){rejected=true;}
    require(rejected&&parses==0);
  }
  PreparedViewCandidates legacy;legacy.normal=baseline;legacy.last=std::make_shared<const AltrooMUIStructuralViewProps>(24);
  require(!legacy.structural()&&legacy.count()==8&&legacy.ordinaryIndex()==8);
  require(legacy.at(6)==baseline&&legacy.at(7)==legacy.last);
  std::cout<<"PASS exact bounded candidate bank; finite conversion doubles\n";
}catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}}
`;
test('bounded candidate banks keep index8 distinct from ordinary fallback and deduplicate sealed leaves', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'mui-candidate-bank-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  await mkdir(join(scratch, 'react/renderer/core'), { recursive: true });
  await writeFile(join(scratch, 'GeneratedConversion.h'), framework);
  await writeFile(join(scratch, 'react/renderer/core/RawProps.h'), '#pragma once\n');
  await copyFile(
    new URL('../common/cpp/PreparedOwnedCandidates.h', import.meta.url),
    join(scratch, 'PreparedOwnedCandidates.h'),
  );
  await writeFile(join(scratch, 'check.cpp'), program);
  await execute(
    process.env.CXX || 'clang++',
    [
      '-std=c++20',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-fsanitize=address,undefined',
      '-fno-omit-frame-pointer',
      '-I' + scratch,
      join(scratch, 'check.cpp'),
      '-o',
      join(scratch, 'check'),
    ],
    { timeout: 30000 },
  );
  const result = await execute(join(scratch, 'check'), [], { timeout: 10000 });
  assert.match(result.stdout, /PASS exact bounded candidate bank/);
});

// Exercise the exact production descriptor method, not a second dispatch rule.
// Conversion/validation are explicit doubles; bank conversion uses the real header.
test('the descriptor routes schema3 through structural preparation', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'mui-candidate-dispatch-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const source = await readFile(
    new URL('../common/cpp/OwnedPropsTransport.h', import.meta.url),
    'utf8',
  );
  const start = source.indexOf('  Props::Shared cloneProps(');
  const end = source.indexOf('  OwnedProps::Shared replaceNumeric(', start);
  assert(start > 0 && end > start);
  const method = source.slice(start, end).replace(' const override {', ' const {');
  const model = String.raw`
#include "PreparedOwnedCandidates.h"
#include <iostream>
using namespace facebook::react;
namespace altroo::owned_channel {inline bool fullProgramme(const folly::dynamic& value){return !value.isNull();}}
using Generated=AltrooMUIStructuralViewProps;
using GeneratedShared=std::shared_ptr<const Generated>;
using Pair=altroo::owned_adapter_proof::PreparedViewCandidates;
enum class Programme {Numeric,ExplicitPair};
struct Prepared {Programme programme;GeneratedShared unselected;Pair candidates;};
struct OwnedProps:Props {using Shared=std::shared_ptr<const OwnedProps>;std::shared_ptr<const Prepared> prepared;bool selectedLast{};};
struct Descriptor {
  using ConverterCore=altroo::owned_channel::ConversionDescriptor;
  ConverterCore converter_;GeneratedShared incoming;
  GeneratedShared convertCurrent(const PropsParserContext&,const OwnedProps::Shared&,RawProps)const{return incoming;}
  OwnedProps::Shared finish(GeneratedShared value,Pair pair,Programme kind,const OwnedProps::Shared&,bool=false,std::string={})const{
    auto out=std::make_shared<OwnedProps>();out->prepared=std::make_shared<const Prepared>(Prepared{kind,std::move(value),std::move(pair)});return out;
  }
  OwnedProps::Shared numericFromBaseline(const PropsParserContext&,GeneratedShared value,const OwnedProps::Shared& source)const{
    Pair pair;pair.normal=pair.last=value;return finish(value,std::move(pair),Programme::Numeric,source);
  }
__METHOD__
};
int main(){try{
  for(const int schema:{1,2,3}){
    auto baseline=std::make_shared<Generated>(999);auto& p=baseline->ownedProgramme;p.null=false;p["schema"].number=schema;
    if(schema==1){p["normal"].number=16;p["last"].number=24;}
    else {auto& cases=p["cases"];cases.array=true;cases.values.resize(schema==3?16:8);for(std::size_t i=0;i<cases.size();++i)cases.values[i].number=int(i);}
    Descriptor descriptor;descriptor.incoming=baseline;
    auto result=std::static_pointer_cast<const OwnedProps>(descriptor.cloneProps({},nullptr,RawProps(folly::dynamic{})));
    if(!result->prepared||result->prepared->candidates.structural()!=(schema!=1)||result->prepared->candidates.count()!=std::size_t(schema==3?16:8))throw std::runtime_error("wrong descriptor structural dispatch");
  }
  std::cout<<"PASS exact descriptor schema dispatch; finite conversion/validation doubles\n";
}catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}}
`;
  await mkdir(join(scratch, 'react/renderer/core'), { recursive: true });
  await writeFile(join(scratch, 'GeneratedConversion.h'), framework);
  await writeFile(join(scratch, 'react/renderer/core/RawProps.h'), '#pragma once\n');
  await copyFile(
    new URL('../common/cpp/PreparedOwnedCandidates.h', import.meta.url),
    join(scratch, 'PreparedOwnedCandidates.h'),
  );
  for (const mutant of [false, true]) {
    const actualMethod = mutant
      ? method.replace('schema == 2.0 || schema == 3.0', 'schema == 2.0')
      : method;
    if (mutant) assert.notEqual(actualMethod, method);
    await writeFile(join(scratch, 'dispatch.cpp'), model.replace('__METHOD__', actualMethod));
    await execute(
      process.env.CXX || 'clang++',
      [
        '-std=c++20',
        '-Wall',
        '-Wextra',
        '-Werror',
        '-fsanitize=address,undefined',
        '-fno-omit-frame-pointer',
        '-I' + scratch,
        join(scratch, 'dispatch.cpp'),
        '-o',
        join(scratch, 'dispatch'),
      ],
      { timeout: 30000 },
    );
    if (mutant) await assert.rejects(execute(join(scratch, 'dispatch'), [], { timeout: 10000 }));
    else
      assert.match(
        (await execute(join(scratch, 'dispatch'), [], { timeout: 10000 })).stdout,
        /PASS exact descriptor schema dispatch/,
      );
  }
});
