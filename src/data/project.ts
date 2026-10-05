// Reviewed against the published release and its source, not the older README alone.
export const project = {
  name: 'Vox Lux',
  repository: 'https://github.com/robertelee78/vox',
  release: 'v0.2.10',
  reviewed: '2026-10-03',
  site: 'https://voxlux.us',
} as const;

export const releaseUrl = `${project.repository}/releases/tag/${project.release}`;
export const sourceUrl = `${project.repository}/tree/${project.release}`;
export const installerSourceUrl = `${project.repository}/releases/download/${project.release}/install.sh`;
// GitHub's release-asset digest and size, checked 2026-10-04. Never mirror the script here.
export const installerSha256 = 'aed781b8c04b03c26475e2143ccc0b49e8cef7acbec85c9bc6c1b211ebd641c2';
export const installerSize = 10530;
export const installCommand = `curl -fsSL ${project.site}/install.sh | sh`;
export const sourceCommand = `git clone --branch ${project.release} --depth 1 ${project.repository}.git\ncd vox\ncargo build --release --locked -p vox-tui`;
export const adr = (name: string) => `${project.repository}/blob/${project.release}/docs/adr/${name}.md`;

// Milestone 2 is the website's product-direction baseline; it is not the installer version.
export const directionUrl = `${project.repository}/milestone/2`;
export const directionSource = `${project.repository}/tree/2d8385d4f90891c96843f32d6d002bc1b69aac1e`;
