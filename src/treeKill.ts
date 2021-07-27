import {spawnSync} from 'child_process'

const _spawnSync: typeof spawnSync = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawnSync(command, args, options)
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

function getChildPidsUnix(parentPids: string[]): Set<string> {
	const parentPidsSet = arrayToSet(parentPids)

	const psTree = _spawnSync('ps', ['-A', '-o', 'pid=,ppid='], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')
		.reduce((tree, line) => {
			line = line.trim()
			if (!line) {
				return tree
			}
			console.log('ps: ' + line)
			let [pid, ppid] = line.split(/ +/)
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
			const childs = psTree[pid]
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

export function treeKillUnix({
	parentsPids,
	ignorePids,
	signal = 'SIGHUP',
	showWarnings,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	signal: NodeJS.Signals | number,
	showWarnings?: boolean,
}) {
	const _parentsPids = parentsPids.map(o => o.toString().trim())
	const treePidsSet = getChildPidsUnix(_parentsPids)

	setAddAll(treePidsSet, _parentsPids)
	setDeleteAll(treePidsSet, ignorePids)
	const treePids = setToArray(treePidsSet)

	_spawnSync('kill', ['-s', signal.toString(), ...treePids], {
		stdio: showWarnings
			? 'inherit'
			: ['inherit', 'inherit', 'ignore'],
		windowsHide: true,
	})
}

export function treeKillWindows({
	parentsPids,
	ignorePids,
	force,
	showWarnings,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	force?: boolean,
	showWarnings?: boolean,
}) {
	let _parentsPids = parentsPids.map(o => o.toString().trim())
	const parentsPidsSet = arrayToSet(_parentsPids)
	setDeleteAll(parentsPidsSet, ignorePids)
	_parentsPids = setToArray(parentsPidsSet)

	const params: string[] = []
	if (force) {
		params.push('/F')
	}
	params.push('/T')

	for (let i = 0; i < _parentsPids.length; i++) {
		params.push('/PID')
		params.push(_parentsPids[i].toString())
	}
	_spawnSync('taskkill', params, {
		stdio: showWarnings
			? 'inherit'
			: ['inherit', 'inherit', 'ignore'],
		windowsHide: true,
	})
}

export function treeKill({
	parentsPids,
	ignorePids,
	force,
	showWarnings,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	force?: boolean,
	showWarnings?: boolean,
}) {
	if (process.platform === 'win32') {
		treeKillWindows({parentsPids, ignorePids, force, showWarnings})
	} else {
		treeKillUnix({parentsPids, ignorePids, signal: force ? 'SIGKILL' : 'SIGHUP', showWarnings})
	}
}
