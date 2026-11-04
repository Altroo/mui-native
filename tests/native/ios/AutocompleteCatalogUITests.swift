/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import XCTest
import UIKit

/** Real native touch/text/command checks; physical keyboards and screen readers are separate. */
final class AutocompleteCatalogUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    openCatalog()
  }
  private func openCatalog() {
    app.launchArguments = []
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
  func testTagNavigationAndNativeCaretControls() {
    tap("autocomplete-mode-Multiple")
    tap("autocomplete-editor")
    let editor = node("autocomplete-editor")
    waitFor("The native editor must initially own keyboard focus") { self.node("autocomplete-focused-control").label == "editor" }
    editor.typeKey(.leftArrow, modifierFlags: [])
    waitFor("Caret-start Left must focus the last selected item") { self.node("autocomplete-focused-control").label == "chip:Casablanca" }
    waitFor("Tag entry must close suggestions") { !self.node("autocomplete-popup").exists }
    capture("autocomplete-tag-focus")
    app.typeKey(.leftArrow, modifierFlags: [])
    waitFor("Left must focus the preceding tag") { self.node("autocomplete-focused-control").label == "chip:Rabat" }
    app.typeKey(.leftArrow, modifierFlags: [])
    XCTAssertEqual(node("autocomplete-focused-control").label, "chip:Rabat", "Left at the first tag must remain there")
    app.typeKey(.rightArrow, modifierFlags: [])
    waitFor("Right must focus the next tag") { self.node("autocomplete-focused-control").label == "chip:Casablanca" }
    app.typeKey(.rightArrow, modifierFlags: [])
    waitFor("Right after the last tag must restore editor focus") { self.node("autocomplete-focused-control").label == "editor" }
    editor.typeText("ab")
    editor.typeKey(.leftArrow, modifierFlags: [])
    editor.typeText("x")
    waitFor("Middle-caret Left must keep native editing") { (editor.value as? String) == "axb" }
    // A native word-selection gesture must produce a nonempty range before
    // testing collapse. An unselected caret cannot satisfy this prerequisite.
    editor.doubleTap()
    waitFor("The actual native selection must cover the draft") { self.node("autocomplete-native-selection").label == "0:3" }
    editor.typeKey(.leftArrow, modifierFlags: [])
    waitFor("Left must collapse the selected range without entering a tag") {
      self.node("autocomplete-native-selection").label == "0:0" && self.node("autocomplete-focused-control").label == "editor"
    }
    editor.typeText("q")
    waitFor("Left on a selected range must collapse it natively before insertion") { (editor.value as? String) == "qaxb" }
    XCTAssertEqual(node("autocomplete-focused-control").label, "editor")
    // Text API deletion is an editing check, not proof of a hardware command.
    editor.typeText(XCUIKeyboardKey.delete.rawValue)
    waitFor("Native text deletion must remove only the inserted character") { (editor.value as? String) == "axb" }
    XCTAssertTrue(node("autocomplete-chip-Rabat").exists)
    XCTAssertTrue(node("autocomplete-chip-Casablanca").exists)
    XCTAssertEqual(node("autocomplete-focused-control").label, "editor")
    capture("autocomplete-tag-caret-controls")
  }
  func testSoftwareKeyboardBackspace() throws {
    defer { openCatalog() }
    // Touch the visible system Delete key; text API deletion is a separate gate.
    tap("autocomplete-mode-Multiple")
    tap("autocomplete-editor")
    let editor = node("autocomplete-editor"), keyboard = app.keyboards.firstMatch
    XCTAssertTrue(keyboard.waitForExistence(timeout: 10), "An actual software keyboard is required")
    let hierarchy = XCTAttachment(string: keyboard.debugDescription)
    hierarchy.name = "software-keyboard-hierarchy"; hierarchy.lifetime = .keepAlways; add(hierarchy)
    let deleteKey = keyboard.keys.matching(NSPredicate(format: "identifier == %@ OR label == %@", "delete", "delete")).firstMatch
    XCTAssertTrue(deleteKey.exists && deleteKey.isHittable, "Locate the actual software deletion key from retained hierarchy")
    func record(_ label: String) throws {
      let state: [String: Any] = ["label": label, "text": editor.value as? String ?? "",
        "rabat": self.node("autocomplete-chip-Rabat").exists,
        "casablanca": self.node("autocomplete-chip-Casablanca").exists,
        "selection": self.node("autocomplete-selection").label,
        "focus": self.node("autocomplete-focused-control").label]
      let data = try JSONSerialization.data(withJSONObject: state, options: [.sortedKeys])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = label; attachment.lifetime = .keepAlways; add(attachment)
    }
    editor.typeText("x")
    waitFor("Native text must be present before actual keyboard deletion") { editor.value as? String == "x" }
    try record("software-delete-before")
    deleteKey.tap()
    waitFor("The actual keyboard must delete the final draft character") { editor.value as? String == "" }
    XCTAssertTrue(node("autocomplete-chip-Rabat").exists && node("autocomplete-chip-Casablanca").exists,
      "Deleting the final character must retain both selected values")
    try record("software-delete-draft")
    capture("software-delete-draft")
    deleteKey.tap()
    waitFor("Empty software Delete removes exactly the last value and retains editor focus") {
      self.node("autocomplete-chip-Rabat").exists && !self.node("autocomplete-chip-Casablanca").exists &&
        self.node("autocomplete-focused-control").label == "editor"
    }
    try record("software-delete-empty")
    capture("software-delete-empty")
  }
  func testEmptyEditorHardwareBackspace() throws {
    try requireCommandDriver("Backspace", key: .delete, usage: .keyboardDeleteOrBackspace)
    tap("autocomplete-mode-Multiple")
    tap("autocomplete-editor")
    let editor = node("autocomplete-editor")
    editor.typeKey(.delete, modifierFlags: [])
    selection("removeOption: 1")
    waitFor("Backspace must remove exactly the final tag and retain editing focus") {
      self.node("autocomplete-events-1-Backspace").exists && self.node("autocomplete-chip-Rabat").exists &&
        !self.node("autocomplete-chip-Casablanca").exists && self.node("autocomplete-focused-control").label == "editor"
    }
    editor.typeKey(.delete, modifierFlags: [])
    waitFor("A second Backspace must remove exactly the remaining tag") {
      self.node("autocomplete-events-2-Backspace").exists && !self.node("autocomplete-chip-Rabat").exists &&
        self.node("autocomplete-focused-control").label == "editor"
    }
    capture("autocomplete-empty-editor-backspace")
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
  func testDialogEscapeRetainsParentBeforeDefaultClose() throws {
    try requireEscapeDriver()
    exerciseDialogEscape(fullScreen: false)
  }
  func testFullScreenDialogEscapeRetainsParentBeforeDefaultClose() throws {
    try requireEscapeDriver()
    exerciseDialogEscape(fullScreen: true)
  }
  /** A missing key in an independent UIKit scene cannot certify this composite. */
  private func requireEscapeDriver() throws {
    try requireCommandDriver("Escape", key: .escape, usage: .keyboardEscape)
  }
  private func requireCommandDriver(_ name: String, key: XCUIKeyboardKey, usage: UIKeyboardHIDUsage) throws {
    defer { openCatalog() }
    app.launchArguments = ["--mui-native-key-control"]
    app.launch()
    let control = app.textFields["native-key-editor"]
    XCTAssertTrue(control.waitForExistence(timeout: 15), "Include NativeKeyboardDriverControl.swift in the app target and route its debug scene as described in the native catalog guide")
    let receipt = app.staticTexts["native-key-receipt"]
    func values() -> (counts: [String: Int], presses: [String])? {
      guard receipt.exists, let data = receipt.label.data(using: .utf8),
        let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let counts = value["counts"] as? [String: Int],
        let presses = value["presses"] as? [String] else { return nil }
      return (counts, presses)
    }
    control.tap()
    control.typeKey(.downArrow, modifierFlags: [])
    let down = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in values()?.counts["ArrowDown"] == 1 }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [down], timeout: 3), .completed, "The independent UIKit control must first receive ArrowDown")
    control.typeKey(key, modifierFlags: [])
    let command = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in (values()?.counts[name] ?? 0) > 0 }, object: nil)
    let delivered = XCTWaiter.wait(for: [command], timeout: 3)
    if delivered != .completed, let current = values(), current.counts["ArrowDown"] == 1,
      current.counts[name] == 0 {
      // A raw HID receipt proves delivery even if UIKit command routing failed.
      // Such a failure must not be classified as unavailable driver input.
      let rawCommand = current.presses.contains { $0 == "down:\(usage.rawValue)" || $0 == "up:\(usage.rawValue)" }
      XCTAssertFalse(rawCommand, "UIKit received raw \(name) but did not invoke its registered command")
      if rawCommand { return }
      let values = XCTAttachment(string: receipt.label)
      values.name = "driver-plain-uikit-\(name.lowercased())-unavailable"
      values.lifetime = .keepAlways
      add(values)
      capture("driver-plain-uikit-\(name.lowercased())-unavailable")
      throw XCTSkip("Plain UIKit received ArrowDown but no \(name) with this driver. iOS \(name) interaction remains unverified; physical keyboard coverage is open in issue55.")
    }
    XCTAssertEqual(delivered, .completed)
    XCTAssertEqual(values()?.counts[name], 1, "A single driver action must not create duplicate native commands")
  }
  private func exerciseDialogEscape(fullScreen: Bool) {
    tap("autocomplete-mode-Dialog")
    if fullScreen { tap("autocomplete-dialog-fullscreen") }
    tap("autocomplete-dialog-open")
    let paper = node("autocomplete-dialog-paper")
    XCTAssertTrue(paper.waitForExistence(timeout: 10))
    if fullScreen { XCTAssertEqual(paper.frame.width, app.frame.width, accuracy: 2) }
    tap("autocomplete-editor")
    XCTAssertTrue(node("autocomplete-option-1").waitForExistence(timeout: 10))
    node("autocomplete-editor").typeKey(.escape, modifierFlags: [])
    waitFor("Child Escape must close suggestions") { !self.node("autocomplete-popup").exists }
    let parentClosed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in !paper.exists }, object: nil)
    parentClosed.isInverted = true
    XCTAssertEqual(XCTWaiter.wait(for: [parentClosed], timeout: 0.75), .completed, "A child Escape must retain the parent beyond its closing transition")
    XCTAssertTrue(paper.isHittable)
    capture(fullScreen ? "autocomplete-fullscreen-escape-retained" : "autocomplete-dialog-escape-retained")
    node("autocomplete-editor").typeKey(.escape, modifierFlags: [])
    waitFor("A later unhandled Escape must close the Dialog") { !self.node("autocomplete-dialog-paper").exists && !self.node("autocomplete-editor").exists }
    XCTAssertTrue(node("autocomplete-dialog-open").isHittable)
  }

}
