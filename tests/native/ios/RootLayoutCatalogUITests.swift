/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Actual native ref measurements and retained children for the two layout wrappers.
@MainActor
final class RootLayoutCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(
      predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  private func metadata(_ id: String) -> [String: Any]? {
    guard node(id).exists, let data = node(id).label.data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }
  private func reveal(_ id: String) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    for _ in 0..<18 {
      if target.exists && target.isHittable { break }
      let viewport = scroll.frame.intersection(app.frame).insetBy(dx: 12, dy: 12)
      XCTAssertGreaterThan(viewport.height, 48, "The gesture needs a real visible scroll viewport")
      let delta = target.exists ? target.frame.midY - viewport.midY : viewport.height
      let distance = min(max(abs(delta), 24), viewport.height * 0.35)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let start = origin.withOffset(CGVector(
        dx: viewport.midX - app.frame.minX, dy: viewport.midY - app.frame.minY))
      let end = origin.withOffset(CGVector(
        dx: viewport.midX - app.frame.minX,
        dy: viewport.midY - app.frame.minY - (delta >= 0 ? distance : -distance)))
      // A bounded slow drag avoids paging past a large-text target repeatedly.
      // The hold ends momentum before the next native frame is inspected.
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    if !target.exists || !target.isHittable {
      capture("unreachable-" + id)
      print("Unreachable native target \(id): target=\(target.frame), scroll=\(scroll.frame)")
    }
    XCTAssertTrue(target.exists && target.isHittable, "Native target must be visible: \(id)")
    return target
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  override func setUp() async throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<16 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("root-layout-form-group").waitForExistence(timeout: 10))
  }
  private func measured(_ receiptID: String, roots: [String: String]) throws {
    waitFor("Every forwarded ref must measure a nonempty native root") {
      guard let receipts = self.metadata(receiptID)?["receipts"] as? [String: [String: Any]]
      else { return false }
      return roots.keys.allSatisfy { key in
        guard let frame = receipts[key]?["window"] as? [String: Double] else { return false }
        guard let width = frame["width"], let height = frame["height"],
          let id = roots[key], width > 0, height > 0 else { return false }
        let nativeFrame = self.node(id).frame
        return abs(nativeFrame.width - width) <= 1 && abs(nativeFrame.height - height) <= 1
      }
    }
    print("Native wrapper receipt \(receiptID): \(node(receiptID).label)")
    let receipts = try XCTUnwrap(metadata(receiptID)?["receipts"] as? [String: [String: Any]])
    for (key, id) in roots {
      let frame = try XCTUnwrap(receipts[key]?["window"] as? [String: Double])
      // Scrolling changes the window origin without a new layout event. Compare
      // dimensions, which must identify the same native wrapper measured by ref.
      XCTAssertEqual(node(id).frame.width, try XCTUnwrap(frame["width"]), accuracy: 1)
      XCTAssertEqual(node(id).frame.height, try XCTUnwrap(frame["height"]), accuracy: 1)
    }
  }
  func testFormGroupStateTextAndSameRootMeasurements() throws {
    let receipt = "form-group-contract-receipt"
    let roots = Dictionary(uniqueKeysWithValues:
      ["inherited", "own-false", "custom", "styled"].map { ($0, "form-group-contract-" + $0) })
    try measured(receipt, roots: roots)
    reveal("form-group-contract-child-custom").tap()
    XCTAssertTrue(node("form-group-contract-child-custom").label.contains("Choice 1"))
    capture("form-group-ios-default-column")
    for id in ["row", "error", "theme", "rtl", "text"] {
      reveal("form-group-contract-" + id).tap()
    }
    waitFor("Native presses must update wrapper state and authored text") {
      guard let value = self.metadata(receipt) else { return false }
      return value["row"] as? Bool == true && value["parentError"] as? Bool == true
        && value["rtl"] as? Bool == true && value["themed"] as? Bool == true
        && value["fontSize"] as? Int == 20
    }
    try measured(receipt, roots: roots)
    let refs = try XCTUnwrap(metadata(receipt)?["refs"] as? [String: [String: Int]])
    for key in roots.keys {
      XCTAssertEqual(refs[key]?["attached"], 1)
      XCTAssertEqual(refs[key]?["cleaned"], 0)
    }
    XCTAssertTrue(node("form-group-contract-child-custom").label.contains("Choice 1"))
    XCTAssertGreaterThan(reveal("form-group-contract-styled").frame.width, 0)
    capture("form-group-ios-row-error-rtl-authored-text")
  }
  private func chooseAvatar() throws {
    let route = node("root-layout-avatar"), navigation = node("root-layout-navigation")
    for _ in 0..<16 {
      let frame = route.exists ? route.frame : .zero
      if !frame.isEmpty && navigation.frame.contains(CGPoint(x: frame.midX, y: frame.midY)) && route.isHittable {
        route.tap()
        return
      }
      if !frame.isEmpty && frame.midX < navigation.frame.minX { navigation.swipeRight() }
      else { navigation.swipeLeft() }
    }
    throw NSError(domain: "RootLayoutCatalogUITests", code: 1, userInfo: [NSLocalizedDescriptionKey: "Avatar route is not visible"])
  }

  private func verifyAvatarExposure(_ roots: [String: String], count: Int, stage: String) throws {
    let images = app.images.matching(NSPredicate(format: "label == %@", "Account owner")).allElementsBoundByIndex
    var used = Set<Int>(), labels: [String: String] = [:]
    for key in ["native", "portal"] {
      let owner = node(try XCTUnwrap(roots[key]))
      XCTAssertTrue(owner.exists)
      let frame = owner.frame
      let exposed = images.indices.filter { index in
        let bounds = images[index].frame
        return !bounds.isEmpty && frame.contains(CGPoint(x: bounds.midX, y: bounds.midY))
      }
      if exposed.count != 1 {
        let detail = XCTAttachment(string: app.debugDescription)
        detail.name = "list-item-avatar-exposure-" + key + "-failure"
        detail.lifetime = .keepAlways
        add(detail)
      }
      XCTAssertEqual(exposed.count, 1, "One native image must stay separately exposed in the " + key + " root")
      let index = try XCTUnwrap(exposed.first)
      XCTAssertTrue(used.insert(index).inserted, "The inline and portaled images must be different native elements")
      let image = images[index]
      XCTAssertEqual(image.label, "Account owner")
      labels[key] = image.label
    }
    let children = app.buttons.matching(identifier: "avatar-contract-child")
    XCTAssertEqual(children.count, 1, "The custom root must retain its separately addressable action")
    let child = children.firstMatch
    XCTAssertTrue(child.isEnabled)
    let custom = node(try XCTUnwrap(roots["custom"])).frame
    XCTAssertTrue(custom.contains(CGPoint(x: child.frame.midX, y: child.frame.midY)))
    XCTAssertEqual(child.label, "Avatar child count \(count)")
    labels["custom"] = child.label
    let data = try JSONSerialization.data(withJSONObject: ["stage": stage, "labels": labels], options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "list-item-avatar-exposure-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  func testAvatarAlignmentThemePortalAndRetainedChild() throws {
    try runAvatar(checkExposure: false)
  }

  func testAvatarNativeAccessibilityExposure() throws {
    try runAvatar(checkExposure: true)
  }

  private func runAvatar(checkExposure: Bool) throws {
    try chooseAvatar()
    let receipt = "avatar-contract-receipt"
    let roots = ["native": "avatar-contract-native", "custom": "avatar-contract-custom",
      "portal": "avatar-contract-portal"]
    try measured(receipt, roots: roots)
    XCTAssertEqual(node("avatar-contract-native").frame.width, 56, accuracy: 1)
    if checkExposure {
      XCTAssertEqual(metadata(receipt)?["fontScale"] as? Double, 1)
      try verifyAvatarExposure(roots, count: 0, stage: "initial")
    }
    reveal("avatar-contract-child").tap()
    XCTAssertEqual(node("avatar-contract-child").label, "Avatar child count 1")
    capture("list-item-avatar-ios-default-center")
    for id in ["alignment", "theme", "rtl"] { reveal("avatar-contract-" + id).tap() }
    waitFor("Native presses must update contextual alignment and theme") {
      guard let value = self.metadata(receipt) else { return false }
      return value["top"] as? Bool == true && value["customStyle"] as? Bool == true
        && value["rtl"] as? Bool == true
    }
    try measured(receipt, roots: roots)
    XCTAssertEqual(node("avatar-contract-native").frame.width, 64, accuracy: 1)
    XCTAssertEqual(node("avatar-contract-portal").frame.width, 64, accuracy: 1)
    XCTAssertEqual(node("avatar-contract-child").label, "Avatar child count 1")
    capture("list-item-avatar-ios-top-rtl-themed")
    guard checkExposure else { return }
    try verifyAvatarExposure(roots, count: 1, stage: "updated")
    for id in ["rtl", "theme", "alignment"] { reveal("avatar-contract-" + id).tap() }
    waitFor("Original Avatar props must be restored") {
      guard let value = self.metadata(receipt) else { return false }
      return value["top"] as? Bool == false && value["customStyle"] as? Bool == false
        && value["rtl"] as? Bool == false
    }
    try measured(receipt, roots: roots)
    XCTAssertEqual(node("avatar-contract-native").frame.width, 56, accuracy: 1)
    try verifyAvatarExposure(roots, count: 1, stage: "restored")
  }
}
