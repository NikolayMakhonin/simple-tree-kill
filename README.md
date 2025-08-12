<!-- Markdown Docs: -->
<!-- https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown -->
<!-- https://daringfireball.net/projects/markdown/basics -->
<!-- https://daringfireball.net/projects/markdown/syntax -->

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][github-actions-badge]][github-actions-url]

# @flemist/simple-tree-kill

Cross-platform process tree killer for Node.js.

## Install

```bash
npm install @flemist/simple-tree-kill
```

## Usage

```typescript
import { treeKill, getChildPids, kill } from '@flemist/simple-tree-kill'

// Kill process and all children
treeKill({
  parentsPids: [1234],
  force: true
})

// Kill multiple processes, skip some PIDs
treeKill({
  parentsPids: [1234, 5678],
  ignorePids: [9999],
  force: false
})

// Get all PIDs in tree without killing
const pids = getChildPids({
  parentsPids: [1234]
})

// Kill specific PIDs only
kill({
  pids: [1234, 5678],
  force: true
})

// Auto-kill children on process exit
const cleanup = autoKillChilds()
// Call cleanup() to stop auto-killing
```

## API

### treeKill(options)
- `parentsPids: (number|string)[]` - processes to kill with children
- `ignorePids?: (number|string)[]` - PIDs to skip
- `force: boolean` - force kill vs graceful

### getChildPids(options)  
- `parentsPids: (number|string)[]` - parent processes
- `ignorePids?: (number|string)[]` - PIDs to skip
- Returns: `Set<string>` - all PIDs in tree

### kill(options)
- `pids: (string|number)[]` - processes to kill
- `force: boolean` - force kill vs graceful

### autoKillChilds()
Auto-kills child processes when current process exits. Returns cleanup function.

## Platform Support

- Windows: `taskkill`, `wmic`
- Unix/Linux: `kill`, `ps`
- Node.js >= 12

# License

[Unlimited Free](LICENSE)

[npm-image]: https://img.shields.io/npm/v/@flemist/simple-tree-kill.svg
[npm-url]: https://npmjs.org/package/@flemist/simple-tree-kill
[node-version-image]: https://img.shields.io/node/v/@flemist/simple-tree-kill.svg
[node-version-url]: https://nodejs.org/en/download/
[github-actions-badge]: https://github.com/NikolayMakhonin/simple-tree-kill/actions/workflows/build.yml/badge.svg
[github-actions-url]: https://github.com/NikolayMakhonin/simple-tree-kill/actions
[downloads-image]: https://img.shields.io/npm/dm/@flemist/simple-tree-kill.svg
[downloads-url]: https://npmjs.org/package/@flemist/simple-tree-kill
[npm-url]: https://npmjs.org/package/@flemist/simple-tree-kill
