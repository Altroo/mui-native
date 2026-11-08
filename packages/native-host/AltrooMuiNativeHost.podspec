require "json"
react_native_root = Pod::Executable.execute_command("node", [File.join(__dir__, "scripts/verify-structural-input.cjs"), "--root"]).strip
package = JSON.parse(File.read(File.join(__dir__, "package.json")))
Pod::Spec.new do |s|
  s.name = "AltrooMuiNativeHost"
  s.version = package["version"]
  s.summary = package["description"]
  s.homepage = "https://github.com/Altroo/mui-native"
  s.license = { :type => "MIT", :file => "LICENSE" }
  s.author = { "Altroo" => "Altroo@users.noreply.github.com" }
  s.platforms = { :ios => min_ios_version_supported }
  s.source = { :git => "https://github.com/Altroo/mui-native.git", :tag => s.version.to_s }
  s.source_files = "ios/**/*.{h,m,mm,cpp}", "common/cpp/**/*.{h,cpp}"
  # Commands/utilities are private Fabric headers. The source fingerprint above
  # guards this deliberate ABI boundary; the pod keeps stock text-input behavior.
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(inherited) \"$(PODS_TARGET_SRCROOT)/common/cpp\" \"#{react_native_root}/React/Fabric/Mounting/ComponentViews/TextInput\""
  }
  # Xcode can reuse installed pods after a peer change. Validate the actual
  # native source root on every build, using RN's standard Node environment.
  s.script_phase = {
    :name => "Verify native editor peer",
    :execution_position => :before_compile,
    :always_out_of_date => "1",
    :script => <<-SCRIPT
set -e
. "${REACT_NATIVE_PATH}/scripts/xcode/with-environment.sh"
"${NODE_BINARY}" "${PODS_TARGET_SRCROOT}/scripts/verify-structural-input.cjs" --native-root "${REACT_NATIVE_PATH}"
    SCRIPT
  }
  install_modules_dependencies(s)
end
