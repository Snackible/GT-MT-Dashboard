import { useEffect, useRef } from "react";

// Animated particle-network background. Paused (and hidden) on tabs that don't use it.
export default function Particles({ tab }) {
  const cvsRef = useRef(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const hidden = tab === "inbound" || tab === "rtv";

  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    let W, H, particles = [], raf;
    const mouse = { x: null, y: null, r: 160 };

    const init = () => {
      particles = [];
      const n = Math.min(140, Math.floor((W * H) / 11000));
      for (let i = 0; i < n; i++) {
        particles.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.7 });
      }
    };
    const size = () => {
      W = cvs.width = window.innerWidth;
      H = cvs.height = Math.max(document.body.scrollHeight, window.innerHeight);
      init();
    };
    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      const t = tabRef.current;
      if (t === "inbound" || t === "rtv") return;
      for (const p of particles) {
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        if (mouse.x !== null) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
          if (d < mouse.r) {
            const f = (mouse.r - d) / mouse.r;
            p.x -= (dx / d) * f * 2.2;
            p.y -= (dy / d) * f * 2.2;
          }
        }
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,140,255,.85)";
        ctx.fill();
      }
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const A = particles[a], B = particles[b];
          const dd = (A.x - B.x) ** 2 + (A.y - B.y) ** 2;
          if (dd < 14000) {
            const op = 1 - dd / 14000;
            const near = mouse.x !== null && Math.hypot(A.x - mouse.x, A.y - mouse.y) < mouse.r;
            ctx.strokeStyle = near ? `rgba(255,255,255,${op})` : `rgba(160,130,255,${op * 0.7})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(A.x, A.y);
            ctx.lineTo(B.x, B.y);
            ctx.stroke();
          }
        }
      }
    };
    const onScroll = () => {
      const needed = Math.max(document.body.scrollHeight, window.innerHeight);
      if (needed > H) {
        H = cvs.height = needed;
        init();
      }
    };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onOut = () => { mouse.x = null; mouse.y = null; };

    window.addEventListener("resize", size);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onOut);
    size();
    step();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
    };
  }, []);

  return <canvas id="particles" ref={cvsRef} style={{ opacity: hidden ? 0 : 1 }} />;
}
