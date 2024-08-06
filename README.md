# uweb: web-code extension

- Turns `__visual_snapshot__/*.snapshot` files into images (requires an active ussh session).
- Multiple commands to jumping between `web-code` projects faster.
- Quick jump into SourceGraph from any file/line of code.

This extension works only if the web-code workspace (or a nested workspace) is open since it needs to locate the monorepo root. You can also set it manually through the `WEB_CODE_ENV` envirnoment variable (add it to you `~/.zshrc`).

## uweb: Open Sourcegraph for the current file

`uweb.openSourcegraph`

Opens the file in Sourcegraph including the selected line(s) of code.

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
