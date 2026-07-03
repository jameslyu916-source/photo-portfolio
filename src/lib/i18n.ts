export type Locale = "en" | "zh-cn";

export type UIStringKey =
  | "nav.home"
  | "nav.gallery"
  | "nav.about"
  | "nav.social"
  | "nav.contact"
  | "gallery.filterAll"
  | "gallery.viewMore"
  | "home.heroTitle"
  | "home.heroSubtitle"
  | "home.viewGallery"
  | "home.featured"
  | "social.title"
  | "social.instagram"
  | "social.threads"
  | "social.xiaohongshu"
  | "social.douyin"
  | "social.followOn"
  | "about.title"
  | "about.content"
  | "contact.title"
  | "contact.content"
  | "footer.copyright";

const translations: Record<Locale, Record<UIStringKey, string>> = {
  en: {
    "nav.home": "Home",
    "nav.gallery": "Gallery",
    "nav.about": "About",
    "nav.social": "Social",
    "nav.contact": "Contact",
    "gallery.filterAll": "All",
    "gallery.viewMore": "View Gallery",
    "home.heroTitle": "Capturing Light",
    "home.heroSubtitle":
      "Personal photography portfolio exploring landscapes, streets, and the spaces in between.",
    "home.viewGallery": "View Gallery",
    "home.featured": "Featured Works",
    "social.title": "Find Me Online",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "Xiaohongshu",
    "social.douyin": "Douyin",
    "social.followOn": "wherever you are.",
    "about.title": "About Me",
    "about.content":
      "I am a photography enthusiast passionate about capturing the beauty of light, shadow, and the world around us — one frame at a time.",
    "contact.title": "Get in Touch",
    "contact.content":
      "Just say hello.",
    "footer.copyright": "All rights reserved.",
  },
  "zh-cn": {
    "nav.home": "首頁",
    "nav.gallery": "作品集",
    "nav.about": "關於",
    "nav.social": "社交媒體",
    "nav.contact": "聯繫",
    "gallery.filterAll": "全部",
    "gallery.viewMore": "瀏覽作品集",
    "home.heroTitle": "捕捉光影",
    "home.heroSubtitle": "個人攝影作品集，探索風景、街頭與光影之間的故事。",
    "home.viewGallery": "瀏覽作品集",
    "home.featured": "精選作品",
    "social.title": "我在這裡",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "小紅書",
    "social.douyin": "抖音",
    "social.followOn": "無論你在哪裡。",
    "about.title": "關於我",
    "about.content":
      "我是一名攝影愛好者，熱衷於用鏡頭捕捉光影之美，一張一張地去記錄這個世界的瞬間。",
    "contact.title": "聯繫我",
    "contact.content":
      "打個招呼就好。",
    "footer.copyright": "版權所有。",
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
