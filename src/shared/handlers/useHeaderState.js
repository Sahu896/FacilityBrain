import { useEffect, useRef, useState } from 'react'
import { fetchAssets, deriveAlerts } from '../../data/liveData'

export function useHeaderState() {
  const [time, setTime] = useState(new Date())
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [live, setLive] = useState(true)
  const [alerts, setAlerts] = useState([])
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  // Alerts are derived live from real per-asset deviation data — see data/liveData.js.
  useEffect(() => {
    let cancelled = false
    fetchAssets().then(assets => { if (!cancelled) setAlerts(deriveAlerts(assets)) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  return { time, notifOpen, setNotifOpen, profileOpen, setProfileOpen, live, setLive, notifRef, profileRef, alerts }
}
