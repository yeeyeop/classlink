import { spawnSync } from 'node:child_process'
import dns from 'node:dns/promises'
import os from 'node:os'

function listPrivateAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (item) =>
        item &&
        item.family === 'IPv4' &&
        !item.internal &&
        !item.address.startsWith('169.254.'),
    )
    .map((item) => item.address)
}

async function findPreferredAddress() {
  try {
    const resolved = await dns.lookup(os.hostname(), { family: 4 })
    if (resolved?.address && !resolved.address.startsWith('127.')) {
      return resolved.address
    }
  } catch {
    // Fall back to the first non-internal IPv4 address.
  }
  return listPrivateAddresses()[0] || null
}

const address = await findPreferredAddress()

if (!address) {
  console.error('No LAN IPv4 address was found.')
  process.exit(1)
}

const url = `http://${address}:3000`
console.log('')
console.log(`Share URL: ${url}`)
console.log('')

if (process.platform === 'win32') {
  const copied = spawnSync('clip', [], { input: url })
  if (!copied.error && copied.status === 0) {
    console.log('The URL has been copied to the clipboard.')
  }
}
