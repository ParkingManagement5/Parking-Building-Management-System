import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/variables.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/dashboard.css'
import './styles/form.css'
import './styles/table.css'
import './styles/public.css'
import './styles/auth.css'
import './styles/responsive.css'

import './styles/figma-ui/globals.css'
import './styles/figma-ui/theme.css'
import './styles/figma-ui/tailwind.css'
import './styles/figma-ui/index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
