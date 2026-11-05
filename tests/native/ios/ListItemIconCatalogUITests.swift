/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Run unchanged under the runner's normal and enlarged OS text profiles.
/// These are installed simulator interaction/geometry checks, not physical AT or performance claims.
final class ListItemIconCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let receiptID = "icon-contract-receipt"
  private let roots = ["native": "icon-contract-native", "custom": "icon-contract-custom",
    "menu": "icon-contract-menu"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func metadata() -> [String: Any]? {
    let receipt = node(receiptID)
    guard receipt.exists, let data = receipt.label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func capture(_ name: String) {
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = name
    screenshot.lifetime = .keepAlways
    add(screenshot)
    let ids = Array(roots.values) + ["icon-contract-row-native", "icon-contract-row-custom",
      "icon-contract-child", "icon-contract-menu-item", "icon-contract-menu-glyph", "root-layout-scroll"]
    var native: [String: Any] = [:]
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
      print("LIST_ITEM_ICON_NATIVE " + text)
      let attachment = XCTAttachment(string: text)
      attachment.name = name + "-metadata"
      attachment.lifetime = .keepAlways
      add(attachment)
    }
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 12)
    if result != .completed { capture("list-item-icon-ios-wait-failure") }
    XCTAssertEqual(result, .completed, message)
  }
  private func reveal(_ id: String, requiresHitTarget: Bool = true) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    func reached() -> Bool {
      guard target.exists else { return false }
      if requiresHitTarget { return target.isHittable }
      // A passive wrapper may be fully covered by its interactive child. The
      // native frame establishes visibility; only actual tap targets need hits.
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 11, dy: 11)
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
    if !reached() { capture("list-item-icon-ios-unreachable-" + id) }
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
    let route = node("root-layout-icon")
    XCTAssertTrue(route.waitForExistence(timeout: 10))
    // Keep the selector strip to one text-scaled row; reveal its real scroll target.
    for _ in 0..<8 {
      if route.isHittable { break }
      node("root-layout-navigation").swipeLeft()
    }
    XCTAssertTrue(route.isHittable)
    route.tap()
    waitFor("The registered Icon scene must publish its actual OS text profile") {
      guard let scale = self.metadata()?["fontScale"] as? Double else { return false }
      return scale.isFinite && scale > 0
    }
  }
  override func tearDownWithError() throws {
    if let run = testRun, run.failureCount > 0 { capture("list-item-icon-ios-failure") }
  }
  private func measured() throws {
    waitFor("Every forwarded ref must measure its actual native wrapper") {
      guard let receipts = self.metadata()?["receipts"] as? [String: [String: Any]] else { return false }
      return self.roots.allSatisfy { key, id in
        guard let frame = receipts[key]?["window"] as? [String: Double],
          let width = frame["width"], let height = frame["height"],
          width.isFinite && height.isFinite && width > 0 && height > 0,
          self.node(id).exists else { return false }
        let actual = self.node(id).frame
        return abs(actual.width - width) <= 1 && abs(actual.height - height) <= 1
      }
    }
    let receipts = try XCTUnwrap(metadata()?["receipts"] as? [String: [String: Any]])
    for (key, id) in roots {
      let local = try XCTUnwrap(receipts[key]?["local"] as? [String: Double])
      let window = try XCTUnwrap(receipts[key]?["window"] as? [String: Double])
      // Scrolling changes window origins without onLayout. Native dimensions
      // still identify the exact ref target independently of the local receipt.
      XCTAssertEqual(node(id).frame.width, try XCTUnwrap(window["width"]), accuracy: 1)
      XCTAssertEqual(node(id).frame.height, try XCTUnwrap(window["height"]), accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(local["width"]), try XCTUnwrap(window["width"]), accuracy: 1)
      XCTAssertEqual(try XCTUnwrap(local["height"]), try XCTUnwrap(window["height"]), accuracy: 1)
    }
    let refs = try XCTUnwrap(metadata()?["refs"] as? [String: [String: Any]])
    for key in roots.keys {
      XCTAssertEqual(refs[key]?["attached"] as? Int, 1, "Only one native attachment: " + key)
      XCTAssertEqual(refs[key]?["cleaned"] as? Int, 0, "No host replacement during updates: " + key)
      XCTAssertEqual(refs[key]?["sameRoot"] as? Bool, true, "The original ref target must survive: " + key)
    }
  }
  private func centered() {
    for key in ["native", "custom"] {
      let root = reveal("icon-contract-" + key, requiresHitTarget: false)
      XCTAssertEqual(root.frame.midY, node("icon-contract-row-" + key).frame.midY, accuracy: 1)
    }
  }
  private func topOffsets() throws {
    waitFor("Fresh layout receipts must acknowledge both authored top edges") {
      guard let receipts = self.metadata()?["receipts"] as? [String: [String: Any]] else { return false }
      return ["native": 8.0, "custom": 12.0].allSatisfy { key, margin in
        guard let local = receipts[key]?["local"] as? [String: Double], let y = local["y"] else { return false }
        return abs(y - (8 + margin)) <= 1
      }
    }
    let receipts = try XCTUnwrap(metadata()?["receipts"] as? [String: [String: Any]])
    for (key, margin) in ["native": 8.0, "custom": 12.0] {
      let root = reveal("icon-contract-" + key, requiresHitTarget: false)
      let local = try XCTUnwrap(receipts[key]?["local"] as? [String: Double])
      // The maintained ListItem supplies 8-point top padding; Icon contributes
      // the source 8-point edge or the scene's authored 12-point self selector.
      XCTAssertEqual(try XCTUnwrap(local["y"]), 8 + margin, accuracy: 1)
      XCTAssertEqual(root.frame.minY - node("icon-contract-row-" + key).frame.minY,
        8 + margin, accuracy: 1)
    }
  }
  func testStockAndCustomRootGeometryThemeAndRetainedChild() throws {
    try measured()
    XCTAssertEqual(node("icon-contract-native").frame.width, 36, accuracy: 1)
    XCTAssertGreaterThanOrEqual(node("icon-contract-custom").frame.width, 43)
    centered()
    reveal("icon-contract-child").tap()
    waitFor("The authored native text control must receive its press") {
      self.node("icon-contract-child").label == "Acknowledgments 1"
    }
    capture("list-item-icon-ios-source-center")
    reveal("icon-contract-alignment").tap()
    reveal("icon-contract-theme").tap()
    waitFor("Native controls must update alignment and theme spacing") {
      self.metadata()?["top"] as? Bool == true && self.metadata()?["custom"] as? Bool == true
        && abs(self.node("icon-contract-native").frame.width - 45) <= 1
    }
    try measured()
    try topOffsets()
    XCTAssertGreaterThanOrEqual(node("icon-contract-custom").frame.width, 44)
    XCTAssertEqual(node("icon-contract-child").label, "Acknowledgments 1")
    capture("list-item-icon-ios-themed-top")
    reveal("icon-contract-alignment").tap()
    reveal("icon-contract-theme").tap()
    waitFor("The same roots must return to source spacing and centered alignment") {
      self.metadata()?["top"] as? Bool == false && self.metadata()?["custom"] as? Bool == false
        && abs(self.node("icon-contract-native").frame.width - 36) <= 1
    }
    try measured()
    centered()
    XCTAssertEqual(node("icon-contract-child").label, "Acknowledgments 1")
  }
  func testDenseMenuGeometryAndRealNativeAction() throws {
    try measured()
    let menu = reveal("icon-contract-menu-item")
    XCTAssertTrue(menu.isEnabled)
    XCTAssertEqual(node("icon-contract-menu").frame.width, 36, accuracy: 1)
    XCTAssertTrue(node("icon-contract-menu-glyph").exists)
    XCTAssertEqual(node("icon-contract-menu-glyph").frame.width, 20, accuracy: 1)
    XCTAssertEqual(node("icon-contract-menu-glyph").frame.height, 20, accuracy: 1)
    menu.tap()
    waitFor("The actual native menu row must deliver one action") { self.metadata()?["menuCount"] as? Int == 1 }
    capture("list-item-icon-ios-dense-menu")
    reveal("icon-contract-alignment").tap()
    reveal("icon-contract-theme").tap()
    waitFor("The menu must survive sibling wrapper updates") {
      self.metadata()?["top"] as? Bool == true && self.metadata()?["custom"] as? Bool == true
        && abs(self.node("icon-contract-native").frame.width - 45) <= 1
    }
    try measured()
    reveal("icon-contract-menu-item").tap()
    waitFor("The retained native menu action must remain active") { self.metadata()?["menuCount"] as? Int == 2 }
    XCTAssertEqual(node("icon-contract-menu").frame.width, 36, accuracy: 1)
    // This is authored vector geometry read from the native view. OS fontScale
    // is only observed in the scene receipt; the test never simulates scaling.
    XCTAssertEqual(node("icon-contract-menu-glyph").frame.width, 20, accuracy: 1)
    XCTAssertEqual(node("icon-contract-menu-glyph").frame.height, 20, accuracy: 1)
    try measured()
    capture("list-item-icon-ios-dense-menu-retained")
  }
}
