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
