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
    if json(node("layout-root-controller-receipt"))?[field] as? String != value {
      guard node(control).isHittable else { throw Refusal.invalid("Controller is not visible: " + control) }
      node(control).tap()
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
    // The collector targets the normal OS text profile and the workload's actual 44/52 point roots.
    // A current native text label + frame acknowledges native application after React's ready flag.
    let expectedHeight: CGFloat = (epoch / 8) % 2 == 1 ? 52 : 44
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
    return cohort
  }
  private func record(_ receipt: [String: Any], cohort: XCUIElement, mode: String, family: String, phase: String) throws {
    let frame = cohort.descendants(matching: .any).matching(identifier: "layout-root-row-000").firstMatch.frame
    let summary: [String: Any] = ["phase": phase, "mode": mode, "family": family, "receipt": receipt,
      "preflight": ["expectedSourceId": expectedSourceID, "nativeAppExecutableSHA256": nativeAppSHA256, "nativeConfiguration": "Release"],
      "nativeRow0": ["x": Double(frame.minX), "y": Double(frame.minY), "width": Double(frame.width), "height": Double(frame.height)]]
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
    let options = XCTMeasureOptions()
    options.iterationCount = 3
    options.invocationOptions = [.manuallyStart, .manuallyStop]
    var invocation = 0
    // The installed XCTest SDK executes iterationCount + 1 blocks and discards the first.
    // That first 16-epoch cohort is the single warm-up; do not add a second warm-up outside.
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
}
