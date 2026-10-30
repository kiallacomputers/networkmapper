export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  if (user.value) return

  // The reactive user can lag behind signInWithPassword during navigation.
  // Confirm the session directly before treating the visitor as signed out.
  const client = useSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (!error && data.user) return

  return navigateTo('/login')
})
