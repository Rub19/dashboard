import { XcodeProject } from "rork-xcode";
import fs from "fs";
import path from "path";

const projectPath = path.resolve("ios/App/App.xcodeproj/project.pbxproj");
const text = fs.readFileSync(projectPath, "utf8");
const project = XcodeProject.parse(text);

const widget = project.findTarget("EthoneWidgets");
if (!widget) {
  console.error("EthoneWidgets target not found");
  process.exit(1);
}

widget.setBuildSetting("SKIP_INSTALL", "YES");
widget.setBuildSetting("PRODUCT_NAME", "EthoneWidgets");
widget.setBuildSetting("EXECUTABLE_NAME", "EthoneWidgets");
widget.setBuildSetting("LD_RUNPATH_SEARCH_PATHS", "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks");

fs.writeFileSync(projectPath, project.build());
console.log("EthoneWidgets build settings updated.");
