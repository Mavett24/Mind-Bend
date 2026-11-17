/**
 * Splash (D-067): the cursor types the wordmark, blinks once, then the black screen breaks into
 * board tiles that clear in a diagonal sweep to reveal the page. About 1.3s, once per browser
 * session, skipped with reduced motion. Pure CSS (globals.css, "splash"), so it runs off the main
 * thread while the page hydrates, and the server sends it so nothing flashes first.
 * SPLASH_SCRIPT runs in <head> before paint: it hides the splash after the first visit in this
 * session and tells the sweep how many tile rows the screen shows.
 */

const WORD = "mind_bend";
/** When each character lands, in ms. Not evenly spaced: a short hesitation at the underscore reads as typing. */
const TYPED_AT = [120, 165, 210, 250, 330, 375, 415, 460, 500];
export const SPLASH_COLS = 12;
/** Enough rows to cover a tall, narrow phone (12 columns of square tiles). */
const ROWS = 40;

export const SPLASH_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem("mb-splash")){d.dataset.splash="off"}else{sessionStorage.setItem("mb-splash","1");d.style.setProperty("--splash-rows",String(Math.max(1,Math.ceil(innerHeight/(innerWidth/${SPLASH_COLS})))))}}catch(e){}`;

export function Splash() {
  return (
    <div id="splash" aria-hidden>
      <div className="splash-tiles">
        {Array.from({ length: SPLASH_COLS * ROWS }, (_, i) => (
          <span key={i} style={{ "--c": i % SPLASH_COLS, "--r": Math.floor(i / SPLASH_COLS) } as React.CSSProperties} />
        ))}
      </div>
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
