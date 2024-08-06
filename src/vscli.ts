import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import getRepoRoot from "./repo-root";

const execPromise = promisify(exec);

const getArtifactsPath = async () => {
  const artifactsPath = path.join(
    await getRepoRoot(),
    "artifacts",
    "__visual_snapshots__"
  );
  fs.mkdirSync(artifactsPath, { recursive: true });
  return artifactsPath;
};

let ussoToken = "";
const getUssoToken = async (staging = false) => {
  if (ussoToken !== "") {
    return ussoToken;
  }
  const { stdout, stderr } = await execPromise(
    `usso -ussh visual-snapshots.uberinternal.com -print`
  );
  if (stderr) {
    if (!stderr.includes("found uSSO token for https://visual-snapshots")) {
      console.error(stderr);
    }
  }
  ussoToken = stdout.split("\n")[0].trim();
  return ussoToken;
};

export const vscli = async ({
  command,
  inputs,
  args = {},
}: {
  command: string;
  inputs: string[];
  args?: Record<string, string>;
}) => {
  args.token = await getUssoToken();
  try {
    const argsString = Object.keys(args)
      .map((key) => `--${key}=${args[key]}`)
      .join(" ");
    let configPath = path.join(
      await getRepoRoot(),
      "src/infra/devplatform/web-ops/@uber/visual-snapshots/vscli.yaml"
    );
    const cmd = `uexec ${configPath} ${command} ${inputs.join(
      " "
    )} ${argsString}`;
    const { stdout, stderr } = await execPromise(cmd, {
      cwd: await getArtifactsPath(),
    });
    if (stderr) {
      console.log(stderr);
    }
    return stdout;
  } catch (error: any) {
    // silence imgdiff mismatch error since it's expected
    if (error.message.includes("failure - diff image saved to")) {
      return;
    }
    throw error;
  }
};

export const downloadSnapshot = async (contentHash: string) => {
  const artifactsPath = await getArtifactsPath();
  if (!fs.existsSync(path.join(artifactsPath, contentHash))) {
    try {
      await vscli({
        command: "download",
        inputs: [contentHash],
      });
    } catch (error) {
      console.log(error);
    }
  }
  return path.join(artifactsPath, contentHash);
};
