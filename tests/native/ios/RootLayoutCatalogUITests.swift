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
    // At the largest font, every earlier route can consume a full viewport.
    for step in 0..<64 {
      let frame = route.exists ? route.frame : .zero
      let viewport = navigation.frame.intersection(app.frame).insetBy(dx: 12, dy: 3)
      XCTAssertGreaterThan(viewport.width, 48, "A visible wrapper navigation viewport is required")
      if !frame.isEmpty && viewport.contains(CGPoint(x: frame.midX, y: frame.midY)) && route.isHittable {
        route.tap()
        return
      }
      if step % 8 == 0 { print("Wrapper navigation \(id): step=\(step), target=\(frame), viewport=\(viewport)") }
      let delta = frame.isEmpty ? viewport.width : frame.midX - viewport.midX
      let distance = min(max(abs(delta), 24), viewport.width * 0.4)
      let origin = app.coordinate(withNormalizedOffset: .zero)
      let x = viewport.midX - app.frame.minX, y = viewport.midY - app.frame.minY
      // Bounded, slow drags avoid alternating across a route between pages.
      let start = origin.withOffset(CGVector(dx: x, dy: y))
      let end = origin.withOffset(CGVector(dx: x - (delta >= 0 ? distance : -distance), dy: y))
      start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    capture("unreachable-" + id)
    print("Wrapper navigation failed: target=\(route.frame), navigation=\(navigation.frame)")
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
  func testCardActionsGapAndRetainedChild() throws {
    try runCardActions(enlarged: false)
  }

  func testCardActionsNormalPreview() throws {
    try chooseWrapper("root-layout-card-actions")
    try cardActionsState("normal-preview", disable: false, roomy: false, rtl: false, gap: 8, count: 0, enlarged: false)
    capture("card-actions-normal-preview")
  }

  func testCardActionsAtEnlargedOSTextSize() throws {
    try runCardActions(enlarged: true)
  }

  private func runCardActions(enlarged: Bool) throws {
    try chooseWrapper("root-layout-card-actions")
    try cardActionsState("standard", disable: false, roomy: false, rtl: false, gap: 8, count: 0, enlarged: enlarged)
    reveal("card-actions-preview-save").tap()
    reveal("card-actions-preview-theme").tap()
    try cardActionsState("roomy", disable: false, roomy: true, rtl: false, gap: 16, count: 1, enlarged: enlarged)
    reveal("card-actions-preview-direction").tap()
    try cardActionsState("rtl", disable: false, roomy: true, rtl: true, gap: 16, count: 1, enlarged: enlarged)
    capture("card-actions-rtl")
    reveal("card-actions-preview-spacing").tap()
    try cardActionsState("no-gap", disable: true, roomy: true, rtl: true, gap: 0, count: 1, enlarged: enlarged)
    for id in ["spacing", "theme", "direction"] { reveal("card-actions-preview-" + id).tap() }
    try cardActionsState("restored", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged)
    capture("card-actions-restored")
  }

  private func cardActionsState(
    _ stage: String, disable: Bool, roomy: Bool, rtl: Bool, gap: CGFloat, count: Int, enlarged: Bool
  ) throws {
    let receipt = "card-actions-preview-receipt"
    let row = node("card-actions-preview-row")
    let share = reveal("card-actions-preview-share"), save = reveal("card-actions-preview-save")
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
        share.exists, save.exists, row.exists else { return false }
      let first = share.frame, second = save.frame, parent = row.frame
      return !first.isEmpty && !second.isEmpty && !parent.isEmpty
        && abs(first.midY - second.midY) <= 1
        && parent.insetBy(dx: -1.5, dy: -1.5).contains(first)
        && parent.insetBy(dx: -1.5, dy: -1.5).contains(second)
        && (rtl ? first.midX > second.midX : first.midX < second.midX)
        && abs(childGap(first, second) - gap) <= 1
        && abs((rtl ? parent.maxX - first.maxX : first.minX - parent.minX) - 8) <= 1
        && save.label == "Saved articles " + String(count)
    }
    let rowFrame = row.frame, shareFrame = share.frame, saveFrame = save.frame
    func rectangle(_ frame: CGRect) -> [Double] {
      [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)]
    }
    let observation: [String: Any] = [
      "stage": stage, "gap": Double(childGap(shareFrame, saveFrame)),
      "rowFrame": rectangle(rowFrame), "shareFrame": rectangle(shareFrame),
      "saveFrame": rectangle(saveFrame), "saveLabel": save.label,
      "state": try XCTUnwrap(metadata(receipt)),
    ]
    let data = try JSONSerialization.data(withJSONObject: observation, options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "card-actions-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  func testDialogActionsGapAndRetainedChild() throws {
    try runDialogActions(enlarged: false)
  }

  func testDialogActionsNormalPreview() throws {
    try chooseWrapper("root-layout-dialog-actions")
    try dialogActionsState("normal-preview", disable: false, roomy: false, rtl: false, gap: 8, count: 0, enlarged: false)
    capture("dialog-actions-normal-preview")
  }

  func testDialogActionsAtEnlargedOSTextSize() throws {
    try runDialogActions(enlarged: true)
  }

  private func runDialogActions(enlarged: Bool) throws {
    try chooseWrapper("root-layout-dialog-actions")
    try dialogActionsState("standard", disable: false, roomy: false, rtl: false, gap: 8, count: 0, enlarged: enlarged)
    reveal("dialog-actions-preview-save").tap()
    reveal("dialog-actions-preview-theme").tap()
    try dialogActionsState("roomy", disable: false, roomy: true, rtl: false, gap: 16, count: 1, enlarged: enlarged)
    reveal("dialog-actions-preview-direction").tap()
    try dialogActionsState("rtl", disable: false, roomy: true, rtl: true, gap: 16, count: 1, enlarged: enlarged)
    capture("dialog-actions-rtl")
    reveal("dialog-actions-preview-spacing").tap()
    try dialogActionsState("no-gap", disable: true, roomy: true, rtl: true, gap: 0, count: 1, enlarged: enlarged)
    for id in ["spacing", "theme", "direction"] { reveal("dialog-actions-preview-" + id).tap() }
    let baseline = try dialogActionsState("restored", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged)
    capture("dialog-actions-restored")
    reveal("dialog-actions-preview-sizing").tap()
    let sxHeight = try dialogActionsState("sx-grow", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged, mode: 1, minimumHeight: baseline + 40)
    XCTAssertGreaterThan(sxHeight, baseline + 40)
    reveal("dialog-actions-preview-sizing").tap()
    let nativeHeight = try dialogActionsState("native-grow", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged, mode: 2, minimumHeight: baseline + 40)
    XCTAssertGreaterThan(nativeHeight, baseline + 40)
    capture("dialog-actions-sizing")
    reveal("dialog-actions-preview-sizing").tap()
    let restoredHeight = try dialogActionsState("size-restored", disable: false, roomy: false, rtl: false, gap: 8, count: 1, enlarged: enlarged, restoredHeight: baseline)
    XCTAssertEqual(restoredHeight, baseline, accuracy: 1.5)
    capture("dialog-actions-size-restored")
  }

  @discardableResult
  private func dialogActionsState(
    _ stage: String, disable: Bool, roomy: Bool, rtl: Bool, gap: CGFloat, count: Int, enlarged: Bool, mode: Int = 0, minimumHeight: CGFloat? = nil, restoredHeight: CGFloat? = nil
  ) throws -> CGFloat {
    let receipt = "dialog-actions-preview-receipt"
    let row = node("dialog-actions-preview-row")
    let cancel = reveal("dialog-actions-preview-cancel"), save = reveal("dialog-actions-preview-save")
    func childGap(_ first: CGRect, _ second: CGRect) -> CGFloat {
      rtl ? first.minX - second.maxX : second.minX - first.maxX
    }
    // React state alone cannot acknowledge the new Yoga layout. Require actual
    // accessible button frames to reach the expected gap and physical order.
    waitFor("Native action row must settle: " + stage) {
      guard let value = self.metadata(receipt),
        value["disableSpacing"] as? Bool == disable,
        value["roomy"] as? Bool == roomy, value["rtl"] as? Bool == rtl, value["growMode"] as? Int == mode,
        let refs = value["refs"] as? [String: Int], refs["attached"] == 1, refs["cleaned"] == 0,
        let font = value["fontScale"] as? Double, (enlarged ? font >= 1.6 : abs(font - 1) < 0.01),
        cancel.exists, save.exists, row.exists else { return false }
      let first = cancel.frame, second = save.frame, parent = row.frame
      return !first.isEmpty && !second.isEmpty && !parent.isEmpty
        && abs(first.midY - second.midY) <= 1
        && abs(first.midY - parent.midY) <= 1
        && (minimumHeight.map { parent.height > $0 } ?? true)
        && (restoredHeight.map { abs(parent.height - $0) <= 1.5 } ?? true)
        && parent.insetBy(dx: -1.5, dy: -1.5).contains(first)
        && parent.insetBy(dx: -1.5, dy: -1.5).contains(second)
        && (rtl ? first.midX > second.midX : first.midX < second.midX)
        && abs(childGap(first, second) - gap) <= 1
        && abs((rtl ? second.minX - parent.minX : parent.maxX - second.maxX) - 8) <= 1
        && save.label == "Saved changes " + String(count)
    }
    let rowFrame = row.frame, cancelFrame = cancel.frame, saveFrame = save.frame
    func rectangle(_ frame: CGRect) -> [Double] {
      [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)]
    }
    let observation: [String: Any] = [
      "stage": stage, "gap": Double(childGap(cancelFrame, saveFrame)),
      "rowFrame": rectangle(rowFrame), "cancelFrame": rectangle(cancelFrame),
      "saveFrame": rectangle(saveFrame), "saveLabel": save.label,
      "state": try XCTUnwrap(metadata(receipt)),
    ]
    let data = try JSONSerialization.data(withJSONObject: observation, options: [.sortedKeys])
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "dialog-actions-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
    return rowFrame.height
  }

  func testLinearProgressContract() throws { try runLinearProgress(enlarged: false) }
  func testLinearProgressAtEnlargedOSTextSize() throws { try runLinearProgress(enlarged: true) }
  func testLinearProgressNormalPreview() throws { try runLinearProgress(enlarged: false) }

  /// Check the real public root and capture each variant's current native paint.
  private func runLinearProgress(enlarged: Bool) throws {
    try chooseWrapper("root-layout-linear-progress")
    let receipt = "linear-progress-preview-receipt"
    func state(_ name: String, percent: Int, range: Bool, rtl: Bool, dark: Bool, paused: Bool) throws {
      let expectedMin = range ? 20.0 : 0.0, expectedMax = range ? 80.0 : 100.0
      let expectedValue = range ? 65.0 : Double(percent)
      let expectedBuffer = range ? 71.0 : 85.0
      let expectedAnnouncement = NumberFormatter.localizedString(from: NSNumber(value: Double(percent) / 100), number: .percent)
      _ = reveal("linear-progress-determinate")
      waitFor("Linear progress controls, native range and retained ref must settle") {
        guard let value = self.metadata(receipt), let scale = value["fontScale"] as? Double,
          let refs = value["refs"] as? [String: Int] else { return false }
        let compact = { (text: String) in text.components(separatedBy: .whitespacesAndNewlines).joined() }
        let announcement = self.node("linear-progress-determinate").value as? String
        return value["percent"] as? Int == percent && value["paused"] as? Bool == paused
          && value["customRange"] as? Bool == range && value["rtl"] as? Bool == rtl && value["dark"] as? Bool == dark
          && value["min"] as? Double == expectedMin && value["max"] as? Double == expectedMax
          && value["value"] as? Double == expectedValue && value["valueBuffer"] as? Double == expectedBuffer
          && announcement.map(compact) == compact(expectedAnnouncement)
          && refs["attached"] == 1 && refs["cleaned"] == 0
          && (enlarged ? scale >= 1.6 : abs(scale - 1) < 0.01)
      }
      try measured(receipt, roots: ["progress": "linear-progress-determinate"])
      let root = node("linear-progress-determinate")
      XCTAssertGreaterThan(root.frame.width, 200)
      XCTAssertEqual(root.frame.height, 4, accuracy: 1)
      XCTAssertTrue(root.label.contains("Upload progress"))
      // The stock source transition is 400ms; inspect the actual settled paint below.
      let settled = expectation(description: "Linear progress transition")
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) { settled.fulfill() }
      wait(for: [settled], timeout: 2)
      for kind in ["indeterminate", "determinate", "buffer", "query"] { _ = reveal("linear-sample-" + kind) }
      // Hittability alone admits partial rows. Center the complete current union,
      // then reacquire all frames so enlarged text cannot produce stale crops.
      for _ in 0..<8 {
        let scroll = node("root-layout-scroll"), visible = scroll.frame.intersection(app.frame).insetBy(dx: 1, dy: 1)
        let union = ["indeterminate", "determinate", "buffer", "query"].map { node("linear-sample-" + $0).frame }.reduce(CGRect.null) { $0.union($1) }
        if visible.contains(union) { break }
        XCTAssertLessThanOrEqual(union.height, visible.height)
        let delta = max(-visible.height * 0.4, min(visible.height * 0.4, visible.midY - union.midY))
        let start = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: delta)), withVelocity: .slow, thenHoldForDuration: 0.2)
      }

      func recordFrame(_ stage: String) throws {
        var frames: [String: [Double]] = [:]
        for kind in ["indeterminate", "determinate", "buffer", "query"] {
          let frame = node("linear-sample-" + kind).frame
          XCTAssertGreaterThan(frame.width, 200)
          XCTAssertEqual(frame.height, 24, accuracy: 1)
          XCTAssertTrue(node("root-layout-scroll").frame.intersection(app.frame).insetBy(dx: -0.5, dy: -0.5).contains(frame))
          frames[kind] = [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)]
        }
        let payload: [String: Any] = ["stage": stage, "state": try XCTUnwrap(metadata(receipt)), "frames": frames,
          "screenSize": [Double(app.frame.width), Double(app.frame.height)], "nativeValue": root.value ?? NSNull()]
        let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
        attachment.name = "linear-progress-" + stage; attachment.lifetime = .keepAlways; add(attachment)
        capture("linear-progress-" + stage)
      }
      try recordFrame(name)
      if name == "quarter" || name == "paused" {
        for (index, interval) in [0.08, 0.21, 0.43, 0.77].enumerated() {
          let delay = expectation(description: "Linear progress paint cadence")
          DispatchQueue.main.asyncAfter(deadline: .now() + interval) { delay.fulfill() }
          wait(for: [delay], timeout: 2)
          try recordFrame(name + "-paint-" + String(index))
        }
      }
    }
    try state("quarter", percent:25, range:false, rtl:false, dark:false, paused:false)
    reveal("linear-progress-value").tap()
    try state("three-quarter", percent:75, range:false, rtl:false, dark:false, paused:false)
    reveal("linear-progress-range").tap()
    try state("custom-range", percent:75, range:true, rtl:false, dark:false, paused:false)
    reveal("linear-progress-direction").tap()
    try state("rtl", percent:75, range:true, rtl:true, dark:false, paused:false)
    reveal("linear-progress-theme").tap()
    try state("dark", percent:75, range:true, rtl:true, dark:true, paused:false)
    reveal("linear-progress-pause").tap()
    try state("paused", percent:75, range:true, rtl:true, dark:true, paused:true)
    for control in ["value", "range", "direction", "theme", "pause"] { reveal("linear-progress-" + control).tap() }
    try state("restored", percent:25, range:false, rtl:false, dark:false, paused:false)
  }

  func testCircularProgressContract() throws { try runCircularProgress(enlarged: false) }
  func testCircularProgressAtEnlargedOSTextSize() throws { try runCircularProgress(enlarged: true) }
  func testCircularProgressNormalPreview() throws { try runCircularProgress(enlarged: false) }

  /// Inspect the actual public component and native View ref, then capture paint.
  private func runCircularProgress(enlarged: Bool) throws {
    try chooseWrapper("root-layout-circular-progress")
    let receipt = "circular-progress-preview-receipt"
    func state(_ name: String, percent: Int, paused: Bool, track: Bool, range: Bool) throws {
      let expectedMin = range ? 20.0 : 0.0, expectedMax = range ? 80.0 : 100.0
      let expectedValue = range ? 65.0 : Double(percent)
      let expectedAnnouncement = NumberFormatter.localizedString(from: NSNumber(value: Double(percent) / 100), number: .percent)
      _ = reveal("circular-progress-determinate")
      var diagnostic: String?
      waitFor("Circular progress controls and native ref must settle") {
        guard let value = self.metadata(receipt), let scale = value["fontScale"] as? Double,
          let refs = value["refs"] as? [String: Int] else { return false }
        let announcement = self.node("circular-progress-determinate").value as? String
        let currentDiagnostic = "Circular announcement: actual=\(String(reflecting: announcement)) expected=\(String(reflecting: expectedAnnouncement)) state=\(value)"
        if diagnostic != currentDiagnostic { print(currentDiagnostic); diagnostic = currentDiagnostic }
        // Intl and Foundation may use different Unicode percent spacing for the
        // same locale. Compare the known value while retaining raw diagnostics.
        let compact = { (text: String) in text.components(separatedBy: .whitespacesAndNewlines).joined() }
        return value["percent"] as? Int == percent && value["paused"] as? Bool == paused
          && value["track"] as? Bool == track && value["customRange"] as? Bool == range
          && value["min"] as? Double == expectedMin && value["max"] as? Double == expectedMax
          && value["value"] as? Double == expectedValue
          && announcement.map(compact) == compact(expectedAnnouncement)
          && refs["attached"] == 1 && refs["cleaned"] == 0
          && (enlarged ? scale >= 1.6 : abs(scale - 1) < 0.01)
      }
      try measured(receipt, roots: ["progress": "circular-progress-determinate"])
      let root = node("circular-progress-determinate")
      XCTAssertEqual(root.frame.width, 64, accuracy: 1)
      XCTAssertEqual(root.frame.height, 64, accuracy: 1)
      XCTAssertTrue(root.label.contains("Upload progress"))
      for kind in ["loading", "determinate", "fixed"] { _ = reveal("circular-sample-" + kind) }
      func recordFrame(_ stage: String) throws {
        var frames: [String: [Double]] = [:]
        for kind in ["loading", "determinate", "fixed"] {
          let frame = node("circular-sample-" + kind).frame
          XCTAssertEqual(frame.width, 80, accuracy: 1)
          XCTAssertEqual(frame.height, 80, accuracy: 1)
          XCTAssertTrue(node("root-layout-scroll").frame.intersection(app.frame).insetBy(dx: -0.5, dy: -0.5).contains(frame))
          frames[kind] = [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)]
        }
        let payload: [String: Any] = ["stage": stage, "state": try XCTUnwrap(metadata(receipt)), "frames": frames,
          "screenSize": [Double(app.frame.width), Double(app.frame.height)], "nativeValue": root.value ?? NSNull()]
        let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
        attachment.name = "circular-progress-" + stage; attachment.lifetime = .keepAlways; add(attachment)
        capture("circular-progress-" + stage)
      }
      try recordFrame(name)
      if name == "quarter" || name == "paused" {
        // Uneven timing avoids aliasing the native 1.4-second motion cycle.
        for (index, interval) in [0.05, 0.17, 0.49, 0.83].enumerated() {
          let delay = expectation(description: "Progress paint cadence")
          DispatchQueue.main.asyncAfter(deadline: .now() + interval) { delay.fulfill() }
          wait(for: [delay], timeout: 2)
          try recordFrame(name + "-paint-" + String(index))
        }
      }
    }
    try state("quarter", percent: 25, paused: false, track: true, range: false)
    reveal("circular-progress-value").tap()
    try state("three-quarter", percent: 75, paused: false, track: true, range: false)
    reveal("circular-progress-range").tap()
    try state("custom-range", percent: 75, paused: false, track: true, range: true)
    reveal("circular-progress-track").tap()
    try state("no-track", percent: 75, paused: false, track: false, range: true)
    reveal("circular-progress-pause").tap()
    try state("paused", percent: 75, paused: true, track: false, range: true)
    for control in ["value", "range", "track", "pause"] { reveal("circular-progress-" + control).tap() }
    try state("restored", percent: 25, paused: false, track: true, range: false)
  }

  func testDialogTitleGeometryAndDialogContext() throws {
    try runDialogTitle(enlarged: false)
  }

  func testDialogTitleAtEnlargedOSTextSize() throws {
    try runDialogTitle(enlarged: true)
  }

  func testDialogTitleNormalPreview() throws {
    try chooseWrapper("root-layout-dialog-title")
    try dialogTitleState("normal-preview", roomy: false, reading: false, rtl: false, identified: false, saved: 0, enlarged: false)
    capture("dialog-title-normal-preview")
  }

  private func runDialogTitle(enlarged: Bool) throws {
    try chooseWrapper("root-layout-dialog-title")
    let baseline = try dialogTitleState("standard", roomy: false, reading: false, rtl: false, identified: false, saved: 0, enlarged: enlarged)
    capture("dialog-title-standard")
    try dialogTitleModal(save: false)
    try dialogTitleState("after-cancel", roomy: false, reading: false, rtl: false, identified: false, saved: 0, enlarged: enlarged, expectedHeight: baseline)
    reveal("dialog-title-preview-spacing").tap()
    let spacious = try dialogTitleState("roomy", roomy: true, reading: false, rtl: false, identified: false, saved: 0, enlarged: enlarged, expectedHeight: baseline + 16)
    reveal("dialog-title-preview-variant").tap()
    try dialogTitleState("reading", roomy: true, reading: true, rtl: false, identified: false, saved: 0, enlarged: enlarged, maximumHeight: spacious - 2)
    reveal("dialog-title-preview-direction").tap()
    reveal("dialog-title-preview-identifier").tap()
    try dialogTitleState("identified-rtl", roomy: true, reading: true, rtl: true, identified: true, saved: 0, enlarged: enlarged, maximumHeight: spacious - 2)
    capture("dialog-title-rtl")
    try dialogTitleModal(save: true)
    try dialogTitleState("after-save", roomy: true, reading: true, rtl: true, identified: true, saved: 1, enlarged: enlarged, maximumHeight: spacious - 2)
    for id in ["spacing", "variant", "direction", "identifier"] { reveal("dialog-title-preview-" + id).tap() }
    try dialogTitleState("restored", roomy: false, reading: false, rtl: false, identified: false, saved: 1, enlarged: enlarged, expectedHeight: baseline)
    capture("dialog-title-restored")
  }

  private func dialogTitleModal(save: Bool) throws {
    reveal("dialog-title-preview-open").tap()
    let title = node("dialog-title-modal-title"), paper = node("dialog-title-preview-paper")
    waitFor("The native dialog must present its title inside the paper") {
      title.exists && title.isHittable && title.label.contains("Review changes")
        && !title.frame.isEmpty && paper.exists
        && paper.frame.insetBy(dx: -1.5, dy: -1.5).contains(title.frame)
    }
    capture(save ? "dialog-title-modal-explicit" : "dialog-title-modal-automatic")
    node(save ? "dialog-title-modal-save" : "dialog-title-modal-cancel").tap()
    waitFor("The selected native dialog action must dismiss its title") {
      !title.exists || !title.isHittable
    }
  }

  @discardableResult
  private func dialogTitleState(_ stage: String, roomy: Bool, reading: Bool, rtl: Bool, identified: Bool, saved: Int, enlarged: Bool, expectedHeight: CGFloat? = nil, maximumHeight: CGFloat? = nil) throws -> CGFloat {
    _ = reveal("dialog-title-preview")
    let title = node("dialog-title-preview"), receipt = "dialog-title-preview-receipt"
    waitFor("The retained native title and measured ref must settle: " + stage) {
      guard let value = self.metadata(receipt),
        value["roomy"] as? Bool == roomy, value["reading"] as? Bool == reading,
        value["rtl"] as? Bool == rtl, value["explicitId"] as? Bool == identified,
        value["open"] as? Bool == false, value["saved"] as? Int == saved,
        let scale = value["fontScale"] as? Double,
        (enlarged ? scale >= 1.6 : abs(scale - 1) < 0.01),
        let refs = value["refs"] as? [String: Int], refs["attached"] == 1, refs["cleaned"] == 0,
        let receipts = value["receipts"] as? [String: [String: Any]],
        let window = receipts["title"]?["window"] as? [String: Double],
        let width = window["width"], let height = window["height"], width > 0, height > 0,
        title.exists && title.isHittable && title.label.contains("Workspace settings")
      else { return false }
      if let expectedHeight, abs(title.frame.height - expectedHeight) > 1.5 { return false }
      if let maximumHeight, title.frame.height >= maximumHeight { return false }
      return abs(title.frame.width - width) <= 1 && abs(title.frame.height - height) <= 1
    }
    let frame = title.frame
    let observation: [String: Any] = [
      "stage": stage, "frame": [Double(frame.minX), Double(frame.minY), Double(frame.width), Double(frame.height)],
      "label": title.label, "state": try XCTUnwrap(metadata(receipt)),
    ]
    let attachment = XCTAttachment(data: try JSONSerialization.data(withJSONObject: observation, options: [.sortedKeys]), uniformTypeIdentifier: "public.json")
    attachment.name = "dialog-title-" + stage
    attachment.lifetime = .keepAlways
    add(attachment)
    return frame.height
  }

}
