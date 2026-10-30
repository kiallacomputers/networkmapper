<template>
  <div ref="host" class="rack-face-host" :style="{background: faceColor}" aria-label="Switch front panel">
    <div class="rack-face-canvas" :style="{height: canvasHeight+'px',transform:`scale(${scaleX}, ${scaleY})`,background:faceColor}">
      <template v-if="sectionLayout?.enabled">
        <div class="rack-face-sections" :style="{gridTemplateColumns:`repeat(${columns}, minmax(0, 1fr))`,gridTemplateRows:rowHeights.map(h=>h+'px').join(' ')}">
          <div v-for="(section,index) in sections" :key="section.id||index" class="rack-face-section" :style="sectionStyle(section)">
            <div v-if="groupFor(section)" class="rack-face-ports" :style="portsStyle(section,groupFor(section))">
              <button v-for="n in groupFor(section).count" :key="n" type="button" class="rack-face-port" :class="{'rack-face-fibre':groupFor(section).type!=='RJ45'}" :style="portStyle(groupFor(section))" :title="portTip(groupFor(section),n)" :aria-label="portTip(groupFor(section),n)" @click.stop="$emit('port-click',portInfo(groupFor(section),n))">
                <span class="rack-face-hole" :class="{'rack-face-duplex':isDuplex(groupFor(section))}"><template v-if="isDuplex(groupFor(section))"><i></i><i></i></template><template v-else>{{groupFor(section).type==='RJ45'?'▥':groupFor(section).sfpAppearance==='simplex'?'◻':'▭'}}</template></span>
              </button>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="g in groups" :key="g.id" class="rack-face-free-group" :style="{left:(g.x||0)+'px',top:(g.y||0)+'px',gridTemplateColumns:`repeat(${Math.max(1,Number(g.columns)||1)}, ${portWidth(g)}px)`}">
          <button v-for="n in g.count" :key="n" type="button" class="rack-face-port" :class="{'rack-face-fibre':g.type!=='RJ45'}" :style="portStyle(g)" :title="portTip(g,n)" :aria-label="portTip(g,n)" @click.stop="$emit('port-click',portInfo(g,n))"><span class="rack-face-hole" :class="{'rack-face-duplex':isDuplex(g)}"><template v-if="isDuplex(g)"><i></i><i></i></template><template v-else>{{g.type==='RJ45'?'▥':g.sfpAppearance==='simplex'?'◻':'▭'}}</template></span></button>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
const props=defineProps<{layout:any;faceColor?:string}>()
defineEmits<{(e:'port-click',value:any):void}>()
const host=ref<HTMLElement|null>(null)
const size=ref({width:500,height:140})
let observer:ResizeObserver|undefined
onMounted(()=>{if(!host.value)return;observer=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r)size.value={width:r.width,height:r.height}});observer.observe(host.value)})
onUnmounted(()=>observer?.disconnect())
const groups=computed<any[]>(()=>Array.isArray(props.layout)?props.layout:props.layout?.groups||[])
const sectionLayout=computed(()=>Array.isArray(props.layout)?null:props.layout?.sectionLayout)
const columns=computed(()=>Math.max(1,Number(sectionLayout.value?.columns)||2))
const sections=computed<any[]>(()=>sectionLayout.value?.sections||[])
const rowHeights=computed(()=>Array.from({length:Math.max(1,Number(sectionLayout.value?.rows)||4)},(_,i)=>Math.max(36,Number(sectionLayout.value?.rowHeights?.[i])||120)))
const canvasHeight=computed(()=>sectionLayout.value?.enabled?rowHeights.value.reduce((a,b)=>a+b,0)+32:Math.max(160,...groups.value.map(g=>(Number(g.y)||0)+Math.ceil((Number(g.count)||1)/(Number(g.columns)||1))*((Number(g.portHeight)||40)+4)+24)))
// Fit both axes to the rack device face. The previous uniform scale was
// limited by the 4U height, leaving the right half of the chassis unused.
const scaleX=computed(()=>Math.max(.01,size.value.width/920))
const scaleY=computed(()=>Math.max(.01,size.value.height/canvasHeight.value))
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n))
const groupFor=(s:any)=>groups.value.find(g=>g.id===s.groupId)
const fibre=(g:any)=>String(g.type||'').startsWith('SFP')||String(g.type||'').startsWith('QSFP')
const portWidth=(g:any)=>Math.round(clamp(Number(g.portWidth??28),18,90)*(fibre(g)?1.18:1))
const portHeight=(g:any)=>Math.round(clamp(Number(g.portHeight??40),24,110)*(fibre(g)?1.18:1))
const portStyle=(g:any)=>({width:portWidth(g)+'px',height:portHeight(g)+'px'})
const isDuplex=(g:any)=>String(g.type||'').startsWith('SFP')&&(g.sfpAppearance||'duplex')==='duplex'
const sectionStyle=(s:any)=>({width:clamp(Number(s.widthPercent??100),30,100)+'%',height:clamp(Number(s.heightPercent??100),30,100)+'%',padding:clamp(Number(s.padding??6),0,30)+'px'})
function portsStyle(s:any,g:any){const n=Math.max(1,Math.min(Number(g.columns)||1,Number(g.count)||1)),w=portWidth(g),gap=clamp(Number(g.gap??4),0,40),a=s.alignment||'left';return {gridTemplateColumns:a==='justify'?`repeat(${n},minmax(${w}px,1fr))`:`repeat(${n},${w}px)`,gap:gap+'px',width:a==='justify'?'100%':'max-content',marginLeft:a==='right'||a==='center'?'auto':'0',marginRight:a==='left'||a==='center'?'auto':'0'}}
const portInfo=(g:any,n:number)=>({number:(Number(g.start)||1)+n-1,type:g.type,group:g.title})
const portTip=(g:any,n:number)=>`${g.title||'Port group'} · Port ${(Number(g.start)||1)+n-1} · ${g.type||'Unknown'}`
</script>
<style scoped>
.rack-face-host{width:100%;height:100%;min-height:0;position:relative;overflow:hidden;border-radius:3px}
.rack-face-canvas{position:absolute;top:0;left:0;width:920px;transform-origin:top left;overflow:hidden}
.rack-face-sections{position:absolute;inset:16px 22px;display:grid;gap:5px}
.rack-face-section{box-sizing:border-box;min-width:0;min-height:0;border:1px solid #9aaabd;border-radius:4px;background:#0b14258a;overflow:hidden;display:flex;flex-direction:column}
.rack-face-ports{display:grid;max-width:100%;min-width:0;flex:0 0 auto;margin-top:auto;margin-bottom:auto;align-content:center}
.rack-face-port{box-sizing:border-box;min-width:0;max-width:100%;position:relative;border:1px solid #94a3b8;border-radius:2px;background:#0a1220;color:#dbeafe;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rack-face-port:hover{outline:3px solid #fbbf24;z-index:3}
.rack-face-hole{display:flex;justify-content:center;align-items:center;margin:3px;width:calc(100% - 6px);height:60%;background:#34475e;border:1px solid #64748b;font-size:14px;color:#d5e1ef}
.rack-face-fibre .rack-face-hole{background:#142f3a;border-color:#67a4b0}
.rack-face-duplex{gap:3px;padding:2px;box-sizing:border-box}
.rack-face-duplex i{display:block;flex:1;max-width:13px;height:70%;border:1px solid #9dc9d3;border-radius:2px;background:#0a1b25;box-shadow:inset 0 0 0 2px #244b59}
.rack-face-free-group{position:absolute;display:grid;gap:4px}
</style>
