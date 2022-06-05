// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

export const activate = async (context: vscode.ExtensionContext) => {
  if (!process.env.WEB_CODE_PATH) {
    vscode.window.showInformationMessage(
      "You must set env variable WEB_CODE_PATH first!"
    );
    return;
  }
  const webCodePath = process.env.WEB_CODE_PATH || "";
  let items: vscode.QuickPickItem[] = [];
  let recentItems: vscode.QuickPickItem[] = [];

  const addToRecentItems = (item: vscode.QuickPickItem) => {
    recentItems = recentItems.filter(
      (recentItem) => recentItem.label !== item.label
    );
    recentItems.unshift(item);
  };

  const populateProjects = () => {
    if (!items.length) {
      try {
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
    populateProjects();
    const picked = await vscode.window.showQuickPick(
      recentItems.length
        ? [
            {
              label: "recent projects",
              kind: vscode.QuickPickItemKind.Separator,
            },
            ...recentItems.slice(0, 5),
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
    vscode.commands.registerCommand(
      "uweb.focusExplorerAndTerminal",
      async () => {
        const picked = await pickProject();
        if (picked && picked.description && picked.label) {
          const projectPath = path.join(webCodePath, picked.description);
          const newUri = vscode.Uri.file(projectPath);
          vscode.commands.executeCommand("list.collapseAll");
          vscode.commands.executeCommand("revealInExplorer", newUri);
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
        const projectPath = path.join(webCodePath, picked.description);
        const newUri = vscode.Uri.file(projectPath);
        vscode.commands.executeCommand("list.collapseAll");
        vscode.commands.executeCommand("revealInExplorer", newUri);
      }
    }),
    vscode.commands.registerCommand("uweb.focusTerminal", async () => {
      const picked = await pickProject();
      if (picked && picked.description && picked.label) {
        const projectPath = path.join(webCodePath, picked.description);
        const terminal = vscode.window.createTerminal({
          name: picked.label,
          cwd: projectPath,
        });
        terminal.show();
      }
    })
  );
};

export function deactivate() {}
