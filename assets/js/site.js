(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var top = document.querySelector(".top"), menu = document.getElementById("menu"),
      openBtn = document.querySelector(".menu-btn"), closeBtn = document.querySelector(".menu-close");

  function onScroll() { top.classList.toggle("scrolled", window.scrollY > 8); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  var behind = [document.getElementById("main"), top, document.querySelector(".foot")];
  function setMenu(open) {
    menu.hidden = !open;
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
    behind.forEach(function (el) { if (el) el.inert = open; });
    (open ? closeBtn : openBtn).focus();
  }
  openBtn.addEventListener("click", function () { setMenu(true); });
  closeBtn.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px -4% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });

  document.querySelectorAll(".rail-sec").forEach(function (sec) {
    var rail = sec.querySelector(".rail");
    sec.querySelectorAll("[data-rail]").forEach(function (b) {
      b.addEventListener("click", function () {
        var step = rail.firstElementChild.getBoundingClientRect().width + 28;
        rail.scrollBy({ left: step * Number(b.getAttribute("data-rail")), behavior: "smooth" });
      });
    });
  });

  document.querySelectorAll("[data-facade]").forEach(function (b) {
    b.addEventListener("click", function () {
      var day = b.closest(".facade").classList.toggle("day");
      b.setAttribute("aria-pressed", String(day));
      b.textContent = day ? "Ver al atardecer" : "Ver de día";
    });
  });
})();
