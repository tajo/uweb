# uweb: web-code extension

Makes the navigation in `web-code` easier, adding a few commands. If your workflow is to open a VS Code instance for each individual project, this extension is not going to that useful.

The `WEB_CODE_ENV` env variable needs to be set and pointing to the root of `web-code` and VS Code should be opened with the root of web-code. You should add it to your `~/.zshrc`.

## uweb: Focus Explorer

`uweb.focusExplorer`

1. Prompts a list of all web-code projects.
2. You pick one.
3. The explorer (side tree navigation) reveals and focuses the picked project.

## uweb: Focus Terminal

`uweb.focusTerminal`

1. Prompts a list of all web-code projects.
2. You pick one.
3. A new terminal is opened and focused with `cwd` set to the picked project.

## uweb: Focus Explorer and Terminal

`uweb.focusExplorerAndTerminal`

The combination of other two commands.
