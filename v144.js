/* V14.4: tutorial removed (clear its old keys), "Why this grade?" links on cards and in the detail panel open the
   Honest feedback page for that posting. */
(function(){
try{['ir_tour_done','tour_done','ir_tour'].forEach(k=>{localStorage.removeItem(k)});Object.keys(localStorage).filter(k=>/^ir_tour/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
document.getElementById('tour')?.remove();document.getElementById('uiTour')?.remove();
window.FB_FOR=null;
function openFor(id){window.FB_FOR=id||null;try{if(!document.getElementById('drawer')?.hidden)closeDrawer()}catch(_){}go('feedback')}
window.openFeedbackFor=openFor;
document.addEventListener('click',e=>{const a=e.target.closest('[data-why]');if(a){e.preventDefault();e.stopPropagation();openFor(a.dataset.why==='__cur'?window.__fbCur:a.dataset.why);return}
 const n=e.target.closest('.nav [data-go="feedback"],#fbNudge,#fbLink');if(n)window.FB_FOR=null},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest&&e.target.closest('[data-why]'))e.stopPropagation()},true);
if(typeof openDrawer==='function'){const _o=openDrawer;openDrawer=function(x){window.__fbCur=x&&x.id;return _o.apply(this,arguments)}}
if(typeof fbPanel==='function'){const _f=fbPanel;fbPanel=function(d){const h=_f(d);if(!d||d.pct==null)return h;return h+'<p class="why-d"><a href="#feedback" class="why-g" data-why="__cur">Why this grade? See your full feedback for this posting</a></p>'}}
})();
