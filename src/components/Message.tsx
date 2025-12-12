import { useTranslation } from 'react-i18next';

export function Message({ i18nKey, ns }: { i18nKey: string, ns?: string }) {
  const { t } = useTranslation(ns);
  return t(i18nKey);
}
