import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/public.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/table.css";
import "./styles/form.css";
import "./styles/auth.css";
import "./styles/responsive.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
