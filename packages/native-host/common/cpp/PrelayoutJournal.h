// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include <array>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <locale>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace altroo::prelayout::probe {
// All identities are weak. A proof journal must not keep an obsolete RN tree
// alive or mistake a recycled numeric tag/address for its previous family.
using Identity = std::shared_ptr<const void>;
using WeakIdentity = std::weak_ptr<const void>;
inline bool sameOwner(const WeakIdentity &a, const WeakIdentity &b) {
  return !a.owner_before(b) && !b.owner_before(a);
}
struct Choice {
  std::int32_t tag{}, surface{};
  WeakIdentity family;
  bool lastChild{}, changed{};
  float bottom{};
};
struct Observation {
  std::int32_t tag{}, surface{};
  WeakIdentity family;
  double actualBottom{}, normalBottom{}, lastBottom{};
  bool actualBottomIsPoints{};
  // Local accepted LayoutMetrics, never native/window or mounted geometry.
  // frame x/y/w/h, contentInsets t/l/b/r, border t/l/b/r, pixel/font scale.
  std::array<double, 14> layout{};
};
struct Attempt {
  std::uint64_t id{}, epoch{};
  WeakIdentity returnedRoot;
  std::array<std::size_t, 6> counts{};
  std::vector<Choice> choices;
  bool matched{};
};
struct Accepted {
  std::uint64_t callback{}, attempt{}, epoch{}, familyId{};
  Choice choice;
  Observation observation;
  bool propsMatch{}, firstObserved{};
};

// Callers serialize access. Registration and framework callbacks never execute
// under this object's owning mutex. Limits fail closed before selecting props.
class Journal {
public:
  static constexpr std::size_t maxAttempts = 64, maxChoices = 32,
                               maxAccepted = 256, maxErrors = 16;
  bool active{}, hookRegistered{}, truncated{};
  std::uint64_t epoch{}, callbacks{}, unmatchedAccepted{}, staleCallbacks{},
      ambiguousAccepted{}, callbackErrors{};
  std::vector<Attempt> attempts;
  std::vector<Accepted> accepted;
  std::vector<std::string> errors;

  std::uint64_t begin() {
    if (active || hookRegistered)
      throw std::logic_error("Disable the active prelayout probe first");
    if (epoch == 32)
      throw std::length_error("Private probe activation budget exceeded");
    // Successful begin starts a fresh bounded diagnostic generation. Keep the
    // inactive prior history intact until every fallible precondition passes.
    static_assert(noexcept(attempts.clear()));
    static_assert(noexcept(accepted.clear()));
    static_assert(noexcept(errors.clear()));
    attempts.clear();
    accepted.clear();
    errors.clear();
    callbacks = unmatchedAccepted = staleCallbacks = ambiguousAccepted =
        callbackErrors = families_ = 0;
    truncated = false;
    active = true;
    return ++epoch;
  }
  void deactivate() noexcept { active = false; }
  void error(const char *message) {
    if (errors.size() < maxErrors)
      errors.emplace_back(std::string(message).substr(0, 192));
    else
      truncated = true;
  }
  bool record(std::uint64_t ticket, const Identity &root,
              const std::array<std::size_t, 6> &counts,
              std::vector<Choice> choices) {
    if (!active || ticket != epoch) {
      ++staleCallbacks;
      return false;
    }
    if (!root || attempts.size() == maxAttempts ||
        choices.size() > maxChoices) {
      truncated = true;
      error("Candidate journal budget exceeded; original candidate returned");
      return false;
    }
    for (const auto &choice : choices) {
      if (choice.family.expired() || choice.tag <= 0 ||
          !std::isfinite(choice.bottom) || choice.bottom < 0)
        throw std::invalid_argument("Invalid controlled choice identity/value");
    }
    attempts.push_back(
        {attempts.size() + 1, ticket, root, counts, std::move(choices), false});
    return true;
  }
  // Return a copy of the exact matched choices for accepted-tree extraction.
  // A repeated root within this epoch is ambiguous; begin discards older
  // generations. Never assign acceptance by tag.
  const Attempt *matching(const Identity &root) const noexcept {
    const Attempt *match = nullptr;
    for (const auto &attempt : attempts) {
      if (attempt.returnedRoot.lock() == root) {
        if (attempt.epoch != epoch || attempt.matched || match)
          return nullptr;
        match = &attempt;
      }
    }
    return match;
  }
  void accept(const Identity &root,
              const std::vector<Observation> &observations) {
    ++callbacks;
    if (!root) {
      error("Null accepted root rejected");
      return;
    }
    if (!active) {
      ++staleCallbacks;
      return;
    }
    auto *attempt = const_cast<Attempt *>(matching(root));
    if (!attempt) {
      bool seen = false;
      for (const auto &item : attempts)
        seen |= item.returnedRoot.lock() == root;
      if (seen)
        ++ambiguousAccepted;
      else
        ++unmatchedAccepted;
      return;
    }
    attempt->matched = true;
    if (observations.size() != attempt->choices.size()) {
      error("Accepted controlled target count differs from returned candidate");
      return;
    }
    if (accepted.size() + observations.size() > maxAccepted) {
      truncated = true;
      error("Accepted observation budget exceeded");
      return;
    }
    for (std::size_t i = 0; i < observations.size(); ++i) {
      const auto &choice = attempt->choices[i];
      const auto &actual = observations[i];
      if (actual.tag != choice.tag || actual.surface != choice.surface ||
          !sameOwner(actual.family, choice.family)) {
        error("Accepted family/order differs from returned candidate");
        return;
      }
      if (!std::isfinite(actual.actualBottom) ||
          !std::isfinite(actual.normalBottom) ||
          !std::isfinite(actual.lastBottom)) {
        error("Nonfinite accepted props");
        return;
      }
      for (const auto value : actual.layout)
        if (!std::isfinite(value)) {
          error("Nonfinite accepted LayoutMetrics");
          return;
        }
    }
    for (std::size_t i = 0; i < observations.size(); ++i) {
      const auto &choice = attempt->choices[i];
      const auto &actual = observations[i];
      std::uint64_t familyId = 0;
      for (const auto &prior : accepted)
        if (sameOwner(prior.choice.family, choice.family)) {
          familyId = prior.familyId;
          break;
        }
      const bool first = familyId == 0;
      if (first)
        familyId = ++families_;
      const bool propsMatch =
          actual.actualBottomIsPoints && actual.actualBottom == choice.bottom;
      if (!propsMatch)
        error("Accepted Yoga padding differs from selected float points");
      accepted.push_back({callbacks, attempt->id, epoch, familyId, choice,
                          actual, propsMatch, first});
    }
  }
  std::string json() const {
    std::ostringstream out;
    out.imbue(std::locale::classic());
    out << std::setprecision(17) << std::boolalpha;
    out << "{\"schema\":1,\"active\":" << active
        << ",\"ownedCommitHookRegistered\":" << hookRegistered
        << ",\"epoch\":" << epoch << ",\"truncated\":" << truncated
        << ",\"acceptedCallbacks\":" << callbacks
        << ",\"unmatchedAcceptedCallbacks\":" << unmatchedAccepted
        << ",\"staleCallbacks\":" << staleCallbacks
        << ",\"ambiguousAcceptedCallbacks\":" << ambiguousAccepted
        << ",\"callbackErrors\":" << callbackErrors;
    std::size_t liveUnmatched = 0;
    for (const auto &attempt : attempts)
      liveUnmatched += !attempt.matched && !attempt.returnedRoot.expired();
    out << ",\"liveUnmatchedReturnedCandidates\":" << liveUnmatched
        << ",\"attempts\":[";
    bool comma = false;
    for (const auto &attempt : attempts) {
      if (comma)
        out << ',';
      comma = true;
      out << "{\"id\":" << attempt.id << ",\"epoch\":" << attempt.epoch
          << ",\"matchedAcceptedCallback\":" << attempt.matched
          << ",\"counts\":[";
      for (std::size_t i = 0; i < attempt.counts.size(); ++i) {
        if (i)
          out << ',';
        out << attempt.counts[i];
      }
      out << "],\"decisions\":[";
      for (std::size_t i = 0; i < attempt.choices.size(); ++i) {
        if (i)
          out << ',';
        choiceJson(out, attempt.choices[i]);
      }
      out << "]}";
    }
    out << "],\"acceptedObservations\":[";
    comma = false;
    for (const auto &item : accepted) {
      if (comma)
        out << ',';
      comma = true;
      out << "{\"callback\":" << item.callback
          << ",\"attempt\":" << item.attempt << ",\"epoch\":" << item.epoch
          << ",\"familyId\":" << item.familyId
          << ",\"firstObservedMatchingAcceptedCallback\":" << item.firstObserved
          << ",\"propsMatch\":" << item.propsMatch << ",\"decision\":";
      choiceJson(out, item.choice);
      out << ",\"actualBottomIsPoints\":"
          << item.observation.actualBottomIsPoints
          << ",\"actualBottom\":" << item.observation.actualBottom
          << ",\"normalPaddingBottom\":" << item.observation.normalBottom
          << ",\"lastPaddingBottom\":" << item.observation.lastBottom
          << ",\"localAcceptedLayout\":[";
      for (std::size_t i = 0; i < item.observation.layout.size(); ++i) {
        if (i)
          out << ',';
        out << item.observation.layout[i];
      }
      out << "]}";
    }
    out << "],\"errors\":[";
    for (std::size_t i = 0; i < errors.size(); ++i) {
      if (i)
        out << ',';
      // Only bounded fixed native messages enter this journal.
      out << '"';
      for (const unsigned char ch : errors[i]) {
        if (ch == '"' || ch == '\\')
          out << '\\' << ch;
        else if (ch >= 32 && ch < 127)
          out << ch;
        else
          out << '?';
      }
      out << '"';
    }
    out << "],\"limits\":{\"attempts\":64,\"choicesPerAttempt\":32,"
           "\"acceptedObservations\":256,\"errors\":16,"
           "\"acceptanceChronologyProved\":false,\"mountedOrDrawnProved\":"
           "false,"
           "\"productionCssSemantics\":false,\"nativeProofComplete\":false,"
           "\"bottomRepresentation\":\"Yoga float points\"}}";
    return out.str();
  }

private:
  std::uint64_t families_{};
  static void choiceJson(std::ostream &out, const Choice &choice) {
    out << "{\"tag\":" << choice.tag << ",\"surface\":" << choice.surface
        << ",\"lastChild\":" << choice.lastChild
        << ",\"bottom\":" << choice.bottom << ",\"changed\":" << choice.changed
        << '}';
  }
};

// Optional diagnostics only. The real selector calls these taps; they never
// return a candidate, own an RN tree, or change production counters.
struct PassiveRuntimeSink {
  virtual ~PassiveRuntimeSink() = default;
  virtual void runtimeInput(const Identity &, std::uint64_t, std::uint64_t) noexcept = 0;
  virtual void runtimeReturn(const Identity &, const Identity &, std::uint64_t,
                             std::uint64_t, bool) noexcept = 0;
};
struct PassiveNode {
  std::size_t count{};
  std::int32_t tag{}, surface{};
  WeakIdentity family, programme;
  bool expectedWire{}, selectedLast{}, bottomIsPoints{};
  double bottom{};
  std::array<double, 14> layout{};
};
struct PassiveAttempt {
  std::uint64_t id{}, generation{}, runtimeAttempt{}, acceptedRevision{};
  WeakIdentity inputRoot, returnedRoot;
  PassiveNode input, runtimeInput, returned, accepted;
  bool entered{}, returnedSeen{}, returnedOK{}, acceptedSeen{}, unacceptedExpiredBeforeStop{};
};
class PassiveJournal {
 public:
  static constexpr std::size_t maxAttempts = Journal::maxAttempts;
  bool active{}, hookRegistered{}, baselineAbsence{}, closed{}, invalid{};
  std::uint64_t epoch{}, expectedGeneration{}, callbacks{}, lastAcceptedRevision{};
  std::int32_t surface{};
  WeakIdentity surfaceFamily;
  std::array<PassiveAttempt, maxAttempts> attempts{};
  std::size_t size{};
  const char *reason = "none";
  void fail(const char *message) noexcept {
    invalid = true;
    if (reason == std::string_view("none")) reason = message;
  }
  void begin(std::int32_t targetSurface, const Identity &rootFamily) {
    if (active || hookRegistered || epoch == 32 || targetSurface <= 0 || !rootFamily)
      throw std::logic_error("Invalid or exhausted passive witness arm");
    const auto next = epoch + 1;
    *this = PassiveJournal{};
    epoch = next; surface = targetSurface; surfaceFamily = rootFamily; active = true;
  }
  void baseline(bool absent) noexcept {
    baselineAbsence = absent;
    if (!absent) fail("Baseline already contains an owned host");
  }
  void expect(std::uint64_t generation) noexcept {
    expectedGeneration = generation;
    if (!generation) fail("Missing real runtime generation");
  }
  void stop() noexcept {
    for (std::size_t i = 0; i < size; ++i) {
      auto &a = attempts[i];
      if (a.input.count && !a.acceptedSeen) {
        if (!a.entered || !a.returnedSeen || !a.returnedRoot.expired())
          fail("Containing attempt was unsettled at witness stop");
        else a.unacceptedExpiredBeforeStop = true;
      }
    }
    active = false; closed = true;
  }
  void early(const Identity &root, const PassiveNode &node) noexcept {
    if (!active || invalid) {
      if (!active && closed && hookRegistered) fail("Scoped callback arrived during witness stop");
      return;
    }
    if (!root || size == maxAttempts) { fail("Passive attempt budget exceeded"); return; }
    for (std::size_t i = 0; i < size; ++i)
      if (sameOwner(attempts[i].inputRoot, root)) {
        fail("Repeated input root identity is ambiguous"); return;
      }
    if (node.count > 1) { fail("Witness requires one fresh owned family"); return; }
    if (node.count && (node.surface != surface || node.tag <= 0 || node.family.expired() ||
                       node.programme.expired())) { fail("Invalid scoped owned identity"); return; }
    auto &a = attempts[size++]; a.id = size; a.inputRoot = root; a.input = node;
  }
  PassiveAttempt *inputFor(const Identity &root) noexcept {
    PassiveAttempt *found = nullptr;
    for (std::size_t i = 0; i < size; ++i)
      if (sameOwner(attempts[i].inputRoot, root)) {
        if (found) { fail("Ambiguous passive input root"); return nullptr; }
        found = &attempts[i];
      }
    return found;
  }
  static bool sameInput(const PassiveNode &early, const PassiveNode &actual) noexcept {
    return actual.count == early.count && (!actual.count ||
        (actual.tag == early.tag && actual.surface == early.surface &&
         sameOwner(actual.family, early.family) &&
         sameOwner(actual.programme, early.programme) &&
         actual.selectedLast == early.selectedLast &&
         actual.expectedWire && early.expectedWire &&
         actual.bottomIsPoints && early.bottomIsPoints &&
         std::isfinite(actual.bottom) && std::isfinite(early.bottom) &&
         actual.bottom == early.bottom));
  }
  void entered(const Identity &root, std::uint64_t generation,
               std::uint64_t attempt, const PassiveNode &node) noexcept {
    if (!active || invalid) {
      if (!active && closed && hookRegistered) fail("Scoped callback arrived during witness stop");
      return;
    }
    auto *a = inputFor(root);
    if (!a || a->entered || generation != expectedGeneration || !attempt) {
      fail("Missing stale or duplicate real runtime input"); return;
    }
    if (!sameInput(a->input, node)) {
      fail("Another hook changed the runtime input"); return;
    }
    a->entered = true; a->generation = generation; a->runtimeAttempt = attempt;
    a->runtimeInput = node;
  }
  void returned(const Identity &input, const Identity &output,
                std::uint64_t generation, std::uint64_t attempt,
                bool completed, const PassiveNode &node) noexcept {
    if (!active || invalid) {
      if (!active && closed && hookRegistered) fail("Scoped callback arrived during witness stop");
      return;
    }
    auto *a = inputFor(input);
    if (!a || !a->entered || a->returnedSeen || a->generation != generation ||
        a->runtimeAttempt != attempt || !output) {
      fail("Unpaired stale or duplicate runtime return"); return;
    }
    a->returnedSeen = true; a->returnedOK = completed; a->returnedRoot = output;
    a->returned = node;
    if (!completed || node.count != a->input.count || (node.count &&
        (!sameOwner(node.family, a->input.family) ||
         !sameOwner(node.programme, a->input.programme))))
      fail("Runtime did not return the same prepared owned family");
  }
  void accept(const Identity &root, const PassiveNode &node,
              std::uint64_t revision, bool exactCurrentRoot, bool branching) noexcept {
    if (!active || invalid) {
      if (!active && closed && hookRegistered) fail("Scoped callback arrived during witness stop");
      return;
    }
    ++callbacks;
    if (!root || !exactCurrentRoot || branching || !revision || revision <= lastAcceptedRevision) {
      fail("Delayed branch or current-root ambiguity"); return;
    }
    PassiveAttempt *found = nullptr;
    for (std::size_t i = 0; i < size; ++i) {
      auto &a = attempts[i];
      const auto &key = a.returnedSeen ? a.returnedRoot : a.inputRoot;
      if (sameOwner(key, root)) {
        if (found || a.acceptedSeen) { fail("Repeated accepted root is ambiguous"); return; }
        found = &a;
      }
    }
    if (!found || (node.count && (!found->entered || !found->returnedSeen))) {
      fail("Accepted owned root lacks a real runtime pair"); return;
    }
    const auto &expected = found->returnedSeen ? found->returned : found->input;
    if (node.count != expected.count || (node.count &&
        (!sameOwner(node.family, expected.family) ||
         !sameOwner(node.programme, expected.programme) ||
         node.selectedLast != expected.selectedLast || node.bottom != expected.bottom ||
         node.bottomIsPoints != expected.bottomIsPoints || node.expectedWire != expected.expectedWire ||
         node.tag != expected.tag || node.surface != expected.surface))) {
      fail("Accepted family programme or props differ"); return;
    }
    for (const auto value : node.layout)
      if (!std::isfinite(value)) { fail("Nonfinite accepted LayoutMetrics"); return; }
    found->acceptedSeen = true; found->acceptedRevision = revision; found->accepted = node;
    lastAcceptedRevision = revision;
  }
  const char *outcome() const noexcept {
    if (invalid || !closed || hookRegistered || !baselineAbsence || !expectedGeneration) return "INCONCLUSIVE";
    const PassiveAttempt *first = nullptr; std::uint64_t bornRevision = 0, detachedRevision = 0;
    for (std::size_t i = 0; i < size; ++i) {
      const auto &a = attempts[i];
      if (a.input.count) {
        if (!first) first = &a;
        if (!a.entered || !a.returnedSeen || !a.returnedOK ||
            !sameInput(a.input, a.runtimeInput) ||
            !a.input.expectedWire || !a.returned.expectedWire ||
            !sameOwner(a.input.family, first->input.family) ||
            !a.returned.selectedLast || !a.returned.bottomIsPoints || (!a.accepted.expectedWire && a.acceptedSeen))
          return "INCONCLUSIVE";
        if (!a.acceptedSeen && !a.unacceptedExpiredBeforeStop) return "INCONCLUSIVE";
        if (a.acceptedSeen && (!bornRevision || a.acceptedRevision < bornRevision))
          bornRevision = a.acceptedRevision;
      } else if (a.acceptedSeen && a.acceptedRevision > detachedRevision)
        detachedRevision = a.acceptedRevision;
    }
    if (!first || first->input.selectedLast || !bornRevision || detachedRevision <= bornRevision)
      return "INCONCLUSIVE";
    return "OBSERVED_ASSOCIATION";
  }
  std::string json() const {
    std::ostringstream out; out.imbue(std::locale::classic());
    out << std::setprecision(17) << std::boolalpha;
    out << "{\"schema\":1,\"mode\":\"passive-born-owned\",\"outcome\":\"" << outcome()
        << "\",\"active\":" << active << ",\"hookRegistered\":" << hookRegistered
        << ",\"epoch\":" << epoch << ",\"surface\":" << surface
        << ",\"expectedRuntimeGeneration\":\"" << expectedGeneration
        << "\",\"baselineAcceptedAbsence\":" << baselineAbsence
        << ",\"closed\":" << closed << ",\"invalid\":" << invalid
        << ",\"reason\":\"" << reason << "\",\"acceptedCallbacks\":" << callbacks
        << ",\"acceptanceChronologyProved\":false,\"mountedOrDrawnProved\":false,\"attempts\":[";
    for (std::size_t i = 0; i < size; ++i) {
      const auto &a = attempts[i]; if (i) out << ',';
      out << "{\"id\":" << a.id << ",\"containsOwned\":" << (a.input.count == 1)
          << ",\"tag\":" << a.input.tag << ",\"runtimeGeneration\":\"" << a.generation
          << "\",\"runtimeAttempt\":\"" << a.runtimeAttempt
          << "\",\"runtimeEntered\":" << a.entered << ",\"runtimeReturned\":" << a.returnedSeen
          << ",\"runtimeCompleted\":" << a.returnedOK << ",\"matchedAccepted\":" << a.acceptedSeen
          << ",\"acceptedRevision\":\"" << a.acceptedRevision
          << "\",\"incomingSelectedLast\":" << a.input.selectedLast
          << ",\"returnedSelectedLast\":" << a.returned.selectedLast
          << ",\"returnedBottom\":";
      if (std::isfinite(a.returned.bottom)) out << a.returned.bottom; else out << "null";
      out << ",\"programmeMatches\":" << a.input.expectedWire << ",\"localAcceptedLayout\":[";
      for (std::size_t j = 0; j < a.accepted.layout.size(); ++j) { if (j) out << ','; out << a.accepted.layout[j]; }
      out << "]}";
    }
    out << "],\"limits\":{\"attempts\":64,\"freshFamilies\":1,\"nativePaintClaim\":false}}";
    return out.str();
  }
};

} // namespace altroo::prelayout::probe
