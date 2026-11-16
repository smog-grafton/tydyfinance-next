'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
import { ApiError, loginWithLaravel } from '@/lib/api/client'

type LoginFormFields = {
  email: string
  password: string
  remember: boolean
}

const useSignIn = () => {
  const [loading, setLoading] = useState(false)
  const { replace } = useRouter()
  const { showNotification } = useNotificationContext()

  const queryParams = useQueryParams()

  const loginFormSchema: yup.ObjectSchema<LoginFormFields> = yup.object({
    email: yup.string().email('Please enter a valid email').required('Please enter your email'),
    password: yup.string().required('Please enter your password'),
    remember: yup.boolean().required(),
  })

  const { control, handleSubmit, register, setError } = useForm<LoginFormFields>({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  const login = handleSubmit(async (values: LoginFormFields) => {
    setLoading(true)

    try {
      await loginWithLaravel(values)
      const redirectTo = queryParams['redirectTo'] ?? '/dashboard/analytics'
      showNotification({ message: 'Successfully signed in.', variant: 'success' })
      replace(redirectTo)
    } catch (error) {
      if (error instanceof ApiError) {
        const emailError = error.errors?.email?.[0]

        if (emailError) {
          setError('email', { message: emailError })
        }

        showNotification({ message: emailError ?? error.message, variant: 'danger' })
      } else {
        showNotification({ message: 'Unable to sign in. Please try again.', variant: 'danger' })
      }
    } finally {
      setLoading(false)
    }
  })

  return { loading, login, control, register }
}

export default useSignIn
