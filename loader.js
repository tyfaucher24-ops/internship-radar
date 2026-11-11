/* V18 speed: the start page paints first, then the rest of the site's scripts load in their old order.
   Before V18 these were ~31 <script defer> tags that ran before the first paint on a cold phone (LCP 3.4 s). */
(function(){var L=["sync-core.js", "cloud-config.js", "cloud.js", "telemetry.js", "resume.js", "resume-v131.js", "matcher.js", "us-cities.js", "match-core.js", "lists.js", "combo.js", "ticker.js", "v111.js", "tracker.js", "app.js", "intro.js", "onboarding.js", "autopilot-core.js", "autopilot.js", "ap-cal.js", "warmpath-core.js", "warmpath.js", "v133.js", "v14.js", "resume-dict.js", "resume-ui.js", "v144.js", "cloud-ui.js", "save-prompt.js", "email-alerts.js", "founder-stats.js", "ui22.js"];
self.__irLoader=1;
function done(){if(self.__irLoaded)return;self.__irLoaded=1;dispatchEvent(new Event('ir:scripts'))}
function go(){var v=self.BV||'';L.forEach(function(n,i){var s=document.createElement('script');s.src=n+v;s.async=false;if(i===L.length-1){s.onload=done;s.onerror=done}document.body.appendChild(s)})}
if(document.visibilityState==='hidden'){go();return}
function later(){requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(go,0)})})}
/* Start page (intro hero showing): wait until the hero image has loaded and painted. Other views: right after first paint. */
var intro=document.getElementById('intro');
if(intro&&!intro.hidden&&document.readyState!=='complete')addEventListener('load',later,{once:true});else later()})();
