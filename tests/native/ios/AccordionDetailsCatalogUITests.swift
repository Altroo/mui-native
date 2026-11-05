/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Run unchanged under externally selected normal and enlarged OS text profiles.
/// Actual ref dimensions, child frames, native glyph lines and gestures are the exit evidence.
final class AccordionDetailsCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["stock", "custom"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    let receipt = node("details-contract-receipt")
    guard receipt.exists, let data = receipt.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func capture(_ name: String) {
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = name
    screenshot.lifetime = .keepAlways
    add(screenshot)
    var native: [String: Any] = [:]
    let ids = keys.flatMap { key in ["details-contract-" + key,
      "details-contract-content-" + key, "details-contract-primary-" + key,
      "details-contract-small-" + key] } + ["details-contract-child", "root-layout-scroll"]
    for id in ids {
      let element = node(id)
      if !element.exists { native[id] = ["exists": false]; continue }
      let frame = element.frame
      native[id] = ["exists": true, "hittable": element.isHittable,
        "frame": ["x": Double(frame.minX), "y": Double(frame.minY),
          "width": Double(frame.width), "height": Double(frame.height)]]
    }
    let evidence: [String: Any] = ["test": self.name, "receipt": metadata() ?? [:], "native": native]
    if let data = try? JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys]),
      let text = String(data: data, encoding: .utf8) {
      print("ACCORDION_DETAILS_NATIVE " + text)
      let attachment = XCTAttachment(string: text)
      attachment.name = name + "-metadata"
      attachment.lifetime = .keepAlways
      add(attachment)
    }
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 12)
    if result != .completed { capture("accordion-details-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func reveal(_ id: String, requiresHitTarget: Bool = true) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    func reached() -> Bool {
      guard target.exists else { return false }
      if requiresHitTarget { return target.isHittable }
      // Passive roots can be covered by children. Their actual native frame,
      // not parent hit testing, establishes that the whole measured root is visible.
      // Keep the viewport's full width: roots have only 8 points of scene inset.
      // An 11-point horizontal exclusion would make every full-width root fail.
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 0, dy: 11)
      return target.frame.width > 0 && target.frame.height > 0 && viewport.contains(target.frame)
    }
    for _ in 0..<18 {
      if reached() { break }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      XCTAssertGreaterThan(viewport.height, 48, "A real native scroll viewport must be visible")
      let delta = target.exists ? target.frame.midY - viewport.midY : viewport.height
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    if !reached() { capture("accordion-details-ios-unreachable-" + id) }
    XCTAssertTrue(reached(), "Native target must be reachable: " + id)
    return target
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<16 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.exists && tab.isHittable)
    tab.tap()
    let route = node("root-layout-details")
    XCTAssertTrue(route.waitForExistence(timeout: 10))
    for _ in 0..<10 {
      if route.isHittable { break }
      node("root-layout-navigation").swipeLeft()
    }
    XCTAssertTrue(route.isHittable)
    route.tap()
    waitFor("Details must publish the actual OS text profile") {
      guard let scale = self.metadata()?["fontScale"] as? Double else { return false }
      return scale.isFinite && scale > 0
    }
  }
  override func tearDownWithError() throws {
    if let run = testRun, run.failureCount > 0 { capture("accordion-details-ios-failure") }
  }
  private func measured() throws {
    waitFor("Both forwarded refs must measure the current actual native roots") {
      guard let receipts = self.metadata()?["receipts"] as? [String: [String: Any]] else { return false }
      return self.keys.allSatisfy { key in
        guard let frame = receipts[key]?["window"] as? [String: Double],
          let width = frame["width"], let height = frame["height"],
          width.isFinite && height.isFinite && width > 0 && height > 0,
          self.node("details-contract-" + key).exists else { return false }
        let actual = self.node("details-contract-" + key).frame
        return abs(actual.width - width) <= 1 && abs(actual.height - height) <= 1
      }
    }
    let receipts = try XCTUnwrap(metadata()?["receipts"] as? [String: [String: Any]])
    let refs = try XCTUnwrap(metadata()?["refs"] as? [String: [String: Any]])
    for key in keys {
      let local = try XCTUnwrap(receipts[key]?["local"] as? [String: Double])
      let window = try XCTUnwrap(receipts[key]?["window"] as? [String: Double])
      // Scrolling changes origins without onLayout. Dimensions independently
      // identify the exact native ref target; no stale origin is manufactured.
      XCTAssertEqual(node("details-contract-" + key).frame.width, try XCTUnwrap(window["width"]), accuracy: 1)
      XCTAssertEqual(node("details-contract-" + key).frame.height, try XCTUnwrap(window["height"]), accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(local["width"]), try XCTUnwrap(window["width"]), accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(local["height"]), try XCTUnwrap(window["height"]), accuracy: 1)
      XCTAssertEqual(refs[key]?["attached"] as? Int, 1, key)
      XCTAssertEqual(refs[key]?["cleaned"] as? Int, 0, key)
      XCTAssertEqual(refs[key]?["sameRoot"] as? Bool, true, key)
    }
  }
  private func insets(_ top: Double, _ right: Double, _ bottom: Double, _ left: Double) throws {
    for key in keys {
      _ = reveal("details-contract-" + key, requiresHitTarget: false)
      waitFor("Actual root/content frames must reach the expected padding: " + key) {
        let root = self.node("details-contract-" + key).frame
        let content = self.node("details-contract-content-" + key).frame
        guard root.width > 0 && content.width > 0 && content.height > 0 else { return false }
        return abs(content.minY - root.minY - top) <= 1
          && abs(root.maxX - content.maxX - right) <= 1
          && abs(root.maxY - content.maxY - bottom) <= 1
          && abs(content.minX - root.minX - left) <= 1
      }
    }
    try measured()
  }
  private func tap(_ name: String) { reveal("details-contract-" + name).tap() }
  private func retainedChild() {
    XCTAssertEqual(node("details-contract-child").label, "Marked 1")
    XCTAssertEqual(metadata()?["childCount"] as? Int, 1)
  }
  func testSourceTupleClassesDefaultsAndInlinePaddingOnSameRoots() throws {
    try insets(8, 16, 16, 16)
    let before = ((metadata()?["touches"] as? [String: [String: Any]])?["custom"]?["count"] as? Int) ?? 0
    tap("child")
    waitFor("The actual native child press and bubbling root event must arrive") {
      guard let touch = (self.metadata()?["touches"] as? [String: [String: Any]])?["custom"],
        let count = touch["count"] as? Int else { return false }
      return self.node("details-contract-child").label == "Marked 1"
        && self.metadata()?["childCount"] as? Int == 1 && count > before
    }
    let touch = try XCTUnwrap((metadata()?["touches"] as? [String: [String: Any]])?["custom"])
    for field in ["pageX", "pageY", "timestamp"] {
      XCTAssertTrue(try XCTUnwrap(touch[field] as? Double).isFinite, "Native event field: " + field)
    }
    XCTAssertGreaterThan(try XCTUnwrap(touch["target"] as? Int), 0)
    capture("accordion-details-ios-source")
    tap("spacing")
    try insets(10, 20, 20, 20)
    tap("spacing")
    try insets(5, 7, 9, 7)
    tap("style")
    try insets(11, 21, 13, 7)
    retainedChild()
    capture("accordion-details-ios-custom-tuple")
    tap("inline")
    try insets(0, 0, 0, 0)
    retainedChild()
    capture("accordion-details-ios-inline-zero")
    tap("inline")
    try insets(11, 21, 13, 7)
    tap("style")
    try insets(5, 7, 9, 7)
    tap("spacing")
    try insets(8, 16, 16, 16)
    retainedChild()
    capture("accordion-details-ios-restored")
  }
  private func metrics(_ font: Double, rtl: Bool) throws {
    let scale = try XCTUnwrap(metadata()?["fontScale"] as? Double)
    XCTAssertTrue(scale.isFinite && scale > 0)
    waitFor("Native glyph receipts must reflect the current authored parent and em size") {
      guard let receipt = self.metadata(),
        let metrics = receipt["metrics"] as? [String: [[String: Any]]],
        let frames = receipt["textFrames"] as? [String: [String: Double]] else { return false }
      return self.keys.allSatisfy { key in
        ["primary": font, "small": font * 0.5].allSatisfy { kind, authored in
          let name = kind + "-" + key
          guard let lines = metrics[name], !lines.isEmpty,
            let cap = lines.first?["capHeight"] as? Double, cap.isFinite,
            let width = frames[name]?["width"], let height = frames[name]?["height"],
            width > 0 && height > 0 else { return false }
          let expectedLineHeight = authored * 1.25 * scale
          return abs(height - expectedLineHeight) <= 1.5
            && abs(cap - Double(UIFont.systemFont(ofSize: authored * scale, weight: .regular).capHeight)) <= 0.75
            && lines.allSatisfy { line in
              guard let x = line["x"] as? Double, let y = line["y"] as? Double,
                let w = line["width"] as? Double, let h = line["height"] as? Double else { return false }
              return [x, y, w, h].allSatisfy { $0.isFinite } && h > 0 && y >= -1.5 && y + h <= height + 1.5
                && abs(h - expectedLineHeight) <= 1.5
                && x >= -1.5 && x + w <= width + 1.5
                && (rtl ? abs(x + w - width) <= 1.5 : abs(x) <= 1.5)
            }
        }
      }
    }
    for key in keys {
      let root = reveal("details-contract-" + key, requiresHitTarget: false).frame
      let receipt = try XCTUnwrap(metadata())
      let lines = try XCTUnwrap(receipt["metrics"] as? [String: [[String: Any]]])
      let textFrames = try XCTUnwrap(receipt["textFrames"] as? [String: [String: Double]])
      for kind in ["primary", "small"] {
        let name = kind + "-" + key
        let text = node("details-contract-" + name)
        XCTAssertTrue(text.exists)
        XCTAssertGreaterThan(text.frame.height, 0)
        XCTAssertTrue(root.insetBy(dx: -1.5, dy: -1.5).contains(text.frame), "Actual text stays inside its root: " + name)
        let frame = try XCTUnwrap(textFrames[name])
        let width = try XCTUnwrap(frame["width"]), height = try XCTUnwrap(frame["height"])
        XCTAssertEqual(text.frame.width, width, accuracy: 1.5)
        XCTAssertEqual(text.frame.height, height, accuracy: 1.5)
        // This short single-line fixture must inherit the parent's unitless ratio,
        // including after em resizing. UIFont cap height alone cannot prove it.
        let authoredSize = kind == "primary" ? font : font * 0.5
        let expectedLineHeight = authoredSize * 1.25 * scale
        XCTAssertEqual(height, expectedLineHeight, accuracy: 1.5, "Inherited line height: " + name)
        let nativeLines = try XCTUnwrap(lines[name])
        XCTAssertFalse(nativeLines.isEmpty)
        for line in nativeLines {
          let x = try XCTUnwrap(line["x"] as? Double), y = try XCTUnwrap(line["y"] as? Double)
          let lineWidth = try XCTUnwrap(line["width"] as? Double), lineHeight = try XCTUnwrap(line["height"] as? Double)
          XCTAssertTrue([x, y, lineWidth, lineHeight].allSatisfy { $0.isFinite })
          XCTAssertGreaterThan(lineHeight, 0)
          XCTAssertEqual(lineHeight, expectedLineHeight, accuracy: 1.5)
          XCTAssertGreaterThanOrEqual(y, -1.5)
          XCTAssertLessThanOrEqual(y + lineHeight, height + 1.5)
          XCTAssertGreaterThanOrEqual(x, -1.5)
          XCTAssertLessThanOrEqual(x + lineWidth, width + 1.5)
          if rtl { XCTAssertEqual(x + lineWidth, width, accuracy: 1.5, "Native logical start must align right") }
          else { XCTAssertEqual(x, 0, accuracy: 1.5, "Native logical start must align left") }
        }
      }
    }
    try measured()
  }
  func testAuthoredParentEmInheritanceRTLAndRealNativeLineGeometry() throws {
    try metrics(20, rtl: false)
    tap("child")
    waitFor("A real child tap must update retained state") { self.node("details-contract-child").label == "Marked 1" }
    tap("font")
    tap("rtl")
    waitFor("Both native controls must commit their live settings") {
      self.metadata()?["large"] as? Bool == true && self.metadata()?["rtl"] as? Bool == true
    }
    try metrics(24, rtl: true)
    try insets(8, 16, 16, 16)
    retainedChild()
    capture("accordion-details-ios-large-rtl")
    tap("font")
    tap("rtl")
    waitFor("The authored settings must restore without replacing roots") {
      self.metadata()?["large"] as? Bool == false && self.metadata()?["rtl"] as? Bool == false
    }
    try metrics(20, rtl: false)
    retainedChild()
    capture("accordion-details-ios-type-restored")
  }
}
