/** Starter model library. Always confirm slot and module inventory against the device. */
export type PortKind='RJ45'|'SFP'|'SFP+'|'SFP28'|'QSFP'|'QSFP+'|'QSFP28'|'Other'
export type ConfiguredSlot={label:string;moduleId:string;customType:PortKind;customCount:number}
export const moduleOptions=[
 {id:'rj24',label:'24 × RJ45 (generic)',type:'RJ45',count:24},
 {id:'rj48',label:'48 × RJ45 (generic)',type:'RJ45',count:48},
 {id:'sfp8',label:'8 × SFP (generic)',type:'SFP',count:8},
 {id:'sfp24',label:'24 × SFP (generic)',type:'SFP',count:24},
 {id:'sfpplus8',label:'8 × SFP+ (generic)',type:'SFP+',count:8},
 {id:'qsfp4',label:'4 × QSFP+ (generic)',type:'QSFP+',count:4},
 {id:'custom',label:'Custom module — enter type/count',type:'RJ45',count:0}
] as const
export const deviceCatalog=[
 {id:'aruba-5406r',manufacturer:'Aruba / HPE',model:'5406R zl2',partNumber:'J9821A',rackUnits:4,slots:6,columns:2,management:true,notes:'Modular chassis starter profile. Choose the actual installed line cards. The listed module choices are generic and are not a compatibility guarantee.',source:'https://www.hpe.com/psnow/'},
 {id:'aruba-5412r',manufacturer:'Aruba / HPE',model:'5412R zl2',partNumber:'J9822A',rackUnits:7,slots:12,columns:2,management:true,notes:'Modular chassis starter profile. Confirm the exact chassis revision and installed modules.',source:'https://www.hpe.com/psnow/'},
 {id:'generic-1u',manufacturer:'Generic',model:'Fixed 1U switch',partNumber:'CUSTOM-1U',rackUnits:1,slots:1,columns:1,management:false,notes:'Customisable fixed-port chassis; choose a generic port configuration.',source:''},
 {id:'generic-2u',manufacturer:'Generic',model:'Modular 2U switch',partNumber:'CUSTOM-2U',rackUnits:2,slots:4,columns:2,management:false,notes:'Customisable chassis with four module positions.',source:''}
]
