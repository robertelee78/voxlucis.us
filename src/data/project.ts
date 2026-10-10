// Reviewed against the published release and its source, not the older README alone.
export const project = {
  name: 'Vox Lucis',
  repository: 'https://github.com/robertelee78/vox',
  release: 'v0.4.1',
  reviewed: '2026-10-09',
  site: 'https://voxlucis.us',
} as const;

export const releaseUrl = `${project.repository}/releases/tag/${project.release}`;
export const sourceUrl = `${project.repository}/tree/${project.release}`;
export const installerSourceUrl = `${project.repository}/releases/download/${project.release}/install.sh`;
// GitHub's release-asset digest and size, checked 2026-10-09. Never mirror the script here.
export const installerSha256 = 'a87ef19a69da2919611d76c4b2ac88365d9893fdd640ad926a89140d1ebab9e2';
export const installerSize = 23490;
export const installCommand = `curl -fsSL ${project.site}/install.sh | sh`;
export const sourceCommand = `git clone --branch ${project.release} --depth 1 ${project.repository}.git\ncd vox\ncargo build --release --locked -p vox-tui`;
export const adr = (name: string) => `${project.repository}/blob/${project.release}/docs/adr/${name}.md`;

// The v0.4.1 milestone and its tag: what the site describes is what that release ships.
export const directionUrl = `${project.repository}/milestone/7`;
export const directionSource = `${project.repository}/tree/${project.release}`;
