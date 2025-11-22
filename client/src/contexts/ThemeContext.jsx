import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  // Default to dark theme
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    // If no saved theme, default to dark
    return savedTheme || 'dark'
  })

  // Apply theme on mount and when theme changes
  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // Ensure dark theme is applied on initial mount
  useEffect(() => {
    // If no theme is saved, set dark as default
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

