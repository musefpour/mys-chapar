import * as vscode from "vscode";
import { createChaparPanel, openChaparPanel, restoreChaparPanel } from "./panel";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("mychapar.open", () => {
      openChaparPanel(context);
    }),
    vscode.commands.registerCommand("mychapar.newWindow", () => {
      createChaparPanel(context);
    }),
    vscode.window.registerWebviewPanelSerializer("mychapar.panel", {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        restoreChaparPanel(context, panel);
      },
    }),
    vscode.window.registerTreeDataProvider("mychapar.explorer", {
      getTreeItem: (element: vscode.TreeItem) => element,
      getChildren: () => [],
    }),
  );

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  status.text = "$(globe) MYs Chapar";
  status.tooltip = "Open MYs Chapar";
  status.command = "mychapar.open";
  status.show();
  context.subscriptions.push(status);
}

export function deactivate(): void {
  // panels dispose with the extension host
}
