import React from 'react'
import { inject, observer } from 'mobx-react'
import { WalletIcon } from './menu-icons/WalletIcon'

@inject('RootStore')
@observer
export class Wallet extends React.Component {
  connectWallet = async () => {
    try {
      await ethereum.enable()
      location.reload();
    } catch (e) {

    }
  }

  render() {
    const { web3Store, homeStore, foreignStore, alertStore } = this.props.RootStore
    const { REACT_APP_UI_STYLES } = process.env
    const isHome = web3Store.isSelectedNetwork(web3Store.homeNet.id)
    const address = web3Store.defaultAccount.address
    const explorerAddressUrl = isHome
      ? homeStore.getExplorerAddressUrl(address)
      : foreignStore.getExplorerAddressUrl(address)
    const completed = isHome ? homeStore.getDailyQuotaCompleted() : foreignStore.getDailyQuotaCompleted()
    const width = `${completed}%`

    const connected = web3Store.defaultAccount.address !== '' && web3Store.defaultAccount.address !== undefined
    if (!connected) return (
      <div className="wallet-connect">
        <a onClick={this.connectWallet} >
          Connect wallet
        </a>
      </div>
    )

    return (
      <div
        className="header-wallet"
        onMouseEnter={() => alertStore.setShowDailyQuotaInfo(true)}
        onMouseLeave={() => alertStore.setShowDailyQuotaInfo(false)}
      >
        <div className="wallet-container">
          <span className="wallet-icon">{<WalletIcon />}</span>
          <a
            href={explorerAddressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`wallet-text wallet-link wallet-text-${REACT_APP_UI_STYLES}`}
          >
            {web3Store.defaultAccount.address.slice(0, 17).concat('...')}
          </a>
        </div>
        <div className="daily-quota-container">
          {web3Store.metamaskNet.id && <div className="daily-quota-progress" style={{ width }} />}
        </div>
      </div>
    )
  }
}
