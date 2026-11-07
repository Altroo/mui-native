/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/// Run each method under its externally selected, restored OS text profile.
/// AX supplies frames, not native View tags or Android retained-layer paint data.
@MainActor
final class DividerCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["plain", "label", "paint", "custom"]
  private enum Profile: String { case normal, enlarged }
  private struct Stage {
    let name: String
    var variant = "fullWidth"
    var vertical = false, flexItem = false
    var align = "center"
    var dark = false, rtl = false, reset = false
  }
  private let stages = [
    Stage(name: "default"), Stage(name: "inset", variant: "inset"),
    Stage(name: "middle", variant: "middle"), Stage(name: "vertical", vertical: true),
    Stage(name: "vertical-flex", variant: "middle", vertical: true, flexItem: true),
    Stage(name: "left", align: "left"), Stage(name: "right", align: "right"),
    Stage(name: "dark", dark: true),
    Stage(name: "rtl-left", variant: "inset", align: "left", dark: true, rtl: true),
    Stage(name: "rtl-right", variant: "middle", align: "right", dark: true, rtl: true),
    Stage(name: "native-reset", reset: true), Stage(name: "restored"),
  ]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    let receipt = node("divider-contract-receipt")
    guard receipt.exists, let bytes = receipt.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any]
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 12)
    if result != .completed { capture("divider-ios-wait-failure") }
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
      let topControl = id == "divider-contract-measure" || id == "divider-contract-next"
      let unknown = topControl || attempt >= 12 ? -viewport.height : viewport.height
      let delta = known ? target.frame.midY - viewport.midY : unknown
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    if !reached() { capture("divider-ios-unreachable-" + id) }
    XCTAssertTrue(reached(), "The actual native target must be fully visible: " + id)
    return target
  }
  private func tap(_ key: String) { reveal("divider-contract-" + key, hit: true).tap() }
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
    let navigation = node("root-layout-navigation"), route = node("root-layout-divider")
    XCTAssertTrue(route.waitForExistence(timeout: 12))
    for _ in 0..<20 {
      let viewport = navigation.frame.intersection(app.frame)
      if route.exists && route.isHittable && viewport.contains(CGPoint(x: route.frame.midX, y: route.frame.midY)) { break }
      if !route.frame.isEmpty && route.frame.midX < viewport.minX { navigation.swipeRight() }
      else { navigation.swipeLeft() }
    }
    XCTAssertTrue(route.isHittable && navigation.frame.intersection(app.frame).contains(CGPoint(x: route.frame.midX, y: route.frame.midY)))
    route.tap()
    XCTAssertTrue(node("divider-contract-receipt").waitForExistence(timeout: 12))
    waitFor("The finite scene starts at stage zero") { self.metadata()?["state"] as? Int == 0 }
  }
  @MainActor
  override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0 { capture("divider-ios-failure") }
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
  private func snapshot(_ element: XCUIElement, name: String, keep: Bool) throws -> DividerPixels {
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
    return try XCTUnwrap(DividerPixels(image))
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
    waitFor("All four live refs must answer this explicit, current measurement request") {
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
    XCTAssertEqual(input["align"] as? String, expected.align)
    for (key, value) in [("vertical", expected.vertical), ("flexItem", expected.flexItem),
      ("dark", expected.dark), ("rtl", expected.rtl), ("reset", expected.reset)] {
      XCTAssertEqual(input[key] as? Bool, value, key)
    }
    let retained = try XCTUnwrap(data["touch"] as? [String: Any])
    XCTAssertTrue(NSDictionary(dictionary: retained).isEqual(NSDictionary(dictionary: touch)),
      "The original real native touch receipt must remain unchanged")
  }
  private func run(_ expectedProfile: Profile) throws {
    let scale = try profile(expectedProfile)
    XCTAssertEqual(metadata()?["count"] as? Int, 0)
    XCTAssertEqual(node("divider-contract-counter").label, "Count 0")
    tap("counter")
    waitFor("The retained child acknowledges one real native press") {
      self.metadata()?["count"] as? Int == 1 && self.node("divider-contract-counter").label == "Count 1"
    }
    tap("custom")
    waitFor("The public custom View root receives a real onTouchEnd event") {
      guard let touch = self.metadata()?["touch"] as? [String: Any], touch["count"] as? Int == 1,
        let target = touch["target"] as? Int, target > 0 else { return false }
      return ["pageX", "pageY", "timestamp"].allSatisfy { key in
        guard let value = touch[key] as? Double else { return false }
        return value.isFinite && value >= 0
      }
    }
    let touch = try XCTUnwrap(metadata()?["touch"] as? [String: Any])
    var previous = 0
    for (index, stage) in stages.enumerated() {
      waitFor("The expected finite stage must commit") { self.metadata()?["state"] as? Int == index }
      let data = try measured(index, after: previous)
      previous = try XCTUnwrap(data["request"] as? Int)
      try checkInput(data, stage, scale: scale, touch: touch)
      let receipts = try XCTUnwrap(data["receipts"] as? [String: [String: Any]])
      var native: [String: Any] = [:]
      for key in keys {
        _ = reveal("divider-contract-frame-" + key)
        let root = node("divider-contract-" + key), actual = root.frame
        let parent = node("divider-contract-frame-" + key).frame
        let measured = try XCTUnwrap(window(receipts[key]?["window"]))
        XCTAssertTrue(root.exists && !actual.isEmpty && !actual.isInfinite && !actual.isNull)
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "divider-contract-" + key).count, 1,
          "Each test ID must identify exactly one actual root")
        // Scroll gestures change window origins after measurement. Dimensions
        // still associate each fresh request with an independent live AX root.
        XCTAssertEqual(actual.width, measured.width, accuracy: 1)
        XCTAssertEqual(actual.height, measured.height, accuracy: 1)
        native[key] = ["frame": jsonFrame(actual), "parent": jsonFrame(parent), "sampledAfterReveal": true]
        if key == "custom" {
          XCTAssertGreaterThanOrEqual(actual.width, 44)
          XCTAssertGreaterThanOrEqual(actual.height, 44)
        }
        if key == "plain" {
          let picture = try snapshot(node("divider-contract-frame-plain"),
            name: "divider-ios-\(expectedProfile.rawValue)-\(stage.name)-plain", keep: [0, 4, 7, 8, 10, 11].contains(index))
          let sx = CGFloat(picture.width) / parent.width, sy = CGFloat(picture.height) / parent.height
          XCTAssertGreaterThan(sx, 0); XCTAssertEqual(sx, sy, accuracy: 0.03)
          XCTAssertTrue(DividerPixels.onePoint(stage.vertical ? actual.width : actual.height,
            scale: stage.vertical ? sx : sy), "A doubled separator must not pass a broad frame tolerance")
          let inset: CGFloat = stage.variant == "inset" ? 72 : stage.variant == "middle" ? 16 : 0
          if stage.vertical {
            XCTAssertEqual(actual.height, parent.height - (stage.variant == "middle" ? 16 : 0), accuracy: 1)
            XCTAssertEqual(actual.minY, parent.minY + (stage.variant == "middle" ? 8 : 0), accuracy: 1)
          } else {
            XCTAssertEqual(actual.minX, parent.minX + inset, accuracy: 1)
            XCTAssertEqual(actual.width, parent.width - (stage.variant == "inset" ? 72 : inset * 2), accuracy: 1)
          }
          let background = stage.dark ? 18 : 255
          XCTAssertTrue(picture.color(x: 0, y: 0).allSatisfy { abs($0 - background) <= 3 })
          let relative = actual.offsetBy(dx: -parent.minX, dy: -parent.minY)
          let sample = stage.vertical
            ? CGRect(x: relative.minX - 1, y: relative.minY + relative.height * 0.25, width: relative.width + 2, height: relative.height * 0.5)
            : CGRect(x: relative.minX + relative.width * 0.25, y: relative.minY - 1, width: relative.width * 0.5, height: relative.height + 2)
          let line = picture.peak([sample], points: parent.size, background: background)
          XCTAssertGreaterThan(line.samples, 0); XCTAssertEqual(line.opaque, line.samples)
          let expected = stage.dark ? 46 : 224 // Source palette's 12% stroke composited over this scene background.
          XCTAssertTrue(line.color.allSatisfy { abs($0 - expected) <= 10 }, "Actual iOS separator palette pixels")
          native["plainPixels"] = ["method": "public-XCUI-composited-PNG", "scaleX": Double(sx), "scaleY": Double(sy), "rgb": line.color]
        }
      }
      _ = reveal("divider-contract-label")
      let counter = reveal("divider-contract-counter", hit: true)
      let label = node("divider-contract-label").frame, counterFrame = counter.frame
      XCTAssertEqual(counter.label, "Count 1")
      XCTAssertGreaterThanOrEqual(counterFrame.height, max(44, UIFont.systemFont(ofSize: 14 * scale).lineHeight) - 1.5)
      XCTAssertTrue(label.insetBy(dx: -1, dy: -1).contains(counterFrame))
      let before = counterFrame.minX - label.minX, after = label.maxX - counterFrame.maxX
      if stage.align == "center" { XCTAssertEqual(before, after, accuracy: 2) }
      else if (stage.align == "left") != stage.rtl { XCTAssertLessThan(before, after) }
      else { XCTAssertGreaterThan(before, after) }
      let counterPixels = try snapshot(counter, name: "divider-ios-\(expectedProfile.rawValue)-\(stage.name)-counter", keep: index == 7)
      let foreground = counterPixels.peak([CGRect(origin: .zero, size: counterFrame.size)], points: counterFrame.size,
        background: stage.dark ? 18 : 255)
      XCTAssertGreaterThan(foreground.delta, 100, "The actual counter glyph must remain visible in dark mode")
      XCTAssertTrue(foreground.color.allSatisfy { abs($0 - (stage.dark ? 255 : 33)) <= 40 })
      let paint = reveal("divider-contract-paint")
      let pixels = try snapshot(paint, name: "divider-ios-\(expectedProfile.rawValue)-\(stage.name)-reset", keep: [0, 10, 11].contains(index))
      // The authored Ink label is centered; sample only outer bands in the
      // center strip. This is composited screenshot evidence, not Android's
      // draw-with-native-text-excluded raster or a physical View identifier.
      let width = paint.frame.width, height = paint.frame.height
      XCTAssertGreaterThan(width, 40); XCTAssertGreaterThan(height, 0)
      let edges = [CGRect(x: 2, y: height / 2 - 2, width: 6, height: 4),
        CGRect(x: width - 8, y: height / 2 - 2, width: 6, height: 4)]
      var edgeEvidence: [[String: Any]] = []
      for (side, edge) in edges.enumerated() {
        let border = pixels.peak([edge], points: paint.frame.size, background: stage.dark ? 18 : 255)
        XCTAssertGreaterThan(border.samples, 0); XCTAssertEqual(border.opaque, border.samples)
        if stage.reset {
          XCTAssertGreaterThan(border.delta, 12, "Native solid reset must restore each decorative side: \(side)")
        } else {
          XCTAssertLessThanOrEqual(border.delta, 3, "CSS none must suppress each decorative side: \(side)")
        }
        edgeEvidence.append(["side": side == 0 ? "left" : "right", "delta": border.delta, "rgb": border.color])
      }
      native["counter"] = ["frame": jsonFrame(counterFrame), "rgb": foreground.color]
      native["paintEdges"] = ["method": "public-XCUI-composited-PNG-edge-samples", "sides": edgeEvidence]
      let evidence: [String: Any] = ["schemaVersion": 1, "profile": expectedProfile.rawValue, "stage": stage.name,
        "metadata": data, "native": native, "identityEvidence": "forwarded-ref lifecycle and retained child; XCUI exposes no native View tag"]
      let bytes = try JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys])
      let attachment = XCTAttachment(data: bytes, uniformTypeIdentifier: "public.json")
      attachment.name = "divider-ios-\(expectedProfile.rawValue)-\(stage.name)-evidence"
      attachment.lifetime = .keepAlways; add(attachment)
      if index < stages.count - 1 { tap("next") }
    }
    XCTAssertEqual(metadata()?["state"] as? Int, 11)
    XCTAssertEqual(metadata()?["count"] as? Int, 1)
    capture("divider-ios-\(expectedProfile.rawValue)-restored")
  }
  func testAllTwelveStagesAtNormalDynamicType() throws { try run(.normal) }
  func testAllTwelveStagesAtEnlargedDynamicType() throws { try run(.enlarged) }
}

/// Small public-PNG oracle; no UIKit/private hierarchy or Android paint APIs.
private struct DividerPixels {
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
  static func onePoint(_ length: CGFloat, scale: CGFloat) -> Bool {
    let pixels = length * scale, rounded = pixels.rounded()
    return length.isFinite && scale.isFinite && scale > 0 && rounded > 0
      && abs(pixels - rounded) <= 0.02 && rounded >= floor(scale) && rounded <= ceil(scale)
  }
  func color(x: Int, y: Int) -> [Int] {
    let offset = (y * width + x) * 4
    return (0..<3).map { Int(bytes[offset + $0]) }
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
        let rgb = color(x: x, y: y), distance = rgb.map { abs($0 - background) }.max() ?? 0
        if distance > delta { delta = distance; chosen = rgb }
      } }
    }
    return (delta, chosen, samples, opaque)
  }
}
