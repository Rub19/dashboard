/* ETHONE V25 — Theme Editor UI. Populates and wires the "Theme" settings tab.
   Accent color / animated background / sidebar layout controls are the
   pre-existing markup (same ids), just relocated here — their handlers
   (pickTheme, applyCustomColor, renderBgThemeBtns, renderSidebarCustomize)
   are untouched. This file only adds the net-new axes. */

function renderThemeEditor(){
  var p=curP();if(!p)return;
  var theme=getTheme();

  // Reuse existing renderers for the axes that already had a home.
  if(typeof renderThemeSwatches==='function')renderThemeSwatches();
  if(typeof renderBgThemeBtns==='function')renderBgThemeBtns();
  if(typeof renderSidebarCustomize==='function')renderSidebarCustomize();

  // Sidebar width + compact.
  var w=window.ethoneSidebarResize?window.ethoneSidebarResize.currentWidth():240;
  var widthInput=document.getElementById('theme-sidebar-width');
  if(widthInput)widthInput.value=w;
  setText('theme-sidebar-width-val',w+'px');
  var compactToggle=document.getElementById('theme-compact-toggle');
  if(compactToggle)compactToggle.checked=!!p.sidebarCompact;

  // Continuous sliders.
  setSliderAndLabel('theme-radius','theme-radius-val',theme.radius);
  setSliderAndLabel('theme-blur','theme-blur-val',theme.blur);
  setSliderAndLabel('theme-glow','theme-glow-val',theme.glow);
  setSliderAndLabel('theme-opacity','theme-opacity-val',theme.opacity);
  setSliderAndLabel('theme-fontscale','theme-fontscale-val',theme.fontScale);

  // Segmented (discrete) pickers.
  setSegmentedActive('theme-motion-seg',String(theme.motion));
  setSegmentedActive('theme-density-seg',theme.density);
  setSegmentedActive('theme-font-seg',theme.fontFamily);
}

function setText(id,text){
  var el=document.getElementById(id);
  if(el)el.textContent=text;
}
function setSliderAndLabel(sliderId,labelId,value){
  var slider=document.getElementById(sliderId);
  if(slider)slider.value=Math.round(value*100);
  setText(labelId,Math.round(value*100)+'%');
}
function setSegmentedActive(groupId,value){
  var group=document.getElementById(groupId);
  if(!group)return;
  group.querySelectorAll('button').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.val===value);
  });
}

function onThemeSlider(key,value,label){
  setThemeField(key,value);
  setText('theme-'+(key==='fontScale'?'fontscale':key)+'-val',label);
}
function onThemeSegmented(key,value,btnEl){
  setThemeField(key,value);
  setSegmentedActive(btnEl.parentElement.id,String(value));
}
function onThemeSidebarWidth(value){
  var w=parseInt(value,10);
  if(window.ethoneSidebarResize)window.ethoneSidebarResize.setWidth(w);
  if(typeof setThemeField==='function')setThemeField('sidebarWidth',w);
  setText('theme-sidebar-width-val',w+'px');
}
function onThemeCompactToggle(checked){
  var p=curP();if(!p)return;
  if(!!p.sidebarCompact!==!!checked)toggleSidebarCompact();
}
