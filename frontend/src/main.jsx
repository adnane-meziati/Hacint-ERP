import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import App from './App'
import GlobalUiTranslator from './components/common/GlobalUiTranslator'
import './index.css'

const system = createSystem(defaultConfig)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ChakraProvider value={system}>
        <GlobalUiTranslator />
        <App />
      </ChakraProvider>
    </I18nextProvider>
  </React.StrictMode>
)
