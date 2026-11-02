require "json"
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
  s.source_files = "ios/**/*.{h,m,mm,cpp}"
  install_modules_dependencies(s)
end
