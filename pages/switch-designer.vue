<template>
 <div class="designer-page">
  <div class="designer-heading"><div><h1>Visual Switch Designer</h1><p>Create reusable front-panel layouts with draggable port groups.</p></div><NuxtLink class="btn secondary-btn" to="/switches">Manage switches</NuxtLink></div>
  <p v-if="error" class="danger panel">{{ error }}</p><p v-if="notice" class="success-note">{{ notice }}</p>
  <section class="panel model-lookup">
    <h2>Device model lookup & configuration</h2>
    <p class="muted">Search the starter catalogue, then configure the actual installed modules. Confirm module part numbers against your hardware before saving.</p>
    <label>Find a manufacturer, model or part number</label>
    <input v-model="catalogSearch" placeholder="e.g. Aruba 5406R, J9821A, 24-port">
    <label>Matching chassis</label>
    <select v-model="catalogId"><option value="">Choose a chassis…</option><option v-for="device in catalogMatches" :key="device.id" :value="device.id">{{device.manufacturer}} {{device.model}} — {{device.partNumber}}</option></select>
    <div v-if="selectedCatalog" class="catalog-detail">
      <p><strong>{{selectedCatalog.model}}</strong> · {{selectedCatalog.rackUnits}}U · {{selectedCatalog.slots}} configurable slots</p>
      <p class="muted">{{selectedCatalog.notes}}</p>
      <a v-if="selectedCatalog.source" :href="selectedCatalog.source" target="_blank" rel="noopener noreferrer">Manufacturer documentation</a>
      <div v-for="(slot,i) in configuredSlots" :key="i" class="catalog-slot">
        <label>{{slot.label}} — installed hardware</label>
        <select v-model="slot.moduleId"><option value="empty">Empty</option><option v-for="mod in moduleOptions" :key="mod.id" :value="mod.id">{{mod.label}}</option></select>
        <div v-if="slot.moduleId==='custom'" class="two-fields"><div><label>Port type</label><select v-model="slot.customType"><option v-for="t in portTypes" :key="t">{{t}}</option></select></div><div><label>Port count</label><input type="number" v-model.number="slot.customCount" min="1" max="96"></div></div>
      </div>
      <label><input type="checkbox" v-model="includeManagement"> Include dedicated management RJ45 port</label>
      <p class="muted">Applying a model replaces the unsaved front-panel groups and section assignments. Existing saved templates are unaffected until you save.</p>
      <button class="btn" :disabled="!isAdmin" @click="applyCatalogDevice">Generate front panel from configured hardware</button>
    </div>
    <p v-else class="muted">Model not listed? Use the Advanced Custom Designer below. The catalogue is a starter library, not a live manufacturer API.</p>
  </section>
  <section class="panel designer-template">
    <h2>Switch template</h2>
    <label>Template name</label><input v-model="templateName" maxlength="120" placeholder="Core Switch 12 RJ45 + 6 SFP">
    <label>Manufacturer</label><input v-model="manufacturer" maxlength="120" placeholder="e.g. Aruba">
    <label>Model</label><input v-model="model" maxlength="120" placeholder="e.g. 6100">
    <div class="two-fields"><div><label>Rack units</label><select v-model.number="rackUnits"><option v-for="n in 4" :key="n" :value="n">{{ n }}U</option></select></div><div><label>Front panel colour</label><input v-model="faceColor" type="color" class="color-field"></div></div>
  </section>
   <section class="panel designer-preview">
    <div class="designer-heading"><h2>Front-panel preview</h2><span class="muted">{{ totalPorts }} ports · {{ rackUnits }}U</span></div>
    <p class="muted">{{sectionMode ? "Assign a port group to each section. Click ports to inspect them." : "Drag a port group to reposition it. Click a port to inspect it."}}</p>
    <div class="panel-scroll">
     <div ref="faceRef" class="switch-face" :style="{backgroundColor:faceColor,height:faceHeight+'px'}">
      <div class="rack-screw screw-left"></div><div class="rack-screw screw-right"></div>
      <div v-if="sectionMode" class="section-face-grid" :style="sectionGridStyle">
       <div v-for="(section,i) in sections" :key="section.id" class="face-section" :style="sectionBoxStyle(section)" :class="{'face-section-empty':!assignedGroup(section)}">
        <div class="face-section-label">Section {{ i+1 }} <span v-if="assignedGroup(section)">{{assignedGroup(section)?.title}}</span></div>
        <div v-if="assignedGroup(section)" class="section-port-grid" :style="sectionPortStyle(section, assignedGroup(section)!)">
         <button v-for="n in assignedGroup(section)!.count" :key="n" type="button" class="face-port" :style="portStyle(assignedGroup(section)!)" :class="{'fiber-port':assignedGroup(section)!.type!=='RJ45'}" :title="`${assignedGroup(section)!.type} ${assignedGroup(section)!.start+n-1}`" @click="selectedPort={label:String(assignedGroup(section)!.start+n-1),type:assignedGroup(section)!.type,group:assignedGroup(section)!.title}"><span class="port-number">{{assignedGroup(section)!.start+n-1}}</span><span class="port-hole" :class="{'duplex-hole':isDuplex(assignedGroup(section)!)}"><template v-if="isDuplex(assignedGroup(section)!)"><i></i><i></i></template><template v-else>{{assignedGroup(section)!.type==='RJ45'?'▥':assignedGroup(section)!.sfpAppearance==='simplex'?'◻':'▭'}}</template></span></button>
        </div>
        <div v-else class="section-placeholder">Unassigned</div>
       </div>
      </div>
      <div v-if="!sectionMode && !groups.length" class="empty-face">Add a port group to preview the switch</div>
      <div v-for="group in (sectionMode ? [] : groups)" :key="group.id" class="face-group" :style="groupStyle(group)" @pointerdown="startDrag($event,group.id)">
       <div class="face-group-title">{{ group.title }} <span>{{ group.type }}</span></div>
       <div class="port-grid" :style="{gridTemplateColumns:`repeat(${group.columns}, ${effectivePortWidth(group)}px)`,gap:(group.gap??4)+'px'}">
        <button v-for="n in group.count" :key="n" type="button" class="face-port" :style="portStyle(group)" :class="{'fiber-port':group.type!=='RJ45'}" :title="`${group.type} ${group.start+n-1}`" @pointerdown.stop @click="selectedPort={label:String(group.start+n-1),type:group.type,group:group.title}">
         <span class="port-number">{{ group.start+n-1 }}</span><span class="port-hole" :class="{'duplex-hole':isDuplex(group)}"><template v-if="isDuplex(group)"><i></i><i></i></template><template v-else>{{ group.type==='RJ45'?'▥':group.sfpAppearance==='simplex'?'◻':'▭' }}</template></span>
        </button>
       </div>
      </div>
     </div>
    </div>
    <p v-if="selectedPort" class="port-inspector">Selected: <strong>{{ selectedPort.group }}</strong> · {{ selectedPort.type }} port {{ selectedPort.label }}</p>
    <p class="muted">The preview represents the physical face. Port labels, types and positions are saved in the template.</p>
   </section>
  <div class="designer-grid">
   <section class="panel designer-controls">
    <hr><h2>Panel sections</h2>
    <label><input type="checkbox" v-model="sectionMode" :disabled="!isAdmin"> Enable section layout</label>
    <template v-if="sectionMode">
     <div class="two-fields"><div><label>Columns</label><input v-model.number="sectionColumns" type="number" min="1" max="8"></div><div><label>Rows</label><input v-model.number="sectionRows" type="number" min="1" max="12"></div></div>
     <label>Row heights (pixels, comma separated)</label><input v-model="rowHeightsText" placeholder="48, 120, 120, 120">
     <button class="small-btn" :disabled="!isAdmin" @click="applySectionGrid">Apply section grid</button>
     <p class="muted">Assign one port group to each section. Ports will appear inside that section.</p>
    </template>
    <hr><h2>Port group</h2>
    <label>Group title</label><input v-model="groupTitle" maxlength="60" placeholder="RJ45 ports">
    <div class="two-fields"><div><label>Port type</label><select v-model="portType"><option v-for="t in portTypes" :key="t" :value="t">{{ t }}</option></select></div><div><label>Port count</label><input v-model.number="portCount" type="number" min="1" max="96"></div></div>
    <div class="two-fields"><div><label>Ports per row</label><input v-model.number="perRow" type="number" min="1" max="24"></div><div><label>First port number</label><input v-model.number="startNumber" type="number" min="1" max="999"></div></div>
    <div class="two-fields"><div><label>Port width (px)</label><input v-model.number="portWidth" type="number" min="18" max="90"></div><div><label>Port height (px)</label><input v-model.number="portHeight" type="number" min="24" max="110"></div></div>
    <label>Spacing between ports (px)</label><input v-model.number="portGap" type="number" min="0" max="40">
    <template v-if="portType.startsWith('SFP')"><label>Fibre connection appearance</label><select v-model="sfpAppearance"><option value="duplex">Duplex LC (two fibres)</option><option value="simplex">Simplex / BiDi (one fibre)</option><option value="cage">Empty SFP cage</option></select></template>
    <button class="btn" :disabled="!isAdmin" @click="addGroup">{{ editingGroupId ? 'Update port group' : 'Add port group' }}</button>
    <p v-if="!isAdmin" class="muted">Only administrators can save or edit templates.</p>
    <hr><h2>Groups on front panel</h2>
    <p v-if="!groups.length" class="muted">Add a group to start designing.</p>
    <div v-for="(group,index) in groups" :key="group.id" class="group-entry">
     <div><strong>{{ group.title }}</strong><small>{{ group.count }} × {{ group.type }} · {{ group.columns }} per row</small></div>
     <div class="actions"><button class="small-btn" :disabled="!isAdmin" @click="editGroup(index)">Edit</button><button class="small-btn danger" :disabled="!isAdmin" @click="removeGroup(index)">Remove</button></div>
    </div>
    <template v-if="sectionMode"><hr><h2>Assign groups to sections</h2>
     <div v-for="(section,i) in sections" :key="section.id" class="section-assignment">
      <label>Section {{ i+1 }} (row {{ Math.floor(i/sectionColumns)+1 }}, column {{ i%sectionColumns+1 }})</label>
      <select v-model="section.groupId" :disabled="!isAdmin"><option value="">Unassigned</option><option v-for="g in groups" :key="g.id" :value="g.id" :disabled="sections.some(s=>s.id!==section.id && s.groupId===g.id)">{{g.title}} — {{g.count }} {{g.type}}</option></select>
      <div class="two-fields"><div><label>Section width (%)</label><input v-model.number="section.widthPercent" type="number" min="30" max="100" :disabled="!isAdmin"></div><div><label>Section height (%)</label><input v-model.number="section.heightPercent" type="number" min="30" max="100" :disabled="!isAdmin"></div></div>
      <label>Section padding (px)</label><input v-model.number="section.padding" type="number" min="0" max="30" :disabled="!isAdmin">
      <label>Port alignment</label><select v-model="section.alignment" :disabled="!isAdmin"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select>
     </div>
    </template>
    <hr><h2>Save and reuse</h2>
    <button class="btn" :disabled="saving || !isAdmin || !groups.length || !templateName.trim()" @click="saveTemplate">{{ saving ? 'Saving…' : editingId ? 'Update template' : 'Save as template' }}</button>
    <button class="small-btn" @click="newTemplate">New blank template</button>
    <label>Load saved template</label><select v-model="selectedTemplateId" @change="loadSelectedTemplate"><option value="">Choose template…</option><option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option></select>
   </section>

  </div>
 </div>
</template>
<script setup lang="ts">
import { deviceCatalog, moduleOptions, type ConfiguredSlot } from '~/utils/device-catalog'
definePageMeta({middleware:'auth'})
type Group={id:string;title:string;type:string;count:number;columns:number;start:number;x:number;y:number;portWidth?:number;portHeight?:number;gap?:number;sfpAppearance?:'duplex'|'simplex'|'cage'}
type Alignment='left'|'center'|'right'|'justify'
type Section={id:string;groupId:string;alignment:Alignment;widthPercent?:number;heightPercent?:number;padding?:number}
const client=useSupabaseClient();const {isAdmin,refreshRole}=useAccess()
const templateName=ref(''),manufacturer=ref(''),model=ref(''),rackUnits=ref(1),faceColor=ref('#263344')
const catalogSearch=ref(''),catalogId=ref(''),includeManagement=ref(true)
const configuredSlots=ref<ConfiguredSlot[]>([])
const catalogMatches=computed(()=>deviceCatalog.filter(d=>`${d.manufacturer} ${d.model} ${d.partNumber}`.toLowerCase().includes(catalogSearch.value.toLowerCase())))
const selectedCatalog=computed(()=>deviceCatalog.find(d=>d.id===catalogId.value))
watch(catalogId,()=>{const d=selectedCatalog.value;configuredSlots.value=d?Array.from({length:d.slots},(_,i)=>({label:`Slot ${String.fromCharCode(65+i)}`,moduleId:'empty',customType:'RJ45',customCount:24})):[];includeManagement.value=!!d?.management})
function applyCatalogDevice(){
 const d=selectedCatalog.value;if(!d||!isAdmin.value)return
 const slots=configuredSlots.value.map((slot,i)=>({slot,index:i,module:moduleOptions.find(m=>m.id===slot.moduleId)}))
 const active=slots.filter(x=>x.slot.moduleId!=='empty')
 if(!active.length&&!includeManagement.value){error.value='Select at least one module or include the management port.';return}
 const generated:Group[]=[]
 const generatedSections:Section[]=[]
 const columns=d.columns
 const rows=Math.max(1,Math.ceil((d.slots+(includeManagement.value&&d.management?columns:0))/columns))
 const rowSizes=Array.from({length:rows},()=>116)
 let offset=0
 if(includeManagement.value&&d.management){
  rowSizes[0]=65
  generated.push({id:crypto.randomUUID(),title:'Management',type:'RJ45',count:1,columns:1,start:1,x:0,y:0,portWidth:28,portHeight:40,gap:4})
  for(let i=0;i<columns;i++)generatedSections.push({id:crypto.randomUUID(),groupId:i===0?generated[0].id:'',alignment:'right',widthPercent:100,heightPercent:100,padding:5})
  offset=columns
 }
 for(let i=0;i<d.slots;i++){
  const entry=slots[i];let groupId=''
  if(entry.slot.moduleId!=='empty'){
   const count=entry.slot.moduleId==='custom'?clamp(Math.floor(Number(entry.slot.customCount)||1),1,96):(entry.module?.count||24)
   const type=entry.slot.moduleId==='custom'?entry.slot.customType:(entry.module?.type||'RJ45')
   const columnsPerRow=Math.min(count,count<=8?Math.min(count,4):12)
   const g:Group={id:crypto.randomUUID(),title:`${entry.slot.label} · ${entry.module?.label||'Custom module'}`,type,count,columns:columnsPerRow,start:1,x:0,y:0,portWidth:28,portHeight:40,gap:4,sfpAppearance:'duplex'}
   generated.push(g);groupId=g.id
  }
  generatedSections.push({id:crypto.randomUUID(),groupId,alignment:'center',widthPercent:100,heightPercent:100,padding:5})
 }
 while(generatedSections.length<rows*columns)generatedSections.push({id:crypto.randomUUID(),groupId:'',alignment:'left'})
 groups.value=generated;sections.value=generatedSections;sectionMode.value=true;sectionColumns.value=columns;sectionRows.value=rows;rowHeightsText.value=rowSizes.join(', ')
 templateName.value=`${d.manufacturer} ${d.model} — configured`;manufacturer.value=d.manufacturer;model.value=d.model;rackUnits.value=d.rackUnits;faceColor.value='#263344';editingId.value='';selectedTemplateId.value='';selectedPort.value=null;error.value='';notice.value='Front panel generated. Review the installed modules, port numbering and appearance before saving.'
}
const groupTitle=ref('RJ45 ports'),portType=ref('RJ45'),portCount=ref(12),perRow=ref(6),startNumber=ref(1)
const portWidth=ref(28),portHeight=ref(40),portGap=ref(4),sfpAppearance=ref<'duplex'|'simplex'|'cage'>('duplex')
const portTypes=['RJ45','SFP','SFP+','SFP28','QSFP','QSFP+','QSFP28','Other']
const sectionMode=ref(false),sectionColumns=ref(2),sectionRows=ref(4),rowHeightsText=ref('48, 120, 120, 120')
const sections=ref<Section[]>([])
const editingGroupId=ref('')
const rowHeights=computed(()=>{const parts=rowHeightsText.value.split(',').map(v=>Number(v.trim()));return Array.from({length:sectionRows.value},(_,i)=>clamp(Number.isFinite(parts[i])&&parts[i]>0?parts[i]:120,36,500))})
const sectionGridStyle=computed(()=>({gridTemplateColumns:`repeat(${sectionColumns.value}, minmax(0, 1fr))`,gridTemplateRows:rowHeights.value.map(n=>n+'px').join(' ')}))
function applySectionGrid(){sectionColumns.value=clamp(Math.floor(Number(sectionColumns.value)||2),1,8);sectionRows.value=clamp(Math.floor(Number(sectionRows.value)||4),1,12);const previous=sections.value;sections.value=Array.from({length:sectionColumns.value*sectionRows.value},(_,i)=>previous[i]?{...previous[i],alignment:normaliseAlignment(previous[i].alignment)}:{id:crypto.randomUUID(),groupId:'',alignment:'left'})}
function sectionBoxStyle(s:Section){return {width:clamp(Number(s.widthPercent??100),30,100)+'%',height:clamp(Number(s.heightPercent??100),30,100)+'%',padding:clamp(Number(s.padding??6),0,30)+'px',justifySelf:'start' as const,alignSelf:'start' as const,boxSizing:'border-box' as const}}
function isDuplex(g:Group){return g.type.startsWith('SFP')&&(g.sfpAppearance||'duplex')==='duplex'}
// Optical cages are slightly larger than RJ45, while preserving the group's configured size.
function isFibre(g:Group){return g.type.startsWith('SFP')||g.type.startsWith('QSFP')}
function effectivePortWidth(g:Group){return Math.round(clamp(Number(g.portWidth??28),18,90)*(isFibre(g)?1.18:1))}
function effectivePortHeight(g:Group){return Math.round(clamp(Number(g.portHeight??40),24,110)*(isFibre(g)?1.18:1))}
function portStyle(g:Group){return {width:effectivePortWidth(g)+'px',height:effectivePortHeight(g)+'px'}}
function assignedGroup(section:Section){return groups.value.find(g=>g.id===section.groupId)}
function normaliseAlignment(value:unknown):Alignment{return value==='center'||value==='right'||value==='justify'?value:'left'}
function sectionPortStyle(section:Section,group:Group){
 const columns=Math.min(Math.max(1,group.columns),group.count)
 const alignment=normaliseAlignment(section.alignment)
 const w=effectivePortWidth(group)
 const gap=clamp(Number(group.gap??4),0,40)
 return {
  gridTemplateColumns:alignment==='justify'?`repeat(${columns}, minmax(${w}px, 1fr))`:`repeat(${columns}, ${w}px)`,
  gap:gap+'px',
  width:alignment==='justify'?'100%':'max-content',
  maxWidth:'100%',
  marginLeft:alignment==='right'?'auto':alignment==='center'?'auto':'0',
  marginRight:alignment==='left'?'auto':alignment==='center'?'auto':'0',
  justifyItems:alignment==='justify'?'center':'start'
 }
}
const groups=ref<Group[]>([]),templates=ref<any[]>([]),editingId=ref(''),selectedTemplateId=ref(''),error=ref(''),notice=ref(''),saving=ref(false),selectedPort=ref<any>(null)
const faceRef=ref<HTMLElement|null>(null);const faceHeight=computed(()=>sectionMode.value?Math.max(160,rowHeights.value.reduce((a,b)=>a+b,0)+32):Math.max(160,rackUnits.value*160));const totalPorts=computed(()=>groups.value.reduce((sum,g)=>sum+g.count,0))
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n))
const groupWidth=(g:Group)=>g.columns*effectivePortWidth(g)+Math.max(0,g.columns-1)*(g.gap??4)+16
const groupHeight=(g:Group)=>Math.ceil(g.count/g.columns)*(effectivePortHeight(g)+(g.gap??4))+33
const groupStyle=(g:Group)=>({left:g.x+'px',top:g.y+'px',width:groupWidth(g)+'px'})
function addGroup(){if(!isAdmin.value)return;const count=clamp(Math.floor(Number(portCount.value)||1),1,96),columns=clamp(Math.floor(Number(perRow.value)||1),1,Math.min(count,24));const x=groups.value.length?Math.min(740,24+groups.value.length*210):24;groups.value.push({id:editingGroupId.value||crypto.randomUUID(),title:groupTitle.value.trim()||portType.value+' ports',type:portType.value,count,columns,start:clamp(Math.floor(Number(startNumber.value)||1),1,999),x,y:24,portWidth:clamp(Number(portWidth.value)||28,18,90),portHeight:clamp(Number(portHeight.value)||40,24,110),gap:clamp(Number(portGap.value)||0,0,40),sfpAppearance:sfpAppearance.value});startNumber.value+=count;editingGroupId.value='';notice.value='';error.value=''}
function editGroup(index:number){const g=groups.value[index];if(!g)return;editingGroupId.value=g.id;groupTitle.value=g.title;portType.value=g.type;portCount.value=g.count;perRow.value=g.columns;startNumber.value=g.start;portWidth.value=g.portWidth??28;portHeight.value=g.portHeight??40;portGap.value=g.gap??4;sfpAppearance.value=g.sfpAppearance??'duplex';groups.value.splice(index,1);notice.value='Group loaded into the editor. Change settings and click Update port group.'}
function removeGroup(index:number){const g=groups.value[index];if(g)sections.value.forEach(s=>{if(s.groupId===g.id)s.groupId='' });groups.value.splice(index,1)}
let drag:{id:string;startX:number;startY:number;originalX:number;originalY:number;pointerId:number}|null=null
function startDrag(e:PointerEvent,id:string){if(!isAdmin.value||!faceRef.value||e.button!==0)return;const g=groups.value.find(x=>x.id===id);if(!g)return;drag={id,startX:e.clientX,startY:e.clientY,originalX:g.x,originalY:g.y,pointerId:e.pointerId};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
function moveDrag(e:PointerEvent){if(!drag||!faceRef.value)return;const g=groups.value.find(x=>x.id===drag!.id);if(!g)return;g.x=clamp(Math.round(drag.originalX+e.clientX-drag.startX),18,Math.max(18,faceRef.value.clientWidth-groupWidth(g)-18));g.y=clamp(Math.round(drag.originalY+e.clientY-drag.startY),10,Math.max(10,faceHeight.value-groupHeight(g)-10))}
function endDrag(){drag=null}
onMounted(async()=>{applySectionGrid();window.addEventListener('pointermove',moveDrag);window.addEventListener('pointerup',endDrag);await refreshRole();await fetchTemplates()})
onUnmounted(()=>{window.removeEventListener('pointermove',moveDrag);window.removeEventListener('pointerup',endDrag)})
async function fetchTemplates(){const {data,error:e}=await client.from('switch_templates').select('*').order('name');if(e)error.value=e.message;else templates.value=data||[]}
function newTemplate(){sectionMode.value=false;sectionColumns.value=2;sectionRows.value=4;rowHeightsText.value='48, 120, 120, 120';sections.value=[];editingGroupId.value='';editingId.value='';selectedTemplateId.value='';templateName.value='';manufacturer.value='';model.value='';rackUnits.value=1;faceColor.value='#263344';groups.value=[];selectedPort.value=null;notice.value='';error.value=''}
function loadSelectedTemplate(){const t=templates.value.find(x=>x.id===selectedTemplateId.value);if(!t)return;editingId.value=t.id;templateName.value=t.name;manufacturer.value=t.manufacturer||'';model.value=t.model||'';rackUnits.value=t.rack_units;faceColor.value=t.face_color;const layout=t.layout;groups.value=structuredClone(Array.isArray(layout)?layout:(layout?.groups||[]));sectionMode.value=!!(!Array.isArray(layout)&&layout?.sectionLayout?.enabled);sectionColumns.value=layout?.sectionLayout?.columns||2;sectionRows.value=layout?.sectionLayout?.rows||4;rowHeightsText.value=(layout?.sectionLayout?.rowHeights||[48,120,120,120]).join(', ');sections.value=structuredClone(layout?.sectionLayout?.sections||[]);if(sectionMode.value)applySectionGrid();editingGroupId.value='';notice.value='Template loaded. Changes are not saved until you click Update template.';error.value=''}
async function saveTemplate(){if(!isAdmin.value||!groups.value.length)return;error.value='';notice.value='';saving.value=true;const payload={name:templateName.value.trim(),manufacturer:manufacturer.value.trim(),model:model.value.trim(),rack_units:rackUnits.value,face_color:faceColor.value,layout:sectionMode.value?{version:2,groups:groups.value,sectionLayout:{enabled:true,columns:sectionColumns.value,rows:sectionRows.value,rowHeights:rowHeights.value,sections:sections.value}}:groups.value};const result=editingId.value?await client.from('switch_templates').update(payload).eq('id',editingId.value).select('id').single():await client.from('switch_templates').insert(payload).select('id').single();if(result.error)error.value=result.error.message;else{editingId.value=result.data.id;selectedTemplateId.value=result.data.id;notice.value='Template saved successfully.';await fetchTemplates()}saving.value=false}
</script>
