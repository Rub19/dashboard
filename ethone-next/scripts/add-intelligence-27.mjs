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

const group = mainGroup.ensureGroup("App/Intelligence");
const file = group.createFile("EthoneIntelligence27.swift");

const sourcesPhase = app.ensureSourcesPhase();
sourcesPhase.ensureBuildFile(file);

fs.writeFileSync(projectPath, project.build());
console.log("EthoneIntelligence27.swift added to App target.");
