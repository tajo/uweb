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
    recentItems = recentItems
      .filter((recentItem) => recentItem.label !== item.label)
      .slice(0, 4);
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
    vscode.commands.registerCommand(
      "uweb.focusExplorerAndTerminal",
      async () => {
        const picked = await pickProject();
        if (picked && picked.description && picked.label) {
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
        const projectPath = path.join(webCodePath, picked.description);
        const newUri = vscode.Uri.file(projectPath);
        await vscode.commands.executeCommand("list.collapseAll");
        await vscode.commands.executeCommand("revealInExplorer", newUri);
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
    }),
    vscode.commands.registerCommand("uweb.openSourcegraph", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const filePath = editor.document.uri.fsPath;
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
            `https://sourcegraph.uberinternal.com/code.uber.internal/web-code/-/blob${srcPath}${loc}`
          )
        );
      }
    })
  );
};

export function deactivate() {}
