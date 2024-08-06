import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

let repoRoot = "";

function findWebCodeDir(dir: string): string {
  const packageJsonPath = path.join(dir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (packageJson.name === "web-code") {
      return dir;
    }
  }
  const parentDir = path.resolve(dir, "..");
  if (parentDir === dir) {
    return "";
  }
  return findWebCodeDir(parentDir);
}

const getRootDir = async () => {
  if (repoRoot !== "") {
    return repoRoot;
  }
  if (process.env.WEB_CODE_PATH) {
    return process.env.WEB_CODE_PATH;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    return "";
  }
  for (const folder of folders) {
    const found = await findWebCodeDir(folder.uri.fsPath);
    if (found) {
      repoRoot = found;
      return found;
    }
  }
  vscode.window.showInformationMessage(
    "The web-code root cannot be auto-located. Please set env variable WEB_CODE_PATH."
  );
  return "";
};

export default getRootDir;
