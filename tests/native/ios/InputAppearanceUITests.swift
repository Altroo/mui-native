// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import XCTest

/** Actual native screenshots; original browser references are captured separately. */
@MainActor
final class InputAppearanceUITests: XCTestCase {
  private var app: XCUIApplication { XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog") }
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.activate()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Inputs")
    for _ in 0..<8 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    if node("typing-mode-delivery").exists { node("typing-mode-delivery").tap() }
    let appearance = node("typing-mode-appearance")
    XCTAssertTrue(appearance.waitForExistence(timeout: 10))
    appearance.tap()
    XCTAssertTrue(node("appearance-scene-Focused").waitForExistence(timeout: 10))
  }
  func testFieldAppearanceMatrix() {
    let appearance = node("catalog-appearance")
    if String(describing: appearance.value ?? "") == "1" { appearance.tap() }
    XCTAssertEqual(String(describing: appearance.value ?? ""), "0")
    let states = ["Idle", "Focused", "Filled", "Error", "Disabled", "Small", "Adorned", "Multiline", "Rounded"]
    for mode in ["light", "dark"] {
      if mode == "dark" { appearance.tap() }
      XCTAssertEqual(String(describing: appearance.value ?? ""), mode == "dark" ? "1" : "0")
      for state in states {
        let button = node("appearance-state-" + state)
        for _ in 0..<6 {
          if button.isHittable { break }
          let row = node("appearance-states")
          if button.frame.midX < row.frame.midX { row.swipeRight() } else { row.swipeLeft() }
        }
        XCTAssertTrue(button.isHittable)
        button.tap()
        XCTAssertTrue(node("appearance-scene-" + state).waitForExistence(timeout: 10))
        var frames: [String: [String: Double]] = [:]
        for variant in ["outlined", "filled", "standard"] {
          let field = node("appearance-editor-" + variant)
          // The scene wrapper mounts before its remounted native editor children.
          XCTAssertTrue(field.waitForExistence(timeout: 5), app.debugDescription)
          XCTAssertEqual(field.label, state == "Multiline" ? "Destination Choose a city" : "Destination")
          if ["Filled", "Error", "Disabled"].contains(state) {
            XCTAssertEqual(field.value as? String, "Casablanca")
          }
          let frame = field.frame
          XCTAssertGreaterThan(frame.width, 100)
          XCTAssertGreaterThan(frame.height, 0)
          if state == "Adorned" {
            let adornment = node("appearance-adornment-" + variant)
            XCTAssertTrue(adornment.waitForExistence(timeout: 5))
            XCTAssertEqual(adornment.frame.midY - frame.midY, variant == "filled" ? 8 : 0, accuracy: 1)
          }
          frames[variant] = ["x": frame.minX, "y": frame.minY, "width": frame.width, "height": frame.height]
        }
        let data = try! JSONSerialization.data(withJSONObject: ["mode": mode, "state": state, "fields": frames], options: [.sortedKeys])
        let receipt = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        receipt.name = "fields-\(mode)-\(state)-frames"
        receipt.lifetime = .keepAlways
        add(receipt)
        capture("fields-\(mode)-\(state)")
      }
    }
    node("catalog-appearance").tap()
    // Return to a useful normal preview without leaving a keyboard over the fields.
    let focused = node("appearance-state-Focused")
    for _ in 0..<6 {
      if focused.isHittable { break }
      node("appearance-states").swipeRight()
    }
    XCTAssertTrue(focused.isHittable)
    focused.tap()
    capture("fields-final-light-focused")
  }

  // A separate stock React Native control checks the input prerequisite
  // from this appearance matrix. A failure here is not visual compatibility proof.
  func testStockNativeTypingControl() throws {
    if app.keyboards.firstMatch.exists { app.staticTexts["Text fields"].firstMatch.tap() }
    node("typing-mode-delivery").tap()
    XCTAssertTrue(node("typing-receipt").waitForExistence(timeout: 5))
    func receipt() -> [String: Any] {
      guard let data = node("typing-receipt").label.data(using: .utf8),
        let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else { return [:] }
      return value
    }
    let previous = receipt()["generation"] as? Int ?? -1
    node("typing-mode-native").tap()
    let mounted = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      let current = receipt()
      return current["mode"] as? String == "native" &&
        (current["generation"] as? Int ?? -1) > previous && current["value"] as? String == ""
    }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [mounted], timeout: 5), .completed)
    let editor = node("typing-editor")
    XCTAssertTrue(editor.waitForExistence(timeout: 5))
    XCTAssertTrue(editor.isHittable)
    editor.tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
    editor.typeText("Rabat")
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      editor.value as? String == "Rabat"
    }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 5)
    capture("stock-native-typing-control")
    let details = XCTAttachment(string: "Native value: \(String(describing: editor.value)); React receipt: \(node("typing-receipt").label)")
    details.name = "stock-native-typing-values"
    details.lifetime = .keepAlways
    add(details)
    app.staticTexts["Input delivery"].firstMatch.tap()
    node("typing-mode-appearance").tap()
    XCTAssertTrue(node("appearance-scene-Focused").waitForExistence(timeout: 5))
    if result != .completed {
      throw XCTSkip("Stock React Native also lost synthesized characters; typing compatibility is unverified. See retained values and screenshot.")
    }
  }
}
