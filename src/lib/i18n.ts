export type Locale = "en" | "zh-cn";

export type UIStringKey =
  | "nav.home"
  | "nav.gallery"
  | "nav.about"
  | "nav.social"
  | "nav.contact"
  | "gallery.filterAll"
  | "social.title"
  | "social.instagram"
  | "social.threads"
  | "social.xiaohongshu"
  | "social.douyin"
  | "social.followOn"
  | "contact.title"
  | "contact.content"
  | "footer.copyright"
  | "filmstrip.previous"
  | "filmstrip.next"
  | "filmstrip.close"
  | "filmstrip.goToPhoto";

const translations: Record<Locale, Record<UIStringKey, string>> = {
  en: {
    "nav.home": "Home",
    "nav.gallery": "Gallery",
    "nav.about": "About",
    "nav.social": "Social",
    "nav.contact": "Contact",
    "gallery.filterAll": "All",
    "social.title": "Find Me Online",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "Xiaohongshu",
    "social.douyin": "Douyin",
    "social.followOn": "wherever you are.",
    "contact.title": "Get in Touch",
    "contact.content":
      "Just say hello.",
    "footer.copyright": "All rights reserved.",
    "filmstrip.previous": "Previous",
    "filmstrip.next": "Next",
    "filmstrip.close": "Close",
    "filmstrip.goToPhoto": "Go to photo {n}",
  },
  "zh-cn": {
    "nav.home": "首頁",
    "nav.gallery": "作品集",
    "nav.about": "關於",
    "nav.social": "社交媒體",
    "nav.contact": "聯繫",
    "gallery.filterAll": "全部",
    "social.title": "我在這裡",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "小紅書",
    "social.douyin": "抖音",
    "social.followOn": "無論你在哪裡。",
    "contact.title": "聯繫我",
    "contact.content":
      "打個招呼就好。",
    "footer.copyright": "版權所有。",
    "filmstrip.previous": "上一張",
    "filmstrip.next": "下一張",
    "filmstrip.close": "關閉",
    "filmstrip.goToPhoto": "前往第 {n} 張照片",
  },
};

export function t(locale: string | undefined, key: UIStringKey): string {
  const loc = (locale as Locale) ?? "en";
  return translations[loc]?.[key] ?? translations["en"][key] ?? key;
}

export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith("/zh-cn")) return "zh-cn";
  return "en";
}
