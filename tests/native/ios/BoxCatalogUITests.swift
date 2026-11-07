import UIKit
/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Finite native frame, composited paint and inherited-text observations.
/// Ref leases are React evidence; XCUI exposes no UIView pointer identity.
@MainActor
final class BoxCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["stock", "custom", "styled"]
  private enum Profile: String { case normal, enlarged }
  private struct Spec {
    let left, right, top, bottom, marginLeft, marginRight, border: CGFloat
    let background, foreground: String
    let fontSize, lineHeight: CGFloat
    init(
      _ l: CGFloat, _ r: CGFloat, _ t: CGFloat, _ b: CGFloat, _ ml: CGFloat, _ mr: CGFloat,
      _ border: CGFloat, _ background: String, _ foreground: String, _ font: CGFloat,
      _ line: CGFloat
    ) {
      left = l
      right = r
      top = t
      bottom = b
      marginLeft = ml
      marginRight = mr
      self.border = border
      self.background = background
      self.foreground = foreground
      fontSize = font
      lineHeight = line
    }
  }
  private struct Stage {
    let name: String
    let specs: [Spec]
  }
  // Authored native inputs from the finite scene, not values reported by JS paint.
  private let stages: [Stage] = [
    Stage(
      name: "default",
      specs: [
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
    Stage(
      name: "ignored-config",
      specs: [
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
    Stage(
      name: "sx-array",
      specs: [
        Spec(16, 16, 16, 16, 0, 0, 0, "#1565c0", "#ffffff", 18, 26),
        Spec(16, 16, 16, 16, 0, 0, 0, "#1565c0", "#ffffff", 18, 26),
        Spec(16, 16, 16, 16, 0, 0, 2, "#0b5d44", "#ffffff", 18, 26),
      ]),
    Stage(
      name: "inline-final",
      specs: [
        Spec(4, 4, 4, 4, 0, 0, 0, "#243447", "#f5f7fa", 20, 28),
        Spec(4, 4, 4, 4, 0, 0, 0, "#243447", "#f5f7fa", 20, 28),
        Spec(4, 4, 4, 4, 0, 0, 2, "#243447", "#f5f7fa", 20, 28),
      ]),
    Stage(
      name: "div-alias",
      specs: [
        Spec(8, 8, 8, 8, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(8, 8, 8, 8, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(8, 8, 8, 8, 0, 0, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
    Stage(
      name: "rtl-physical",
      specs: [
        Spec(24, 8, 0, 0, 12, 4, 0, "#ffffff", "#203247", 16, 24),
        Spec(24, 8, 0, 0, 12, 4, 0, "#ffffff", "#203247", 16, 24),
        Spec(24, 8, 0, 0, 12, 4, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
    Stage(
      name: "text-inheritance",
      specs: [
        Spec(8, 8, 8, 8, 0, 0, 0, "#ffffff", "#7542a6", 24, 32),
        Spec(8, 8, 8, 8, 0, 0, 0, "#ffffff", "#7542a6", 24, 32),
        Spec(8, 8, 8, 8, 0, 0, 2, "#e8f0fa", "#7542a6", 24, 32),
      ]),
    Stage(
      name: "ancestor-styled",
      specs: [
        Spec(20, 0, 0, 0, 0, 0, 0, "#ffffff", "#6a1b9a", 16, 24),
        Spec(20, 0, 0, 0, 0, 0, 0, "#ffffff", "#6a1b9a", 16, 24),
        Spec(20, 0, 0, 0, 0, 0, 2, "#e8f0fa", "#6a1b9a", 16, 24),
      ]),
    Stage(
      name: "explicit-theme",
      specs: [
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#27384a", "#f5f7fa", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
    Stage(
      name: "native-reset",
      specs: [
        Spec(0, 0, 0, 0, 0, 0, 0, "#243447", "#f5f7fa", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#243447", "#f5f7fa", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#243447", "#f5f7fa", 16, 24),
      ]),
    Stage(
      name: "restored",
      specs: [
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 0, "#ffffff", "#203247", 16, 24),
        Spec(0, 0, 0, 0, 0, 0, 2, "#e8f0fa", "#203247", 16, 24),
      ]),
  ]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    guard node("box-contract-receipt").exists,
      let data = node("box-contract-receipt").label.data(using: .utf8)
    else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
    if let receipt = metadata(),
      let data = try? JSONSerialization.data(withJSONObject: receipt, options: [.sortedKeys])
    {
      let text = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      text.name = name + "-receipt"
      text.lifetime = .keepAlways
      add(text)
    }
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let value = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [value], timeout: 12)
    if result != .completed { capture("box-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func visible(_ element: XCUIElement, inside viewport: CGRect) -> Bool {
    let f = element.frame
    return element.exists && !f.isEmpty && !f.isInfinite && !f.isNull && viewport.contains(f)
  }
  private func reveal(_ id: String, hit: Bool = false) -> XCUIElement {
    let target = node(id)
    let scroll = node("root-layout-scroll")
    for attempt in 0..<24 {
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 4, dy: 4)
      if visible(target, inside: viewport) && (!hit || target.isHittable) { return target }
      XCTAssertGreaterThan(viewport.height, 48)
      let known = target.exists && !target.frame.isEmpty
      let top = id == "box-contract-next" || id == "box-contract-measure"
      let unknown: CGFloat = top || attempt >= 12 ? -viewport.height : viewport.height
      let delta = known ? target.frame.midY - viewport.midY : unknown
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(
        CGVector(dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(
        CGVector(
          dx: viewport.midX - app.frame.minX,
          dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    capture("box-ios-unreachable-" + id)
    XCTFail("Actual native target is not fully visible: " + id)
    return target
  }
  private func tab(_ id: String, in stripID: String) {
    let target = node(id)
    let strip = node(stripID)
    XCTAssertTrue(target.waitForExistence(timeout: 20))
    for _ in 0..<24 {
      let viewport = strip.frame.intersection(app.frame)
      if target.isHittable && viewport.contains(CGPoint(x: target.frame.midX, y: target.frame.midY))
      {
        target.tap()
        return
      }
      if target.exists && !target.frame.isEmpty && target.frame.midX < viewport.minX {
        strip.swipeRight()
      } else {
        strip.swipeLeft()
      }
    }
    XCTFail("Navigation target is not reachable: " + id)
  }
  @MainActor override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    tab("catalog-tab-Wrappers", in: "catalog-tabs")
    tab("root-layout-box", in: "root-layout-navigation")
    XCTAssertTrue(node("box-contract-receipt").waitForExistence(timeout: 12))
    waitFor("Fresh Box scene must start at zero") { self.metadata()?["state"] as? Int == 0 }
  }
  @MainActor override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0 { capture("box-ios-failure") }
  }
  private func rect(_ value: Any?) -> CGRect? {
    guard let data = value as? [String: Double], let x = data["x"], let y = data["y"],
      let w = data["width"], let h = data["height"], [x, y, w, h].allSatisfy({ $0.isFinite }),
      w > 0, h > 0
    else { return nil }
    return CGRect(x: x, y: y, width: w, height: h)
  }
  private func frameJSON(_ f: CGRect) -> [String: Double] {
    [
      "x": Double(f.minX), "y": Double(f.minY), "width": Double(f.width),
      "height": Double(f.height),
    ]
  }
  private func measured(_ state: Int, after previous: Int) throws -> [String: Any] {
    reveal("box-contract-measure", hit: true).tap()
    waitFor("All six live refs must answer this fresh measurement") {
      guard let d = self.metadata(), d["scenario"] as? String == "box-v1",
        d["state"] as? Int == state,
        let request = d["request"] as? Int, request > previous,
        let roots = d["receipts"] as? [String: [String: Any]],
        let texts = d["textReceipts"] as? [String: [String: Any]],
        Set(roots.keys) == Set(self.keys), Set(texts.keys) == Set(self.keys)
      else { return false }
      return self.keys.allSatisfy { k in
        [roots[k], texts[k]].allSatisfy { r in
          r?["request"] as? Int == request && r?["state"] as? Int == state
            && r?["generation"] as? Int == 1 && self.rect(r?["window"]) != nil
        }
      }
    }
    return try XCTUnwrap(metadata())
  }
  private func rgb(_ hex: String) -> [Int] {
    let n = Int(hex.dropFirst(), radix: 16)!
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  private func snapshot(_ element: XCUIElement, name: String) throws -> BoxPixels {
    let before = element.frame
    let image = element.screenshot()
    let after = element.frame
    XCTAssertEqual(before.minX, after.minX, accuracy: 0.5)
    XCTAssertEqual(before.minY, after.minY, accuracy: 0.5)
    XCTAssertEqual(before.width, after.width, accuracy: 0.5)
    XCTAssertEqual(before.height, after.height, accuracy: 0.5)
    let attachment = XCTAttachment(screenshot: image)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    return try XCTUnwrap(BoxPixels(try XCTUnwrap(UIImage(data: image.pngRepresentation)?.cgImage)))
  }
  /// An independent UIKit raster of the same literal detects a previous font
  /// size even when the native line-height rectangle has already updated.
  private func referenceGlyphPixelHeight(
    fontSize: CGFloat, lineHeight: CGFloat, pixelScale: CGFloat
  )
    throws -> CGFloat
  {
    let font = UIFont.systemFont(ofSize: fontSize)
    let paragraph = NSMutableParagraphStyle()
    paragraph.minimumLineHeight = lineHeight
    paragraph.maximumLineHeight = lineHeight
    let attributes: [NSAttributedString.Key: Any] = [
      .font: font, .foregroundColor: UIColor.black, .paragraphStyle: paragraph,
    ]
    let natural = ("Copy" as NSString).size(withAttributes: attributes)
    let size = CGSize(
      width: ceil(natural.width) + 16, height: ceil(max(font.lineHeight, lineHeight)) + 16)
    let format = UIGraphicsImageRendererFormat()
    format.scale = pixelScale
    // Cropped XCUI frames can produce a fractional pixel scale. An opaque
    // renderer leaves a dark rounding fringe outside the logical white fill;
    // a transparent canvas keeps that fringe out of the opaque-ink predicate.
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    let blank = renderer.image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: size))
    }
    let blankPixels = try XCTUnwrap(BoxPixels(try XCTUnwrap(blank.cgImage)))
    XCTAssertTrue(
      blankPixels.ink(points: size, background: [255, 255, 255]).bounds.isNull,
      "An empty reference canvas must not contribute glyph ink")
    let image = renderer.image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: size))
      ("Copy" as NSString).draw(
        in: CGRect(x: 8, y: 8, width: size.width - 16, height: size.height - 16),
        withAttributes: attributes)
    }
    let reference = XCTAttachment(image: image)
    reference.name = "box-reference-Copy-\(fontSize)-\(lineHeight)"
    reference.lifetime = .keepAlways
    add(reference)
    let pixels = try XCTUnwrap(BoxPixels(try XCTUnwrap(image.cgImage)))
    let ink = pixels.ink(
      points: CGSize(width: pixels.width, height: pixels.height), background: [255, 255, 255])
    XCTAssertFalse(ink.bounds.isNull)
    return ink.bounds.height
  }
  private func run(_ profile: Profile) throws {
    waitFor("The caller must select the requested actual OS text profile") {
      guard let s = self.metadata()?["fontScale"] as? Double, s.isFinite else { return false }
      return profile == .normal ? abs(s - 1) < 0.01 : abs(s - 3.571) < 0.002
    }
    let scale = try XCTUnwrap(metadata()?["fontScale"] as? Double)
    for key in keys {
      XCTAssertEqual((metadata()?["counts"] as? [String: Int])?[key], 0)
      let counter = reveal("box-contract-" + key + "-counter", hit: true)
      XCTAssertEqual(counter.label, key + " 0")
      counter.tap()
      waitFor("A real retained counter press must reach React") {
        (self.metadata()?["counts"] as? [String: Int])?[key] == 1
          && self.node("box-contract-" + key + "-counter").label == key + " 1"
      }
    }
    let touch = try XCTUnwrap(metadata()?["touch"] as? [String: Any])
    XCTAssertEqual(touch["count"] as? Int, 1)
    XCTAssertGreaterThan(try XCTUnwrap(touch["target"] as? Int), 0)
    for key in ["pageX", "pageY", "timestamp"] {
      let v = try XCTUnwrap(touch[key] as? Double)
      XCTAssertTrue(v.isFinite)
      XCTAssertGreaterThanOrEqual(v, 0)
    }
    let viewport = try XCTUnwrap(metadata()?["windowProfile"] as? [String: Double])
    // Derive physical scale from an uncropped native screenshot. Rounded element
    // crops need not have exactly the same pixel-to-accessibility-frame ratio.
    let screen = try XCTUnwrap(UIImage(data: app.screenshot().pngRepresentation)?.cgImage)
    let nativePixelScale = CGFloat(screen.width) / app.frame.width
    XCTAssertGreaterThan(nativePixelScale, 0)
    XCTAssertEqual(nativePixelScale, CGFloat(try XCTUnwrap(viewport["scale"])), accuracy: 0.01)
    var previous = 0
    for (index, stage) in stages.enumerated() {
      waitFor("The authored Box stage must commit") { self.metadata()?["state"] as? Int == index }
      let d = try measured(index, after: previous)
      previous = try XCTUnwrap(d["request"] as? Int)
      XCTAssertEqual(d["sequenceLength"] as? Int, 11)
      let input = try XCTUnwrap(d["input"] as? [String: Any])
      XCTAssertEqual(input["name"] as? String, stage.name)
      for (flag, enabled) in [
        "ignoredConfig": index == 1, "rtl": index == 5, "explicitTheme": index == 8,
        "reset": index == 9, "divAlias": index == 4,
      ] {
        XCTAssertEqual(input[flag] as? Bool, enabled)
      }
      XCTAssertEqual(d["fontScale"] as? Double, scale)
      XCTAssertTrue(
        NSDictionary(dictionary: try XCTUnwrap(d["windowProfile"] as? [String: Double])).isEqual(
          NSDictionary(dictionary: viewport)))
      XCTAssertTrue(
        NSDictionary(dictionary: try XCTUnwrap(d["touch"] as? [String: Any])).isEqual(
          NSDictionary(dictionary: touch)))
      for map in ["refs", "textRefs"] {
        let leases = try XCTUnwrap(d[map] as? [String: [String: Any]])
        XCTAssertEqual(Set(leases.keys), Set(keys))
        for key in keys {
          let lease = try XCTUnwrap(leases[key])
          XCTAssertEqual(lease["attached"] as? Int, 1)
          XCTAssertEqual(lease["cleaned"] as? Int, 0)
          XCTAssertEqual(lease["generation"] as? Int, 1)
          XCTAssertEqual(lease["sameRoot"] as? Bool, true)
        }
      }
      XCTAssertEqual(d["counts"] as? [String: Int], ["stock": 1, "custom": 1, "styled": 1])
      let receipts = try XCTUnwrap(d["receipts"] as? [String: [String: Any]])
      let texts = try XCTUnwrap(d["textReceipts"] as? [String: [String: Any]])
      var observed: [String: Any] = [:]
      for (position, key) in keys.enumerated() {
        let expected = stage.specs[position]
        let frame = reveal("box-contract-" + key + "-frame")
        let root = node("box-contract-" + key)
        let copy = node("box-contract-" + key + "-text")
        let counter = node("box-contract-" + key + "-counter")
        let r = root.frame
        let p = frame.frame
        let c = counter.frame
        let t = copy.frame
        XCTAssertTrue(root.exists && copy.exists && counter.exists)
        XCTAssertEqual(
          app.descendants(matching: .any).matching(identifier: "box-contract-" + key).count, 1)
        // Reveal changes window origins. Compare recorded dimensions with current
        // AX parent/child geometry, rather than stale pre-scroll coordinates.
        let recorded = try XCTUnwrap(rect(receipts[key]?["window"]))
        let recordedText = try XCTUnwrap(rect(texts[key]?["window"]))
        XCTAssertEqual(r.width, recorded.width, accuracy: 1)
        XCTAssertEqual(r.height, recorded.height, accuracy: 1)
        XCTAssertEqual(t.width, recordedText.width, accuracy: 1)
        XCTAssertEqual(t.height, recordedText.height, accuracy: 1)
        XCTAssertEqual(r.minX, p.minX + 12 + expected.marginLeft, accuracy: 1)
        XCTAssertEqual(r.minY, p.minY + 12, accuracy: 1)
        XCTAssertEqual(
          r.width, p.width - 24 - expected.marginLeft - expected.marginRight, accuracy: 1)
        XCTAssertEqual(c.minX, r.minX + expected.left + expected.border, accuracy: 1)
        XCTAssertEqual(t.minX, c.minX, accuracy: 1)
        XCTAssertEqual(
          c.width, r.width - expected.left - expected.right - 2 * expected.border, accuracy: 1)
        XCTAssertEqual(t.width, c.width, accuracy: 1)
        XCTAssertEqual(c.minY, r.minY + expected.top + expected.border, accuracy: 1)
        XCTAssertEqual(t.minY, c.maxY, accuracy: 1)
        XCTAssertGreaterThanOrEqual(c.width, 43)
        XCTAssertGreaterThanOrEqual(c.height, 43)
        XCTAssertEqual(counter.label, key + " 1")
        XCTAssertEqual(copy.label, "Copy")
        XCTAssertEqual(t.height, expected.lineHeight * scale, accuracy: 1)
        XCTAssertEqual(
          r.height,
          max(88, c.height + t.height + expected.top + expected.bottom + 2 * expected.border),
          accuracy: 1)
        XCTAssertLessThanOrEqual(t.maxY, r.maxY - expected.bottom - expected.border + 1)
        let background = rgb(expected.background)
        let foreground = rgb(expected.foreground)
        let pixels = try snapshot(root, name: "box-ios-\(profile.rawValue)-\(stage.name)-\(key)")
        let sx = CGFloat(pixels.width) / r.width
        let sy = CGFloat(pixels.height) / r.height
        XCTAssertGreaterThan(sx, 0)
        XCTAssertEqual(sx, sy, accuracy: 0.03)
        var samples: [[String: Any]] = []
        // A top interior band precedes the counter glyphs at either tested scale.
        let py = Int(((expected.border + 3) * sy).rounded())
        for px in [
          Int(((expected.border + 3) * sx).rounded()), pixels.width / 2,
          pixels.width - 1 - Int(((expected.border + 3) * sx).rounded()),
        ] {
          XCTAssertTrue(px >= 0 && py >= 0 && px < pixels.width && py < pixels.height)
          let color = pixels.rgba(x: px, y: py)
          XCTAssertEqual(color[3], 255)
          for i in 0..<3 { XCTAssertLessThanOrEqual(abs(color[i] - background[i]), 3) }
          samples.append(["x": px, "y": py, "rgba": color])
        }
        if expected.border > 0 {
          let border = rgb("#546e7a")
          var rows: [Int] = []
          for py in 0..<min(pixels.height, Int(ceil((expected.border + 3) * sy))) {
            let color = pixels.rgba(x: pixels.width / 2, y: py)
            if color[3] == 255 && (0..<3).allSatisfy({ abs(color[$0] - border[$0]) <= 8 }) {
              rows.append(py)
            }
          }
          // Width and contiguity reject a one-pixel or doubled border, rather
          // than accepting any gray sample somewhere inside the expected band.
          XCTAssertEqual(CGFloat(rows.count), expected.border * sy, accuracy: 1)
          XCTAssertLessThanOrEqual(
            (rows.last ?? 0) - (rows.first ?? 0) + 1, Int(ceil(expected.border * sy)) + 1)
        } else {
          // Reset must remove painted edges as well as their layout inset. The
          // interior samples alone would miss a stale two-point styled border.
          let edgeY = min(pixels.height - 1, max(0, Int(sy.rounded())))
          let edgeColor = pixels.rgba(x: pixels.width / 2, y: edgeY)
          XCTAssertEqual(edgeColor[3], 255)
          for i in 0..<3 { XCTAssertLessThanOrEqual(abs(edgeColor[i] - background[i]), 3) }
          samples.append(["x": pixels.width / 2, "y": edgeY, "rgba": edgeColor])
        }
        let glyph = try snapshot(
          copy, name: "box-ios-\(profile.rawValue)-\(stage.name)-\(key)-copy")
        let ink = glyph.ink(points: t.size, background: background)
        XCTAssertFalse(ink.bounds.isNull)
        XCTAssertGreaterThan(ink.contrast, 80)
        for i in 0..<3 { XCTAssertLessThanOrEqual(abs(ink.color[i] - foreground[i]), 35) }
        // Tolerance is two native pixels, independent of OS text scaling.
        // This finite Copy-height observation does not certify font shaping,
        // letter spacing, baseline positioning or arbitrary strings.
        let glyphScale = CGFloat(glyph.height) / t.height
        XCTAssertGreaterThan(glyphScale, 0)
        if index == 0 && position == 0 {
          // Both controls keep the correct line height. Only the wrong control's
          // font stays at 16 instead of 18, so line-box geometry cannot mask it.
          for osScale: CGFloat in [1, 3.571] {
            let correct = try referenceGlyphPixelHeight(
              fontSize: 18 * osScale, lineHeight: 26 * osScale, pixelScale: nativePixelScale)
            let previous = try referenceGlyphPixelHeight(
              fontSize: 16 * osScale, lineHeight: 26 * osScale, pixelScale: nativePixelScale)
            XCTAssertGreaterThan(
              abs(correct - previous), 2,
              "The finite ink oracle must reject the previous font: scale=\(osScale), pixelScale=\(nativePixelScale), correct=\(correct), previous=\(previous)"
            )
          }
        }
        let referencePixelHeight = try referenceGlyphPixelHeight(
          fontSize: expected.fontSize * scale, lineHeight: expected.lineHeight * scale,
          pixelScale: nativePixelScale)
        let actualPixelHeight = ink.bounds.height * glyphScale
        XCTAssertEqual(actualPixelHeight, referencePixelHeight, accuracy: 2)
        observed[key] = [
          "root": frameJSON(r), "parent": frameJSON(p), "counter": frameJSON(c),
          "copy": frameJSON(t), "backgroundSamples": samples, "copyInk": frameJSON(ink.bounds),
          "copyForeground": ink.color, "referenceCopyInkPixelHeight": Double(referencePixelHeight),
          "actualCopyInkPixelHeight": Double(actualPixelHeight),
          "nativePixelScale": Double(nativePixelScale),
          "glyphPixelTolerance": 2,
        ]
      }
      let evidence: [String: Any] = [
        "schemaVersion": 1, "profile": profile.rawValue, "stage": stage.name, "metadata": d,
        "native": observed,
        "identityEvidence":
          "Retained forwarded-ref/child leases, not native UIView pointer identity",
        "paintLimit":
          "Finite composited interior/border/glyph samples, not all pixels or arbitrary font shaping",
      ]
      let data = try JSONSerialization.data(
        withJSONObject: evidence, options: [.sortedKeys, .prettyPrinted])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = "box-ios-\(profile.rawValue)-\(stage.name)-evidence"
      attachment.lifetime = .keepAlways
      add(attachment)
      if index < stages.count - 1 { reveal("box-contract-next", hit: true).tap() }
    }
    XCTAssertEqual(metadata()?["state"] as? Int, 10)
  }
  func testAllElevenStagesAtNormalDynamicType() throws { try run(.normal) }
  func testAllElevenStagesAtEnlargedDynamicType() throws { try run(.enlarged) }
}

private struct BoxPixels {
  let width: Int, height: Int
  private let bytes: [UInt8]
  init?(_ image: CGImage) {
    let w = image.width
    let h = image.height
    guard w > 0, h > 0 else { return nil }
    var data = [UInt8](repeating: 0, count: w * h * 4)
    let rendered = data.withUnsafeMutableBytes { b -> Bool in
      guard
        let ctx = CGContext(
          data: b.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
          space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
      return true
    }
    guard rendered else { return nil }
    width = w
    height = h
    bytes = data
  }
  func rgba(x: Int, y: Int) -> [Int] { (0..<4).map { Int(bytes[(y * width + x) * 4 + $0]) } }
  func ink(points: CGSize, background: [Int]) -> (bounds: CGRect, color: [Int], contrast: Int) {
    guard points.width > 0, points.height > 0 else { return (.null, background, 0) }
    var left = width
    var top = height
    var right = -1
    var bottom = -1
    var contrast = 0
    var peak = background
    for y in 0..<height {
      for x in 0..<width {
        let c = rgba(x: x, y: y)
        if c[3] < 245 { continue }
        let d = (0..<3).map { abs(c[$0] - background[$0]) }.max() ?? 0
        if d > 30 {
          left = min(left, x)
          right = max(right, x)
          top = min(top, y)
          bottom = max(bottom, y)
        }
        if d > contrast {
          contrast = d
          peak = Array(c.prefix(3))
        }
      }
    }
    guard right >= left, bottom >= top else { return (.null, peak, contrast) }
    return (
      CGRect(
        x: CGFloat(left) * points.width / CGFloat(width),
        y: CGFloat(top) * points.height / CGFloat(height),
        width: CGFloat(right - left + 1) * points.width / CGFloat(width),
        height: CGFloat(bottom - top + 1) * points.height / CGFloat(height)), peak, contrast
    )
  }
}
