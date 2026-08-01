const ACCESS_TOKEN_KEY = 'tracenet_access_token'
const REFRESH_TOKEN_KEY = 'tracenet_refresh_token'

const storageAvailable = () =>
  typeof window !== 'undefined'
  && typeof window.sessionStorage !== 'undefined'

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!storageAvailable()) {
      return null
    }

    return window.sessionStorage.getItem(
      ACCESS_TOKEN_KEY,
    )
  },

  getRefreshToken(): string | null {
    if (!storageAvailable()) {
      return null
    }

    return window.sessionStorage.getItem(
      REFRESH_TOKEN_KEY,
    )
  },

  setTokens(
    accessToken: string,
    refreshToken?: string,
  ): void {
    if (!storageAvailable()) {
      return
    }

    window.sessionStorage.setItem(
      ACCESS_TOKEN_KEY,
      accessToken,
    )

    if (refreshToken) {
      window.sessionStorage.setItem(
        REFRESH_TOKEN_KEY,
        refreshToken,
      )
    }
  },

  clearTokens(): void {
    if (!storageAvailable()) {
      return
    }

    window.sessionStorage.removeItem(
      ACCESS_TOKEN_KEY,
    )
    window.sessionStorage.removeItem(
      REFRESH_TOKEN_KEY,
    )
  },
}