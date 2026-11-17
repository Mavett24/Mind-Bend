/**
 * Splash (D-067): the cursor blinks, types the wordmark, blinks again, then the black screen breaks
 * into board tiles that clear in a slow diagonal sweep to reveal the page. About 2.8s, once per
 * browser session, skipped with reduced motion. Pure CSS (globals.css, "splash"), so it runs off the
 * main thread while the page hydrates, and the server sends it so nothing flashes first.
 *
 * SPLASH_HEAD_SCRIPT runs in <head> before paint and hides the splash after the first visit in the
 * session. TILES_SCRIPT runs right after the tile container is parsed and fills it with tiles of about
 * 76px for this screen (6 to 24 columns), so a phone and a wide monitor both get a board, not slabs.
 */

const WORD = "mind_bend";
/**
 * When each character lands, in ms. Unevenly spaced, like a person typing: steady through "mind",
 * a hesitation before the underscore, then "bend" a little quicker.
 */
const TYPED_AT = [420, 520, 610, 700, 900, 990, 1070, 1150, 1240];

export const SPLASH_HEAD_SCRIPT = `try{if(sessionStorage.getItem("mb-splash"))document.documentElement.dataset.splash="off";else sessionStorage.setItem("mb-splash","1")}catch(e){}`;

const TILES_SCRIPT = `(function(){try{
var d=document.documentElement;if(d.dataset.splash==="off"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var el=document.getElementById("splash-tiles");if(!el)return;
var w=innerWidth,h=innerHeight,cols=Math.max(6,Math.min(24,Math.round(w/76))),size=w/cols,rows=Math.ceil(h/size),html="";
for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)html+='<span style="--c:'+c+';--r:'+r+'"></span>';
el.style.setProperty("--cols",cols);el.style.setProperty("--rows",rows);el.style.setProperty("--size",size+"px");el.innerHTML=html;
}catch(e){}})();`;

export function Splash() {
  return (
    <div id="splash" aria-hidden>
      <div className="splash-bg" />
      {/* Filled by TILES_SCRIPT before first paint; React leaves its contents alone. */}
      <div id="splash-tiles" className="splash-tiles" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      <script dangerouslySetInnerHTML={{ __html: TILES_SCRIPT }} />
      <div className="splash-mark">
        {WORD.split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: `${TYPED_AT[i]}ms` }}>
            {ch}
          </span>
        ))}
        <i className="splash-cursor" />
      </div>
    </div>
  );
}
