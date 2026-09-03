import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: '4px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#282c3f',
        },
        success: {
          iconTheme: { primary: '#ff3f6c', secondary: '#fff' },
        },
      }}
    />
  </React.StrictMode>
)
