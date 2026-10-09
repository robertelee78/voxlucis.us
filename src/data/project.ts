// Reviewed against the published release and its source, not the older README alone.
export const project = {
  name: 'Vox Lux',
  repository: 'https://github.com/robertelee78/vox',
  release: 'v0.4.0',
  reviewed: '2026-10-08',
  site: 'https://voxlux.us',
} as const;

export const releaseUrl = `${project.repository}/releases/tag/${project.release}`;
export const sourceUrl = `${project.repository}/tree/${project.release}`;
export const installerSourceUrl = `${project.repository}/releases/download/${project.release}/install.sh`;
// GitHub's release-asset digest and size, checked 2026-10-08. Never mirror the script here.
export const installerSha256 = '8fb2a596b727dfb357e4a979feaee5dbf8fdaa6584e4190279989e8aa8113e71';
export const installerSize = 22926;
export const installCommand = `curl -fsSL ${project.site}/install.sh | sh`;
export const sourceCommand = `git clone --branch ${project.release} --depth 1 ${project.repository}.git\ncd vox\ncargo build --release --locked -p vox-tui`;
export const adr = (name: string) => `${project.repository}/blob/${project.release}/docs/adr/${name}.md`;

// The v0.4.0 milestone and its tag: what the site describes is what that release ships.
export const directionUrl = `${project.repository}/milestone/6`;
export const directionSource = `${project.repository}/tree/${project.release}`;
