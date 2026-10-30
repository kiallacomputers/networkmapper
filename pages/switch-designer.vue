<template>
 <div class="designer-page">
  <div class="designer-heading"><div><h1>Visual Switch Designer</h1><p>Create reusable front-panel layouts with draggable port groups.</p></div><NuxtLink class="btn secondary-btn" to="/switches">Manage switches</NuxtLink></div>
  <p v-if="error" class="danger panel">{{ error }}</p><p v-if="notice" class="success-note">{{ notice }}</p>
  <div class="designer-grid">
   <section class="panel designer-controls">
    <h2>Switch template</h2>
    <label>Template name</label><input v-model="templateName" maxlength="120" placeholder="Core Switch 12 RJ45 + 6 SFP">
    <label>Manufacturer</label><input v-model="manufacturer" maxlength="120" placeholder="e.g. Aruba">
    <label>Model</label><input v-model="model" maxlength="120" placeholder="e.g. 6100">
    <div class="two-fields"><div><label>Rack units</label><select v-model.number="rackUnits"><option v-for="n in 4" :key="n" :value="n">{{ n }}U</option></select></div><div><label>Front panel colour</label><input v-model="faceColor" type="color" class="color-field"></div></div>
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
    <button class="btn" :disabled="!isAdmin" @click="addGroup">Add port group</button>
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
     </div>
    </template>
    <hr><h2>Save and reuse</h2>
    <button class="btn" :disabled="saving || !isAdmin || !groups.length || !templateName.trim()" @click="saveTemplate">{{ saving ? 'Saving…' : editingId ? 'Update template' : 'Save as template' }}</button>
    <button class="small-btn" @click="newTemplate">New blank template</button>
    <label>Load saved template</label><select v-model="selectedTemplateId" @change="loadSelectedTemplate"><option value="">Choose template…</option><option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option></select>
   </section>
   <section class="panel designer-preview">
    <div class="designer-heading"><h2>Front-panel preview</h2><span class="muted">{{ totalPorts }} ports · {{ rackUnits }}U</span></div>
    <p class="muted">{{sectionMode ? "Assign a port group to each section. Click ports to inspect them." : "Drag a port group to reposition it. Click a port to inspect it."}}</p>
    <div class="panel-scroll">
     <div ref="faceRef" class="switch-face" :style="{backgroundColor:faceColor,height:faceHeight+'px'}">
      <div class="rack-screw screw-left"></div><div class="rack-screw screw-right"></div>
      <div v-if="sectionMode" class="section-face-grid" :style="sectionGridStyle">
       <div v-for="(section,i) in sections" :key="section.id" class="face-section" :class="{'face-section-empty':!assignedGroup(section)}">
        <div class="face-section-label">Section {{ i+1 }} <span v-if="assignedGroup(section)">{{assignedGroup(section)?.title}}</span></div>
        <div v-if="assignedGroup(section)" class="section-port-grid" :style="{gridTemplateColumns:`repeat(${Math.min(assignedGroup(section)!.columns,assignedGroup(section)!.count)}, 28px)`}">
         <button v-for="n in assignedGroup(section)!.count" :key="n" type="button" class="face-port" :class="{'fiber-port':assignedGroup(section)!.type!=='RJ45'}" :title="`${assignedGroup(section)!.type} ${assignedGroup(section)!.start+n-1}`" @click="selectedPort={label:String(assignedGroup(section)!.start+n-1),type:assignedGroup(section)!.type,group:assignedGroup(section)!.title}"><span class="port-number">{{assignedGroup(section)!.start+n-1}}</span><span class="port-hole">{{assignedGroup(section)!.type==='RJ45'?'▥':'▭'}}</span></button>
        </div>
        <div v-else class="section-placeholder">Unassigned</div>
       </div>
      </div>
      <div v-if="!sectionMode && !groups.length" class="empty-face">Add a port group to preview the switch</div>
      <div v-for="group in (sectionMode ? [] : groups)" :key="group.id" class="face-group" :style="groupStyle(group)" @pointerdown="startDrag($event,group.id)">
       <div class="face-group-title">{{ group.title }} <span>{{ group.type }}</span></div>
       <div class="port-grid" :style="{gridTemplateColumns:`repeat(${group.columns}, 28px)`}">
        <button v-for="n in group.count" :key="n" type="button" class="face-port" :class="{'fiber-port':group.type!=='RJ45'}" :title="`${group.type} ${group.start+n-1}`" @pointerdown.stop @click="selectedPort={label:String(group.start+n-1),type:group.type,group:group.title}">
         <span class="port-number">{{ group.start+n-1 }}</span><span class="port-hole">{{ group.type==='RJ45'?'▥':'▭' }}</span>
        </button>
       </div>
      </div>
     </div>
    </div>
    <p v-if="selectedPort" class="port-inspector">Selected: <strong>{{ selectedPort.group }}</strong> · {{ selectedPort.type }} port {{ selectedPort.label }}</p>
    <p class="muted">The preview represents the physical face. Port labels, types and positions are saved in the template.</p>
   </section>
  </div>
 </div>
</template>
<script setup lang="ts">
definePageMeta({middleware:'auth'})
type Group={id:string;title:string;type:string;count:number;columns:number;start:number;x:number;y:number}
type Section={id:string;groupId:string}
const client=useSupabaseClient();const {isAdmin,refreshRole}=useAccess()
const templateName=ref(''),manufacturer=ref(''),model=ref(''),rackUnits=ref(1),faceColor=ref('#263344')
const groupTitle=ref('RJ45 ports'),portType=ref('RJ45'),portCount=ref(12),perRow=ref(6),startNumber=ref(1)
const portTypes=['RJ45','SFP','SFP+','SFP28','QSFP','QSFP+','QSFP28','Other']
const sectionMode=ref(false),sectionColumns=ref(2),sectionRows=ref(4),rowHeightsText=ref('48, 120, 120, 120')
const sections=ref<Section[]>([])
const editingGroupId=ref('')
const rowHeights=computed(()=>{const parts=rowHeightsText.value.split(',').map(v=>Number(v.trim()));return Array.from({length:sectionRows.value},(_,i)=>clamp(Number.isFinite(parts[i])&&parts[i]>0?parts[i]:120,36,500))})
const sectionGridStyle=computed(()=>({gridTemplateColumns:`repeat(${sectionColumns.value}, minmax(0, 1fr))`,gridTemplateRows:rowHeights.value.map(n=>n+'px').join(' ')}))
function applySectionGrid(){sectionColumns.value=clamp(Math.floor(Number(sectionColumns.value)||2),1,8);sectionRows.value=clamp(Math.floor(Number(sectionRows.value)||4),1,12);const previous=sections.value;sections.value=Array.from({length:sectionColumns.value*sectionRows.value},(_,i)=>previous[i]||{id:crypto.randomUUID(),groupId:''})}
function assignedGroup(section:Section){return groups.value.find(g=>g.id===section.groupId)}
const groups=ref<Group[]>([]),templates=ref<any[]>([]),editingId=ref(''),selectedTemplateId=ref(''),error=ref(''),notice=ref(''),saving=ref(false),selectedPort=ref<any>(null)
const faceRef=ref<HTMLElement|null>(null);const faceHeight=computed(()=>sectionMode.value?Math.max(160,rowHeights.value.reduce((a,b)=>a+b,0)+32):Math.max(160,rackUnits.value*160));const totalPorts=computed(()=>groups.value.reduce((sum,g)=>sum+g.count,0))
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n))
const groupWidth=(g:Group)=>g.columns*32+16
const groupHeight=(g:Group)=>Math.ceil(g.count/g.columns)*45+33
const groupStyle=(g:Group)=>({left:g.x+'px',top:g.y+'px',width:groupWidth(g)+'px'})
function addGroup(){if(!isAdmin.value)return;const count=clamp(Math.floor(Number(portCount.value)||1),1,96),columns=clamp(Math.floor(Number(perRow.value)||1),1,Math.min(count,24));const x=groups.value.length?Math.min(740,24+groups.value.length*210):24;groups.value.push({id:editingGroupId.value||crypto.randomUUID(),title:groupTitle.value.trim()||portType.value+' ports',type:portType.value,count,columns,start:clamp(Math.floor(Number(startNumber.value)||1),1,999),x,y:24});startNumber.value+=count;editingGroupId.value='';notice.value='';error.value=''}
function editGroup(index:number){const g=groups.value[index];if(!g)return;editingGroupId.value=g.id;groupTitle.value=g.title;portType.value=g.type;portCount.value=g.count;perRow.value=g.columns;startNumber.value=g.start;groups.value.splice(index,1);notice.value='Group loaded into the editor. Change settings and click Add port group.'}
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
