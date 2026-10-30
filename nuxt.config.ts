export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  modules: ['@nuxtjs/supabase', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  supabase: { redirect: false },
  nitro: { preset: 'netlify' },
  app: { head: { title: 'KC Network Mapper', meta: [{ name: 'description', content: 'Network infrastructure documentation' }] } }
})
