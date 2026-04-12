/**
 * InspectEV — Internationalization (i18next)
 * Languages: Română (ro) + English (en)
 */

import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ro from '../locales/ro.json';

const deviceLocale = Localization.getLocales()?.[0]?.languageCode ?? 'ro';

i18n.use(initReactI18next).init({
    resources: {
        ro: { translation: ro },
        en: { translation: en },
    },
    // InspectEV targets the Romanian market exclusively.
    // Default language is always Romanian — users can switch
    // to English manually via Settings → Language toggle.
    lng: 'ro',
    fallbackLng: 'ro',
    interpolation: {
        escapeValue: false,
    },
    compatibilityJSON: 'v4',
});

export default i18n;
