<template>
  <div class="panel" style="max-width:520px;margin:55px auto">
    <h1>Sign in</h1>
    <p>Access your network infrastructure documentation.</p>
    <form class="form" @submit.prevent="signIn">
      <label>Email</label>
      <input v-model="email" type="email" required autocomplete="username">
      <label>Password</label>
      <input v-model="password" type="password" required autocomplete="current-password">
      <button class="btn" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      <p v-if="error" class="danger">{{ error }}</p>
    </form>
  </div>
</template>
<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

// When the user is already signed in, don't leave them on the login page.
watch(user, (currentUser) => {
  if (currentUser) void navigateTo('/', { replace: true })
}, { immediate: true })

async function signIn() {
  busy.value = true
  error.value = ''
  try {
    const { data, error: authError } = await client.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (authError) throw authError
    if (!data.user || !data.session) throw new Error('Sign-in did not return a session.')
    await navigateTo('/', { replace: true })
  } catch (e: any) {
    error.value = e?.message || 'Sign-in failed'
  } finally {
    busy.value = false
  }
}
</script>
