(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* nav: shrink on scroll + mobile toggle */
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const toggle = $(".nav-toggle");
    toggle?.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  /* reveal on scroll */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .taxicab").forEach(el => io.observe(el));

  /* cursor glow on cards */
  $$(".card").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* mandala ticks in the hero */
  const ticks = $("#ticks");
  if (ticks) {
    const NS = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 144; i++) {
      const a = (i / 144) * Math.PI * 2;
      const major = i % 12 === 0;
      const r1 = 372, r2 = major ? 352 : 362;
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", 500 + r1 * Math.cos(a));
      l.setAttribute("y1", 500 + r1 * Math.sin(a));
      l.setAttribute("x2", 500 + r2 * Math.cos(a));
      l.setAttribute("y2", 500 + r2 * Math.sin(a));
      l.setAttribute("stroke", major ? "rgba(255,106,26,.7)" : "rgba(242,237,228,.16)");
      l.setAttribute("stroke-width", major ? 1.5 : 1);
      ticks.appendChild(l);
    }
  }

  /* manifesto: words light up as you scroll */
  const lead = $(".manifesto-lead");
  if (lead) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement("span");
            s.className = "w" + (node.classList?.contains("hl") ? " hl" : "");
            s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(lead);
    const words = $$(".w", lead);
    const light = () => {
      const r = lead.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < n));
    };
    light();
    window.addEventListener("scroll", light, { passive: true });
    window.addEventListener("resize", light);
  }

  /* subscribe: posts to Mailchimp's JSONP endpoint so the page never leaves the site */
  let mcSeq = 0;
  $$(".sub-form, .apply-form").forEach(form => {
    const isApply = form.classList.contains("apply-form");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const note = form.querySelector(".sub-note") || form.parentElement.querySelector(".sub-note");
      const btn = form.querySelector("button");
      const say = (msg, ok) => { if (note) { note.textContent = msg; note.classList.toggle("ok", !!ok); } };
      const email = form.EMAIL.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("That address doesn't look right.");

      const cb = `mcCallback${++mcSeq}`;
      const url = new URL(form.action.replace("/post?", "/post-json?"));
      new FormData(form).forEach((v, k) => url.searchParams.set(k, v));
      url.searchParams.set("c", cb);

      const script = document.createElement("script");
      const done = () => { delete window[cb]; script.remove(); btn.disabled = false; clearTimeout(timer); };
      const timer = setTimeout(() => { done(); say("Something went wrong. Please try again."); }, 12000);
      window[cb] = res => {
        done();
        if (res.result === "success") {
          form.reset();
          return say(form.dataset.success || "Almost there. Check your inbox to confirm.", true);
        }
        const msg = String(res.msg || "").replace(/<[^>]*>/g, "").replace(/^\d+\s*-\s*/, "");
        if (/already subscribed/i.test(msg)) return say(isApply
          ? "This email is already on our list, so your answers weren't saved. Please write to hello@1729x.com instead."
          : "You're already subscribed. Thank you.", !isApply);
        if (/too many/i.test(msg)) return say("Too many attempts. Please try again later.");
        say(msg || "Something went wrong. Please try again.");
      };
      script.onerror = () => { done(); say("Couldn't reach the server. Please try again."); };
      script.src = url.toString();
      btn.disabled = true;
      say(isApply ? "Sending…" : "Subscribing…");
      document.body.appendChild(script);
    });
  });

  /* character counters for length-limited fields */
  $$(".count[data-for]").forEach(c => {
    const el = document.getElementById(c.dataset.for);
    if (!el) return;
    const max = el.maxLength;
    const upd = () => { c.textContent = `${el.value.length} / ${max}`; c.classList.toggle("near", el.value.length > max * 0.9); };
    el.addEventListener("input", upd);
    el.form?.addEventListener("reset", () => setTimeout(upd));
    upd();
  });

  /* blog filters */
  const filters = $(".filters");
  if (filters) {
    filters.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", filters).forEach(x => x.classList.toggle("on", x === b));
      const f = b.dataset.f;
      $$(".index-item").forEach(it => it.classList.toggle("hidden", f !== "all" && it.dataset.cat !== f));
    });
  }

  /* reading progress */
  const bar = $(".progress");
  const article = $(".prose");
  if (bar && article) {
    const upd = () => {
      const r = article.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      bar.style.width = `${p * 100}%`;
    };
    upd();
    window.addEventListener("scroll", upd, { passive: true });
  }

  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
