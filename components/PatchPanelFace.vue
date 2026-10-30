<template>
  <div class="patch-face" :style="{gridTemplateColumns:`repeat(${Math.min(columns, count)}, minmax(0, 1fr))`}" :aria-label="`Patch panel with ${count} RJ45 ports`">
    <button v-for="n in count" :key="n" type="button" class="patch-port" :class="{connected:!!connections[n]}" :title="tooltip(n)" :aria-label="tooltip(n)" @click.stop="$emit('port-click',{number:n,connection:connections[n]||null})">
      <span class="patch-socket"><span class="patch-contacts">▥</span></span>
      <span v-if="!compact" class="patch-number">{{n}}</span>
    </button>
  </div>
</template>
<script setup lang="ts">
const props=withDefaults(defineProps<{count:number;columns?:number;compact?:boolean;connections?:Record<number,string>}>(),{columns:24,compact:false,connections:()=>({})})
defineEmits<{(e:'port-click',value:{number:number;connection:string|null}):void}>()
const tooltip=(n:number)=>`RJ45 port ${n}${props.connections[n]?' · '+props.connections[n]:''}`
</script>
<style scoped>
.patch-face{display:grid;gap:clamp(2px,.45vw,7px);align-content:center;width:100%;min-width:0;height:100%;box-sizing:border-box;padding:4px;background:#17263a;border:1px solid #72869b;border-radius:3px}
.patch-port{min-width:0;min-height:0;aspect-ratio: .86;position:relative;background:#0b1626;border:1px solid #8296ae;border-radius:2px;padding:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#d8e8fa}
.patch-port:hover,.patch-port:focus-visible{outline:2px solid #ffcc4d;z-index:2}.patch-port.connected{border-color:#67c8a1}
.patch-socket{display:flex;align-items:center;justify-content:center;width:80%;height:62%;background:#314c64;border:1px solid #6c9db4;border-radius:1px}
.patch-contacts{font-size:clamp(6px,1vw,13px);line-height:1;color:#b8e8f7}.patch-number{font-size:10px;line-height:1.2}
</style>
