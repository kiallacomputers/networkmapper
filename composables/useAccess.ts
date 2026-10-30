/** Shared, session-aware role lookup for all protected management pages. */
export function useAccess() {
  const client = useSupabaseClient()
  const role = useState<string | null>('kc-role', () => null)
  const roleUserId = useState<string | null>('kc-role-user-id', () => null)
  const loadingRole = useState<boolean>('kc-role-loading', () => false)
  const roleError = useState<string | null>('kc-role-error', () => null)

  async function refreshRole() {
    loadingRole.value = true
    roleError.value = null
    try {
      // Do not rely on useSupabaseUser() being populated immediately after login.
      const { data: { user }, error: authError } = await client.auth.getUser()
      if (authError) throw authError
      if (!user) {
        role.value = null
        roleUserId.value = null
        return
      }
      const { data, error } = await client.from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      roleUserId.value = user.id
      role.value = typeof data?.role === 'string' ? data.role.trim().toLowerCase() : null
      if (!data) roleError.value = 'Your account has no profile record. Contact an administrator.'
    } catch (e: any) {
      role.value = null
      roleUserId.value = null
      roleError.value = e?.message || 'Unable to check account permissions.'
    } finally {
      loadingRole.value = false
    }
  }

  return {
    role,
    roleUserId,
    loadingRole,
    roleError,
    refreshRole,
    isAdmin: computed(() => role.value === 'admin')
  }
}
