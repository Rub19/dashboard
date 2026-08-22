import { XcodeProject } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const widget = project.findTarget("EthoneWidgets");
if (!widget) throw new Error("EthoneWidgets target not found");

const mainGroup = project.rootProject.mainGroup();
if (!mainGroup) throw new Error("Main group not found");

const widgetGroup = mainGroup.ensureGroup("EthoneWidgets");

const controls = [
  "Controls/EthoneFocusControl.swift",
  "Controls/EthoneNewNoteControl.swift",
  "Controls/EthoneBrainIdeaControl.swift",
  "Controls/EthonePresenceControl.swift",
];

const sourcesPhase = widget.ensureSourcesPhase();
for (const control of controls) {
  const file = widgetGroup.createFile(control);
  sourcesPhase.ensureBuildFile(file);
}

widget.setBuildSetting("IPHONEOS_DEPLOYMENT_TARGET", "18.0");

fs.writeFileSync(projectPath, project.build());
console.log("Controls added to EthoneWidgets target.");
