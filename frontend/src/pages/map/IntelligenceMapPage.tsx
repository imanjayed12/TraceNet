import {
  AlertTriangle,
  CheckCircle2,
  Layers3,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'

import {
  divIcon,
  latLngBounds,
} from 'leaflet'

import type {
  LatLngExpression,
  LatLngTuple,
} from 'leaflet'

import 'leaflet/dist/leaflet.css'

import { intelligenceMapApi } from '../../api/map'
import { AppShell } from '../../components/layout/AppShell'
import { getApiErrorMessage } from '../../utils/apiError'

import type {
  IntelligenceHotspot,
  IntelligenceMapData,
  IntelligenceMapMetrics,
  IntelligenceRoute,
  MapFilters,
  RiskLevel,
} from '../../types/map'


const BANGLADESH_CENTER: LatLngExpression = [
  23.685,
  90.3563,
]


const riskColors: Record<RiskLevel, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
}


const riskBackgrounds: Record<RiskLevel, string> = {
  low: '#dcfce7',
  medium: '#fef3c7',
  high: '#ffedd5',
  critical: '#fee2e2',
}


const initialFilters: MapFilters = {
  riskLevel: 'all',
  routeType: 'all',
  transportMode: 'all',
  division: '',
  search: '',
  showDistricts: true,
  showRoutes: true,
  showHotspots: true,
  verifiedOnly: false,
}


type SelectedMapItem =
  | {
      type: 'route'
      data: IntelligenceRoute
    }
  | {
      type: 'hotspot'
      data: IntelligenceHotspot
    }
  | null


function toCoordinate(
  latitude: string,
  longitude: string,
): LatLngExpression {
  return [
    Number(latitude),
    Number(longitude),
  ]
}

function getRouteMidpoint(
  route: IntelligenceRoute,
): LatLngExpression {
  const originLatitude = Number(
    route.origin.latitude,
  )
  const originLongitude = Number(
    route.origin.longitude,
  )
  const destinationLatitude = Number(
    route.destination.latitude,
  )
  const destinationLongitude = Number(
    route.destination.longitude,
  )

  return [
    (
      originLatitude
      + destinationLatitude
    ) / 2,
    (
      originLongitude
      + destinationLongitude
    ) / 2,
  ]
}


function getRouteDirectionAngle(
  route: IntelligenceRoute,
): number {
  const latitudeDifference = (
    Number(route.destination.latitude)
    - Number(route.origin.latitude)
  )

  const longitudeDifference = (
    Number(route.destination.longitude)
    - Number(route.origin.longitude)
  )

  return (
    Math.atan2(
      -latitudeDifference,
      longitudeDifference,
    )
    * 180
    / Math.PI
  )
}


function createEndpointIcon(
  label: 'O' | 'D',
  color: string,
) {
  return divIcon({
    className: '',
    html: `
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:center;
          width:28px;
          height:28px;
          border-radius:9999px;
          border:3px solid white;
          background:${color};
          color:white;
          font-size:12px;
          font-weight:800;
          box-shadow:0 4px 12px rgba(15,23,42,0.28);
        "
      >
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}


function createDirectionIcon(
  route: IntelligenceRoute,
) {
  const angle = getRouteDirectionAngle(route)
  const color = riskColors[route.risk_level]

  return divIcon({
    className: '',
    html: `
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:center;
          width:34px;
          height:34px;
          border-radius:9999px;
          border:3px solid white;
          background:${color};
          color:white;
          font-size:22px;
          font-weight:900;
          line-height:1;
          box-shadow:0 5px 14px rgba(15,23,42,0.30);
        "
      >
        <span
          style="
            display:block;
            transform:rotate(${angle}deg);
          "
        >
          ➜
        </span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


function formatLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function MapViewport({
  data,
}: {
  data: IntelligenceMapData
}) {
  const map = useMap()

  useEffect(() => {
    const coordinates: LatLngExpression[] = [
      ...data.hotspots.map((hotspot) =>
        toCoordinate(
          hotspot.latitude,
          hotspot.longitude,
        ),
      ),
      ...data.routes.flatMap((route) => [
        toCoordinate(
          route.origin.latitude,
          route.origin.longitude,
        ),
        toCoordinate(
          route.destination.latitude,
          route.destination.longitude,
        ),
      ]),
    ]

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize()

      if (coordinates.length === 0) {
        map.setView(BANGLADESH_CENTER, 7)
        return
      }

      const bounds = latLngBounds(
        coordinates as LatLngTuple[],
      )

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [45, 45],
          maxZoom: 8,
        })
      }
    }, 150)

    return () => {
      window.clearTimeout(resizeTimer)
    }
  }, [
    data.hotspots,
    data.routes,
    map,
  ])

  return null
}


function RiskBadge({
  riskLevel,
}: {
  riskLevel: RiskLevel
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{
        color: riskColors[riskLevel],
        backgroundColor: riskBackgrounds[riskLevel],
      }}
    >
      {formatLabel(riskLevel)}
    </span>
  )
}


export function IntelligenceMapPage() {
  const [mapData, setMapData] =
    useState<IntelligenceMapData | null>(null)

  const [filters, setFilters] =
    useState<MapFilters>(initialFilters)

  const [selectedItem, setSelectedItem] =
    useState<SelectedMapItem>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const loadMapData = async (
    refreshing = false,
  ) => {
    if (refreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage('')

    try {
      const response =
        await intelligenceMapApi.getMapData()

      setMapData(response)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Unable to load intelligence map data.',
        ),
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadMapData()
  }, [])

  const divisions = useMemo(() => {
    if (!mapData) {
      return []
    }

    return Array.from(
      new Set(
        mapData.districts.map(
          (district) => district.division,
        ),
      ),
    ).sort()
  }, [mapData])

  const filteredRoutes = useMemo(() => {
    if (!mapData) {
      return []
    }

    const search = filters.search
      .trim()
      .toLowerCase()

    return mapData.routes.filter((route) => {
      const matchesSearch = (
        !search
        || route.name.toLowerCase().includes(search)
        || route.origin.name
          .toLowerCase()
          .includes(search)
        || route.destination.name
          .toLowerCase()
          .includes(search)
      )

      const matchesRisk = (
        filters.riskLevel === 'all'
        || route.risk_level === filters.riskLevel
      )

      const matchesRouteType = (
        filters.routeType === 'all'
        || route.route_type === filters.routeType
      )

      const matchesTransport = (
        filters.transportMode === 'all'
        || route.transport_mode
          === filters.transportMode
      )

      const matchesDivision = (
        !filters.division
        || route.origin.division
          === filters.division
        || route.destination.division
          === filters.division
      )

      const matchesVerification = (
        !filters.verifiedOnly
        || route.is_verified
      )

      return (
        matchesSearch
        && matchesRisk
        && matchesRouteType
        && matchesTransport
        && matchesDivision
        && matchesVerification
      )
    })
  }, [
    filters,
    mapData,
  ])

  const filteredHotspots = useMemo(() => {
    if (!mapData) {
      return []
    }

    const search = filters.search
      .trim()
      .toLowerCase()

    return mapData.hotspots.filter((hotspot) => {
      const matchesSearch = (
        !search
        || hotspot.name.toLowerCase().includes(search)
        || hotspot.district.name
          .toLowerCase()
          .includes(search)
      )

      const matchesRisk = (
        filters.riskLevel === 'all'
        || hotspot.risk_level
          === filters.riskLevel
      )

      const matchesDivision = (
        !filters.division
        || hotspot.district.division
          === filters.division
      )

      const matchesVerification = (
        !filters.verifiedOnly
        || hotspot.is_verified
      )

      return (
        matchesSearch
        && matchesRisk
        && matchesDivision
        && matchesVerification
      )
    })
  }, [
    filters,
    mapData,
  ])

  const metrics = useMemo<
    IntelligenceMapMetrics
  >(() => {
    const routes = mapData?.routes ?? []
    const hotspots = mapData?.hotspots ?? []

    return {
      totalDistricts:
        mapData?.districts.length ?? 0,

      activeRoutes: routes.length,

      highRiskRoutes: routes.filter(
        (route) =>
          route.risk_level === 'high'
          || route.risk_level === 'critical',
      ).length,

      activeHotspots: hotspots.length,

      highRiskHotspots: hotspots.filter(
        (hotspot) =>
          hotspot.risk_level === 'high'
          || hotspot.risk_level === 'critical',
      ).length,

      criticalLocations: (
        routes.filter(
          (route) =>
            route.risk_level === 'critical',
        ).length
        + hotspots.filter(
          (hotspot) =>
            hotspot.risk_level === 'critical',
        ).length
      ),

      verifiedRoutes: routes.filter(
        (route) => route.is_verified,
      ).length,

      verifiedHotspots: hotspots.filter(
        (hotspot) => hotspot.is_verified,
      ).length,
    }
  }, [mapData])

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const visibleMapData: IntelligenceMapData = {
    districts: mapData?.districts ?? [],
    routes: filters.showRoutes
      ? filteredRoutes
      : [],
    hotspots: filters.showHotspots
      ? filteredHotspots
      : [],
  }

  return (
    <AppShell activeNavigation="map">
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px]">
          <MapHeader
            isRefreshing={isRefreshing}
            onRefresh={() => {
              void loadMapData(true)
            }}
          />

          {isLoading ? (
            <MapLoadingState />
          ) : errorMessage ? (
            <MapErrorState
              message={errorMessage}
              onRetry={() => {
                void loadMapData()
              }}
            />
          ) : mapData ? (
            <>
              <MetricCards metrics={metrics} />

              <MapFiltersPanel
                filters={filters}
                divisions={divisions}
                onChange={setFilters}
                onClear={clearFilters}
              />

              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid min-h-[690px] xl:grid-cols-[330px_minmax(0,1fr)_350px]">
                  <IntelligenceList
                    routes={filteredRoutes}
                    hotspots={filteredHotspots}
                    filters={filters}
                    selectedItem={selectedItem}
                    onSelect={setSelectedItem}
                  />

                  <div className="relative min-h-[540px] overflow-hidden border-y border-slate-200 xl:border-x xl:border-y-0">
                    <MapContainer
                      center={BANGLADESH_CENTER}
                      zoom={7}
                      minZoom={6}
                      maxZoom={14}
                      scrollWheelZoom
                      className="h-full min-h-[690px] w-full"
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapViewport
                        data={visibleMapData}
                      />

                      {filters.showDistricts
                        && mapData.districts.map(
                          (district) => (
                            <CircleMarker
                              key={`district-${district.id}`}
                              center={toCoordinate(
                                district.latitude,
                                district.longitude,
                              )}
                              radius={3}
                              pathOptions={{
                                color: '#64748b',
                                fillColor: '#ffffff',
                                fillOpacity: 0.85,
                                weight: 1,
                              }}
                            >
                              <Popup>
                                <div className="min-w-36">
                                  <p className="font-bold text-slate-950">
                                    {district.name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-600">
                                    {district.division_display}
                                    {' Division'}
                                  </p>
                                </div>
                              </Popup>
                            </CircleMarker>
                          ),
                        )}

                      {filters.showRoutes
                        && filteredRoutes.map(
                          (route) => {
                            const positions:
                              LatLngExpression[] = [
                                toCoordinate(
                                  route.origin.latitude,
                                  route.origin.longitude,
                                ),
                                toCoordinate(
                                  route.destination.latitude,
                                  route.destination.longitude,
                                ),
                              ]

                            return (
  <Fragment key={`route-${route.id}`}>
    <Polyline
      positions={positions}
      eventHandlers={{
        click: () => {
          setSelectedItem({
            type: 'route',
            data: route,
          })
        },
      }}
      pathOptions={{
        color:
          riskColors[
            route.risk_level
          ],
        weight:
          route.risk_level
            === 'critical'
            ? 6
            : route.risk_level
                === 'high'
              ? 5
              : 4,
        opacity: 0.82,
        dashArray:
          route.route_type
            === 'cross_border'
            ? '10 8'
            : undefined,
      }}
    >
      <Popup>
        <div className="min-w-56">
          <p className="font-bold text-slate-950">
            {route.name}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {route.origin.name}
            {' → '}
            {route.destination.name}
          </p>

          <div className="mt-3">
            <RiskBadge
              riskLevel={
                route.risk_level
              }
            />
          </div>
        </div>
      </Popup>
    </Polyline>

    <Marker
      position={toCoordinate(
        route.origin.latitude,
        route.origin.longitude,
      )}
      icon={createEndpointIcon(
        'O',
        '#0f766e',
      )}
    >
      <Tooltip
        direction="top"
        offset={[0, -14]}
      >
        Origin: {route.origin.name}
      </Tooltip>
    </Marker>

    <Marker
      position={toCoordinate(
        route.destination.latitude,
        route.destination.longitude,
      )}
      icon={createEndpointIcon(
        'D',
        '#1d4ed8',
      )}
    >
      <Tooltip
        direction="top"
        offset={[0, -14]}
      >
        Destination: {route.destination.name}
      </Tooltip>
    </Marker>

    <Marker
      position={getRouteMidpoint(route)}
      icon={createDirectionIcon(route)}
    >
      <Tooltip
        direction="top"
        offset={[0, -17]}
      >
        {route.origin.name}
        {' → '}
        {route.destination.name}
      </Tooltip>
    </Marker>
  </Fragment>
)
                          },
                        )}

                      {filters.showHotspots
                        && filteredHotspots.map(
                          (hotspot) => (
                            <CircleMarker
                              key={`hotspot-${hotspot.id}`}
                              center={toCoordinate(
                                hotspot.latitude,
                                hotspot.longitude,
                              )}
                              radius={
                                9
                                + Math.min(
                                  hotspot.risk_score
                                    / 10,
                                  10,
                                )
                              }
                              eventHandlers={{
                                click: () => {
                                  setSelectedItem({
                                    type: 'hotspot',
                                    data: hotspot,
                                  })
                                },
                              }}
                              pathOptions={{
                                color:
                                  riskColors[
                                    hotspot.risk_level
                                  ],
                                fillColor:
                                  riskColors[
                                    hotspot.risk_level
                                  ],
                                fillOpacity: 0.38,
                                weight: 3,
                              }}
                            >
                              <Popup>
                                <div className="min-w-56">
                                  <p className="font-bold text-slate-950">
                                    {hotspot.name}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-600">
                                    {hotspot.district.name}
                                  </p>

                                  <div className="mt-3 flex items-center justify-between gap-4">
                                    <RiskBadge
                                      riskLevel={
                                        hotspot.risk_level
                                      }
                                    />

                                    <span className="text-sm font-bold text-slate-800">
                                      Score{' '}
                                      {hotspot.risk_score}/100
                                    </span>
                                  </div>
                                </div>
                              </Popup>
                            </CircleMarker>
                          ),
                        )}
                    </MapContainer>

                    <MapLegend />
                  </div>

                  <MapDetailPanel
                    selectedItem={selectedItem}
                    onClose={() => {
                      setSelectedItem(null)
                    }}
                  />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </AppShell>
  )
}


function MapHeader({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
          <MapPinned size={19} />
          Geospatial intelligence
        </div>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Intelligence map
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Live visibility across active routes, assessed
          hotspots and Bangladesh district coverage.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshCw
          size={18}
          className={
            isRefreshing
              ? 'animate-spin'
              : ''
          }
        />
        Refresh intelligence
      </button>
    </div>
  )
}


function MetricCards({
  metrics,
}: {
  metrics: IntelligenceMapMetrics
}) {
  const cards = [
    {
      label: 'District coverage',
      value: metrics.totalDistricts,
      detail: 'Bangladesh districts mapped',
      icon: MapPinned,
      color: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Active routes',
      value: metrics.activeRoutes,
      detail: `${metrics.highRiskRoutes} high-risk routes`,
      icon: RouteIcon,
      color: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'Risk hotspots',
      value: metrics.activeHotspots,
      detail: `${metrics.highRiskHotspots} require attention`,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-700',
    },
    {
      label: 'Verified intelligence',
      value:
        metrics.verifiedRoutes
        + metrics.verifiedHotspots,
      detail: `${metrics.criticalLocations} critical locations`,
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-700',
    },
  ]

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {card.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {card.value}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {card.detail}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}
              >
                <Icon size={23} />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}


function MapFiltersPanel({
  filters,
  divisions,
  onChange,
  onClear,
}: {
  filters: MapFilters
  divisions: string[]
  onChange: (filters: MapFilters) => void
  onClear: () => void
}) {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <SlidersHorizontal
          size={19}
          className="text-teal-700"
        />

        <h2 className="font-bold text-slate-950">
          Intelligence filters
        </h2>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(140px,1fr))]">
        <label className="relative">
          <span className="sr-only">
            Search intelligence
          </span>

          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
          />

          <input
            value={filters.search}
            onChange={(event) => {
              onChange({
                ...filters,
                search: event.target.value,
              })
            }}
            placeholder="Search route, district or hotspot..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <select
          value={filters.riskLevel}
          onChange={(event) => {
            onChange({
              ...filters,
              riskLevel: event.target.value as MapFilters['riskLevel'],
            })
          }}
          className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">
            All risk levels
          </option>
          <option value="low">Low risk</option>
          <option value="medium">
            Medium risk
          </option>
          <option value="high">High risk</option>
          <option value="critical">
            Critical risk
          </option>
        </select>

        <select
          value={filters.routeType}
          onChange={(event) => {
            onChange({
              ...filters,
              routeType: event.target.value as MapFilters['routeType'],
            })
          }}
          className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">
            All route types
          </option>
          <option value="domestic">
            Domestic
          </option>
          <option value="cross_border">
            Cross-border
          </option>
        </select>

        <select
          value={filters.transportMode}
          onChange={(event) => {
            onChange({
              ...filters,
              transportMode: event.target.value as MapFilters['transportMode'],
            })
          }}
          className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">
            All transport
          </option>
          <option value="road">Road</option>
          <option value="rail">Rail</option>
          <option value="water">Water</option>
          <option value="air">Air</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          value={filters.division}
          onChange={(event) => {
            onChange({
              ...filters,
              division: event.target.value,
            })
          }}
          className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">
            All divisions
          </option>

          {divisions.map((division) => (
            <option
              key={division}
              value={division}
            >
              {formatLabel(division)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {[
          {
            key: 'showDistricts',
            label: 'Districts',
          },
          {
            key: 'showRoutes',
            label: 'Routes',
          },
          {
            key: 'showHotspots',
            label: 'Hotspots',
          },
          {
            key: 'verifiedOnly',
            label: 'Verified only',
          },
        ].map((layer) => (
          <label
            key={layer.key}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
          >
            <input
              type="checkbox"
              checked={
                filters[
                  layer.key as keyof MapFilters
                ] as boolean
              }
              onChange={(event) => {
                onChange({
                  ...filters,
                  [layer.key]: event.target.checked,
                })
              }}
              className="h-4 w-4 accent-teal-600"
            />

            {layer.label}
          </label>
        ))}

        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <X size={17} />
          Clear filters
        </button>
      </div>
    </section>
  )
}


function IntelligenceList({
  routes,
  hotspots,
  filters,
  selectedItem,
  onSelect,
}: {
  routes: IntelligenceRoute[]
  hotspots: IntelligenceHotspot[]
  filters: MapFilters
  selectedItem: SelectedMapItem
  onSelect: (item: SelectedMapItem) => void
}) {
  return (
    <aside className="max-h-[690px] overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Layers3
            size={19}
            className="text-teal-700"
          />

          <h2 className="font-bold text-slate-950">
            Visible intelligence
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {hotspots.length} hotspots ·{' '}
          {routes.length} routes
        </p>
      </div>

      {filters.showHotspots && (
        <div className="p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Risk hotspots
          </p>

          <div className="space-y-3">
            {hotspots.map((hotspot) => {
              const selected = (
                selectedItem?.type === 'hotspot'
                && selectedItem.data.id
                  === hotspot.id
              )

              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => {
                    onSelect({
                      type: 'hotspot',
                      data: hotspot,
                    })
                  }}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selected
                      ? 'border-teal-500 ring-2 ring-teal-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {hotspot.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {hotspot.district.name}
                      </p>
                    </div>

                    <RiskBadge
                      riskLevel={
                        hotspot.risk_level
                      }
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Score {hotspot.risk_score}/100
                    </span>

                    <span>
                      {hotspot.recent_case_count}
                      {' recent cases'}
                    </span>
                  </div>
                </button>
              )
            })}

            {hotspots.length === 0 && (
              <EmptyListMessage
                label="No matching hotspots"
              />
            )}
          </div>
        </div>
      )}

      {filters.showRoutes && (
        <div className="border-t border-slate-200 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Active routes
          </p>

          <div className="space-y-3">
            {routes.map((route) => {
              const selected = (
                selectedItem?.type === 'route'
                && selectedItem.data.id
                  === route.id
              )

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    onSelect({
                      type: 'route',
                      data: route,
                    })
                  }}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    selected
                      ? 'border-teal-500 ring-2 ring-teal-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-950">
                      {route.name}
                    </p>

                    <RiskBadge
                      riskLevel={route.risk_level}
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {route.origin.name}
                    {' → '}
                    {route.destination.name}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {route.transport_mode_display}
                    {' · '}
                    {route.route_type_display}
                  </p>
                </button>
              )
            })}

            {routes.length === 0 && (
              <EmptyListMessage
                label="No matching routes"
              />
            )}
          </div>
        </div>
      )}
    </aside>
  )
}


function EmptyListMessage({
  label,
}: {
  label: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
      {label}
    </div>
  )
}


function MapDetailPanel({
  selectedItem,
  onClose,
}: {
  selectedItem: SelectedMapItem
  onClose: () => void
}) {
  if (!selectedItem) {
    return (
      <aside className="flex min-h-80 flex-col items-center justify-center bg-white p-7 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <MapPinned size={27} />
        </div>

        <h2 className="mt-4 font-bold text-slate-950">
          Select map intelligence
        </h2>

        <p className="mt-2 max-w-64 text-sm leading-6 text-slate-500">
          Select a hotspot marker, route line or list
          record to review verified operational details.
        </p>
      </aside>
    )
  }

  if (selectedItem.type === 'route') {
    const route = selectedItem.data

    return (
      <aside className="max-h-[690px] overflow-y-auto bg-white p-6">
        <DetailHeader
          title="Route intelligence"
          onClose={onClose}
        />

        <div className="mt-6">
          <RiskBadge
            riskLevel={route.risk_level}
          />

          <h2 className="mt-3 text-xl font-bold text-slate-950">
            {route.name}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {route.origin.name}
            {' → '}
            {route.destination.name}
          </p>
        </div>

        <DetailRows
          rows={[
            [
              'Route type',
              route.route_type_display,
            ],
            [
              'Transport',
              route.transport_mode_display,
            ],
            [
              'Origin division',
              route.origin.division_display,
            ],
            [
              'Destination division',
              route.destination.division_display,
            ],
            [
              'Verification',
              route.is_verified
                ? 'Verified'
                : 'Unverified',
            ],
            [
              'Last updated',
              formatDate(route.updated_at),
            ],
          ]}
        />

        {route.description && (
          <DetailSection
            title="Description"
            content={route.description}
          />
        )}

        {route.evidence_summary && (
          <DetailSection
            title="Evidence summary"
            content={route.evidence_summary}
          />
        )}
      </aside>
    )
  }

  const hotspot = selectedItem.data

  return (
    <aside className="max-h-[690px] overflow-y-auto bg-white p-6">
      <DetailHeader
        title="Hotspot assessment"
        onClose={onClose}
      />

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <RiskBadge
            riskLevel={hotspot.risk_level}
          />

          {hotspot.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={15} />
              Verified
            </span>
          )}
        </div>

        <h2 className="mt-3 text-xl font-bold text-slate-950">
          {hotspot.name}
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {hotspot.district.name},{' '}
          {hotspot.district.division_display}
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-[#082f49] p-5 text-white">
        <p className="text-sm text-cyan-100">
          Explainable risk score
        </p>

        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-bold">
            {hotspot.risk_score}
          </span>

          <span className="pb-1 text-sm text-slate-300">
            / 100
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full"
            style={{
              width: `${hotspot.risk_score}%`,
              backgroundColor:
                riskColors[hotspot.risk_level],
            }}
          />
        </div>
      </div>

      <DetailRows
        rows={[
          [
            'Hotspot type',
            hotspot.hotspot_type_display,
          ],
          [
            'Recent cases',
            String(hotspot.recent_case_count),
          ],
          [
            'Active routes',
            String(hotspot.active_route_count),
          ],
          [
            'Verified routes',
            String(hotspot.verified_route_count),
          ],
          [
            'Vulnerability',
            `${hotspot.vulnerability_score}/100`,
          ],
          [
            'Last assessed',
            formatDate(
              hotspot.last_assessed_at,
            ),
          ],
        ]}
      />

      {hotspot.risk_explanation && (
        <DetailSection
          title="Risk explanation"
          content={hotspot.risk_explanation}
        />
      )}
    </aside>
  )
}


function DetailHeader({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">
        {title}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
        aria-label="Close details"
      >
        <X size={17} />
      </button>
    </div>
  )
}


function DetailRows({
  rows,
}: {
  rows: Array<[string, string]>
}) {
  return (
    <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-start justify-between gap-4 px-4 py-3"
        >
          <dt className="text-sm text-slate-500">
            {label}
          </dt>

          <dd className="text-right text-sm font-semibold text-slate-900">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}


function DetailSection({
  title,
  content,
}: {
  title: string
  content: string
}) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {content}
      </p>
    </section>
  )
}


function MapLegend() {
  const risks: RiskLevel[] = [
    'critical',
    'high',
    'medium',
    'low',
  ]

  return (
    <div className="absolute bottom-5 right-5 z-[500] rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Risk legend
      </p>

      <div className="mt-3 space-y-2">
        {risks.map((risk) => (
          <div
            key={risk}
            className="flex items-center gap-2"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  riskColors[risk],
              }}
            />

            <span className="text-xs font-medium text-slate-700">
              {formatLabel(risk)}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-slate-700" />

          <span className="text-xs font-medium text-slate-700">
            Cross-border route
          </span>
        </div>
      </div>
    </div>
  )
}


function MapLoadingState() {
  return (
    <div className="mt-6 flex min-h-[560px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-teal-600" />

        <p className="mt-4 font-semibold text-slate-700">
          Loading geospatial intelligence...
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Synchronizing districts, routes and hotspots.
        </p>
      </div>
    </div>
  )
}


function MapErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="mt-6 flex min-h-[480px] items-center justify-center rounded-2xl border border-red-200 bg-white px-5">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <AlertTriangle size={27} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-950">
          Intelligence map unavailable
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f4c6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0b3b54]"
        >
          <RefreshCw size={17} />
          Try again
        </button>
      </div>
    </div>
  )
}