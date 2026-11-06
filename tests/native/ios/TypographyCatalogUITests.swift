/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// The caller selects the actual OS profile. This collector changes no OS setting.
final class TypographyCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["selected", "custom", "menu", "paragraph", "nowrap"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    guard node("type-contract-receipt").exists,
      let data = node("type-contract-receipt").label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func capture(_ name: String) {
    let png = XCTAttachment(screenshot: app.screenshot())
    png.name = name; png.lifetime = .keepAlways; add(png)
    var frames: [String: Any] = [:]
    for key in keys + ["after", "child"] {
      let element = node("type-contract-" + key)
      if !element.exists { frames[key] = ["exists": false]; continue }
      let frame = element.frame
      frames[key] = ["exists": true, "hittable": element.isHittable,
        "x": Double(frame.minX), "y": Double(frame.minY),
        "width": Double(frame.width), "height": Double(frame.height)]
    }
    let receipt: [String: Any] = ["test": self.name, "receipt": metadata() ?? [:], "native": frames]
    if let data = try? JSONSerialization.data(withJSONObject: receipt, options: [.prettyPrinted, .sortedKeys]),
      let text = String(data: data, encoding: .utf8) {
      print("TYPOGRAPHY_NATIVE " + text)
      let attachment = XCTAttachment(string: text)
      attachment.name = name + "-metadata"; attachment.lifetime = .keepAlways; add(attachment)
    }
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 12)
    if result != .completed { capture("typography-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func reveal(_ id: String, hit: Bool = true) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    func reached() -> Bool {
      guard target.exists else { return false }
      if hit { return target.isHittable }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 0, dy: 4)
      return target.frame.width > 0 && target.frame.height > 0 && viewport.contains(target.frame)
    }
    for _ in 0..<18 {
      if reached() { break }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      XCTAssertGreaterThan(viewport.height, 48)
      let delta = target.exists ? target.frame.midY - viewport.midY : viewport.height
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    if !reached() { capture("typography-ios-unreachable-" + id) }
    XCTAssertTrue(reached(), "Actual native target must be reachable: " + id)
    return target
  }
  private func tap(_ id: String) { reveal("type-contract-" + id).tap() }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launchArguments = []; app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<16 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.exists && tab.isHittable); tab.tap()
    let route = node("root-layout-typography")
    XCTAssertTrue(route.waitForExistence(timeout: 10))
    for _ in 0..<12 {
      if route.isHittable { break }
      node("root-layout-navigation").swipeLeft()
    }
    XCTAssertTrue(route.isHittable); route.tap()
    waitFor("Scene must publish the actual native OS profile") {
      guard let scale = self.metadata()?["fontScale"] as? Double else { return false }
      return scale.isFinite && scale > 0
    }
  }
  override func tearDownWithError() throws {
    if let run = testRun, run.failureCount > 0 { capture("typography-ios-failure") }
  }
  private func measured() throws {
    waitFor("Each live forwarded Text ref must measure its actual native root") {
      guard let values = self.metadata()?["receipts"] as? [String: [String: Any]] else { return false }
      return self.keys.allSatisfy { key in
        guard let frame = values[key]?["window"] as? [String: Double],
          let width = frame["width"], let height = frame["height"],
          width.isFinite && height.isFinite && width > 0 && height > 0 else { return false }
        let actual = self.node("type-contract-" + key).frame
        return abs(actual.width - width) <= 1.5 && abs(actual.height - height) <= 1.5
      }
    }
    let refs = try XCTUnwrap(metadata()?["refs"] as? [String: [String: Any]])
    let values = try XCTUnwrap(metadata()?["receipts"] as? [String: [String: Any]])
    for key in keys {
      let local = try XCTUnwrap(values[key]?["local"] as? [String: Double])
      let window = try XCTUnwrap(values[key]?["window"] as? [String: Double])
      for dimension in ["width", "height"] {
        XCTAssertEqual(try XCTUnwrap(local[dimension]), try XCTUnwrap(window[dimension]), accuracy: 1.5)
      }
      // Scrolling changes window origins without a new onLayout event.
      XCTAssertEqual(refs[key]?["attached"] as? Int, 1, key)
      XCTAssertEqual(refs[key]?["cleaned"] as? Int, 0, key)
      XCTAssertEqual(refs[key]?["sameRoot"] as? Bool, true, key)
    }
    let kinds = try XCTUnwrap(metadata()?["textKinds"] as? [String: Bool])
    XCTAssertEqual(kinds["custom"], false, "Custom Text owns a real paragraph")
    XCTAssertEqual(kinds["virtual"], true, "Nested custom Text is a genuine virtual span")
  }
  private func sourceFont(_ size: Double, _ weight: Double) -> UIFont {
    let nativeWeight: UIFont.Weight = weight <= 300 ? .light : weight >= 500 ? .medium : .regular
    return UIFont.systemFont(ofSize: size, weight: nativeWeight)
  }
  private func selectedMetrics() throws {
    waitFor("Native cap/line geometry must match the selected checked source variant") {
      guard let data = self.metadata(), let expected = data["expected"] as? [String: Any],
        let size = expected["fontSize"] as? Double, let ratio = expected["lineHeight"] as? Double,
        let weight = expected["weight"] as? Double, let scale = data["fontScale"] as? Double,
        let metrics = data["metrics"] as? [String: [String: Any]],
        let lines = metrics["selected"]?["lines"] as? [[String: Any]], lines.count == 1,
        let cap = lines[0]["capHeight"] as? Double, let height = lines[0]["height"] as? Double else { return false }
      let padding = data["mode"] as? Int == 1 ? 5.0 : 0.0
      return abs(cap - Double(self.sourceFont(size * scale, weight).capHeight)) <= 0.75
        && abs(height - size * ratio * scale) <= 1.5
        && abs(Double(self.node("type-contract-selected").frame.height) - height - padding) <= 1.5
    }
    _ = reveal("type-contract-selected", hit: false)
    let data = try XCTUnwrap(metadata()), expected = try XCTUnwrap(data["expected"] as? [String: Any])
    let sourceSize = try XCTUnwrap(expected["fontSize"] as? Double)
    let gutter = data["mode"] as? Int == 2 ? 0 : sourceSize * 0.35
    XCTAssertEqual(node("type-contract-after").frame.minY - node("type-contract-selected").frame.maxY,
      gutter, accuracy: 1.5, "CSS em gutter remains authored units, independent of OS font scaling")
  }
  // Same actual-frame paint oracle as the maintained Details collector. Cached
  // onTextLayout x positions are not proof of local-direction glyph placement.
  private func ink(_ id: String, color: [Int]? = nil) -> (bounds: CGRect, runs: [CGRect], width: CGFloat, matches: Int)? {
    let target = node("type-contract-" + id), frame = target.frame
    let viewport = node("root-layout-scroll").frame.intersection(app.frame).insetBy(dx: 0, dy: 4)
    guard viewport.contains(frame) else { return nil }
    guard let image = UIImage(data: target.screenshot().pngRepresentation)?.cgImage else { return nil }
    let width = image.width, height = image.height
    guard width > 0 && height > 0 && frame.width > 0 && frame.height > 0 else { return nil }
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let rendered = pixels.withUnsafeMutableBytes { bytes -> Bool in
      guard let context = CGContext(data: bytes.baseAddress, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
      return true
    }
    guard rendered else { return nil }
    let bg = [Int(pixels[0]), Int(pixels[1]), Int(pixels[2])]
    var minX = width, maxX = -1, minY = height, maxY = -1, matches = 0
    var columns = [(min: Int, max: Int)?](repeating: nil, count: width)
    for y in 0..<height {
      for x in 0..<width {
        let offset = (y * width + x) * 4
        let rgb = (0..<3).map { Int(pixels[offset + $0]) }
        if pixels[offset + 3] >= 245 && (0..<3).contains(where: { abs(rgb[$0] - bg[$0]) >= 80 }) {
          minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
          let old = columns[x]; columns[x] = (min(old?.min ?? y, y), max(old?.max ?? y, y))
          if let color = color, (0..<3).allSatisfy({ abs(rgb[$0] - color[$0]) <= 24 }) { matches += 1 }
        }
      }
    }
    guard maxX >= minX && maxY >= minY else { return nil }
    let sx = CGFloat(width) / frame.width, sy = CGFloat(height) / frame.height
    var runs: [CGRect] = [], start: Int?, top = height, bottom = -1
    for x in 0...width {
      if x < width, let column = columns[x] {
        if start == nil { start = x }; top = min(top, column.min); bottom = max(bottom, column.max)
      } else if let first = start {
        runs.append(CGRect(x: CGFloat(first) / sx, y: CGFloat(top) / sy,
          width: CGFloat(x - first) / sx, height: CGFloat(bottom - top + 1) / sy))
        start = nil; top = height; bottom = -1
      }
    }
    return (CGRect(x: CGFloat(minX) / sx, y: CGFloat(minY) / sy,
      width: CGFloat(maxX - minX + 1) / sx, height: CGFloat(maxY - minY + 1) / sy), runs, frame.width, matches)
  }
  private func edge(_ id: String, right: Bool, size: Double) throws {
    _ = reveal("type-contract-" + id, hit: false)
    waitFor("Actual captured native glyph edge: " + id) {
      guard let paint = self.ink(id), paint.bounds.width > size * 0.5,
        paint.width - paint.bounds.width > max(6, size * 0.2) else { return false }
      let actual = right ? Double(paint.width - paint.bounds.maxX) : Double(paint.bounds.minX)
      return abs(actual) <= max(2, size * 0.2)
    }
  }
  private func noWrap() throws {
    _ = reveal("type-contract-nowrap", hit: false)
    let scale = try XCTUnwrap(metadata()?["fontScale"] as? Double), size = 16 * scale
    let cap = Double(sourceFont(size, 400).capHeight)
    waitFor("NoWrap must use the actual source-sized native font, not small text in a tall line box") {
      guard let metrics = self.metadata()?["metrics"] as? [String: [String: Any]],
        let lines = metrics["nowrap"]?["lines"] as? [[String: Any]],
        let first = lines.first, let nativeCap = first["capHeight"] as? Double,
        let nativeHeight = first["height"] as? Double else { return false }
      // The frame establishes one visible line. Cached layout may also report
      // unclamped lines, so use the real cap/line metrics without inventing x paint.
      return nativeCap.isFinite && nativeHeight.isFinite
        && abs(nativeCap - cap) <= 0.75 && abs(nativeHeight - 24 * scale) <= 1.5
        && abs(Double(self.node("type-contract-nowrap").frame.height) - nativeHeight) <= 1.5
    }
    XCTAssertEqual(node("type-contract-nowrap").frame.width, 180, accuracy: 1.5)
    XCTAssertEqual(node("type-contract-nowrap").frame.height, 24 * scale, accuracy: 1.5)
    XCTAssertGreaterThan((String(repeating: "W", count: 25) as NSString).size(
      withAttributes: [.font: sourceFont(size, 400)]).width, 180)
    let paint = try XCTUnwrap(ink("nowrap")), dots = Array(paint.runs.suffix(3))
    guard dots.count == 3 else { XCTFail("Three visible native ellipsis dots are required"); return }
    XCTAssertTrue(paint.runs.dropLast(3).contains { glyph in
      Double(glyph.height) >= cap * 0.75 && Double(glyph.height) <= cap + 2
        && Double(glyph.width) >= size * 0.4
    }, "Actual source-sized W ink must precede the three small tail dots")
    for dot in dots {
      XCTAssertLessThan(dot.height, size * 0.3, "Actual tail ellipsis dots, not the full-height W glyphs")
      XCTAssertLessThan(dot.width, size * 0.3)
      XCTAssertGreaterThan(dot.width, 0)
    }
    XCTAssertLessThan(abs(dots[0].maxY - dots[2].maxY), max(1.5, size * 0.05))
    capture("typography-ios-native-one-line-ellipsis")
  }
  func testSourceVariantsGutterAndNativeEllipsisAtActualOSProfile() throws {
    let scale = try XCTUnwrap(metadata()?["fontScale"] as? Double)
    if scale <= 1.05 {
      var seen = Set<String>()
      for _ in 0..<14 {
        let name = try XCTUnwrap(metadata()?["variant"] as? String)
        try selectedMetrics(); seen.insert(name)
        capture("typography-ios-variant-" + name)
        tap("next")
        waitFor("Selected variant changes without replacing its Text") { self.metadata()?["variant"] as? String != name }
      }
      XCTAssertEqual(seen, Set(["h1", "h2", "h3", "h4", "h5", "h6", "subtitle1", "subtitle2", "body1", "body2", "button", "caption", "overline", "inherit"]))
    } else {
      for name in ["body1", "caption", "h6", "inherit"] {
        tap("choose-" + name)
        waitFor("Largest-profile representative is selected") { self.metadata()?["variant"] as? String == name }
        try selectedMetrics(); capture("typography-ios-large-" + name)
      }
    }
    try measured(); try noWrap()
  }
  func testClassesMenuCascadeInlineAndActualParagraphRTLKeepStateAndRefs() throws {
    // Virtual Text has no independent UIView/testID. Hit the actual rendered
    // counter glyphs within the accessible custom paragraph, not its empty center.
    let custom = reveal("type-contract-custom", hit: false)
    XCTAssertTrue(custom.isHittable, "Fully revealed custom Text must be an actual native hit target")
    let counterInk = try XCTUnwrap(ink("custom"))
    custom.coordinate(withNormalizedOffset: .zero).withOffset(
      CGVector(dx: counterInk.bounds.midX, dy: counterInk.bounds.midY)).tap()
    waitFor("Caller-owned keyed child must acknowledge a real native tap") { self.metadata()?["childCount"] as? Int == 1 }
    tap("selected")
    waitFor("Public native Text onPress must receive its actual event") {
      guard let touch = self.metadata()?["touch"] as? [String: Any], let target = touch["target"] as? Int,
        let x = touch["pageX"] as? Double, let y = touch["pageY"] as? Double,
        let time = touch["timestamp"] as? Double else { return false }
      return target > 0 && [x, y, time].allSatisfy { $0.isFinite }
    }
    tap("style"); tap("rtl")
    waitFor("Theme/classes and actual local RTL are committed") { self.metadata()?["mode"] as? Int == 1 && self.metadata()?["rtl"] as? Bool == true }
    try selectedMetrics()
    let scale = try XCTUnwrap(metadata()?["fontScale"] as? Double)
    try edge("selected", right: true, size: 16 * scale)
    try edge("paragraph", right: false, size: 16 * scale)
    _ = reveal("type-contract-menu", hit: false)
    XCTAssertGreaterThan(try XCTUnwrap(ink("menu", color: [38, 79, 120])).matches, 3)
    tap("style")
    waitFor("Genuine inline style clears CSS edges and retains its native alignment") { self.metadata()?["mode"] as? Int == 2 }
    try selectedMetrics(); try edge("selected", right: false, size: 16 * scale)
    _ = reveal("type-contract-menu", hit: false)
    XCTAssertGreaterThan(try XCTUnwrap(ink("menu", color: [39, 103, 73])).matches, 3)
    try measured()
    XCTAssertEqual(metadata()?["childCount"] as? Int, 1)
    capture("typography-ios-theme-inline-rtl-retained")
  }
}
