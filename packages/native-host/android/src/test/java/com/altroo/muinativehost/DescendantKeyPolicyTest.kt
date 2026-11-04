/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package com.altroo.muinativehost

// Execute the same sequence policy used by the real View, without UI/JUnit dependencies.
fun main() {
  val policy = DescendantKeyPolicy<String>()
  var assertions = 0
  fun expect(value: Boolean) { check(value); assertions++ }
  fun event(time: Long = 10, device: Int = 1, code: Int = 20) = DescendantPhysicalKey(device, code, time)
  fun dispatch(key: DescendantPhysicalKey = event(), down: Boolean = true, repeat: Boolean = false,
    canceled: Boolean = false, target: String? = "input-A", valid: Boolean = true) =
    policy.dispatch(key, down, repeat, canceled, target) { valid && it == target }

  expect(event(device=-1,code=111).sequenceToken() == "-1:111:10")
  expect(event(device=2,code=111).sequenceToken() != event(code=111).sequenceToken())
  expect(event(time=11,code=111).sequenceToken() != event(code=111).sequenceToken())
  expect(dispatch().target == "input-A")
  expect(policy.contains(event()))
  expect(dispatch(repeat=true).target == "input-A")
  expect(dispatch(down=false).target == "input-A")
  expect(!policy.contains(event()))
  expect(!dispatch(down=false).consumed)
  expect(!dispatch(repeat=true).consumed)
  expect(!dispatch(target=null).consumed) // Undeclared, composing, soft or unknown editor.
  expect(!dispatch(canceled=true).consumed)

  dispatch()
  val closed = dispatch(down=false, target=null)
  expect(closed.consumed && closed.target == null)
  dispatch()
  val moved = dispatch(repeat=true, target="input-B")
  expect(moved.consumed && moved.target == null)
  val upAfterMove = dispatch(down=false, target="input-B")
  expect(upAfterMove.consumed && upAfterMove.target == null)
  dispatch()
  val composing = dispatch(down=false, valid=false)
  expect(composing.consumed && composing.target == null)
  dispatch()
  expect(dispatch(repeat=true, valid=false).target == null)
  val resumed = dispatch(down=false)
  expect(resumed.consumed && resumed.target == null) // An invalidated lease cannot resurrect.
  dispatch()
  val canceled = dispatch(down=false, canceled=true)
  expect(canceled.consumed && canceled.target == null)

  dispatch()
  expect(dispatch(event(time=11), target="input-B").target == "input-B")
  expect(!dispatch(event(), down=false).consumed) // An old up cannot release the replacement.
  expect(policy.contains(event(time=11)))
  expect(dispatch(event(device=2), target="input-C").target == "input-C")
  expect(dispatch(event(time=11), down=false, target="input-B").target == "input-B")
  expect(policy.contains(event(device=2)))
  policy.clear()
  expect(!policy.contains(event(device=2)))
  expect(!dispatch(event(device=2), down=false).consumed)
  expect(descendantNavigationKeys.containsAll(listOf("ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Enter", "Tab", "Escape")))
  expect(listOf(" ", "a", "ArrowRight", "Backspace", "Delete").none { it in descendantNavigationKeys })
  expect("ArrowLeft" in descendantNavigationKeys)
  expect(descendantCaretEligible("ArrowLeft", 0, 0))
  expect(!descendantCaretEligible("ArrowLeft", 1, 1))
  expect(!descendantCaretEligible("ArrowLeft", 0, 1))
  expect(!descendantCaretEligible("ArrowLeft", 1, 0))
  expect(!descendantCaretEligible("ArrowLeft", -1, -1))
  expect(!descendantCaretEligible("ArrowLeft", null, null))
  expect(descendantCaretEligible("ArrowDown", null, null))
  println("Native descendant-key JVM policy: $assertions sequence/ownership assertions passed; no UI executed.")
}
