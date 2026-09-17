import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { applyEmbedDocumentState, startEmbedResizeReporter } from './embed'

applyEmbedDocumentState()
startEmbedResizeReporter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
