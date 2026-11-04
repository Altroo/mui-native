/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import UIKit

/** Debug catalog control without a React/MUI view tree. Never included in library packages. */
enum NativeKeyboardDriverControl {
  static func window(for scene: UIScene) -> UIWindow? {
#if DEBUG
    guard ProcessInfo.processInfo.arguments.contains("--mui-native-key-control"),
      let windowScene = scene as? UIWindowScene else { return nil }
    let window = UIWindow(windowScene: windowScene)
    window.rootViewController = NativeKeyControlController()
    return window
#else
    return nil
#endif
  }
}

#if DEBUG

private final class NativeKeyControlField: UITextField {
  var commandReceipt: ((String) -> Void)?
  var pressReceipt: ((String) -> Void)?
  override var keyCommands: [UIKeyCommand]? {
    var commands = super.keyCommands ?? []
    for input in [UIKeyCommand.inputDownArrow, UIKeyCommand.inputEscape] {
      for combination in 0..<32 {
        var flags: UIKeyModifierFlags = []
        if combination & 1 != 0 { flags.insert(.shift) }
        if combination & 2 != 0 { flags.insert(.control) }
        if combination & 4 != 0 { flags.insert(.alternate) }
        if combination & 8 != 0 { flags.insert(.command) }
        if combination & 16 != 0 { flags.insert(.alphaShift) }
        let command = UIKeyCommand(input: input, modifierFlags: flags, action: #selector(recordCommand(_:)))
        command.wantsPriorityOverSystemBehavior = true
        command.allowsAutomaticLocalization = false
        command.allowsAutomaticMirroring = false
        commands.append(command)
      }
    }
    return commands
  }
  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    action == #selector(recordCommand(_:)) || super.canPerformAction(action, withSender: sender)
  }
  @objc private func recordCommand(_ command: UIKeyCommand) {
    commandReceipt?(command.input == UIKeyCommand.inputEscape ? "Escape" : "ArrowDown")
  }
  override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    for press in presses { if let key = press.key { pressReceipt?("down:\(key.keyCode.rawValue)") } }
    super.pressesBegan(presses, with: event)
  }
  override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    for press in presses { if let key = press.key { pressReceipt?("up:\(key.keyCode.rawValue)") } }
    super.pressesEnded(presses, with: event)
  }
}
private final class NativeKeyControlController: UIViewController {
  let field = NativeKeyControlField()
  let receipt = UILabel()
  var counts: [String: Int] = ["ArrowDown": 0, "Escape": 0]
  var presses: [String] = []
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    let title = UILabel()
    title.text = "Native keyboard control"
    title.font = .preferredFont(forTextStyle: .title2)
    field.accessibilityIdentifier = "native-key-editor"
    field.text = "Native"
    field.borderStyle = .roundedRect
    field.autocorrectionType = .no
    field.autocapitalizationType = .none
    receipt.accessibilityIdentifier = "native-key-receipt"
    receipt.isAccessibilityElement = true
    receipt.numberOfLines = 0
    let stack = UIStackView(arrangedSubviews: [title, field, receipt])
    stack.axis = .vertical
    stack.spacing = 24
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
      field.heightAnchor.constraint(equalToConstant: 56),
    ])
    field.commandReceipt = { [weak self] key in
      guard let self else { return }
      self.counts[key, default: 0] += 1
      self.updateReceipt()
    }
    field.pressReceipt = { [weak self] press in
      guard let self else { return }
      self.presses = Array((self.presses + [press]).suffix(16))
      self.updateReceipt()
    }
    updateReceipt()
  }
  private func updateReceipt() {
    let value: [String: Any] = ["counts": counts, "presses": presses, "escapeInput": UIKeyCommand.inputEscape]
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    receipt.text = String(data: data, encoding: .utf8)
  }
}

#endif
