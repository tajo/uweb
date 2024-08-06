// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { downloadSnapshot } from "./vscli";
import getRepoRoot from "./repo-root";

let openWebviews = new Map();

class SnapshotContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(uri.fsPath, "utf8", (err, data) => {
        if (err) {
          return reject(err);
        }

        const imageUrl = data.trim();
        const htmlContent = `<html><body><img src="${imageUrl}" /></body></html>`;
        resolve(htmlContent);
      });
    });
  }
}

export const activate = async (context: vscode.ExtensionContext) => {
  let items: vscode.QuickPickItem[] = [];
  let recentItems: vscode.QuickPickItem[] = [];

  const addToRecentItems = (item: vscode.QuickPickItem) => {
    recentItems = recentItems
      .filter((recentItem) => recentItem.label !== item.label)
      .slice(0, 4);
    recentItems.unshift(item);
  };

  const populateProjects = async () => {
    if (!items.length) {
      try {
        const webCodePath = await getRepoRoot();
        const packages = require(`${webCodePath}/package.json`).workspaces;
        items = packages
          .map((pkg: string) => {
            const parts = pkg.split("/");
            return { label: parts[parts.length - 1], description: pkg };
          })
          .sort((a: vscode.QuickPickItem, b: vscode.QuickPickItem) =>
            a.label > b.label ? 1 : -1
          );
      } catch (e) {
        vscode.window.showInformationMessage(
          "Couldn't parse web-code/package.json. Is your WEB_CODE_PATH env variable set correctly?"
        );
        return;
      }
    }
  };

  const pickProject = async () => {
    await populateProjects();
    const picked = await vscode.window.showQuickPick(
      recentItems.length
        ? [
            {
              label: "recent projects",
              kind: vscode.QuickPickItemKind.Separator,
            },
            ...recentItems,
            { label: "", kind: vscode.QuickPickItemKind.Separator },
            ...items.filter((item: vscode.QuickPickItem) =>
              recentItems.every((recentItem) => recentItem.label !== item.label)
            ),
          ]
        : items,
      {
        canPickMany: false,
        matchOnDescription: true,
        placeHolder: "Search web-code projects...",
      }
    );
    if (picked) {
      addToRecentItems(picked);
    }
    return picked;
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      const fileName = document.fileName;
      if (
        fileName.endsWith(".snapshot") &&
        fileName.includes("__visual_snapshots__")
      ) {
        const webCodePath = await getRepoRoot();
        if (webCodePath === "") {
          return;
        }
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        if (openWebviews.has(fileName)) {
          const panel = openWebviews.get(fileName);
          panel.reveal(vscode.ViewColumn.One);
        } else {
          const content = document.getText();
          const contentParts = content.trim().split("/");
          const imageName = `${contentParts[contentParts.length - 1]}.png`;
          const parts = fileName.split("/");

          const panel = vscode.window.createWebviewPanel(
            "snapshotWebview",
            parts[parts.length - 1],
            vscode.ViewColumn.One,
            {
              enableScripts: true,
              localResourceRoots: [
                vscode.Uri.file(
                  path.join(webCodePath, "artifacts/__visual_snapshots__")
                ),
              ],
            }
          );
          panel.onDidDispose(() => {
            openWebviews.delete(fileName);
          });
          openWebviews.set(fileName, panel);
          const link = `<p><a href="${content}" style="color: var(--vscode-foreground)">Open in browser</a></p>`;
          panel.webview.html = link;
          const imagePath = await downloadSnapshot(imageName);
          const imageUri = panel.webview.asWebviewUri(
            vscode.Uri.file(imagePath)
          );
          panel.webview.html = `${link}<img src="${imageUri}" />`;
        }
      }
    }),
    vscode.commands.registerCommand(
      "uweb.focusExplorerAndTerminal",
      async () => {
        const picked = await pickProject();
        if (picked && picked.description && picked.label) {
          const webCodePath = await getRepoRoot();
          if (webCodePath === "") {
            return;
          }
          const projectPath = path.join(webCodePath, picked.description);
          const newUri = vscode.Uri.file(projectPath);
          await vscode.commands.executeCommand("list.collapseAll");
          await vscode.commands.executeCommand("revealInExplorer", newUri);
          const terminal = vscode.window.createTerminal({
            name: picked.label,
            cwd: projectPath,
          });
          terminal.show();
        }
      }
    ),
    vscode.commands.registerCommand("uweb.focusExplorer", async () => {
      const picked = await pickProject();
      if (picked && picked.description && picked.label) {
        const webCodePath = await getRepoRoot();
        if (webCodePath === "") {
          return;
        }
        const projectPath = path.join(webCodePath, picked.description);
        const newUri = vscode.Uri.file(projectPath);
        await vscode.commands.executeCommand("list.collapseAll");
        await vscode.commands.executeCommand("revealInExplorer", newUri);
      }
    }),
    vscode.commands.registerCommand("uweb.focusTerminal", async () => {
      const picked = await pickProject();
      if (picked && picked.description && picked.label) {
        const webCodePath = await getRepoRoot();
        if (webCodePath === "") {
          return;
        }
        const projectPath = path.join(webCodePath, picked.description);
        const terminal = vscode.window.createTerminal({
          name: picked.label,
          cwd: projectPath,
        });
        terminal.show();
      }
    }),
    vscode.commands.registerCommand("uweb.openSourcegraph", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const filePath = editor.document.uri.fsPath;
        const webCodePath = await getRepoRoot();
        if (webCodePath === "") {
          return;
        }
        if (!filePath.startsWith(webCodePath)) {
          return;
        }
        const srcPath = filePath.replace(webCodePath, "");
        const start = editor.selection.start.line;
        const end = editor.selection.end.line;
        let loc = "";
        if (start) {
          loc = `#L${start + 1}`;
        }
        if (end && end !== start) {
          loc += `-${end + 1}`;
        }
        vscode.env.openExternal(
          vscode.Uri.parse(
            `https://sg.uberinternal.com/code.uber.internal/uber-code/web-code/-/blob${srcPath}${loc}`
          )
        );
      }
    })
  );
};

export function deactivate() {}
