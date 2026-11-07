/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import CoreFoundation

/// Target-app metrics include its handling of input/AX requests; runner-process
/// CPU/memory is excluded. No frame-rate, isolated-component, cold-start,
/// presentation-latency or physical-device claim.
@MainActor
final class PaperPerformanceUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let environment = ProcessInfo.processInfo.environment
  private enum Refusal: Error { case invalid(String) }
  private enum Phase: String { case mount, updates, scroll }
  private let names = ["initial", "zero", "raised", "high", "dark-high", "dark-raised", "dark-square", "outlined", "restored"]
  private func node(_ id: String, in root: XCUIElement? = nil) -> XCUIElement {
    (root ?? app).descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func json(_ element: XCUIElement) -> [String: Any]? {
    guard element.exists, let data = element.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func integer(_ value: Any?) -> Int? {
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
    let double = number.doubleValue
    guard double.isFinite, double.rounded(.towardZero) == double, double >= 0, double < Double(Int.max) else { return nil }
    return number.intValue
  }
  private func boolean(_ value: Any?) -> Bool? {
    guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else { return nil }
    return number.boolValue
  }
  private func finite(_ value: Any?) -> Double? {
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite else { return nil }
    return number.doubleValue
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) throws {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    guard XCTWaiter.wait(for: [expectation], timeout: 20) == .completed else { throw Refusal.invalid(message) }
  }
  private func validHash(_ value: String?) -> Bool {
    value?.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil
  }
  private func reveal(_ id: String, in navigation: String) throws -> XCUIElement {
    let target = node(id), strip = node(navigation)
    guard target.waitForExistence(timeout: 15), strip.exists else { throw Refusal.invalid("Navigation is missing: " + id) }
    for _ in 0..<24 {
      let viewport = strip.frame.intersection(app.frame)
      if target.isHittable && viewport.contains(CGPoint(x: target.frame.midX, y: target.frame.midY)) { return target }
      if !target.frame.isEmpty && target.frame.midX < viewport.minX { strip.swipeRight() }
      else { strip.swipeLeft() }
    }
    throw Refusal.invalid("Navigation is not visible: " + id)
  }
  @MainActor
  override func setUp() async throws {
    continueAfterFailure = false
    guard validHash(environment["MUI_BENCHMARK_EXPECTED_SOURCE_ID"]), validHash(environment["MUI_BENCHMARK_NATIVE_APP_SHA256"]),
      environment["MUI_BENCHMARK_NATIVE_CONFIGURATION"] == "Release" else {
      throw Refusal.invalid("Provide verified Release/source/installed executable preflight before measuring")
    }
    app.launchArguments = []; app.launch()
    try reveal("catalog-tab-Wrappers", in: "catalog-tabs").tap()
    try reveal("root-layout-paper-benchmark", in: "root-layout-navigation").tap()
    try waitFor("Paper controller is missing") { self.json(self.node("paper-benchmark-controller")) != nil }
    guard let initialID = json(node("paper-benchmark-controller"))?["cohortId"] as? String else { throw Refusal.invalid("Initial cohort is missing") }
    // Reject a wrong binary/profile before any measurement, including hot mount.
    _ = try ack(node(initialID), mode: "rn", epoch: 0)
  }
  @MainActor
  override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0, app.state == .runningForeground {
      let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = "paper-performance-refused"
      attachment.lifetime = .keepAlways; add(attachment)
    }
  }
  private func metadata(_ cohort: XCUIElement) -> [String: Any]? { json(node("paper-benchmark-receipt", in: cohort)) }
  private func checked(_ value: [String: Any], mode: String, epoch: Int) throws {
    guard integer(value["schemaVersion"]) == 1, value["workload"] as? String == "paper-surface-v1", value["mode"] as? String == mode,
      value["sourceId"] as? String == environment["MUI_BENCHMARK_EXPECTED_SOURCE_ID"], boolean(value["dev"]) == false,
      boolean(value["hermes"]) == true, boolean(value["ready"]) == true, boolean(value["globalRtl"]) == false,
      boolean(value["swapInRtl"]) != nil, integer(value["epoch"]) == epoch,
      let fontScale = finite(value["fontScale"]), abs(fontScale - 1) < 0.001,
      let stage = value["stage"] as? [String: Any], stage["name"] as? String == names[epoch],
      integer(stage["elevation"]) == [1, 0, 8, 24, 24, 8, 1, 1, 1][epoch],
      boolean(stage["dark"]) == (epoch >= 4 && epoch <= 7), boolean(stage["square"]) == (epoch == 6 || epoch == 7),
      stage["variant"] as? String == (epoch == 7 ? "outlined" : "elevation") else {
      throw Refusal.invalid("Wrong build, source, normal LTR/text profile or workload epoch")
    }
    for (key, expected) in ["rowCount": 100, "mounts": 100, "cleanups": 0, "rootAttachments": 100,
      "rootCleanups": 0, "rootReplacements": 0, "completedRows": 100, "rowEpochCommits": (epoch + 1) * 100, "rowUpdateCommits": epoch * 100] {
      guard integer(value[key]) == expected else { throw Refusal.invalid("Unexpected lifecycle value: " + key) }
    }
  }
  private func rowFrameValid(_ frame: CGRect, _ viewport: CGRect, _ screen: CGRect) -> Bool {
    let values = [frame.minX, frame.minY, frame.width, frame.height, viewport.minX, viewport.minY,
      viewport.width, viewport.height, screen.minX, screen.minY, screen.width, screen.height]
    guard values.allSatisfy({ $0.isFinite }), viewport.width > 24 else { return false }
    let visible = frame.intersection(viewport).intersection(screen)
    return abs(frame.minX - viewport.minX - 12) <= 1 && abs(frame.width - viewport.width + 24) <= 1
      && abs(frame.height - 72) <= 1 && visible.width > 0 && visible.height >= 16
  }
  private func freshFrameValid(_ frame: CGRect, _ viewport: CGRect, _ screen: CGRect) -> Bool {
    rowFrameValid(frame, viewport, screen) && abs(frame.minY - viewport.minY - 12) <= 1
  }
  private func ack(_ cohort: XCUIElement, mode: String, epoch: Int) throws -> [String: Any] {
    let row = node("paper-benchmark-row-000", in: cohort), text = node("paper-benchmark-detail-000", in: cohort)
    let viewport = node("paper-benchmark-viewport", in: cohort)
    try waitFor("React/native first-row epoch acknowledgement is incomplete") {
      guard let value = self.metadata(cohort), self.integer(value["epoch"]) == epoch, self.boolean(value["ready"]) == true,
        row.exists, text.exists, text.label == "Epoch \(epoch) / " + self.names[epoch] else { return false }
      return viewport.exists && self.rowFrameValid(row.frame, viewport.frame, self.app.frame)
    }
    guard let value = metadata(cohort) else { throw Refusal.invalid("Cohort receipt disappeared") }
    try checked(value, mode: mode, epoch: epoch)
    return value
  }
  private func select(_ mode: String) throws {
    if json(node("paper-benchmark-controller"))?["mode"] as? String != mode {
      let control = node("paper-benchmark-mode-" + mode)
      guard control.isHittable else { throw Refusal.invalid("Mode control is not reachable") }; control.tap()
    }
    try waitFor("Controller mode was not selected") { self.json(self.node("paper-benchmark-controller"))?["mode"] as? String == mode }
  }
  private func fresh(_ mode: String) throws -> XCUIElement {
    guard let before = json(node("paper-benchmark-controller")), let sample = integer(before["sample"]), let oldID = before["cohortId"] as? String,
      node("paper-benchmark-new-sample").isHittable else { throw Refusal.invalid("Fresh sample control is unavailable") }
    node("paper-benchmark-new-sample").tap()
    try waitFor("A fresh cohort was not created") {
      guard let current = self.json(self.node("paper-benchmark-controller")) else { return false }
      return self.integer(current["sample"]) == sample + 1 && current["mode"] as? String == mode && current["cohortId"] as? String != oldID
    }
    guard let current = json(node("paper-benchmark-controller")), let id = current["cohortId"] as? String, !id.isEmpty else { throw Refusal.invalid("Missing fresh cohort identity") }
    let cohort = node(id)
    guard cohort.waitForExistence(timeout: 15), !node(oldID).exists else { throw Refusal.invalid("Stale cohort remains in the native tree") }
    let value = try ack(cohort, mode: mode, epoch: 0)
    guard freshFrameValid(node("paper-benchmark-row-000", in: cohort).frame, node("paper-benchmark-viewport", in: cohort).frame, app.frame) else {
      throw Refusal.invalid("Fresh native cohort has the wrong origin/width or is clipped")
    }
    guard let scroll = value["scroll"] as? [String: Any], integer(scroll["sequence"]) == 0, finite(scroll["offsetY"]) == 0 else { throw Refusal.invalid("Fresh cohort did not reset scroll") }
    return cohort
  }
  private func scroll(_ cohort: XCUIElement, mode: String) throws -> [[String: Double]] {
    let viewport = node("paper-benchmark-viewport", in: cohort), row = node("paper-benchmark-row-000", in: cohort)
    let visible = viewport.frame.intersection(app.frame), origin = row.frame.minY
    guard visible.width > 100, visible.height >= 200, viewport.isHittable else { throw Refusal.invalid("Scroll viewport is clipped or unavailable") }
    var frames: [[String: Double]] = []
    for cycle in 0..<3 {
      for outward in [true, false] {
        guard let before = metadata(cohort)?["scroll"] as? [String: Any], let sequence = integer(before["sequence"]) else { throw Refusal.invalid("Missing scroll sequence") }
        let previousY = row.frame.minY
        let start = viewport.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: outward ? 0.62 : 0.50))
        let end = viewport.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: outward ? 0.50 : 0.62))
        // Same short held native drags in both modes; no fixed cadence or
        // presented-frame timing is inferred from XCUI gesture calls.
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
        var lastY: CGFloat?, stable = 0
        try waitFor("Scroll did not move/settle/return with a fresh receipt") {
          guard let current = self.metadata(cohort)?["scroll"] as? [String: Any], let currentSequence = self.integer(current["sequence"]),
            currentSequence > sequence, let offset = self.finite(current["offsetY"]), row.exists else { return false }
          let y = row.frame.minY
          guard y.isFinite, abs(Double(origin - y) - offset) <= 3 else { return false }
          if let lastY, abs(y - lastY) < 0.5 { stable += 1 } else { stable = 0 }
          lastY = y
          return stable >= 2 && (outward ? previousY - y >= 12 : abs(y - origin) <= 3)
        }
        _ = try ack(cohort, mode: mode, epoch: 0)
        frames.append(["cycle": Double(cycle), "outward": outward ? 1 : 0, "beforeY": Double(previousY), "afterY": Double(row.frame.minY)])
      }
    }
    return frames
  }
  private func record(_ cohort: XCUIElement, mode: String, phase: Phase, invocation: Int, frames: [[String: Double]]) throws {
    guard let receipt = metadata(cohort) else { throw Refusal.invalid("Final receipt is missing") }
    let frame = node("paper-benchmark-row-000", in: cohort).frame
    let value: [String: Any] = ["schemaVersion": 1, "phase": phase.rawValue, "mode": mode,
      "sample": invocation == 1 ? "warmup-discarded" : "sample-\(invocation - 1)", "cohortId": cohort.identifier,
      "preflight": ["sourceId": environment["MUI_BENCHMARK_EXPECTED_SOURCE_ID"]!, "installedAppExecutableSHA256": environment["MUI_BENCHMARK_NATIVE_APP_SHA256"]!, "configuration": "Release"],
      "receipt": receipt, "nativeFirstRow": ["x": Double(frame.minX), "y": Double(frame.minY), "width": Double(frame.width), "height": Double(frame.height)], "nativeScrollFrames": frames]
    let data = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys])
    guard let text = String(data: data, encoding: .utf8) else { throw Refusal.invalid("Profile evidence encoding failed") }
    let attachment = XCTAttachment(string: text); attachment.name = "paper-\(phase.rawValue)-\(mode)-\(invocation)"
    attachment.lifetime = .keepAlways; add(attachment)
  }
  private func profile(_ mode: String, _ phase: Phase) throws {
    try select(mode)
    let options = XCTMeasureOptions(); options.iterationCount = 3; options.invocationOptions = [.manuallyStart, .manuallyStop]
    var invocation = 0
    // This SDK uses one discarded warm-up plus three reported invocations.
    // The assertion below rejects a changed protocol; do not add another warm-up.
    measure(metrics: [XCTCPUMetric(application: app), XCTMemoryMetric(application: app)], options: options) {
      invocation += 1; var measuring = false
      do {
        if phase == .mount { self.startMeasuring(); measuring = true }
        let cohort = try self.fresh(mode)
        if phase != .mount { self.startMeasuring(); measuring = true }
        var frames: [[String: Double]] = []
        if phase == .updates {
          let advance = self.node("paper-benchmark-advance", in: cohort)
          for epoch in 1...8 {
            guard advance.isHittable && advance.isEnabled else { throw Refusal.invalid("Advance control is unavailable") }
            advance.tap(); _ = try self.ack(cohort, mode: mode, epoch: epoch)
          }
        } else if phase == .scroll { frames = try self.scroll(cohort, mode: mode) }
        self.stopMeasuring(); measuring = false
        try self.record(cohort, mode: mode, phase: phase, invocation: invocation, frames: frames)
      } catch {
        if measuring { self.stopMeasuring() }; XCTFail("Paper performance refused: \(error)")
      }
    }
    XCTAssertEqual(invocation, 4, "Expected exactly one discarded warm-up plus three samples")
  }
  func testMountRN() throws { try profile("rn", .mount) }
  func testMountMUI() throws { try profile("mui", .mount) }
  func testUpdatesRN() throws { try profile("rn", .updates) }
  func testUpdatesMUI() throws { try profile("mui", .updates) }
  func testScrollRN() throws { try profile("rn", .scroll) }
  func testScrollMUI() throws { try profile("mui", .scroll) }
}
