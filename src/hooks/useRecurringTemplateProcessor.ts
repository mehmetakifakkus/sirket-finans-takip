import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'

export function useRecurringTemplateProcessor() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { addAlert } = useAppStore()
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current || !user?.id) {
      return
    }

    hasProcessed.current = true

    const processTemplates = async () => {
      try {
        const result = await api.processOverdueTemplates(user.id)

        if (result.transactionsCreated > 0) {
          addAlert('info', t('templates.autoProcessed', { count: result.transactionsCreated }))
        }

        if (result.errors.length > 0) {
          console.error('Template processing errors:', result.errors)
        }
      } catch (error) {
        console.error('Recurring template processing failed:', error)
      }
    }

    const timeoutId = setTimeout(processTemplates, 3000)

    return () => clearTimeout(timeoutId)
  }, [user, t, addAlert])
}
