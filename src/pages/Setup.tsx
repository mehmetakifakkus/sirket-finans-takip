import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSetupStore, SetupStep } from '../store/setupStore'

function StepIndicator({ currentStep }: { currentStep: SetupStep }) {
  const { t } = useTranslation()

  const STEPS: { key: SetupStep; title: string }[] = [
    { key: 'welcome', title: t('setup.steps.welcome') },
    { key: 'database', title: t('setup.steps.database') },
    { key: 'admin', title: t('setup.steps.admin') },
    { key: 'seed', title: t('setup.steps.seed') },
    { key: 'complete', title: t('setup.steps.complete') }
  ]

  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {STEPS.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index < currentIndex
                ? 'bg-green-500 text-white'
                : index === currentIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {index < currentIndex ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          {index < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="text-center">
      <div className="mx-auto h-20 w-20 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
        <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('setup.welcome.title')}</h2>
      <p className="text-gray-600 mb-8">
        {t('setup.welcome.description')}
      </p>
      <button
        onClick={onNext}
        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {t('setup.welcome.startSetup')}
      </button>
    </div>
  )
}

function DatabaseStep() {
  const { t } = useTranslation()
  const { initDatabase, isProcessing, error, statusMessage } = useSetupStore()

  useEffect(() => {
    initDatabase()
  }, [])

  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('setup.database.title')}</h3>

      {isProcessing ? (
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">{statusMessage || t('setup.database.processing')}</p>
        </div>
      ) : error ? (
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => initDatabase()}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {t('setup.database.retry')}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600">{statusMessage}</p>
        </div>
      )}
    </div>
  )
}

function AdminStep() {
  const { t } = useTranslation()
  const { createAdmin, isProcessing, error, adminData, clearError } = useSetupStore()
  const [useDefaults, setUseDefaults] = useState(true)
  const [customData, setCustomData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    clearError()

    if (!useDefaults) {
      if (!customData.name || !customData.email || !customData.password) {
        setValidationError(t('setup.admin.fillAllFields'))
        return
      }
      if (customData.password !== customData.confirmPassword) {
        setValidationError(t('setup.admin.passwordMismatch'))
        return
      }
      if (customData.password.length < 6) {
        setValidationError(t('setup.admin.passwordMinLength'))
        return
      }
      await createAdmin(false, {
        name: customData.name,
        email: customData.email,
        password: customData.password
      })
    } else {
      await createAdmin(true)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">{t('setup.admin.title')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || validationError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error || validationError}
          </div>
        )}

        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="useDefaults"
            checked={useDefaults}
            onChange={(e) => setUseDefaults(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="useDefaults" className="text-sm text-gray-700">
            {t('setup.admin.useDefaults')}
          </label>
        </div>

        {useDefaults ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">{t('setup.admin.defaultInfo')}</p>
            <p className="text-sm text-blue-700">{t('common.name')}: {adminData.name}</p>
            <p className="text-sm text-blue-700">{t('common.email')}: {adminData.email}</p>
            <p className="text-sm text-blue-700">{t('auth.password')}: {adminData.password}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('setup.admin.fullName')}
              </label>
              <input
                type="text"
                id="name"
                value={customData.name}
                onChange={(e) => setCustomData({ ...customData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('setup.admin.namePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('setup.admin.email')}
              </label>
              <input
                type="email"
                id="email"
                value={customData.email}
                onChange={(e) => setCustomData({ ...customData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('setup.admin.emailPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('setup.admin.password')}
              </label>
              <input
                type="password"
                id="password"
                value={customData.password}
                onChange={(e) => setCustomData({ ...customData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="******"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('setup.admin.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={customData.confirmPassword}
                onChange={(e) => setCustomData({ ...customData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="******"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('setup.admin.creating')}
            </span>
          ) : (
            t('setup.admin.createAdmin')
          )}
        </button>
      </form>
    </div>
  )
}

function SeedStep() {
  const { t } = useTranslation()
  const { seedData, seedOptions, setSeedOptions, isProcessing, error } = useSetupStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await seedData()
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">{t('setup.seed.title')}</h3>
      <p className="text-sm text-gray-600 mb-6 text-center">
        {t('setup.seed.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={seedOptions.categories}
              onChange={(e) => setSeedOptions({ categories: e.target.checked })}
              className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('setup.seed.categories')}</p>
              <p className="text-xs text-gray-500">{t('setup.seed.categoriesDesc')}</p>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={seedOptions.exchangeRates}
              onChange={(e) => setSeedOptions({ exchangeRates: e.target.checked })}
              className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('setup.seed.exchangeRates')}</p>
              <p className="text-xs text-gray-500">{t('setup.seed.exchangeRatesDesc')}</p>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={seedOptions.demoData}
              onChange={(e) => setSeedOptions({ demoData: e.target.checked })}
              className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('setup.seed.demoData')}</p>
              <p className="text-xs text-gray-500">{t('setup.seed.demoDataDesc')}</p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('setup.seed.adding')}
            </span>
          ) : (
            t('setup.seed.addAndFinish')
          )}
        </button>
      </form>
    </div>
  )
}

function CompleteStep() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { seedDetails, adminData } = useSetupStore()

  const handleFinish = () => {
    navigate('/login')
  }

  return (
    <div className="text-center">
      <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('setup.complete.title')}</h3>
      <p className="text-gray-600 mb-6">
        {t('setup.complete.description')}
      </p>

      <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
        <p className="text-sm text-blue-800 font-medium mb-2">{t('setup.complete.loginInfo')}</p>
        <p className="text-sm text-blue-700">{t('common.email')}: {adminData.email}</p>
        <p className="text-sm text-blue-700">{t('auth.password')}: {adminData.password}</p>
      </div>

      {seedDetails.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <p className="text-sm text-gray-700 font-medium mb-2">{t('setup.complete.addedData')}</p>
          <ul className="text-sm text-gray-600 list-disc list-inside">
            {seedDetails.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleFinish}
        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {t('setup.complete.goToLogin')}
      </button>
    </div>
  )
}

export function Setup() {
  const navigate = useNavigate()
  const { currentStep, setStep, needsSetup, isChecking, checkSetupStatus } = useSetupStore()

  // Check setup status and redirect if already complete
  useEffect(() => {
    checkSetupStatus()
  }, [])

  useEffect(() => {
    if (!isChecking && needsSetup === false) {
      navigate('/login', { replace: true })
    }
  }, [needsSetup, isChecking, navigate])

  const handleWelcomeNext = () => {
    setStep('database')
  }

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={handleWelcomeNext} />
      case 'database':
        return <DatabaseStep />
      case 'admin':
        return <AdminStep />
      case 'seed':
        return <SeedStep />
      case 'complete':
        return <CompleteStep />
      default:
        return <WelcomeStep onNext={handleWelcomeNext} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <StepIndicator currentStep={currentStep} />
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
