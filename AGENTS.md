# Project conventions

## Release

- npm package: `repo-notebook`
- Version source: `package.json` only
- Validation: `bun run validate`
- Publish flow: GitLab tag pipeline stages the npm package; a maintainer reviews and approves the staged release with 2FA
- Registry verification: `npm view repo-notebook@<version>`
- CDN verification: `https://cdn.jsdelivr.net/npm/repo-notebook@<version>/README.md`
