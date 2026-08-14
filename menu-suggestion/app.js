(() => {
  const supported = ["en", "ko", "ja", "zh-Hans"];
  const aliases = { "en-us": "en", "en-gb": "en", "ko-kr": "ko", "ja-jp": "ja", "zh-cn": "zh-Hans", "zh-sg": "zh-Hans" };
  const labels = {
    en: { marketing: "Marketing", support: "Support", privacy: "Privacy", gallery: ["Make today’s meal decision easier", "Fine-tune a meal in a few taps", "Consider the weather when available", "See a reason and an enjoyment tip", "Keep go-to menus close", "Find nearby restaurants in Apple Maps"] },
    ko: { marketing: "소개", support: "지원", privacy: "개인정보", gallery: ["오늘 메뉴 결정", "취향 세부 조정", "날씨 고려", "이유와 맛있게 먹는 팁", "즐겨찾기", "주변 식당 찾기"] },
    ja: { marketing: "紹介", support: "サポート", privacy: "プライバシー", gallery: ["今日の食事を気軽に決めよう", "数回のタップで好みに合わせる", "利用できる場合は天気も考慮", "おすすめ理由とおいしい食べ方", "気に入ったメニューをお気に入りに", "Appleマップで近くのお店を探す"] },
    "zh-Hans": { marketing: "介绍", support: "支持", privacy: "隐私", gallery: ["轻松决定今天吃什么", "轻点几下匹配你的偏好", "在可用时也会参考天气", "推荐理由和更好吃的小贴士", "收藏想再吃的菜单", "在 Apple 地图中查找附近餐厅"] }
  };
  const initial = new URLSearchParams(window.location.search).get("lang") || navigator.language || "en";
  const resolved = supported.includes(initial) ? initial : (aliases[initial.toLowerCase()] || initial.split("-")[0]);
  let locale = supported.includes(resolved) ? resolved : "en";

  function hrefWithLocale(url) {
    const target = new URL(url, window.location.origin);
    target.searchParams.set("lang", locale);
    return target.pathname + target.search + target.hash;
  }

  function applyLocale(nextLocale, replaceHistory) {
    locale = supported.includes(nextLocale) ? nextLocale : "en";
    document.documentElement.lang = locale;
    document.querySelectorAll(".localized").forEach((section) => {
      section.hidden = section.dataset.locale !== locale;
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === locale));
    });
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.textContent = labels[locale][link.dataset.nav];
      link.href = hrefWithLocale(link.getAttribute("data-path"));
    });
    document.querySelectorAll("[data-screenshot]").forEach((image, index) => {
      const state = image.dataset.screenshot;
      image.src = `assets/screenshots/${locale}/${String(index + 1).padStart(2, "0")}-${state}.jpg`;
      image.alt = labels[locale].gallery[index];
    });
    document.querySelectorAll("[data-caption]").forEach((caption, index) => { caption.textContent = labels[locale].gallery[index]; });
    const active = document.querySelector(`.localized[data-locale="${locale}"]`);
    if (active?.dataset.title) document.title = active.dataset.title;
    if (!replaceHistory) history.replaceState(null, "", hrefWithLocale(window.location.pathname));
  }

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => applyLocale(button.dataset.language, false));
  });
  applyLocale(locale, true);
})();
