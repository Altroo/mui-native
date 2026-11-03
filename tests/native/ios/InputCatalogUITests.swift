/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import XCTest

/** Touch/text smoke coverage for the controls; Android synthetic-key diagnosis is separate. */
final class InputCatalogUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 10)
    if result != .completed {
      let editor = node("typing-editor"), receipt = node("typing-receipt"), authored = node("typing-authored")
      let nativeValue = editor.exists ? String(describing: editor.value) : "<missing editor>"
      let receiptValue = receipt.exists ? receipt.label : "<missing receipt>"
      let authoredValue = authored.exists ? authored.label : "<missing authored value>"
      let details = "\(message)\nNative: \(nativeValue)\nReceipt: \(receiptValue)\nAuthored: \(authoredValue)"
      let text = XCTAttachment(string: details)
      text.name = "input-failure-values"
      text.lifetime = .keepAlways
      add(text)
      let screenshot = XCTAttachment(screenshot: app.screenshot())
      screenshot.name = "input-failure"
      screenshot.lifetime = .keepAlways
      add(screenshot)
    }
    XCTAssertEqual(result, .completed, message)
  }
  private func receipt() -> [String: Any] {
    let element = node("typing-receipt")
    guard element.exists, let data = element.label.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return object
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Inputs")
    for _ in 0..<8 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("typing-receipt").waitForExistence(timeout: 10))
  }
  func testControlledNativeInput() { exercise("native") }
  func testControlledTextField() { exercise("field") }
  func testControlledAutocomplete() { exercise("autocomplete") }
  func testUncontrolledAutocomplete() { exercise("uncontrolled") }
  private func exercise(_ mode: String) {
      let previous = receipt()["generation"] as? Int ?? -1
      let button = node("typing-mode-" + mode)
      XCTAssertTrue(button.isHittable)
      button.tap()
      waitFor("New editor scene must replace its predecessor") {
        let current = self.receipt()
        return current["mode"] as? String == mode && (current["generation"] as? Int ?? -1) > previous && current["value"] as? String == ""
      }
      let generation = receipt()["generation"] as? Int ?? -1
      let editor = node("typing-editor")
      waitFor("The cold editor must be hittable") { editor.isHittable }
      editor.tap()
      XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
      editor.typeText("New city")
      waitFor("Both native text and React receipt must preserve the complete input") {
        editor.value as? String == "New city" && self.receipt()["value"] as? String == "New city"
      }
      let attachment = XCTAttachment(screenshot: app.screenshot())
      attachment.name = "input-delivery-" + mode
      attachment.lifetime = .keepAlways
      add(attachment)
      if mode != "uncontrolled" {
        node("typing-replace").tap()
        waitFor("Authored replacement must reach the native editor without fabricating an input receipt") {
          editor.value as? String == "JS replacement" && self.receipt()["value"] as? String == "New city"
        }
        node("typing-replace").tap()
        waitFor("Authored clear must reach the native editor") {
          guard let value = editor.value as? String else { return false }
          return self.node("typing-authored").label == "{\"value\":\"\"}" && self.receipt()["value"] as? String == "New city" && (value.isEmpty || value == "Search or enter a city")
        }
      } else {
        XCTAssertFalse(node("typing-replace").isEnabled)
      }
      // End editing with a separate outside touch. Keyboard/scroll dismissal
      // must finish before testing the mode button's scene replacement.
      let heading = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Input delivery")).firstMatch
      XCTAssertTrue(heading.isHittable)
      heading.tap()
      waitFor("Outside touch must finish keyboard dismissal before changing scenes") { !self.app.keyboards.firstMatch.exists }
      XCTAssertTrue(button.isHittable)
      button.tap()
      waitFor("Remounting the same mode must discard its old draft") {
        let current = self.receipt()
        return current["mode"] as? String == mode && (current["generation"] as? Int ?? -1) > generation && current["value"] as? String == ""
      }
  }
}
