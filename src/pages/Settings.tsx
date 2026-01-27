import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../store/settingsStore'
import { useAppStore } from '../store/appStore'

export function Settings() {
  const { t } = useTranslation()
  const { language, setLanguage } = useSettingsStore()
  const { addAlert } = useAppStore()

  const handleLanguageChange = (lang: 'tr' | 'de' | 'en') => {
    setLanguage(lang)
    addAlert('success', t('settings.languageChanged'))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Language Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.language')}</h2>

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('settings.selectLanguage')}
          </label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as 'tr' | 'de' | 'en')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="tr">{t('settings.turkish')}</option>
            <option value="en">{t('settings.english')}</option>
            <option value="de">{t('settings.german')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
