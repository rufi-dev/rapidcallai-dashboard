import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from "sonner";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      richColors
      position="bottom-center"
      toastOptions={{
        className: "border border-white/10 bg-slate-950/80 text-slate-100 backdrop-blur-xl",
      }}
    />
  </StrictMode>,
)
