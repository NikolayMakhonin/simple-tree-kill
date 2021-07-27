import {spawn, spawnSync, StdioOptions} from 'child_process'

const _spawnSync: typeof spawnSync = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawnSync(command, args, options)
}) as any

const _spawn: typeof spawn = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawn(command, args, options)
}) as any

function arrayToSet<T>(arr: T[]): Set<T> {
	return arr.reduce((set, o) => {
		set.add(o)
		return set
	}, new Set<T>())
}

function setToArray<T>(set: Set<T>): T[] {
	return Array.from(set.values())
}

function setDeleteAll<T>(set: Set<T>, items: T[]) {
	if (items) {
		for (let i = 0, len = items.length; i < len; i++) {
			set.delete(items[i])
		}
	}
}

function setAddAll<T>(set: Set<T>, items: T[]) {
	if (items) {
		for (let i = 0, len = items.length; i < len; i++) {
			set.add(items[i])
		}
	}
}

function ps(): string[] {
	return _spawnSync('ps', ['-A', '-o', 'ppid=,pid='], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')
}

function wmic(): string[] {
	const result = _spawnSync('wmic.exe', ['PROCESS', 'GET', 'ParentProcessId,ProcessId'], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')

	result.shift()

	return result
}

function getChildPids(parentPids: string[]): Set<string> {
	const parentPidsSet = arrayToSet(parentPids)

	const lines = process.platform === 'win32'
		? wmic()
		: ps()

	const processTree = lines
		.reduce((tree, line) => {
			line = line.trim()
			if (!line) {
				return tree
			}
			// console.log('ps: ' + line)
			let [ppid, pid] = line.split(/ +/)
			pid = pid.trim()
			ppid = ppid.trim()

			let childPids = tree[ppid]
			if (!childPids) {
				tree[ppid] = childPids = []
			}
			childPids.push(pid)

			return tree
		}, {})

	const allChildPids = new Set<string>()
	function appendChildPids(pids: string[], parentPid?: string) {
		for (let i = 0, len = pids.length; i < len; i++) {
			const pid = pids[i]
			if (pid === parentPid) {
				continue
			}
			const childs = processTree[pid]
			if (childs) {
				for (let j = 0, len2 = childs.length; j < len2; j++) {
					const childPid = childs[j]
					if (!parentPidsSet.has(childPid)) {
						allChildPids.add(childPid)
					}
				}
				appendChildPids(childs, pid)
			}
		}
	}

	appendChildPids(parentPids)

	return allChildPids
}

export function treeKill({
	parentsPids,
	ignorePids,
	force,
	showWarnings,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	force: boolean,
	showWarnings?: boolean,
}) {
	const _parentsPids = parentsPids.map(o => o.toString().trim())
	const treePidsSet = getChildPids(_parentsPids)

	setAddAll(treePidsSet, _parentsPids)
	setDeleteAll(treePidsSet, ignorePids)
	const treePids = setToArray(treePidsSet)

	const stdio: StdioOptions = showWarnings
		? 'inherit'
		: ['inherit', 'inherit', 'ignore']

	if (process.platform === 'win32') {
		const params: string[] = []
		if (force) {
			params.push('/F')
		}
		// params.push('/T')
		for (let i = 0; i < treePids.length; i++) {
			params.push('/PID')
			params.push(treePids[i].toString())
		}
		_spawn('taskkill', params, {
			detached   : true,
			stdio      : 'ignore',
			windowsHide: true,
		})
			.unref()
	} else {
		_spawn('kill', ['-s', force ? 'SIGKILL' : 'SIGHUP', ...treePids], {
			detached   : true,
			stdio      : 'ignore',
			windowsHide: true,
		})
			.unref()
	}
}
