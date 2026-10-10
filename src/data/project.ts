// The release the site's words describe: its notes and source, not the older README alone.
// Per release, change `release` and `reviewed`, review the pages, verify and publish dist; the
// installer needs no change (see ops/installer.md).
export const project = {
  name: 'Vox Lucis',
  repository: 'https://github.com/robertelee78/vox',
  release: 'v0.4.1',
  reviewed: '2026-10-09',
  site: 'https://voxlucis.us',
} as const;

export const releaseUrl = `${project.repository}/releases/tag/${project.release}`;
export const sourceUrl = `${project.repository}/tree/${project.release}`;
// GitHub's latest release's install.sh: no version, so a release needs no server change. Never
// mirror the script here.
export const installerSourceUrl = `${project.repository}/releases/latest/download/install.sh`;
export const installCommand = `curl -fsSL ${project.site}/install.sh | sh`;
export const sourceCommand = `git clone --branch ${project.release} --depth 1 ${project.repository}.git\ncd vox\ncargo build --release --locked -p vox-tui`;
export const adr = (name: string) => `${project.repository}/blob/${project.release}/docs/adr/${name}.md`;

// The v0.4.1 milestone and its tag: what the site describes is what that release ships.
export const directionUrl = `${project.repository}/milestone/7`;
export const directionSource = `${project.repository}/tree/${project.release}`;
