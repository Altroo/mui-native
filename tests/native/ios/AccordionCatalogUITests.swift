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
      "nativeReadyAndObservationSeconds": String(ProcessInfo.processInfo.systemUptime - nativeReadyStart),
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
    if self.receipt()?["scenario"] as? String == "root-reorder" {
      node("accordion-motion-prime").tap()
      waitFor("The body-local counter must update before sampling") { self.node("accordion-motion-counter").label == "Retained 1" }
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
    if report["scenario"] as? String == "root-reorder" {
      XCTAssertEqual(report["peerSelectors"] as? Bool, true)
      XCTAssertEqual(report["nativeType"] as? String, "RN:AltrooMUIStructuralView")
      let runtime = try XCTUnwrap(report["runtime"] as? [String: Any])
      XCTAssertEqual(runtime["active"] as? Bool, true)
      XCTAssertEqual(runtime["degraded"] as? Bool, false)
      XCTAssertEqual(runtime["errors"] as? String, "0")
      let samples = try XCTUnwrap(report["samples"] as? [[String: Double]])
      XCTAssertGreaterThanOrEqual(samples.count, 12)
      let first = try XCTUnwrap(samples.first), last = try XCTUnwrap(samples.last)
      XCTAssertEqual(try XCTUnwrap(first["top"]), 16, accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(first["bottom"]), 0, accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(last["top"]), 0, accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(last["bottom"]), 16, accuracy: 1)
      for sample in samples {
        XCTAssertEqual(sample["rootTag"], first["rootTag"])
        XCTAssertEqual(sample["boundaryTag"], first["boundaryTag"])
        XCTAssertEqual(sample["counter"], 1)
        XCTAssertEqual(try XCTUnwrap(sample["height"]), try XCTUnwrap(first["height"]), accuracy: 1)
      }
      func qualified(_ stage: Double) -> [[String: Double]] {
        samples.filter { $0["stage"] == stage && $0["boundaryBefore"] == (stage == 0 || stage == 2 ? 1 : 0) }
      }
      let forwardEnd = try XCTUnwrap(qualified(1).last)
      XCTAssertEqual(try XCTUnwrap(forwardEnd["top"]), 0, accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(forwardEnd["bottom"]), 16, accuracy: 1)
      for stage in [1.0, 2.0, 3.0] {
        XCTAssertTrue(qualified(stage).contains { sample in
          (sample["top"] ?? -1) > 1 && (sample["top"] ?? 17) < 15
            && (sample["bottom"] ?? -1) > 1 && (sample["bottom"] ?? 17) < 15
        }, "Each stage requires intermediate margins after its native reorder commits")
      }
      let reversing = qualified(3)
      XCTAssertLessThan(try XCTUnwrap(reversing.first?["top"]), 14, "Reversal must begin before the old endpoint")
      let intermediate = reversing.filter { ($0["top"] ?? -1) > 1 && ($0["top"] ?? 17) < 15 }
      XCTAssertGreaterThanOrEqual(intermediate.count, 2)
      XCTAssertTrue(intermediate.enumerated().contains { item in
        let (index, earlier) = item
        return intermediate.dropFirst(index + 1).contains { later in
          (later["top"] ?? 17) < (earlier["top"] ?? -1) - 0.5
            && (later["bottom"] ?? -1) > (earlier["bottom"] ?? 17) + 0.5
        }
      }, "A carried intermediate sample followed by an endpoint snap cannot qualify as reversal")
      let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = "accordion-root-margin-" + mode + "-native-bounds"
      attachment.lifetime = .keepAlways
      add(attachment)
      return
    }
    let samples = try XCTUnwrap(report["samples"] as? [[String: Double]])
    XCTAssertGreaterThanOrEqual(samples.count, 8)
    let first = try XCTUnwrap(samples.first), last = try XCTUnwrap(samples.last)
    XCTAssertEqual(try XCTUnwrap(first["height"]), 48, accuracy: 1)
    XCTAssertEqual(try XCTUnwrap(last["height"]), 64, accuracy: 1)
    XCTAssertEqual(Double(node("accordion-motion-summary").frame.height), 64, accuracy: 1)
    for key in ["rootMarginTop", "rootMarginBottom"] {
      XCTAssertEqual(try XCTUnwrap(first[key]), 0, accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(last[key]), 16, accuracy: 1)
      XCTAssertTrue(samples.contains { sample in
        guard let elapsed = sample["elapsed"], let margin = sample[key] else { return false }
        return elapsed >= 100 && elapsed <= 350 && margin > 0.5 && margin < 8
      }, "The root margin must contain intermediate native geometry: " + key)
    }
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
    var glyphTags: [String: Int] = [:]
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
      XCTAssertEqual(runtime["peerSelectors"] as? Bool, true, "The actual v2 peer-capable binary is required")
      XCTAssertEqual(runtime["active"] as? Bool, true)
      XCTAssertEqual(runtime["degraded"] as? Bool, false)
      XCTAssertEqual(runtime["errors"] as? String, "0")
      XCTAssertGreaterThan(try XCTUnwrap(UInt64(try XCTUnwrap(runtime["attempts"] as? String))), 0)
      XCTAssertGreaterThan(try XCTUnwrap(UInt64(try XCTUnwrap(runtime["changedCandidates"] as? String))), 0)
      let rows = try XCTUnwrap(report["rows"] as? [[String: Any]])
      XCTAssertEqual(rows.count, 3)
      let scenario = try XCTUnwrap(report["scenario"] as? String)
      XCTAssertTrue(["position", "adjacency"].contains(scenario))
      let peer = report["boundaryPeer"] as? String ?? "view"
      XCTAssertTrue(["view", "circular", "linear"].contains(peer))
      if scenario == "adjacency" && stage == 3 && peer != "view" {
        let boundary = try XCTUnwrap(report["boundary"] as? [String: Any])
        XCTAssertEqual(boundary["kind"] as? String, peer)
        XCTAssertEqual(boundary["nativeType"] as? String, "RN:AltrooMUIStructuralView")
        XCTAssertGreaterThan(try XCTUnwrap(boundary["tag"] as? Int), 0)
        XCTAssertTrue(node("accordion-grouping-boundary").exists)
      }
      let ordered = scenario == "adjacency" || stage == 0 || stage == 4 ? ["a", "b", "c"] : ["c", "a", "b"]
      var positions: [String: Double] = [:]
      for row in rows {
        let id = try XCTUnwrap(row["id"] as? String)
        let tag = try XCTUnwrap(row["tag"] as? Int)
        XCTAssertEqual(row["nativeType"] as? String, "RN:AltrooMUIStructuralView", "The actual native selector host must be installed")
        XCTAssertEqual(row["ornamentNativeType"] as? String, "RN:AltrooMUIStructuralView", "The separator must use the actual parent-projected host")
        let height = try XCTUnwrap(row["height"] as? Double)
        if scenario == "position" {
          let expected: Double = stage == 2 ? 48 : id == ordered.first ? 80 : id == ordered.last ? 100 : 48
          XCTAssertEqual(height, expected, accuracy: 1, "Wrong structural style for " + id + " at stage " + String(stage))
        } else {
          XCTAssertGreaterThan(height, 80, "Expanded native body must have layout")
        }
        XCTAssertEqual(Double(node("accordion-grouping-root-" + id).frame.height), height, accuracy: 1)
        XCTAssertEqual(row["count"] as? Int, id == "b" && stage > 0 ? 1 : 0)
        if report["textPaint"] as? Bool == true {
          let glyph = try XCTUnwrap(row["glyphTag"] as? Int)
          XCTAssertGreaterThan(glyph, 0)
          XCTAssertTrue(node("accordion-text-glyph-" + id).exists)
          XCTAssertTrue(node("accordion-text-control-" + id).exists)
          XCTAssertTrue(node("accordion-text-explicit-" + id).exists)
          // Disjoint native-verified windows prevent the colored Counter from
          // substituting for either MMMM glyph group in the display scan.
          let rootFrame = node("accordion-grouping-root-" + id).frame
          let glyphFrame = node("accordion-text-glyph-" + id).frame
          let controlFrame = node("accordion-text-control-" + id).frame
          let explicitFrame = node("accordion-text-explicit-" + id).frame
          XCTAssertEqual(glyphFrame.minX - rootFrame.minX, 48, accuracy: 1)
          XCTAssertEqual(controlFrame.minX - rootFrame.minX, 112, accuracy: 1)
          XCTAssertEqual(explicitFrame.minX - rootFrame.minX, 176, accuracy: 1)
          XCTAssertEqual(glyphFrame.width, 64, accuracy: 1)
          XCTAssertEqual(controlFrame.width, 64, accuracy: 1)
          XCTAssertEqual(explicitFrame.width, 64, accuracy: 1)
          XCTAssertEqual(glyphFrame.height, 24, accuracy: 1)
          XCTAssertEqual(controlFrame.height, 24, accuracy: 1)
          XCTAssertEqual(explicitFrame.height, 24, accuracy: 1)
          if stage == 0 { glyphTags[id] = glyph } else {
            XCTAssertEqual(glyph, glyphTags[id], "Inherited text must retain its native host")
          }
        }
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


/// An empty registered marker must not become a View/attachment or replace Text.
@MainActor
final class TextColorMarkerProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func receipt() -> [String: Any]? {
    guard let data = node("color-marker-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  func testEmptyMarkerPreservesNativeText() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("color-marker-receipt").waitForExistence(timeout: 20))
    var tag: Int?
    for epoch in 0...3 {
      if epoch > 0 { node("color-marker-update").tap() }
      let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
        self.receipt()?["epoch"] as? Int == epoch && self.receipt()?["phase"] as? String == "ready"
      }, object: nil)
      XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 12), .completed)
      let report = try XCTUnwrap(receipt())
      XCTAssertEqual(report["schemaVersion"] as? Int, 1)
      XCTAssertEqual(report["development"] as? Bool, false)
      XCTAssertEqual(try XCTUnwrap(report["fontScale"] as? Double), 1, accuracy: 0.01)
      XCTAssertEqual(report["plain"] as? [String], ["Marker preserves native text"])
      XCTAssertEqual(report["marked"] as? [String], report["plain"] as? [String])
      XCTAssertEqual(report["attaches"] as? Int, 1)
      XCTAssertEqual(report["cleanups"] as? Int, 0)
      XCTAssertEqual(report["nativeID"] as? String, "kept-public-native-id")
      let parser = try XCTUnwrap(report["parser"] as? [String: Any])
      XCTAssertGreaterThanOrEqual(try XCTUnwrap(parser["checks"] as? Int), 30)
      XCTAssertEqual(try XCTUnwrap(parser["metricChecks"] as? Int), 46)
      XCTAssertGreaterThanOrEqual(try XCTUnwrap(parser["fontChecks"] as? Int), 30)
      XCTAssertEqual(parser["ordinaryConversionOnly"] as? Bool, true)
      XCTAssertEqual(parser["mountedOrDrawnProved"] as? Bool, false)

      let current = try XCTUnwrap(report["nativeTag"] as? Int)
      XCTAssertGreaterThan(current, 0)
      if epoch == 0 { tag = current } else { XCTAssertEqual(current, tag) }
      XCTAssertEqual(node("color-marker-marked").label, "Marker preserves native text")
      XCTAssertEqual(node("color-marker-marked").frame.width, node("color-marker-plain").frame.width, accuracy: 1)
      XCTAssertEqual(node("color-marker-marked").frame.height, node("color-marker-plain").frame.height, accuracy: 1)
      let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = "empty-color-marker-" + String(epoch)
      attachment.lifetime = .keepAlways
      add(attachment)
    }
  }
}


/// Retained-row endpoint proof. Display recording separately checks transitional paint.
@MainActor
final class AccordionTextMetricsProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func receipt() -> [String: Any]? {
    let value = node("accordion-metric-receipt")
    guard value.exists, let data = value.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("accordion-metric-capture").waitForExistence(timeout: 20))
  }
  private func run(_ mode: String) throws {
    node("accordion-metric-mode-" + mode).tap()
    waitFor("Selected metric case must start idle") {
      self.receipt()?["mode"] as? String == mode && self.receipt()?["phase"] as? String == "idle"
    }
    var tags: [String: Int] = [:]
    var lineRevisions: [String: Int] = [:]
    let variation = receipt()?["fontScenario"] as? String == "variation"
    func orderAt(_ step: Int) -> [String] {
      if variation && [1, 2, 8].contains(step) { return ["b", "a", "c"] }
      if step == 3 || step == 9 || (!variation && [1, 2].contains(step)) { return ["c", "a", "b"] }
      return ["a", "b", "c"]
    }
    func inheritedControl(_ step: Int, _ id: String) -> String {
      let hasBoundaries = step == 2 || (variation && step == 6)
      return !hasBoundaries && id == orderAt(step).first ? "large" : "small"
    }
    func explicitControl(_ step: Int, _ id: String) -> String {
      if variation && step == 5 { return "large" }
      if variation && step == 6 { return inheritedControl(step, id) }
      return "small"
    }
    for stage in 0...(variation ? 9 : 4) {
      if stage > 0 {
        if stage == 1 {
          node("accordion-metric-bump").tap()
          waitFor("The local counter must change before reordering") { self.node("accordion-metric-counter-b").label == "B 1" }
        }
        node("accordion-metric-next").tap()
        waitFor("The requested metric stage must commit") {
          self.receipt()?["stage"] as? Int == stage && self.receipt()?["phase"] as? String == "idle"
        }
      }
      node("accordion-metric-capture").tap()
      waitFor("Native line/frame capture must finish") { self.receipt()?["phase"] as? String == "complete" }
      let report = try XCTUnwrap(receipt())
      XCTAssertEqual(report["schemaVersion"] as? Int, 1)
      XCTAssertEqual(report["development"] as? Bool, false)
      XCTAssertEqual(report["mode"] as? String, mode)
      XCTAssertEqual(report["stage"] as? Int, stage)
      let naturalHeight = try XCTUnwrap(report["naturalHeight"] as? Bool)
      let fontAttributes = try XCTUnwrap(report["fontAttributes"] as? Bool)
      let fontScenario = report["fontScenario"] as? String
      let fontScenarios = ["composite", "family", "variant", "variation"]
      XCTAssertTrue(fontScenario.map { fontScenarios.contains($0) } ?? true)
      XCTAssertEqual(fontAttributes, fontScenario != nil)
      XCTAssertFalse(naturalHeight && fontAttributes, "Keep natural-height and font-selection probes independent")
      XCTAssertEqual(fontScenario == "variation", variation)
      let fontScale = try XCTUnwrap(report["fontScale"] as? Double)
      let enlarged = variation && fontScale > 1.01
      XCTAssertEqual(fontScale, enlarged ? 3.571 : 1, accuracy: 0.01)
      let rows = try XCTUnwrap(report["rows"] as? [[String: Any]])
      XCTAssertEqual(Set(rows.compactMap { $0["id"] as? String }), Set(["a", "b", "c"]))
      XCTAssertEqual(rows.count, 3)
      let order = orderAt(stage)
      let kinds = ["inherited", "small", "large", "explicit"] + (variation ? ["default-axis"] : [])
      var positions: [String: Double] = [:]
      for row in rows {
        let id = try XCTUnwrap(row["id"] as? String)
        let first = inheritedControl(stage, id) == "large"
        let rootTag = try XCTUnwrap(row["tag"] as? Int)
        XCTAssertGreaterThan(rootTag, 0)
        if stage == 0 { tags[id] = rootTag } else { XCTAssertEqual(rootTag, tags[id]) }
        XCTAssertEqual(row["nativeType"] as? String, "RN:AltrooMUIStructuralView")
        XCTAssertEqual(row["renders"] as? Int, variation ? 1 + max(0, min(stage, 7) - 4) : 1,
          "Only explicit override changes may rerender retained rows")
        XCTAssertEqual(row["count"] as? Int, id == "b" && stage > 0 ? 1 : 0)
        let frame = try XCTUnwrap(row["frame"] as? [String: Double])
        XCTAssertEqual(try XCTUnwrap(frame["height"]), first ? 128 : 96, accuracy: 1)
        XCTAssertEqual(Double(node("accordion-metric-root-" + id).frame.height), try XCTUnwrap(frame["height"]), accuracy: 1)
        positions[id] = try XCTUnwrap(frame["y"])
        let texts = try XCTUnwrap(row["text"] as? [String: [String: Any]])
        let expected = try XCTUnwrap(texts[inheritedControl(stage, id)])
        let expectedLine = try XCTUnwrap(expected["line"] as? [String: Double])
        let inherited = try XCTUnwrap(texts["inherited"])
        let inheritedLine = try XCTUnwrap(inherited["line"] as? [String: Double])
        if fontAttributes {
          let smallLine = try XCTUnwrap(texts["small"]?["line"] as? [String: Double])
          let largeLine = try XCTUnwrap(texts["large"]?["line"] as? [String: Double])
          XCTAssertGreaterThan(abs(try XCTUnwrap(smallLine["width"]) - (try XCTUnwrap(largeLine["width"]))), 0.5,
            "The independent native font cases must be distinguishable")
          if variation {
            let unsetLine = try XCTUnwrap(texts["default-axis"]?["line"] as? [String: Double])
            for control in [smallLine, largeLine] {
              XCTAssertGreaterThan(abs(try XCTUnwrap(control["width"]) - (try XCTUnwrap(unsetLine["width"]))), 0.5,
                "Each native variation record must be distinguishable from default System text")
            }
          }
        }
        // Actual fixed-font native text supplies the reference, including OS font metrics.
        let fields = ["width", "height", "ascender", "descender", "capHeight", "xHeight"]
        for key in fields {
          XCTAssertEqual(try XCTUnwrap(inheritedLine[key]), try XCTUnwrap(expectedLine[key]), accuracy: 0.5,
            "Inherited glyph differs from its authored native control: " + id + "/" + key)
        }
        if fontAttributes && fontScenario != "composite" {
          let explicit = try XCTUnwrap(texts["explicit"]?["line"] as? [String: Double])
          let ordinary = try XCTUnwrap(texts[explicitControl(stage, id)]?["line"] as? [String: Double])
          for key in fields {
            XCTAssertEqual(try XCTUnwrap(explicit[key]), try XCTUnwrap(ordinary[key]), accuracy: 0.5,
              "An explicitly authored native font value must survive selector changes: " + id + "/" + key)
          }
        }
        for (column, kind) in kinds.enumerated() {
          let text = try XCTUnwrap(texts[kind])
          let tag = try XCTUnwrap(text["tag"] as? Int)
          XCTAssertGreaterThan(tag, 0)
          let key = id + ":" + kind
          XCTAssertEqual(text["lineTag"] as? Int, tag, "A line event must belong to this retained native Text")
          let revision = try XCTUnwrap(text["lineRevision"] as? Int)
          XCTAssertGreaterThan(revision, 0)
          if stage > 0 {
            let inheritedChanged = kind == "inherited" && inheritedControl(stage, id) != inheritedControl(stage - 1, id)
            let explicitChanged = kind == "explicit" && variation && explicitControl(stage, id) != explicitControl(stage - 1, id)
            if inheritedChanged || explicitChanged {
              XCTAssertGreaterThan(revision, try XCTUnwrap(lineRevisions[key]), "A changed font requires a fresh native line event")
            } else {
              XCTAssertGreaterThanOrEqual(revision, try XCTUnwrap(lineRevisions[key]))
            }
          }
          lineRevisions[key] = revision
          if stage == 0 { tags[key] = tag } else { XCTAssertEqual(tag, tags[key], "Text host must remain retained") }
          let nativeFrame = try XCTUnwrap(text["frame"] as? [String: Double])
          XCTAssertEqual(try XCTUnwrap(nativeFrame["width"]), 60, accuracy: 0.5)
          XCTAssertEqual(try XCTUnwrap(nativeFrame["x"]) - (try XCTUnwrap(frame["x"])), Double(16 + column * 64), accuracy: 1)
          XCTAssertGreaterThanOrEqual(try XCTUnwrap(nativeFrame["y"]), try XCTUnwrap(frame["y"]))
          let height = try XCTUnwrap(nativeFrame["height"])
          let summaryBottom = try XCTUnwrap(frame["y"]) + (enlarged ? max(48.5, height + 0.5) : 48.5)
          XCTAssertLessThanOrEqual(try XCTUnwrap(nativeFrame["y"]) + height, summaryBottom)
          if enlarged {
            let controlKind = kind == "inherited" ? inheritedControl(stage, id)
              : kind == "explicit" ? explicitControl(stage, id) : "small"
            let controlFrame = try XCTUnwrap(texts[controlKind]?["frame"] as? [String: Double])
            let controlHeight = try XCTUnwrap(controlFrame["height"])
            XCTAssertGreaterThan(controlHeight, 30, "The stock native line box must grow under accessibility scaling")
            XCTAssertEqual(height, controlHeight, accuracy: 1)
            continue
          }
          // A natural-height reference is independent core Text with no lineHeight.
          // Compare native event geometry, rather than approximating a font ratio.
          let naturalLine = try XCTUnwrap((texts["large"]?["line"]) as? [String: Double])
          let largeHeight = naturalHeight ? try XCTUnwrap(naturalLine["height"]) : 18
          XCTAssertGreaterThan(largeHeight, 0)
          XCTAssertLessThan(largeHeight, 24)
          let expectedHeight: Double = fontAttributes ? 15 : kind == "inherited" ? (first ? largeHeight : 12) : kind == "large" ? largeHeight : kind == "small" ? 12 : 13
          XCTAssertEqual(try XCTUnwrap(nativeFrame["height"]), expectedHeight, accuracy: 1)
        }
      }
      XCTAssertLessThan(try XCTUnwrap(positions[order[0]]), try XCTUnwrap(positions[order[1]]))
      XCTAssertLessThan(try XCTUnwrap(positions[order[1]]), try XCTUnwrap(positions[order[2]]))
      let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
      attachment.name = "accordion-text-metrics-" + mode + "-stage-" + String(stage)
      attachment.lifetime = .keepAlways
      add(attachment)
      if stage == 0 || stage == 2 || stage == 4 {
        let picture = XCTAttachment(screenshot: app.screenshot())
        picture.name = "accordion-text-metrics-" + mode + "-stage-" + String(stage)
        picture.lifetime = .keepAlways
        add(picture)
      }
    }
  }
  func testDefaultNativeTextMetrics() throws { try run("default") }
  func testForwardedNativeTextMetrics() throws { try run("forwarded") }
}

/// Ordinary Text/View reset and scaling controls, independent of selector paint.
@MainActor
final class NormalLineHeightProbeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement { app.descendants(matching: .any).matching(identifier: id).firstMatch }
  private func receipt() -> [String: Any]? {
    guard let data = node("normal-height-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func wait(_ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed)
  }
  func testNaturalResetAndRestoration() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("normal-height-receipt").waitForExistence(timeout: 20))
    var tags: [String: Int] = [:], revisions: [String: Int] = [:]
    for stage in 0...4 {
      if stage > 0 {
        node("normal-height-next").tap()
        wait { self.receipt()?["stage"] as? Int == stage && self.receipt()?["phase"] as? String == "idle" }
      }
      node("normal-height-capture").tap()
      wait { self.receipt()?["phase"] as? String == "complete" && self.receipt()?["stage"] as? Int == stage }
      let report = try XCTUnwrap(receipt())
      XCTAssertEqual(report["schemaVersion"] as? Int, 1)
      XCTAssertEqual(report["stage"] as? Int, stage)
      XCTAssertEqual(report["development"] as? Bool, false)
      XCTAssertGreaterThan(try XCTUnwrap(report["fontScale"] as? Double), 0)
      let rows = try XCTUnwrap(report["rows"] as? [[String: Any]])
      XCTAssertEqual(Set(rows.compactMap { $0["kind"] as? String }), Set(["mui", "native", "view", "capped", "unscaled"]))
      XCTAssertEqual(rows.count, 5)
      for row in rows {
        let kind = try XCTUnwrap(row["kind"] as? String)
        let source = try XCTUnwrap(row["source"] as? [String: Any]), control = try XCTUnwrap(row["control"] as? [String: Any])
        let sourceLine = try XCTUnwrap(source["line"] as? [String: Double]), controlLine = try XCTUnwrap(control["line"] as? [String: Double])
        for field in ["width", "height", "ascender", "descender", "capHeight", "xHeight"] {
          XCTAssertEqual(try XCTUnwrap(sourceLine[field]), try XCTUnwrap(controlLine[field]), accuracy: 0.5, kind + "/" + field)
        }
        let sourceFrame = try XCTUnwrap(source["frame"] as? [String: Double]), controlFrame = try XCTUnwrap(control["frame"] as? [String: Double])
        XCTAssertEqual(try XCTUnwrap(sourceFrame["height"]), try XCTUnwrap(controlFrame["height"]), accuracy: 0.5)
        for (role, value) in [("source", source), ("control", control)] {
          let key = kind + ":" + role, tag = try XCTUnwrap(value["tag"] as? Int), revision = try XCTUnwrap(value["revision"] as? Int)
          XCTAssertGreaterThan(tag, 0)
          XCTAssertEqual(value["lineTag"] as? Int, tag)
          XCTAssertEqual(value["attaches"] as? Int, 1)
          XCTAssertEqual(value["cleanups"] as? Int, 0)
          if stage == 0 { tags[key] = tag } else {
            XCTAssertEqual(tag, tags[key])
            XCTAssertGreaterThan(revision, try XCTUnwrap(revisions[key]), "Changed font/height requires a new native line event")
          }
          revisions[key] = revision
        }
      }
      let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
      attachment.name = "normal-height-stage-" + String(stage)
      attachment.lifetime = .keepAlways
      add(attachment)
    }
  }
}
