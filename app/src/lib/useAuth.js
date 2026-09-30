import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => setLoading(false))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      loadProfile(sess?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, fullName) => supabase.auth.signUp({
    email, password, options: { data: { full_name: fullName } }
  })
  const signOut = () => supabase.auth.signOut()

  return { session, profile, loading, signIn, signUp, signOut, refreshProfile: () => loadProfile(session?.user?.id) }
}
