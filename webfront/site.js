// The hero scene and scroll reveals.
//
// The Lama stands on its key, as in the app icon, and the key runs into a
// vault door. Every few seconds a masked vault item (a login, a note or a
// card, never a real or realistic value) slides along the key into the
// vault. The Lama clears it with a jump, or rears up and hurdles a narrow
// one, turns to watch it go in, and the door's wheel turns to lock it.
// Items only start when the Lama is free: an idle trick or nap gives way
// (the Lama wakes for it), a visitor's tap gag does not. Reduced motion
// keeps the scene still, and a tap only changes the pose (lama-antics.js).
(function () {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const t = (en, de) => (window.VaultLamaLanguage ? window.VaultLamaLanguage.pick(en, de) : en);

  function heroScene() {
    const scene = document.getElementById("hero-scene");
    const lama = document.getElementById("hero-lama");
    const lane = document.getElementById("item-lane");
    const vault = document.getElementById("vault");
    const wheel = document.getElementById("vault-wheel");
    const count = document.getElementById("vault-count");
    if (!scene || !lama || !lane || !vault || !wheel || !count) return;

    // Scene units (the SVG viewBox). Items ride on top of the key from just
    // past its bow until they are behind the vault door.
    const FROM = 46, INTO = 236;
    // The Lama's image box and the shared rig's foot fractions
    // (lama-antics.js; Foundry knowledge/website-lama-antics.md).
    const LAMA_X = 96, LAMA_W = 84;
    const FEET = [0.233, 0.327, 0.743, 0.837].map((f) => LAMA_X + LAMA_W * f);
    const KINDS = {
      login: { width: 22, speed: 0.095, mark: '<circle cx="5" cy="119" r="1.3"/><circle cx="8.5" cy="119" r="1.3"/><circle cx="12" cy="119" r="1.3"/><circle cx="15.5" cy="119" r="1.3"/><circle cx="19" cy="119" r="1.3"/>' },
      card: { width: 22, speed: 0.095, mark: '<rect x="4" y="116.4" width="6.4" height="5.2" rx="1.2"/><circle cx="13.6" cy="119" r="1.2"/><circle cx="16.4" cy="119" r="1.2"/><circle cx="19.2" cy="119" r="1.2"/>' },
      note: { width: 14, speed: 0.075, mark: '<path class="line" d="M4 117.4H10M4 120.6H8.2"/>' },
    };
    const ORDER = ["login", "note", "login", "card", "note", "login", "card"];
    const JUMPS = ["hop", "tuck", "hop", "kick", "twist"];
    const PAUSE = [3600, 5200];

    let antics = null, visible = true, sending = false, timer = 0, stored = 0, turned = 0;
    let order = [], jumps = [];
    const next = (bag, source) => { if (!bag.length) bag.push(...source); return bag.shift(); };

    function label() {
      count.textContent = stored ? t(`${stored} ${stored === 1 ? "item" : "items"}`, `${stored} ${stored === 1 ? "Eintrag" : "Einträge"}`) : "";
    }
    document.addEventListener("vaultlama:language", label);

    function turnWheel() {
      turned += 120;
      wheel.style.transform = `rotate(${turned}deg)`;
    }

    function lock() {
      stored += 1;
      label();
      vault.classList.remove("is-locked");
      vault.classList.add("is-locking");
      turnWheel();
      setTimeout(() => {
        vault.classList.remove("is-locking");
        vault.classList.add("is-locked");
      }, 900);
    }

    function make(kind) {
      // A rounded chip on top of the key, with a masked mark.
      const node = document.createElementNS(SVG, "g");
      node.setAttribute("class", "item");
      const chip = document.createElementNS(SVG, "rect");
      chip.setAttribute("class", "item-chip");
      for (const [name, value] of Object.entries({ x: 0, y: 114, width: KINDS[kind].width, height: 10, rx: 5 })) chip.setAttribute(name, String(value));
      const mark = document.createElementNS(SVG, "g");
      mark.setAttribute("class", "item-mark");
      mark.innerHTML = KINDS[kind].mark;
      node.append(chip, mark);
      node.dataset.kind = kind;
      lane.append(node);
      return node;
    }

    // Moves an item at a steady pace, so the Lama can time its move.
    function slide(node, speed, start) {
      const duration = (INTO - FROM) / speed;
      return new Promise((resolve) => {
        const step = (now) => {
          const elapsed = Math.max(0, now - start);
          const x = FROM + speed * Math.min(elapsed, duration);
          node.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
          node.style.opacity = String(Math.min(1, elapsed / 260));
          if (elapsed < duration && node.isConnected) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
    }

    // The shared hurdle() plays its keyframes under one ease-in-out curve
    // over the whole move, so a key placed at time k shows at the real time
    // where the curve reaches k. Place keys so they show when wanted:
    // k = end * ease(t / end), with end = k(last) + 280 (its two 140 ms
    // settling keys).
    function bezier(x) {
      // cubic-bezier(0.42, 0, 0.58, 1), solved for x by bisection.
      const at = (u, a, b) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
      let low = 0, high = 1;
      for (let i = 0; i < 30; i += 1) {
        const mid = (low + high) / 2;
        if (at(mid, 0.42, 0.58) < x) low = mid; else high = mid;
      }
      return at((low + high) / 2, 0, 1);
    }
    function eased(times) {
      const last = times[times.length - 1];
      let low = last + 1, high = last + 4000;
      for (let i = 0; i < 40; i += 1) {
        const end = (low + high) / 2;
        if (end * bezier(last / end) + 280 > end) low = end; else high = end;
      }
      const end = (low + high) / 2;
      return times.map((time) => end * bezier(Math.max(0, time) / end));
    }

    // Times in ms after start at which an item's leading edge reaches x, or
    // its trailing edge passes x.
    const reach = (x, kind) => (x - KINDS[kind].width - FROM) / KINDS[kind].speed;
    const pass = (x, kind) => (x - FROM) / KINDS[kind].speed;

    function send() {
      if (sending || !antics || antics.busy() === "tap") return false;
      sending = true;
      const kind = next(order, ORDER);
      const { speed } = KINDS[kind];
      const node = make(kind);
      const start = performance.now() + 30;
      const since = () => performance.now() - start;
      const arrive = (INTO - FROM) / speed;
      antics.react(async (a) => {
        if (kind === "note") {
          // Narrow items pass between the legs: front legs up while it is
          // under them, then the back legs.
          await a.wait(Math.max(0, reach(FEET[0] - 30, kind) - since()));
          a.pose("standing");
          const now = since();
          const [f0, f1, b0, b1] = eased([reach(FEET[0] - 2, kind) - now, pass(FEET[1] + 2, kind) - now,
            reach(FEET[2] - 2, kind) - now, pass(FEET[3] + 2, kind) - now]);
          await a.hurdle({ lift: 24, front: [f0, f1], back: [b0, b1] });
        } else {
          // From when the item would touch the front feet until it has
          // left the back feet, plus the shared jump's 200 ms crouch.
          const touch = reach(FEET[0] - 2, kind);
          const clear = pass(FEET[3] + 2, kind);
          a.pose("hello");
          await a.wait(Math.max(0, touch - 300 - since()));
          a.pose(null);
          await a.jump({ lead: 220, air: clear - touch + 200, height: 0.36, style: next(jumps, JUMPS) });
        }
        a.pose(null);
        // It turns to watch the item go into the vault.
        a.face("right");
        await a.wait(Math.max(0, arrive - since() + 120));
        a.pose("hello");
        await a.move("dip");
        if (stored > 0 && stored % 5 === 0) {
          a.pose("shadesUp");
          await a.move("cool");
        }
        a.face(null);
        a.pose(null);
      }, "item").finally(() => antics.face(null));
      slide(node, speed, start).then(() => {
        node.remove();
        lock();
        sending = false;
        queue();
      });
      return true;
    }

    function queue(delay = PAUSE[0] + Math.random() * (PAUSE[1] - PAUSE[0])) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (reduced.matches || !visible || document.hidden || !send()) queue(1400);
      }, delay);
    }

    // It greets with a nod, then stands proud; hovering the scene nods again.
    let hovering = false;
    const hello = (on) => lama.classList.toggle("is-hello", on);
    setTimeout(() => { if (!hovering) hello(false); }, 1600);
    scene.addEventListener("pointerenter", () => { hovering = true; hello(true); });
    scene.addEventListener("pointerleave", () => { hovering = false; hello(false); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(scene);
    }

    if (window.LamaAntics) {
      antics = LamaAntics.attach(lama, {
        base: "assets/lama/",
        colors: ["#D6C3FA", "#F2D48A", "#FFF8EB"],
        // Tapping the Lama may also spin the vault's wheel.
        taps: {
          wheel: async (a) => {
            a.pose("hello");
            if (!a.reduced()) turnWheel();
            await a.move("dip");
            await a.move("dip");
            a.pose(null);
          },
        },
      });
      queue(2600);
    }
  }

  function reveals() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduced.matches) {
      targets.forEach((target) => target.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach((target) => observer.observe(target));
  }

  heroScene();
  reveals();
})();
