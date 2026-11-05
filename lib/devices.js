export const DEFAULT_DEVICE_STATE = {
  ac: {
    on: false,
    temp: 24,
    mode: 'cool',
    swing: true,
    fan: '自动',
  },
  lights: {
    podium: false,
    front: false,
    middle: false,
    rear: false,
    blackboard: false,
    ambient: false,
  },
  projector: {
    on: false,
    source: 'HDMI 1',
  },
}

export const DEVICE_SCENES = {
  class: {
    ac: { on: true, temp: 24, mode: 'cool', swing: true, fan: '自动' },
    lights: {
      podium: true,
      front: true,
      middle: true,
      rear: true,
      blackboard: true,
      ambient: false,
    },
    projector: { on: true, source: 'HDMI 1' },
  },
  study: {
    ac: { on: true, temp: 25, mode: 'cool', swing: false, fan: '自动' },
    lights: {
      podium: false,
      front: true,
      middle: true,
      rear: true,
      blackboard: true,
      ambient: false,
    },
    projector: { on: false, source: 'HDMI 1' },
  },
  energy: {
    ac: { on: true, temp: 26, mode: 'fan', swing: true, fan: '低风' },
    lights: {
      podium: false,
      front: false,
      middle: true,
      rear: false,
      blackboard: false,
      ambient: false,
    },
    projector: { on: false, source: 'HDMI 1' },
  },
  off: {
    ac: { on: false },
    lights: {
      podium: false,
      front: false,
      middle: false,
      rear: false,
      blackboard: false,
      ambient: false,
    },
    projector: { on: false },
  },
}

export function createDefaultDeviceState() {
  return structuredClone(DEFAULT_DEVICE_STATE)
}

function mergeKnown(target, patch) {
  const next = structuredClone(target)
  if (!patch || typeof patch !== 'object') return next
  for (const group of ['ac', 'lights', 'projector']) {
    if (!patch[group] || typeof patch[group] !== 'object') continue
    for (const [key, value] of Object.entries(patch[group])) {
      if (key in next[group]) next[group][key] = value
    }
  }
  return next
}

export function applyDeviceScene(current, sceneId) {
  const scene = DEVICE_SCENES[sceneId]
  if (!scene) return null
  return mergeKnown(current, scene)
}

export function validateDevicePatch(patch) {
  const next = mergeKnown(DEFAULT_DEVICE_STATE, patch)
  if (typeof next.ac.on !== 'boolean') return null
  if (!Number.isInteger(next.ac.temp) || next.ac.temp < 16 || next.ac.temp > 30)
    return null
  if (!['cool', 'heat', 'fan', 'dry'].includes(next.ac.mode)) return null
  if (!['低风', '中风', '高风', '自动'].includes(next.ac.fan)) return null
  if (Object.values(next.lights).some((value) => typeof value !== 'boolean'))
    return null
  if (typeof next.projector.on !== 'boolean') return null
  if (!['HDMI 1', 'HDMI 2', '无线投屏'].includes(next.projector.source))
    return null
  return next
}

export function mergeDevicePatch(current, patch) {
  const merged = mergeKnown(current || createDefaultDeviceState(), patch)
  return validateDevicePatch(merged)
}
