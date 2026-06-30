import { ref } from "vue";
import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";
import it from "../locales/it.json";
import ru from "../locales/ru.json";

const messagesMap = { en, "zh-CN": zhCN, it, ru };

const currentLocale = ref(localStorage.getItem("app-locale") || "en");

export const availableLocales = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Русский" },
];

export function useI18n() {
  const t = (key, params) => {
    const keys = key.split(".");
    let result = messagesMap[currentLocale.value];
    for (const k of keys) {
      if (result == null) return key;
      result = result[k];
    }
    let text = result ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };

  // Translate dynamic data (English → locale)
  const td = (text) => {
    if (!text) return text;
    const msg = messagesMap[currentLocale.value];
    const sopMap = msg?.sopData;
    const flowMap = msg?.flowData;
    if (flowMap && flowMap[text]) return flowMap[text];
    if (sopMap && sopMap[text]) return sopMap[text];
    return text;
  };

  const setLocale = (locale) => {
    currentLocale.value = locale;
    localStorage.setItem("app-locale", locale);
  };

  return { t, td, locale: currentLocale, setLocale };
}
