import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoriesContent } from './Categories'
import { ExchangeRatesContent } from './ExchangeRates'
import { UsersContent } from './Users'
import { DatabaseContent } from './DatabaseOperations'
import { SettingsContent } from './Settings'

type TabType = 'categories' | 'exchangeRates' | 'users' | 'database' | 'settings'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        active
          ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

export function AdminPanel() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('categories')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.administration')}</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1">
          <TabButton
            active={activeTab === 'categories'}
            onClick={() => setActiveTab('categories')}
          >
            {t('nav.categories')}
          </TabButton>
          <TabButton
            active={activeTab === 'exchangeRates'}
            onClick={() => setActiveTab('exchangeRates')}
          >
            {t('nav.exchangeRates')}
          </TabButton>
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
          >
            {t('nav.users')}
          </TabButton>
          <TabButton
            active={activeTab === 'database'}
            onClick={() => setActiveTab('database')}
          >
            {t('nav.databaseOperations')}
          </TabButton>
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          >
            {t('settings.language')}
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'categories' && <CategoriesContent />}
        {activeTab === 'exchangeRates' && <ExchangeRatesContent />}
        {activeTab === 'users' && <UsersContent />}
        {activeTab === 'database' && <DatabaseContent />}
        {activeTab === 'settings' && <SettingsContent />}
      </div>
    </div>
  )
}
