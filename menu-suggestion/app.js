(() => {
  const supported = ["en", "ko"];
  const labels = {
    en: {
      marketing: "Marketing",
      support: "Support",
      privacy: "Privacy",
      gallery: [
        "Make today’s meal decision easier",
        "Fine-tune a meal in a few taps",
        "Consider the weather when available",
        "See a reason and an enjoyment tip",
        "Keep go-to menus close",
        "Find nearby restaurants in Apple Maps or Google Maps"
      ]
    },
    ko: {
      marketing: "소개",
      support: "지원",
      privacy: "개인정보",
      gallery: [
        "오늘 먹을 메뉴를 더 쉽게 정하세요",
        "몇 번의 탭으로 취향을 맞추기",
        "가능한 경우 날씨도 고려",
        "이유와 맛있게 먹는 팁 확인",
        "자주 찾는 메뉴를 가까이",
        "Apple Maps 또는 Google Maps에서 주변 식당 찾기"
      ]
    }
  };

  function readLocale() {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (supported.includes(fromUrl)) return fromUrl;
    try {
      const stored = localStorage.getItem("ms-lang");
      if (supported.includes(stored)) return stored;
    } catch (_) {}
    return "en";
  }

  function hrefWithLocale(path, locale) {
    const target = new URL(path, window.location.origin);
    target.searchParams.set("lang", locale);
    return target.pathname + target.search;
  }

  function screenshotBase() {
    return document.body.dataset.page === "marketing" ? "assets/screenshots" : "../assets/screenshots";
  }

  function applyLocale(locale, replaceHistory) {
    const next = supported.includes(locale) ? locale : "en";
    document.documentElement.lang = next;
    try { localStorage.setItem("ms-lang", next); } catch (_) {}
    document.querySelectorAll(".localized").forEach((section) => {
      section.hidden = section.dataset.locale !== next;
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === next));
    });
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.textContent = labels[next][link.dataset.nav];
      link.href = hrefWithLocale(link.getAttribute("data-path"), next);
    });
    const brand = document.querySelector(".brand");
    if (brand) brand.href = hrefWithLocale("/menu-suggestion/", next);
    const names = ["main", "filters", "weather", "result", "favorites", "map"];
    document.querySelectorAll("[data-screenshot]").forEach((image, index) => {
      const state = image.dataset.screenshot || names[index];
      image.src = `${screenshotBase()}/${next}/${String(index + 1).padStart(2, "0")}-${state}.jpg`;
      image.alt = labels[next].gallery[index];
    });
    document.querySelectorAll("[data-caption]").forEach((caption, index) => {
      caption.textContent = labels[next].gallery[index];
    });
    const active = document.querySelector(`.localized[data-locale="${next}"]`);
    if (active?.dataset.title) document.title = active.dataset.title;
    const url = hrefWithLocale(window.location.pathname, next);
    if (replaceHistory) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  }

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => applyLocale(button.dataset.language, false));
  });
  window.addEventListener("popstate", () => applyLocale(readLocale(), true));
  applyLocale(readLocale(), true);
})();
