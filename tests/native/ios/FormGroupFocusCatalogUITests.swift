/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/** Public ref commands exercise UIKit focus; this does not certify physical keyboard usability. */
@MainActor
final class FormGroupFocusCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private let kinds = ["native", "host", "stock", "custom", "styled"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 15), .completed, message)
  }
  private func receipt() -> [String: Any] {
    guard let data = node("form-group-focus-receipt").label.data(using: .utf8),
      let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return value
  }
  private func settled() throws -> [String: Any] {
    var previous = "", changed = Date(), result: [String: Any] = [:]
    waitFor("Native focus receipt must settle") {
      let value = self.node("form-group-focus-receipt").label
      if previous != value { previous = value; changed = Date(); return false }
      guard Date().timeIntervalSince(changed) >= 0.15 else { return false }
      result = self.receipt()
      return result["ready"] as? Bool == true
    }
    XCTAssertFalse(result.isEmpty)
    return result
  }
  private func reveal(_ id: String) -> XCUIElement {
    let target = node(id), scroll = node("root-layout-scroll")
    for _ in 0..<18 {
      if target.exists && target.isHittable { return target }
      if target.exists && target.frame.midY < scroll.frame.midY { scroll.swipeDown() }
      else { scroll.swipeUp() }
    }
    XCTAssertTrue(target.exists && target.isHittable, "Native target must be visible: \(id)")
    return target
  }
  private func capture(_ name: String) {
    let image = XCTAttachment(screenshot: app.screenshot())
    image.name = name; image.lifetime = .keepAlways; add(image)
  }
  private func tagsAndRefs(_ value: [String: Any], _ expected: [String: Int]) throws {
    let known = Set(kinds.flatMap { [$0, $0 + "-button"] })
    XCTAssertEqual(Set(expected.keys), known)
    XCTAssertEqual(expected.count, 10)
    XCTAssertEqual(value["nodes"] as? [String: Int], expected)
    XCTAssertEqual(Set(expected.values).count, 10)
    XCTAssertTrue(expected.values.allSatisfy { $0 > 0 })
    let refs = try XCTUnwrap(value["refs"] as? [String: [String: Int]])
    for id in expected.keys { XCTAssertEqual(refs[id], ["attached": 1, "cleaned": 0]) }
    let entries = try XCTUnwrap(value["entries"] as? [[String: Any]])
    XCTAssertEqual(value["total"] as? Int, entries.count)
    XCTAssertLessThanOrEqual(entries.count, 64)
    for (index, event) in entries.enumerated() {
      XCTAssertEqual(event["sequence"] as? Int, index + 1)
      let kind = try XCTUnwrap(event["kind"] as? String)
      XCTAssertTrue(kinds.contains(kind))
      XCTAssertTrue(["focus", "blur"].contains(event["type"] as? String ?? ""))
      XCTAssertTrue(["capture", "child", "bubble"].contains(event["phase"] as? String ?? ""))
      XCTAssertGreaterThan(try XCTUnwrap(event["eventId"] as? Int), 0)
      XCTAssertGreaterThan(try XCTUnwrap(event["payloadId"] as? Int), 0)
      XCTAssertEqual(event["targetKind"] as? String, "object")
      XCTAssertEqual(event["target"] as? Int, expected[kind + "-button"])
      XCTAssertEqual(event["nativeTarget"] as? Int, expected[kind + "-button"])
      XCTAssertEqual(event["currentTarget"] as? Int, expected[kind + ((event["phase"] as? String) == "child" ? "-button" : "")])
    }
  }
  func testOwnedChildFocusAndBlurPropagation() throws {
    continueAfterFailure = false
    app.launchArguments = []; app.launch()
    defer { app.terminate() }
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout: 20))
    let tab = node("catalog-tab-Wrappers")
    for _ in 0..<16 { if tab.exists && tab.isHittable { break }; node("catalog-tabs").swipeLeft() }
    XCTAssertTrue(tab.isHittable); tab.tap()
    XCTAssertTrue(node("root-layout-group-focus").waitForExistence(timeout: 15))
    node("root-layout-group-focus").tap()
    waitFor("All roots and children must lay out") { self.receipt()["ready"] as? Bool == true }
    let initial = try settled(), tags = try XCTUnwrap(initial["nodes"] as? [String: Int])
    try tagsAndRefs(initial, tags)
    XCTAssertEqual(initial["total"] as? Int, 0)
    var stages: [[String: Any]] = []
    var expectedRequests: [String: Int] = [:]
    XCTAssertEqual(initial["requests"] as? [String: Int], expectedRequests)
    for kind in kinds {
      reveal("form-group-focus-" + kind + "-button").tap()
      waitFor("Public child ref must receive actual native focus: " + kind) {
        self.receipt()["focused"] as? Int == tags[kind + "-button"]
      }
      let current = try settled(); try tagsAndRefs(current, tags)
      expectedRequests[kind] = 1
      XCTAssertEqual(current["requests"] as? [String: Int], expectedRequests)
      let rootFrame = node("form-group-focus-" + kind).frame
      let childFrame = node("form-group-focus-" + kind + "-button").frame
      XCTAssertGreaterThan(rootFrame.width, 0); XCTAssertGreaterThan(childFrame.height, 0)
      stages.append(["kind": kind, "metadata": current,
        "rootFrame": ["x": rootFrame.minX, "y": rootFrame.minY, "width": rootFrame.width, "height": rootFrame.height],
        "childFrame": ["x": childFrame.minX, "y": childFrame.minY, "width": childFrame.width, "height": childFrame.height]])
      capture("form-group-focus-" + kind)
    }
    reveal("form-group-focus-release").tap()
    waitFor("Native blur must release the last actual child") { self.receipt()["focused"] is NSNull }
    let released = try settled(); try tagsAndRefs(released, tags)
    XCTAssertEqual(released["requests"] as? [String: Int], expectedRequests)
    let entries = try XCTUnwrap(released["entries"] as? [[String: Any]])
    var gaps: [String] = []
    for kind in kinds {
      let own = entries.filter { $0["kind"] as? String == kind }
      let child = own.filter { $0["phase"] as? String == "child" }
      XCTAssertEqual(child.map { $0["type"] as? String }, ["focus", "blur"], "Native child positive control: " + kind)
      if kind == "native" { continue }
      let phases = own.map { ($0["type"] as? String ?? "") + "/" + ($0["phase"] as? String ?? "") }
      if phases != ["focus/capture", "focus/child", "focus/bubble", "blur/capture", "blur/child", "blur/bubble"] {
        gaps.append(kind + ": phases=" + phases.joined(separator: ",")); continue
      }
      for offset in [0, 3] {
        let group = Array(own[offset..<(offset + 3)])
        if !group.allSatisfy({ $0["focusSource"] as? String == "owned" }) { gaps.append(kind + ": missing owned native focus provenance") }
        let eventIDs = try group.map { try XCTUnwrap($0["eventId"] as? Int) }
        let payloadIDs = try group.map { try XCTUnwrap($0["payloadId"] as? Int) }
        if !eventIDs.allSatisfy({ $0 > 0 }) || !payloadIDs.allSatisfy({ $0 > 0 }) || Set(eventIDs).count != 1 || Set(payloadIDs).count != 1 {
          gaps.append(kind + ": original event/payload identity lost")
        }
      }
    }
    reveal("form-group-focus-clear").tap()
    waitFor("Clearing the log must retain every native root") { self.receipt()["total"] as? Int == 0 }
    let cleared = try settled(); try tagsAndRefs(cleared, tags)
    XCTAssertEqual(cleared["requests"] as? [String: Int], released["requests"] as? [String: Int])
    XCTAssertTrue(cleared["focused"] is NSNull)
    let report: [String: Any] = ["schemaVersion": 1, "scenario": "form-group-focus-ios-v1",
      "driver": "XCTest native touches and public native refs", "platformVersion": UIDevice.current.systemVersion,
      "status": gaps.isEmpty ? "passed" : "failed", "gaps": gaps, "initial": initial, "stages": stages,
      "released": released, "cleared": cleared]
    let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys, .prettyPrinted])
    // Keep the native receipt independently of Xcode's asynchronous result finalization.
    let documents = try XCTUnwrap(FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first)
    try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
    try data.write(to: documents.appendingPathComponent("form-group-focus-report.json"), options: .atomic)
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "form-group-focus-report"; attachment.lifetime = .keepAlways; add(attachment)
    capture("form-group-focus-released")
    XCTAssertTrue(gaps.isEmpty, "Missing native child focus contract: " + gaps.joined(separator: "; "))
  }
}
