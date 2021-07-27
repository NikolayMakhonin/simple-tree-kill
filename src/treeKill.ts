import {spawn, spawnSync} from 'child_process'

function _spawn(command: string, args: string[], sync?: boolean) {
	console.log(command + ' ' + args.join(' '))
	if (sync) {
		spawnSync(command, args, {
			stdio      : 'inherit', // 'ignore',
			windowsHide: true,
		})
	} else {
		spawn(command, args, {
			detached   : true,
			stdio      : 'ignore',
			windowsHide: true,
		})
			.unref()
	}
}

function getChildPidsUnix(parentPid: number|string): string[] {
	const psTree = spawnSync('ps', ['-o', 'pid=,ppid='], {
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
	sync,
}: {
	pid: number,
	signal: NodeJS.Signals | number,
	sync?: boolean,
}) {
	const childPids = getChildPidsUnix(pid)
	childPids.push(pid.toString())
	_spawn('kill', ['-s', signal.toString(), ...childPids], sync)
}

export function treeKillWindows({
	pid,
	force,
	sync,
}: {
	pid: number,
	force?: boolean,
	sync?: boolean,
}) {
	const params: string[] = []
	if (force) {
		params.push('/F')
	}
	params.push('/T', '/PID', pid.toString())
	_spawn('taskkill', params, sync)
}

export function treeKill({
	pid,
	force,
	sync,
}: {
	pid: number,
	force?: boolean,
	sync?: boolean,
}) {
	if (process.platform === 'win32') {
		treeKillWindows({pid, force, sync})
	} else {
		treeKillUnix({pid, signal: force ? 'SIGKILL' : 'SIGHUP', sync})
	}
}
