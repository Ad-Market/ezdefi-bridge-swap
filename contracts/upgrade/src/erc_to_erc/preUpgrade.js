const { web3Home, web3Foreign } = require('../web3')
const {
  ERC20_TOKEN_ADDRESS,
  ERC20_EXTENDED_BY_ERC677,
  ERC677_TOKEN_ADDRESS
} = require('../loadEnv')
const { isContract } = require('../deploymentUtils')
const {
  foreignContracts: {
    ERC677BridgeToken: { abi }
  }
} = require('../loadContracts')

async function preUpgrade() {
  const isERC20AContract = await isContract(web3Foreign, ERC20_TOKEN_ADDRESS)
  if (!isERC20AContract) {
    throw new Error(`ERC20_TOKEN_ADDRESS should be a contract address`)
  }

  const isERC677AContract = await isContract(web3Home, ERC677_TOKEN_ADDRESS)
  if (!isERC677AContract) {
    throw new Error(`ERC677_TOKEN_ADDRESS should be a contract address`)
  }

  if (ERC20_EXTENDED_BY_ERC677) {
    const tokenContract = new web3Foreign.eth.Contract(abi, ERC20_TOKEN_ADDRESS)
    try {
      await tokenContract.methods.bridgeContract().call()
    } catch (e) {
      throw new Error(
        `ERC20_EXTENDED_BY_ERC677 is set to TRUE but bridgeContract method was not found on ERC677 token.`
      )
    }
  }
}

module.exports = preUpgrade
