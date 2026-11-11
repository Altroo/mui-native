/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Actual native measurements, accessibility and retained children for layout wrappers.
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
  func testCatalogPrimaryTabFitsAtNormalTextSize() {
    assertCatalogPrimaryTabFits(enlarged: false)
  }

  func testCatalogPrimaryTabFitsAtEnlargedTextSize() {
    assertCatalogPrimaryTabFits(enlarged: true)
  }

  private func assertCatalogPrimaryTabFits(enlarged: Bool) {
    let tab = node("catalog-tab-Wrappers"), scroller = node("catalog-tabs")
    waitFor("The selected primary tab must fit inside the visible viewport") {
      guard let scale = self.metadata("form-group-contract-receipt")?["fontScale"] as? Double,
        (enlarged ? scale >= 1.6 : abs(scale - 1) < 0.01),
        tab.exists && tab.isHittable && scroller.exists else { return false }
      let viewport = scroller.frame.intersection(self.app.frame).insetBy(dx: -1, dy: -1)
      return !tab.frame.isEmpty && viewport.contains(tab.frame) && tab.label == "Layout & surfaces"
    }
    let actualScale = metadata("form-group-contract-receipt")?["fontScale"] as? Double ?? 0
    print("Catalog primary tab: fontScale=\(actualScale), viewport=\(scroller.frame), selected=\(tab.frame), label=\(tab.label)")
    capture(enlarged ? "catalog-primary-tab-enlarged" : "catalog-primary-tab-normal")
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
  private func chooseWrapper(_ id: String) throws {
    let route = node(id), navigation = node("root-layout-navigation")
    for _ in 0..<16 {
      let frame = route.exists ? route.frame : .zero
      let viewport = navigation.frame.intersection(app.frame).insetBy(dx: 12, dy: 3)
      XCTAssertGreaterThan(viewport.width, 48, "A visible wrapper navigation viewport is required")
      if !frame.isEmpty && viewport.contains(CGPoint(x: frame.midX, y: frame.midY)) && route.isHittable {
        route.tap()
        return
      }
      let delta = frame.isEmpty ? viewport.width : frame.midX - viewport.midX
      let distance = min(max(abs(delta), 24), viewport.width * 0.4)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let x = viewport.midX - app.frame.minX, y = viewport.midY - app.frame.minY
      // Bounded, slow drags avoid alternating across a route between pages.
      let start = origin.withOffset(CGVector(dx: x, dy: y))
      let end = origin.withOffset(CGVector(dx: x - (delta >= 0 ? distance : -distance), dy: y))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    throw NSError(domain: "RootLayoutCatalogUITests", code: 1, userInfo: [NSLocalizedDescriptionKey: "Wrapper route is not visible: " + id])
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
    try chooseWrapper("root-layout-avatar")
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

  func testAccordionActionsGapAndRetainedChild() throws {
    try runAccordionActions(enlarged: false)
  }

  func testAccordionActionsAtEnlargedOSTextSize() throws {
    try runAccordionActions(enlarged: true)
  }

  private func runAccordionActions(enlarged: Bool) throws {
    try chooseWrapper("root-layout-actions")
    try actionsState("standard", disable: false, roomy: false, rtl: false, gap: 8, count: 0, enlarged: enlarged)
    reveal("actions-preview-save").tap()
    reveal("actions-preview-theme").tap()
    try actionsState("roomy", disable: false, roomy: true, rtl: false, gap: 16, count: 1, enlarged: enlarged)
    reveal("actions-preview-direction").tap()
    try actionsState("rtl", disable: false, roomy: true, rtl: true, gap: 16, count: 1, enlarged: enlarged)
    capture("accordion-actions-rtl")
    reveal("actions-preview-spacing").tap()
    try actionsState("no-gap", disable: true, roomy: true, rtl: true, gap: 0, count: 1, enlarged: enlarged)
    for id in ["spacing", "theme", "direction"] { reveal("actions-preview-" + id).tap() }
    try actionsState("restored", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged)
    capture("accordion-actions-restored")
  }

  private func actionsState(
    _ stage: String, disable: Bool, roomy: Bool, rtl: Bool, gap: CGFloat, count: Int, enlarged: Bool
  ) throws {
    let receipt = "actions-preview-receipt"
    let row = node("actions-preview-row")
    let keep = reveal("actions-preview-keep"), save = reveal("actions-preview-save")
    func childGap(_ first: CGRect, _ second: CGRect) -> CGFloat {
      rtl ? first.minX - second.maxX : second.minX - first.maxX
    }
    // React state alone cannot acknowledge the new Yoga layout. Require actual
    // accessible button frames to reach the expected gap and physical order.
    waitFor("Native action row must settle: " + stage) {
      guard let value = self.metadata(receipt),
        value["disableSpacing"] as? Bool == disable,
        value["roomy"] as? Bool == roomy, value["rtl"] as? Bool == rtl,
        let refs = value["refs"] as? [String: Int], refs["attached"] == 1, refs["cleaned"] == 0,
        let font = value["fontScale"] as? Double, (enlarged ? font >= 1.6 : abs(font - 1) < 0.01),
        keep.exists, save.exists, row.exists else { return false }
      let first = keep.frame, second = save.frame, parent = row.frame
      return !first.isEmpty && !second.isEmpty && !parent.isEmpty
        && abs(first.midY - second.midY) <= 1
        && parent.contains(CGPoint(x: first.midX, y: first.midY))
        && parent.contains(CGPoint(x: second.midX, y: second.midY))
        && (rtl ? first.midX > second.midX : first.midX < second.midX)
        && abs(childGap(first, second) - gap) <= 1
        && save.label == "Saved notes " + String(count)
    }
    let rowFrame = row.frame, keepFrame = keep.frame, saveFrame = save.frame
    func rectangle(_ frame: CGRect) -> [Double] {
      [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)]
    }
    let observation: [String: Any] = [
      "stage": stage, "gap": Double(childGap(keepFrame, saveFrame)),
      "rowFrame": rectangle(rowFrame), "keepFrame": rectangle(keepFrame),
      "saveFrame": rectangle(saveFrame), "saveLabel": save.label,
      "state": try XCTUnwrap(metadata(receipt)),
    ]
    let data = try JSONSerialization.data(withJSONObject: observation, options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "accordion-actions-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
