const fs = require('fs')
const path = require('path')
const env = require('./src/loadEnv')

const { BRIDGE_MODE, ERC20_TOKEN_ADDRESS } = env

const deployResultsPath = path.join(__dirname, './bridgeUpgradeResults.json')

function writeDeploymentResults(data) {
  fs.writeFileSync(deployResultsPath, JSON.stringify(data, null, 4))
  console.log('Contracts Upgrade have been saved to `bridgeUpgradeResults.json`')
}

async function upgradeErcToErc() {
  const preUpgrade = require('./src/erc_to_erc/preUpgrade')
  const upgradeHome = require('./src/erc_to_erc/home')
  await preUpgrade()
  const { homeBridge, erc677 } = await upgradeHome()
  console.log('\Upgrade has been completed.\n\n')
  console.log(`[   Home  ] HomeBridge: ${homeBridge.address}`)
  console.log(`[   Home  ] ERC677 Bridgeable Token: ${erc677.address}`)
  console.log(`[ Foreign ] ERC20 Token: ${ERC20_TOKEN_ADDRESS}`)
  writeDeploymentResults({
    homeBridge: {
      ...homeBridge,
      erc677
    }
  })
}

async function main() {
  console.log(`Bridge mode: ${BRIDGE_MODE}`)
  switch (BRIDGE_MODE) {
    case 'ERC_TO_ERC':
      await upgradeErcToErc()
      break
    default:
      console.log(BRIDGE_MODE)
      throw new Error('Please specify BRIDGE_MODE: NATIVE_TO_ERC or ERC_TO_ERC')
  }
}

main().catch(e => console.log('Error:', e))
