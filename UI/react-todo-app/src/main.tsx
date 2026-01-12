
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'

// const theme = createTheme({ palette: { mode: 'light', primary: { main: '#1976d2' }, secondary: { main: '#9c27b0' } } })


const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },     // soft blue
    secondary: { main: '#7c3aed' },   // violet accent
    success: { main: '#16a34a' },     // green
    warning: { main: '#ca8a04' },     // amber
    error: { main: '#dc2626' },       // red
    background: {
      default: '#f6f7fb',             // subtle cool gray/blue
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)', // soft blue shadow
          border: '1px solid rgba(37, 99, 235, 0.10)',
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 }
      }
    },
    MuiSelect: {
      styleOverrides: { root: { minWidth: 150 } }
    }
  }
})


createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
