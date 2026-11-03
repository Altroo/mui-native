/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import XCTest

final class PopperCatalogUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
  }
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func waitFor(_ message: String, timeout: TimeInterval = 10, condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: timeout), .completed, message)
  }
  private func attached(_ stage: String) {
    let popup = node("delivery-note"), trigger = node("delivery-trigger")
    waitFor(stage) {
      guard popup.exists && trigger.exists && popup.frame.width > 200 else { return false }
      let gap = min(abs(popup.frame.minY-trigger.frame.maxY-10), abs(trigger.frame.minY-popup.frame.maxY-10))
      let aligned = min(abs(popup.frame.minX-trigger.frame.minX), abs(popup.frame.maxX-trigger.frame.maxX))
      return gap < 4 && aligned < 4
    }
    capture(stage)
  }
  private func scrollViewport() -> CGRect {
    // XCUI frames need not include ancestor clipping. Intersect both known
    // nested scroll viewports so gestures never begin over the home indicator.
    node("delivery-scroll").frame.intersection(node("overlays-scroll").frame).intersection(app.frame)
  }
  private func toggle(_ id: String, checked: Bool) {
    let control = node(id)
    XCTAssertTrue(control.waitForExistence(timeout: 10))
    let before = String(describing: control.value)
    control.tap()
    let after = String(describing: control.value)
    print("Native switch \(id): \(before) -> \(after), frame=\(control.frame)")
    capture("toggle-\(id)-\(checked)")
    waitFor("The native checked state must update: \(id), observed \(after)") {
      if let value = control.value as? NSNumber { return value.boolValue == checked }
      return (control.value as? String) == (checked ? "1" : "0")
    }
  }
  private func mode(_ inline: Bool) {
    toggle("popper-inline-toggle", checked: inline)
    waitFor("Popup must change its native inline/window ancestry") {
      self.node("delivery-frame").descendants(matching: .any).matching(identifier: "delivery-note").count == (inline ? 1 : 0)
    }
  }
  private var plainFrame: CGRect?
  private func transform(_ checked: Bool) {
    let frame = node("delivery-frame")
    if plainFrame == nil { plainFrame = frame.frame }
    let plain = plainFrame!
    toggle("popper-transform-toggle", checked: checked)
    waitFor("The native frame must apply or reset its transform") {
      let current = frame.frame
      let delta = max(abs(current.width-plain.width), abs(current.height-plain.height))
      return checked ? delta > 1 : delta < 1
    }
  }
  private func dragScroll(_ distance: CGFloat) {
    XCTAssertEqual(app.state, .runningForeground, "Only the catalog may receive a scroll gesture")
    let scroll = node("delivery-scroll")
    XCTAssertTrue(scroll.waitForExistence(timeout: 10))
    let viewport = scrollViewport()
    XCTAssertGreaterThan(viewport.width, 40)
    XCTAssertGreaterThan(viewport.height, 40)
    let travel = min(abs(distance), viewport.height-40)
    let x = viewport.maxX-18
    let y = distance > 0 ? viewport.maxY-20 : viewport.minY+20
    let origin = app.coordinate(withNormalizedOffset: .zero)
    let start = origin.withOffset(CGVector(dx: x-app.frame.minX, dy: y-app.frame.minY))
    let end = origin.withOffset(CGVector(dx: x-app.frame.minX, dy: y-app.frame.minY+(distance > 0 ? -travel : travel)))
    // Stay in the empty gutter and hold before release to avoid an uncontrolled fling.
    start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.2)
  }
  private func exerciseScrolling(_ mode: String, inline: Bool) {
    let trigger = node("delivery-trigger")
    let initial = trigger.frame
    let title = node("delivery-note-title")
    XCTAssertTrue(title.waitForExistence(timeout: 10), "Validate the title identifier before clipping")
    XCTAssertTrue(title.isHittable, "The baseline title must be visible to native hit testing")
    dragScroll(64)
    waitFor("The native inner scroll view must move its anchor") { trigger.frame.minY < initial.minY-24 }
    attached("scrolled-\(mode)-popup")
    dragScroll(-180)
    waitFor("Reverse scrolling must restore the original anchor") { abs(trigger.frame.minY-initial.minY) < 2 }
    attached("returned-\(mode)-popup")
    dragScroll(240)
    waitFor("The anchor must leave its scroll clip") {
      !trigger.isHittable && trigger.frame.maxY <= self.scrollViewport().minY+2
    }
    if inline {
      if title.exists {
        XCTAssertGreaterThan(title.frame.width, 0, "A missing/zero title frame is not geometry evidence")
        XCTAssertLessThan(title.frame.maxY, scrollViewport().minY, "The title must be wholly outside the clip")
      } else {
        // UIKit may omit fully clipped accessibility elements. That proves AX
        // absence only; never use CGRect.zero as physical clipping evidence.
        print("Clipped inline title omitted from AX; drawing requires screenshot review")
      }
      XCTAssertFalse(title.isHittable, "Clipped inline content must not receive a touch")
    } else {
      // Window rendering remains interactive outside the anchor's clipped ancestor.
      XCTAssertTrue(app.buttons["Mark as read"].isHittable, app.debugDescription)
    }
    capture("clipped-\(mode)-anchor")
    dragScroll(-300)
    waitFor("The clipped anchor must recover") { abs(trigger.frame.minY-initial.minY) < 2 }
    attached("restored-\(mode)-popup")
  }
  func testNativePopperWindowInlineTransformAndTouch() {
    let tab = node("catalog-tab-Overlays")
    XCTAssertTrue(tab.waitForExistence(timeout: 30), app.debugDescription)
    tab.tap()
    let trigger = node("delivery-trigger")
    XCTAssertTrue(trigger.waitForExistence(timeout: 10), app.debugDescription)
    trigger.tap()
    let popup = node("delivery-note")
    XCTAssertTrue(popup.waitForExistence(timeout: 10), app.debugDescription)
    let note = app.staticTexts["Arrives Thursday"]
    XCTAssertTrue(note.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertGreaterThan(popup.frame.width, 200)
    let verticalGap = min(abs(popup.frame.minY - trigger.frame.maxY - 10), abs(trigger.frame.minY - popup.frame.maxY - 10))
    XCTAssertLessThan(verticalGap, 4, "Popup must attach above or below its native anchor: popup=\(popup.frame), anchor=\(trigger.frame)")
    capture("window-popup")
    exerciseScrolling("window", inline: false)
    app.buttons["Mark as read"].tap()
    XCTAssertTrue(app.staticTexts["Read confirmations: 1"].exists, app.debugDescription)
    mode(true)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    capture("inline-popup")
    exerciseScrolling("inline", inline: true)
    app.buttons["Mark as read"].tap()
    XCTAssertTrue(app.staticTexts["Read confirmations: 2"].exists, app.debugDescription)
    transform(true)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    capture("transformed-inline-popup")
    app.buttons["Mark as read"].tap()
    XCTAssertTrue(app.staticTexts["Read confirmations: 3"].exists, app.debugDescription)
    toggle("popper-boundary-toggle", checked: true)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    capture("bounded-transformed-popup")
    // Exercise both sides of the state change. The original crash happened on
    // reset, which a single off-to-on interaction does not test.
    for _ in 0..<2 {
      transform(false)
      XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
      transform(true)
      XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    }
    transform(false)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    capture("reset-inline-popup")
    mode(false)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    transform(true)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    app.buttons["Mark as read"].tap()
    XCTAssertTrue(app.staticTexts["Read confirmations: 4"].exists, app.debugDescription)
    capture("transformed-window-popup")
    transform(false)
    XCTAssertTrue(note.waitForExistence(timeout: 10), app.debugDescription)
    capture("reset-window-popup")
    trigger.tap()
    let absent = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: note)
    XCTAssertEqual(XCTWaiter.wait(for: [absent], timeout: 10), .completed)
    capture("closed-popup")
    for cycle in 0..<3 {
      trigger.tap()
      attached("reopened-window-popup-\(cycle)")
      trigger.tap()
      waitFor("Reopened content must unmount on close") { !note.exists && !popup.exists }
    }
  }
}
