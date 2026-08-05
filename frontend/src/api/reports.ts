import { apiClient } from './client'

import type {
  CreateReportPayload,
  Report,
} from '../types/reports'


type ApiListResponse<T> =
  | T[]
  | {
      results: T[]
    }


function normalizeList<T>(
  response: ApiListResponse<T>,
): T[] {
  if (Array.isArray(response)) {
    return response
  }

  return response.results
}


function getDownloadFilename(
  contentDisposition: string | undefined,
  report: Report,
): string {
  const utf8Match = contentDisposition?.match(
    /filename\*=UTF-8''([^;]+)/i,
  )
  const basicMatch = contentDisposition?.match(
    /filename="?([^"]+)"?/i,
  )

  const headerFilename = (
    utf8Match?.[1] ?? basicMatch?.[1]
  )

  if (headerFilename) {
    return decodeURIComponent(
      headerFilename.trim(),
    )
  }

  const safeTitle = report.title
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return `${
    safeTitle || `tracenet-report-${report.id}`
  }.${report.output_format}`
}


export const reportsApi = {
  async getReports(): Promise<Report[]> {
    const response = await apiClient.get<
      ApiListResponse<Report>
    >('/reports/')

    return normalizeList(response.data)
  },

  async getReport(id: number): Promise<Report> {
    const response = await apiClient.get<Report>(
      `/reports/${id}/`,
    )

    return response.data
  },

  async createReport(
    payload: CreateReportPayload,
  ): Promise<Report> {
    const response = await apiClient.post<Report>(
      '/reports/',
      payload,
    )

    return response.data
  },

  async downloadReport(report: Report): Promise<void> {
    const response = await apiClient.get<Blob>(
      `/reports/${report.id}/download/`,
      {
        responseType: 'blob',
      },
    )

    const objectUrl = URL.createObjectURL(
      response.data,
    )
    const filename = getDownloadFilename(
      response.headers['content-disposition'],
      report,
    )

    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(objectUrl)
  },
}