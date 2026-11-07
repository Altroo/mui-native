// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import UIKit
import XCTest

/// First logical-tree/notification probe; no CSS or initial-paint parity claim.
@MainActor final class StructuralObservationUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    guard node("structure-probe-receipt").exists,
      let data = node("structure-probe-receipt").label.data(using: .utf8)
    else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
    if let receipt = metadata(),
      let data = try? JSONSerialization.data(withJSONObject: receipt, options: [.sortedKeys])
    {
      let text = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      text.name = name + "-receipt"
      text.lifetime = .keepAlways
      add(text)
    }
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let value = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [value], timeout: 12)
    if result != .completed { capture("structure-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func visible(_ element: XCUIElement, inside viewport: CGRect) -> Bool {
    let f = element.frame
    return element.exists && !f.isEmpty && !f.isInfinite && !f.isNull && viewport.contains(f)
  }
  private func reveal(_ id: String, hit: Bool = false) -> XCUIElement {
    let target = node(id)
    let scroll = node("root-layout-scroll")
    for attempt in 0..<24 {
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 4, dy: 4)
      if visible(target, inside: viewport) && (!hit || target.isHittable) { return target }
      XCTAssertGreaterThan(viewport.height, 48)
      let known = target.exists && !target.frame.isEmpty
      let top = ["structure-probe-start", "structure-probe-next", "structure-probe-measure", "structure-probe-stop"].contains(id)
      let unknown: CGFloat = top || attempt >= 12 ? -viewport.height : viewport.height
      let delta = known ? target.frame.midY - viewport.midY : unknown
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(
        CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(
        CGVector(
          dx: viewport.midX - app.frame.minX,
          dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    capture("structure-ios-unreachable-" + id)
    XCTFail("Actual native target is not fully visible: " + id)
    return target
  }
  private func tab(_ id: String, in stripID: String) {
    let target = node(id)
    let strip = node(stripID)
    XCTAssertTrue(target.waitForExistence(timeout: 20))
    for _ in 0..<24 {
      let viewport = strip.frame.intersection(app.frame)
      if target.isHittable && viewport.contains(CGPoint(x: target.frame.midX, y: target.frame.midY))
      {
        target.tap()
        return
      }
      if target.exists && !target.frame.isEmpty && target.frame.midX < viewport.minX {
        strip.swipeRight()
      } else {
        strip.swipeLeft()
      }
    }
    XCTFail("Navigation target is not reachable: " + id)
  }
  private func checkedCapture(_ name: String, data: [String: Any], frame: CGRect) throws {
    let packet: [String: Any] = [
      "schemaVersion": 1, "metadata": data,
      "nativeTargetFrame": ["x": Double(frame.minX), "y": Double(frame.minY),
        "width": Double(frame.width), "height": Double(frame.height)],
      "limit": "Checked packet and sampled AX frame in one stable authored state; not an atomic cross-thread snapshot",
    ]
    let bytes = try JSONSerialization.data(withJSONObject: packet, options: [.sortedKeys])
    let receipt = XCTAttachment(data: bytes, uniformTypeIdentifier: "public.json")
    receipt.name = name + "-checked-evidence"; receipt.lifetime = .keepAlways; add(receipt)
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name; image.lifetime = .keepAlways; add(image)
  }
  private func settleFrame(_ stage: Int, afterLayouts previous: Int? = nil) {
    waitFor("Actual target mount and layout acknowledgment must match this state") {
      guard let data = self.metadata(), data["stage"] as? Int == stage,
        let layouts = data["targetLayouts"] as? Int, layouts >= 1,
        previous == nil || layouts > previous! else { return false }
      let target = self.node("structure-probe-target")
      return target.exists && abs(target.frame.width - (stage == 5 ? 48 : 40)) < 1
        && abs(target.frame.height - 40) < 1
    }
  }
  @MainActor override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    tab("catalog-tab-Wrappers", in: "catalog-tabs")
    tab("root-layout-structure", in: "root-layout-navigation")
    XCTAssertTrue(node("structure-probe-receipt").waitForExistence(timeout: 12))
    waitFor("Private structure scene begins at its authored initial state") {
      self.metadata()?["stage"] as? Int == 0
    }
  }
  @MainActor override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0 { capture("structure-ios-failure") }
  }
  private func diagnostics(_ data: [String: Any], active: Bool) throws {
    let native = try XCTUnwrap(data["nativeDiagnostics"] as? [String: Any])
    for key in ["connected", "commitHookRegistered", "mountHookRegistered"] {
      XCTAssertEqual(native[key] as? Bool, active, key)
    }
    XCTAssertEqual(native["subscriptions"] as? Int, active ? 1 : 0)
    XCTAssertEqual(native["observedRoots"] as? Int, active ? 1 : 0)
    XCTAssertEqual(native["pendingRecords"] as? Int, 0)
    XCTAssertEqual(native["notificationPending"] as? Bool, false)
    XCTAssertEqual(data["active"] as? Bool, active)
    XCTAssertEqual((data["errors"] as? [String])?.count, 0)
  }
  private func fresh(_ stage: Int) throws -> [String: Any] {
    let before = metadata()?["request"] as? Int ?? -1
    reveal("structure-probe-measure", hit: true).tap()
    waitFor("Current public native snapshot must answer this measurement") {
      guard let data = self.metadata(), data["stage"] as? Int == stage,
        let request = data["request"] as? Int, request > before else { return false }
      return data["error"] == nil
    }
    return try XCTUnwrap(metadata())
  }
  func testSevenStagesWithRetainedNativeTarget() throws {
    settleFrame(0)
    let idle = try fresh(0)
    try diagnostics(idle, active: false)
    reveal("structure-probe-start", hit: true).tap()
    waitFor("Native registration must deliver its initial revision") {
      (self.metadata()?["events"] as? [[String: Any]])?.last?["revision"] as? Int == 1
    }
    let expected = [
      ["target", "a", "b"], ["target", "a", "b", "c"], ["b", "a", "c", "target"],
      ["b", "a", "c", "target", "hidden"], ["b", "a", "c", "target"],
      ["b", "a", "c", "target"], ["target", "a", "b"],
    ]
    var baselineLayouts = 0, previousLayouts = 0, previousEventCount = 0, previousRevision = 0
    var baselineAttached = 0, baselineCleaned = 0
    for stage in 0..<expected.count {
      if stage > 0 {
        reveal("structure-probe-next", hit: true).tap()
        waitFor("Authored state must commit") { self.metadata()?["stage"] as? Int == stage }
        if stage == 5 {
          waitFor("Layout-only width update must reach the real target") {
            abs(self.node("structure-probe-target").frame.width - 48) < 1
              && (self.metadata()?["targetLayouts"] as? Int ?? 0) > baselineLayouts
          }
          RunLoop.current.run(until: Date().addingTimeInterval(0.4))
        } else {
          waitFor("Actual structural change must produce a new native dirty record") {
            (self.metadata()?["events"] as? [[String: Any]])?.count ?? 0 > previousEventCount
          }
        }
      }
      settleFrame(stage, afterLayouts: stage == 5 || stage == 6 ? previousLayouts : nil)
      let data = try fresh(stage)
      try diagnostics(data, active: true)
      let actual = try XCTUnwrap(data["actual"] as? [String: Any])
      XCTAssertEqual(actual["parentMatchesForwardedRef"] as? Bool, true)
      XCTAssertEqual(actual["targetIsCanonicalChild"] as? Bool, true)
      XCTAssertEqual(actual["order"] as? [String], expected[stage])
      XCTAssertEqual(actual["count"] as? Int, expected[stage].count)
      XCTAssertEqual(actual["index"] as? Int, expected[stage].firstIndex(of: "target"))
      let events = try XCTUnwrap(data["events"] as? [[String: Any]])
      let last = try XCTUnwrap(events.last)
      XCTAssertEqual(last["lease"] as? String, "structure-probe:1")
      XCTAssertEqual(last["closed"] as? Bool, false)
      let revision = try XCTUnwrap(last["revision"] as? Int)
      let layouts = try XCTUnwrap(data["targetLayouts"] as? Int)
      let leases = try XCTUnwrap(data["leases"] as? [String: [String: Int]])
      let target = try XCTUnwrap(leases["target"])
      if stage == 0 {
        baselineLayouts = layouts
        baselineAttached = try XCTUnwrap(target["attached"])
        baselineCleaned = try XCTUnwrap(target["cleaned"])
        XCTAssertGreaterThanOrEqual(layouts, 1)
        XCTAssertEqual(events.count, 1)
      } else if stage == 5 {
        XCTAssertEqual(events.count, previousEventCount, "Layout-only is not a structural change")
        XCTAssertEqual(revision, previousRevision)
        XCTAssertGreaterThan(layouts, baselineLayouts)
      } else if stage < 5 {
        XCTAssertEqual(layouts, baselineLayouts, "Structure-only must not depend on target onLayout")
        XCTAssertGreaterThan(revision, previousRevision)
      } else {
        XCTAssertGreaterThan(revision, previousRevision)
      }
      XCTAssertEqual(target["attached"], baselineAttached)
      XCTAssertEqual(target["cleaned"], baselineCleaned)
      XCTAssertEqual(baselineAttached - baselineCleaned, 1)
      let frame = reveal("structure-probe-target").frame
      XCTAssertEqual(frame.width, stage == 5 ? 48 : 40, accuracy: 1)
      XCTAssertEqual(frame.height, 40, accuracy: 1)
      try checkedCapture("structure-ios-stage-\(stage)", data: data, frame: frame)
      previousLayouts = layouts; previousEventCount = events.count; previousRevision = revision
    }
    reveal("structure-probe-stop", hit: true).tap()
    let stopped = try fresh(6)
    try diagnostics(stopped, active: false)
    let stoppedCount = (stopped["events"] as? [[String: Any]])?.count
    RunLoop.current.run(until: Date().addingTimeInterval(0.4))
    let final = try fresh(6)
    XCTAssertEqual((final["events"] as? [[String: Any]])?.count, stoppedCount)
    try diagnostics(final, active: false)
    let finalFrame = reveal("structure-probe-target").frame
    XCTAssertEqual(finalFrame.width, 40, accuracy: 1)
    XCTAssertEqual(finalFrame.height, 40, accuracy: 1)
    try checkedCapture("structure-ios-final-stopped", data: final, frame: finalFrame)
  }
}
