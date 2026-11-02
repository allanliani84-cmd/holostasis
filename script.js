const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const header = document.querySelector(".site-header");
const revealItems = document.querySelectorAll("[data-reveal]");
const tiltItems = document.querySelectorAll("[data-tilt]");
const customSelects = document.querySelectorAll("[data-custom-select]");
const contactForm = document.querySelector("[data-contact-form]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuButton.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    }
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const link = target.closest("a");

  if (!(link instanceof HTMLAnchorElement)) return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target || link.hasAttribute("download")) return;

  const url = new URL(link.href, window.location.href);
  const isPageLink = url.protocol === window.location.protocol && url.host === window.location.host;
  const isSamePageHash = url.pathname === window.location.pathname && url.hash;

  if (!isPageLink || isSamePageHash || url.protocol === "mailto:" || url.protocol === "tel:") return;

  event.preventDefault();
  document.body.classList.add("page-leaving");

  window.setTimeout(() => {
    window.location.href = url.href;
  }, 240);
});

const closeCustomSelects = (activeSelect) => {
  customSelects.forEach((select) => {
    if (select === activeSelect) return;

    select.classList.remove("is-open");
    const toggle = select.querySelector(".custom-select-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
};

customSelects.forEach((select) => {
  const toggle = select.querySelector(".custom-select-toggle");
  const label = select.querySelector("[data-select-label]");
  const valueInput = select.querySelector("input[type='hidden']");
  const options = select.querySelectorAll(".custom-select-option");

  if (!toggle || !label || !valueInput) return;

  toggle.addEventListener("click", () => {
    const isOpen = select.classList.contains("is-open");

    closeCustomSelects(select);
    select.classList.toggle("is-open", !isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value || option.textContent.trim();

      valueInput.value = value;
      label.textContent = value;
      toggle.classList.remove("is-placeholder");
      select.classList.remove("is-open", "needs-choice");
      toggle.setAttribute("aria-expanded", "false");

      options.forEach((item) => {
        const isSelected = item === option;
        item.classList.toggle("is-selected", isSelected);
        item.setAttribute("aria-selected", String(isSelected));
      });
    });
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;
  if (target.closest("[data-custom-select]")) return;

  closeCustomSelects();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeCustomSelects();
});

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const missingDropdown = Array.from(contactForm.querySelectorAll("[data-required-dropdown]")).find((field) => {
      const input = field.querySelector("input[type='hidden']");
      return !input || !input.value;
    });

    if (missingDropdown) {
      const select = missingDropdown.querySelector("[data-custom-select]");
      const toggle = missingDropdown.querySelector(".custom-select-toggle");

      if (select) select.classList.add("needs-choice");
      if (toggle) toggle.focus();
      if (status) status.textContent = "Choose a project type before sending the enquiry.";
      return;
    }

    const formData = new FormData(contactForm);
    const name = formData.get("name") || "Website enquiry";
    const fields = [
      ["Name", name],
      ["Email", formData.get("email")],
      ["Project type", formData.get("projectType")],
      ["Budget", formData.get("budget")],
      ["Timeline", formData.get("timeline")],
      ["Best contact", formData.get("contactPreference")],
      ["Project details", formData.get("details")],
      ["Links or references", formData.get("references")],
    ];

    const body = fields
      .map(([label, value]) => `${label}: ${value || "Not provided"}`)
      .join("\n\n");
    const subject = encodeURIComponent(`Holostasis project enquiry - ${name}`);
    const message = encodeURIComponent(body);

    if (status) {
      status.textContent = "Opening your email app with the project details ready to send.";
    }

    window.location.href = `mailto:hello@holostasis.co.uk?subject=${subject}&body=${message}`;
  });
}

document.querySelectorAll('[data-carousel]').forEach(carousel=>{
 const viewport=carousel.querySelector('.carousel-viewport'),track=carousel.querySelector('.carousel-track');
 if(!viewport||!track)return;
 const originals=Array.from(track.children);if(originals.length<2)return;
 const cloneGroup=()=>originals.map(slide=>{const c=slide.cloneNode(true);c.setAttribute('aria-hidden','true');c.inert=true;return c;});
 // Two spare cycles on either side let native touch momentum finish before recentering.
 track.prepend(...cloneGroup(),...cloneGroup());const after=cloneGroup();track.append(...after,...cloneGroup());
 viewport.tabIndex=0;viewport.setAttribute('aria-label','Recent photos. Swipe or use the arrow keys to browse in either direction.');
 let origin=0,cycle=0,touching=false,dragging=false,lastX=0,pending=0,frame=0,idle=0,ready=false;
 const modulo=(n,m)=>((n%m)+m)%m;
 const recenter=()=>{if(!ready||touching||dragging)return;const x=viewport.scrollLeft,next=origin+modulo(x-origin,cycle);if(Math.abs(next-x)>.5)viewport.scrollLeft=next;};
 const measure=()=>{const oldCycle=cycle,offset=ready?modulo(viewport.scrollLeft-origin,cycle)/cycle:0;origin=originals[0].offsetLeft;cycle=after[0].offsetLeft-origin;if(cycle>0){viewport.scrollLeft=origin+(oldCycle?offset*cycle:0);ready=true;}};
 const settle=()=>{clearTimeout(idle);idle=setTimeout(recenter,180);};
 viewport.addEventListener('scroll',settle,{passive:true});viewport.addEventListener('scrollend',recenter,{passive:true});
 viewport.addEventListener('touchstart',()=>{touching=true;clearTimeout(idle);},{passive:true});
 for(const event of ['touchend','touchcancel'])viewport.addEventListener(event,()=>{touching=false;settle();},{passive:true});
 // Mouse dragging only. Touch and trackpad scrolling stay entirely native.
 viewport.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;dragging=true;lastX=e.clientX;viewport.setPointerCapture(e.pointerId);carousel.classList.add('is-dragging');});
 viewport.addEventListener('pointermove',e=>{if(!dragging)return;pending+=lastX-e.clientX;lastX=e.clientX;if(!frame)frame=requestAnimationFrame(()=>{viewport.scrollLeft+=pending;pending=0;frame=0;});});
 const end=e=>{if(!dragging)return;dragging=false;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);carousel.classList.remove('is-dragging');settle();};
 viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();viewport.scrollLeft+=(e.key==='ArrowRight'?1:-1)*Math.max(160,viewport.clientWidth*.65);settle();}});
 const resize=new ResizeObserver(measure);resize.observe(viewport);requestAnimationFrame(measure);
 carousel.dataset.loopReady='true';
});


const showRevealItem = (item) => item.classList.add("is-visible");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          showRevealItem(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => {
    if (item.getBoundingClientRect().top < window.innerHeight * 0.92) {
      showRevealItem(item);
    }

    observer.observe(item);
  });
} else {
  revealItems.forEach(showRevealItem);
}

tiltItems.forEach((item) => {
  item.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = item.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    item.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-3px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
});

