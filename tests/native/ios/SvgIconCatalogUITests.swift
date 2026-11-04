/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Installed SVG geometry, native touch events, exported image refs and visible font samples.
final class SvgIconCatalogUITests: XCTestCase {
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
    let tab = node("catalog-tab-Icons")
    for _ in 0..<12 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("svg-paint-probe").waitForExistence(timeout: 10))
  }
  private func reveal(_ id: String) -> XCUIElement {
    let control = node(id)
    for _ in 0..<6 {
      if control.exists && control.isHittable { break }
      if control.exists && control.frame.midY < node("svg-icon-scene").frame.minY {
        node("svg-icon-scene").swipeDown()
      } else {
        node("svg-icon-scene").swipeUp()
      }
    }
    XCTAssertTrue(control.exists && control.isHittable, "Native target must be visible: \(id)")
    return control
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  func testSizesPaletteNativeClickAndSVGRef() {
    for (size, expected) in [("small", 20.0), ("medium", 24.0), ("large", 35.0)] {
      let icon = reveal("svg-size-" + size)
      XCTAssertEqual(icon.frame.width, expected, accuracy: 0.6)
      XCTAssertEqual(icon.frame.height, expected, accuracy: 0.6)
    }
    let paint = reveal("svg-paint-probe")
    XCTAssertEqual(paint.frame.width, 48, accuracy: 0.6)
    XCTAssertEqual(paint.frame.height, 48, accuracy: 0.6)
    XCTAssertEqual(paint.label, "Live palette sample")
    capture("svg-icon-ios-initial")
    paint.tap()
    waitFor("Original onClick must dispatch once on native touch") {
      self.node("svg-press-receipt").label == "SVG taps: 1"
    }
    reveal("svg-use-error").tap()
    waitFor("Palette must update after native touch") {
      self.node("svg-palette-value").label == "error #d32f2f"
    }
    capture("svg-icon-ios-error")
    reveal("svg-verify").tap()
    waitFor("Actual SVG ref must measure and export PNG") {
      self.node("svg-ref-receipt").label.hasPrefix("Measured 48.0 × 48.0 · PNG ")
    }
    let small = reveal("svg-text-small")
    let large = reveal("svg-text-large")
    XCTAssertEqual(small.frame.width, 120, accuracy: 0.6)
    XCTAssertEqual(large.frame.width, 120, accuracy: 0.6)
    XCTAssertEqual(small.frame.height, 50, accuracy: 0.6)
    XCTAssertEqual(large.frame.height, 50, accuracy: 0.6)
    capture("svg-icon-ios-fonts")
  }
}
