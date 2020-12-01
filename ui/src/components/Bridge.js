import BN from 'bignumber.js'
import React from 'react'
import { toHex } from 'web3-utils'
import swal from 'sweetalert'
import { BRIDGE_MODES, ERC_TYPES, isErcToErcMode } from '../../../commons'
import { BridgeAddress } from './index'
import { BridgeForm } from './index'
import { BridgeNetwork } from './index'
import { ModalContainer } from './ModalContainer'
import { NetworkDetails } from './NetworkDetails'
import { TransferAlert } from './TransferAlert'
import { getFeeToApply, validFee } from '../stores/utils/rewardable'
import { inject, observer } from 'mobx-react'
import { toDecimals } from '../stores/utils/decimals'

@inject('RootStore')
@observer
export class Bridge extends React.Component {
  state = {
    amount: 0,
    modalData: {},
    confirmationData: {},
    showModal: false,
    showConfirmation: false,
    fee: 0
  }

  handleInputChange = name => event => {
    this.setState({
      [name]: event.target.value
    })
  }

  componentDidMount() {
    const { web3Store } = this.props.RootStore
    web3Store.getWeb3Promise.then(() => {
      if (!web3Store.metamaskNet.id || !web3Store.foreignNet.id) {
        this.forceUpdate()
      }
    })
  }

  async _sendToHome(amount) {
    const { web3Store, homeStore, alertStore, txStore, bridgeMode, foreignStore } = this.props.RootStore
    const { reverse } = web3Store
    
    const { isLessThan, isGreaterThan } = this

    if (web3Store.metamaskNet.id.toString() !== web3Store.homeNet.id.toString()) {
      swal('Error', `Please switch wallet to ${web3Store.homeNet.name} network`, 'error')
      return
    }
    if (isLessThan(amount, homeStore.minPerTx)) {
      alertStore.pushError(
        `The amount is less than current minimum per transaction amount.\nThe minimum per transaction amount is: ${homeStore.minPerTx
        } ${homeStore.symbol}`
      )
      return
    }
    if (isGreaterThan(amount, homeStore.maxPerTx)) {
      alertStore.pushError(
        `The amount is above current maximum per transaction limit.\nThe maximum per transaction limit is: ${homeStore.maxPerTx
        } ${homeStore.symbol}`
      )
      return
    }
    if (isGreaterThan(amount, homeStore.maxCurrentDeposit)) {
      alertStore.pushError(
        `The amount is above current daily limit.\nThe max deposit today: ${homeStore.maxCurrentDeposit} ${homeStore.symbol
        }`
      )
      return
    }
    if (isGreaterThan(amount, homeStore.getDisplayedBalance())) {
      alertStore.pushError('Insufficient balance')
      return
    }

    try {
      alertStore.setLoading(true)
      if (isErcToErcMode(bridgeMode)) {
        return txStore.erc677transferAndCall({
          to: homeStore.COMMON_HOME_BRIDGE_ADDRESS,
          from: web3Store.defaultAccount.address,
          value: toDecimals(amount, homeStore.tokenDecimals),
          contract: homeStore.tokenContract,
          tokenAddress: homeStore.tokenAddress
        })
      } else {
        const value = toHex(toDecimals(amount, homeStore.tokenDecimals))
        return txStore.doSend({
          to: homeStore.COMMON_HOME_BRIDGE_ADDRESS,
          from: web3Store.defaultAccount.address,
          value,
          data: '0x',
          sentValue: value
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  async _sendToForeign(amount) {
    const { web3Store, foreignStore, alertStore, txStore, homeStore } = this.props.RootStore
    const isExternalErc20 = foreignStore.tokenType === ERC_TYPES.ERC20
    const { reverse } = web3Store
  
    const { isLessThan, isGreaterThan } = this
    if (web3Store.metamaskNet.id.toString() !== web3Store.foreignNet.id.toString()) {
      swal('Error', `Please switch wallet to ${web3Store.foreignNet.name} network`, 'error')
      return
    }
    if (!isExternalErc20 && isLessThan(amount, foreignStore.minPerTx)) {
      alertStore.pushError(
        `The amount is less than minimum amount per transaction.\nThe min per transaction is: ${foreignStore.minPerTx
        } ${foreignStore.symbol}`
      )
      return
    }
    if (!isExternalErc20 && isGreaterThan(amount, foreignStore.maxPerTx)) {
      alertStore.pushError(
        `The amount is above maximum amount per transaction.\nThe max per transaction is: ${foreignStore.maxPerTx} ${foreignStore.symbol
        }`
      )
      return
    }
    if (!isExternalErc20 && isGreaterThan(amount, foreignStore.maxCurrentDeposit)) {
      alertStore.pushError(
        `The amount is above current daily limit.\nThe max withdrawal today: ${foreignStore.maxCurrentDeposit} ${foreignStore.symbol
        }`
      )
      return
    }
    
    if (isGreaterThan(amount, foreignStore.balance)) {
      alertStore.pushError(`Insufficient token balance. Your balance is ${foreignStore.balance} ${foreignStore.symbol}`)
      return
    }

    try {
      alertStore.setLoading(true)
      if (isExternalErc20) {
        return await txStore.erc20transfer({
          to: foreignStore.COMMON_FOREIGN_BRIDGE_ADDRESS,
          from: web3Store.defaultAccount.address,
          value: toDecimals(amount, foreignStore.tokenDecimals)
        })
      } else {
        return await txStore.erc677transferAndCall({
          to: foreignStore.COMMON_FOREIGN_BRIDGE_ADDRESS,
          from: web3Store.defaultAccount.address,
          value: toHex(toDecimals(amount, foreignStore.tokenDecimals)),
          contract: foreignStore.tokenContract,
          tokenAddress: foreignStore.tokenAddress
        })
      }
    } catch (e) {
      console.error(e)
    }

  }

  isLessThan = (amount, base) => new BN(amount).lt(new BN(base))

  isGreaterThan = (amount, base) => new BN(amount).gt(new BN(base))

  onTransfer = async e => {
    e.preventDefault()

    const amount = this.state.amount.trim()
    if (!amount) {
      swal('Error', 'Please specify amount', 'error')
      return
    }

    const { foreignStore, web3Store, homeStore } = this.props.RootStore

    if (
      (web3Store.metamaskNotSetted && web3Store.metamaskNet.name === '') ||
      web3Store.defaultAccount.address === undefined
    ) {
      web3Store.showInstallMetamaskAlert()
      return
    }

    const { reverse } = web3Store
    const homeDisplayName = homeStore.networkName
    const foreignDisplayName = foreignStore.networkName

    let fee = null
    let finalAmount = new BN(amount)
    const feeToApply = getFeeToApply(homeStore.feeManager, foreignStore.feeManager, !reverse)

    if (validFee(feeToApply)) {
      fee = feeToApply
      finalAmount = finalAmount - feeToApply
    }

    const confirmationData = {
      from: reverse ? foreignDisplayName : homeDisplayName,
      to: reverse ? homeDisplayName : foreignDisplayName,
      fromCurrency: reverse ? foreignStore.symbol : homeStore.symbol,
      toCurrency: reverse ? homeStore.symbol : foreignStore.symbol,
      fromAmount: amount,
      toAmount: finalAmount,
      fee,
      reverse
    }

    this.setState({ showConfirmation: true, confirmationData })
  }

  onTransferConfirmation = async () => {
    const { alertStore, web3Store } = this.props.RootStore
    const { reverse } = web3Store

    this.setState({ showConfirmation: false, confirmationData: {} })
    const amount = this.state.amount.trim()
    if (!amount) {
      swal('Error', 'Please specify amount', 'error')
      return
    }

    try {
      if (reverse) {
        await this._sendToForeign(amount)
      } else {
        await this._sendToHome(amount)
      }
    } catch (e) {
      if (
        !e.message.includes('not mined within 50 blocks') &&
        !e.message.includes('Failed to subscribe to new newBlockHeaders')
      ) {
        alertStore.setLoading(false)
      }
    }
  }

  loadHomeDetails = () => {
    const { web3Store, homeStore, bridgeMode } = this.props.RootStore
    const isExternalErc20 = bridgeMode === BRIDGE_MODES.ERC_TO_ERC || bridgeMode === BRIDGE_MODES.ERC_TO_NATIVE

    const modalData = {
      isHome: true,
      networkName: homeStore.networkName,
      url: web3Store.COMMON_HOME_RPC_URL,
      address: homeStore.COMMON_HOME_BRIDGE_ADDRESS,
      currency: homeStore.symbol,
      maxCurrentLimit: homeStore.maxCurrentDeposit,
      maxPerTx: homeStore.maxPerTx,
      minPerTx: homeStore.minPerTx,
      totalBalance: homeStore.balance,
      balance: homeStore.getDisplayedBalance(),
      displayTokenAddress: isErcToErcMode(bridgeMode),
      tokenAddress: homeStore.tokenAddress,
      tokenName: homeStore.tokenName,
      displayBridgeLimits: true,
      nativeSupplyTitle: !isExternalErc20,
      getExplorerAddressUrl: address => homeStore.getExplorerAddressUrl(address)
    }

    this.setState({ modalData, showModal: true })
  }

  loadForeignDetails = () => {
    const { web3Store, foreignStore } = this.props.RootStore
    const isExternalErc20 = foreignStore.tokenType === ERC_TYPES.ERC20
    const foreignURL = new URL(web3Store.COMMON_FOREIGN_RPC_URL)
    const foreignDisplayUrl = `${foreignURL.protocol}//${foreignURL.hostname}`

    const modalData = {
      isHome: false,
      networkName: foreignStore.networkName,
      url: foreignDisplayUrl,
      address: foreignStore.COMMON_FOREIGN_BRIDGE_ADDRESS,
      currency: foreignStore.symbol,
      maxCurrentLimit: foreignStore.maxCurrentDeposit,
      maxPerTx: foreignStore.maxPerTx,
      minPerTx: foreignStore.minPerTx,
      tokenAddress: foreignStore.tokenAddress,
      tokenName: foreignStore.tokenName,
      totalSupply: foreignStore.totalSupply,
      balance: foreignStore.balance,
      displayTokenAddress: true,
      displayBridgeLimits: !isExternalErc20,
      getExplorerAddressUrl: address => foreignStore.getExplorerAddressUrl(address)
    }

    this.setState({ modalData, showModal: true })
  }

  getNetworkTitle = networkName => {
    const { REACT_APP_UI_STYLES } = process.env
    if (REACT_APP_UI_STYLES === 'stake') {
      return networkName
    }

    const index = networkName.indexOf(' ')

    if (index === -1) {
      return networkName
    }

    return networkName.substring(0, index)
  }

  getNetworkSubTitle = networkName => {
    const { REACT_APP_UI_STYLES } = process.env
    if (REACT_APP_UI_STYLES === 'stake') {
      return false
    }

    const index = networkName.indexOf(' ')

    if (index === -1) {
      return false
    }

    return networkName.substring(index + 1, networkName.length)
  }

  toggleNetworkRPC = (e) => {
    e.preventDefault()
    const { web3Store, foreignStore, homeStore } = this.props.RootStore
    const { reverse } = web3Store
    web3Store.setSelectedNetwork(reverse ? homeStore.networkName : foreignStore.networkName)
  }

  render() {
    const { REACT_APP_UI_STYLES } = process.env
    const { web3Store, foreignStore, homeStore } = this.props.RootStore
    const { showModal, modalData, showConfirmation, confirmationData } = this.state
    const { reverse } = web3Store
    const formCurrency = reverse ? foreignStore.symbol : homeStore.symbol

    if (showModal && Object.keys(modalData).length !== 0) {
      if (modalData.isHome && modalData.balance !== homeStore.getDisplayedBalance()) {
        modalData.balance = homeStore.getDisplayedBalance()
      } else if (!modalData.isHome && modalData.balance !== foreignStore.balance) {
        modalData.balance = foreignStore.balance
      }
    }

    const homeNetworkName = this.getNetworkTitle(homeStore.networkName)
    const homeNetworkSubtitle = this.getNetworkSubTitle(homeStore.networkName)
    const foreignNetworkName = this.getNetworkTitle(foreignStore.networkName)
    const foreignNetworkSubtitle = this.getNetworkSubTitle(foreignStore.networkName)

    const feeToApply = getFeeToApply(homeStore.feeManager, foreignStore.feeManager, !reverse) || 0

    return (
      <div className="bridge-container">
        <div className="bridge">
          <div className="bridge-transfer">
            <div className={`bridge-transfer-content bridge-transfer-content-${REACT_APP_UI_STYLES}`}>

              {/* <BridgeNetwork
                  balance={reverse ? foreignStore.balance : homeStore.getDisplayedBalance()}
                  currency={reverse ? foreignStore.symbol : homeStore.symbol}
                  isHome={true}
                  networkSubtitle={reverse ? foreignNetworkSubtitle : homeNetworkSubtitle}
                  networkTitle={reverse ? foreignNetworkName : homeNetworkName}
                  showModal={reverse ? this.loadForeignDetails : this.loadHomeDetails}
                  side="left"
                /> */}
              <form onSubmit={this.onTransfer} autoComplete="off">
                <div className="bridge-transfer-title">
                  Protocol for crosschain exchange and transfering tokens between ezDeFi public chain and other blockchains
                </div>

                <div className="bridge-select">
                  <div className="bridge-network-dropdown">
                    <button className="bridge-network-dropbtn" disabled>
                      <span>{reverse ? "BSC" : "ezDeFi"}</span>
                      <span className="bridge-transfer-convert-icon" onClick={this.toggleNetworkRPC}></span>

                      <span>{reverse ? "ezDeFi" : "BSC"}</span>
                      <span className="bridge-transfer-arrow-down"></span>

                    </button>
                    <div className="bridge-network-dropdown-content">
                      <a href="#" onClick={this.toggleNetworkRPC}>
                        <span>{reverse ? "ezDeFi" : "BSC"}</span>
                        <span className="bridge-transfer-convert-icon-blue"></span>
                        <span>{reverse ? "BSC" : "ezDeFi"}</span>
                      </a>
                      {/* <a href="#">
                        <span>ezDeFi</span>
                        <span className="bridge-transfer-convert-icon-blue"></span>
                        <span>Ethereum</span>
                      </a> */}
                    </div>
                  </div>

                  <div className="bridge-token-dropdown">
                    <button className="bridge-token-dropbtn" disabled>
                      <span>zSeed</span>
                      <span className="bridge-token-arrow-down"></span>
                    </button>
                    <div className="bridge-token-dropdown-content">
                      <a href="#">
                        <span>POC</span>
                      </a>
                      <a href="#">
                        <span>SOW</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bridge-token-row bridge-token-input-wrap">
                  <input
                    pattern="[0-9]+([.][0-9]{1,18})?"
                    type="text"
                    placeholder="0"
                    name="amount"
                    onChange={this.handleInputChange('amount')}
                  />
                  <div className="bridge-token-row-right">
                    <div className="zd-token-network-wrap">
                      <span>zSeed</span>
                      <span className={reverse ? "zd-token-network-bsc" : "zd-token-network-ez"}></span>
                    </div>
                    <div className="zd-token-network-info" onClick={reverse ? this.loadForeignDetails : this.loadHomeDetails}></div>
                  </div>
                </div>

                <div className="bridge-token-row bridge-token-balance">
                  <span>
                    Balance <span className="number-font">{reverse ? foreignStore.balance : homeStore.getDisplayedBalance()}</span>
                  </span>
                </div>

                <div className="bridge-token-row bridge-token-convert-wrap">
                  <span className="bridge-token-arrow-convert" onClick={this.toggleNetworkRPC}></span>
                </div>

                <div className="bridge-token-row bridge-token-output-wrap">
                  <input value={this.state.amount > Number(feeToApply) ? this.state.amount - Number(feeToApply) : 0} placeholder="0" disabled />
                  <div className="bridge-token-row-right">
                    <div className="zd-token-network-wrap">
                      <span>zSeed</span>
                      <span className={reverse ? "zd-token-network-ez" : "zd-token-network-bsc"}></span>
                    </div>
                    <div className="zd-token-network-info" onClick={reverse ? this.loadHomeDetails : this.loadForeignDetails}></div>
                  </div>

                </div>

                <div className="bridge-token-row bridge-token-balance">
                  <span>
                    Balance <span className="number-font">{reverse ? homeStore.getDisplayedBalance() : foreignStore.balance}</span>
                  </span>

                  <span>Fee: </span>
                  <span><span className="number-font">{feeToApply.toString()}</span> zSeed</span>
                </div>

                <div className="bridge-token-row">
                  <button className="bridge-token-btn-swap" type="submit">SWAP</button>
                </div>
              </form>

              {/* <BridgeForm
                  currency={formCurrency}
                  displayArrow={!web3Store.metamaskNotSetted}
                  onInputChange={this.handleInputChange('amount')}
                  onTransfer={this.onTransfer}
                  reverse={reverse}
                /> */}
              {/* <BridgeNetwork
                  balance={reverse ? homeStore.getDisplayedBalance() : foreignStore.balance}
                  currency={reverse ? homeStore.symbol : foreignStore.symbol}
                  isHome={false}
                  networkSubtitle={reverse ? homeNetworkSubtitle : foreignNetworkSubtitle}
                  networkTitle={reverse ? homeNetworkName : foreignNetworkName}
                  showModal={reverse ? this.loadHomeDetails : this.loadForeignDetails}
                  side="right"
                /> */}
            </div>
          </div>
          <ModalContainer
            hideModal={() => {
              this.setState({ showModal: false })
            }}
            showModal={showModal}
          >
            <NetworkDetails {...modalData} />
          </ModalContainer>
          <ModalContainer showModal={showConfirmation}>
            <TransferAlert
              onConfirmation={this.onTransferConfirmation}
              onCancel={() => {
                this.setState({ showConfirmation: false, confirmationData: {} })
              }}
              {...confirmationData}
            />
          </ModalContainer>
        </div>
      </div>
    )
  }
}
