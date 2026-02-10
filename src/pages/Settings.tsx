import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../store/settingsStore'
import { useAppStore } from '../store/appStore'

export function SettingsContent() {
  const { t } = useTranslation()
  const { language, setLanguage, vatCalculationMode, setVatCalculationMode, totalsCalculationBasis, setTotalsCalculationBasis } = useSettingsStore()
  const { addAlert } = useAppStore()

  const handleLanguageChange = (lang: 'tr' | 'de' | 'en') => {
    setLanguage(lang)
    addAlert('success', t('settings.languageChanged'))
  }

  const handleVatModeChange = (mode: 'included' | 'excluded') => {
    setVatCalculationMode(mode)
    addAlert('success', t('settings.vatModeChanged'))
  }

  const handleTotalsBasisChange = (basis: 'base' | 'net') => {
    setTotalsCalculationBasis(basis)
    addAlert('success', t('settings.totalsBasisChanged'))
  }

  return (
    <div className="space-y-6">
      {/* Language Settings */}
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

      {/* VAT Calculation Mode */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.vatCalculationMode')}
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="vatMode"
              value="included"
              checked={vatCalculationMode === 'included'}
              onChange={() => handleVatModeChange('included')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('settings.vatIncluded')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="vatMode"
              value="excluded"
              checked={vatCalculationMode === 'excluded'}
              onChange={() => handleVatModeChange('excluded')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('settings.vatExcluded')}</span>
          </label>
        </div>
      </div>

      {/* Totals Calculation Basis */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('settings.totalsCalculationBasis')}
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="totalsBasis"
              value="base"
              checked={totalsCalculationBasis === 'base'}
              onChange={() => handleTotalsBasisChange('base')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('settings.totalsVatExcluded')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="totalsBasis"
              value="net"
              checked={totalsCalculationBasis === 'net'}
              onChange={() => handleTotalsBasisChange('net')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('settings.totalsVatIncluded')}</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SettingsContent />
      </div>
    </div>
  )
}
