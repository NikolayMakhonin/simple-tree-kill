import {spawnSync} from 'child_process'

const _spawnSync: typeof spawnSync = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawnSync(command, args, options)
}) as any

function getChildPidsUnix(parentPid: number|string): string[] {
	const psTree = _spawnSync('ps', ['-o', 'pid=,ppid='], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')
		.reduce((tree, o) => {
			let [pid, ppid] = o.split(/ +/)
			pid = pid.trim()
			ppid = ppid.trim()
			let childPids = tree[ppid]
			if (!childPids) {
				tree[ppid] = childPids = []
			}
			childPids.push(pid)
			return tree
		}, {})

	const allChildPids = []
	function appendChildPids(pid: string) {
		const childs = psTree[pid]
		if (childs) {
			for (let i = 0, len = childs.length; i < len; i++) {
				const childPid = childs[i]
				allChildPids.push(childPid)
				appendChildPids(childPid)
			}
		}
	}

	appendChildPids(parentPid.toString())

	return allChildPids
}

export function treeKillUnix({
	pid,
	signal = 'SIGHUP',
}: {
	pid: number,
	signal: NodeJS.Signals | number,
}) {
	const childPids = getChildPidsUnix(pid)
	childPids.push(pid.toString())
	_spawnSync('kill', ['-s', signal.toString(), ...childPids], {
		stdio      : 'inherit',
		windowsHide: true,
	})
}

export function treeKillWindows({
	pid,
	force,
}: {
	pid: number,
	force?: boolean,
}) {
	const params: string[] = []
	if (force) {
		params.push('/F')
	}
	params.push('/T', '/PID', pid.toString())
	_spawnSync('taskkill', params, {
		stdio      : 'inherit',
		windowsHide: true,
	})
}

export function treeKill({
	pid,
	force,
}: {
	pid: number,
	force?: boolean,
}) {
	if (process.platform === 'win32') {
		treeKillWindows({pid, force})
	} else {
		treeKillUnix({pid, signal: force ? 'SIGKILL' : 'SIGHUP'})
	}
}
