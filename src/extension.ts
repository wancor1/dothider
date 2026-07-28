import * as vscode from 'vscode';

const EXTENSION_ID = 'dothider';
const DEFAULT_PATTERNS = ['**/.*'];

type SaveTarget = 'workspace' | 'user';

let statusBarItem: vscode.StatusBarItem | undefined;

function getConfig() {
return vscode.workspace.getConfiguration(EXTENSION_ID);
}

function getPatterns(): string[] {
const patterns = getConfig().get<string[]>('patterns');
if (Array.isArray(patterns) && patterns.length > 0) {
return patterns.filter((p) => typeof p === 'string' && p.length > 0);
}
return [...DEFAULT_PATTERNS];
}

function getSaveTarget(): vscode.ConfigurationTarget {
const target = getConfig().get<SaveTarget>('target', 'workspace');
return target === 'user'
? vscode.ConfigurationTarget.Global
: vscode.ConfigurationTarget.Workspace;
}

function getFilesExclude(): Record<string, unknown> {
const filesConfig = vscode.workspace.getConfiguration('files');
return filesConfig.get<Record<string, unknown>>('exclude') ?? {};
}

function isHidden(): boolean {
const exclude = getFilesExclude();
return getPatterns().every((pattern) => exclude[pattern] === true);
}

async function setHidden(hidden: boolean): Promise<void> {
const filesConfig = vscode.workspace.getConfiguration('files');
const exclude = { ...getFilesExclude() };
const patterns = getPatterns();
const target = getSaveTarget();

if (hidden) {
for (const pattern of patterns) {
exclude[pattern] = true;
}
} else {
for (const pattern of patterns) {
delete exclude[pattern];
}
}

await filesConfig.update('exclude', exclude, target);
await updateStatusBar();
}

async function toggleHidden(): Promise<void> {
await setHidden(!isHidden());
}

async function showHidden(): Promise<void> {
await setHidden(false);
}

async function hideHidden(): Promise<void> {
await setHidden(true);
}

async function updateStatusBar(): Promise<void> {
if (!statusBarItem) {
return;
}

const hidden = isHidden();

statusBarItem.text = vscode.l10n.t(hidden ? 'DotHider: Hide' : 'DotHider: Show');
statusBarItem.tooltip = vscode.l10n.t(hidden
? 'Dotfiles are hidden. Click to show.'
: 'Dotfiles are visible. Click to hide.');

statusBarItem.show();
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
statusBarItem.command = 'dothider.toggle';
context.subscriptions.push(statusBarItem);

context.subscriptions.push(
vscode.commands.registerCommand('dothider.toggle', toggleHidden),
vscode.commands.registerCommand('dothider.show', showHidden),
vscode.commands.registerCommand('dothider.hide', hideHidden),
vscode.workspace.onDidChangeConfiguration(async (event) => {
if (
event.affectsConfiguration(`${EXTENSION_ID}.patterns`) ||
event.affectsConfiguration(`${EXTENSION_ID}.target`) ||
event.affectsConfiguration('files.exclude')
) {
await updateStatusBar();
}
})
);

await updateStatusBar();
}

export function deactivate(): void {
statusBarItem?.dispose();
statusBarItem = undefined;
}
