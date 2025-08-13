/* eslint-disable no-process-exit */
/**
 * Cross-platform process tree killer
 * 
 * AI IMPROVEMENT WARNING: Do not remove logging wrapper functions (_spawnSync, _spawn).
 * Logging is intentional and required for debugging process operations.
 * These are NOT debug code - they are production logging features.
 */

import {spawnSync} from 'child_process'

/**
 * Wrapper for spawnSync that logs executed commands
 * DO NOT REMOVE: Logging is intentional for debugging process operations
 */
const _spawnSync: typeof spawnSync = ((command, args, options) => {
	console.log(command + ' ' + args.join(' '))
	return spawnSync(command, args, options)
}) as any

/**
 * Get process list on Unix systems using ps command
 * Returns array of lines with parent PID and PID pairs
 */
function ps(): string[] {
	return _spawnSync('ps', ['-A', '-o', 'ppid=,pid='], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')
}

/**
 * Get process list on Windows systems using wmic command
 * Returns array of lines with parent PID and PID pairs (header removed)
 */
function wmic(): string[] {
	const result = _spawnSync('wmic.exe', ['PROCESS', 'GET', 'ParentProcessId,ProcessId'], {
		windowsHide: true,
		encoding   : 'ascii',
	})
		.stdout
		.split('\n')

	result.shift() // Remove header line

	return result
}

/**
 * Find all child process IDs recursively for given parent PIDs
 * Uses platform-specific commands (ps on Unix, wmic on Windows)
 */
function _getChildPids(parentPids: string[]): Set<string> {
	const parentPidsSet = new Set(parentPids)

	// Get process list using platform-specific command
	const lines = process.platform === 'win32'
		? wmic()
		: ps()

	// Build process tree: parentPID -> [childPID1, childPID2, ...]
	const processTree = lines
		.reduce((tree, line) => {
			line = line.trim()
			if (!line) {
				return tree
			}
			
			// Parse process line: "parentPID processID"
			let [ppid, pid] = line.split(/ +/)
			pid = pid?.trim() || ''
			ppid = ppid?.trim() || ''
			
			// Skip malformed lines (fixed with optional chaining)
			if (!pid || !ppid) {
				return tree
			}

			let childPids = tree[ppid]
			if (!childPids) {
				tree[ppid] = childPids = []
			}
			childPids.push(pid)

			return tree
		}, {} as Record<string, string[]>)

	// Recursively collect all child PIDs
	const allChildPids = new Set<string>()
	
	/**
	 * Recursively traverse process tree to find all descendants
	 * Avoids infinite loops by checking parentPid
	 */
	function appendChildPids(pids: string[], parentPid?: string) {
		for (let i = 0, len = pids.length; i < len; i++) {
			const pid = pids[i]
			if (pid === parentPid) {
				continue // Avoid infinite loops
			}
			const childs = processTree[pid]
			if (childs) {
				for (let j = 0, len2 = childs.length; j < len2; j++) {
					const childPid = childs[j]
					if (!parentPidsSet.has(childPid)) {
						allChildPids.add(childPid)
					}
				}
				appendChildPids(childs, pid) // Recurse into children
			}
		}
	}

	appendChildPids(parentPids)

	return allChildPids
}

/**
 * Validate that parent PIDs don't include critical system processes
 * @param parentPids - Array of parent PIDs to validate
 * @param context - Context for error reporting
 */
function validateTreeKillParentPids(parentPids: string[], context: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	force: boolean,
}): void {
	parentPids.forEach(pid => {
		if (
			pid === '0'
			|| process.platform === 'win32' && pid === '4' // Windows system process
			|| process.platform !== 'win32' && pid === '1' // Unix init process
		) {
			throw new Error('parentsPids has system pids: ' + JSON.stringify(context))
		}
	})
}

/**
 * Get all process IDs from process trees (parents + all descendants recursively) with ignore filter
 * @param parentsPids - Array of parent process IDs
 * @param ignorePids - Array of process IDs to exclude from result (optional)
 * @returns Set of process IDs (parents + all descendants recursively, excluding ignored)
 */
export function getChildPids({
	parentsPids,
	ignorePids,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
}): Set<string> {
	// Convert and filter parent PIDs
	const _parentsPids = parentsPids
		.map(o => o.toString().trim())
		.filter(o => o)
	
	// Convert ignore PIDs  
	const _ignorePids = ignorePids
		?.map(o => o.toString().trim())
		.filter(o => o) || []
		
	// Get all descendants recursively
	const treePidsSet = _getChildPids(_parentsPids)
	
	// Add parents and remove ignored PIDs
	_parentsPids.forEach(pid => treePidsSet.add(pid))
	_ignorePids.forEach(pid => treePidsSet.delete(pid))
	
	return treePidsSet
}

/**
 * Kill processes by PIDs using platform-specific commands
 * @param pids - Array of process IDs to kill
 * @param force - Use force kill (SIGKILL on Unix, /F on Windows) vs graceful (SIGHUP, no /F)
 */
export function kill({
  pids,
  force,
}: {
  pids: (string|number)[],
  force: boolean,
}): void {
	// Convert and filter PIDs
	const _pids = pids
		.map(o => o.toString().trim())
		.filter(o => o)
		
	if (_pids.length === 0) {
		return
	}
	
	// Execute platform-specific kill commands synchronously
	if (process.platform === 'win32') {
		// Windows: use taskkill command
		const params: string[] = []
		if (force) {
			params.push('/F') // Force kill
		}
		for (let i = 0; i < _pids.length; i++) {
			params.push('/PID')
			params.push(_pids[i])
		}
		_spawnSync('taskkill', params, {
			windowsHide: true,
		})
	} else {
		// Unix: use kill command with signals
		_spawnSync('kill', ['-s', force ? 'SIGKILL' : 'SIGTERM', ..._pids], {
			windowsHide: true,
		})
	}
}

/**
 * Kill process tree cross-platform
 * 
 * @param parentsPids - Array of parent process IDs to kill (with their children)
 * @param ignorePids - Array of process IDs to exclude from killing (optional)
 * @param force - Use force kill (SIGKILL on Unix, /F on Windows) vs graceful (SIGHUP, no /F)
 */
export function treeKill({
	parentsPids,
	ignorePids,
	force,
}: {
	parentsPids: (number|string)[],
	ignorePids?: (number|string)[],
	force: boolean,
}) {
	// Convert and filter parent PIDs
	const _parentsPids = parentsPids
		.map(o => o.toString().trim())
		.filter(o => o)

	// System PID protection - prevent killing critical system processes
	validateTreeKillParentPids(_parentsPids, { parentsPids, ignorePids, force })

	if (_parentsPids.length === 0) {
		return
	}

	// Convert ignore PIDs for logging
	const _ignorePids = ignorePids
		?.map(o => o.toString().trim())
		.filter(o => o) || []
	
	// Log operation (fixed empty ignore display)
	console.log('treeKill parents: ' + _parentsPids.join(' ') + (_ignorePids.length > 0 ? ' ignore: ' + _ignorePids.join(' ') : ''))
	
	// Get all PIDs to kill using getChildPids
	const treePidsSet = getChildPids({ parentsPids, ignorePids })
	const treePids = Array.from(treePidsSet)

	// Kill all PIDs using separate function
	kill({
    pids: treePids,
    force,
  })
}

export function autoKillChilds(): () => void {
	function killChilds() {
		try {
			treeKill({ parentsPids: [process.pid], ignorePids: [process.pid], force: true })
		} catch (e) {
			console.error('Failed to kill child processes:', e.message)
		}
	}
	
	function onExit() {
		unsubscribe()
		killChilds()
	}
	
	function onSIGINT() {
		unsubscribe()
		killChilds()
		process.exit(130)
	}
	
	function onSIGTERM() {
		unsubscribe()
		killChilds()
		process.exit(143)
	}
	
	function onSIGHUP() {
		unsubscribe()
		killChilds()
		process.exit(129)
	}
	
	function unsubscribe() {
		process.off('exit', onExit)
		process.off('SIGINT', onSIGINT)
		process.off('SIGTERM', onSIGTERM)
		process.off('SIGHUP', onSIGHUP)
	}
	
	process.on('exit', onExit)
	process.on('SIGINT', onSIGINT)
	process.on('SIGTERM', onSIGTERM)
	process.on('SIGHUP', onSIGHUP)
	
	return unsubscribe
}
