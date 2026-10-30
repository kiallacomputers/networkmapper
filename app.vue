<template>
  <UApp>
    <div class="shell">
      <header class="header"><NuxtLink to="/" class="brand">◈ KC Network Mapper</NuxtLink><nav><NuxtLink to="/">Dashboard</NuxtLink><NuxtLink to="/sites">Sites</NuxtLink><NuxtLink to="/buildings">Buildings</NuxtLink><NuxtLink to="/switches">Switches</NuxtLink><NuxtLink to="/switch-designer">Switch Designer</NuxtLink><button v-if="user" @click="logout">Sign out</button><NuxtLink v-else to="/login">Sign in</NuxtLink></nav></header>
      <main class="content"><NuxtPage /></main>
    </div>
  </UApp>
</template>
<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()
async function logout() { await client.auth.signOut(); await navigateTo('/login') }
</script>
