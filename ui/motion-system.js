/* ETHONE Motion System JS
   Small Web Animations API wrapper. Only transform and opacity are animated. */
(function(){
  "use strict";

  const presets={
    fade:{from:{opacity:0},to:{opacity:1}},
    slideUp:{from:{opacity:0,transform:"translate3d(0,8px,0)"},to:{opacity:1,transform:"translate3d(0,0,0)"}},
    slideDown:{from:{opacity:0,transform:"translate3d(0,-8px,0)"},to:{opacity:1,transform:"translate3d(0,0,0)"}},
    slideLeft:{from:{opacity:0,transform:"translate3d(8px,0,0)"},to:{opacity:1,transform:"translate3d(0,0,0)"}},
    slideRight:{from:{opacity:0,transform:"translate3d(-8px,0,0)"},to:{opacity:1,transform:"translate3d(0,0,0)"}},
    scale:{from:{opacity:0,transform:"scale(.975)"},to:{opacity:1,transform:"scale(1)"}},
    pop:{from:{opacity:0,transform:"scale(.96)"},mid:{opacity:1,transform:"scale(1.018)"},to:{opacity:1,transform:"scale(1)"}},
    spring:{from:{opacity:0,transform:"translate3d(0,10px,0) scale(.98)"},mid:{opacity:1,transform:"translate3d(0,-1px,0) scale(1.004)"},to:{opacity:1,transform:"translate3d(0,0,0) scale(1)"}},
    collapse:{from:{opacity:1,transform:"scaleY(1)"},to:{opacity:0,transform:"scaleY(.96)"}},
    expand:{from:{opacity:0,transform:"scaleY(.96)"},to:{opacity:1,transform:"scaleY(1)"}},
    glow:{from:{opacity:.72,transform:"scale(.99)"},mid:{opacity:1,transform:"scale(1.01)"},to:{opacity:.88,transform:"scale(1)"}}
  };

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

  function cssVar(token,fallback){
    return rootStyle().getPropertyValue(token).trim()||fallback;
  }

  function reduced(){
    return window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      duration:ms("--motion-normal",220),
      easing:cssVar("--ease-premium","cubic-bezier(.22,1,.36,1)"),
      fill:"both",
      delay:0,
      reverse:false
    },options||{});
    if(!canAnimate(el)){
      if(opts.applyFinal!==false){
        const frames=framesFor(name,opts.reverse);
        Object.assign(el.style,frames[frames.length-1]);
      }
      return Promise.resolve(null);
    }
    try{
      el.style.willChange="transform, opacity";
      const animation=el.animate(framesFor(name,opts.reverse),{
        duration:opts.duration,
        delay:opts.delay,
        easing:opts.easing,
        fill:opts.fill
      });
      animation.finished.finally(()=>{el.style.willChange="";}).catch(()=>{el.style.willChange="";});
      return animation.finished.then(()=>animation);
    }catch(e){
      return Promise.resolve(null);
    }
  }

  function enter(el,preset,options){
    return animate(el,preset||"slideUp",Object.assign({duration:ms("--motion-normal",220)},options||{}));
  }

  function leave(el,preset,options){
    return animate(el,preset||"fade",Object.assign({duration:ms("--motion-fast",160),reverse:true},options||{}));
  }

  function pop(el,options){
    return animate(el,"pop",Object.assign({duration:ms("--motion-normal",220),easing:cssVar("--ease-pop","cubic-bezier(.18,1.3,.32,1)")},options||{}));
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
    setTimeout(()=>node.remove(),700);
    return node;
  }

  function stagger(nodes,preset,options){
    const list=Array.from(nodes||[]);
    const gap=(options&&options.gap)||35;
    return Promise.all(list.map((node,index)=>enter(node,preset,Object.assign({},options,{duration:(options&&options.duration)||ms("--motion-normal",220),delay:index*gap}))));
  }

  window.ETHONEMotion={
    presets,
    canAnimate,
    animate,
    enter,
    leave,
    pop,
    ripple,
    stagger,
    duration:{
      instant:()=>ms("--motion-instant",80),
      micro:()=>ms("--motion-micro",120),
      fast:()=>ms("--motion-fast",160),
      normal:()=>ms("--motion-normal",220),
      slow:()=>ms("--motion-slow",320)
    },
    easing:{
      standard:()=>cssVar("--ease-standard","cubic-bezier(.2,.75,.2,1)"),
      premium:()=>cssVar("--ease-premium","cubic-bezier(.22,1,.36,1)"),
      spring:()=>cssVar("--ease-spring","cubic-bezier(.16,1.08,.28,1)"),
      pop:()=>cssVar("--ease-pop","cubic-bezier(.18,1.3,.32,1)")
    }
  };
})();
