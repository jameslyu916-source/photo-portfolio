export type Locale = "en" | "zh-cn";

export type UIStringKey =
  | "nav.home"
  | "nav.gallery"
  | "nav.about"
  | "nav.social"
  | "nav.contact"
  | "gallery.filterAll"
  | "gallery.filterLandscape"
  | "gallery.filterStreet"
  | "gallery.filterPortrait"
  | "gallery.filterNature"
  | "gallery.filterArchitecture"
  | "gallery.filterAbstract"
  | "gallery.filterBlackAndWhite"
  | "gallery.viewMore"
  | "home.heroTitle"
  | "home.heroSubtitle"
  | "home.viewGallery"
  | "home.featured"
  | "social.title"
  | "social.instagram"
  | "social.threads"
  | "social.xiaohongshu"
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
    "gallery.filterLandscape": "Landscape",
    "gallery.filterStreet": "Street",
    "gallery.filterPortrait": "Portrait",
    "gallery.filterNature": "Nature",
    "gallery.filterArchitecture": "Architecture",
    "gallery.filterAbstract": "Abstract",
    "gallery.filterBlackAndWhite": "Black & White",
    "gallery.viewMore": "View Gallery",
    "home.heroTitle": "Capturing Light",
    "home.heroSubtitle":
      "Personal photography portfolio exploring landscapes, streets, and the spaces in between.",
    "home.viewGallery": "View Gallery",
    "home.featured": "Featured Works",
    "social.title": "Follow My Work",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "Xiaohongshu",
    "social.followOn": "Follow me on",
    "about.title": "About Me",
    "about.content":
      "I am a photography enthusiast passionate about capturing the beauty of light, shadow, and the world around us — one frame at a time.",
    "contact.title": "Get in Touch",
    "contact.content":
      "For collaborations, prints, or just to say hello — feel free to reach out via social media or email.",
    "footer.copyright": "All rights reserved.",
  },
  "zh-cn": {
    "nav.home": "首页",
    "nav.gallery": "作品集",
    "nav.about": "关于",
    "nav.social": "社交媒体",
    "nav.contact": "联系",
    "gallery.filterAll": "全部",
    "gallery.filterLandscape": "风光",
    "gallery.filterStreet": "街拍",
    "gallery.filterPortrait": "人像",
    "gallery.filterNature": "自然",
    "gallery.filterArchitecture": "建筑",
    "gallery.filterAbstract": "抽象",
    "gallery.filterBlackAndWhite": "黑白",
    "gallery.viewMore": "浏览作品集",
    "home.heroTitle": "捕捉光影",
    "home.heroSubtitle": "个人摄影作品集，探索风景、街头与光影之间的故事。",
    "home.viewGallery": "浏览作品集",
    "home.featured": "精选作品",
    "social.title": "关注我的作品",
    "social.instagram": "Instagram",
    "social.threads": "Threads",
    "social.xiaohongshu": "小红书",
    "social.followOn": "在以下平台关注我",
    "about.title": "关于我",
    "about.content":
      "我是一名摄影爱好者，热衷于用镜头捕捉光影之美，一张一张地去记录这个世界的瞬间。",
    "contact.title": "联系我",
    "contact.content":
      "如有合作、购买作品或只是想打个招呼，欢迎通过社交媒体或邮件联系我。",
    "footer.copyright": "版权所有。",
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
