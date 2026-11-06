/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Actual native frames and painted SVG pixels. Run unchanged under normal and largest OS text profiles.
final class MenuIconCascadeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let names = ["parent", "inline", "dense"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    guard let data = node("menu-style-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ predicate: @escaping () -> Bool) {
    let expected = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in predicate() }, object: nil)
    let result = XCTWaiter.wait(for: [expected], timeout: 15)
    if result != .completed { capture("menu-styles-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func finiteFrame(_ frame: CGRect) -> Bool {
    !frame.isEmpty && !frame.isNull && !frame.isInfinite
      && [frame.minX, frame.minY, frame.width, frame.height].allSatisfy { $0.isFinite }
  }
  private func reveal(_ id: String, touch: Bool = false) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    let controls = ["menu-style-class", "menu-style-selected", "menu-style-root", "menu-style-measure"]
    var trace: [String] = []
    func reached() -> Bool {
      guard target.exists && finiteFrame(target.frame) else { return false }
      let visible = scroll.frame.intersection(app.frame).insetBy(dx: 8, dy: 8)
      if touch { return target.isHittable && visible.contains(CGPoint(x: target.frame.midX, y: target.frame.midY)) }
      // Passive Icon/SVG roots are geometry, not touch targets. Their interactive
      // ancestor or painted child can legitimately cover the same native frame.
      return visible.contains(target.frame)
    }
    for _ in 0..<24 {
      if reached() { return target }
      let visible = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      XCTAssertGreaterThan(visible.height, 48)
      let known = target.exists && finiteFrame(target.frame)
      let delta = known ? target.frame.midY - visible.midY : (controls.contains(id) ? -visible.height : visible.height)
      let distance = min(max(abs(delta), 28), visible.height * 0.4)
      trace.append("target=\(target.frame) viewport=\(visible) exists=\(target.exists) touch=\(touch) delta=\(delta)")
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: visible.midX - app.frame.minX, dy: visible.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: visible.midX - app.frame.minX,
        dy: visible.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    let evidence = XCTAttachment(string: trace.joined(separator: "\n"))
    evidence.name = "menu-styles-reveal-" + id; evidence.lifetime = .keepAlways; add(evidence)
    capture("menu-styles-unreachable-" + id)
    XCTFail("Native scene target is unreachable: " + id)
    return target
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<20 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.exists && tab.isHittable); tab.tap()
    let route = node("root-layout-menu-styles")
    XCTAssertTrue(route.waitForExistence(timeout: 10))
    for _ in 0..<12 {
      if route.isHittable { break }
      node("root-layout-navigation").swipeLeft()
    }
    XCTAssertTrue(route.isHittable); route.tap()
    waitFor("The mounted scene must report the actual OS profile") {
      guard let scale = self.metadata()?["fontScale"] as? NSNumber else { return false }
      return scale.doubleValue.isFinite && scale.doubleValue > 0
    }
  }
  override func tearDownWithError() throws {
    if let run = testRun, run.failureCount > 0 { capture("menu-styles-final-failure") }
  }
  private func capture(_ name: String) {
    let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = name; shot.lifetime = .keepAlways; add(shot)
    var frames: [String: Any] = [:]
    for row in names {
      for suffix in ["row", "root", "glyph"] {
        let id = "menu-style-\(row)-\(suffix)", element = node("menu-style-\(row)-\(suffix)")
        let frame = element.frame
        frames[id] = ["exists": element.exists, "x": Double(frame.minX), "y": Double(frame.minY),
          "width": Double(frame.width), "height": Double(frame.height)]
      }
    }
    if let data = try? JSONSerialization.data(withJSONObject: ["receipt": metadata() ?? [:], "native": frames], options: [.prettyPrinted, .sortedKeys]),
      let text = String(data: data, encoding: .utf8) {
      print("MENU_ICON_CASCADE_NATIVE " + text)
      let artifact = XCTAttachment(string: text); artifact.name = name + "-metadata"; artifact.lifetime = .keepAlways; add(artifact)
    }
  }
  private func refs() throws -> [String: [String: Any]] {
    try XCTUnwrap(metadata()?["refs"] as? [String: [String: Any]])
  }
  private func assertRetained(_ initial: [String: [String: Any]]) throws {
    let current = try refs()
    for row in names {
      for suffix in ["root", "glyph"] {
        let key = row + "-" + suffix
        let before = try XCTUnwrap(initial[key]), after = try XCTUnwrap(current[key])
        XCTAssertGreaterThan(try XCTUnwrap(after["attached"] as? Int), 0)
        XCTAssertEqual(try XCTUnwrap(after["attached"] as? Int), try XCTUnwrap(before["attached"] as? Int))
        XCTAssertEqual(try XCTUnwrap(after["cleaned"] as? Int), try XCTUnwrap(before["cleaned"] as? Int))
        XCTAssertEqual(after["sameRoot"] as? Bool, true, "Native handle must survive CSS/row changes: " + key)
      }
    }
  }
  private func verifyMeasurements() {
    let control = reveal("menu-style-measure", touch: true)
    let before = metadata(), previousReceipts = before?["receipts"] as? [String: [String: Any]]
    let previousRequests = before?["measureRequests"] as? Int ?? 0
    var previousSequence: [String: Int] = [:]
    for row in names {
      for suffix in ["root", "glyph"] {
        let key = row + "-" + suffix
        previousSequence[key] = previousReceipts?[key]?["sequence"] as? Int ?? 0
      }
    }
    control.tap()
    waitFor("The native Measure tap must acknowledge and refresh all six forwarded handles") {
      guard let data = self.metadata(), let receipts = data["receipts"] as? [String: [String: Any]],
        let refs = data["refs"] as? [String: [String: Any]],
        let requests = data["measureRequests"] as? Int,
        requests == previousRequests + 1 else { return false }
      return self.names.allSatisfy { row in
        ["root", "glyph"].allSatisfy { suffix in
          let key = row + "-" + suffix
          guard let receipt = receipts[key], let window = receipt["window"] as? [String: NSNumber],
            let local = receipt["local"] as? [String: NSNumber],
            let width = window["width"]?.doubleValue, let height = window["height"]?.doubleValue,
            let localWidth = local["width"]?.doubleValue, let localHeight = local["height"]?.doubleValue,
            let revision = receipt["refRevision"] as? Int, let current = refs[key]?["revision"] as? Int,
            let sequence = receipt["sequence"] as? Int, let previous = previousSequence[key] else { return false }
          guard width.isFinite && height.isFinite && width > 0 && height > 0,
            localWidth.isFinite && localHeight.isFinite && localWidth > 0 && localHeight > 0 else { return false }
          let matchesHost: Bool
          if suffix == "glyph" {
            // RNSVGNode publishes artwork clientRect through onLayout. The ref
            // measures the SVG viewport; actual XCUI viewport dimensions are checked below.
            guard let x = local["x"]?.doubleValue, let y = local["y"]?.doubleValue,
              x.isFinite && y.isFinite else { return false }
            matchesHost = x >= -1 && y >= -1
              && x + localWidth <= width + 1 && y + localHeight <= height + 1
          } else {
            matchesHost = abs(localWidth - width) <= 1 && abs(localHeight - height) <= 1
          }
          return sequence > previous && revision == current && matchesHost
        }
      }
    }
    // Offscreen accessibility frames can be zero at the largest profile. Check
    // each real native frame only after its passive bounds enter the viewport.
    for row in names {
      for suffix in ["root", "glyph"] {
        let key = row + "-" + suffix, actual = reveal("menu-style-" + row + "-" + suffix).frame
        guard let receipts = metadata()?["receipts"] as? [String: [String: Any]],
          let window = receipts[key]?["window"] as? [String: NSNumber],
          let width = window["width"]?.doubleValue, let height = window["height"]?.doubleValue else {
          XCTFail("Visible native root lost its measurement: " + key); continue
        }
        XCTAssertEqual(Double(actual.width), width, accuracy: 1)
        XCTAssertEqual(Double(actual.height), height, accuracy: 1)
      }
    }
    // Window origins are retained diagnostics: parent scrolling moves them
    // without onLayout. Actual XCUI frames below prove current visible geometry.
  }
  private func geometry(_ row: String, width: CGFloat, glyphSize: CGFloat) {
    let root = reveal("menu-style-" + row + "-root"), glyph = reveal("menu-style-" + row + "-glyph")
    XCTAssertEqual(root.frame.width, width, accuracy: 1)
    XCTAssertEqual(glyph.frame.width, glyphSize, accuracy: 1)
    XCTAssertEqual(glyph.frame.height, glyphSize, accuracy: 1)
    XCTAssertEqual(root.frame.height, glyph.frame.height, accuracy: 1)
    XCTAssertTrue(root.frame.insetBy(dx: -1, dy: -1).contains(glyph.frame))
    XCTAssertGreaterThanOrEqual(node("menu-style-" + row + "-row").frame.height, 43.5)
  }
  private func matchingPixels(_ id: String, rgb: (Int, Int, Int)) -> Int {
    guard let image = UIImage(data: node(id).screenshot().pngRepresentation)?.cgImage else { return 0 }
    let width = image.width, height = image.height
    guard width > 0 && height > 0, let space = CGColorSpace(name: CGColorSpace.sRGB) else { return 0 }
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let rendered = pixels.withUnsafeMutableBytes { bytes -> Bool in
      guard let context = CGContext(data: bytes.baseAddress, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width * 4, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height)); return true
    }
    guard rendered else { return 0 }
    var matching = 0
    for index in stride(from: 0, to: pixels.count, by: 4) {
      let opaque = pixels[index + 3] >= 245
      let redDistance = abs(Int(pixels[index]) - rgb.0)
      let greenDistance = abs(Int(pixels[index + 1]) - rgb.1)
      let blueDistance = abs(Int(pixels[index + 2]) - rgb.2)
      if opaque && redDistance <= 12 && greenDistance <= 12 && blueDistance <= 12 {
        matching += 1
      }
    }
    return matching
  }
  private func painted(_ row: String, rgb: (Int, Int, Int)) {
    _ = reveal("menu-style-" + row + "-glyph")
    waitFor("Actual rendered SVG pixels must use the winning foreground: " + row) {
      self.matchingPixels("menu-style-" + row + "-glyph", rgb: rgb) >= 4
    }
  }
  func testParentRulesInlinePriorityAndRetainedNativeChildren() throws {
    verifyMeasurements(); let initial = try refs()
    geometry("parent", width: 56, glyphSize: 31); painted("parent", rgb: (47, 111, 79))
    geometry("inline", width: 84, glyphSize: 40); painted("inline", rgb: (32, 78, 156))
    reveal("menu-style-parent-row", touch: true).tap()
    waitFor("A real native MenuItem action updates its owned child") {
      (self.metadata()?["counts"] as? [String: Int])?["parent"] == 1
    }
    capture("menu-styles-ios-source")
    reveal("menu-style-class", touch: true).tap()
    waitFor("Authored class change must commit") { self.metadata()?["accent"] as? Bool == true }
    geometry("parent", width: 68, glyphSize: 35); painted("parent", rgb: (143, 63, 113))
    reveal("menu-style-selected", touch: true).tap()
    waitFor("Live selected state must commit") { self.metadata()?["selected"] as? Bool == true }
    geometry("parent", width: 72, glyphSize: 37); painted("parent", rgb: (43, 102, 126))
    geometry("inline", width: 84, glyphSize: 40); painted("inline", rgb: (32, 78, 156))
    verifyMeasurements(); try assertRetained(initial)
    XCTAssertEqual((metadata()?["counts"] as? [String: Int])?["parent"], 1)
    capture("menu-styles-ios-selected")
  }
  func testDenseRemRootCalibrationKeepsOSScalingOutOfVectorGeometry() throws {
    verifyMeasurements(); let initial = try refs()
    geometry("dense", width: 36, glyphSize: 20)
    reveal("menu-style-dense-row", touch: true).tap()
    reveal("menu-style-root", touch: true).tap()
    waitFor("The authored CSS root must become 24") { self.metadata()?["cssRoot"] as? Int == 24 }
    geometry("dense", width: 36, glyphSize: 30)
    geometry("parent", width: 56, glyphSize: 31)
    geometry("inline", width: 84, glyphSize: 40)
    verifyMeasurements(); try assertRetained(initial)
    XCTAssertEqual((metadata()?["counts"] as? [String: Int])?["dense"], 1)
    capture("menu-styles-ios-rem24")
    reveal("menu-style-root", touch: true).tap()
    waitFor("The same roots must return to the 16 CSS calibration") { self.metadata()?["cssRoot"] as? Int == 16 }
    geometry("dense", width: 36, glyphSize: 20)
    try assertRetained(initial)
    XCTAssertEqual((metadata()?["counts"] as? [String: Int])?["dense"], 1)
    capture("menu-styles-ios-rem16-restored")
  }
}
