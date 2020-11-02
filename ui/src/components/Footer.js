import React from 'react'
import yn from './utils/yn'
import { DailyQuotaModal } from './DailyQuotaModal'
import { HeaderMenu } from './HeaderMenu'
import { Link } from 'react-router-dom'
import { MobileMenu } from './MobileMenu'
// import { MobileMenuButton } from './MobileMenuButton'
import { inject, observer } from 'mobx-react/index'
import { MenuItems } from './MenuItems'
import { Wallet } from './Wallet'
import { WalletIcon } from './menu-icons/WalletIcon'

@inject('RootStore')
@observer
export class Footer extends React.Component {
  state = {
    selected: '/'
  }

  componentDidMount() {
    this.setState({ selected: window.location.pathname })
  }

  changeSelectedMenuMobile = newSelected => {
    const { onMenuToggle } = this.props
    this.changeSelectedMenu(newSelected)
    onMenuToggle()
  }

  changeSelectedMenu = newSelected => {
    if (newSelected !== this.state.selected) {
      this.setState({ selected: newSelected })
    }
  }

  connectWallet = async () => {
    try {
      await ethereum.enable()
      location.reload();
    } catch (e) {

    }
  }

  render() {
    const {
      showMobileMenu,
      onMenuToggle,
      RootStore: { alertStore, web3Store, homeStore, foreignStore },
    } = this.props
    const { selected } = this.state
    const {
      REACT_APP_UI_HOME_WITHOUT_EVENTS: HOME,
      REACT_APP_UI_FOREIGN_WITHOUT_EVENTS: FOREIGN,
      REACT_APP_UI_STYLES
    } = process.env
    const withoutEvents = web3Store.isSelectedNetwork(web3Store.homeNet.id) ? yn(HOME) : yn(FOREIGN)
    const displayEventsTab = REACT_APP_UI_STYLES !== 'stake'
    const address = web3Store.defaultAccount.address

    const connected = web3Store.defaultAccount.address !== '' && web3Store.defaultAccount.address !== undefined
    const isHome = web3Store.isSelectedNetwork(web3Store.homeNet.id)
    const explorerAddressUrl = isHome
    ? homeStore.getExplorerAddressUrl(address)
    : foreignStore.getExplorerAddressUrl(address)

    return (
      <footer className="footer">
        <div className="container">
          <div className="footer-menu">
            <MenuItems
              selected={selected}
              withoutEvents={withoutEvents}
              displayEventsTab={displayEventsTab}
              onMenuToggle={onMenuToggle}
            />
            {connected ?
              <div className="wallet-address">
                <a 
                href={explorerAddressUrl} 
                target="_blank"
                rel="noopener noreferrer">
                  {address.slice(0, 10).concat('...')}
                </a>
              </div> :
              <div className="wallet-connect" onClick={this.connectWallet}>
                <a>
                  Connect wallet
                </a>
              </div>
            }
          </div>
        </div>
      </footer>
    )
  }
}

