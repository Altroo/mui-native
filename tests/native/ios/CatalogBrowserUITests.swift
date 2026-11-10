/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Exercises the running development catalog without replacing its native app.
@MainActor
final class CatalogBrowserUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func reveal(_ id: String, in strip: String, horizontal: Bool = false) -> XCUIElement {
    let target = node(id)
    for _ in 0..<20 {
      if target.exists && target.isHittable { return target }
      if horizontal {
        node(strip).swipeLeft()
      } else if target.exists && target.frame.midY < node(strip).frame.minY {
        node(strip).swipeDown()
      } else {
        node(strip).swipeUp()
      }
    }
    XCTFail("Catalog destination must be reachable: " + id)
    return target
  }
  private func openIndex() {
    app.activate()
    XCTAssertTrue(node("catalog-home").waitForExistence(timeout: 20))
    node("catalog-home").tap()
    XCTAssertTrue(node("catalog-explore").waitForExistence(timeout: 10))
    let search = node("catalog-search")
    if let value = search.value as? String, !value.isEmpty && value != "Search components" {
      reveal("catalog-search", in: "catalog-explore").tap()
      search.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: value.count))
      node("catalog-home").tap()
    }
  }
  func testSearchPreviewAndAppearance() {
    continueAfterFailure = false
    openIndex()
    let appearance = node("catalog-appearance")
    XCTAssertTrue(["0", "1"].contains(appearance.value as? String ?? ""))
    if appearance.value as? String == "1" { appearance.tap() }
    XCTAssertEqual(appearance.value as? String, "0")
    let reset = reveal("catalog-preview-reset", in: "catalog-explore")
    if reset.isEnabled { reset.tap() }
    XCTAssertTrue(app.staticTexts["Real components. Tap to interact."].exists)
    node("catalog-preview-try").tap()
    XCTAssertTrue(app.staticTexts["Pressed 1 time."].waitForExistence(timeout: 5))
    capture("catalog-index-light")
    let search = reveal("catalog-search", in: "catalog-explore")
    search.tap()
    search.typeText("DatePicker")
    XCTAssertTrue(node("catalog-open-Dates").waitForExistence(timeout: 5))
    XCTAssertFalse(node("catalog-open-Form").exists)
    capture("catalog-search-results")
    node("catalog-open-Dates").tap()
    XCTAssertTrue(app.staticTexts["Delivery date"].waitForExistence(timeout: 5))
    XCTAssertFalse(node("catalog-explore").exists)
    node("catalog-home").tap()
    let restored = reveal("catalog-search", in: "catalog-explore")
    XCTAssertEqual(restored.value as? String, "DatePicker")
    restored.tap()
    restored.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 10))
    node("catalog-home").tap()  // Dismiss the keyboard without discarding the index query.
    XCTAssertTrue(node("catalog-open-Form").waitForExistence(timeout: 5))
    appearance.tap()
    XCTAssertEqual(appearance.value as? String, "1")
    capture("catalog-index-dark")
    appearance.tap()
    XCTAssertEqual(appearance.value as? String, "0")
    reveal("catalog-tab-Wrappers", in: "catalog-tabs", horizontal: true).tap()
    XCTAssertTrue(node("form-group-contract-row").waitForExistence(timeout: 5))
    capture("catalog-layout-inspector")
    node("catalog-home").tap()
  }
  /// Run with the simulator's preferred content size enlarged, then restore it externally.
  func testIndexAtPreferredTextSize() {
    continueAfterFailure = false
    openIndex()
    let home = node("catalog-home")
    XCTAssertGreaterThan(home.frame.height, 0)
    XCTAssertGreaterThan(node("catalog-explore").frame.height, 0)
    XCTAssertGreaterThanOrEqual(home.frame.minX, app.frame.minX)
    XCTAssertLessThanOrEqual(home.frame.maxX, app.frame.maxX)
    capture("catalog-index-preferred-text-size")
    let search = reveal("catalog-search", in: "catalog-explore")
    search.tap()
    search.typeText("ListItemAvatar")
    let result = reveal("catalog-open-Wrappers", in: "catalog-explore")
    XCTAssertGreaterThanOrEqual(result.frame.minX, app.frame.minX)
    XCTAssertLessThanOrEqual(result.frame.maxX, app.frame.maxX)
    result.tap()
    XCTAssertTrue(node("root-layout-navigation").waitForExistence(timeout: 5))
    node("catalog-home").tap()
    let restored = reveal("catalog-search", in: "catalog-explore")
    restored.tap()
    restored.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 14))
    node("catalog-home").tap()
  }
}
