/* eslint-disable no-shadow */
import {spawn} from 'child_process'
import {ps} from '@flemist/ps-cross-platform'
import assert from 'assert'
import {delay} from './delay'

describe('finalize', function () {
	this.timeout(60000)

	const _cliId = 'finalize-test-app'

	it('finalizeCurrentProcess', async function () {
		let _ps = await ps()
		// console.log(_ps.map(o => `${o.pid}  ${o.ppid}  ${o.command}`).join('\r\n'))

		let processes = _ps.filter(proc => {
			return proc.command.indexOf(_cliId) >= 0
				|| proc.command.indexOf('finalize-test.js') >= 0
		})
		assert.deepStrictEqual(processes, [])

		const proc = spawn('node', [
			require.resolve('../dist/finalize-test.js'),
			'0',
			_cliId,
		], {
			// detached: true,
			windowsHide: true,
			stdio: 'inherit', // 'ignore',
		})
		// proc.unref()

		console.log('App pid: ' + proc.pid)

		console.log('Wait app open')
		await delay(200)

		_ps = await ps()
		// console.log(_ps.map(o => `${o.pid}  ${o.ppid}  ${o.command}`).join('\r\n'))
		processes = _ps.filter(proc => {
			return proc.command.indexOf('finalize-test.js 0 ') >= 0
		})
		assert.strictEqual(processes.length, 1)
		assert.ok(processes[0].command.indexOf('finalize-test.js 0 ') >= 0)
		assert.ok(processes[0].command.indexOf(_cliId) >= 0)

		processes = _ps.filter(proc => {
			return proc.command.indexOf(_cliId) >= 0
				&& proc.command.indexOf('finalize-test.js 0 ') < 0
		})
		assert.ok(processes.length >= 2)

		console.log('Wait app close')
		await delay(2000)

		_ps = await ps()
		// console.log(_ps.map(o => `${o.pid}  ${o.ppid}  ${o.command}`).join('\r\n'))
		processes = _ps.filter(proc => {
			return proc.command.indexOf('finalize-test.js 0 ') >= 0
		})
		assert.deepStrictEqual(processes, [])

		// processes =  _ps.filter(proc => {
		// 	return proc.command.indexOf(_cliId) >= 0
		// 		&& proc.command.indexOf('finalize-test.js 0 ') < 0
		// })
		// assert.ok(processes.length > 0)

		console.log('Wait app finalize')
		await delay(5000)

		_ps = await ps()
		// console.log(_ps.map(o => `${o.pid}  ${o.ppid}  ${o.command}`).join('\r\n'))
		processes = _ps.filter(proc => {
			return proc.command.indexOf(_cliId) >= 0
				|| proc.command.indexOf('finalize-test.js 0 ') >= 0
		})
		assert.deepStrictEqual(processes, [])

		assert.ok(!proc.exitCode, 'proc.exitCode=' + proc.exitCode)
	})
})
