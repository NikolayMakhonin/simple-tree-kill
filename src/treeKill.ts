import {spawn, spawnSync} from 'child_process'

function _spawn(command: string, args: string[], sync?: boolean) {
	console.log(command + args.join(' '))
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

export function treeKillUnix({
	pid,
	signal = 'SIGHUP',
	sync,
}: {
	pid: number,
	signal: NodeJS.Signals | number,
	sync?: boolean,
}) {
	_spawn('pkill', ['--signal', signal.toString(), '-P', pid.toString()], sync)
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
