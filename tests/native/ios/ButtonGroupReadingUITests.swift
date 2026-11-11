/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Native direction, independent text roots and actual onTextLayout glyph receipts.
@MainActor
final class ButtonGroupReadingUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expected = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expected], timeout: 15)
    if result != .completed {
      capture("reading-timeout")
      let details = XCTAttachment(string: "group=\(node("group-reading-actions").frame) viewport=\(node("button-group-scene").frame)\n" + node("group-reading-metadata").label)
      details.name = "reading-timeout-native-state"; details.lifetime = .keepAlways; add(details)
    }
    XCTAssertEqual(result, .completed, message)
  }
  private func reveal(_ id: String) -> XCUIElement {
    let target = node(id), scroll = node("button-group-scene")
    var attempts: [String] = []
    // Search forward, backward, then farther forward when offscreen AX bounds
    // are unknown. Short drags avoid skipping an enlarged control entirely.
    for attempt in 0..<80 {
      let frame = target.frame, viewport = scroll.frame.intersection(app.frame)
      let known = target.exists && !frame.isEmpty && !frame.isNull && !frame.isInfinite
      if known && target.isHittable && viewport.contains(CGPoint(x: frame.midX, y: frame.midY)) {
        return target
      }
      let above = known ? frame.midY < viewport.minY : (24..<40).contains(attempt)
      attempts.append("target=\(frame) viewport=\(viewport) known=\(known) reverse=\(above)")
      let from = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: above ? 0.3 : 0.7))
      let to = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: above ? 0.7 : 0.3))
      from.press(forDuration: 0.05, thenDragTo: to, withVelocity: .slow, thenHoldForDuration: 0.1)
    }
    let trace = XCTAttachment(string: attempts.joined(separator: "\n"))
    trace.name = "reading-reveal-\(id)"; trace.lifetime = .keepAlways; add(trace)
    capture("reading-unreachable-\(id)")
    XCTFail("Native reading control is not visible: \(id)")
    return target
  }
  private func positionReadingGroup() {
    let scroll = node("button-group-scene"), frame = node("group-reading-actions").frame
    let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 0, dy: 4)
    // A transitional frame can be too tall. Let the settled predicate retry;
    // a persistently oversized group fails the complete-group visibility gate.
    guard !frame.isEmpty, frame.height <= viewport.height else { return }
    // Center the group rather than issuing an edge correction that can fall
    // below UIKit's pan threshold and leave the viewport unchanged.
    let delta = viewport.midY - frame.midY
    let distance = max(-viewport.height * 0.3, min(viewport.height * 0.3, delta))
    print("READING_POSITION group=\(frame) viewport=\(viewport) drag=\(distance)")
    let from = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
    let to = from.withOffset(CGVector(dx: 0, dy: distance))
    from.press(forDuration: 0.05, thenDragTo: to, withVelocity: .slow, thenHoldForDuration: 0.2)
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
  private func verify(_ phase: String, rtl: Bool, vertical: Bool, globalRTL: Bool, expectedScale: CGFloat, changedPolicies: Bool = false, allCounts: Bool = false) {
    let direction = rtl ? "rtl" : "ltr", orientation = vertical ? "vertical" : "horizontal"
    waitFor("Reading state must commit") { self.receipt()["direction"] as? String == direction && self.receipt()["orientation"] as? String == orientation && self.receipt()["followSystem"] as? Bool == changedPolicies && self.receipt()["uncapped"] as? Bool == changedPolicies }
    _ = reveal("group-reading-action-0")
    // A React flag can commit before native glyph layout. Require the current
    // source text and policy-sized glyphs, then stable native frames, together.
    waitFor("Native glyph receipts must match the current source text and font policy") {
      let metadata = self.receipt()
      guard let metrics = metadata["metrics"] as? [String: [[String: Any]]],
        let scale = metadata["fontScale"] as? NSNumber,
        abs(CGFloat(scale.doubleValue) - expectedScale) < 0.001 else { return false }
      for index in 0..<3 {
        guard let lines = metrics[String(index)], !lines.isEmpty else { return false }
        let source = "\(["Save", "Review", "Send"][index]) \(index == 0 || allCounts ? 1 : 0)"
        let actual = lines.compactMap { $0["text"] as? String }.joined()
        guard actual.filter({ !$0.isWhitespace }).uppercased() == source.filter({ !$0.isWhitespace }).uppercased() else { return false }
        let factor = changedPolicies ? expectedScale : index == 1 ? 1 : index == 2 ? min(expectedScale, 1.2) : expectedScale
        let expected = UIFont.systemFont(ofSize: 14 * factor, weight: .semibold).capHeight
        guard let cap = lines.first?["capHeight"] as? NSNumber, abs(CGFloat(cap.doubleValue) - expected) <= 0.75 else { return false }
      }
      return true
    }
    var previousFrames: [CGRect] = [], stableSince = Date()
    waitFor("The complete group and current glyph endpoints must fit stable native bounds") {
      let group = self.node("group-reading-actions").frame
      let viewport = self.node("button-group-scene").frame.intersection(self.app.frame).insetBy(dx: 0, dy: 4)
      guard !group.isEmpty, viewport.contains(group) else {
        self.positionReadingGroup(); previousFrames = []; stableSince = Date(); return false
      }
      guard let metrics = self.receipt()["metrics"] as? [String: [[String: Any]]] else { return false }
      var frames = [group, viewport]
      for index in 0..<3 {
        let action = self.node("group-reading-action-\(index)").frame
        let label = self.node("group-reading-label-\(index)").frame
        guard !action.isEmpty, !label.isEmpty, self.contains(group, action), self.contains(action, label),
          let lines = metrics[String(index)], !lines.isEmpty else { return false }
        for line in lines {
          guard let x = line["x"] as? NSNumber, let y = line["y"] as? NSNumber,
            let width = line["width"] as? NSNumber, let height = line["height"] as? NSNumber,
            x.doubleValue >= -1.5, y.doubleValue >= -1.5, width.doubleValue > 0, height.doubleValue > 0,
            x.doubleValue + width.doubleValue <= Double(label.width) + 1.5,
            y.doubleValue + height.doubleValue <= Double(label.height) + 1.5 else { return false }
        }
        frames.append(contentsOf: [action, label])
      }
      if frames != previousFrames { previousFrames = frames; stableSince = Date(); return false }
      return Date().timeIntervalSince(stableSince) >= 0.2
    }
    let metadata = receipt(), root = node("group-reading-actions").frame, parent = node("group-reading-scene").frame
    XCTAssertEqual(metadata["globalRTL"] as? Bool, globalRTL)
    XCTAssertEqual(root.minX, parent.minX, accuracy: 1.5); XCTAssertEqual(root.width, parent.width, accuracy: 1.5)
    let scale = number(metadata["fontScale"], "Actual system text scale must be finite")
    XCTAssertEqual(scale, expectedScale, accuracy: 0.001, "The requested OS text profile must actually be active")
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
        let x = number(line["x"], "Native line x"), y = number(line["y"], "Native line y")
        let width = number(line["width"], "Native line width"), height = number(line["height"], "Native line height")
        XCTAssertGreaterThanOrEqual(x, -1.5); XCTAssertGreaterThanOrEqual(y, -1.5)
        XCTAssertGreaterThan(width, 0); XCTAssertGreaterThan(height, 0)
        XCTAssertLessThanOrEqual(x + width, label.frame.width + 1.5, "Actual glyph endpoints must fit horizontally")
        XCTAssertLessThanOrEqual(number(line["y"], "Native line y") + number(line["height"], "Native line height"), label.frame.height + 1.5, "Actual native lines must fit vertically")
        XCTAssertLessThanOrEqual(number(line["width"], "Native line width"), label.frame.width + 1.5)
      }
    }
    if scale >= 1.3 && !changedPolicies { XCTAssertGreaterThan(caps[0], caps[1] + 1) }
    if changedPolicies { XCTAssertEqual(caps[0], caps[1], accuracy: 0.75); XCTAssertEqual(caps[0], caps[2], accuracy: 0.75) }
    if rtl && !vertical { XCTAssertEqual(actions.last!.minX, root.minX, accuracy: 1.5) }
    else { XCTAssertEqual(actions.last!.maxX, root.maxX, accuracy: 1.5) }
    XCTAssertEqual(actions.last!.maxY, root.maxY, accuracy: 1.5)
    let bounds = (0..<3).map { index -> [String: Any] in
      let action = node("group-reading-action-\(index)").frame, label = node("group-reading-label-\(index)").frame
      func rect(_ value: CGRect) -> [String: Double] { ["x": Double(value.minX), "y": Double(value.minY), "width": Double(value.width), "height": Double(value.height)] }
      return ["index": index, "action": rect(action), "label": rect(label)]
    }
    func rect(_ value: CGRect) -> [String: Double] { ["x": Double(value.minX), "y": Double(value.minY), "width": Double(value.width), "height": Double(value.height)] }
    let evidence: [String: Any] = ["phase": phase, "expectedScale": Double(expectedScale), "observed": metadata, "bounds": bounds, "group": rect(root), "parent": rect(parent)]
    guard let data = try? JSONSerialization.data(withJSONObject: evidence, options: [.sortedKeys, .prettyPrinted]) else { XCTFail("Native phase evidence must serialize"); return }
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "reading-\(globalRTL ? "rtl-host" : "ltr-host")-\(phase).json"
    attachment.lifetime = .keepAlways; add(attachment)
    capture("reading-ios-\(globalRTL ? "rtl-host" : "ltr-host")-\(phase)")
  }
  private func runReading(_ globalRTL: Bool, expectedScale: CGFloat) {
    start(globalRTL)
    reveal("group-reading-action-0").tap()
    verify("ltr-horizontal", rtl: false, vertical: false, globalRTL: globalRTL, expectedScale: expectedScale)
    reveal("group-reading-direction").tap()
    verify("rtl-horizontal", rtl: true, vertical: false, globalRTL: globalRTL, expectedScale: expectedScale)
    reveal("group-reading-orientation").tap()
    verify("rtl-vertical", rtl: true, vertical: true, globalRTL: globalRTL, expectedScale: expectedScale)
    reveal("group-reading-direction").tap()
    verify("ltr-vertical", rtl: false, vertical: true, globalRTL: globalRTL, expectedScale: expectedScale)
    reveal("group-reading-orientation").tap()
    verify("restored-horizontal", rtl: false, vertical: false, globalRTL: globalRTL, expectedScale: expectedScale)
    reveal("group-reading-action-1").tap(); reveal("group-reading-action-2").tap()
    reveal("group-reading-follow-toggle").tap(); reveal("group-reading-cap-toggle").tap()
    verify("scaling-live", rtl: false, vertical: false, globalRTL: globalRTL, expectedScale: expectedScale, changedPolicies: true, allCounts: true)
    reveal("group-reading-follow-toggle").tap(); reveal("group-reading-cap-toggle").tap()
    verify("scaling-restored", rtl: false, vertical: false, globalRTL: globalRTL, expectedScale: expectedScale, allCounts: true)
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
  func testReadingUnderLTRGlobalHostNormal() { runReading(false, expectedScale: 1) }
  func testReadingUnderRTLGlobalHostNormal() { runReading(true, expectedScale: 1) }
  func testReadingUnderLTRGlobalHostLargest() { runReading(false, expectedScale: 3.571) }
  func testReadingUnderRTLGlobalHostLargest() { runReading(true, expectedScale: 3.571) }
}
