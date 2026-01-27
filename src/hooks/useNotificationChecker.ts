import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useSettingsStore } from '../store/settingsStore'
import { platform } from '../api'

export function useNotificationChecker() {
  const { t } = useTranslation()
  const { notifications } = useSettingsStore()
  const hasChecked = useRef(false)

  useEffect(() => {
    // Only check once per app session and only in Electron
    if (hasChecked.current || !notifications.enabled || !platform.isElectron) {
      return
    }

    hasChecked.current = true

    const checkNotifications = async () => {
      try {
        const translations = {
          overdueTitle: t('settings.notifications.overdueTitle'),
          overdueBody: t('settings.notifications.overdueBody'),
          upcomingTitle: t('settings.notifications.upcomingTitle'),
          upcomingBody: t('settings.notifications.upcomingBody'),
          debtLabel: t('settings.notifications.debtLabel'),
          receivableLabel: t('settings.notifications.receivableLabel'),
        }

        await api.checkNotifications(notifications, translations)
      } catch (error) {
        console.error('Notification check failed:', error)
      }
    }

    // Delay the check to allow the app to fully load
    const timeoutId = setTimeout(checkNotifications, 2000)

    return () => clearTimeout(timeoutId)
  }, [notifications, t])
}
