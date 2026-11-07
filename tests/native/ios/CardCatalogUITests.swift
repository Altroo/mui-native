import UIKit
/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Finite native frame, composited paint and inherited-text observations.
/// Ref leases are React evidence; XCUI exposes no UIView pointer identity.
@MainActor
final class CardCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let keys = ["stock", "custom"]
  private let probeKeys = ["theme", "owner", "as"]
  private struct ProbeSpec {
    let key, id, frame: String
    let width, height, radius: CGFloat
    let background: [Int]
  }
  private let probes: [ProbeSpec] = [
    ProbeSpec(
      key: "theme", id: "card-contract-probe-theme", frame: "card-contract-probe-theme-frame",
      width: 80, height: 44, radius: 4, background: [91, 147, 211]),
    ProbeSpec(
      key: "owner", id: "card-contract-probe-owner", frame: "card-contract-probe-owner-frame",
      width: 80, height: 44, radius: 4, background: [11, 93, 68]),
    ProbeSpec(
      key: "as", id: "card-contract-probe-as-alternate", frame: "card-contract-probe-as-frame",
      width: 80, height: 44, radius: 0, background: [69, 39, 160]),
  ]
  private let authoredProbeInputs: [String: Any] = [
    "theme": [
      "providerOpacity": 0.2, "explicitOpacity": 0.7, "paperProviderBackground": "#1565c0",
      "unusedExplicitPaperBackground": "#b71c1c", "elevation": 0,
    ],
    "owner": [
      "marker": "authored", "matchedBackground": "#0b5d44", "unmatchedBackground": "#b71c1c",
      "elevation": 0,
    ],
    "as": [
      "background": "#4527a0", "elevation": 0,
      "paperTrapStyle": ["padding": 40, "borderRadius": 17, "opacity": 0.2],
      "originalHostID": "card-contract-probe-as-original",
      "alternateHostID": "card-contract-probe-as-alternate",
    ],
  ]
  private enum Profile: String { case normal, enlarged }
  private struct Spec {
    let padding, border, radius: CGFloat
    let background, foreground, frameBackground: String
    let fontSize, lineHeight: CGFloat
    let elevation: Int
    let outlined, reset: Bool
    var left: CGFloat { padding }
    var right: CGFloat { padding }
    var top: CGFloat { padding }
    var bottom: CGFloat { padding }
    var marginLeft: CGFloat { 0 }
    var marginRight: CGFloat { 0 }
  }
  private struct Stage {
    let name: String
    let input: [String: Any]
    let specs: [Spec]
  }
  // Authored Card/Paper inputs from the source protocol, not scene style output.
  // Classes and shadow declarations remain source rather than UIKit evidence.
  private let stages: [Stage] = [
    Stage(
      name: "default",
      input: [
        "name": "default", "raisedInput": "absent", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "raised",
      input: [
        "name": "raised", "raisedInput": "true", "elevationInput": "absent", "paperDefault": false,
        "cardDefault": false, "dark": false, "square": false, "outlined": false, "themeSx": false,
        "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 8, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 8, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "explicit-zero",
      input: [
        "name": "explicit-zero", "raisedInput": "true", "elevationInput": "zero",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 0, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 0, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "explicit-three",
      input: [
        "name": "explicit-three", "raisedInput": "true", "elevationInput": "three",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 3, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 3, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "explicit-undefined",
      input: [
        "name": "explicit-undefined", "raisedInput": "true", "elevationInput": "undefined",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "paper-default",
      input: [
        "name": "paper-default", "raisedInput": "true", "elevationInput": "undefined",
        "paperDefault": true, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 5, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 5, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "card-default",
      input: [
        "name": "card-default", "raisedInput": "absent", "elevationInput": "undefined",
        "paperDefault": true, "cardDefault": true, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 3, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 3, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "dark-raised",
      input: [
        "name": "dark-raised", "raisedInput": "true", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": true, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#2e2e2e", foreground: "#ffffff",
          frameBackground: "#0b1016", fontSize: 16, lineHeight: 24, elevation: 8, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#2e2e2e", foreground: "#ffffff",
          frameBackground: "#0b1016", fontSize: 16, lineHeight: 24, elevation: 8, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "outlined-raised",
      input: [
        "name": "outlined-raised", "raisedInput": "true", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": true, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 1, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 8, outlined: true,
          reset: false),
        Spec(
          padding: 16, border: 1, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 8, outlined: true,
          reset: false),
      ]),
    Stage(
      name: "square",
      input: [
        "name": "square", "raisedInput": "absent", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": true,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 0, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 0, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "theme-sx",
      input: [
        "name": "theme-sx", "raisedInput": "true", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": true, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#0b5d44", foreground: "#ffffff",
          frameBackground: "#d6e3ed", fontSize: 18, lineHeight: 26, elevation: 8, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#0b5d44", foreground: "#ffffff",
          frameBackground: "#d6e3ed", fontSize: 18, lineHeight: 26, elevation: 8, outlined: false,
          reset: false),
      ]),
    Stage(
      name: "native-reset",
      input: [
        "name": "native-reset", "raisedInput": "true", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": true, "square": false,
        "outlined": false, "themeSx": true, "nativeReset": true,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 2, background: "#243447", foreground: "#f5f7fa",
          frameBackground: "#0b1016", fontSize: 22, lineHeight: 30, elevation: 8, outlined: false,
          reset: true),
        Spec(
          padding: 16, border: 0, radius: 2, background: "#243447", foreground: "#f5f7fa",
          frameBackground: "#0b1016", fontSize: 22, lineHeight: 30, elevation: 8, outlined: false,
          reset: true),
      ]),
    Stage(
      name: "restored",
      input: [
        "name": "restored", "raisedInput": "absent", "elevationInput": "absent",
        "paperDefault": false, "cardDefault": false, "dark": false, "square": false,
        "outlined": false, "themeSx": false, "nativeReset": false,
      ],
      specs: [
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
        Spec(
          padding: 16, border: 0, radius: 4, background: "#ffffff", foreground: "#203247",
          frameBackground: "#d6e3ed", fontSize: 16, lineHeight: 24, elevation: 1, outlined: false,
          reset: false),
      ]),
  ]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    guard node("card-contract-receipt").exists,
      let data = node("card-contract-receipt").label.data(using: .utf8)
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
    if result != .completed { capture("card-ios-wait-failure") }
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
      let top = id == "card-contract-next" || id == "card-contract-measure"
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
    capture("card-ios-unreachable-" + id)
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
    tab("root-layout-card", in: "root-layout-navigation")
    XCTAssertTrue(node("card-contract-receipt").waitForExistence(timeout: 12))
    waitFor("Fresh Card scene must start at zero") { self.metadata()?["state"] as? Int == 0 }
  }
  @MainActor override func tearDown() async throws {
    if let result = testRun, result.failureCount > 0 { capture("card-ios-failure") }
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
    reveal("card-contract-measure", hit: true).tap()
    waitFor("All six live refs must answer this fresh measurement") {
      guard let d = self.metadata(), d["scenario"] as? String == "card-v1",
        d["state"] as? Int == state,
        let request = d["request"] as? Int, request > previous,
        let roots = d["receipts"] as? [String: [String: Any]],
        let texts = d["textReceipts"] as? [String: [String: Any]],
        Set(roots.keys) == Set(self.keys), Set(texts.keys) == Set(self.keys)
      else { return false }
      guard let probes = d["probeReceipts"] as? [String: [String: Any]],
        Set(probes.keys) == Set(self.probeKeys)
      else { return false }
      guard
        self.probeKeys.allSatisfy({ key in
          probes[key]?["request"] as? Int == request && probes[key]?["state"] as? Int == state
            && probes[key]?["generation"] as? Int == 1 && self.rect(probes[key]?["window"]) != nil
        })
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
  private func snapshot(_ element: XCUIElement, name: String) throws -> CardPixels {
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
    return try XCTUnwrap(CardPixels(try XCTUnwrap(UIImage(data: image.pngRepresentation)?.cgImage)))
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
    let blankPixels = try XCTUnwrap(CardPixels(try XCTUnwrap(blank.cgImage)))
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
    reference.name = "card-reference-Copy-\(fontSize)-\(lineHeight)"
    reference.lifetime = .keepAlways
    add(reference)
    let pixels = try XCTUnwrap(CardPixels(try XCTUnwrap(image.cgImage)))
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
      let counter = reveal("card-contract-" + key + "-counter", hit: true)
      XCTAssertEqual(counter.label, key + " 0")
      counter.tap()
      waitFor("A real retained counter press must reach React") {
        (self.metadata()?["counts"] as? [String: Int])?[key] == 1
          && self.node("card-contract-" + key + "-counter").label == key + " 1"
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
      waitFor("The authored Card stage must commit") { self.metadata()?["state"] as? Int == index }
      let d = try measured(index, after: previous)
      previous = try XCTUnwrap(d["request"] as? Int)
      XCTAssertEqual(d["sequenceLength"] as? Int, 13)
      XCTAssertEqual(d["schemaVersion"] as? Int, 1)
      XCTAssertEqual(d["scenario"] as? String, "card-v1")
      let input = try XCTUnwrap(d["input"] as? [String: Any])
      XCTAssertEqual(input["name"] as? String, stage.name)
      XCTAssertTrue(NSDictionary(dictionary: input).isEqual(NSDictionary(dictionary: stage.input)))
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
      XCTAssertEqual(d["counts"] as? [String: Int], ["stock": 1, "custom": 1])
      let receipts = try XCTUnwrap(d["receipts"] as? [String: [String: Any]])
      let texts = try XCTUnwrap(d["textReceipts"] as? [String: [String: Any]])
      var observed: [String: Any] = [:]
      for (position, key) in keys.enumerated() {
        let expected = stage.specs[position]
        let frame = reveal("card-contract-" + key + "-frame")
        let root = node("card-contract-" + key)
        let copy = node("card-contract-" + key + "-text")
        let counter = node("card-contract-" + key + "-counter")
        let r = root.frame
        let p = frame.frame
        let c = counter.frame
        let t = copy.frame
        XCTAssertTrue(root.exists && copy.exists && counter.exists)
        XCTAssertEqual(
          app.descendants(matching: .any).matching(identifier: "card-contract-" + key).count, 1)
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
        let pixels = try snapshot(root, name: "card-ios-\(profile.rawValue)-\(stage.name)-\(key)")
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
          let border = rgb("#e0e0e0")
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
          // interior samples alone would miss a stale prior border.
          // Include the outermost physical row: sampling only one point
          // inward would miss a stale one-point outline after it was removed.
          for px in [pixels.width / 4, pixels.width / 2, 3 * pixels.width / 4] {
            for py in 0...min(pixels.height - 1, max(0, Int(ceil(sy)))) {
              let edgeColor = pixels.rgba(x: px, y: py)
              XCTAssertEqual(edgeColor[3], 255)
              for i in 0..<3 { XCTAssertLessThanOrEqual(abs(edgeColor[i] - background[i]), 3) }
              samples.append(["x": px, "y": py, "rgba": edgeColor])
            }
          }
        }
        // Finite cutouts distinguish square from rounded paint. Shadowed
        // corners do not reconstruct an exact radius or certify GPU shadows.
        var cornerEvidence: [[String: Any]] = []
        for (cx, cy) in [
          (0, 0), (pixels.width - 1, 0), (0, pixels.height - 1),
          (pixels.width - 1, pixels.height - 1),
        ] {
          let color = pixels.rgba(x: cx, y: cy)
          XCTAssertEqual(color[3], 255)
          let delta = (0..<3).map { abs(color[$0] - background[$0]) }.max() ?? 0
          if expected.radius == 0 {
            XCTAssertLessThanOrEqual(delta, 3)
          } else if expected.outlined || expected.elevation == 0 || expected.reset {
            let frameColor = rgb(expected.frameBackground)
            for channel in 0..<3 {
              XCTAssertLessThanOrEqual(abs(color[channel] - frameColor[channel]), 3)
            }
          } else {
            XCTAssertGreaterThanOrEqual(delta, 4)
          }
          cornerEvidence.append(["x": cx, "y": cy, "rgba": color, "surfaceDelta": delta])
        }
        let glyph = try snapshot(
          copy, name: "card-ios-\(profile.rawValue)-\(stage.name)-\(key)-copy")
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
          // font stays at 16 instead of 18, so line-card geometry cannot mask it.
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
          "copy": frameJSON(t), "backgroundSamples": samples, "corners": cornerEvidence,
          "copyInk": frameJSON(ink.bounds),
          "copyForeground": ink.color, "referenceCopyInkPixelHeight": Double(referencePixelHeight),
          "actualCopyInkPixelHeight": Double(actualPixelHeight),
          "nativePixelScale": Double(nativePixelScale),
          "glyphPixelTolerance": 2,
        ]
      }
      XCTAssertEqual(d["refRevision"] as? Int, 7)
      XCTAssertTrue(
        NSDictionary(dictionary: try XCTUnwrap(d["authoredProbeInputs"] as? [String: Any])).isEqual(
          NSDictionary(dictionary: authoredProbeInputs)))
      let probeEvidence = try inspectProbes(d, profile: profile, stage: stage.name)
      let evidence: [String: Any] = [
        "schemaVersion": 1, "profile": profile.rawValue, "stage": stage.name, "metadata": d,
        "native": observed, "probes": probeEvidence,
        "identityEvidence":
          "Retained forwarded-ref/child leases, not native UIView pointer identity",
        "paintLimit":
          "Finite composited interior/border/cutout/glyph samples, not exact radius, full clipping, GPU shadows, all pixels or arbitrary font shaping",
      ]
      let data = try JSONSerialization.data(
        withJSONObject: evidence, options: [.sortedKeys, .prettyPrinted])
      let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
      attachment.name = "card-ios-\(profile.rawValue)-\(stage.name)-evidence"
      attachment.lifetime = .keepAlways
      add(attachment)
      if index < stages.count - 1 { reveal("card-contract-next", hit: true).tap() }
    }
    XCTAssertEqual(metadata()?["state"] as? Int, stages.count - 1)
  }
  /// The reserved-input surfaces contain no Text. Their native frames and
  /// composited pixels distinguish theme scope, authored state and Paper bypass.
  private func inspectProbes(_ data: [String: Any], profile: Profile, stage: String) throws
    -> [String: Any]
  {
    let leases = try XCTUnwrap(data["probeRefs"] as? [String: [String: Any]])
    let receipts = try XCTUnwrap(data["probeReceipts"] as? [String: [String: Any]])
    XCTAssertEqual(Set(leases.keys), Set(probeKeys))
    XCTAssertEqual(Set(receipts.keys), Set(probeKeys))
    XCTAssertFalse(node("card-contract-probe-as-original").exists)
    var observations: [String: Any] = [:]
    for spec in probes {
      let lease = try XCTUnwrap(leases[spec.key])
      XCTAssertEqual(lease["attached"] as? Int, 1)
      XCTAssertEqual(lease["cleaned"] as? Int, 0)
      XCTAssertEqual(lease["generation"] as? Int, 1)
      XCTAssertEqual(lease["sameRoot"] as? Bool, true)
      let frame = reveal(spec.frame)
      let root = node(spec.id)
      XCTAssertTrue(root.exists)
      XCTAssertEqual(app.descendants(matching: .any).matching(identifier: spec.id).count, 1)
      let r = root.frame
      let parent = frame.frame
      let recorded = try XCTUnwrap(rect(receipts[spec.key]?["window"]))
      XCTAssertEqual(r.width, spec.width, accuracy: 1)
      XCTAssertEqual(r.height, spec.height, accuracy: 1)
      XCTAssertEqual(r.width, recorded.width, accuracy: 1)
      XCTAssertEqual(r.height, recorded.height, accuracy: 1)
      XCTAssertEqual(r.minX, parent.minX + 12, accuracy: 1)
      XCTAssertEqual(r.minY, parent.minY + 12, accuracy: 1)
      let pixels = try snapshot(
        root, name: "card-ios-\(profile.rawValue)-\(stage)-probe-\(spec.key)")
      let sx = CGFloat(pixels.width) / r.width
      let sy = CGFloat(pixels.height) / r.height
      XCTAssertGreaterThan(sx, 0)
      XCTAssertEqual(sx, sy, accuracy: 0.04)
      var samples: [[String: Any]] = []
      let py = Int((4 * sy).rounded())
      for px in [
        Int((4 * sx).rounded()), pixels.width / 2, pixels.width - 1 - Int((4 * sx).rounded()),
      ] {
        let color = pixels.rgba(x: px, y: py)
        XCTAssertEqual(color[3], 255)
        for channel in 0..<3 {
          XCTAssertLessThanOrEqual(abs(color[channel] - spec.background[channel]), 3)
        }
        samples.append(["x": px, "y": py, "rgba": color])
      }
      var corners: [[String: Any]] = []
      for (cx, cy) in [
        (0, 0), (pixels.width - 1, 0), (0, pixels.height - 1),
        (pixels.width - 1, pixels.height - 1),
      ] {
        let color = pixels.rgba(x: cx, y: cy)
        XCTAssertEqual(color[3], 255)
        let expected = spec.radius == 0 ? spec.background : [255, 255, 255]
        for channel in 0..<3 {
          XCTAssertLessThanOrEqual(abs(color[channel] - expected[channel]), 3)
        }
        corners.append(["x": cx, "y": cy, "rgba": color])
      }
      observations[spec.key] = [
        "root": frameJSON(r), "frame": frameJSON(parent), "samples": samples, "corners": corners,
        "hostIdentifier": spec.id,
      ]
    }
    return observations
  }
  func testAllThirteenStagesAtNormalDynamicType() throws { try run(.normal) }
  func testAllThirteenStagesAtEnlargedDynamicType() throws { try run(.enlarged) }
}

private struct CardPixels {
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
