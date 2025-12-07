import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import store, { persistor } from './store'
import { setupAuthInterceptor } from './services/AuthService'
import { ErrorProvider } from '@/contexts/ErrorContext'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import ListsLoader from '@/components/template/ListsLoader'
import mockServer from './mock'
import appConfig from '@/configs/app.config'
import './locales'
const environment = process.env.NODE_ENV

/**
 * Set enableMock(Default false) to true at configs/app.config.js
 * If you wish to enable mock api
 */
if (environment !== 'production' && appConfig.enableMock) {
    mockServer({ environment })
}

// Setup the auth interceptor for all API requests
setupAuthInterceptor()

function App() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <BrowserRouter>
                    <ErrorProvider>
                        <Theme>
                            <ListsLoader>
                                <Layout />
                                <ErrorDisplay />
                            </ListsLoader>
                        </Theme>
                    </ErrorProvider>
                </BrowserRouter>
            </PersistGate>
        </Provider>
    )
}

export default App
