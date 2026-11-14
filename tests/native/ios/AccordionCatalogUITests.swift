/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Native touch, body-local edit retention and opt-in unmounting; physical matrices remain separate.
@MainActor
final class AccordionCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Accordion")
    for _ in 0..<12 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("accordion-delivery-summary").waitForExistence(timeout: 10))
    waitFor("Initial delivery must reach its measured endpoint") {
      self.node("accordion-delivery-transition").frame.height > 0
        && self.node("accordion-note").exists
        && self.node("accordion-phases").label.contains("Delivery: open")
    }
  }
  @discardableResult
  private func reveal(_ id: String) -> XCUIElement {
    let control = node(id)
    for _ in 0..<12 {
      if control.exists && control.isHittable { break }
      let scroll = node("accordion-scroll")
      if control.exists && control.frame.midY < scroll.frame.minY {
        scroll.swipeDown()
      } else {
        scroll.swipeUp()
      }
    }
    XCTAssertTrue(control.exists && control.isHittable, "Native target must be hittable: \(id)")
    return control
  }
  private func tap(_ id: String) { reveal(id).tap() }
  private func capture(_ name: String) {
    let scroll = node("accordion-scroll").frame
    for id in ["accordion-status", "accordion-changes", "accordion-subtotal-label",
      "accordion-subtotal-value", "accordion-delivery-label", "accordion-delivery-value",
      "accordion-total-label", "accordion-total-value"] {
      let label = node(id)
      if label.exists && label.frame.width > 0 {
        XCTAssertGreaterThanOrEqual(label.frame.minX, scroll.minX - 1, id)
        XCTAssertLessThanOrEqual(label.frame.maxX, scroll.maxX + 1, id)
      }
    }
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  func testControlledExpansionAndBodyLocalEditorRetention() {
    capture("accordion-ios-initial")
    // TextField forwards this identifier to its editable host.
    let editor = node("accordion-note")
    XCTAssertTrue(editor.exists)
    tap("accordion-note")
    editor.typeText("8472")
    waitFor("Native text events must update body-local note") {
      self.node("accordion-note-value").label.contains("8472")
    }
    let edited = node("accordion-note-value").label
    editor.typeText("\n")
    tap("accordion-payment-summary")
    waitFor("Controlled payment expansion must hide delivery descendants and dispatch once") {
      !self.node("accordion-note").exists
        && self.node("accordion-payment-transition").frame.height > 0
        && self.node("accordion-phases").label == "Delivery: closed · Payment: open"
        && self.node("accordion-changes").label == "Section changes: 1"
    }
    capture("accordion-ios-payment")
    tap("accordion-delivery-summary")
    waitFor("Reopening must retain body-local edits and dispatch once") {
      self.node("accordion-note-value").exists && self.node("accordion-note-value").label == edited
        && self.node("accordion-phases").label.contains("Delivery: open")
        && self.node("accordion-changes").label == "Section changes: 2"
    }
    tap("accordion-save")
    waitFor("Actions must remain interactive in the expanded body") {
      self.node("accordion-status").label == "Note saved"
    }
    capture("accordion-ios-retained")
  }
  func testDarkModeAndSummaryAccessibility() {
    let delivery = app.buttons.matching(identifier: "accordion-delivery-summary").firstMatch
    let payment = app.buttons.matching(identifier: "accordion-payment-summary").firstMatch
    XCTAssertTrue(delivery.exists)
    XCTAssertTrue(payment.exists)
    XCTAssertTrue(delivery.label.contains("Delivery instructions"))
    XCTAssertTrue(payment.label.contains("Payment & receipt"))
    // Changing the provider exercises live retained CSS, including the native
    // Paper overlay and separator color, without rebuilding the component tree.
    tap("catalog-appearance")
    waitFor("Dark mode must preserve the expanded body and named controls") {
      self.node("accordion-note").exists && delivery.exists && payment.exists
    }
    capture("accordion-ios-dark-delivery")
    tap("accordion-payment-summary")
    waitFor("Dark mode must keep expansion and descendant accessibility coherent") {
      !self.node("accordion-note").exists
        && self.node("accordion-phases").label == "Delivery: closed · Payment: open"
        && self.node("accordion-changes").label == "Section changes: 1"
    }
    capture("accordion-ios-dark-payment")
    tap("catalog-appearance")
    waitFor("Returning to light mode must retain the selected panel") {
      self.node("accordion-phases").label == "Delivery: closed · Payment: open"
    }
    capture("accordion-ios-light-payment")
  }
  @objc func testVoiceOverTraversalAndActivation() throws {
    guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver automation requires iOS27") }
    let service = XCUIDevice.shared.voiceOverService
    let original = service.isEnabled
    // Teardown runs even after a failed XCTest assertion. Never leave the
    // user's accessibility setting changed by a failed traversal scenario.
    addTeardownBlock { @MainActor in
      if !original { try service.disable() }
      XCTAssertEqual(service.isEnabled, original)
    }
    var transcript: [[String: String]] = []
    func attachTranscript() {
      if let data = try? JSONSerialization.data(withJSONObject: transcript, options: [.sortedKeys]) {
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        attachment.name = "accordion-voiceover-traversal-" + String(transcript.count)
        attachment.lifetime = .keepAlways; add(attachment)
      }
    }
    func attachNativeHierarchy(_ phase: String) {
      let attachment = XCTAttachment(string: app.debugDescription)
      attachment.name = "accordion-voiceover-native-tree-" + phase
      attachment.lifetime = .keepAlways; add(attachment)
    }
    defer { attachTranscript() }
    try service.enable()
    XCTAssertTrue(service.isEnabled)
    func find(_ label: String, phase: String, backward: Bool = false, limit: Int = 60) throws -> [String] {
      var spoken: [String] = []
      func matches(_ utterance: String) -> Bool {
        utterance.lowercased().replacingOccurrences(of: "&", with: "and").contains(
          label.lowercased().replacingOccurrences(of: "&", with: "and"))
      }
      // Enabling the service may already focus the desired Summary. Read it
      // before advancing so the first focused element is never skipped.
      if let utterance = try? service.currentSpeech().utterance {
        transcript.append(["phase": phase, "utterance": utterance]); spoken.append(utterance)
        if matches(utterance) { attachTranscript(); return spoken }
      }
      for _ in 0..<limit {
        let utterance = try (backward ? service.moveBackward() : service.moveForward()).utterance
        transcript.append(["phase": phase, "utterance": utterance]); spoken.append(utterance)
        if matches(utterance) { attachTranscript(); return spoken }
      }
      attachTranscript()
      attachNativeHierarchy("failed-" + phase)
      XCTFail("VoiceOver could not reach " + label)
      return spoken
    }
    let delivery = try XCTUnwrap(find("Delivery instructions", phase: "initial").last)
    XCTAssertTrue(app.buttons.matching(identifier: "accordion-delivery-summary").firstMatch.exists)
    XCTAssertTrue(delivery.lowercased().contains("expanded"), "Actual VoiceOver Summary: " + delivery)
    XCTAssertFalse(delivery.contains("⌄"), "Decorative indicator text must not enter the spoken label")
    let initialBody = try find("Payment & receipt", phase: "delivery-body")
    XCTAssertTrue(initialBody.contains { $0.localizedCaseInsensitiveContains("Delivery note") })
    XCTAssertTrue(initialBody.contains { $0.localizedCaseInsensitiveContains("Save note") })
    // Pinned RN/UIKit announces the true expanded value; a collapsed button
    // has no synthetic English "collapsed" accessibilityValue.
    XCTAssertFalse(try XCTUnwrap(initialBody.last).lowercased().contains("expanded"))
    // The independent stock/owned control qualifies a target-specific double
    // tap: one activation with VoiceOver on. Whole-app gestures are unqualified.
    let paymentBefore = node("accordion-payment-summary").frame
    node("accordion-payment-summary").doubleTap()
    waitFor("VoiceOver activation must select payment exactly once") {
      self.node("accordion-phases").label == "Delivery: closed · Payment: open"
        && self.node("accordion-changes").label == "Section changes: 1"
        && !self.node("accordion-note").exists
    }
    // Transition callbacks and native accessibility snapshots have separate
    // completion. Require the target's real expanded value before navigation;
    // do not insert a blind delay, force focus, or expand the traversal budget.
    let nativeReadyStart = ProcessInfo.processInfo.systemUptime
    let nativeReady = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      let target = self.node("accordion-payment-summary")
      return target.exists && target.isHittable
        && String(describing: target.value).lowercased().contains("expanded")
    }, object: nil)
    let nativeReadyResult = XCTWaiter.wait(for: [nativeReady], timeout: 12)
    transcript.append([
      "phase": "payment-before-navigation",
      "utterance": try service.currentSpeech().utterance,
      "frameBeforeActivation": NSCoder.string(for: paymentBefore),
      "frameAfterActivation": NSCoder.string(for: node("accordion-payment-summary").frame),
      "nativeValue": String(describing: node("accordion-payment-summary").value),
      "hittable": String(node("accordion-payment-summary").isHittable),
      "nativeReadySeconds": String(ProcessInfo.processInfo.systemUptime - nativeReadyStart),
    ])
    if nativeReadyResult != .completed {
      attachTranscript(); attachNativeHierarchy("native-value-timeout")
    }
    XCTAssertEqual(nativeReadyResult, .completed, "Payment must expose its expanded native accessibility value")
    transcript.append(["phase": "payment-refocus", "utterance": try service.moveBackward().utterance])
    let payment = try XCTUnwrap(find("Payment & receipt", phase: "payment-refocus", limit: 8).last)
    XCTAssertTrue(payment.lowercased().contains("expanded"))
    let closedDelivery = try XCTUnwrap(find("Delivery instructions", phase: "closed-delivery", backward: true).last)
    XCTAssertFalse(closedDelivery.lowercased().contains("expanded"))
    let hiddenBody = try find("Payment & receipt", phase: "closed-delivery-body")
    XCTAssertFalse(hiddenBody.contains { $0.localizedCaseInsensitiveContains("Delivery note") || $0.localizedCaseInsensitiveContains("Save note") })
    let paymentBody = try find("Return request", phase: "payment-body")
    XCTAssertTrue(paymentBody.contains { $0.localizedCaseInsensitiveContains("Subtotal") })
    XCTAssertFalse(paymentBody.contains { $0.localizedCaseInsensitiveContains("Delivery note") || $0.localizedCaseInsensitiveContains("Save note") })
    // The system speaks control roles/disabled traits in its own language.
    // Assert native traits and real activation, retaining the actual speech.
    let disabled = app.buttons.matching(identifier: "accordion-disabled-summary").firstMatch
    XCTAssertTrue(disabled.exists)
    XCTAssertFalse(disabled.isEnabled)
    disabled.doubleTap()
    let opened = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      self.node("accordion-disabled-details").exists
    }, object: nil)
    opened.isInverted = true
    XCTAssertEqual(XCTWaiter.wait(for: [opened], timeout: 1), .completed,
      "The disabled Return panel must remain collapsed after activation settles")
    XCTAssertFalse((disabled.value as? String ?? "").lowercased().contains("expanded"))
    XCTAssertEqual(node("accordion-changes").label, "Section changes: 1")
    capture("accordion-ios-voiceover-payment")
  }
  func testSummaryAccessibilityAudit() throws {
    guard #available(iOS 17.0, *) else {
      throw XCTSkip("XCTest accessibility auditing requires iOS 17 or later")
    }
    // Native traits and control descriptions complement the touch/geometry
    // checks. This audit does not replace real screen-reader traversal.
    reveal("accordion-delivery-summary")
    try app.performAccessibilityAudit(for: [.sufficientElementDescription, .trait])
    tap("accordion-payment-summary")
    waitFor("The selected payment body must finish entering before auditing") {
      self.node("accordion-phases").label == "Delivery: closed · Payment: open"
    }
    try app.performAccessibilityAudit(for: [.sufficientElementDescription, .trait])
  }
  func testLocalRTLReversesSummaryAndRetainsBody() {
    let content = node("accordion-delivery-content")
    let icon = node("accordion-delivery-icon")
    XCTAssertTrue(content.exists && icon.exists)
    XCTAssertGreaterThanOrEqual(icon.frame.minX + 1, content.frame.maxX)
    let note = node("accordion-note-value").label
    tap("accordion-direction")
    waitFor("An authored RTL ancestor must reverse the actual Summary row") {
      icon.frame.maxX <= content.frame.minX + 1
    }
    XCTAssertEqual(node("accordion-note-value").label, note)
    XCTAssertEqual(node("accordion-changes").label, "Section changes: 0")
    capture("accordion-ios-local-rtl")
    tap("accordion-direction")
    waitFor("Returning to LTR must preserve the original row order") {
      icon.frame.minX + 1 >= content.frame.maxX
    }
    XCTAssertEqual(node("accordion-note-value").label, note)
  }
  func testDisabledSummaryAndIndependentUnmounting() {
    tap("accordion-disabled-summary")
    XCTAssertEqual(node("accordion-changes").label, "Section changes: 0")
    XCTAssertTrue(node("accordion-note").exists)
    XCTAssertFalse(node("accordion-help-details").exists)
    tap("accordion-help-summary")
    waitFor("Independent help must mount its body") { self.node("accordion-help-details").exists }
    tap("accordion-help-read")
    waitFor("Body-local help state must change") {
      self.node("accordion-help-read").label == "Read"
    }
    tap("accordion-help-summary")
    waitFor("Closing must hide help descendants") { !self.node("accordion-help-details").exists }
    // Accessibility absence alone also occurs for retained, clipped descendants.
    tap("accordion-help-summary")
    waitFor("Opt-in unmounting must reset body-local state after reopening") {
      self.node("accordion-help-read").exists
        && self.node("accordion-help-read").label == "Mark as read"
    }
    tap("accordion-help-summary")
    waitFor("Final exit must remove help descendants") {
      !self.node("accordion-help-details").exists
    }
    XCTAssertEqual(node("accordion-changes").label, "Section changes: 0")
    capture("accordion-ios-help-closed")
  }
}


/// Isolated optimized-build checks of public native bounds during finite motion.
@MainActor
final class AccordionMotionProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func receipt() -> [String: Any]? {
    guard node("accordion-motion-receipt").exists,
      let data = node("accordion-motion-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("accordion-motion-run").waitForExistence(timeout: 20))
  }
  private func run(_ mode: String) throws {
    node("accordion-motion-mode-" + mode).tap()
    waitFor("The selected native case must start idle") {
      self.receipt()?["mode"] as? String == mode
        && self.receipt()?["phase"] as? String == "idle"
    }
    let initial = XCTAttachment(screenshot: app.screenshot())
    initial.name = "accordion-motion-" + mode + "-initial"
    initial.lifetime = .keepAlways
    add(initial)
    node("accordion-motion-run").tap()
    waitFor("Native measurement sampling must complete") {
      self.receipt()?["phase"] as? String == "complete"
    }
    let report = try XCTUnwrap(receipt())
    XCTAssertEqual(report["schemaVersion"] as? Int, 1)
    XCTAssertEqual(report["development"] as? Bool, false, "An optimized standalone build is required")
    XCTAssertEqual(try XCTUnwrap(report["fontScale"] as? Double), 1, accuracy: 0.01)
    let samples = try XCTUnwrap(report["samples"] as? [[String: Double]])
    XCTAssertGreaterThanOrEqual(samples.count, 8)
    let first = try XCTUnwrap(samples.first), last = try XCTUnwrap(samples.last)
    XCTAssertEqual(try XCTUnwrap(first["height"]), 48, accuracy: 1)
    XCTAssertEqual(try XCTUnwrap(last["height"]), 64, accuracy: 1)
    XCTAssertEqual(Double(node("accordion-motion-summary").frame.height), 64, accuracy: 1)
    let startOffset = try XCTUnwrap(first["contentTop"])
    XCTAssertEqual(try XCTUnwrap(last["contentTop"]), startOffset + 8, accuracy: 1)
    XCTAssertTrue(samples.contains { sample in
      guard let elapsed = sample["elapsed"], let height = sample["height"],
        let offset = sample["contentTop"] else { return false }
      return elapsed >= 100 && elapsed <= 350 && height > 49 && height < 56
        && offset > startOffset + 0.25 && offset < startOffset + 4
    }, "Both height and content margin must have intermediate native geometry")
    let startIcon = try XCTUnwrap(first["iconHeight"])
    XCTAssertTrue(samples.contains { ($0["iconHeight"] ?? 0) > startIcon + 2 },
      "The native icon bounds must reflect an intermediate rotation")
    XCTAssertEqual(try XCTUnwrap(last["iconHeight"]), startIcon, accuracy: 1)
    let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "accordion-motion-" + mode + "-native-bounds"
    attachment.lifetime = .keepAlways
    add(attachment)
    let end = XCTAttachment(screenshot: app.screenshot())
    end.name = "accordion-motion-" + mode + "-endpoint"
    end.lifetime = .keepAlways
    add(end)
  }
  func testDefaultNativeGeometry() throws { try run("default") }
  func testForwardedNativeGeometry() throws { try run("forwarded") }
}


/// Actual sibling mutations must update selectors without remounting keyed rows.
@MainActor
final class AccordionGroupingProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func receipt() -> [String: Any]? {
    guard node("accordion-grouping-receipt").exists,
      let data = node("accordion-grouping-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("accordion-grouping-capture").waitForExistence(timeout: 20))
  }
  private func run(_ mode: String) throws {
    node("accordion-grouping-mode-" + mode).tap()
    waitFor("The selected grouping case must start idle") {
      self.receipt()?["mode"] as? String == mode && self.receipt()?["phase"] as? String == "idle"
    }
    var tags: [String: Int] = [:]
    for stage in 0...4 {
      if stage > 0 {
        if stage == 1 {
          node("accordion-grouping-bump").tap()
          waitFor("The retained counter must update") { self.node("accordion-grouping-counter-b").label == "B 1" }
        }
        node("accordion-grouping-next").tap()
        waitFor("The requested sibling stage must commit") {
          self.receipt()?["stage"] as? Int == stage && self.receipt()?["phase"] as? String == "idle"
        }
      }
      node("accordion-grouping-capture").tap()
      waitFor("The native sibling measurements must complete") { self.receipt()?["phase"] as? String == "complete" }
      let report = try XCTUnwrap(receipt())
      XCTAssertEqual(report["schemaVersion"] as? Int, 1)
      XCTAssertEqual(report["development"] as? Bool, false)
      XCTAssertEqual(try XCTUnwrap(report["fontScale"] as? Double), 1, accuracy: 0.01)
      let runtime = try XCTUnwrap(report["runtime"] as? [String: Any])
      XCTAssertEqual(runtime["parentSelectors"] as? Bool, true)
      XCTAssertEqual(runtime["active"] as? Bool, true)
      XCTAssertEqual(runtime["degraded"] as? Bool, false)
      XCTAssertEqual(runtime["errors"] as? String, "0")
      XCTAssertGreaterThan(try XCTUnwrap(UInt64(try XCTUnwrap(runtime["attempts"] as? String))), 0)
      XCTAssertGreaterThan(try XCTUnwrap(UInt64(try XCTUnwrap(runtime["changedCandidates"] as? String))), 0)
      let rows = try XCTUnwrap(report["rows"] as? [[String: Any]])
      XCTAssertEqual(rows.count, 3)
      let ordered = stage == 0 || stage == 4 ? ["a", "b", "c"] : ["c", "a", "b"]
      var positions: [String: Double] = [:]
      for row in rows {
        let id = try XCTUnwrap(row["id"] as? String)
        let tag = try XCTUnwrap(row["tag"] as? Int)
        XCTAssertEqual(row["nativeType"] as? String, "RN:AltrooMUIStructuralView", "The actual native selector host must be installed")
        XCTAssertEqual(row["ornamentNativeType"] as? String, "RN:AltrooMUIStructuralView", "The separator must use the actual parent-projected host")
        let height = try XCTUnwrap(row["height"] as? Double)
        let expected: Double = stage == 2 ? 48 : id == ordered.first ? 80 : id == ordered.last ? 100 : 48
        XCTAssertEqual(height, expected, accuracy: 1, "Wrong structural style for " + id + " at stage " + String(stage))
        XCTAssertEqual(Double(node("accordion-grouping-root-" + id).frame.height), height, accuracy: 1)
        XCTAssertEqual(row["count"] as? Int, id == "b" && stage > 0 ? 1 : 0)
        if stage == 0 { tags[id] = tag } else { XCTAssertEqual(tag, tags[id], "A keyed native root must be retained") }
        positions[id] = try XCTUnwrap(row["y"] as? Double)
      }
      XCTAssertLessThan(try XCTUnwrap(positions[ordered[0]]), try XCTUnwrap(positions[ordered[1]]))
      XCTAssertLessThan(try XCTUnwrap(positions[ordered[1]]), try XCTUnwrap(positions[ordered[2]]))
      if stage > 0 { XCTAssertEqual(node("accordion-grouping-counter-b").label, "B 1") }
      let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = "accordion-grouping-" + mode + "-stage-" + String(stage)
      attachment.lifetime = .keepAlways
      add(attachment)
      if stage == 2 || stage == 4 {
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "accordion-grouping-" + mode + "-stage-" + String(stage)
        screenshot.lifetime = .keepAlways
        add(screenshot)
      }
    }
  }
  func testDefaultNativeGrouping() throws { try run("default") }
  func testForwardedNativeGrouping() throws { try run("forwarded") }
}


/// Stock RN is an independent control for the same VoiceOver gesture driver.
@MainActor
final class PressableVoiceOverProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func receipt() -> [String: Any]? {
    guard let data = node("pressable-vo-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []; app.launch()
    XCTAssertTrue(node("pressable-vo-receipt").waitForExistence(timeout: 20))
  }
  private func run(_ mode: String, expectedOther: Int = 0) throws {
    guard #available(iOS 27.0, *) else { throw XCTSkip("VoiceOver automation requires iOS27") }
    let service = XCUIDevice.shared.voiceOverService, original = service.isEnabled
    addTeardownBlock { @MainActor in
      if !original { try service.disable() }
      XCTAssertEqual(service.isEnabled, original)
    }
    XCTAssertEqual(receipt()?["development"] as? Bool, false)
    XCTAssertEqual(try XCTUnwrap(receipt()?["fontScale"] as? Double), 1, accuracy: 0.01)
    try service.enable()
    let label = mode == "stock" ? "Stock presses 0" : "Native presses 0"
    var speech: [String] = [], found = false
    if let current = try? service.currentSpeech().utterance { speech.append(current); found = current.contains(label) }
    for _ in 0..<10 {
      if found { break }
      let utterance = try service.moveForward().utterance
      speech.append(utterance); found = utterance.contains(label)
    }
    let attachment = XCTAttachment(string: speech.joined(separator: "\n"))
    attachment.name = "pressable-vo-" + mode; attachment.lifetime = .keepAlways; add(attachment)
    XCTAssertTrue(found, "VoiceOver must focus the independent target")
    node("pressable-vo-" + mode).doubleTap()
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      self.receipt()?[mode] as? Int == 1
    }, object: nil)
    let outcome = XCTWaiter.wait(for: [expectation], timeout: 8)
    let report: [String: Any] = ["mode": mode, "gesture": "target-double-tap",
      "status": outcome == .completed ? "received" : "unverified", "receipt": receipt() ?? [:]]
    let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
    let result = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    result.name = "pressable-vo-result-" + mode; result.lifetime = .keepAlways; add(result)
    if mode == "stock" && outcome != .completed {
      throw XCTSkip("The independent stock control did not qualify this XCTest input path")
    }
    XCTAssertEqual(outcome, .completed, "The qualified input path must activate the owned control exactly once")
    XCTAssertEqual(receipt()?[mode == "stock" ? "native" : "stock"] as? Int, expectedOther)
  }
  @objc func testQualifiedStockAndOwnedActivation() throws {
    try run("stock")
    try run("native", expectedOther: 1)
  }
}
