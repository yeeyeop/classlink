import os from 'node:os'

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter(
    (item) =>
      item &&
      item.family === 'IPv4' &&
      !item.internal &&
      !item.address.startsWith('169.254.'),
  )
  .map((item) => item.address)

console.log('')
console.log('CLASSLINK LAN access:')
console.log('  Local:   http://localhost:3000')
console.log(`  Host:    http://${os.hostname()}:3000`)

for (const address of addresses) {
  console.log(`  Network: http://${address}:3000`)
}

console.log('')
console.log('Share one Network URL with devices on the same LAN.')
console.log('')
