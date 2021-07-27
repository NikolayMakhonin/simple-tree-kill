import {spawn} from 'child_process'
import {treeKill} from './treeKill'

setTimeout(() => {
	// to prevent auto close process
}, 60000)

const level = parseInt(process.argv[2], 10)
const cliId = process.argv[3]

function runChild(shell: boolean) {
	const proc = spawn('node', [
		__filename,
		(level + 1).toString(),
		cliId,
	], {
		detached   : true,
		stdio      : 'ignore',
		windowsHide: true,
		shell,
	})
	proc.unref()
}

const runChildBeforeClose = false // (level === 0 || level === 2) && process.platform === 'win32'

process.once('exit', () => {
	if (runChildBeforeClose) {
		runChild(false)
		runChild(true)
	}

	if (level === 0) {
		treeKill({
			parentsPids: [process.pid],
			ignorePids : [process.pid],
			force      : true,
		})
	}

	// eslint-disable-next-line no-process-exit
	process.exit(0)
})

if (level === 0) {
	setTimeout(() => {
		setTimeout(() => {
			// eslint-disable-next-line no-process-exit
			process.exit(0)
		}, 500)
	}, 1000)
} else if (runChildBeforeClose) {
	// eslint-disable-next-line no-process-exit
	process.exit(0)
}

if (!runChildBeforeClose && level <= 3) {
	runChild(true)
	runChild(false)
}
