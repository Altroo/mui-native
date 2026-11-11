/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Raw optimized simulator workload metrics, not input latency or calibrated device results.
/// Run serially (-parallel-testing-enabled NO), selecting one RN/MUI family pair at a time.
@MainActor
final class LayoutRootPerformanceUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let preflight = ProcessInfo.processInfo.environment
  private var expectedSourceID: String { preflight["MUI_BENCHMARK_EXPECTED_SOURCE_ID"] ?? "" }
  private var nativeAppSHA256: String { preflight["MUI_BENCHMARK_NATIVE_APP_SHA256"] ?? "" }
  private enum Refusal: Error { case invalid(String) }
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func json(_ element: XCUIElement) -> [String: Any]? {
    guard element.exists, let data = element.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) throws {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    guard XCTWaiter.wait(for: [expectation], timeout: 15) == .completed else { throw Refusal.invalid(message) }
  }
  override func setUp() async throws {
    continueAfterFailure = false
    // The build runner must first retain Release build settings, source manifest
    // and the installed app executable hash. These required inputs bind every
    // RN/MUI method to that same preflight; __DEV__ only describes JavaScript.
    guard expectedSourceID.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil,
      nativeAppSHA256.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil,
      preflight["MUI_BENCHMARK_NATIVE_CONFIGURATION"] == "Release" else {
      throw Refusal.invalid("Provide the verified Release artifact/source preflight before measuring")
    }
    app.launchArguments = []
    app.launch()
    guard node("catalog-tabs").waitForExistence(timeout: 20) else { throw Refusal.invalid("Catalog did not launch") }
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<20 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    guard tab.exists && tab.isHittable else { throw Refusal.invalid("Wrappers tab is not reachable") }
    tab.tap()
    guard node("root-layout-benchmark").waitForExistence(timeout: 10) else { throw Refusal.invalid("Benchmark route is not registered") }
    for _ in 0..<12 {
      if node("root-layout-benchmark").isHittable { break }
      node("root-layout-navigation").swipeLeft()
    }
    guard node("root-layout-benchmark").isHittable else { throw Refusal.invalid("Benchmark route is not visible") }
    node("root-layout-benchmark").tap()
    try waitFor("Benchmark controller is missing") { self.json(self.node("layout-root-controller-receipt")) != nil }
  }
  private func select(_ field: String, _ value: String, _ control: String) throws {
    // The family selector cycles through three real workloads. Bound attempts
    // and wait after each selection so a stale receipt cannot skip a family.
    for _ in 0..<3 {
      if json(node("layout-root-controller-receipt"))?[field] as? String == value { break }
      guard node(control).isHittable else { throw Refusal.invalid("Controller is not visible: " + control) }
      let previous = json(node("layout-root-controller-receipt"))?["sample"] as? Int
      node(control).tap()
      try waitFor("Controller selection did not commit") { self.json(self.node("layout-root-controller-receipt"))?["sample"] as? Int != previous }
    }
    try waitFor("Controller did not select " + field) { self.json(self.node("layout-root-controller-receipt"))?[field] as? String == value }
  }
  private func checked(_ value: [String: Any], mode: String, family: String, epoch: Int) throws {
    guard value["workload"] as? String == "layout-root-v1", value["mode"] as? String == mode,
      value["family"] as? String == family, value["operation"] as? String == "update",
      value["rowCount"] as? Int == 100, value["updateEpoch"] as? Int == epoch,
      value["ready"] as? Bool == true else { throw Refusal.invalid("Wrong or incomplete workload receipt") }
    guard value["dev"] as? Bool == false, value["hermes"] as? Bool == true,
      let identity = value["sourceId"] as? String,
      identity.range(of: "^[0-9a-fA-F]{64}$", options: .regularExpression) != nil else {
      throw Refusal.invalid("Refusing non-optimized, non-Hermes or unidentified source build")
    }
    guard identity == expectedSourceID else { throw Refusal.invalid("Workload does not match the externally expected source fingerprint") }
    for (key, expected) in ["mounts": 100, "cleanups": 0, "rootAttachments": 100,
      "rootCleanups": 0, "activeRows": 100, "activeRoots": 100, "completedRows": 100,
      "rowEpochCommits": (epoch + 1) * 100, "rowUpdateCommits": epoch * 100] {
      guard value[key] as? Int == expected else { throw Refusal.invalid("Unexpected lifecycle count: \(key)=\(String(describing: value[key]))") }
    }
  }
  private func ack(_ cohort: XCUIElement, mode: String, family: String, epoch: Int) throws -> [String: Any] {
    let receipt = cohort.descendants(matching: .any).matching(identifier: "layout-root-receipt").firstMatch
    let row = cohort.descendants(matching: .any).matching(identifier: "layout-root-row-000").firstMatch
    let text = cohort.descendants(matching: .any).matching(identifier: "layout-root-detail-000").firstMatch
    // Normal OS text: wrapper roots use44/52pt; grouped actions use48/56pt
    // so both native buttons retain their minimum touch height inside the border.
    // A current native text label + frame acknowledges native application after React's ready flag.
    let expectedHeight: CGFloat = family == "button-group" ? ((epoch / 8) % 2 == 1 ? 56 : 48) : ((epoch / 8) % 2 == 1 ? 52 : 44)
    try waitFor("Ready/native row-zero frame did not acknowledge epoch \(epoch)") {
      guard let value = self.json(receipt), value["ready"] as? Bool == true,
        value["updateEpoch"] as? Int == epoch, row.exists, text.exists else { return false }
      let frame = row.frame
      return frame.width.isFinite && frame.height.isFinite && frame.width > 0
        && abs(frame.height - expectedHeight) <= 1 && self.app.frame.intersects(frame)
        && text.label == String(format: "Stage %02d", epoch % 16)
    }
    guard let value = json(receipt) else { throw Refusal.invalid("Receipt disappeared") }
    try checked(value, mode: mode, family: family, epoch: epoch)
    if family == "button-group" && epoch > 0 {
      let action = cohort.descendants(matching: .any).matching(identifier: "layout-root-label-000-action").firstMatch
      guard action.label == "Row 001 presses 1" else { throw Refusal.invalid("A grouped action lost its local press state") }
    }
    return value
  }
  private func fresh(mode: String, family: String) throws -> XCUIElement {
    guard let before = json(node("layout-root-controller-receipt"))?["sample"] as? Int,
      node("layout-root-new-sample").isHittable else { throw Refusal.invalid("New sample control unavailable") }
    node("layout-root-new-sample").tap()
    try waitFor("Controller did not create a fresh cohort") {
      guard let value = self.json(self.node("layout-root-controller-receipt")), let sample = value["sample"] as? Int else { return false }
      return sample > before
    }
    guard let id = json(node("layout-root-controller-receipt"))?["cohortId"] as? String else { throw Refusal.invalid("No cohort identity") }
    let cohort = node(id)
    guard cohort.waitForExistence(timeout: 15) else { throw Refusal.invalid("Fresh native cohort is missing") }
    // Scoping receipt/row queries to this unique native parent rejects a stale old cohort.
    _ = try ack(cohort, mode: mode, family: family, epoch: 0)
    if family == "button-group" {
      _ = try validateGroup(cohort: cohort, epoch: 0, firstPresses: 0)
      let first = cohort.descendants(matching: .any).matching(identifier: "layout-root-label-000-action").firstMatch
      first.tap()
      try waitFor("Real grouped action activation must commit before measuring") { first.label == "Row 001 presses 1" }
    }
    return cohort
  }
  /// Validate a correctness cohort outside metrics; retain actual native values.
  private func validateGroup(cohort: XCUIElement, epoch: Int, firstPresses: Int = 1, probeDisabled: Bool = false) throws -> [String: Any] {
    let first = cohort.descendants(matching: .any).matching(identifier: "layout-root-label-000-action").firstMatch
    let second = cohort.descendants(matching: .any).matching(identifier: "layout-root-detail-000-action").firstMatch
    let group = cohort.descendants(matching: .any).matching(identifier: "layout-root-row-000").firstMatch.frame
    let a = first.frame, b = second.frame
    let enabled = (epoch / 2) % 2 == 0
    let width = (group.width - 2) / 2
    guard first.exists && second.exists, (!enabled || (first.isHittable && second.isHittable)),
      first.isEnabled == enabled && second.isEnabled == enabled,
      a.height >= 43.5 && b.height >= 43.5,
      abs(a.width - width) <= 1.5 && abs(b.width - width) <= 1.5,
      abs(a.minX - group.minX - 1) <= 1.5,
      abs(a.maxX - b.minX) <= 1.5,
      abs(b.maxX - group.maxX + 1) <= 1.5,
      abs(a.minY - group.minY - 1) <= 1.5,
      abs(a.minY - b.minY) <= 1.5,
      abs(a.height - group.height + 2) <= 1.5,
      abs(b.height - group.height + 2) <= 1.5 else { throw Refusal.invalid("Native grouped action geometry or disabled state differs from the comparison contract") }
    if probeDisabled && !enabled {
      // Coordinate input reaches the same native hit-test path as a real touch.
      first.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      second.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
    guard first.label == "Row 001 presses \(firstPresses)",
      second.label == String(format: "Stage %02d presses 0", epoch % 16) else { throw Refusal.invalid("Grouped native action state changed unexpectedly") }
    func rect(_ value: CGRect) -> [String: Double] { ["x": Double(value.minX), "y": Double(value.minY), "width": Double(value.width), "height": Double(value.height)] }
    return ["epoch": epoch, "enabled": enabled, "group": rect(group),
      "actions": [["frame": rect(a), "label": first.label, "enabled": first.isEnabled],
        ["frame": rect(b), "label": second.label, "enabled": second.isEnabled]]]
  }
  private func record(_ receipt: [String: Any], cohort: XCUIElement, mode: String, family: String, phase: String, validation: [[String: Any]]? = nil) throws {
    let frame = cohort.descendants(matching: .any).matching(identifier: "layout-root-row-000").firstMatch.frame
    var summary: [String: Any] = ["phase": phase, "mode": mode, "family": family, "receipt": receipt,
      "preflight": ["expectedSourceId": expectedSourceID, "nativeAppExecutableSHA256": nativeAppSHA256, "nativeConfiguration": "Release"],
      "nativeRow0": ["x": Double(frame.minX), "y": Double(frame.minY), "width": Double(frame.width), "height": Double(frame.height)]]
    if family == "button-group" { summary["nativeActions"] = try validateGroup(cohort: cohort, epoch: 16) }
    if let validation { summary["nativeValidation"] = validation }
    let data = try JSONSerialization.data(withJSONObject: summary, options: [.prettyPrinted, .sortedKeys])
    guard let text = String(data: data, encoding: .utf8) else { throw Refusal.invalid("Validation JSON encoding failed") }
    print("LAYOUT_ROOT_PROFILE_VALIDATION " + text)
    let attachment = XCTAttachment(string: text)
    attachment.name = "layout-root-\(family)-\(mode)-\(phase)"
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func profile(mode: String, family: String) throws {
    try select("mode", mode, "layout-root-controller-mode")
    try select("family", family, "layout-root-controller-family")
    try select("operation", "update", "layout-root-controller-operation")
    if family == "button-group" {
      let cohort = try fresh(mode: mode, family: family)
      let advance = cohort.descendants(matching: .any).matching(identifier: "layout-root-advance").firstMatch
      var validation = [try validateGroup(cohort: cohort, epoch: 0)]
      var final: [String: Any] = [:]
      for epoch in 1...16 {
        advance.tap()
        final = try ack(cohort, mode: mode, family: family, epoch: epoch)
        validation.append(try validateGroup(cohort: cohort, epoch: epoch, probeDisabled: true))
      }
      try record(final, cohort: cohort, mode: mode, family: family, phase: "native-validation", validation: validation)
    }
    let options = XCTMeasureOptions()
    options.iterationCount = 3
    options.invocationOptions = [.manuallyStart, .manuallyStop]
    var invocation = 0
    // The installed XCTest SDK executes iterationCount + 1 blocks and discards the first.
    // The first metric block is the one discarded metric warm-up. ButtonGroup
    // additionally runs its separate unmeasured correctness cohort above.
    measure(metrics: [XCTCPUMetric(application: app), XCTMemoryMetric(application: app)], options: options) {
      invocation += 1
      var measuring = false
      do {
        let cohort = try self.fresh(mode: mode, family: family)
        let advance = cohort.descendants(matching: .any).matching(identifier: "layout-root-advance").firstMatch
        guard advance.exists && advance.isHittable && advance.isEnabled else { throw Refusal.invalid("Native Advance control is not visible/enabled") }
        self.startMeasuring()
        measuring = true
        var final: [String: Any] = [:]
        for epoch in 1...16 {
          advance.tap()
          final = try self.ack(cohort, mode: mode, family: family, epoch: epoch)
        }
        self.stopMeasuring()
        measuring = false
        try self.record(final, cohort: cohort, mode: mode, family: family,
          phase: invocation == 1 ? "warmup-discarded" : "sample-\(invocation - 1)")
      } catch {
        if measuring { self.stopMeasuring() }
        XCTFail("Layout root profile refused: \(error)")
      }
    }
    XCTAssertEqual(invocation, 4, "Expected one discarded warm-up and three reported samples")
  }
  func testFormGroupRNCPUAndMemory() throws { try profile(mode: "rn", family: "form-group") }
  func testFormGroupMUICPUAndMemory() throws { try profile(mode: "mui", family: "form-group") }
  func testAvatarRNCPUAndMemory() throws { try profile(mode: "rn", family: "list-item-avatar") }
  func testAvatarMUICPUAndMemory() throws { try profile(mode: "mui", family: "list-item-avatar") }
  func testButtonGroupRNCPUAndMemory() throws { try profile(mode: "rn", family: "button-group") }
  func testButtonGroupMUICPUAndMemory() throws { try profile(mode: "mui", family: "button-group") }
}
