# Git and version control

## Observed repository state

- Repository root: `Trafficai`.
- Branch: `main`.
- Remote: `origin` points to `https://github.com/Trex2805/Trafficai.git`.
- Recent local commits include `c5b0e52` (metadata storage), `0bd6959` (connection), and `5e55100` (sub merge file).
- `origin/main` points to `c591678` in the inspected checkout.
- No uncommitted status lines were reported by the read-only status command.

## Ignore policy

`.gitignore` excludes env/credential files, Python/Node environments, caches, datasets, runs, weights, media, storage, archives, backups, and logs. This is appropriate for large artifacts, but the local workspace still contains those artifacts and they must not be added with force.

## Risks

The project contains many historical backups and large local artifacts. The active repository's published README says the source may not match the complete local application. Before a release, verify tracked files, Git LFS/large-file policy, secret history, model licensing, dataset licensing, and a reproducible installation from a clean clone.

No Git operation was performed by this documentation task.
