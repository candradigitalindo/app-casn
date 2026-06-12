'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Activity } from 'lucide-react';
import { useLocations } from '@/lib/hooks/useLocations';
import { LocationStatus } from '@/types/enums';

// Simple SVG-based map implementation (in production, use Mapbox or Leaflet)
interface LocationMapProps {
  filter?: {
    province?: string;
    status?: LocationStatus;
  };
  onLocationClick?: (locationId: string) => void;
}

export function LocationMap({ filter, onLocationClick }: LocationMapProps) {
  const { data, isLoading, error } = useLocations(filter);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Indonesia map boundaries (simplified)
  const mapBounds = {
    minX: 95,
    maxX: 141,
    minY: -11,
    maxY: 6,
  };

  const mapWidth = 800;
  const mapHeight = 400;

  // Convert lat/lng to SVG coordinates
  const projectToSvg = (lat: number, lng: number) => {
    const x = ((lng - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * mapWidth;
    const y = ((mapBounds.maxY - lat) / (mapBounds.maxY - mapBounds.minY)) * mapHeight;
    return { x, y };
  };

  const handleLocationClick = (locationId: string) => {
    setSelectedLocation(locationId);
    onLocationClick?.(locationId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peta Lokasi</CardTitle>
          <CardDescription>Memuat peta...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px] bg-gray-100 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peta Lokasi</CardTitle>
          <CardDescription>Gagal memuat peta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px] bg-red-50 rounded-lg flex items-center justify-center">
            <p className="text-red-900">Gagal memuat data lokasi</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const locations = data.data;

  // Count locations by status
  const statusCounts = locations.reduce((acc, loc) => {
    acc[loc.status] = (acc[loc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Peta Lokasi Nasional</CardTitle>
            <CardDescription>
              {locations.length} lokasi di 38 provinsi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Siap: {statusCounts[LocationStatus.READY] || 0}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Instalasi: {statusCounts[LocationStatus.INSTALLATION_IN_PROGRESS] || 0}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height: `${mapHeight}px` }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full bg-blue-50 rounded-lg border"
          >
            {/* Indonesia map outline (simplified) */}
            <path
              d="M 200 100 Q 300 80 400 100 T 600 120 T 750 150"
              stroke="#94a3b8"
              strokeWidth="2"
              fill="none"
              opacity="0.3"
            />

            {/* Grid lines for reference */}
            <g stroke="#e2e8f0" strokeWidth="1">
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={(i * mapHeight) / 4}
                  x2={mapWidth}
                  y2={(i * mapHeight) / 4}
                />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={(i * mapWidth) / 4}
                  y1="0"
                  x2={(i * mapWidth) / 4}
                  y2={mapHeight}
                />
              ))}
            </g>

            {/* Location markers */}
            {locations.map((location) => {
              const { x, y } = projectToSvg(location.latitude, location.longitude);
              const isSelected = selectedLocation === location.id;
              const statusColor = locationStatusColors[location.status]?.replace('bg-', 'fill-') || 'fill-gray-400';

              return (
                <g
                  key={location.id}
                  onClick={() => handleLocationClick(location.id)}
                  className="cursor-pointer transition-all hover:opacity-80"
                  transform={`translate(${x}, ${y})`}
                >
                  {/* Marker circle */}
                  <circle
                    r={isSelected ? 8 : 5}
                    className={statusColor}
                    stroke={isSelected ? '#000' : '#fff'}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      r={12}
                      fill="none"
                      stroke="#000"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                  )}

                  {/* Tooltip */}
                  {isSelected && (
                    <g transform="translate(-60, -50)">
                      <rect
                        width="120"
                        height="60"
                        rx="4"
                        fill="white"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <text
                        x="60"
                        y="20"
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="600"
                        fill="#1e293b"
                      >
                        {location.name}
                      </text>
                      <text
                        x="60"
                        y="40"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {location.city}, {location.province}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg border shadow-sm">
            <div className="text-xs font-semibold mb-2">Status Lokasi</div>
            <div className="space-y-1">
              {Object.entries({
                [LocationStatus.READY]: 'Siap',
                [LocationStatus.INSTALLATION_IN_PROGRESS]: 'Instalasi',
                [LocationStatus.PREPARATION]: 'Persiapan',
                [LocationStatus.CLOSED]: 'Ditutup',
              }).map(([status, label]) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      locationStatusColors[status as LocationStatus] || 'bg-gray-400'
                    }`}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zoom controls (simplified) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              className="h-8 w-8 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
              onClick={() => console.log('Zoom in')}
            >
              +
            </button>
            <button
              className="h-8 w-8 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
              onClick={() => console.log('Zoom out')}
            >
              −
            </button>
          </div>
        </div>

        {/* Selected location info */}
        {selectedLocation && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            {(() => {
              const loc = locations.find((l) => l.id === selectedLocation);
              if (!loc) return null;
              return (
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{loc.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {loc.city}, {loc.province}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kapasitas: {loc.capacity} peserta
                    </p>
                  </div>
                  <Badge variant="outline" className={locationStatusTextColors[loc.status]}>
                    {LocationStatusLabels[loc.status]}
                  </Badge>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper for status labels and colors
const LocationStatusLabels: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'Siap',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'Instalasi Berjalan',
  [LocationStatus.PREPARATION]: 'Persiapan',
  [LocationStatus.CLOSED]: 'Ditutup',
};

const locationStatusColors: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'bg-emerald-500',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'bg-amber-500',
  [LocationStatus.PREPARATION]: 'bg-slate-400',
  [LocationStatus.CLOSED]: 'bg-slate-300',
};

const locationStatusTextColors: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'text-amber-700 bg-amber-50 border-amber-200',
  [LocationStatus.PREPARATION]: 'text-slate-600 bg-slate-50 border-slate-200',
  [LocationStatus.CLOSED]: 'text-slate-500 bg-slate-50 border-slate-200',
};