/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest

/// Exercise installed native grouping, state retention, pointer guards and real refs.
final class ButtonGroupCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed, message)
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launchArguments = []
    app.launch()
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Groups")
    for _ in 0..<12 {
      if tab.exists && tab.isHittable { break }
      node("catalog-tabs").swipeLeft()
    }
    XCTAssertTrue(tab.isHittable)
    tab.tap()
    XCTAssertTrue(node("group-save").waitForExistence(timeout: 10))
  }
  private func reveal(_ id: String) -> XCUIElement {
    let control = node(id)
    for _ in 0..<6 {
      let center = CGPoint(x: control.frame.midX, y: control.frame.midY)
      if control.exists && control.isHittable && node("button-group-scene").frame.contains(center) { break }
      if control.exists && control.frame.midY < node("button-group-scene").frame.minY {
        node("button-group-scene").swipeDown()
      } else { node("button-group-scene").swipeUp() }
    }
    XCTAssertTrue(node("button-group-scene").frame.contains(CGPoint(x: control.frame.midX, y: control.frame.midY)), "Touch center must be inside the visible scene")
    XCTAssertTrue(control.exists && control.isHittable, "Native target must be visible: \(id)")
    return control
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func geometry(_ vertical: Bool, _ preview: Bool = true) {
    let root = node("document-actions").frame
    let container = node("document-content").frame
    XCTAssertEqual(root.minX, container.minX, accuracy: 1.5)
    XCTAssertEqual(root.maxX, container.maxX, accuracy: 1.5)
    let ids = ["group-save"] + (preview ? ["group-preview"] : []) + ["group-send"]
    let children = ids.map { node($0).frame }
    XCTAssertGreaterThan(root.width, 200)
    for (index, child) in children.enumerated() {
      XCTAssertGreaterThanOrEqual(child.height, 43.5)
      XCTAssertGreaterThan(child.width, 0)
      XCTAssertEqual(child.minX, vertical || index == 0 ? root.minX : children[index-1].maxX - 1, accuracy: 1.5)
      XCTAssertEqual(child.minY, vertical && index > 0 ? children[index-1].maxY - 1 : root.minY, accuracy: 1.5)
      if vertical { XCTAssertEqual(child.width, root.width, accuracy: 1.5) }
    }
    XCTAssertEqual(children.last!.maxX, root.maxX, accuracy: 1.5)
    XCTAssertEqual(children.last!.maxY, root.maxY, accuracy: 1.5)
  }
  func testLayoutWrappedStateDisabledLoadingAndDynamicChildren() {
    geometry(false)
    waitFor("Native root ref must measure") { self.node("group-ref-receipt").label.hasPrefix("Measured ") }
    capture("button-group-ios-horizontal")
    reveal("group-save").tap()
    waitFor("Wrapped Save must activate once") { self.node("group-save").label == "Save 1" }
    reveal("group-vertical").tap()
    waitFor("Orientation must update") { self.node("document-actions").frame.height > self.node("group-save").frame.height * 2.5 }
    geometry(true)
    XCTAssertEqual(node("group-save").label, "Save 1")
    capture("button-group-ios-vertical")
    reveal("group-toggle-disabled").tap()
    waitFor("Pause must commit") { self.node("group-status").label.hasPrefix("Actions paused") }
    // A coordinate touch tests pointer suppression without treating the explicit
    // disabled=false property as an accessibility-disabled host.
    let save = reveal("group-save")
    save.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    reveal("group-toggle-disabled").tap()
    waitFor("Resume must commit") { self.node("group-status").label.hasPrefix("Draft ready") }
    XCTAssertEqual(node("group-save").label, "Save 1")
    reveal("group-send").tap()
    waitFor("Loading must commit") { self.node("group-status").label.hasPrefix("Preparing delivery") }
    reveal("group-complete").tap()
    waitFor("Local completion must commit once") { self.node("group-status").label.hasSuffix("sent 1") }
    reveal("group-toggle-preview").tap()
    waitFor("Preview must unmount") { !self.node("group-preview").exists }
    reveal("group-horizontal").tap()
    waitFor("Row layout must return") { self.node("document-actions").frame.height < self.node("group-save").frame.height * 1.5 }
    geometry(false, false)
    XCTAssertEqual(node("group-save").label, "Save 1")
    capture("button-group-ios-compact")
  }
  func testSurfaceFocusNestedUpdatesAndPhysicalPortalStyles() {
    reveal("group-closure-toggle").tap()
    XCTAssertTrue(node("group-closure-themed-first").waitForExistence(timeout: 10))
    reveal("group-closure-themed-first").tap()
    reveal("group-closure-theme-toggle").tap()
    waitFor("Theme profile must update") { self.node("group-closure-theme-status").label.hasPrefix("Violet") }
    XCTAssertEqual(node("group-closure-themed-first").label, "Review count 1")
    reveal("group-closure-focus-first").tap()
    waitFor("A real native focus callback must arrive") { self.node("group-closure-focus-status").label.hasSuffix("· focused") && !self.node("group-closure-focus-status").label.hasPrefix("focus 0 ") }
    capture("button-group-ios-themed-focus")
    let compact = node("group-closure-nested").frame.width
    XCTAssertEqual(compact, 180, accuracy: 1.5)
    reveal("group-closure-nested-first").tap()
    reveal("group-closure-nested-toggle").tap()
    waitFor("Nested ancestor styling must update actual width") { abs(self.node("group-closure-nested").frame.width - 220) < 1.5 }
    XCTAssertEqual(node("group-closure-nested-first").label, "Nested count 1")
    capture("button-group-ios-nested")

    reveal("group-closure-portal-window").tap()
    waitForPortal("window")
    let windowHeight = portalGeometry(width: 64, inside: false, sibling: false, count: 0)
    reveal("group-closure-portal-action").tap()
    waitFor("Window action must activate") { self.node("group-closure-portal-action").label == "Go count 1" }
    capture("button-group-ios-portal-window")
    reveal("group-closure-portal-inside").tap()
    waitForPortal("inside")
    let insideHeight = portalGeometry(width: 96, inside: true, sibling: false, count: 0)
    XCTAssertGreaterThan(insideHeight, windowHeight)
    reveal("group-closure-portal-action").tap()
    reveal("group-closure-portal-paint-toggle").tap()
    waitFor("Same-container styles must update geometry") { abs(self.node("group-closure-portal-action").frame.width - 108) < 1.5 }
    _ = portalGeometry(width: 108, inside: true, sibling: false, count: 1)
    reveal("group-closure-portal-paint-toggle").tap()
    capture("button-group-ios-portal-inside")
    reveal("group-closure-portal-sibling").tap()
    waitForPortal("sibling")
    let siblingHeight = portalGeometry(width: 128, inside: false, sibling: true, count: 0)
    XCTAssertGreaterThan(siblingHeight, insideHeight)
    reveal("group-closure-portal-action").tap()
    reveal("group-closure-portal-paint-toggle").tap()
    waitFor("Sibling paint must update geometry") { abs(self.node("group-closure-portal-action").frame.width - 140) < 1.5 }
    _ = portalGeometry(width: 140, inside: false, sibling: true, count: 1)
    capture("button-group-ios-portal-sibling")
    reveal("group-closure-portal-close").tap()
    waitFor("Closing removes physical content") { !self.node("group-closure-portal-action").exists }
  }
  private func waitForPortal(_ mode: String) {
    waitFor("Portal must present in its destination") { self.node("group-closure-portal-status").label.contains("route \(mode) · presented") }
  }
  @discardableResult
  private func portalGeometry(width: CGFloat, inside: Bool, sibling: Bool, count: Int) -> CGFloat {
    let action = reveal("group-closure-portal-action")
    XCTAssertEqual(action.frame.width, width, accuracy: 1.5)
    XCTAssertEqual(action.label, "Go count \(count)")
    XCTAssertEqual(node("group-closure-portal-context").label, "Defaults text/inherit/large · last")
    let actionID = "group-closure-portal-action"
    XCTAssertEqual(node("group-closure-portal-inside-target").descendants(matching: .any).matching(identifier: actionID).count > 0, inside)
    XCTAssertEqual(node("group-closure-portal-sibling-target").descendants(matching: .any).matching(identifier: actionID).count > 0, sibling)
    return node("group-closure-portal-text").frame.height
  }

}
