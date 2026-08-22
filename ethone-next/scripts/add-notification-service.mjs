import { XcodeProject, ProductType } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const app = project.findMainAppTarget("ios");
if (!app) throw new Error("App target not found");

const service = project.addNativeTarget({
  name: "EthoneNotificationService",
  productType: ProductType.appExtension,
  buildSettings: {
    PRODUCT_BUNDLE_IDENTIFIER: "dev.ethone.app.EthoneNotificationService",
    INFOPLIST_FILE: "EthoneNotificationService/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: "Ethone Notification Service",
    SWIFT_VERSION: "5.0",
    CODE_SIGN_STYLE: "Manual",
    CODE_SIGN_IDENTITY: "",
    DEVELOPMENT_TEAM: "",
    PROVISIONING_PROFILE_SPECIFIER: "",
    IPHONEOS_DEPLOYMENT_TARGET: "26.0",
    TARGETED_DEVICE_FAMILY: "1,2",
    MARKETING_VERSION: "1.8.0",
    CURRENT_PROJECT_VERSION: "1",
    GENERATE_INFOPLIST_FILE: "NO",
    SKIP_INSTALL: "YES",
    PRODUCT_NAME: "EthoneNotificationService",
    EXECUTABLE_NAME: "EthoneNotificationService",
    LD_RUNPATH_SEARCH_PATHS: "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
    CODE_SIGN_ENTITLEMENTS: "EthoneNotificationService/EthoneNotificationService.entitlements",
  },
});

service.addSystemFramework("UserNotifications");

app.addDependency(service);
app.embed(service);

const mainGroup = project.rootProject.mainGroup();
if (!mainGroup) throw new Error("Main group not found");

const serviceGroup = mainGroup.ensureGroup("EthoneNotificationService");
const sourcesPhase = service.ensureSourcesPhase();
const file = serviceGroup.createFile("NotificationService.swift");
sourcesPhase.ensureBuildFile(file);

const infoPlist = serviceGroup.createFile("Info.plist");
const resourcesPhase = service.ensureResourcesPhase();
resourcesPhase.ensureBuildFile(infoPlist);

fs.writeFileSync(projectPath, project.build());
console.log("EthoneNotificationService target added.");
