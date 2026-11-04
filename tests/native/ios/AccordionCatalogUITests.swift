/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Native touch, body-local edit retention and opt-in unmounting; physical matrices remain separate.
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
  override func setUpWithError() throws {
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
  private func tap(_ id: String) {
    let control = node(id)
    for _ in 0..<5 {
      if control.exists && control.isHittable { break }
      let scroll = node("accordion-scroll")
      if control.exists && control.frame.midY < scroll.frame.minY {
        scroll.swipeDown()
      } else {
        scroll.swipeUp()
      }
    }
    XCTAssertTrue(control.exists && control.isHittable, "Native target must be hittable: \(id)")
    control.tap()
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  func testControlledExpansionAndBodyLocalEditorRetention() {
    capture("accordion-ios-initial")
    // TextField forwards this identifier to its editable host.
    let editor = node("accordion-note")
    XCTAssertTrue(editor.exists && editor.isHittable)
    editor.tap()
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
