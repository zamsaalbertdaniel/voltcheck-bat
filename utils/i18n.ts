/**
 * VoltCheck — Internationalization (i18next)
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
    lng: deviceLocale === 'ro' ? 'ro' : 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
    compatibilityJSON: 'v4',
});

export default i18n;
