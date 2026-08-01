import axios from 'axios'


type ErrorPayload = {
  detail?: string
  [key: string]: unknown
}


export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!axios.isAxiosError<ErrorPayload>(error)) {
    return fallback
  }

  const data = error.response?.data

  if (!data) {
    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond.'
    }

    return (
      'Unable to connect to the TraceNet server. '
      + 'Please check that the backend is running.'
    )
  }

  if (
    typeof data.detail === 'string'
    && data.detail.trim()
  ) {
    return data.detail
  }

  for (const value of Object.values(data)) {
    if (
      Array.isArray(value)
      && typeof value[0] === 'string'
    ) {
      return value[0]
    }

    if (typeof value === 'string') {
      return value
    }
  }

  return fallback
}