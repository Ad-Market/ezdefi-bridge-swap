import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './App'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'mobx-react'
import RootStore from './stores/RootStore'

ReactDOM.render(
  <Provider RootStore={RootStore}>
    <BrowserRouter basename={process.env.REACT_APP_UI_BASE_ROUTER}>
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('root')
)
