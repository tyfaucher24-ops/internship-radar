"""V12.1: Chrome performance trace of scrolling the Find list (all listings loaded), against any BASE (default LIVE).
Scrolls with real wheel gestures (CDP Input.synthesizeScrollGesture) while recording a devtools.timeline trace.
Reports fps (rAF frames / s), dropped frames (>20ms), long tasks (>50ms main-thread RunTask) and max task.
Usage: python3 ops/perf/scroll_trace.py [BASE] [label]"""
import sys,json,time
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/'
LBL=sys.argv[2] if len(sys.argv)>2 else 'run'
CPU=float(sys.argv[3]) if len(sys.argv)>3 else 4  # CPU throttle (4x = mid-range laptop)
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
res={}
with sync_playwright() as p:
    b=p.chromium.launch(args=['--enable-gpu-rasterization','--disable-frame-rate-limit'] [:1])
    for mode in ('noprofile','graded'):
        pg=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900})
        pg.goto(B);pg.evaluate("p=>{localStorage.clear();if(p)localStorage.setItem('idr_profile',JSON.stringify(p))}",TY if mode=='graded' else None);pg.reload();pg.click('#goFind')
        pg.wait_for_selector('.card'+(' .mbadge' if mode=='graded' else ''),timeout=60000);pg.wait_for_timeout(3000)
        n=pg.evaluate("(typeof D!=='undefined'?D.length:0)")
        cdp=pg.context.new_cdp_session(pg)
        pg.evaluate("""()=>{window.__f=[];window.__lt=[];new PerformanceObserver(l=>{for(const e of l.getEntries())__lt.push(e.duration)}).observe({type:'longtask'});let last=performance.now();const t=n=>{__f.push(n-last);last=n;if(!window.__stop)requestAnimationFrame(t)};requestAnimationFrame(t)}""")
        cdp.send('Emulation.setCPUThrottlingRate',{'rate':CPU})
        ev=[]
        cdp.on('Tracing.dataCollected',lambda m:ev.extend(m['value']))
        cdp.send('Tracing.start',{'categories':'devtools.timeline,disabled-by-default-devtools.timeline.frame,toplevel','transferMode':'ReportEvents'})
        t0=time.time()
        for i in range(3):
            cdp.send('Input.synthesizeScrollGesture',{'x':700,'y':500,'yDistance':-6000,'speed':2400,'gestureSourceType':'mouse'})
            cdp.send('Input.synthesizeScrollGesture',{'x':700,'y':500,'yDistance':3000,'speed':2400,'gestureSourceType':'mouse'})
        dur=time.time()-t0
        done={'v':False}
        cdp.on('Tracing.tracingComplete',lambda m:done.update(v=True))
        cdp.send('Tracing.end')
        while not done['v']:pg.wait_for_timeout(100)
        f=pg.evaluate("()=>{window.__stop=1;return __f.slice(2)}");lt=pg.evaluate("__lt")
        main=[e for e in ev if e.get('name') in ('RunTask','ThreadControllerImpl::RunTask') and e.get('ph')=='X' and e.get('dur')]
        # main thread = the renderer thread with most RunTask time
        by={}
        for e in main:by.setdefault((e['pid'],e['tid']),[]).append(e['dur']/1000)
        thr=max(by.values(),key=sum) if by else []
        longs=[d for d in thr if d>50]
        fps=len(f)/(sum(f)/1000) if f else 0
        r={'cpu_throttle':CPU,'listings':n,'scroll_s':round(dur,2),'frames':len(f),'fps':round(fps,1),'p95_frame_ms':round(sorted(f)[int(len(f)*.95)],1) if f else None,'dropped_gt20ms':sum(1 for x in f if x>20),'max_frame_ms':round(max(f),1) if f else None,
           'trace_long_tasks_gt50ms':len(longs),'trace_max_task_ms':round(max(thr),1) if thr else None,'longtask_api':len(lt),'longtask_api_max':round(max(lt),1) if lt else 0}
        res[mode]=r;print(LBL,mode,json.dumps(r))
        json.dump(ev,open(f'ops/perf/{LBL}-{mode}.trace.json','w'))
        pg.close()
json.dump(res,open(f'ops/perf/{LBL}.json','w'),indent=1)
