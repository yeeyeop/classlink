import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDeviceScene,
  createDefaultDeviceState,
  mergeDevicePatch,
  validateDevicePatch,
} from '../lib/devices.js'

test('device patch preserves existing fields and validates all controls', () => {
  const current = createDefaultDeviceState()
  const next = mergeDevicePatch(current, {
    ac: { on: true, temp: 23 },
    lights: { middle: true },
  })
  assert.equal(next.ac.on, true)
  assert.equal(next.ac.temp, 23)
  assert.equal(next.ac.mode, 'cool')
  assert.equal(next.lights.middle, true)
  assert.equal(validateDevicePatch(next).ac.temp, 23)
})

test('invalid device values are rejected', () => {
  assert.equal(validateDevicePatch({ ac: { temp: 40 } }), null)
  assert.equal(validateDevicePatch({ projector: { source: 'VGA' } }), null)
})

test('scene presets create deterministic persistent states', () => {
  const current = createDefaultDeviceState()
  const classScene = applyDeviceScene(current, 'class')
  const energyScene = applyDeviceScene(current, 'energy')
  assert.equal(classScene.projector.on, true)
  assert.equal(classScene.lights.podium, true)
  assert.equal(energyScene.projector.on, false)
  assert.equal(energyScene.ac.mode, 'fan')
  assert.equal(applyDeviceScene(current, 'missing'), null)
})
