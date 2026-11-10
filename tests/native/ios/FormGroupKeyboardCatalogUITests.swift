/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import XCTest
import UIKit

/** Native XCTest key injection is separate from physical-keyboard usability. */
@MainActor
final class FormGroupKeyboardCatalogUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "dev.altroo.muinative.catalog")
  private var enterCode = "Enter"
  private let kinds = ["native", "host", "stock", "custom", "styled"]
  private func node(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func waitFor(_ message: String, _ condition: @escaping () -> Bool) {
    let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    let result = XCTWaiter.wait(for: [expectation], timeout: 15)
    if result != .completed {
      let snapshot = receipt()
      if let data = try? JSONSerialization.data(withJSONObject: snapshot, options: [.sortedKeys, .prettyPrinted]) {
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        attachment.name = "form-group-keyboard-failed-receipt"; attachment.lifetime = .keepAlways; add(attachment)
      }
      capture("form-group-keyboard-failure")
    }
    XCTAssertEqual(result, .completed, message)
  }
  private func receipt() -> [String: Any] {
    guard let data = node("form-group-keyboard-receipt").label.data(using: .utf8),
      let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return value
  }
  private func settled() throws -> [String: Any] {
    var previous = "", changed = Date(), result: [String: Any] = [:]
    waitFor("Native focus receipt must settle") {
      let value = self.node("form-group-keyboard-receipt").label
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

  private func validate(_ value: [String: Any], tags: [String: Int], kind: String, key: String, policy: String) throws {
    XCTAssertEqual(value["nodes"] as? [String: Int], tags)
    let ids = Set(kinds.flatMap { [$0, $0 + "-button"] })
    XCTAssertEqual(Set(tags.keys), ids); XCTAssertEqual(Set(tags.values).count, 10)
    XCTAssertTrue(tags.values.allSatisfy { $0 > 0 })
    let refs = try XCTUnwrap(value["refs"] as? [String: [String: Int]])
    XCTAssertEqual(Set(refs.keys), ids)
    for id in ids { XCTAssertEqual(refs[id], ["attached": 1, "cleaned": 0]) }
    XCTAssertEqual(value["policy"] as? String, policy)
    let events = try XCTUnwrap(value["entries"] as? [[String: Any]])
    XCTAssertEqual(value["total"] as? Int, events.count)
    XCTAssertFalse(events.isEmpty); XCTAssertLessThanOrEqual(events.count, 64)
    let childID = try XCTUnwrap(tags[kind + "-button"]), rootID = try XCTUnwrap(tags[kind])
    for (index, event) in events.enumerated() {
      XCTAssertEqual(event["sequence"] as? Int, index + 1)
      XCTAssertEqual(event["kind"] as? String, kind)
      XCTAssertEqual(event["key"] as? String, key)
      XCTAssertEqual(event["code"] as? String, key == " " ? "Space" : key == "a" ? "KeyA" : enterCode)
      XCTAssertEqual(event["source"] as? String, "hardware")
      XCTAssertEqual(event["targetKind"] as? String, "object")
      XCTAssertEqual(event["target"] as? Int, childID)
      XCTAssertEqual(event["currentTarget"] as? Int, event["scope"] as? String == "button" ? childID : rootID)
      XCTAssertGreaterThan(try XCTUnwrap(event["eventId"] as? Int), 0)
      XCTAssertGreaterThan(try XCTUnwrap(event["payloadId"] as? Int), 0)
    }
    var expectedSequence: [String] = []
    for phase in ["down", "up"] {
      let stop = kind != "native" && policy == "stop" && key != "a" && phase == (key == "Enter" ? "down" : "up")
      if kind == "native" { expectedSequence.append("button/" + phase) }
      else {
        expectedSequence.append("root/" + phase + "-capture")
        if !stop { expectedSequence += ["button/" + phase, "root/" + phase] }
      }
    }
    XCTAssertEqual(events.map { ($0["scope"] as? String ?? "") + "/" + ($0["phase"] as? String ?? "") }, expectedSequence)
    for phase in ["down", "up"] {
      let activating = key != "a" && phase == (key == "Enter" ? "down" : "up")
      let stopped = kind != "native" && policy == "stop" && activating
      let prevented = kind != "native" && policy == "prevent" && activating
      let own = events.filter { ($0["phase"] as? String ?? "").hasPrefix(phase) }
      let names = own.map { ($0["scope"] as? String ?? "") + "/" + ($0["phase"] as? String ?? "") }
      let expected = kind == "native" ? ["button/" + phase] : stopped ? ["root/" + phase + "-capture"] : ["root/" + phase + "-capture", "button/" + phase, "root/" + phase]
      XCTAssertEqual(names, expected)
      if kind != "native" {
        let first = try XCTUnwrap(own.first)
        XCTAssertEqual(first["prevented"] as? Bool, prevented)
        XCTAssertEqual(first["stopped"] as? Bool, stopped)
        if !stopped {
          XCTAssertEqual(own[2]["eventId"] as? Int, first["eventId"] as? Int)
          XCTAssertNotEqual(own[1]["eventId"] as? Int, first["eventId"] as? Int)
          XCTAssertEqual(Set(try own.map { try XCTUnwrap($0["payloadId"] as? Int) }).count, 1)
          XCTAssertEqual(own[1]["prevented"] as? Bool, prevented)
          XCTAssertEqual(own[2]["prevented"] as? Bool, prevented || (phase == "down" && key != "a"))
          XCTAssertEqual(own[1]["stopped"] as? Bool, false)
          XCTAssertEqual(own[2]["stopped"] as? Bool, false)
        }
      }
    }
    let down = try XCTUnwrap(events.first { $0["phase"] as? String == (kind == "native" ? "down" : "down-capture") })
    let up = try XCTUnwrap(events.first { $0["phase"] as? String == (kind == "native" ? "up" : "up-capture") })
    XCTAssertNotEqual(down["payloadId"] as? Int, up["payloadId"] as? Int)
    if kind == "native" {
      for event in events {
        XCTAssertEqual(event["stopped"] as? Bool, false)
        XCTAssertEqual(event["prevented"] as? Bool, false)
      }
    }
    let clicks = try XCTUnwrap(value["clicks"] as? [String: Int])
    let expectedClick = key != "a" && (kind == "native" || policy == "observe") ? 1 : 0
    XCTAssertEqual(clicks[kind] ?? 0, expectedClick)
    XCTAssertTrue(clicks.keys.allSatisfy { $0 == kind })
  }
  private func nativeDriverPrerequisite() throws -> [String] {
    app.launchArguments = ["--mui-native-key-control"]; app.launch()
    defer { app.terminate(); app.launchArguments = [] }
    let field = node("native-key-editor"), control = node("native-key-receipt")
    XCTAssertTrue(field.waitForExistence(timeout: 15), "The independent UIKit control must be included in the catalog app target")
    field.tap()
    func value() throws -> [String: Any] {
      let data = try XCTUnwrap(control.label.data(using: .utf8))
      return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }
    app.typeKey(.downArrow, modifierFlags: [])
    let positive = try value()
    XCTAssertEqual((positive["counts"] as? [String: Int])?["ArrowDown"], 1, "The independent command positive control must receive injected input")
    app.typeKey(.return, modifierFlags: [])
    let returnReceipt = try value()
    let returnPresses = try XCTUnwrap(returnReceipt["presses"] as? [String])
    if !returnPresses.contains("down:40") && !returnPresses.contains("up:40") {
      // XCTest exposes Return and keypad Enter as distinct native key inputs.
      app.typeKey(.enter, modifierFlags: [])
      enterCode = "NumpadEnter"
    }
    app.typeKey(" ", modifierFlags: [])
    let beforeA = try value()
    app.typeKey("a", modifierFlags: [])
    let result = try value(), raw = try XCTUnwrap(result["presses"] as? [String])
    let oldText = try XCTUnwrap(beforeA["text"] as? String)
    let newText = try XCTUnwrap(result["text"] as? String)
    XCTAssertNotEqual(newText, oldText, "The independent editor must acknowledge a fresh text edit")
    XCTAssertEqual(newText.filter { $0 == "a" }.count, oldText.filter { $0 == "a" }.count + 1)
    var missing: [String] = []
    for (key, hid) in [("Enter", enterCode == "Enter" ? 40 : 88), ("Space", 44), ("A", 4)] {
      let phases = raw.filter { $0 == "down:\(hid)" || $0 == "up:\(hid)" }
      if phases.isEmpty { missing.append(key) }
      else { XCTAssertEqual(phases, ["down:\(hid)", "up:\(hid)"], "Independent raw key phases must be complete and unique") }
    }
    let report: [String: Any] = ["schemaVersion": 1, "scenario": "form-group-keyboard-driver-ios-v1", "status": missing.isEmpty ? "available" : "unverified", "missingRawKeys": missing, "enterCode": enterCode, "returnReceipt": returnReceipt, "beforeA": beforeA, "positive": positive, "receipt": result]
    let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys, .prettyPrinted])
    let documents = try XCTUnwrap(FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first)
    try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
    try data.write(to: documents.appendingPathComponent("form-group-keyboard-driver.json"), options: .atomic)
    let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
    attachment.name = "form-group-keyboard-driver"; attachment.lifetime = .keepAlways; add(attachment)
    capture("form-group-keyboard-driver")
    return missing
  }
  func testNativeDriverPrerequisiteOnly() throws {
    continueAfterFailure = false
    let missing = try nativeDriverPrerequisite()
    if !missing.isEmpty { throw XCTSkip("Independent UIKit raw keys unavailable: " + missing.joined(separator: ", ")) }
  }
  func testOwnedChildKeyboardPolicies() throws {
    continueAfterFailure = false
    let missing = try nativeDriverPrerequisite()
    let keys = ["Enter", " ", "a"].filter { !missing.contains($0 == " " ? "Space" : $0 == "a" ? "A" : $0) }
    XCTAssertFalse(keys.isEmpty, "Independent UIKit must receive at least one complete raw key pair")
    app.launchArguments=[]; app.launch(); defer { app.terminate() }
    XCTAssertTrue(node("catalog-tabs").waitForExistence(timeout:20))
    let tab=node("catalog-tab-Wrappers")
    for _ in 0..<16 { if tab.exists && tab.isHittable { break }; node("catalog-tabs").swipeLeft() }
    XCTAssertTrue(tab.isHittable); tab.tap()
    XCTAssertTrue(node("root-layout-group-keyboard").waitForExistence(timeout:15))
    node("root-layout-group-keyboard").tap()
    waitFor("Every key root must be ready") { self.receipt()["ready"] as? Bool == true }
    let initial=try settled(), tags=try XCTUnwrap(initial["nodes"] as? [String:Int])
    var states:[[String:Any]]=[]
    for policy in ["observe", "prevent", "stop"] {
      if policy != "observe" { reveal("form-group-keyboard-policy").tap() }
      waitFor("Policy must update") { self.receipt()["policy"] as? String == policy }
      for key in keys {
        for kind in kinds {
          // Touch focus and its click are cleared before native keyboard input.
          reveal("form-group-keyboard-" + kind + "-button").tap()
          waitFor("Actual child focus must acknowledge the public ref request") { self.receipt()["focused"] as? Int == tags[kind + "-button"] }
          reveal("form-group-keyboard-reset").tap()
          waitFor("Native log reset must settle without losing child focus") {
            let value = self.receipt()
            return value["total"] as? Int == 0 && (value["entries"] as? [[String: Any]])?.isEmpty == true && (value["clicks"] as? [String: Int])?.isEmpty == true && value["focused"] as? Int == tags[kind + "-button"]
          }
          let reset = try settled()
          XCTAssertEqual(reset["total"] as? Int, 0)
          XCTAssertTrue((reset["entries"] as? [[String: Any]])?.isEmpty == true)
          XCTAssertTrue((reset["clicks"] as? [String: Int])?.isEmpty == true)
          XCTAssertEqual(reset["focused"] as? Int, tags[kind + "-button"])
          if key == "Enter" {
            if enterCode == "NumpadEnter" { app.typeKey(.enter, modifierFlags: []) }
            else { app.typeKey(.return, modifierFlags: []) }
          }
          else { app.typeKey(key, modifierFlags: []) }
          waitFor("Actual native key-up must complete the dispatch") {
            (self.receipt()["entries"] as? [[String: Any]])?.contains { ($0["phase"] as? String) == (kind == "native" ? "up" : "up-capture") } == true
          }
          let current=try settled()
          XCTAssertEqual(current["focused"] as? Int, tags[kind + "-button"])
          try validate(current,tags:tags,kind:kind,key:key,policy:policy)
          states.append(["kind":kind,"key":key,"policy":policy,"metadata":current])
        }
      }
      capture("form-group-keyboard-" + policy)
    }
    XCTAssertEqual(states.count, keys.count * kinds.count * 3)
    let report:[String:Any] = ["schemaVersion":1,"scenario":"form-group-keyboard-ios-v1","driver":"XCTest native key injection","platformVersion":UIDevice.current.systemVersion,"status":missing.isEmpty ? "passed" : "partial", "unverifiedRawKeys":missing, "verifiedCases":states.count, "enterCode":enterCode, "initial":initial,"states":states]
    let data=try JSONSerialization.data(withJSONObject:report,options:[.sortedKeys,.prettyPrinted])
    let documents=try XCTUnwrap(FileManager.default.urls(for:.documentDirectory,in:.userDomainMask).first)
    try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
    try data.write(to:documents.appendingPathComponent("form-group-keyboard-report.json"),options:.atomic)
    let attachment=XCTAttachment(data:data,uniformTypeIdentifier:"public.json");attachment.name="form-group-keyboard-report";attachment.lifetime = .keepAlways;add(attachment)
    if !missing.isEmpty { throw XCTSkip("Verified \(states.count) cases for available raw keys; independent UIKit did not receive " + missing.joined(separator: ", ") + ", which remains unverified") }
  }
}
