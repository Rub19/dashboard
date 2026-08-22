import { XcodeProject } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const app = project.findMainAppTarget("ios");
if (!app) throw new Error("App target not found");

const mainGroup = project.rootProject.mainGroup();
if (!mainGroup) throw new Error("Main group not found");

const intentsGroup = mainGroup.ensureGroup("App/Intents");

const sourcesPhase = app.ensureSourcesPhase();
for (const fileName of ["EthoneAppEntities.swift", "EthoneAppShortcuts26.swift"]) {
  const file = intentsGroup.createFile(fileName);
  sourcesPhase.ensureBuildFile(file);
}

fs.writeFileSync(projectPath, project.build());
console.log("iOS 26 intent files added to App target.");
