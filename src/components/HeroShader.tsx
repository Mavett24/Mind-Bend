"use client";

/**
 * The hero's backdrop (D-075): a slow, dark flow field in the deep colour of the card on top of the
 * deck, pooled around the deck and fading into the page. One WebGL quad, drawn at half resolution
 * and about 30fps, paused when off screen or in a hidden tab. Dithered so the dark gradients don't
 * band. Under reduced motion it draws one still frame (and redraws when the colour changes). Without
 * WebGL it falls back to a plain radial in the same colour.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import type { GameId } from "@/games/registry";

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision mediump float;
#define INTENSITY 1.35
uniform vec2 u_res;uniform float u_time;uniform vec3 u_a;uniform vec3 u_b;uniform vec2 u_center;uniform vec2 u_mouse;uniform float u_mobile;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(gl_FragCoord.xy-u_center*u_res)/u_res.y;
  p+=u_mouse*.05;
  float t=u_time*.03;
  vec2 q=vec2(fbm(p*1.5+t),fbm(p*1.5+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p*1.3+2.*q+vec2(1.7,9.2)+t*.6),fbm(p*1.3+2.*q+vec2(8.3,2.8)-t*.4));
  float f=fbm(p*1.1+2.2*r);
  float d=length(p*vec2(mix(.8,1.1,u_mobile),1.));
  float pool=smoothstep(mix(1.45,1.05,u_mobile),.0,d);
  pool*=pool;
  vec3 col=mix(u_b,u_a,smoothstep(.25,.8,f));
  // soft veins where the flow folds, a little lighter than the colour itself
  float vein=smoothstep(.6,.78,f)*(1.-smoothstep(.8,.96,f));
  col=col*(.55+1.3*f*f)+u_a*vein*.8;
  col*=pool*INTENSITY;
  col*=smoothstep(.0,.3,uv.y);
  col+=(hash(gl_FragCoord.xy+fract(u_time))-.5)*(2./255.);
  gl_FragColor=vec4(max(col,0.),1.);
}`;

/** Draw at this share of CSS pixels: the field is soft, so half resolution costs nothing visible. */
const SCALE = 0.5;
const FRAME_MS = 1000 / 30;
const FADE_MS = 1100;

function cssColour(name: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace("#", "");
  if (hex.length !== 6) return [0, 0, 0];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

interface Props {
  game: GameId;
  /** The element the colour pools around (the deck). */
  anchor: RefObject<HTMLElement | null>;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  reduced: boolean;
}

export function HeroShader({ game, anchor, mx, my, reduced }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  // Colours ease from the last card's to the new card's.
  const colour = useRef({ from: [[0, 0, 0], [0, 0, 0]], to: [[0, 0, 0], [0, 0, 0]], at: -FADE_MS, first: true });
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    const c = colour.current;
    const next = [cssColour(`--color-deep-${game}`), cssColour(`--color-deeper-${game}`)];
    const t = performance.now();
    const k = c.first ? 1 : Math.min(1, (t - c.at) / FADE_MS);
    // Start from wherever the blend is now, so a quick switch never jumps.
    c.from = c.first ? next : c.from.map((v, i) => v.map((x, j) => x + (c.to[i][j] - x) * ease(k)));
    c.to = next;
    c.at = c.first ? -FADE_MS : t;
    c.first = false;
    redraw.current();
  }, [game]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFailed(true);
      return;
    }
    const prog = link(gl);
    if (!prog) {
      setFailed(true);
      return;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { res: u("u_res"), time: u("u_time"), a: u("u_a"), b: u("u_b"), center: u("u_center"), mouse: u("u_mouse"), mobile: u("u_mobile") };

    let w = 0;
    let h = 0;
    let center: [number, number] = [0.7, 0.5];
    const measure = () => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * SCALE));
      h = Math.max(1, Math.round(r.height * SCALE));
      el.width = w;
      el.height = h;
      const a = anchor.current?.getBoundingClientRect();
      // gl_FragCoord runs bottom up.
      if (a) center = [(a.left + a.width / 2 - r.left) / r.width, 1 - (a.top + a.height / 2 - r.top) / r.height];
      gl.viewport(0, 0, w, h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const start = performance.now();
    const draw = (now: number) => {
      const c = colour.current;
      const k = ease(Math.min(1, (now - c.at) / FADE_MS));
      const mix = (i: number) => c.from[i].map((x, j) => x + (c.to[i][j] - x) * k);
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.time, reduced ? 12 : (now - start) / 1000);
      gl.uniform3fv(U.a, mix(0));
      gl.uniform3fv(U.b, mix(1));
      gl.uniform2f(U.center, center[0], center[1]);
      gl.uniform2f(U.mouse, reduced ? 0 : mx.get(), reduced ? 0 : -my.get());
      gl.uniform1f(U.mobile, window.innerWidth < 1024 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    let last = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };
    // Under reduced motion: one frame now, and one per frame only while a colour change eases in.
    redraw.current = () => {
      if (!reduced) return;
      const until = performance.now() + FADE_MS;
      const step = (now: number) => {
        draw(now);
        if (now < until) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    if (reduced) redraw.current();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      redraw.current = () => {};
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [anchor, mx, my, reduced]);

  return (
    <>
      <canvas ref={canvas} aria-hidden className={`hero-shader absolute inset-0 h-full w-full ${failed ? "hidden" : ""}`} />
      {failed && (
        <div
          aria-hidden
          className="absolute inset-0 transition-[background] duration-1000"
          style={{ background: `radial-gradient(45% 55% at 72% 45%, color-mix(in oklab, var(--color-deep-${game}) 45%, transparent), transparent 75%)` }}
        />
      )}
    </>
  );
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function link(gl: WebGLRenderingContext): WebGLProgram | null {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = sh(gl.VERTEX_SHADER, VERT);
  const f = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  gl.useProgram(p);
  return p;
}
