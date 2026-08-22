import { XcodeProject, ProductType } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const app = project.findMainAppTarget("ios");
if (!app) throw new Error("App target not found");

// Create widget extension target
const widget = project.addNativeTarget({
  name: "EthoneWidgets",
  productType: ProductType.appExtension,
  buildSettings: {
    PRODUCT_BUNDLE_IDENTIFIER: "dev.ethone.app.EthoneWidgets",
    INFOPLIST_FILE: "EthoneWidgets/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: "Ethone Widgets",
    SWIFT_VERSION: "5.0",
    CODE_SIGN_STYLE: "Manual",
    CODE_SIGN_IDENTITY: "",
    DEVELOPMENT_TEAM: "",
    PROVISIONING_PROFILE_SPECIFIER: "",
    IPHONEOS_DEPLOYMENT_TARGET: "17.0",
    TARGETED_DEVICE_FAMILY: "1,2",
    MARKETING_VERSION: "1.7.63",
    CURRENT_PROJECT_VERSION: "1",
    GENERATE_INFOPLIST_FILE: "NO",
  },
});

// Add frameworks
widget.addSystemFramework("WidgetKit");
widget.addSystemFramework("ActivityKit");
widget.addSystemFramework("SwiftUI");
widget.addSystemFramework("AppIntents");

// Embed into app
app.addDependency(widget);
app.embed(widget);

// Add source files under an EthoneWidgets group
const mainGroup = project.rootProject.mainGroup();
if (!mainGroup) throw new Error("Main group not found");

const widgetGroup = mainGroup.ensureGroup("EthoneWidgets");

const sourceFiles = [
  "EthoneLiveActivity.swift",
  "EthoneWidget.swift",
  "EthoneStandByWidget.swift",
  "EthoneWidgetsBundle.swift",
];

const sourcesPhase = widget.ensureSourcesPhase();
const resourcesPhase = widget.ensureResourcesPhase();

for (const fileName of sourceFiles) {
  const relativePath = fileName === "EthoneStandByWidget.swift" ? `StandBy/${fileName}` : fileName;
  const file = widgetGroup.createFile(relativePath);
  const buildFile = sourcesPhase.ensureBuildFile(file);
}

// Add Info.plist as a resource
const infoPlist = widgetGroup.createFile("Info.plist");
resourcesPhase.ensureBuildFile(infoPlist);

// Add Assets to resources if there is an Assets.xcassets folder
const assetsPath = "Assets.xcassets";
if (fs.existsSync(path.resolve("ios/App/EthoneWidgets/Assets.xcassets"))) {
  const assets = widgetGroup.createFile(assetsPath);
  resourcesPhase.ensureBuildFile(assets);
}

fs.writeFileSync(projectPath, project.build());
console.log("EthoneWidgets target added.");
