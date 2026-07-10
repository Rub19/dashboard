/* ETHONE Motion System JS
   Small Web Animations API wrapper. Only transform and opacity are animated. */
(function(){
  "use strict";

  const presets={
    fade:{from:{opacity:0},to:{opacity:1}},
    slideUp:{from:{opacity:0,transform:"translate3d(0,6px,0) scale(.992)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    slideDown:{from:{opacity:0,transform:"translate3d(0,-6px,0) scale(.992)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    slideLeft:{from:{opacity:0,transform:"translate3d(8px,0,0) scale(.996)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    slideRight:{from:{opacity:0,transform:"translate3d(-8px,0,0) scale(.996)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    scale:{from:{opacity:0,transform:"translate3d(0,6px,0) scale(.982)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    pop:{from:{opacity:0,transform:"scale(.982)"},to:{opacity:1,transform:"scale(1)"}},
    spring:{from:{opacity:0,transform:"translate3d(0,8px,0) scale(.986)"},mid:{opacity:1,transform:"translate3d(0,-1px,0) scale(1.002)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    collapse:{from:{opacity:1,transform:"scaleY(1)"},to:{opacity:0,transform:"scaleY(.96)"}},
    expand:{from:{opacity:0,transform:"scaleY(.96)"},to:{opacity:1,transform:"scaleY(1)"}},
    glow:{from:{opacity:.78,transform:"scale(.996)"},mid:{opacity:1,transform:"scale(1.004)"},to:{opacity:.9,transform:"scale(1)"}},
    blur:{from:{opacity:0,transform:"translate3d(0,4px,0) scale(.996)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    elevation:{from:{opacity:1,transform:"translate3d(0,0,0) scale(1)"},to:{opacity:1,transform:"translate3d(0,-1px,0) scale(1.006)"}},
    hover:{from:{opacity:1,transform:"translate3d(0,0,0) scale(1)"},to:{opacity:1,transform:"translate3d(0,-1px,0) scale(1.006)"}},
    press:{from:{opacity:1,transform:"translate3d(0,0,0) scale(1)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(.986)"}},
    focus:{from:{opacity:.96,transform:"scale(.998)"},to:{opacity:1,transform:"scale(1)"}}
  };

  const promotionTimers=new WeakMap();
  const promotionSelector=[
    "button","a[href]","input","textarea","select","summary",
    "[role='button']","[role='tab']","[role='menuitem']","[role='switch']",
    "[onclick]","[data-action]","[data-route]","[data-page]",
    "[class*='btn']","[class*='button']","[class*='card']","[class*='panel']",
    "[class*='widget']","[class*='modal']","[class*='dropdown']","[class*='menu']",
    "[class*='tooltip']","[class*='toast']","[class*='notif']","[class*='sidebar']",
    "[class*='nav']","[class*='tab']","[class*='motion-']"
  ].join(",");

  function rootStyle(){
    return getComputedStyle(document.documentElement);
  }

  function ms(token,fallback){
    const raw=rootStyle().getPropertyValue(token).trim();
    if(raw.endsWith("ms"))return Number(raw.replace("ms",""))||fallback;
    if(raw.endsWith("s"))return (Number(raw.replace("s",""))||0)*1000||fallback;
    const calcMs=raw.match(/calc\(([\d.]+)ms\s*\*\s*([\d.]+)\)/);
    if(calcMs)return (Number(calcMs[1])||fallback)*(Number(calcMs[2])||1);
    return fallback;
  }

  function canonicalDuration(){
    return Math.max(1,ms("--motion-duration",180));
  }

  function canonicalEasing(){
    return cssVar("--motion-ease","cubic-bezier(.2,.8,.2,1)");
  }

  function capDuration(){
    return canonicalDuration();
  }

  function cssVar(token,fallback){
    return rootStyle().getPropertyValue(token).trim()||fallback;
  }

  function reduced(){
    return window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function activateMotion(el){
    if(!el||!el.classList||reduced())return;
    const timer=promotionTimers.get(el);
    if(timer)window.clearTimeout(timer);
    promotionTimers.delete(el);
    el.classList.add("ethone-motion-active");
  }

  function releaseMotion(el,immediate){
    if(!el||!el.classList)return;
    const timer=promotionTimers.get(el);
    if(timer)window.clearTimeout(timer);
    const remove=()=>{
      promotionTimers.delete(el);
      el.classList.remove("ethone-motion-active");
    };
    if(immediate){remove();return;}
    promotionTimers.set(el,window.setTimeout(remove,canonicalDuration()+34));
  }

  function closestMotionTarget(node){
    return node&&typeof node.closest==="function"?node.closest(promotionSelector):null;
  }

  function installPromotionLifecycle(){
    const root=document.documentElement;
    if(!root||root.dataset.motionLifecycleBound==="1")return;
    root.dataset.motionLifecycleBound="1";
    root.classList.add("ethone-motion-optimized");

    const startEvent=event=>activateMotion(event.target);
    const endEvent=event=>releaseMotion(event.target,true);
    ["transitionrun","animationstart"].forEach(type=>document.addEventListener(type,startEvent,true));
    ["transitionend","transitioncancel","animationend","animationcancel"].forEach(type=>document.addEventListener(type,endEvent,true));

    document.addEventListener("pointerover",event=>{
      const el=closestMotionTarget(event.target);
      if(!el||event.relatedTarget&&el.contains(event.relatedTarget))return;
      activateMotion(el);
    },{capture:true,passive:true});
    document.addEventListener("pointerout",event=>{
      const el=closestMotionTarget(event.target);
      if(!el||event.relatedTarget&&el.contains(event.relatedTarget))return;
      releaseMotion(el,false);
    },{capture:true,passive:true});
    document.addEventListener("focusin",event=>activateMotion(closestMotionTarget(event.target)),true);
    document.addEventListener("focusout",event=>releaseMotion(closestMotionTarget(event.target),false),true);
  }

  function canAnimate(el){
    return !!(el&&el.animate&&!reduced()&&Number(cssVar("--theme-motion-scale","1"))>0.05);
  }

  function framesFor(name,reverse){
    const p=presets[name]||presets.fade;
    const frames=p.mid?[p.from,p.mid,p.to]:[p.from,p.to];
    return reverse?frames.slice().reverse():frames;
  }

  function animate(el,name,options){
    if(!el)return Promise.resolve(null);
    const opts=Object.assign({
      duration:canonicalDuration(),
      easing:canonicalEasing(),
      fill:"both",
      delay:0,
      reverse:false
    },options||{});
    opts.duration=capDuration();
    opts.easing=canonicalEasing();
    opts.delay=0;
    if(!canAnimate(el)){
      if(opts.applyFinal!==false){
        const frames=framesFor(name,opts.reverse);
        Object.assign(el.style,frames[frames.length-1]);
      }
      return Promise.resolve(null);
    }
    try{
      activateMotion(el);
      const animation=el.animate(framesFor(name,opts.reverse),{
        duration:opts.duration,
        delay:opts.delay,
        easing:opts.easing,
        fill:opts.fill
      });
      return animation.finished.then(()=>{
        releaseMotion(el,true);
        return animation;
      },()=>{
        releaseMotion(el,true);
        return null;
      });
    }catch(e){
      releaseMotion(el,true);
      return Promise.resolve(null);
    }
  }

  function enter(el,preset,options){
    return animate(el,preset||"slideUp",Object.assign({duration:ms("--motion-normal",200)},options||{}));
  }

  function leave(el,preset,options){
    return animate(el,preset||"fade",Object.assign({duration:ms("--motion-fast",150),reverse:true},options||{}));
  }

  function pop(el,options){
    return animate(el,"pop",Object.assign({duration:ms("--motion-fast",140),easing:cssVar("--ease-pop","cubic-bezier(.18,1.02,.26,1)")},options||{}));
  }

  function blur(el,options){
    return animate(el,"blur",Object.assign({duration:ms("--motion-duration-blur",190)},options||{}));
  }

  function elevate(el,options){
    return animate(el,"elevation",Object.assign({duration:ms("--motion-duration-elevation",190)},options||{}));
  }

  function hover(el,options){
    return animate(el,"hover",Object.assign({duration:ms("--motion-duration-hover",140)},options||{}));
  }

  function press(el,options){
    return animate(el,"press",Object.assign({duration:ms("--motion-duration-press",90),easing:cssVar("--motion-ease-press","cubic-bezier(.2,.8,.2,1)")},options||{}));
  }

  function focus(el,options){
    return animate(el,"focus",Object.assign({duration:ms("--motion-duration-focus",140)},options||{}));
  }

  function ripple(target,event){
    if(!target||target.disabled||reduced())return null;
    const rect=target.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    const size=Math.max(rect.width,rect.height)*1.7;
    const x=event?event.clientX-rect.left:rect.width/2;
    const y=event?event.clientY-rect.top:rect.height/2;
    const node=document.createElement("span");
    node.className="motion-ripple press-ripple";
    node.style.width=size+"px";
    node.style.height=size+"px";
    node.style.left=x+"px";
    node.style.top=y+"px";
    const cs=getComputedStyle(target);
    if(cs.position==="static")target.style.position="relative";
    if(cs.overflow==="visible")target.style.overflow="hidden";
    target.appendChild(node);
    node.addEventListener("animationend",()=>node.remove(),{once:true});
    setTimeout(()=>node.remove(),canonicalDuration()+80);
    return node;
  }

  function stagger(nodes,preset,options){
    const list=Array.from(nodes||[]);
    return Promise.all(list.map(node=>enter(node,preset,Object.assign({},options,{duration:canonicalDuration(),delay:0}))));
  }

  installPromotionLifecycle();

  window.ETHONEMotion={
    version:"6.1",
    presets,
    canAnimate,
    animate,
    enter,
    leave,
    pop,
    blur,
    elevate,
    hover,
    press,
    focus,
    ripple,
    stagger,
    activate:activateMotion,
    release:releaseMotion,
    duration:{
      instant:canonicalDuration,
      micro:canonicalDuration,
      fast:canonicalDuration,
      normal:canonicalDuration,
      slow:canonicalDuration,
      fade:canonicalDuration,
      slide:canonicalDuration,
      scale:canonicalDuration,
      blur:canonicalDuration,
      elevation:canonicalDuration,
      hover:canonicalDuration,
      press:canonicalDuration,
      focus:canonicalDuration,
      max:canonicalDuration
    },
    easing:{
      standard:canonicalEasing,
      premium:canonicalEasing,
      spring:canonicalEasing,
      pop:canonicalEasing
    }
  };
})();
