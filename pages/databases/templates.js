/* ETHONE Database Builder — starter templates (Blank + 5 pre-built schemas). */

var DB_TEMPLATES=[
  {id:"blank",label:"Vide",icon:"📋",color:"#8b5cf6",build:function(){
    return {columns:[{key:"title",label:"Nom",type:"text",width:240,primary:true}],rows:[]};
  }},
  {id:"tasks",label:"Tâches",icon:"✅",color:"#34d399",build:function(){
    var statusOpts=[{value:"todo",label:"À faire",color:"#7a7a82"},{value:"doing",label:"En cours",color:"#60a5fa"},{value:"done",label:"Terminé",color:"#34d399"}];
    var prioOpts=[{value:"low",label:"Basse",color:"#7a7a82"},{value:"medium",label:"Moyenne",color:"#f59e0b"},{value:"high",label:"Haute",color:"#ef4444"}];
    return {
      columns:[
        {key:"title",label:"Tâche",type:"text",width:260,primary:true},
        {key:"status",label:"Statut",type:"select",width:130,options:statusOpts},
        {key:"priority",label:"Priorité",type:"select",width:120,options:prioOpts},
        {key:"dueDate",label:"Échéance",type:"date",width:130},
        {key:"done",label:"Fait",type:"checkbox",width:70}
      ],
      rows:[]
    };
  }},
  {id:"crm",label:"CRM / Contacts",icon:"💼",color:"#60a5fa",build:function(){
    var stageOpts=[{value:"lead",label:"Prospect",color:"#7a7a82"},{value:"contacted",label:"Contacté",color:"#60a5fa"},{value:"negotiation",label:"Négociation",color:"#f59e0b"},{value:"won",label:"Gagné",color:"#34d399"},{value:"lost",label:"Perdu",color:"#ef4444"}];
    return {
      columns:[
        {key:"title",label:"Contact",type:"text",width:220,primary:true},
        {key:"company",label:"Société",type:"text",width:180},
        {key:"email",label:"Email",type:"email",width:200},
        {key:"stage",label:"Étape",type:"select",width:140,options:stageOpts},
        {key:"value",label:"Valeur (€)",type:"genericNumber",width:120}
      ],
      rows:[]
    };
  }},
  {id:"inventory",label:"Inventaire",icon:"📦",color:"#f59e0b",build:function(){
    return {
      columns:[
        {key:"title",label:"Article",type:"text",width:220,primary:true},
        {key:"sku",label:"SKU",type:"text",width:120},
        {key:"qty",label:"Quantité",type:"genericNumber",width:100},
        {key:"location",label:"Emplacement",type:"text",width:150},
        {key:"image",label:"Photo",type:"image",width:90},
        {key:"lowStock",label:"Stock bas",type:"checkbox",width:100}
      ],
      rows:[]
    };
  }},
  {id:"content",label:"Calendrier de contenu",icon:"🗓️",color:"#f472b6",build:function(){
    var platformOpts=[{value:"instagram",label:"Instagram",color:"#f472b6"},{value:"tiktok",label:"TikTok",color:"#7a7a82"},{value:"youtube",label:"YouTube",color:"#ef4444"},{value:"x",label:"X",color:"#60a5fa"}];
    var statusOpts=[{value:"idea",label:"Idée",color:"#7a7a82"},{value:"writing",label:"Rédaction",color:"#f59e0b"},{value:"scheduled",label:"Planifié",color:"#60a5fa"},{value:"published",label:"Publié",color:"#34d399"}];
    return {
      columns:[
        {key:"title",label:"Titre",type:"text",width:240,primary:true},
        {key:"platform",label:"Plateforme",type:"select",width:130,options:platformOpts},
        {key:"publishDate",label:"Date de publication",type:"date",width:150},
        {key:"status",label:"Statut",type:"select",width:130,options:statusOpts},
        {key:"tags",label:"Tags",type:"tags",width:160}
      ],
      rows:[]
    };
  }},
  {id:"project",label:"Suivi de projet",icon:"📈",color:"#c084fc",build:function(){
    var statusOpts=[{value:"notstarted",label:"Pas commencé",color:"#7a7a82"},{value:"inprogress",label:"En cours",color:"#60a5fa"},{value:"done",label:"Terminé",color:"#34d399"},{value:"blocked",label:"Bloqué",color:"#ef4444"}];
    return {
      columns:[
        {key:"title",label:"Tâche",type:"text",width:240,primary:true},
        {key:"owner",label:"Responsable",type:"text",width:150},
        {key:"start",label:"Début",type:"date",width:120},
        {key:"end",label:"Fin",type:"date",width:120},
        {key:"progress",label:"Avancement",type:"progress",width:140},
        {key:"status",label:"Statut",type:"select",width:140,options:statusOpts}
      ],
      rows:[]
    };
  }}
];
function dbTemplateById(id){return DB_TEMPLATES.find(function(tpl){return tpl.id===id;})||null;}
