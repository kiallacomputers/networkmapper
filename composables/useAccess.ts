export function useAccess() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const role = useState<string | null>('kc-role', () => null)
  async function refreshRole() {
    if (!user.value) { role.value = null; return }
    const { data, error } = await client.from('profiles').select('role').eq('id', user.value.id).single()
    if (error) throw error
    role.value = data?.role ?? null
  }
  return { role, refreshRole, isAdmin: computed(() => role.value === 'admin') }
}
