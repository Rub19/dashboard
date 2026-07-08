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
DB_TEMPLATES.push(
  {id:"valorant_accounts",label:"Comptes Valorant",icon:"VA",color:"#ef4444",build:function(){
    var rankOpts=[{value:"iron",label:"Iron",color:"#7a7a82"},{value:"gold",label:"Gold",color:"#f59e0b"},{value:"diamond",label:"Diamond",color:"#60a5fa"},{value:"immortal",label:"Immortal",color:"#ef4444"},{value:"radiant",label:"Radiant",color:"#f4e389"}];
    var statusOpts=[{value:"active",label:"Actif",color:"#34d399"},{value:"warmup",label:"Warmup",color:"#8b5cf6"},{value:"paused",label:"Pause",color:"#7a7a82"}];
    return {columns:[{key:"title",label:"Compte",type:"text",width:220,primary:true},{key:"riotId",label:"Riot ID",type:"text",width:160},{key:"rank",label:"Rank",type:"select",width:130,options:rankOpts},{key:"status",label:"Statut",type:"status",width:130,options:statusOpts},{key:"progress",label:"Progression",type:"progress",width:140},{key:"lastPlayed",label:"Derniere session",type:"date",width:140}],rows:[]};
  }},
  {id:"clients",label:"Clients",icon:"CL",color:"#8b5cf6",build:function(){
    var stage=[{value:"lead",label:"Lead",color:"#7a7a82"},{value:"call",label:"Call",color:"#60a5fa"},{value:"proposal",label:"Proposal",color:"#f59e0b"},{value:"won",label:"Won",color:"#34d399"}];
    return {columns:[{key:"title",label:"Client",type:"text",width:220,primary:true},{key:"email",label:"Email",type:"email",width:210},{key:"phone",label:"Telephone",type:"phone",width:150},{key:"website",label:"Site",type:"url",width:180},{key:"owner",label:"Owner",type:"user",width:150},{key:"stage",label:"Statut",type:"status",width:140,options:stage}],rows:[]};
  }},
  {id:"servers",label:"Serveurs",icon:"SV",color:"#34d399",build:function(){
    var status=[{value:"online",label:"Online",color:"#34d399"},{value:"warning",label:"Warning",color:"#f59e0b"},{value:"down",label:"Down",color:"#ef4444"}];
    return {columns:[{key:"title",label:"Serveur",type:"text",width:220,primary:true},{key:"url",label:"URL",type:"url",width:220},{key:"status",label:"Statut",type:"status",width:130,options:status},{key:"cpu",label:"CPU",type:"progress",width:120},{key:"ram",label:"RAM",type:"progress",width:120},{key:"region",label:"Region",type:"dropdown",width:130,options:[{value:"eu",label:"EU",color:"#8b5cf6"},{value:"us",label:"US",color:"#60a5fa"}]}],rows:[]};
  }},
  {id:"passwords",label:"Passwords",icon:"PW",color:"#f59e0b",build:function(){
    return {columns:[{key:"title",label:"Service",type:"text",width:220,primary:true},{key:"login",label:"Identifiant",type:"email",width:220},{key:"url",label:"URL",type:"url",width:220},{key:"strength",label:"Securite",type:"progress",width:130},{key:"mfa",label:"2FA",type:"checkbox",width:80},{key:"recovery",label:"Fichier recovery",type:"file",width:180}],rows:[]};
  }},
  {id:"movies",label:"Films",icon:"MV",color:"#f472b6",build:function(){
    var status=[{value:"watchlist",label:"A voir",color:"#7a7a82"},{value:"watching",label:"En cours",color:"#8b5cf6"},{value:"seen",label:"Vu",color:"#34d399"}];
    return {columns:[{key:"title",label:"Film",type:"text",width:240,primary:true},{key:"poster",label:"Poster",type:"image",width:100},{key:"status",label:"Statut",type:"status",width:120,options:status},{key:"rating",label:"Note",type:"rating",width:120,maxStars:5},{key:"release",label:"Sortie",type:"date",width:120},{key:"tags",label:"Tags",type:"tags",width:180}],rows:[]};
  }},
  {id:"books",label:"Livres",icon:"BK",color:"#f4e389",build:function(){
    var status=[{value:"wishlist",label:"A lire",color:"#7a7a82"},{value:"reading",label:"Lecture",color:"#8b5cf6"},{value:"done",label:"Termine",color:"#34d399"}];
    return {columns:[{key:"title",label:"Livre",type:"text",width:240,primary:true},{key:"author",label:"Auteur",type:"text",width:180},{key:"status",label:"Statut",type:"status",width:130,options:status},{key:"progress",label:"Progression",type:"progress",width:140},{key:"cover",label:"Cover",type:"image",width:100},{key:"tags",label:"Tags",type:"tags",width:180}],rows:[]};
  }}
);
function dbTemplateById(id){return DB_TEMPLATES.find(function(tpl){return tpl.id===id;})||null;}
