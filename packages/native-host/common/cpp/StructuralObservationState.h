// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include <cstdint>
#include <map>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace altroo::structural {
// Retain the identities being compared so an allocator cannot turn a remove/add
// into an apparent equality by reusing a released family's address.
using Family = std::shared_ptr<const void>;
struct Signature {
  bool present = false;
  Family parent;
  std::vector<Family> children;
  bool operator==(const Signature &other) const {
    return present == other.present && parent == other.parent &&
           children == other.children;
  }
};
struct Change {
  std::uint64_t subscriptionId;
  std::string lease;
  std::uint64_t revision;
  bool closed;
};

// The Fabric adapter supplies synchronization. Keeping the order/lifecycle
// policy independent lets the real policy run without a device or fake RN tree.
class State final {
public:
  static constexpr std::uint64_t maxJSInteger = 9007199254740991ULL;
  void begin() {
    if (active_)
      throw std::logic_error("Structural observer is already connected");
    active_ = true;
    ++epoch_;
  }
  void end() {
    active_ = false;
    entries_.clear();
    pending_.clear();
    scheduled_ = false;
    ++epoch_;
  }
  bool active() const { return active_; }
  std::uint64_t subscribe(const std::string &lease, Signature signature) {
    if (!active_)
      throw std::logic_error("Connect the structural observer first");
    if (lease.empty() || lease.size() > 256)
      throw std::invalid_argument(
          "Structural observation requires a bounded nonempty lease");
    if (nextId_ == maxJSInteger)
      throw std::overflow_error("Structural subscription IDs exhausted");
    const auto id = ++nextId_;
    entries_.emplace(id, Entry{lease, 1, false, std::move(signature)});
    enqueue(id);
    return id;
  }
  bool unsubscribe(std::uint64_t id, const std::string &lease) {
    const auto it = entries_.find(id);
    if (it == entries_.end() || it->second.lease != lease)
      return false;
    entries_.erase(it);
    pending_.erase(id);
    return true;
  }
  bool update(std::uint64_t id, Signature signature) {
    auto it = entries_.find(id);
    if (it == entries_.end() || it->second.closed ||
        it->second.signature == signature)
      return false;
    it->second.signature = std::move(signature);
    advance(it->second);
    enqueue(id);
    return true;
  }
  bool close(std::uint64_t id) {
    auto it = entries_.find(id);
    if (it == entries_.end() || it->second.closed)
      return false;
    it->second.signature = {};
    it->second.closed = true;
    advance(it->second);
    enqueue(id);
    return true;
  }
  std::optional<std::uint64_t> requestNotification() {
    if (!active_ || scheduled_ || pending_.empty())
      return std::nullopt;
    scheduled_ = true;
    return epoch_;
  }
  bool notificationIsCurrent(std::uint64_t epoch) {
    if (!active_ || epoch != epoch_)
      return false;
    if (pending_.empty()) {
      scheduled_ = false;
      return false;
    }
    return scheduled_;
  }
  std::vector<Change> drain() {
    std::vector<Change> result;
    result.reserve(pending_.size());
    for (auto &[id, value] : pending_) {
      (void)id;
      result.push_back(std::move(value));
    }
    pending_.clear();
    scheduled_ = false;
    return result;
  }
  std::size_t size() const { return entries_.size(); }
  std::size_t pendingSize() const { return pending_.size(); }
  bool notificationPending() const { return scheduled_; }

private:
  struct Entry {
    std::string lease;
    std::uint64_t revision;
    bool closed;
    Signature signature;
  };
  static void advance(Entry &entry) {
    if (entry.revision == maxJSInteger) {
      entry.closed = true;
      entry.signature = {};
    } else {
      ++entry.revision;
    }
  }
  void enqueue(std::uint64_t id) {
    const auto &entry = entries_.at(id);
    pending_.insert_or_assign(
        id, Change{id, entry.lease, entry.revision, entry.closed});
  }
  bool active_ = false;
  bool scheduled_ = false;
  std::uint64_t epoch_ = 0;
  std::uint64_t nextId_ = 0;
  std::map<std::uint64_t, Entry> entries_;
  std::map<std::uint64_t, Change> pending_;
};
} // namespace altroo::structural
