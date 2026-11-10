/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Current iOS driver evidence for the supported ArrowDown and ordinary A inputs.
/// Return/keypad Enter availability is tracked by the independent keyboard test.
@MainActor
final class FormGroupEditorCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let prefix = "form-group-editor-"
  private enum Refusal: Error { case unavailable(String) }

  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func json(_ id: String) -> [String: Any]? {
    let element = node(id)
    guard element.exists, let data = element.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func wait(_ id: String, _ message: String, _ test: @escaping ([String: Any]) -> Bool) throws -> [String: Any] {
    var previous = "", changed = Date(), accepted: [String: Any]?
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      let element = self.node(id)
      guard element.exists else { return false }
      let text = element.label
      if text != previous { previous = text; changed = Date(); return false }
      guard Date().timeIntervalSince(changed) >= 0.15, let data = text.data(using: .utf8),
        let value = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], test(value) else { return false }
      accepted = value
      return true
    }, object: nil)
    guard XCTWaiter.wait(for: [expectation], timeout: 15) == .completed, let value = accepted else {
      if let current = json(id) { try save(current, as: "form-group-editor-unacknowledged") }
      throw Refusal.unavailable(message)
    }
    return value
  }
  private func save(_ value: [String: Any], as name: String) throws {
    let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func insertedA(_ previous: String, _ current: String) -> Bool {
    let old = Array(previous), next = Array(current)
    guard next.count == old.count + 1 else { return false }
    return next.indices.contains { index in
      guard next[index] == "a" else { return false }
      var candidate = next
      candidate.remove(at: index)
      return candidate == old
    }
  }
  private func reveal(_ id: String) throws -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    for attempt in 0..<20 {
      let frame = target.exists ? target.frame : .zero
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      guard !viewport.isEmpty, viewport.height > 48 else { throw Refusal.unavailable(id) }
      let known = !frame.isEmpty && !frame.isInfinite
      if known && viewport.contains(CGPoint(x: frame.midX, y: frame.midY)) && target.isHittable { return target }
      let delta = known ? frame.midY - viewport.midY : (attempt < 7 ? -viewport.height : viewport.height)
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    throw Refusal.unavailable(id)
  }
  private func verifyUIKitDriver() throws {
    app.launchArguments = ["--mui-native-key-control"]
    app.launch()
    defer { app.terminate(); app.launchArguments = [] }
    let editor = node("native-key-editor"), id = "native-key-receipt"
    XCTAssertTrue(editor.waitForExistence(timeout: 15))
    editor.tap()
    let old = try XCTUnwrap(json(id)?["text"] as? String)
    app.typeKey(.downArrow, modifierFlags: [])
    _ = try wait(id, "UIKit did not acknowledge ArrowDown") {
      let presses = $0["presses"] as? [String] ?? []
      return presses.contains("down:81") && presses.contains("up:81")
    }
    app.typeKey("a", modifierFlags: [])
    let value = try wait(id, "UIKit did not acknowledge a fresh A press and edit") {
      let presses = $0["presses"] as? [String] ?? []
      guard let text = $0["text"] as? String else { return false }
      return presses.contains("down:4") && presses.contains("up:4") && self.insertedA(old, text)
    }
    try save(value, as: "form-group-editor-uikit-control")
  }
  private func openEditor() throws {
    app.launch()
    let tabs = node("catalog-tabs"), wrappers = node("catalog-tab-Wrappers")
    XCTAssertTrue(tabs.waitForExistence(timeout: 20))
    for _ in 0..<20 {
      if wrappers.exists && wrappers.isHittable { break }
      tabs.swipeLeft()
    }
    XCTAssertTrue(wrappers.exists && wrappers.isHittable)
    wrappers.tap()
    let navigation = node("root-layout-navigation"), route = node("root-layout-group-editor")
    XCTAssertTrue(navigation.waitForExistence(timeout: 15))
    for _ in 0..<12 {
      if route.exists && route.isHittable && navigation.frame.contains(CGPoint(x: route.frame.midX, y: route.frame.midY)) {
        route.tap()
        return
      }
      navigation.swipeLeft()
    }
    throw Refusal.unavailable("Group editors")
  }
  private func validateHosts(_ value: [String: Any], tags: [String: Int], target: Int) throws {
    XCTAssertEqual(value["nodes"] as? [String: Int], tags)
    XCTAssertEqual(value["focused"] as? Int, target)
    XCTAssertTrue((value["submissions"] as? [String: Int])?.isEmpty == true)
    let refs = try XCTUnwrap(value["refs"] as? [String: [String: Int]])
    XCTAssertEqual(Set(refs.keys), Set(tags.keys))
    for (id, ref) in refs {
      let attached = try XCTUnwrap(ref["attached"]), cleaned = try XCTUnwrap(ref["cleaned"])
      // An editable callback ref may rebind while its actual native tag remains unchanged.
      if id.hasSuffix("-input") {
        XCTAssertGreaterThan(attached, 0)
        XCTAssertEqual(cleaned, attached - 1)
      } else {
        XCTAssertEqual(ref, ["attached": 1, "cleaned": 0])
      }
    }
  }

  private func validateCommand(_ entries: [[String: Any]], control: String, policy: String, tags: [String: Int], offset: Int) throws {
    let root = try XCTUnwrap(tags[control]), owner = try XCTUnwrap(tags[control + "-owner"])
    let target = try XCTUnwrap(tags[control + "-input"])
    let scopes = policy == "stop" ? ["capture"] : ["capture", "input", "owner", "bubble"]
    // UIKit key commands dispatch keyDown without a physical key-up or scan code.
    XCTAssertEqual(entries.map { $0["phase"] as? String }, Array(repeating: "down", count: scopes.count))
    XCTAssertEqual(entries.map { $0["scope"] as? String }, scopes)
    XCTAssertEqual(entries.map { $0["sequence"] as? Int }, (1...scopes.count).map { offset + $0 })
    XCTAssertEqual(entries.map { $0["currentTarget"] as? Int }, policy == "stop" ? [root] : [root, target, owner, root])
    XCTAssertTrue(entries.allSatisfy {
      $0["control"] as? String == control && $0["key"] as? String == "ArrowDown" &&
        $0["code"] as? String == "Unidentified" && $0["source"] as? String == "command" &&
        $0["target"] as? Int == target && $0["nativeTarget"] as? Int == target &&
        $0["editable"] as? Bool == true && $0["composing"] as? Bool == false &&
        $0["canceled"] as? Bool == false && $0["keySequence"] is NSNull &&
        $0["prevented"] as? Bool == (policy == "prevent") && $0["stopped"] as? Bool == (policy == "stop")
    })
    for identity in ["eventId", "payloadId"] {
      let ids = entries.compactMap { $0[identity] as? Int }
      XCTAssertEqual(ids.count, scopes.count)
      XCTAssertEqual(Set(ids).count, 1)
      XCTAssertTrue(ids.allSatisfy { $0 > 0 })
    }
  }

  func testEditableArrowDownCommandsAndOrdinaryTyping() throws {
    continueAfterFailure = false
    try verifyUIKitDriver()
    try openEditor()
    let id = prefix + "receipt"
    let controls = ["stock-native", "stock-field", "custom-native", "custom-field", "styled-native", "styled-field"]
    let ready = try wait(id, "Actual editor hosts are not ready") { $0["ready"] as? Bool == true }
    let tags = try XCTUnwrap(ready["nodes"] as? [String: Int])
    XCTAssertEqual(Set(tags.keys), Set(controls.flatMap { [$0, $0 + "-input", $0 + "-owner"] } + ["baseline", "baseline-input"]))
    XCTAssertEqual(Set(tags.values).count, 20)
    XCTAssertTrue(tags.values.allSatisfy { $0 > 0 })
    XCTAssertEqual(ready["fontScale"] as? Double, 1)

    let baseline = try reveal(prefix + "baseline-input")
    let baselineBefore = try XCTUnwrap(baseline.value as? String)
    baseline.tap()
    let baselineTag = try XCTUnwrap(tags["baseline-input"])
    _ = try wait(id, "Plain RN input did not acknowledge focus") { $0["focused"] as? Int == baselineTag }
    app.typeKey("a", modifierFlags: [])
    let baselineResult = try wait(id, "Plain RN input did not edit") {
      guard let value = $0["baselineValue"] as? String else { return false }
      return self.insertedA(baselineBefore, value) && baseline.value as? String == value
    }
    let baselineAfter = try XCTUnwrap(baselineResult["baselineValue"] as? String)
    XCTAssertEqual(baselineResult["total"] as? Int, 0, "This iOS profile edits without ordinary key callbacks")
    try validateHosts(baselineResult, tags: tags, target: baselineTag)
    try save(baselineResult, as: "form-group-editor-plain-rn")

    var values: [String: String] = [:]
    for policy in ["observe", "prevent", "stop"] {
      if policy != "observe" { try reveal(prefix + "policy").tap() }
      _ = try wait(id, "Editor capture policy did not commit") { $0["policy"] as? String == policy }
      try reveal(prefix + "reset").tap()
      let reset = try wait(id, "Reset did not clear the editor callback history") {
        $0["total"] as? Int == 0 && ($0["entries"] as? [[String: Any]])?.isEmpty == true &&
          ($0["submissions"] as? [String: Int])?.isEmpty == true
      }
      XCTAssertEqual(reset["values"] as? [String: String], values)
      var offset = 0, results: [[String: Any]] = []
      for control in controls {
        let target = try XCTUnwrap(tags[control + "-input"])
        try reveal(prefix + control + "-focus").tap()
        let field = try reveal(prefix + control + "-input")
        let focus = try wait(id, "Public input focus did not reach " + control) { $0["focused"] as? Int == target }
        try validateHosts(focus, tags: tags, target: target)
        XCTAssertEqual(focus["total"] as? Int, offset)
        let before = try XCTUnwrap(field.value as? String)
        if let expected = values[control] { XCTAssertEqual(before, expected) }

        app.typeKey(.downArrow, modifierFlags: [])
        let finalScope = policy == "stop" ? "capture" : "bubble"
        let command = try wait(id, "Managed ArrowDown command did not complete: " + policy + "/" + control) {
          let entries = $0["entries"] as? [[String: Any]] ?? []
          return entries.dropFirst(offset).contains {
            $0["control"] as? String == control && $0["phase"] as? String == "down" &&
              $0["scope"] as? String == finalScope && $0["key"] as? String == "ArrowDown"
          }
        }
        let history = try XCTUnwrap(command["entries"] as? [[String: Any]])
        let entries = Array(history.dropFirst(offset))
        try validateCommand(entries, control: control, policy: policy, tags: tags, offset: offset)
        offset += entries.count
        XCTAssertEqual(command["total"] as? Int, offset)
        XCTAssertEqual(field.value as? String, before)
        XCTAssertEqual(command["values"] as? [String: String], values)
        try validateHosts(command, tags: tags, target: target)

        app.typeKey("a", modifierFlags: [])
        let typed = try wait(id, "Ordinary A did not edit: " + policy + "/" + control) {
          guard let text = ($0["values"] as? [String: String])?[control] else { return false }
          return self.insertedA(before, text) && field.value as? String == text
        }
        let after = try XCTUnwrap(field.value as? String)
        values[control] = after
        XCTAssertEqual(typed["values"] as? [String: String], values)
        XCTAssertEqual(typed["baselineValue"] as? String, baselineAfter)
        XCTAssertEqual(typed["total"] as? Int, offset, "Ordinary edits retain the observed plain RN key callback capability")
        try validateHosts(typed, tags: tags, target: target)
        results.append(["control": control, "before": before, "after": after, "command": entries, "ordinaryCallbacks": 0, "target": target])
      }
      try save(["policy": policy, "cases": results, "tags": tags, "baselineValue": baselineAfter], as: "form-group-editor-ios-" + policy)
    }
  }
}
