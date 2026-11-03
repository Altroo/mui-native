/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import XCTest

/** Real native touch/text/command checks; physical keyboards and screen readers are separate. */
final class AutocompleteCatalogUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Autocomplete")
    for _ in 0..<8 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("autocomplete-editor").waitForExistence(timeout: 10))
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 10), .completed, message)
  }
  private func tap(_ id: String) {
    let element = node(id)
    XCTAssertTrue(element.waitForExistence(timeout: 10), "Missing native control: \(id)")
    if id.hasPrefix("autocomplete-mode-") {
      for _ in 0..<8 {
        if element.isHittable { break }
        node("autocomplete-modes").swipeLeft()
      }
    }
    waitFor("Native control must be presented and hittable: \(id)") { element.isHittable }
    element.tap()
    if id.hasPrefix("autocomplete-mode-") {
      let mode = String(id.dropFirst("autocomplete-mode-".count))
      let scene = mode == "Dialog" ? "autocomplete-dialog-open" : "autocomplete-scene-" + mode
      XCTAssertTrue(node(scene).waitForExistence(timeout: 10), "New mode must replace the previous scene before another action")
    }
  }
  private func selection(_ expected: String) {
    waitFor("Selection must reach \(expected)") { self.node("autocomplete-selection").label == expected }
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
  }
  func testSearchTouchSelectionAndClear() {
    tap("autocomplete-editor")
    node("autocomplete-editor").typeText("Casa")
    XCTAssertTrue(node("autocomplete-option-2").waitForExistence(timeout: 10))
    XCTAssertFalse(node("autocomplete-option-1").exists)
    capture("autocomplete-filtered")
    tap("autocomplete-option-2")
    selection("selectOption: 2")
    XCTAssertEqual(node("autocomplete-editor").value as? String, "Casablanca")
    tap("autocomplete-clear")
    selection("clear: null")
  }
  func testVirtualHighlightRetainsNativeEditing() {
    tap("autocomplete-editor")
    XCTAssertTrue(node("autocomplete-option-1").waitForExistence(timeout: 10), "Tapping an empty editor opens suggestions")
    node("autocomplete-editor").typeKey(.downArrow, modifierFlags: [])
    waitFor("Keyboard must advance the virtual highlight") { self.node("autocomplete-highlight").label == "Casablanca (keyboard)" }
    node("autocomplete-editor").typeText("x")
    waitFor("Native editor must retain focus after highlighting") { (self.node("autocomplete-editor").value as? String) == "x" }
  }
  func testKeyboardEdgeSuggestionsRemainAboveTheEditor() {
    tap("autocomplete-mode-Keyboard edge")
    tap("autocomplete-editor")
    node("autocomplete-editor").typeText("Casa")
    let option = node("autocomplete-option-2")
    XCTAssertTrue(option.waitForExistence(timeout: 10))
    waitFor("Keyboard-edge suggestion must be hittable") { option.isHittable }
    XCTAssertLessThanOrEqual(option.frame.maxY, node("autocomplete-editor").frame.minY + 2,
      "The short popup must flip above the lower editor: option=\(option.frame), editor=\(node("autocomplete-editor").frame)")
    tap("autocomplete-option-2")
    selection("selectOption: 2")
    capture("autocomplete-keyboard-edge")
  }
  func testMultipleChipsAndGroupedSuggestions() {
    tap("autocomplete-mode-Multiple")
    tap("autocomplete-chip-Rabat-delete")
    selection("removeOption: 2")
    tap("autocomplete-toggle")
    XCTAssertTrue(node("autocomplete-option-1").waitForExistence(timeout: 10))
    XCTAssertFalse(node("autocomplete-option-2").exists)
    tap("autocomplete-option-3")
    selection("selectOption: 2, 3")
    XCTAssertTrue(node("autocomplete-chip-Marrakesh").waitForExistence(timeout: 10))
    waitFor("Selected options must leave the filtered list") { !self.node("autocomplete-option-3").exists }
    XCTAssertTrue(node("autocomplete-option-1").exists, "disableCloseOnSelect must keep suggestions open")
    capture("autocomplete-multiple")
    tap("autocomplete-toggle")
    tap("autocomplete-mode-Grouped")
    tap("autocomplete-toggle")
    XCTAssertTrue(node("autocomplete-option-6").waitForExistence(timeout: 10))
    capture("autocomplete-grouped")
  }
  func testFreeSoloSoftwareSubmission() {
    tap("autocomplete-mode-Free solo")
    waitFor("Free-solo editor must replace the previous mode") { self.node("autocomplete-editor").placeholderValue == "Search or enter a city" }
    tap("autocomplete-editor")
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10), "The actual software keyboard must be presented before typing")
    node("autocomplete-editor").typeText("New city")
    let done = app.keyboards.buttons["Done"]
    XCTAssertTrue(done.waitForExistence(timeout: 10), "Use the actual software submit control")
    done.tap()
    selection("createOption: New city")
  }
  func testReadOnlyAndDisabledIndicators() {
    tap("autocomplete-mode-States")
    tap("autocomplete-readonly")
    waitFor("Read-only popup indicator must be disabled") { !self.node("autocomplete-toggle").isEnabled }
    XCTAssertEqual(node("autocomplete-editor").value as? String, "Rabat")
    tap("autocomplete-readonly")
    waitFor("Editable indicator must restore") { self.node("autocomplete-toggle").isEnabled }
    tap("autocomplete-disabled")
    waitFor("Disabled popup indicator must be disabled") { !self.node("autocomplete-toggle").isEnabled }
    XCTAssertEqual(node("autocomplete-editor").value as? String, "Rabat")
  }
  func testPrefilledSelectionReplacesOnFocus() {
    tap("autocomplete-mode-States")
    XCTAssertEqual(node("autocomplete-editor").value as? String, "Rabat")
    tap("autocomplete-editor")
    node("autocomplete-editor").typeText("Casa")
    waitFor("selectOnFocus must replace the prefilled label") { (self.node("autocomplete-editor").value as? String) == "Casa" }
  }
  func testFullScreenDialogSelection() {
    tap("autocomplete-mode-Dialog")
    tap("autocomplete-dialog-fullscreen")
    tap("autocomplete-dialog-open")
    XCTAssertTrue(node("autocomplete-dialog-paper").waitForExistence(timeout: 10))
    XCTAssertEqual(node("autocomplete-dialog-paper").frame.width, app.frame.width, accuracy: 2, "Exercise the actual full-screen native presentation")
    tap("autocomplete-editor")
    node("autocomplete-editor").typeText("Casa")
    tap("autocomplete-option-2")
    selection("selectOption: 2")
    capture("autocomplete-fullscreen-dialog")
  }
  func testDialogSelection() {
    tap("autocomplete-mode-Dialog")
    tap("autocomplete-dialog-open")
    tap("autocomplete-editor")
    node("autocomplete-editor").typeText("Casa")
    tap("autocomplete-option-2")
    selection("selectOption: 2")
    capture("autocomplete-dialog")
  }
}
