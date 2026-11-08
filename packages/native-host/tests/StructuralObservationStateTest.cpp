// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#include "../common/cpp/StructuralObservationState.h"
#include <iostream>
#include <mutex>
#include <thread>
using namespace altroo::structural;
static int checks = 0;
static void check(bool condition, const char *message) {
  ++checks;
  if (!condition)
    throw std::runtime_error(message);
}
static Family family(int value) { return std::make_shared<const int>(value); }
int main() {
  State state;
  auto parent = family(0), a = family(1), b = family(2), c = family(3);
  state.begin();
  const auto first = state.subscribe("lease-1", {true, parent, {a, b}});
  auto ticket = state.requestNotification();
  check(ticket.has_value(), "initial registration must notify");
  check(state.pendingSize() == 1 && state.notificationPending(),
        "native diagnostics reflect queued work");
  check(!state.requestNotification(), "only one queued notification");
  check(state.notificationIsCurrent(*ticket), "initial ticket valid");
  auto records = state.drain();
  check(records.size() == 1 && records[0].revision == 1 && !records[0].closed,
        "initial record");
  check(!state.update(first, {true, parent, {a, b}}),
        "layout/props changes keep family order");
  check(!state.requestNotification(), "unchanged order is silent");
  check(state.update(first, {true, parent, {b, a}}),
        "pure retained-family reorder must notify");
  check(state.update(first, {true, parent, {b, a, c}}),
        "append must notify without frames");
  check(state.update(first, {true, parent, {a, c}}), "removal must notify");
  ticket = state.requestNotification();
  records = state.drain();
  check(records.size() == 1 && records[0].revision == 4,
        "updates coalesce to latest revision");
  auto newParent = family(0);
  check(state.update(first, {true, newParent, {a, c}}),
        "same-tag new parent family differs");
  check(state.update(first, {false, {}, {}}), "disconnection differs");
  check(state.update(first, {true, parent, {a, c}}), "rebind differs");
  check(!state.unsubscribe(first, "stale-lease"),
        "stale lease cannot detach owner");
  check(state.size() == 1, "owner survives stale cleanup");
  check(state.unsubscribe(first, "lease-1"), "owner cleanup");
  check(state.drain().empty(), "unobserved queued data discarded");
  check(!state.notificationIsCurrent(*ticket),
        "empty old task resets scheduling");
  auto next = state.subscribe("lease-2", {true, parent, {a}});
  check(next != first, "IDs cannot ABA across subscriptions");
  ticket = state.requestNotification();
  check(ticket.has_value(),
        "new subscription still schedules after empty callback");
  state.end();
  check(!state.notificationIsCurrent(*ticket),
        "disconnect invalidates queued epoch");
  state.begin();
  next = state.subscribe("lease-2", {true, parent, {a}});
  auto newTicket = state.requestNotification();
  check(newTicket && *newTicket != *ticket, "reconnect has a new epoch");
  check(!state.notificationIsCurrent(*ticket),
        "old callback cannot steal new notification");
  state.drain();
  check(state.close(next), "surface unmount closes lease");
  check(!state.update(next, {true, parent, {b}}),
        "closed surface never rebinds same ID");
  records = state.drain();
  check(records.size() == 1 && records[0].closed, "surface unmount receipt");
  state.end();
  {
    auto retained = family(9);
    std::weak_ptr<const void> weak = retained;
    state.begin();
    const auto id = state.subscribe("retention", {true, parent, {retained}});
    retained.reset();
    check(!weak.expired(), "signature retains compared families");
    state.unsubscribe(id, "retention");
    check(weak.expired(), "cleanup releases family identities");
    state.end();
  }
  state.begin();
  try {
    state.subscribe("", {});
    check(false, "empty lease must throw");
  } catch (const std::invalid_argument &) {
    check(true, "empty lease rejected");
  }
  try {
    state.subscribe(std::string(257, 'a'), {});
    check(false, "huge lease must throw");
  } catch (const std::invalid_argument &) {
    check(true, "huge lease rejected");
  }
  const auto id = state.subscribe("threads", {true, parent, {a}});
  state.drain();
  std::mutex mutex;
  std::thread one([&] {
    for (int i = 0; i < 1000; ++i) {
      std::lock_guard lock(mutex);
      state.update(id, {true, parent, {a, b}});
    }
  });
  std::thread two([&] {
    for (int i = 0; i < 1000; ++i) {
      std::lock_guard lock(mutex);
      state.update(id, {true, parent, {b, a}});
    }
  });
  one.join();
  two.join();
  records = state.drain();
  check(records.size() == 1 && records[0].subscriptionId == id &&
            records[0].revision > 1,
        "mutex-protected writers retain latest single record");
  state.end();
  check(state.size() == 0 && state.pendingSize() == 0 &&
            !state.notificationPending(),
        "teardown empties subscriptions, records and scheduling");
  std::cout << checks << " structural state checks passed\n";
}
