import {spawnSync} from 'child_process'

const _spawnSync: typeof spawnSync = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawnSync(command, args, options)
}) as any

function getChildPidsUnix(parentPids: string[]): string[] {
	const psTree = _spawnSync('ps', ['-o', 'pid=,ppid=,sid='], {
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
			let [pid, ppid, sid] = line.split(/ +/)
			pid = pid.trim()
			ppid = ppid.trim()
			sid = sid.trim()

			let childPids = tree[ppid]
			if (!childPids) {
				tree[ppid] = childPids = []
			}
			childPids.push(pid)

			childPids = tree[sid]
			if (!childPids) {
				tree[sid] = childPids = []
			}
			childPids.push(pid)

			return tree
		}, {})

	const allChildPids = []
	function appendChildPids(pids: string[]) {
		for (let i = 0, len = pids.length; i < len; i++) {
			const pid = pids[i]
			const childs = psTree[pid]
			if (childs) {
				for (let j = 0, len2 = childs.length; j < len2; j++) {
					const childPid = childs[j]
					if (childPid !== pid) {
						allChildPids.push(childPid)
						appendChildPids(childPid)
					}
				}
			}
		}
	}

	appendChildPids(parentPids)

	return allChildPids
}

export function treeKillUnix({
	pids,
	signal = 'SIGHUP',
}: {
	pids: (number|string)[],
	signal: NodeJS.Signals | number,
}) {
	const _pids = pids.map(o => o.toString())
	const childPids = getChildPidsUnix(_pids)
	childPids.push(..._pids)
	_spawnSync('kill', ['-s', signal.toString(), ...childPids], {
		stdio      : 'inherit',
		windowsHide: true,
	})
}

export function treeKillWindows({
	pids,
	force,
}: {
	pids: (number|string)[],
	force?: boolean,
}) {
	const params: string[] = []
	if (force) {
		params.push('/F')
	}
	params.push('/T', '/PID')
	for (let i = 0; i < pids.length; i++) {
		params.push('/PID')
		params.push(pids[i].toString())
	}
	_spawnSync('taskkill', params, {
		stdio      : 'inherit',
		windowsHide: true,
	})
}

export function treeKill({
	pids,
	force,
}: {
	pids: (number|string)[],
	force?: boolean,
}) {
	if (process.platform === 'win32') {
		treeKillWindows({pids, force})
	} else {
		treeKillUnix({pids, signal: force ? 'SIGKILL' : 'SIGHUP'})
	}
}
