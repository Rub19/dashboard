import { XcodeProject, Isa } from "rork-xcode";
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

const resourcesPhase = widget.findBuildPhase(Isa.resourcesBuildPhase);
if (resourcesPhase) {
  // Remove any build file whose reference is Info.plist
  const buildFileIds = resourcesPhase.buildFileIds;
  for (const buildFileId of buildFileIds) {
    const buildFile = project.get(buildFileId);
    if (!buildFile) continue;
    const fileRefId = buildFile.properties.fileRef;
    if (!fileRefId) continue;
    const fileRef = project.get(fileRefId);
    if (fileRef?.properties?.path === "Info.plist") {
      resourcesPhase.removeBuildFile(buildFileId);
      project.removeObject(buildFileId);
      console.log("Removed Info.plist from resources phase.");
    }
  }
}

fs.writeFileSync(projectPath, project.build());
console.log("Done.");
