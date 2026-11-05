/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Native direction, independent text roots and actual onTextLayout glyph receipts.
final class ButtonGroupReadingUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expected = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expected], timeout: 15), .completed, message)
  }
  private func reveal(_ id: String) -> XCUIElement {
    let target = node(id), scroll = node("button-group-scene")
    var attempts: [String] = []
    var unknownFrames = 0
    for _ in 0..<16 {
      let frame = target.frame, viewport = scroll.frame.intersection(app.frame)
      let middle = CGPoint(x: frame.midX, y: frame.midY)
      let knownFrame = target.exists && !frame.isEmpty && !frame.isNull && !frame.isInfinite
      if knownFrame && target.isHittable && viewport.contains(middle) { return target }
      // Offscreen AX nodes can have a zero frame. That does not mean the target
      // is above the viewport; search forward until native bounds are available.
      if !knownFrame { unknownFrames += 1 }
      // A bounded reverse sweep recovers an unknown-frame target above us too.
      let above = knownFrame ? frame.midY < viewport.minY : unknownFrames > 4
      let attempt = "target=\(frame) viewport=\(viewport) exists=\(target.exists) hittable=\(target.isHittable) swipe=\(above ? "down" : "up")"
      attempts.append(attempt)
      print("READING_REVEAL \(id) \(attempt)")
      if above { scroll.swipeDown() } else { scroll.swipeUp() }
    }
    let trace = XCTAttachment(string: attempts.joined(separator: "\n"))
    trace.name = "reading-reveal-\(id)"; trace.lifetime = .keepAlways; add(trace)
    capture("reading-unreachable-\(id)")
    XCTFail("Native reading control is not visible: \(id)")
    return target
  }
  private func receipt() -> [String: Any] {
    guard let data = node("group-reading-metadata").label.data(using: .utf8),
      let decoded = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return decoded
  }
  private func number(_ value: Any?, _ message: String) -> CGFloat {
    guard let result = value as? NSNumber, result.doubleValue.isFinite else { XCTFail(message); return 0 }
    return CGFloat(result.doubleValue)
  }
  private func lines(_ key: String, in metadata: [String: Any]) -> [[String: Any]] {
    guard let metrics = metadata["metrics"] as? [String: Any],
      let lines = metrics[key] as? [[String: Any]], !lines.isEmpty else { XCTFail("Native text receipt is missing: \(key)"); return [] }
    return lines
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image)
  }
  private func contains(_ parent: CGRect, _ child: CGRect) -> Bool {
    parent.insetBy(dx: -1.5, dy: -1.5).contains(child)
  }
  private func start(_ globalRTL: Bool) {
    continueAfterFailure = false
    // NSArgumentDomain is process-local. No persistent device locale or app
    // preference is changed to exercise React Native's actual global layout.
    app.launchArguments = ["-RCTI18nUtil_forceRTL", globalRTL ? "YES" : "NO", "-RCTI18nUtil_allowRTL", globalRTL ? "YES" : "NO"]
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tabs = node("catalog-tabs"), group = node("catalog-tab-Groups")
    for _ in 0..<20 {
      if group.exists && group.isHittable && tabs.frame.contains(CGPoint(x: group.frame.midX, y: group.frame.midY)) { break }
      if group.exists && group.frame.maxX < tabs.frame.minX { tabs.swipeRight() }
      else if group.exists && group.frame.minX > tabs.frame.maxX { tabs.swipeLeft() }
      else if globalRTL { tabs.swipeRight() } else { tabs.swipeLeft() }
    }
    XCTAssertTrue(group.isHittable); group.tap()
    XCTAssertTrue(node("group-save").waitForExistence(timeout: 15))
    reveal("group-closure-toggle").tap()
    XCTAssertTrue(node("group-reading-scene").waitForExistence(timeout: 15))
    reveal("group-reading-measurements-toggle").tap()
    waitFor("Real native text receipts must arrive") { (self.receipt()["metrics"] as? [String: Any])?["2"] != nil }
    XCTAssertEqual(receipt()["globalRTL"] as? Bool, globalRTL)
  }
  private func verify(_ phase: String, rtl: Bool, vertical: Bool, globalRTL: Bool, changedPolicies: Bool = false, allCounts: Bool = false) {
    let direction = rtl ? "rtl" : "ltr", orientation = vertical ? "vertical" : "horizontal"
    waitFor("Reading state must commit") { self.receipt()["direction"] as? String == direction && self.receipt()["orientation"] as? String == orientation && self.receipt()["followSystem"] as? Bool == changedPolicies && self.receipt()["uncapped"] as? Bool == changedPolicies }
    _ = reveal("group-reading-action-0")
    let metadata = receipt(), root = node("group-reading-actions").frame, parent = node("group-reading-scene").frame
    XCTAssertEqual(metadata["globalRTL"] as? Bool, globalRTL)
    XCTAssertEqual(root.minX, parent.minX, accuracy: 1.5); XCTAssertEqual(root.width, parent.width, accuracy: 1.5)
    let scale = number(metadata["fontScale"], "Actual system text scale must be finite")
    XCTAssertGreaterThan(scale, 0)
    let actions = (0..<3).map { node("group-reading-action-\($0)").frame }
    var caps: [CGFloat] = []
    for index in 0..<3 {
      let action = node("group-reading-action-\(index)"), label = node("group-reading-label-\(index)")
      XCTAssertTrue(label.exists, "Authored label must remain an actual native text root")
      XCTAssertGreaterThanOrEqual(action.frame.height, 43.5)
      XCTAssertTrue(contains(action.frame, label.frame), "Native text bounds must fit its actual touch root")
      XCTAssertEqual(action.label, "Reading \(["Save", "Review", "Send"][index]) count \(index == 0 || allCounts ? 1 : 0)")
      let previous = index > 0 ? actions[index - 1] : root
      let x = vertical ? root.minX : index == 0 ? (rtl ? root.maxX - actions[index].width : root.minX) : rtl ? previous.minX + 1 - actions[index].width : previous.maxX - 1
      let y = vertical && index > 0 ? previous.maxY - 1 : root.minY
      XCTAssertEqual(actions[index].minX, x, accuracy: 1.5); XCTAssertEqual(actions[index].minY, y, accuracy: 1.5)
      if vertical { XCTAssertEqual(actions[index].width, root.width, accuracy: 1.5) }
      let textLines = lines(String(index), in: metadata)
      XCTAssertFalse(textLines.isEmpty)
      let cap = number(textLines.first?["capHeight"], "Actual native cap height must be present")
      XCTAssertGreaterThan(cap, 0); caps.append(cap)
      let factor = changedPolicies ? scale : index == 1 ? 1 : index == 2 ? min(scale, 1.2) : scale
      let expected = UIFont.systemFont(ofSize: 14 * factor, weight: .semibold).capHeight
      XCTAssertEqual(cap, expected, accuracy: 0.75, "Native glyph size must follow the authored policy")
      for line in textLines {
        XCTAssertLessThanOrEqual(number(line["y"], "Native line y") + number(line["height"], "Native line height"), label.frame.height + 1.5, "Actual native lines must fit vertically")
        XCTAssertLessThanOrEqual(number(line["width"], "Native line width"), label.frame.width + 1.5)
      }
    }
    if scale >= 1.3 && !changedPolicies { XCTAssertGreaterThan(caps[0], caps[1] + 1) }
    if changedPolicies { XCTAssertEqual(caps[0], caps[1], accuracy: 0.75); XCTAssertEqual(caps[0], caps[2], accuracy: 0.75) }
    if rtl && !vertical { XCTAssertEqual(actions.last!.minX, root.minX, accuracy: 1.5) }
    else { XCTAssertEqual(actions.last!.maxX, root.maxX, accuracy: 1.5) }
    XCTAssertEqual(actions.last!.maxY, root.maxY, accuracy: 1.5)
    capture("reading-ios-\(globalRTL ? "rtl-host" : "ltr-host")-\(phase)")
  }
  private func runReading(_ globalRTL: Bool) {
    start(globalRTL)
    reveal("group-reading-action-0").tap()
    verify("ltr-horizontal", rtl: false, vertical: false, globalRTL: globalRTL)
    reveal("group-reading-direction").tap()
    verify("rtl-horizontal", rtl: true, vertical: false, globalRTL: globalRTL)
    reveal("group-reading-orientation").tap()
    verify("rtl-vertical", rtl: true, vertical: true, globalRTL: globalRTL)
    reveal("group-reading-direction").tap()
    verify("ltr-vertical", rtl: false, vertical: true, globalRTL: globalRTL)
    reveal("group-reading-orientation").tap()
    verify("restored-horizontal", rtl: false, vertical: false, globalRTL: globalRTL)
    reveal("group-reading-action-1").tap(); reveal("group-reading-action-2").tap()
    reveal("group-reading-follow-toggle").tap(); reveal("group-reading-cap-toggle").tap()
    verify("scaling-live", rtl: false, vertical: false, globalRTL: globalRTL, changedPolicies: true, allCounts: true)
    reveal("group-reading-follow-toggle").tap(); reveal("group-reading-cap-toggle").tap()
    verify("scaling-restored", rtl: false, vertical: false, globalRTL: globalRTL, allCounts: true)
    reveal("group-reading-mixed-action").tap()
    XCTAssertEqual(node("group-reading-mixed-action").label, "Reading mixed count 1")
    for id in ["group-reading-mixed-first", "group-reading-mixed-last"] { XCTAssertTrue(contains(node("group-reading-mixed-action").frame, node(id).frame)) }
    reveal("group-reading-text-portal-toggle").tap()
    XCTAssertTrue(node("group-reading-text-portal").waitForExistence(timeout: 15))
    waitFor("Typography-origin Portal must emit its own native text receipt") { (self.receipt()["metrics"] as? [String: Any])?["portal"] != nil }
    let cap = number(lines("portal", in: receipt()).first?["capHeight"], "Portal root cap height")
    XCTAssertEqual(cap, UIFont.systemFont(ofSize: 14).capHeight, accuracy: 0.75)
    XCTAssertEqual(node("group-reading-text-portal").label, "Independent window text")
    capture("reading-ios-\(globalRTL ? "rtl-host" : "ltr-host")-text-portal")
    reveal("group-reading-text-portal-toggle").tap()
    XCTAssertFalse(node("group-reading-text-portal").exists)
  }
  func testReadingUnderLTRGlobalHost() { runReading(false) }
  func testReadingUnderRTLGlobalHost() { runReading(true) }
}
