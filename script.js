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

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const viewport = carousel.querySelector(".carousel-viewport");
  const track = carousel.querySelector(".carousel-track");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!viewport || !track) return;

  const originalSlides = Array.from(track.children);
  const beforeClones = originalSlides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });
  const afterClones = originalSlides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });

  track.prepend(...beforeClones);
  track.append(...afterClones);

  let isDragging = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastTime = 0;
  let lastScroll = 0;
  let velocity = 0;
  let momentumFrame;
  let originalStart = 0;
  let groupWidth = 0;
  let isNormalizing = false;

  const measureLoop = () => {
    const firstOriginal = originalSlides[0];
    const firstAfterClone = afterClones[0];

    if (!firstOriginal || !firstAfterClone) return;

    originalStart = firstOriginal.offsetLeft;
    groupWidth = firstAfterClone.offsetLeft - firstOriginal.offsetLeft;

    if (viewport.scrollLeft < originalStart || viewport.scrollLeft >= originalStart + groupWidth) {
      viewport.scrollLeft = originalStart;
    }
  };

  const normalizeScroll = () => {
    if (!groupWidth || isNormalizing) return;

    if (viewport.scrollLeft < originalStart) {
      isNormalizing = true;
      viewport.scrollLeft += groupWidth;
      startScroll += groupWidth;
      lastScroll += groupWidth;
      requestAnimationFrame(() => {
        isNormalizing = false;
      });
    } else if (viewport.scrollLeft >= originalStart + groupWidth) {
      isNormalizing = true;
      viewport.scrollLeft -= groupWidth;
      startScroll -= groupWidth;
      lastScroll -= groupWidth;
      requestAnimationFrame(() => {
        isNormalizing = false;
      });
    }
  };

  const stopMomentum = () => {
    if (momentumFrame) window.cancelAnimationFrame(momentumFrame);
  };

  const glide = () => {
    if (Math.abs(velocity) < 0.025 || reduceMotion) return;

    viewport.scrollLeft += velocity * 18;
    normalizeScroll();
    velocity *= 0.945;
    momentumFrame = window.requestAnimationFrame(glide);
  };

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;

    isDragging = true;
    carousel.classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
    stopMomentum();

    startX = event.clientX;
    startScroll = viewport.scrollLeft;
    lastX = event.clientX;
    lastScroll = viewport.scrollLeft;
    lastTime = performance.now();
    velocity = 0;
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const now = performance.now();
    const dx = event.clientX - startX;
    const frameTime = Math.max(now - lastTime, 16);

    viewport.scrollLeft = startScroll - dx;
    normalizeScroll();
    const scrollDelta = viewport.scrollLeft - lastScroll;
    const nextVelocity = scrollDelta / frameTime;

    velocity = (velocity * 0.58) + (nextVelocity * 0.42);
    velocity = Math.max(-3.2, Math.min(3.2, velocity));
    lastX = event.clientX;
    lastScroll = viewport.scrollLeft;
    lastTime = now;
  });

  const endDrag = (event) => {
    if (!isDragging) return;

    isDragging = false;
    carousel.classList.remove("is-dragging");

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    glide();
  };

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", endDrag);
  viewport.addEventListener("scroll", normalizeScroll, { passive: true });
  window.addEventListener("resize", measureLoop);

  requestAnimationFrame(measureLoop);
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = item.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    item.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-3px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
});

window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;

  document.documentElement.style.setProperty("--scroll", `${currentScroll}px`);
}, { passive: true });
