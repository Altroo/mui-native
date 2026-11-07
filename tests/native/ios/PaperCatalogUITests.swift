/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Run each method under its externally selected, restored OS text profile.
/// AX supplies frames, not native View tags or Android retained-layer paint data.
@MainActor
final class PaperCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["stock", "custom"]
  private enum Profile: String { case normal, enlarged }
  private struct Stage {
    let name: String
    var elevation = 1, variant = "elevation"
    var square = false, dark = false, rtl = false, reset = false
  }
  private let stages: [Stage] = {
    var values = [Stage(name: "default"), Stage(name: "outlined", variant: "outlined"),
      Stage(name: "square", square: true), Stage(name: "light-zero", elevation: 0)]
    values += (0..<25).map { Stage(name: "dark-\($0)", elevation: $0, dark: true) }
    values += [Stage(name: "dark-square", elevation: 8, square: true, dark: true),
      Stage(name: "rtl-dark", elevation: 8, dark: true, rtl: true),
      Stage(name: "native-reset", elevation: 8, dark: true, reset: true), Stage(name: "restored")]
    return values
  }()
  // Original MIT MUI9.5.0 SSR observations; see upstream/paper.json and its fixture.
  private let overlayAlphas: [Double] = [0, 0.051, 0.069, 0.082, 0.092, 0.101, 0.108, 0.114, 0.119, 0.124, 0.128, 0.132, 0.135, 0.139, 0.142, 0.145, 0.147, 0.15, 0.152, 0.155, 0.157, 0.159, 0.161, 0.163, 0.165]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    let receipt = node("paper-contract-receipt")
    guard receipt.exists, let bytes = receipt.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 12)
    if result != .completed { capture("paper-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name; image.lifetime = .keepAlways; add(image)
    if let value = metadata(), let bytes = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
      let text = String(data: bytes, encoding: .utf8) {
      let receipt = XCTAttachment(string: text)
      receipt.name = name + "-receipt"; receipt.lifetime = .keepAlways; add(receipt)
    }
  }
  private func reveal(_ id: String, hit: Bool = false) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    func reached() -> Bool {
      guard target.exists, !target.frame.isEmpty, !target.frame.isInfinite, !target.frame.isNull else { return false }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 0, dy: 4)
      return viewport.contains(target.frame) && (!hit || target.isHittable)
    }
    for attempt in 0..<24 {
      if reached() { break }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      XCTAssertGreaterThan(viewport.height, 48)
      let known = target.exists && !target.frame.isEmpty
      // Recover an AX node with unknown/zero offscreen bounds in either direction.
      let topControl = id == "paper-contract-measure" || id == "paper-contract-next"
      let unknown = topControl || attempt >= 12 ? -viewport.height : viewport.height
      let delta = known ? target.frame.midY - viewport.midY : unknown
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    if !reached() { capture("paper-ios-unreachable-" + id) }
    XCTAssertTrue(reached(), "The actual native target must be fully visible: " + id)
    return target
  }
  private func tap(_ key: String) { reveal("paper-contract-" + key, hit: true).tap() }
  // Async lifecycle hooks keep XCUI work on its required actor.
  @MainActor
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []; app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tabs = node("catalog-tabs"), tab = node("catalog-tab-Wrappers")
    for _ in 0..<20 {
      let viewport = tabs.frame.intersection(app.frame)
      if tab.exists && tab.isHittable && viewport.contains(CGPoint(x: tab.frame.midX, y: tab.frame.midY)) { break }
      if tab.exists && !tab.frame.isEmpty && tab.frame.midX < viewport.minX { tabs.swipeRight() }
      else { tabs.swipeLeft() }
    }
    XCTAssertTrue(tab.exists && tab.isHittable && tabs.frame.intersection(app.frame).contains(CGPoint(x: tab.frame.midX, y: tab.frame.midY)))
    tab.tap()
    let navigation = node("root-layout-navigation"), route = node("root-layout-paper")
    XCTAssertTrue(route.waitForExistence(timeout: 12))
    for _ in 0..<20 {
      let viewport = navigation.frame.intersection(app.frame)
      if route.exists && route.isHittable && viewport.contains(CGPoint(x: route.frame.midX, y: route.frame.midY)) { break }
      if !route.frame.isEmpty && route.frame.midX < viewport.minX { navigation.swipeRight() }
      else { navigation.swipeLeft() }
    }
    XCTAssertTrue(route.isHittable && navigation.frame.intersection(app.frame).contains(CGPoint(x: route.frame.midX, y: route.frame.midY)))
    route.tap()
    XCTAssertTrue(node("paper-contract-receipt").waitForExistence(timeout: 12))
    waitFor("The finite scene starts at stage zero") { self.metadata()?["state"] as? Int == 0 }
  }
  @MainActor
  override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0 { capture("paper-ios-failure") }
  }
  private func window(_ value: Any?) -> CGRect? {
    guard let frame = value as? [String: Double],
      let x = frame["x"], let y = frame["y"], let width = frame["width"], let height = frame["height"],
      [x, y, width, height].allSatisfy({ $0.isFinite }), width > 0, height > 0 else { return nil }
    return CGRect(x: x, y: y, width: width, height: height)
  }
  private func jsonFrame(_ frame: CGRect) -> [String: Double] {
    ["x": Double(frame.minX), "y": Double(frame.minY), "width": Double(frame.width), "height": Double(frame.height)]
  }
  private func snapshot(_ element: XCUIElement, name: String, keep: Bool) throws -> PaperPixels {
    let before = element.frame, screenshot = element.screenshot(), after = element.frame
    XCTAssertEqual(before.minX, after.minX, accuracy: 0.5)
    XCTAssertEqual(before.minY, after.minY, accuracy: 0.5)
    XCTAssertEqual(before.width, after.width, accuracy: 0.5)
    XCTAssertEqual(before.height, after.height, accuracy: 0.5)
    if keep {
      let attachment = XCTAttachment(screenshot: screenshot)
      attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    let image = try XCTUnwrap(UIImage(data: screenshot.pngRepresentation)?.cgImage)
    return try XCTUnwrap(PaperPixels(image))
  }
  private func profile(_ expected: Profile) throws -> Double {
    waitFor("The caller must select the actual requested OS Dynamic Type profile") {
      guard let scale = self.metadata()?["fontScale"] as? Double, scale.isFinite else { return false }
      // RN 0.88.1 RCTAccessibilityManager maps the largest category to 3.571.
      return expected == .normal ? abs(scale - 1) <= 0.01 : abs(scale - 3.571) <= 0.002
    }
    return try XCTUnwrap(metadata()?["fontScale"] as? Double)
  }
  private func measured(_ state: Int, after previous: Int) throws -> [String: Any] {
    tap("measure")
    waitFor("Both live refs must answer this explicit, current measurement request") {
      guard let data = self.metadata(), data["state"] as? Int == state,
        let request = data["request"] as? Int, request > previous,
        let receipts = data["receipts"] as? [String: [String: Any]], Set(receipts.keys) == Set(self.keys),
        let refs = data["refs"] as? [String: [String: Any]], Set(refs.keys) == Set(self.keys) else { return false }
      return self.keys.allSatisfy { key in
        receipts[key]?["request"] as? Int == request && receipts[key]?["state"] as? Int == state
          && receipts[key]?["generation"] as? Int == 1 && self.window(receipts[key]?["window"]) != nil
          && refs[key]?["attached"] as? Int == 1 && refs[key]?["cleaned"] as? Int == 0
          && refs[key]?["generation"] as? Int == 1 && refs[key]?["sameRoot"] as? Bool == true
      }
    }
    return try XCTUnwrap(metadata())
  }
  private func checkInput(_ data: [String: Any], _ expected: Stage, scale: Double, touch: [String: Any]) throws {
    XCTAssertEqual(data["schemaVersion"] as? Int, 1)
    XCTAssertEqual(data["count"] as? Int, 1)
    XCTAssertEqual(try XCTUnwrap(data["fontScale"] as? Double), scale, accuracy: 0.001)
    let input = try XCTUnwrap(data["input"] as? [String: Any])
    XCTAssertEqual(input["name"] as? String, expected.name)
    XCTAssertEqual(input["variant"] as? String, expected.variant)
    XCTAssertEqual(input["elevation"] as? Int, expected.elevation)
    XCTAssertEqual(data["sequenceLength"] as? Int, 33)
    XCTAssertEqual(data["customCount"] as? Int, 1)
    for (key, value) in [("square", expected.square), ("dark", expected.dark),
      ("rtl", expected.rtl), ("reset", expected.reset)] { XCTAssertEqual(input[key] as? Bool, value, key) }
    let retained = try XCTUnwrap(data["touch"] as? [String: Any])
    XCTAssertTrue(NSDictionary(dictionary: retained).isEqual(NSDictionary(dictionary: touch)),
      "The original real native touch receipt must remain unchanged")
  }
  private func expectedRGB(_ stage: Stage) -> [Int] {
    if stage.reset { return [36, 52, 71] }
    if !stage.dark { return [255, 255, 255] }
    let channel = Int((18 + 237 * overlayAlphas[stage.elevation]).rounded())
    return [channel, channel, channel]
  }
  private func run(_ expectedProfile: Profile) throws {
    let scale = try profile(expectedProfile)
    XCTAssertEqual(metadata()?["count"] as? Int, 0)
    XCTAssertEqual(metadata()?["customCount"] as? Int, 0)
    XCTAssertEqual(node("paper-contract-counter").label, "Count 0")
    XCTAssertEqual(node("paper-contract-customtouch").label, "Custom 0")
    tap("counter")
    waitFor("One retained stock input press") { self.metadata()?["count"] as? Int == 1 && self.node("paper-contract-counter").label == "Count 1" }
    tap("customtouch")
    waitFor("One custom input press and original native onTouchEnd") {
      guard self.metadata()?["customCount"] as? Int == 1,
        self.node("paper-contract-customtouch").label == "Custom 1",
        let touch = self.metadata()?["touch"] as? [String: Any], touch["count"] as? Int == 1,
        let target = touch["target"] as? Int, target > 0 else { return false }
      return ["pageX", "pageY", "timestamp"].allSatisfy { key in
        guard let value = touch[key] as? Double else { return false }; return value.isFinite && value >= 0
      }
    }
    let touch = try XCTUnwrap(metadata()?["touch"] as? [String: Any])
    let viewport = try XCTUnwrap(metadata()?["windowProfile"] as? [String: Double])
    var previous = 0
    for (index, stage) in stages.enumerated() {
      waitFor("The expected Paper stage commits") { self.metadata()?["state"] as? Int == index }
      let data = try measured(index, after: previous)
      previous = try XCTUnwrap(data["request"] as? Int)
      try checkInput(data, stage, scale: scale, touch: touch)
      XCTAssertTrue(NSDictionary(dictionary: try XCTUnwrap(data["windowProfile"] as? [String: Double])).isEqual(NSDictionary(dictionary: viewport)), "No silent viewport/profile change")
      let receipts = try XCTUnwrap(data["receipts"] as? [String: [String: Any]])
      let rgb = expectedRGB(stage), keep = [0, 1, 2, 3, 4, 5, 12, 20, 28, 29, 30, 31, 32].contains(index)
      var native: [String: Any] = [:]
      for key in keys {
        let parent = reveal("paper-contract-" + key + "-frame"), root = node("paper-contract-" + key)
        let actual = root.frame, frame = parent.frame
        XCTAssertTrue(root.exists && !actual.isEmpty && !actual.isInfinite && !actual.isNull)
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "paper-contract-" + key).count, 1)
        let measured = try XCTUnwrap(window(receipts[key]?["window"]))
        // Reveal scrolls after measurement; compare fresh dimensions and current
        // AX root/parent geometry, never stale window origins or UIView identity.
        XCTAssertEqual(actual.width, measured.width, accuracy: 1)
        XCTAssertEqual(actual.height, measured.height, accuracy: 1)
        XCTAssertEqual(actual.minX, frame.minX + 24, accuracy: 1)
        XCTAssertEqual(actual.minY, frame.minY + 24, accuracy: 1)
        XCTAssertEqual(actual.width, frame.width - 48, accuracy: 1)
        XCTAssertGreaterThanOrEqual(actual.height, 87)
        let control = node("paper-contract-" + (key == "stock" ? "counter" : "customtouch"))
        XCTAssertTrue(control.exists && control.isHittable)
        XCTAssertEqual(control.label, key == "stock" ? "Count 1" : "Custom 1")
        let child = control.frame, inset: CGFloat = stage.reset ? 0 : 16 + (stage.variant == "outlined" ? 1 : 0)
        XCTAssertEqual(child.minX, actual.minX + inset, accuracy: 1)
        XCTAssertEqual(child.width, actual.width - inset * 2, accuracy: 1)
        XCTAssertEqual(child.midY, actual.midY, accuracy: 1)
        XCTAssertGreaterThanOrEqual(child.width, 43); XCTAssertGreaterThanOrEqual(child.height, 43)
        XCTAssertEqual(actual.height, max(88, child.height + inset * 2), accuracy: 1, "Intrinsic height must include the scaled child and vertical padding/border")
        XCTAssertGreaterThanOrEqual(child.minY, actual.minY + inset - 1)
        XCTAssertLessThanOrEqual(child.maxY, actual.maxY - inset + 1)
        let pixels = try snapshot(root, name: "paper-ios-\(expectedProfile.rawValue)-\(stage.name)-\(key)", keep: keep)
        let sx = CGFloat(pixels.width) / actual.width, sy = CGFloat(pixels.height) / actual.height
        XCTAssertGreaterThan(sx, 0); XCTAssertEqual(sx, sy, accuracy: 0.03)
        let x = Int((8 * sx).rounded()), y = Int(((stage.reset ? 2 : 8) * sy).rounded())
        let right = pixels.width - 1 - x, bottom = pixels.height - 1 - y, center = (pixels.width - 1) / 2
        let points = [(x, y), (center, y), (right, y), (x, bottom), (right, bottom)]
        var samples: [[String: Any]] = []
        for (px, py) in points {
          XCTAssertTrue(px >= 0 && py >= 0 && px < pixels.width && py < pixels.height)
          let color = pixels.rgba(x: px, y: py)
          XCTAssertEqual(color[3], 255)
          for channel in 0..<3 { XCTAssertLessThanOrEqual(abs(color[channel] - rgb[channel]), 3, "Source-derived composited Paper interior color") }
          samples.append(["x": px, "y": py, "rgba": color])
        }
        // The frame contrasts with every authored Paper surface. These finite
        // corner observations distinguish rounded from square/reset paint;
        // they do not reconstruct an arbitrary physical corner-radius value.
        let corners = [(0, 0), (pixels.width - 1, 0), (0, pixels.height - 1), (pixels.width - 1, pixels.height - 1)]
        var cornerEvidence: [[String: Any]] = []
        for (cx, cy) in corners {
          let color = pixels.rgba(x: cx, y: cy)
          XCTAssertEqual(color[3], 255)
          let delta = (0..<3).map { abs(color[$0] - rgb[$0]) }.max() ?? 0
          if stage.square || stage.reset { XCTAssertLessThanOrEqual(delta, 3, "Square/reset corners must show the authored surface") }
          else if stage.variant == "outlined" || stage.elevation == 0 {
            // These cases have no shadow. A square outlined corner is gray224,
            // which differs from white but is not the actual frame cutout.
            let frameRGB = stage.dark ? [11, 16, 22] : [214, 227, 237]
            for channel in 0..<3 { XCTAssertLessThanOrEqual(abs(color[channel] - frameRGB[channel]), 3, "No-shadow rounded corners must reveal the authored frame") }
          } else { XCTAssertGreaterThanOrEqual(delta, 4, "Rounded corners must reveal the contrasting outer frame; shadowed cutouts do not reconstruct an exact radius") }
          cornerEvidence.append(["x": cx, "y": cy, "rgba": color, "surfaceDelta": delta])
        }
        var outlineEvidence: [String: Any] = [:]
        if stage.variant == "outlined" {
          // The one-pixel width allowance below is bounded to the existing3x
          // simulator. Lower densities need their own distinguishable bounds.
          XCTAssertGreaterThanOrEqual(sy, 2.9)
          // The source one-point12%black edge over white is224/255. Count
          // full-color pixels across a short native-resolution top-center band.
          var edgeRows: [Int] = []
          for py in 0..<min(pixels.height, Int(ceil(sy * 3))) {
            let color = pixels.rgba(x: center, y: py)
            if color[3] == 255 && (0..<3).allSatisfy({ abs(color[$0] - 224) <= 12 }) { edgeRows.append(py) }
          }
          XCTAssertGreaterThanOrEqual(edgeRows.count, max(1, Int(floor(sy)) - 1))
          XCTAssertLessThanOrEqual(edgeRows.count, Int(ceil(sy)) + 1, "A doubled border must not pass the width check")
          XCTAssertLessThanOrEqual((edgeRows.last ?? 0) - (edgeRows.first ?? 0) + 1, Int(ceil(sy)) + 1)
          outlineEvidence = ["method": "composited-top-center-gray-band", "rows": edgeRows, "pixelScaleY": Double(sy)]
        }
        var observed: [String: Any] = ["frame": jsonFrame(actual), "parent": jsonFrame(frame), "child": jsonFrame(child),
          "method": "public-XCUI-composited-PNG-interior-samples", "widthPx": pixels.width, "heightPx": pixels.height, "samples": samples, "corners": cornerEvidence, "outline": outlineEvidence]
        if key == "stock" {
          let glyph = try snapshot(control, name: "paper-ios-\(expectedProfile.rawValue)-\(stage.name)-counter", keep: false)
          let ink = glyph.inkBounds(points: child.size, background: rgb)
          let cap = UIFont.systemFont(ofSize: 14 * scale).capHeight
          XCTAssertFalse(ink.isNull); XCTAssertEqual(ink.height, cap, accuracy: 2, "Actual digit ink follows native OS scaling")
          let foreground = glyph.peak([CGRect(origin: .zero, size: child.size)], points: child.size, background: rgb[0])
          XCTAssertGreaterThan(foreground.delta, 100)
          XCTAssertTrue(foreground.color.allSatisfy { abs($0 - (stage.dark ? 255 : 33)) <= 40 })
          observed["counterInk"] = ["frame": jsonFrame(ink), "rgb": foreground.color]
        }
        native[key] = observed
      }
      let evidence: [String: Any] = ["schemaVersion": 1, "profile": expectedProfile.rawValue, "stage": stage.name,
        "metadata": data, "native": native, "identityEvidence": "forwarded-ref lifecycle and retained child; XCUI exposes no native View tag",
        "paintLimit": "Composited interior colors, not calibrated GPU shadow or unique alpha reconstruction"]
      let bytes = try JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys])
      let attachment = XCTAttachment(data: bytes, uniformTypeIdentifier: "public.json")
      attachment.name = "paper-ios-\(expectedProfile.rawValue)-\(stage.name)-evidence"; attachment.lifetime = .keepAlways; add(attachment)
      if index < stages.count - 1 { tap("next") }
    }
    XCTAssertEqual(metadata()?["state"] as? Int, 32)
    XCTAssertEqual(metadata()?["count"] as? Int, 1); XCTAssertEqual(metadata()?["customCount"] as? Int, 1)
  }
  func testAllThirtyThreeStagesAtNormalDynamicType() throws { try run(.normal) }
  func testAllThirtyThreeStagesAtEnlargedDynamicType() throws { try run(.enlarged) }

}

/// Small public-PNG oracle; no UIKit/private hierarchy or Android paint APIs.
private struct PaperPixels {
  let width: Int, height: Int
  private let bytes: [UInt8]
  init?(_ image: CGImage) {
    let imageWidth = image.width, imageHeight = image.height
    guard imageWidth > 0 && imageHeight > 0 else { return nil }
    var rgba = [UInt8](repeating: 0, count: imageWidth * imageHeight * 4)
    let rendered = rgba.withUnsafeMutableBytes { buffer -> Bool in
      guard let context = CGContext(data: buffer.baseAddress, width: imageWidth, height: imageHeight,
        bitsPerComponent: 8, bytesPerRow: imageWidth * 4, space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight)); return true
    }
    guard rendered else { return nil }; width = imageWidth; height = imageHeight; bytes = rgba
  }
  func rgba(x: Int, y: Int) -> [Int] {
    let offset = (y * width + x) * 4
    return (0..<4).map { Int(bytes[offset + $0]) }
  }
  func inkBounds(points: CGSize, background: [Int]) -> CGRect {
    guard points.width > 0, points.height > 0, background.count == 3 else { return .null }
    var left = width, top = height, right = -1, bottom = -1
    for y in 0..<height { for x in 0..<width {
      let color = rgba(x: x, y: y)
      if color[3] == 255 && (0..<3).contains(where: { abs(color[$0] - background[$0]) > 30 }) {
        left = min(left, x); right = max(right, x); top = min(top, y); bottom = max(bottom, y)
      }
    }}
    guard right >= left, bottom >= top else { return .null }
    return CGRect(x: CGFloat(left) * points.width / CGFloat(width), y: CGFloat(top) * points.height / CGFloat(height),
      width: CGFloat(right - left + 1) * points.width / CGFloat(width), height: CGFloat(bottom - top + 1) * points.height / CGFloat(height))
  }
  func peak(_ regions: [CGRect], points: CGSize, background: Int) -> (delta: Int, color: [Int], samples: Int, opaque: Int) {
    var delta = 0, chosen = [background, background, background], samples = 0, opaque = 0
    guard points.width.isFinite, points.height.isFinite, points.width > 0, points.height > 0 else { return (delta, chosen, samples, opaque) }
    let sx = CGFloat(width) / points.width, sy = CGFloat(height) / points.height
    for region in regions {
      guard !region.isNull, !region.isInfinite,
        [region.minX, region.minY, region.maxX, region.maxY].allSatisfy({ $0.isFinite }) else { continue }
      let x0 = max(0, min(width, Int(floor(region.minX * sx))))
      let x1 = max(x0, min(width, Int(ceil(region.maxX * sx))))
      let y0 = max(0, min(height, Int(floor(region.minY * sy))))
      let y1 = max(y0, min(height, Int(ceil(region.maxY * sy))))
      for y in y0..<y1 { for x in x0..<x1 {
        samples += 1
        if bytes[(y * width + x) * 4 + 3] < 245 { continue }; opaque += 1
        let rgb = Array(rgba(x: x, y: y).prefix(3)), distance = rgb.map { abs($0 - background) }.max() ?? 0
        if distance > delta { delta = distance; chosen = rgb }
      } }
    }
    return (delta, chosen, samples, opaque)
  }
}
