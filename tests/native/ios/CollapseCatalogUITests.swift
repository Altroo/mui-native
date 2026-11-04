/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/** Actual native visibility, retained content and bounds; frame pacing is a separate gate. */
final class CollapseCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Transitions")
    for _ in 0..<10 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("collapse-vertical-toggle").waitForExistence(timeout: 10))
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 10), .completed, message)
  }
  private func tap(_ id: String) {
    let control = node(id)
    for _ in 0..<4 {
      if control.exists && control.isHittable { break }
      let scroll = node("collapse-scroll")
      if control.exists && control.frame.midY < scroll.frame.minY { scroll.swipeDown() }
      else { scroll.swipeUp() }
    }
    XCTAssertTrue(control.exists && control.isHittable, "Native target must be hittable: \(id)")
    control.tap()
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
  }
  func testVerticalRetainedContentAndInterruption() {
    XCTAssertFalse(node("collapse-add-note").exists, "Collapsed descendants must leave accessibility traversal")
    capture("collapse-ios-closed")
    tap("collapse-vertical-toggle")
    waitFor("Enter must reach its completion receipt") { self.node("collapse-phase").label == "Expanded" }
    let original = node("collapse-vertical-root").frame.height
    XCTAssertGreaterThan(original, 0)
    tap("collapse-add-note")
    waitFor("Retained content must grow naturally") {
      self.node("collapse-note-count").label == "Delivery notes: 1" &&
        self.node("collapse-vertical-root").frame.height > original
    }
    capture("collapse-ios-expanded")
    tap("collapse-vertical-toggle")
    waitFor("Exit must hide content and deliver its receipt") {
      self.node("collapse-phase").label == "Collapsed" && !self.node("collapse-add-note").exists
    }
    tap("collapse-vertical-toggle")
    waitFor("Reopening must retain the edited subtree") {
      self.node("collapse-phase").label == "Expanded" && self.node("collapse-note-count").label == "Delivery notes: 1"
    }
    tap("collapse-slow")
    waitFor("Slow preview must receive its native switch touch") {
      let value = self.node("collapse-slow").value
      return (value as? NSNumber)?.boolValue == true || value as? String == "1"
    }
    let before = node("collapse-vertical-root").frame.height
    tap("collapse-vertical-toggle")
    waitFor("Exit must be active before reversing") {
      let height = self.node("collapse-vertical-root").frame.height
      return self.node("collapse-phase").label == "Collapsing" && height > 0 && height < before
    }
    capture("collapse-ios-exiting")
    tap("collapse-vertical-toggle")
    waitFor("Interrupted exit must return to the expanded endpoint") { self.node("collapse-phase").label == "Expanded" }
    XCTAssertTrue(node("collapse-receipts").label.hasSuffix("Exited 1"), "Retired exit cannot deliver a completion")
    capture("collapse-ios-reversed")
  }
  func testHorizontalBoundsAndReducedMotion() {
    tap("collapse-horizontal-toggle")
    waitFor("Horizontal content must reach its intrinsic native width") {
      self.node("collapse-horizontal-root").exists &&
        abs(self.node("collapse-horizontal-root").frame.width - 184) <= 2 &&
        self.node("collapse-horizontal-phase").label == "Horizontal: Expanded"
    }
    XCTAssertGreaterThanOrEqual(node("collapse-horizontal-root").frame.height, 64)
    capture("collapse-ios-horizontal")
    tap("collapse-horizontal-toggle")
    waitFor("Horizontal exit must hide descendants and deliver its receipt") {
      !self.node("collapse-horizontal-wrapper").exists &&
        self.node("collapse-horizontal-phase").label == "Horizontal: Collapsed"
    }
    tap("collapse-reduced")
    waitFor("Reduced motion must receive the actual native switch touch") {
      let value = self.node("collapse-reduced").value
      return (value as? NSNumber)?.boolValue == true || value as? String == "1"
    }
    tap("collapse-vertical-toggle")
    waitFor("Reduced motion must retain the enter callback") { self.node("collapse-phase").label == "Expanded" }
    tap("collapse-vertical-toggle")
    waitFor("Reduced motion must retain the hidden exit endpoint") {
      self.node("collapse-phase").label == "Collapsed" && !self.node("collapse-add-note").exists
    }
    capture("collapse-ios-reduced")
  }
}
