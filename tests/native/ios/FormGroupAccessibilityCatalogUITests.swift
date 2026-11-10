/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// XCTest's native tree can establish descendant exposure and activation.
/// It does not establish VoiceOver order, announcements, or rotor behavior.
@MainActor
final class FormGroupAccessibilityCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let prefix = "form-group-contract-"
  private let groups = ["inherited", "own-false", "custom", "styled"]
  private enum Refusal: Error { case unreachable(String) }

  private func query(_ id: String, in root: XCUIElement? = nil) -> XCUIElementQuery {
    (root ?? app).descendants(matching: .any).matching(identifier: id)
  }

  private func reveal(_ target: XCUIElement, named name: String, hittable: Bool = true) throws -> XCUIElement {
    let scroll = query("root-layout-scroll").firstMatch
    for attempt in 0..<24 {
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      guard !viewport.isEmpty, viewport.height > 48 else { throw Refusal.unreachable(name) }
      let frame = target.exists ? target.frame : .zero
      let known = !frame.isEmpty && !frame.isInfinite
      if known && viewport.contains(CGPoint(x: frame.midX, y: frame.midY)), !hittable || target.isHittable {
        return target
      }
      // Offscreen AX nodes may have no frame; recover with a bounded reverse and forward sweep.
      let delta = known ? frame.midY - viewport.midY : (attempt < 8 ? -viewport.height : viewport.height)
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    throw Refusal.unreachable(name)
  }

  private func reveal(_ id: String, hittable: Bool = true) throws -> XCUIElement {
    try reveal(query(id).firstMatch, named: id, hittable: hittable)
  }

  private func containsCenter(_ outer: CGRect, _ inner: CGRect) -> Bool {
    !outer.isEmpty && !inner.isEmpty && outer.contains(CGPoint(x: inner.midX, y: inner.midY))
  }

  private func selectRoute(_ id: String, scrollBack: Bool = false) throws {
    let route = query(id).firstMatch, strip = query("root-layout-navigation").firstMatch
    for _ in 0..<12 {
      if route.exists && route.isHittable && containsCenter(strip.frame, route.frame) {
        route.tap()
        return
      }
      if scrollBack { strip.swipeRight() } else { strip.swipeLeft() }
    }
    throw Refusal.unreachable(id)
  }

  private func plainViewBaseline() throws {
    try selectRoute("root-layout-group-editor")
    let id = "form-group-editor-baseline-input", rootID = "form-group-editor-baseline"
    let input = try reveal(id)
    let root = query(rootID).firstMatch
    XCTAssertEqual(query(rootID).count, 1)
    XCTAssertEqual(query(id).count, 1)
    XCTAssertEqual(input.elementType, .textField)
    XCTAssertTrue(containsCenter(root.frame, input.frame))
    let nested = query(id, in: root).count
    XCTAssertTrue((0...1).contains(nested))
    let data = try JSONSerialization.data(withJSONObject: ["root": root.identifier, "input": input.identifier, "nestedCount": nested], options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "form-group-native-tree-plain-view"
    attachment.lifetime = .keepAlways
    add(attachment)
    try selectRoute("root-layout-form-group", scrollBack: true)
  }

  private func verifyTree(_ group: String, count: Int) throws -> [String: Any] {
    let buttonID = prefix + "child-" + group
    let button = try reveal(buttonID)
    let rootID = prefix + group
    let root = query(rootID).firstMatch
    XCTAssertEqual(query(rootID).count, 1, "The native group root must remain addressable")
    XCTAssertEqual(query(buttonID).count, 1, "The child must have one native tree entry")
    XCTAssertEqual(button.elementType, .button)
    XCTAssertTrue(button.isEnabled)
    XCTAssertTrue(containsCenter(root.frame, button.frame), "The child is inside the actual group bounds")
    // Accessibility snapshots can flatten the wrapper even while both leaves remain exposed.
    let nested = query(buttonID, in: root).count
    let observedRoot = root.identifier, observedButton = button.identifier
    let buttonLabel = button.label
    XCTAssertEqual(buttonLabel, "Choice \(count)")
    // The identified paragraph can also contain an internal AX text node with the same label.
    let textID = prefix + "text-" + group
    let sibling = try reveal(textID, hittable: false)
    XCTAssertEqual(query(textID).count, 1)
    XCTAssertEqual(sibling.elementType, .staticText)
    XCTAssertEqual(sibling.label, "Inherited text")
    XCTAssertTrue(containsCenter(root.frame, sibling.frame))
    return ["root": observedRoot, "button": observedButton, "buttonLabel": buttonLabel, "sibling": sibling.identifier, "siblingLabel": sibling.label, "nestedCount": nested]
  }

  private func verify(_ stage: String, count: Int, changed: Bool) throws {
    var rows: [[String: Any]] = []
    for group in groups { rows.append(try verifyTree(group, count: count)) }
    let receipt = try reveal(prefix + "receipt", hittable: false)
    let data = try XCTUnwrap(receipt.label.data(using: .utf8))
    let value = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    XCTAssertEqual(value["schemaVersion"] as? Int, 1)
    XCTAssertEqual(value["row"] as? Bool, changed)
    XCTAssertEqual(value["parentError"] as? Bool, changed)
    XCTAssertEqual(value["themed"] as? Bool, changed)
    XCTAssertEqual(value["rtl"] as? Bool, changed)
    XCTAssertEqual(value["fontSize"] as? Int, changed ? 20 : 16)
    let fontScale = try XCTUnwrap(value["fontScale"] as? Double)
    XCTAssertEqual(fontScale, 1)
    let refs = try XCTUnwrap(value["refs"] as? [String: [String: Int]])
    XCTAssertEqual(Set(refs.keys), Set(groups))
    for group in groups { XCTAssertEqual(refs[group], ["attached": 1, "cleaned": 0]) }
    let result = try JSONSerialization.data(withJSONObject: ["stage": stage, "rows": rows, "refs": refs, "fontScale": fontScale], options: [.sortedKeys])
    let attachment = XCTAttachment(data: result, uniformTypeIdentifier: "public.json")
    attachment.name = "form-group-native-tree-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  func testDescendantsRemainSeparatelyAddressableAcrossUpdates() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    let tabs = query("catalog-tabs").firstMatch
    XCTAssertTrue(tabs.waitForExistence(timeout: 20))
    let wrappers = query("catalog-tab-Wrappers").firstMatch
    for _ in 0..<20 {
      if wrappers.exists && wrappers.isHittable { break }
      tabs.swipeLeft()
    }
    XCTAssertTrue(wrappers.exists && wrappers.isHittable)
    wrappers.tap()
    XCTAssertTrue(query("root-layout-navigation").firstMatch.waitForExistence(timeout: 15))
    try plainViewBaseline()
    try verify("initial", count: 0, changed: false)
    for group in groups { try reveal(prefix + "child-" + group).tap() }
    let toggles = ["row", "error", "theme", "rtl", "text"]
    for toggle in toggles { try reveal(prefix + toggle).tap() }
    try verify("updated", count: 1, changed: true)
    for toggle in toggles { try reveal(prefix + toggle).tap() }
    try verify("restored", count: 1, changed: false)
  }
}
