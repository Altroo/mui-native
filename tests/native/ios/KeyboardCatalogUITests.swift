/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import XCTest

/** Public XCTest key synthesis checks command routing, not physical hardware or native IMEs. */
final class KeyboardCatalogUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
    let tab = node("catalog-tab-Keyboard")
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 15))
    for _ in 0..<8 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("keyboard-receipt").waitForExistence(timeout: 10))
  }
  private func state() -> [String: Any] {
    guard let bytes = node("keyboard-receipt").label.data(using: .utf8),
      let value = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any] else { return [:] }
    return value
  }
  private var receipts: [[String: Any]] { state()["receipts"] as? [[String: Any]] ?? [] }
  private func waitFor(_ message: String, condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 10), .completed, message)
  }
  private func reveal(_ id: String) -> XCUIElement {
    let element = node(id)
    for _ in 0..<8 {
      if element.exists && element.isHittable { return element }
      if element.exists && element.frame.minY < app.frame.midY { node("keyboard-scene-scroll").swipeDown() }
      else { node("keyboard-scene-scroll").swipeUp() }
    }
    XCTAssertTrue(element.isHittable, "Native control must be visible: \(id)")
    return element
  }
  private func tap(_ id: String) { reveal(id).tap() }
  private func reset(focusEditor: Bool = true) {
    tap("keyboard-reset")
    waitFor("Reset must clear receipts and enable commands") { self.receipts.isEmpty && self.state()["enabled"] as? Bool == true }
    if focusEditor { tap("keyboard-editor") }
  }
  private func assertReceipts(_ key: String, stages: [String]) {
    waitFor("Missing command delivery: \(key)") { self.receipts.count >= stages.count }
    let actual = receipts
    XCTAssertEqual(actual.count, stages.count, "Unexpected repeated delivery: \(actual)")
    for (index, stage) in stages.enumerated() {
      guard index < actual.count else { return }
      let item = actual[index]
      XCTAssertEqual(item["stage"] as? String, stage)
      XCTAssertEqual(item["key"] as? String, key)
      XCTAssertEqual(item["source"] as? String, "command")
      XCTAssertEqual(item["code"] as? String, "Unidentified")
      XCTAssertNil(item["repeat"], "UIKit commands must not invent repeat metadata")
      XCTAssertEqual(item["editable"] as? Bool, true)
      XCTAssertEqual(item["inputTarget"] as? Bool, true)
    }
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
  }
  func testInlineEditableCommands() {
    let commands: [(XCUIKeyboardKey, String)] = [
      (.downArrow, "ArrowDown"), (.upArrow, "ArrowUp"), (.tab, "Tab"),
    ]
    for (key, name) in commands {
      reset()
      node("keyboard-editor").typeKey(key, modifierFlags: [])
      assertReceipts(name, stages: ["capture", "input", "inner", "outer"])
      // No new tap: typing must still reach the same native first responder.
      node("keyboard-editor").typeText("x")
      waitFor("Navigation must preserve native editor focus") { (self.node("keyboard-editor").value as? String)?.contains("x") == true }
      node("keyboard-editor").typeText(XCUIKeyboardKey.delete.rawValue)
      waitFor("Ordinary editing must restore the original draft") { self.node("keyboard-editor").value as? String == "Rabat" }
      XCTAssertEqual(receipts.count, 4, "Ordinary editing must not enter the command bridge")
    }
    capture("inline-native-commands")
    reset()
    node("keyboard-editor").typeText("x")
    waitFor("Ordinary text must reach the native editor") { (self.node("keyboard-editor").value as? String)?.contains("x") == true }
    node("keyboard-editor").typeText(XCUIKeyboardKey.delete.rawValue)
    waitFor("Ordinary native deletion must work") { self.node("keyboard-editor").value as? String == "Rabat" }
    XCTAssertTrue(receipts.isEmpty, "Ordinary typing must not enter the command bridge")
  }
  /** Failures in a plain RN editor cannot establish behavior of this boundary.
   * iOS 27.0's XCTest driver delivers arrows/Tab, but its typed Delete/Return
   * do not edit/submit even outside the owner. Report those gates as skipped,
   * never passed, until the selected driver meets this native positive control.
   */
  private func requireExtendedKeyDriver() throws {
    tap("keyboard-plain-native")
    let control = node("keyboard-plain-native")
    control.typeText("x")
    let before = control.value as? String
    control.typeKey(.delete, modifierFlags: [])
    let deletion = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in (control.value as? String) != before }, object: nil)
    guard XCTWaiter.wait(for: [deletion], timeout: 2) == .completed else {
      capture("driver-plain-native-delete-unavailable")
      throw XCTSkip("Selected XCTest key driver does not delete in a plain React Native input. Extended keyboard verification remains open.")
    }
    control.typeKey(.return, modifierFlags: [])
    let submission = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in self.state()["nativeSubmissions"] as? Int == 1 }, object: nil)
    guard XCTWaiter.wait(for: [submission], timeout: 2) == .completed else {
      capture("driver-plain-native-return-unavailable")
      throw XCTSkip("Selected XCTest key driver does not submit a plain React Native input. Extended keyboard verification remains open.")
    }
  }
  func testExtendedEditableCommands() throws {
    try requireExtendedKeyDriver()
    let commands: [(XCUIKeyboardKey, String)] = [
      (.pageUp, "PageUp"), (.pageDown, "PageDown"), (.home, "Home"), (.end, "End"), (.escape, "Escape"),
    ]
    for (key, name) in commands {
      reset()
      node("keyboard-editor").typeKey(key, modifierFlags: [])
      assertReceipts(name, stages: ["capture", "input", "inner", "outer"])
    }
    reset()
    node("keyboard-editor").typeKey(.return, modifierFlags: [])
    assertReceipts("Enter", stages: ["capture", "input", "inner", "outer"])
    waitFor("Enter must remove the outer declaration") { self.state()["enabled"] as? Bool == false }
    XCTAssertEqual(state()["submissions"] as? Int, 0, "Declared Enter must not also submit")
    capture("enter-closed-declaration")
  }
  func testNestedAndPortalOwnership() {
    reset()
    tap("keyboard-enabled-toggle"); tap("keyboard-inner-toggle"); tap("keyboard-editor")
    waitFor("Nested declaration must be current") { self.state()["enabled"] as? Bool == false && self.state()["nested"] as? Bool == true }
    node("keyboard-editor").typeKey(.downArrow, modifierFlags: [])
    assertReceipts("ArrowDown", stages: ["capture", "input", "inner"])
    node("keyboard-editor").typeKey(.upArrow, modifierFlags: [])
    XCTAssertEqual(receipts.count, 3, "An undeclared ancestor key must stay native")
    capture("nested-native-owner")
    tap("keyboard-inner-toggle")
    waitFor("The inner owner must be disabled before changing presentation") { self.state()["nested"] as? Bool == false }
    // Focus the new Portal input after mounting, rather than an editor about
    // to be removed. Reset also blurs the old UIKit caret/edit interaction.
    reset(focusEditor: false)
    tap("keyboard-portal-toggle")
    waitFor("The Portal control must change state before querying its editor") { self.state()["portal"] as? Bool == true }
    waitFor("Portal must mount the editor") { self.state()["portal"] as? Bool == true && self.node("keyboard-portal-anchor").exists }
    tap("keyboard-portal-anchor"); tap("keyboard-editor")
    node("keyboard-editor").typeKey(.downArrow, modifierFlags: [])
    assertReceipts("ArrowDown", stages: ["capture", "input", "inner", "outer"])
    capture("portal-native-editor")
  }
  func testNativeDialogCommands() {
    reset(); tap("keyboard-dialog-open")
    waitFor("The native dialog must mount its own editor") { self.state()["dialog"] as? Bool == true }
    tap("keyboard-editor")
    node("keyboard-editor").typeKey(.downArrow, modifierFlags: [])
    assertReceipts("ArrowDown", stages: ["capture", "input", "inner", "outer"])
    capture("native-dialog-commands")
  }
  func testNativeDialogEnter() throws {
    try requireExtendedKeyDriver()
    reset(); tap("keyboard-dialog-open")
    waitFor("The native dialog must mount its own editor") { self.state()["dialog"] as? Bool == true }
    tap("keyboard-editor")
    node("keyboard-editor").typeKey(.return, modifierFlags: [])
    assertReceipts("Enter", stages: ["capture", "input", "inner", "outer"])
    waitFor("Enter closes only the command declaration") { self.state()["enabled"] as? Bool == false }
    XCTAssertEqual(state()["submissions"] as? Int, 0)
    XCTAssertTrue(node("keyboard-dialog-close").exists)
    capture("native-dialog-enter")
  }
}
