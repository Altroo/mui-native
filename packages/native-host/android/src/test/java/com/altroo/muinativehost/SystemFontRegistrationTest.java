/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/** Executes the production registration guard without Android, mocked Typefaces or native UI. */
public final class SystemFontRegistrationTest {
  private static int assertions;
  private static void expect(boolean condition) {
    if (!condition) throw new AssertionError("System font registration assertion " + assertions);
    assertions++;
  }
  public static void main(String[] args) throws Exception {
    String alias = SystemFontRegistration.FAMILY;
    expect(alias.startsWith("__AltrooMUI") && !alias.equals("System"));
    Object owner = new Object(), platform = new Object(), custom = new Object();
    Map<String, Object> fonts = new HashMap<>();
    fonts.put("System", custom); fonts.put("App Font", custom);
    AtomicInteger registrations = new AtomicInteger();
    Supplier<Set<String>> snapshots = () -> {
      expect(Thread.holdsLock(owner));
      return Set.copyOf(fonts.keySet());
    };
    Runnable register = () -> {
      expect(Thread.holdsLock(owner)); expect(!fonts.containsKey(alias));
      registrations.incrementAndGet(); fonts.put(alias, platform);
    };
    SystemFontRegistration.ensure(owner, snapshots, register);
    expect(registrations.get() == 1 && fonts.get(alias) == platform);
    expect(fonts.get("System") == custom && fonts.get("App Font") == custom && fonts.size() == 3);
    // A complete constructor returns after registration; repeated instances use fresh snapshots.
    SystemFontRegistration.ensure(owner, snapshots, register);
    expect(registrations.get() == 1 && fonts.get(alias) == platform);
    fonts.put(alias, custom);
    SystemFontRegistration.ensure(owner, snapshots, register);
    expect(registrations.get() == 1 && fonts.get(alias) == custom);
    SystemFontRegistration.ensure(new Object(), () -> Set.of(alias), () -> { throw new AssertionError("Pre-existing alias overwritten"); });
    expect(fonts.get("System") == custom && fonts.get("App Font") == custom);

    Map<String, Object> other = new HashMap<>();
    SystemFontRegistration.ensure(new Object(), () -> Set.copyOf(other.keySet()), () -> other.put(alias, platform));
    expect(other.get(alias) == platform);
    RuntimeException failure = new RuntimeException("Registration failed");
    other.clear();
    try {
      SystemFontRegistration.ensure(owner, () -> Set.copyOf(other.keySet()), () -> { throw failure; });
      throw new AssertionError("Registration failure was swallowed");
    } catch (RuntimeException error) { expect(error == failure); }
    SystemFontRegistration.ensure(owner, () -> Set.copyOf(other.keySet()), () -> other.put(alias, platform));
    expect(other.get(alias) == platform);

    Map<String, Object> shared = new HashMap<>();
    AtomicInteger calls = new AtomicInteger(), queries = new AtomicInteger();
    AtomicReference<Throwable> failed = new AtomicReference<>();
    CountDownLatch ready = new CountDownLatch(8), start = new CountDownLatch(1);
    Thread[] threads = new Thread[8];
    for (int index = 0; index < threads.length; index++) {
      threads[index] = new Thread(() -> {
        ready.countDown();
        try {
          start.await();
          SystemFontRegistration.ensure(owner, () -> {
            if (!Thread.holdsLock(owner)) throw new AssertionError("Snapshot read before lock");
            queries.incrementAndGet(); return Set.copyOf(shared.keySet());
          }, () -> { calls.incrementAndGet(); shared.put(alias, platform); });
        } catch (Throwable error) { failed.compareAndSet(null, error); }
      });
      threads[index].start();
    }
    ready.await(); start.countDown();
    for (Thread thread : threads) thread.join();
    if (failed.get() != null) throw new AssertionError("Concurrent bootstrap failed", failed.get());
    expect(calls.get() == 1 && queries.get() == 8 && shared.get(alias) == platform);
    System.out.println("System font registration JVM policy: " + assertions + " assertions passed; no Android UI or Typeface emulation executed.");
  }
}
