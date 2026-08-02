import { apiClient } from './client'

import type {
  AlertInboxItem,
  AlertSummary,
  ApiCollection,
  CaseSummary,
  DashboardData,
  DashboardMetrics,
  DashboardViewModel,
  HotspotSummary,
  RouteSummary,
  StatusChartItem,
} from '../types/dashboard'


function unwrapCollection<T>(
  collection: ApiCollection<T>,
): T[] {
  return Array.isArray(collection)
    ? collection
    : collection.results
}


function countByField<T>(
  items: T[],
  getValue: (item: T) => string,
  labels: Record<string, string>,
): StatusChartItem[] {
  const counts = items.reduce<Record<string, number>>(
    (result, item) => {
      const value = getValue(item)

      result[value] = (result[value] ?? 0) + 1
      return result
    },
    {},
  )

  return Object.entries(counts)
    .map(([name, value]) => ({
      name: labels[name] ?? formatLabel(name),
      value,
    }))
    .sort((first, second) => second.value - first.value)
}


function formatLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function calculateMetrics(
  data: DashboardData,
): DashboardMetrics {
  const closedStatuses = new Set([
    'resolved',
    'closed',
  ])

  const highRiskLevels = new Set([
    'high',
    'critical',
  ])

  return {
    totalCases: data.cases.length,

    activeCases: data.cases.filter(
      (item) => !closedStatuses.has(item.status),
    ).length,

    criticalCases: data.cases.filter(
      (item) => item.priority === 'critical',
    ).length,

    verifiedCases: data.cases.filter(
      (item) => item.is_verified,
    ).length,

    activeRoutes: data.routes.filter(
      (item) => item.is_active,
    ).length,

    highRiskRoutes: data.routes.filter(
      (item) => (
        item.is_active
        && highRiskLevels.has(item.risk_level)
      ),
    ).length,

    activeHotspots: data.hotspots.filter(
      (item) => item.is_active,
    ).length,

    highRiskHotspots: data.hotspots.filter(
      (item) => (
        item.is_active
        && highRiskLevels.has(item.risk_level)
      ),
    ).length,

    activeAlerts: data.alerts.filter(
      (item) => item.status === 'active',
    ).length,

    unreadAlerts: data.inbox.filter(
      (item) => !item.is_read,
    ).length,

    unacknowledgedAlerts: data.inbox.filter(
      (item) => !item.is_acknowledged,
    ).length,
  }
}


function sortByNewest<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
): T[] {
  return [...items].sort((first, second) => {
    const firstDate = getDate(first)
    const secondDate = getDate(second)

    const firstTime = firstDate
      ? new Date(firstDate).getTime()
      : 0

    const secondTime = secondDate
      ? new Date(secondDate).getTime()
      : 0

    return secondTime - firstTime
  })
}


const caseStatusLabels: Record<string, string> = {
  reported: 'Reported',
  under_review: 'Under review',
  investigating: 'Investigating',
  action_required: 'Action required',
  resolved: 'Resolved',
  closed: 'Closed',
}


const casePriorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}


export const dashboardApi = {
  async getDashboard(): Promise<DashboardViewModel> {
    const [
      casesResponse,
      routesResponse,
      hotspotsResponse,
      alertsResponse,
      inboxResponse,
    ] = await Promise.all([
      apiClient.get<ApiCollection<CaseSummary>>(
        '/cases/',
      ),

      apiClient.get<ApiCollection<RouteSummary>>(
        '/locations/routes/',
      ),

      apiClient.get<ApiCollection<HotspotSummary>>(
        '/locations/hotspots/',
      ),

      apiClient.get<ApiCollection<AlertSummary>>(
        '/alerts/',
      ),

      apiClient.get<ApiCollection<AlertInboxItem>>(
        '/alerts/inbox/',
      ),
    ])

    const data: DashboardData = {
      cases: unwrapCollection(casesResponse.data),
      routes: unwrapCollection(routesResponse.data),
      hotspots: unwrapCollection(hotspotsResponse.data),
      alerts: unwrapCollection(alertsResponse.data),
      inbox: unwrapCollection(inboxResponse.data),
    }

    return {
      data,
      metrics: calculateMetrics(data),

      caseStatusChart: countByField(
        data.cases,
        (item) => item.status,
        caseStatusLabels,
      ),

      casePriorityChart: countByField(
        data.cases,
        (item) => item.priority,
        casePriorityLabels,
      ),

      recentCases: sortByNewest(
        data.cases,
        (item) => item.updated_at,
      ).slice(0, 5),

      recentAlerts: sortByNewest(
        data.alerts,
        (item) => item.created_at,
      ).slice(0, 5),
    }
  },
}