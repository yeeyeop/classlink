import { useEffect, useState } from 'react'
import HomeView from './components/HomeView'
import AuthView from './components/AuthView'
import PlatformShelfView from './components/PlatformShelfView'

const SESSION_KEY = 'zuanyilou_session'

export default function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('home')
  const [authMode, setAuthMode] = useState('register')

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return
        if (result.user) {
          setSession(result.user)
          localStorage.setItem(SESSION_KEY, JSON.stringify(result.user))
          setView((current) => (current === 'home' ? 'app' : current))
          return
        }
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
        setView((current) => (current === 'app' ? 'home' : current))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const goHome = () => setView('home')
  const goAuth = (mode) => {
    setAuthMode(mode)
    setView('auth')
  }
  const enterApp = (user) => {
    setSession(user)
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    setView('app')
  }
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Session cookie can still be removed by the browser on the next login.
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setView('home')
  }

  if (view === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        onBack={goHome}
        onRegistered={enterApp}
      />
    )
  }

  if (view === 'app') {
    return (
      <PlatformShelfView session={session} onBack={signOut} />
    )
  }

  return (
    <HomeView
      onRegister={() => goAuth('register')}
      onLogin={() => goAuth('login')}
    />
  )
}
