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
  const normalizeDynamicText = (text) =>
    text
      .replace(/Prepare:\s*(?=1\.)/g, "Prepare:\n")
      .replace(/Prepare: \n/g, "Prepare:\n");

  const resolveDynamicText = (map, text) => {
    if (!map) return null;
    if (map[text]) return map[text];

    const normalizedText = normalizeDynamicText(text);
    if (map[normalizedText]) return map[normalizedText];

    const legacyText = normalizedText.replace(/Prepare:\n/g, "Prepare: \n");
    return map[legacyText] || null;
  };

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
    const flowText = resolveDynamicText(flowMap, text);
    if (flowText) return flowText;
    const sopText = resolveDynamicText(sopMap, text);
    if (sopText) return sopText;
    return text;
  };

  const setLocale = (locale) => {
    currentLocale.value = locale;
    localStorage.setItem("app-locale", locale);
  };

  return { t, td, locale: currentLocale, setLocale };
}
