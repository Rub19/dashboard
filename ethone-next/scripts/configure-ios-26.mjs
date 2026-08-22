import { XcodeProject } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const app = project.findMainAppTarget("ios");
if (!app) throw new Error("App target not found");

const widget = project.findTarget("EthoneWidgets");
if (!widget) throw new Error("EthoneWidgets target not found");

app.setBuildSetting("IPHONEOS_DEPLOYMENT_TARGET", "17.0");
app.setBuildSetting("CODE_SIGN_ENTITLEMENTS", "App/App.entitlements");
app.setBuildSetting("SWIFT_VERSION", "5.0");

widget.setBuildSetting("IPHONEOS_DEPLOYMENT_TARGET", "18.0");

// Create widget entitlements
const widgetEntitlementsPath = path.resolve("ios/App/EthoneWidgets/EthoneWidgets.entitlements");
if (!fs.existsSync(widgetEntitlementsPath)) {
  fs.writeFileSync(widgetEntitlementsPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.dev.ethone.app</string>
	</array>
</dict>
</plist>
`);
}
widget.setBuildSetting("CODE_SIGN_ENTITLEMENTS", "EthoneWidgets/EthoneWidgets.entitlements");

for (const fw of ["AppIntents", "WidgetKit", "ActivityKit", "UserNotifications"]) {
  app.addSystemFramework(fw);
}

fs.writeFileSync(projectPath, project.build());
console.log("iOS 26 build settings configured.");
