/* eslint-disable no-shadow */
import {spawn} from 'child_process'
import {ps} from '@flemist/ps-cross-platform'
import assert from 'assert'
import {delay} from './delay'

describe('finalize', function () {
	this.timeout(60000)

	const _cliId = 'finalize-test-app'

	it('finalizeCurrentProcess', async function () {
		let processes = (await ps()).filter(proc => {
			return proc.command.indexOf(_cliId) >= 0
				|| proc.command.indexOf('finalize-test.js') >= 0
		})
		assert.deepStrictEqual(processes, [])

		const proc = spawn('node', [
			require.resolve('../dist/finalize-test.js'),
			'0',
			_cliId,
		], {
			detached: true,
			windowsHide: true,
			stdio: 'ignore',
		})
		proc.unref()

		console.log('App pid: ' + proc.pid)

		console.log('Wait app open')
		await delay(200)

		let _ps = await ps()
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

		processes = (await ps()).filter(proc => {
			return proc.command.indexOf('finalize-test.js 0 ') >= 0
		})
		assert.deepStrictEqual(processes, [])

		// processes = (await ps()).filter(proc => {
		// 	return proc.command.indexOf(_cliId) >= 0
		// 		&& proc.command.indexOf('finalize-test.js 0 ') < 0
		// })
		// assert.ok(processes.length > 0)

		console.log('Wait app finalize')
		await delay(5000)

		processes = (await ps()).filter(proc => {
			return proc.command.indexOf(_cliId) >= 0
				|| proc.command.indexOf('finalize-test.js 0 ') >= 0
		})
		assert.deepStrictEqual(processes, [])
	})
})
