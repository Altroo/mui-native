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
} // namespace altroo::prelayout::probe
