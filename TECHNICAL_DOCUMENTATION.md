# DOKUMEN TEKNIS - SISTEM PENGELOLAAN PELAKSANAAN SELEKSI (CASN)
**Technical Architecture & Development Guide**

---

## 1. Sistem Arsitektur

### 1.1 Overall Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                             │
│                     (Nginx / AWS ALB)                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┬─────────────────┐
    │                │                │                 │
┌───▼────────┐  ┌───▼───────┐  ┌────▼────┐  ┌────────▼───┐
│   WEB APP   │  │  API      │  │   WS    │  │   WORKER   │
│  (Next.js)  │  │MONOLITH   │  │ (Socket) │  │  (BullMQ)  │
└─────────────┘  └───┬───────┘  └─────────┘  └─────┬──────┘
                     │                │                 │
    ┌────────────────┼────────────────┼─────────────────┤
    │                │                │                 │
┌───▼────────┐ ┌──▼──────┐ ┌─────▼─────┐ ┌──────────▼──┐
│   POSTGRES │ │  REDIS   │ │   MINIO    │ │  FCM/SMTP  │
│ (Primary)  │ │ (Cache)  │ │  (Files)   │ │  (Push)    │
└────────────┘ └──────────┘ └────────────┘ └────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                     │
│                    Offline-First Architecture                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Overall Architecture Diagram (Monolith)
```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                             │
│                     (Nginx / AWS ALB)                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┬─────────────────┐
    │                │                │                 │
┌───▼────────┐  ┌───▼───────┐  ┌────▼────┐  ┌────────▼───┐
│   WEB APP   │  │  API      │  │   WS    │  │   WORKER   │
│  (Next.js)  │  │MONOLITH   │  │ (Socket) │  │  (BullMQ)  │
└─────────────┘  └───┬───────┘  └─────────┘  └─────┬──────┘
                     │                │                 │
    ┌────────────────┼────────────────┼─────────────────┤
    │                │                │                 │
┌───▼────────┐ ┌──▼──────┐ ┌─────▼─────┐ ┌──────────▼──┐
│   POSTGRES │ │  REDIS   │ │   MINIO    │ │  FCM/SMTP  │
│ (Primary)  │ │ (Cache)  │ │  (Files)   │ │  (Push)    │
└────────────┘ └──────────┘ └────────────┘ └────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                     │
│                    Offline-First Architecture                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Monolith Application Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                    API MONOLITH (NestJS)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODULES                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Auth Module  │  │ Logistics    │  │ Location      │  │   │
│  │  │              │  │ Module       │  │ Module        │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Incident     │  │ Installation │  │ Attendance   │  │   │
│  │  │ Module       │  │ Module       │  │ Module        │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐                      │   │
│  │  │ Reporting    │  │ Notification │                      │   │
│  │  │ Module       │  │ Module       │                      │   │
│  │  └──────────────┘  └──────────────┘                      │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Shared: Prisma Service, Guards, Decorators, Utils, DTOs        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Kenapa Monolith?

Untuk sistem ini, **Monolith adalah pilihan yang lebih tepat** karena:

| Aspek | Monolith ✅ | Microservices ❌ |
|-------|-------------|-------------------|
| **Complexity** | Simpler, mudah dikembangkan | Lebih kompleks, perlu service mesh |
| **Deployment** | Satu container/artifact | Banyak deploy independently |
| **Database** | Single ACID transaction | Distributed transaction sulit |
| **Development** | Cepat, satu codebase | Lambat, banyak repo |
| **Scale** | Horizontal scaling cukup | Butuh load balancer kompleks |
| **Team Size** | 5-10 devs ideal | Butuh DevOps engineer |
| **Seasonality** | Sesuai (project temporary) | Overkill untuk seasonal |

Sistem CASN bersifat **seasonal** (periode seleksi saja), scale terukur (38 provinsi, ~5000 lokasi), dan timeline development terbatas. Monolith memungkinkan **faster time-to-market** dengan maintenance yang lebih simpel.

---

## 2. Technology Stack

### 2.1 Backend Services

| Layer | Technology | Justifikasi |
|-------|-----------|-------------|
| API Framework | **NestJS (Node.js)** | - TypeScript support<BR>- Modular architecture<BR>- Built-in DI & Guards<BR>- Easy testing |
| Language | **TypeScript 5.x** | Type safety, better DX |
| Database | **PostgreSQL 16** | - ACID compliance<BR>- JSONB support<BR>- Full-text search<BR>- Replication support |
| Cache Layer | **Redis 7.x** | Session store, pub/sub, rate limiting |
| ORM | **Prisma** | Type-safe queries, migrations |
| File Storage | **MinIO / S3** | Self-hosted S3-compatible |
| Job Queue | **BullMQ + Redis** | Background jobs, email, notifications |
| WebSocket | **Socket.io / NestJS Gateway** | Real-time updates, live monitoring |
| Load Balancer | **Nginx** | Reverse proxy, SSL termination |

### 2.2 Web Frontend

| Layer | Technology | Justifikasi |
|-------|-----------|-------------|
| Framework | **Next.js 15 (App Router)** | - SSR/SSG hybrid<BR>- API routes<BR>- Built-in optimization |
| UI Library | **shadcn/ui + Radix** | Accessible, customizable |
| State Management | **Zustand** | Simple, TypeScript-first |
| Data Fetching | **TanStack Query v5** | Caching, refetch, optimistic updates |
| Maps | **Mapbox GL JS / Leaflet** | Custom styling, markers |
| Charts | **Recharts / Chart.js** | Real-time metrics visualization |
| Form Validation | **Zod + React Hook Form** | Type-safe validation |

### 2.3 Mobile App

| Layer | Technology | Justifikasi |
|-------|-----------|-------------|
| Framework | **React Native + Expo** | Cross-platform, offline-first |
| State | **Zustand + Redux Persist** | Hydrated storage for offline |
| Storage | **Realm / SQLite** | Local DB for offline sync |
| Maps | **react-native-maps** | GPS tagging |
| Camera | **expo-camera / expo-image-picker** | Photo capture, geotagging |
| Barcode | **expo-camera (BarcodeScanner)** | Attendance scanning |
| Push Notif | **expo-notifications** | FCM/APNS integration |

### 2.4 DevOps & Infrastructure

| Layer | Technology |
|-------|-----------|
| Container | **Docker + Docker Compose** |
| Orchestration | **Kubernetes (Optional)** |
| CI/CD | **GitHub Actions / GitLab CI** |
| Monitoring | **Prometheus + Grafana** |
| Logging | **ELK Stack / Loki** |
| Error Tracking | **Sentry** |

---

## 3. Database Schema Design

### 3.1 Core Entities (ER Diagram)

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "has"
    USERS ||--o{ AUDIT_LOGS : "creates"
    LOCATIONS ||--o{ INSTALLATION_PROGRESS : "tracks"
    LOCATIONS ||--o{ INCIDENT_TICKETS : "has"
    LOCATIONS ||--o{ ATTENDANCE_LOGS : "records"
    LOCATIONS ||--o{ INVENTORY_CHECKLIST : "contains"
    
    USERS {
        uuid id PK
        string name
        string email
        string password
        enum role
        jsonb metadata
        timestamps
    }
    
    LOCATIONS {
        uuid id PK
        string province
        string city
        string name
        string address
        decimal lat
        decimal lng
        enum status
        uuid coordinator_id FK
        timestamps
    }
    
    INSTALLATION_PROGRESS {
        uuid id PK
        uuid location_id FK
        integer percentage
        enum milestone
        jsonb photo_evidence
        decimal geo_lat
        decimal geo_lng
        timestamps
    }
    
    INCIDENT_TICKETS {
        uuid id PK
        uuid location_id FK
        uuid assigned_to FK
        enum severity
        enum category
        text description
        enum status
        timestamp resolved_at
        integer sla_minutes
        timestamps
    }
    
    INVENTORY_ITEMS {
        uuid id PK
        string code
        string name
        string category
        integer standard_qty
        jsonb specifications
        timestamps
    }
    
    INVENTORY_CHECKLIST {
        uuid id PK
        uuid location_id FK
        uuid item_id FK
        integer expected_qty
        integer received_qty
        integer damaged_qty
        jsonb photo_evidence
        timestamps
    }
    
    LOGISTICS_SHIPMENTS {
        uuid id PK
        uuid origin_warehouse FK
        uuid destination_location FK
        enum status
        timestamp shipped_at
        timestamp arrived_at
        jsonb manifest_items
        timestamps
    }
    
    ATTENDANCE_LOGS {
        uuid id PK
        uuid location_id FK
        string participant_id
        string barcode_value
        timestamp scan_time
        uuid scanned_by FK
        enum session
        timestamps
    }
    
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb old_values
        jsonb new_values
        timestamp created_at
    }
```

### 3.2 Prisma Schema (Initial)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USERS & AUTH
// ============================================

enum UserRole {
  SUPER_ADMIN
  LOGISTICS
  COORDINATOR
  TECHNICAL_IT
  TECHNICAL_ELECTRICAL
  TECHNICAL_SARPRAS
  REGISTRAR
  SUPERVISOR
}

model User {
  id            String   @id @default(uuid_generate_v4())
  email         String   @unique
  password      String
  name          String
  phone         String?
  role          UserRole
  locationId    String?  @db.Uuid
  location      Location? @relation(fields: [locationId], references: [id])
  
  // Relations
  auditLogs     AuditLog[]
  assignedTickets IncidentTicket[]
  createdShipments  LogisticsShipment[]
  attendanceLogs    AttendanceLog[] @relation("ScannedBy")
  
  metadata      Json?
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([locationId])
  @@index([role])
}

// ============================================
// LOCATIONS
// ============================================

enum LocationStatus {
  PREPARATION
  INSTALLATION_IN_PROGRESS
  READY
  ACTIVE
  ISSUES
  CLOSED
}

model Location {
  id            String   @id @default(uuid_generate_v4())
  code          String   @unique
  name          String
  province      String
  city          String
  address       String
  latitude      Decimal  @db.Decimal(10, 8)
  longitude     Decimal  @db.Decimal(11, 8)
  
  coordinatorId String?  @db.Uuid
  coordinator   User?    @relation(fields: [coordinatorId], references: [id])
  
  status        LocationStatus @default(PREPARATION)
  capacity      Int      @default(0)
  
  // Relations
  installationProgress InstallationProgress[]
  inventoryChecklists  InventoryChecklist[]
  incidentTickets     IncidentTicket[]
  attendanceLogs      AttendanceLog[]
  shipments          LogisticsShipment[]
  
  metadata       Json?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([province, city])
  @@index([status])
  @@index([coordinatorId])
}

// ============================================
// INSTALLATION PROGRESS
// ============================================

enum InstallationMilestone {
  LAYOUT_20       // Tata letak ruangan & tenda
  INFRASTRUCTURE_50  // Listrik, jaringan, genset
  DEPLOYMENT_80   // Perangkat terpasang
  COMPLETED_100   // Uji coba & siap
}

model InstallationProgress {
  id            String   @id @default(uuid_generate_v4())
  locationId    String   @db.Uuid
  location      Location @relation(fields: [locationId], references: [id])
  
  milestone     InstallationMilestone
  percentage    Int      @default(0)
  notes         String?
  
  // Photo Evidence with Geotagging
  photos        Json?    // Array of {url, lat, lng, timestamp}
  
  // Completed By
  completedBy   String?  @db.Uuid
  completedAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([locationId, milestone])
  @@index([locationId])
}

// ============================================
// INCIDENT TICKETS
// ============================================

enum TicketSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketCategory {
  IT_SOFTWARE
  IT_HARDWARE
  ELECTRICAL
  NETWORK
  SARPRAS
  OTHER
}

enum TicketStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  ESCALATED
  CLOSED
}

model IncidentTicket {
  id            String   @id @default(uuid_generate_v4())
  ticketNumber  String   @unique
  
  locationId    String   @db.Uuid
  location      Location @relation(fields: [locationId], references: [id])
  
  // Reporter
  reportedBy    String   @db.Uuid
  reporterName  String
  
  // Assignment
  assignedTo    String?  @db.Uuid
  assignee      User?    @relation(fields: [assignedTo], references: [id])
  
  // Ticket Details
  severity      TicketSeverity
  category      TicketCategory
  status        TicketStatus @default(OPEN)
  
  title         String
  description   String
  photos        Json?
  
  // SLA
  slaMinutes    Int      @default(30)
  slaExpiresAt  DateTime
  resolvedAt    DateTime?
  resolutionNote String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([locationId, status])
  @@index([assignedTo])
  @@index([slaExpiresAt])
}

// ============================================
// INVENTORY
// ============================================

enum InventoryCategory {
  LAPTOP_CLIENT
  SERVER
  UPS
  NETWORK
  METAL_DETECTOR
  CCTV
  TENTA
  AC
  GENERATOR
  OTHER
}

model InventoryItem {
  id            String   @id @default(uuid_generate_v4())
  code          String   @unique
  name          String
  category      InventoryCategory
  standardQty   Int
  
  specifications Json?
  imageUrl      String?
  
  // Relations
  checklists    InventoryChecklist[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model InventoryChecklist {
  id            String   @id @default(uuid_generate_v4())
  locationId    String   @db.Uuid
  location      Location @relation(fields: [locationId], references: [id])
  
  itemId        String   @db.Uuid
  item          InventoryItem @relation(fields: [itemId], references: [id])
  
  expectedQty   Int
  receivedQty   Int      @default(0)
  damagedQty    Int      @default(0)
  missingQty    Int      @default(0)
  
  notes         String?
  photos        Json?
  
  verifiedBy    String?
  verifiedAt    DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([locationId, itemId])
  @@index([locationId])
}

// ============================================
// LOGISTICS
// ============================================

enum ShipmentStatus {
  PACKING
  IN_TRANSIT
  ARRIVED
  RECEIVED
  RETURNED
}

model LogisticsShipment {
  id            String   @id @default(uuid_generate_v4())
  shipmentNumber String  @unique
  
  originWarehouseId String @db.Uuid
  destinationLocationId String @db.Uuid
  destination   Location @relation(fields: [destinationLocationId], references: [id])
  
  createdById   String   @db.Uuid
  createdBy     User     @relation(fields: [createdById], references: [id])
  
  status        ShipmentStatus @default(PACKING)
  
  // Manifest
  manifestItems Json      // Array of {itemId, qty}
  
  // Tracking
  shippedAt     DateTime?
  arrivedAt     DateTime?
  receivedBy    String?
  receivedAt    DateTime?
  
  trackingNotes String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([destinationLocationId, status])
  @@index([originWarehouseId])
}

// ============================================
// ATTENDANCE
// ============================================

model AttendanceLog {
  id            String   @id @default(uuid_generate_v4())
  locationId    String   @db.Uuid
  location      Location @relation(fields: [locationId], references: [id])
  
  participantId String
  barcodeValue  String   @unique
  participantName String
  
  session       Int      // 1, 2, 3, etc
  scanTime      DateTime @default(now())
  
  scannedBy     String   @db.Uuid
  scanner       User     @relation("ScannedBy", fields: [scannedBy], references: [id])
  
  notes         String?
  
  createdAt     DateTime @default(now())

  @@index([locationId, session])
  @@index([barcodeValue])
  @@index([scanTime])
}

// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id            String   @id @default(uuid_generate_v4())
  userId        String   @db.Uuid
  user          User     @relation(fields: [userId], references: [id])
  
  action        String   // CREATE, UPDATE, DELETE, etc
  entityType    String   // Location, Ticket, etc
  entityId      String   @db.Uuid
  
  oldValues     Json?
  newValues     Json?
  ipAddress     String?
  userAgent     String?
  
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 4. API Design

### 4.1 API Structure (RESTful)

```
/api/v1/
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   └── GET    /me
│
├── /locations
│   ├── GET    /                    (List with filters)
│   ├── GET    /:id                 (Detail)
│   ├── GET    /:id/installations   (Installation progress)
│   ├── GET    /stats/summary       (National stats)
│   └── GET    /geo/boundaries      (Province boundaries)
│
├── /logistics
│   ├── GET    /shipments
│   ├── POST   /shipments
│   ├── PATCH  /shipments/:id/status
│   ├── GET    /inventory/items
│   ├── GET    /inventory/checklists/:locationId
│   └── POST   /inventory/checklists
│
├── /incidents
│   ├── GET    /tickets
│   ├── POST   /tickets
│   ├── PATCH  /tickets/:id/assign
│   ├── PATCH  /tickets/:id/status
│   └── GET    /tickets/sla/overdue
│
├── /installations
│   ├── GET    /progress/:locationId
│   ├── POST   /progress
│   ├── PATCH  /progress/:id
│   └── POST   /progress/:id/photos
│
├── /attendance
│   ├── GET    /logs/:locationId
│   ├── POST   /checkin
│   ├── GET    /stats/:locationId
│   └── GET    /staff/:locationId
│
└── /reports
    ├── GET    /summary/:locationId
    ├── GET    /incidents/:locationId
    ├── GET    /bap/:locationId       (Berita Acara Pelaksanaan)
    └── GET    /audit/:entity/:id
```

### 4.2 API Specification Examples

#### POST /api/v1/auth/login
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    deviceId: string;
    platform: 'web' | 'ios' | 'android';
  };
}

// Response
interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    locationId?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  permissions: string[];
}
```

#### GET /api/v1/locations
```typescript
interface LocationQuery {
  province?: string;
  city?: string;
  status?: LocationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

interface LocationsResponse {
  data: Location[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
  summary: {
    total: number;
    byStatus: Record<LocationStatus, number>;
    byProvince: Record<string, number>;
  };
}
```

#### POST /api/v1/incidents/tickets
```typescript
interface CreateTicketRequest {
  locationId: string;
  severity: TicketSeverity;
  category: TicketCategory;
  title: string;
  description: string;
  photos?: string[];  // S3 URLs
}

interface CreateTicketResponse {
  ticket: IncidentTicket;
  sla: {
    expiresAt: string;
    remainingMinutes: number;
  };
}
```

#### POST /api/v1/installations/progress
```typescript
interface UpdateProgressRequest {
  locationId: string;
  milestone: InstallationMilestone;
  percentage: number;
  notes?: string;
  photos: Array<{
    url: string;
    lat: number;
    lng: number;
    timestamp: string;
  }>;
}
```

---

## 5. Frontend Architecture

### 5.1 Project Structure (Next.js)

```
app-casn-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── locations/
│   │   │   ├── logistics/
│   │   │   ├── incidents/
│   │   │   ├── installations/
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── LocationMap.tsx
│   │   │   └── RealtimeTicker.tsx
│   │   ├── logistics/
│   │   ├── incidents/
│   │   └── installations/
│   │
│   ├── lib/
│   │   ├── api/                      # API Client
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── locations.ts
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLocations.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── ...
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── auth.ts
│   │   │   ├── locations.ts
│   │   │   └── incidents.ts
│   │   └── utils/
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── enums.ts
│   │
│   └── styles/
│
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

### 5.2 Key Components

#### LocationMap.tsx (Real-time Map)
```typescript
'use client';

import Map from 'mapbox-gl';
import { useEffect, useState } from 'react';
import { useLocations } from '@/lib/hooks/useLocations';

interface LocationMapProps {
  filter?: {
    province?: string;
    status?: LocationStatus;
  };
}

export function LocationMap({ filter }: LocationMapProps) {
  const { data: locations, isLoading } = useLocations({ 
    ...filter, 
    limit: 1000 
  });
  
  const [map, setMap] = useState<Map | null>(null);
  
  useEffect(() => {
    // Initialize Mapbox GL map
    const mapInstance = new Map({
      container: 'map-container',
      style: 'mapbox://styles/...',
      center: [118.0, -2.5], // Center of Indonesia
      zoom: 5
    });
    
    // Add markers for each location with color-coded status
    locations?.data.forEach((location) => {
      const marker = new Map.Marker({
        color: getStatusColor(location.status)
      })
      .setLngLat([location.longitude, location.latitude])
      .setPopup(new Map.Popup().setText(location.name))
      .addTo(mapInstance);
    });
    
    setMap(mapInstance);
    
    return () => mapInstance.remove();
  }, [locations]);
  
  if (isLoading) return <MapSkeleton />;
  
  return <div id="map-container" className="w-full h-screen" />;
}

function getStatusColor(status: LocationStatus): string {
  const colors = {
    READY: '#22c55e',      // Green
    ACTIVE: '#22c55e',
    INSTALLATION_IN_PROGRESS: '#eab308',  // Yellow
    ISSUES: '#ef4444',     // Red
    PREPARATION: '#6b7280', // Gray
    CLOSED: '#6b7280'
  };
  return colors[status] || '#6b7280';
}
```

### 5.3 State Management (Zustand)

```typescript
// stores/locations.ts
import { create } from 'zustand';
import { Location, LocationStatus } from '@/types/models';

interface LocationStore {
  locations: Location[];
  selectedLocation: Location | null;
  filters: {
    province?: string;
    status?: LocationStatus;
    search?: string;
  };
  
  setLocations: (locations: Location[]) => void;
  selectLocation: (location: Location | null) => void;
  updateFilters: (filters: Partial<LocationStore['filters']>) => void;
  updateLocationStatus: (id: string, status: LocationStatus) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  locations: [],
  selectedLocation: null,
  filters: {},
  
  setLocations: (locations) => set({ locations }),
  
  selectLocation: (location) => set({ selectedLocation: location }),
  
  updateFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  updateLocationStatus: (id, status) => set((state) => ({
    locations: state.locations.map((loc) =>
      loc.id === id ? { ...loc, status } : loc
    )
  }))
}));
```

---

## 6. Mobile App Architecture (React Native)

### 6.1 Project Structure

```
app-casn-mobile/
├── src/
│   ├── api/
│   │   ├── apiClient.ts          # Axios with interceptors
│   │   └── endpoints/
│   │
│   ├── stores/
│   │   ├── authStore.ts          # Auth state (persisted)
│   │   ├── syncStore.ts          # Sync queue for offline
│   │   └── locationStore.ts
│   │
│   ├── database/
│   │   ├── schema.ts             # Realm/SQLite schema
│   │   └── migrations/
│   │
│   ├── screens/
│   │   ├── auth/
│   │   ├── logistics/
│   │   │   ├── ShipmentList.tsx
│   │   │   └── InventoryChecklist.tsx
│   │   ├── installations/
│   │   │   ├── ProgressList.tsx
│   │   │   └── UpdateProgress.tsx  # With photo capture
│   │   ├── incidents/
│   │   │   ├── TicketList.tsx
│   │   │   └── CreateTicket.tsx
│   │   └── attendance/
│   │       └── BarcodeScanner.tsx
│   │
│   ├── components/
│   │   ├── OfflineBanner.tsx
│   │   ├── PhotoCapture.tsx
│   │   └── GeotaggedPhoto.tsx
│   │
│   ├── hooks/
│   │   ├── useNetInfo.ts         # Network connectivity
│   │   ├── useSyncManager.ts      # Background sync
│   │   └── useCamera.ts
│   │
│   └── utils/
│       ├── sync.ts               # Sync logic
│       └── geotagging.ts         # GPS helpers
│
├── App.tsx
├── package.json
└── app.json
```

### 6.2 Offline-First Sync Strategy

```typescript
// utils/sync.ts
import { syncStore } from '@/stores/syncStore';
import { apiClient } from '@/api/apiClient';
import { NetInfo } from '@/hooks/useNetInfo';

interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class SyncManager {
  async queue(operation: SyncOperation) {
    await syncStore.addOperation(operation);
    
    if (NetInfo.isConnected) {
      await this.processQueue();
    }
  }
  
  async processQueue() {
    const operations = await syncStore.getPendingOperations();
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case 'CREATE':
            await apiClient.post(op.endpoint, op.payload);
            break;
          case 'UPDATE':
            await apiClient.patch(`${op.endpoint}/${op.payload.id}`, op.payload);
            break;
          case 'DELETE':
            await apiClient.delete(`${op.endpoint}/${op.payload.id}`);
            break;
        }
        
        await syncStore.markAsSynced(op.id);
      } catch (error) {
        await syncStore.incrementRetry(op.id);
      }
    }
  }
  
  async syncFromServer(lastSyncTime: number) {
    const response = await apiClient.get('/sync/changes', {
      params: { since: lastSyncTime }
    });
    
    // Apply changes to local database
    for (const change of response.data) {
      await this.applyChange(change);
    }
    
    return response.data.serverTimestamp;
  }
}

export const syncManager = new SyncManager();
```

### 6.3 Photo Capture with Geotagging

```typescript
// components/PhotoCapture.tsx
import { useState } from 'react';
import { View, Button, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface GeotaggedPhoto {
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function PhotoCapture({ onCapture }: { onCapture: (photo: GeotaggedPhoto) => void }) {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const takePhoto = async () => {
    setIsCapturing(true);
    
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission required for geotagging');
        return;
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: true  // Preserve EXIF data
      });
      
      if (!result.canceled && result.assets[0]) {
        onCapture({
          uri: result.assets[0].uri,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now()
        });
      }
    } finally {
      setIsCapturing(false);
    }
  };
  
  return (
    <Button
      title={isCapturing ? 'Capturing...' : 'Take Photo'}
      onPress={takePhoto}
      disabled={isCapturing}
    />
  );
}
```

---

## 7. Security Considerations
### 7.1 Authentication & Authorization

Sistem menggunakan **Role-Based Access Control (RBAC)** untuk memastikan integritas data. Setiap role memiliki tingkat akses yang berbeda:

| Role | Deskripsi Akses |
|------|-----------------|
| **SUPER_ADMIN** | Akses penuh (Read/Write) ke seluruh sistem dan manajemen pengguna. |
| **LOGISTICS** | Read/Write pada modul Logistik, Inventory, dan Pengiriman. |
| **COORDINATOR** | Read/Write pada lokasi yang ditugaskan, manajemen tim teknis, dan dokumen lokasi. |
| **TECHNICAL_*** | Read/Write pada modul Instalasi dan update status tiket insiden. |
| **SUPERVISOR (Pengawas)** | **View-Only** pada hampir seluruh modul (Locations, Logistics, Installations, Attendance, Documents) untuk keperluan monitoring. Diberikan akses **Write** khusus untuk pembuatan tiket pada modul **Incidents**. |

#### Implementasi Guard (NestJS)
```typescript
// auth/guards/role.guard.ts
...
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';

export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    );
    
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.some((role) => user.role === role);
  }
}

// Usage in controller
@Controller('logistics')
export class LogisticsController {
  @Post('shipments')
  @Roles(UserRole.LOGISTICS, UserRole.SUPER_ADMIN)
  createShipment(@Body() dto: CreateShipmentDto) {
    // Only logistics and super admin can create shipments
  }
}
```

### 7.2 Audit Trail Middleware

```typescript
// audit/audit.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private auditLogService: AuditLogService) {}
  
  async use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send;
    
    res.send = function (data) {
      // Log the action after response
      if (req.user && ['POST', 'PATCH', 'DELETE'].includes(req.method)) {
        auditLogService.create({
          userId: req.user.id,
          action: req.method,
          entityType: this.extractEntityType(req.url),
          entityId: this.extractEntityId(req.url),
          oldValues: req.body.oldValues,
          newValues: req.body,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      return originalSend.call(this, data);
    }.bind(this);
    
    next();
  }
}
```

### 7.3 Rate Limiting

```typescript
// common/guards/throttle.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

export class CustomThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.id || req.ip;
  }
}
```

---

## 8. Real-time Features

### 8.1 WebSocket Implementation

```typescript
// websocket/gateway/locations.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/locations'
})
export class LocationsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  
  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }
  
  // Broadcast location status update to all connected clients
  broadcastLocationUpdate(locationId: string, data: any) {
    this.server.emit('location:updated', {
      locationId,
      ...data
    });
  }
  
  // Broadcast new incident ticket
  broadcastNewTicket(ticket: IncidentTicket) {
    this.server.emit('ticket:created', ticket);
  }
  
  // Join specific location room
  @SubscribeMessage('join:location')
  handleJoinLocation(client: Socket, locationId: string) {
    client.join(`location:${locationId}`);
  }
}

// Usage in service
@Injectable()
export class IncidentService {
  constructor(private locationsGateway: LocationsGateway) {}
  
  async createTicket(dto: CreateTicketDto) {
    const ticket = await this.prisma.incidentTicket.create({ ... });
    
    // Notify all connected clients
    this.locationsGateway.broadcastNewTicket(ticket);
    
    return ticket;
  }
}
```

### 8.2 Push Notifications

```typescript
// notification/services/push.service.ts
import * as admin from 'firebase-admin';

export class PushNotificationService {
  async sendToUser(userId: string, notification: {
    title: string;
    body: string;
    data?: any;
  }) {
    const userTokens = await this.getUserTokens(userId);
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      tokens: userTokens
    };
    
    await admin.messaging().sendMulticast(message);
  }
  
  async notifySLAOverdue(ticket: IncidentTicket) {
    const escalateTo = await this.getEscalationUsers(ticket.locationId);
    
    for (const user of escalateTo) {
      await this.sendToUser(user.id, {
        title: 'SLA Warning',
        body: `Ticket #${ticket.ticketNumber} is approaching SLA limit`,
        data: { ticketId: ticket.id, type: 'SLA_WARNING' }
      });
    }
  }
}
```

---

## 9. Development Phases

### Phase 1: Foundation (Minggu 1-3)
**Target: Core infrastructure & authentication**

- [ ] Project setup (Web + Mobile + API)
- [ ] Database schema & Prisma migrations
- [ ] Authentication system (JWT, refresh tokens)
- [ ] Role-based access control
- [ ] Basic API structure
- [ ] Audit logging foundation

**Deliverables:**
- Login/logout functionality
- User management (CRUD)
- API documentation (Swagger)

---

### Phase 2: Logistics Module (Minggu 4-6)
**Target: Inventory & shipment tracking**

- [ ] Inventory items management
- [ ] Shipment creation & tracking
- [ ] Digital checklist (Web & Mobile)
- [ ] Photo upload with geotagging
- [ ] Buffer stock dashboard

**Deliverables:**
- Shipment list & detail pages
- Mobile checklist screen
- Inventory tracking dashboard

---

### Phase 3: Installation Tracking (Minggu 7-9)
**Target: Progress monitoring**

- [ ] Milestone definition
- [ ] Progress update API
- [ ] Photo evidence validation
- [ ] Delay alerts system
- [ ] Real-time map integration

**Deliverables:**
- Installation progress dashboard
- Mobile progress update screen
- Map with color-coded locations

---

### Phase 4: Incident Management (Minggu 10-12)
**Target: Ticket system & SLA**

- [ ] Ticket creation (Web & Mobile)
- [ ] Auto-assignment logic
- [ ] SLA tracking & escalation
- [ ] Ticket status workflow
- [ ] Push notifications

**Deliverables:**
- Ticket list & kanban view
- Mobile ticket creation
- SLA monitoring dashboard
- Push notification system

---

### Phase 5: Attendance & Monitoring (Minggu 13-15)
**Target: Real-time command center**

- [ ] Barcode scanner integration
- [ ] Attendance logging
- [ ] Real-time metrics dashboard
- [ ] Live map updates
- [ ] WebSocket infrastructure

**Deliverables:**
- Attendance scanning mobile app
- Real-time command center
- Live statistics

---

### Phase 6: Reporting & Testing (Minggu 16-18)
**Target: Reports & quality assurance**

- [ ] Berita Acara generation
- [ ] Export functionality (PDF/Excel)
- [ ] Audit trail viewer
- [ ] Load testing
- [ ] Security audit

**Deliverables:**
- Report generation module
- Test report & bug fixes
- Security audit results

---

## 10. Deployment Strategy

### 10.1 Docker Compose Setup (Monolith)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: casn_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: casn_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U casn_user"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  # Redis (Cache & Queue)
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
  
  # API MONOLITH (NestJS)
  api:
    build: ./apps/api
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://casn_user:${DB_PASSWORD}@postgres:5432/casn_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      FCM_SERVICE_ACCOUNT_KEY: ${FCM_KEY}
      PORT: 4000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      minio:
        condition: service_started
  
  # Web App (Next.js)
  web-app:
    build: ./apps/web-app
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:4000
      NEXT_PUBLIC_WS_URL: ws://api:4000
    depends_on:
      - api
  
  # Nginx (Load Balancer & Reverse Proxy)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web-app

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 10.2 Project Structure (Monolith)

```
app-casn/
├── apps/
│   ├── api/                     # NestJS Monolith API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # Authentication & Authorization
│   │   │   │   ├── users/       # User management
│   │   │   │   ├── locations/   # Location management
│   │   │   │   ├── logistics/   # Logistics & inventory
│   │   │   │   ├── installations/ # Installation progress
│   │   │   │   ├── incidents/   # Ticket management
│   │   │   │   ├── attendance/  # Attendance tracking
│   │   │   │   ├── reports/     # Reporting module
│   │   │   │   └── notifications/ # Push notifications
│   │   │   ├── common/
│   │   │   │   ├── guards/      # Auth guards
│   │   │   │   ├── decorators/  # Custom decorators
│   │   │   │   ├── filters/     # Exception filters
│   │   │   │   ├── interceptors/ # Logging, transform
│   │   │   │   ├── pipes/       # Validation pipes
│   │   │   │   └── dto/         # Shared DTOs
│   │   │   ├── database/        # Prisma service
│   │   │   ├── config/          # Configuration
│   │   │   ├── websocket/       # Socket.io gateway
│   │   │   ├── queue/           # BullMQ workers
│   │   │   ├── main.ts          # Entry point
│   │   │   └── app.module.ts    # Root module
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web-app/                 # Next.js Frontend
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── next.config.js
│
├── mobile/                       # React Native Mobile App
│   ├── src/
│   ├── package.json
│   └── app.json
│
├── docker-compose.yml
├── nginx.conf
├── package.json                 # Root package.json
└── turbo.json                   # Turborepo config (optional)
```

### 10.2 CI/CD Pipeline (Monolith)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push API image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/api
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/casn-api:latest
            ${{ secrets.REGISTRY_URL }}/casn-api:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.REGISTRY_URL }}/casn-api:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_URL }}/casn-api:buildcache,mode=max

      - name: Build and push Web App image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/web-app
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/casn-web:latest
            ${{ secrets.REGISTRY_URL }}/casn-web:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          # Pull latest images
          docker-compose -f docker-compose.staging.yml pull
          # Restart services
          docker-compose -f docker-compose.staging.yml up -d
          # Run migrations
          docker-compose -f docker-compose.staging.yml exec api npx prisma migrate deploy

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          # SSH to production server
          ssh ${{ secrets.PROD_SERVER }} << 'EOF'
            cd /app/casn
            docker-compose pull api web-app
            docker-compose up -d api web-app
            docker-compose exec api npx prisma migrate deploy
          EOF

      - name: Run health check
        run: |
          curl -f ${{ secrets.API_URL }}/health || exit 1
```

### 10.3 Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        least_conn;
        server api:4000;
    }

    upstream web_app {
        server web-app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

    server {
        listen 80;
        server_name _;

        # API endpoints
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket
        location /ws {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
        }

        # Next.js app
        location / {
            proxy_pass http://web_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check
        location /health {
            proxy_pass http://api/health;
            access_log off;
        }
    }

    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Same location blocks as above
    }
}
```

---

## 11. API Documentation Strategy

### 11.1 Swagger/OpenAPI Integration

NestJS memiliki integrasi bawaan dengan Swagger. Gunakan untuk auto-generated documentation.

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('CASN Selection Management API')
    .setDescription('API documentation for CASN Selection Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Locations', 'Location management endpoints')
    .addTag('Logistics', 'Logistics and inventory endpoints')
    .addTag('Incidents', 'Incident ticket management endpoints')
    .addTag('Installations', 'Installation progress tracking endpoints')
    .addTag('Attendance', 'Attendance and check-in endpoints')
    .addTag('Reports', 'Reporting and analytics endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(4000);
}
```

### 11.2 API Documentation Standards

Setiap endpoint harus didokumentasikan dengan:

```typescript
// Example: incidents.controller.ts
@Controller('incidents')
@ApiTags('Incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  @Post()
  @ApiOperation({ summary: 'Create a new incident ticket' })
  @ApiCreatedResponse({ description: 'Ticket created successfully', type: IncidentTicket })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  createTicket(
    @Body() dto: CreateTicketDto,
    @Request() req,
  ) {
    return this.incidentsService.create(dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiOkResponse({ type: IncidentTicket })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }
}
```

### 11.3 DTO Validation Documentation

```typescript
// create-ticket.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Location ID where the incident occurred',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description: 'Severity level of the incident',
    enum: TicketSeverity,
    example: TicketSeverity.HIGH
  })
  @IsEnum(TicketSeverity)
  severity: TicketSeverity;

  @ApiProperty({
    description: 'Category of the incident',
    enum: TicketCategory,
    example: TicketCategory.IT_HARDWARE
  })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiProperty({
    description: 'Brief title of the incident',
    example: 'Server tidak bisa booting'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the incident',
    example: 'Server di ruang 3 tidak bisa booting setelah padam listrik'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Array of photo URLs showing the issue',
    required: false,
    type: [String]
  })
  photos?: string[];
}
```

---

## 12. Testing Strategy

### 12.1 Testing Pyramid

```
            ┌────────────────┐
            │   E2E Tests    │  ← 5% - Critical flows only
            │   (Playwright) │
            ├────────────────┤
            │ Integration    │  ← 15% - API endpoints
            │    Tests       │     (Jest + Supertest)
            ├────────────────┤
            │  Unit Tests    │  ← 80% - Services, Guards, DTOs
            │    (Jest)      │
            └────────────────┘
```

### 12.2 Unit Tests

Target coverage: **80%+**

```typescript
// incidents.service.spec.ts
describe('IncidentsService', () => {
  let service: IncidentsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new IncidentsService(prisma);
  });

  describe('createTicket', () => {
    it('should create a ticket with SLA calculation', async () => {
      const dto: CreateTicketDto = {
        locationId: 'loc-1',
        severity: TicketSeverity.HIGH,
        category: TicketCategory.IT_HARDWARE,
        title: 'Server down',
        description: 'Server tidak bisa booting'
      };

      prisma.incidentTicket.create.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'INC-001',
        ...dto,
        slaExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
      } as any);

      const result = await service.create(dto, 'user-1');

      expect(result.ticketNumber).toMatch(/^INC-\d+$/);
      expect(prisma.incidentTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: TicketSeverity.HIGH,
          slaMinutes: 30
        })
      });
    });

    it('should calculate different SLA based on severity', () => {
      expect(service.calculateSLA(TicketSeverity.CRITICAL)).toBe(15);
      expect(service.calculateSLA(TicketSeverity.HIGH)).toBe(30);
      expect(service.calculateSLA(TicketSeverity.MEDIUM)).toBe(60);
      expect(service.calculateSLA(TicketSeverity.LOW)).toBe(120);
    });
  });

  describe('escalateOverdueTickets', () => {
    it('should escalate tickets past SLA', async () => {
      const overdueTicket = {
        id: 'ticket-1',
        status: TicketStatus.ASSIGNED,
        slaExpiresAt: new Date(Date.now() - 1000)
      };

      prisma.incidentTicket.findMany.mockResolvedValue([overdueTicket] as any);
      prisma.incidentTicket.update.mockResolvedValue(overdueTicket as any);

      await service.escalateOverdueTickets();

      expect(prisma.incidentTicket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { status: TicketStatus.ESCALATED }
      });
    });
  });
});
```

### 12.3 Integration Tests

```typescript
// incidents.e2e-spec.ts
describe('Incidents API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /incidents/tickets', () => {
    it('should create a ticket', () => {
      return request(app.getHttpServer())
        .post('/incidents/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: testLocationId,
          severity: 'HIGH',
          category: 'IT_HARDWARE',
          title: 'Test ticket',
          description: 'Test description'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.ticketNumber).toMatch(/^INC-\d+$/);
          expect(res.body).toHaveProperty('slaExpiresAt');
        });
    });

    it('should return 400 for invalid input', () => {
      return request(app.getHttpServer())
        .post('/incidents/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          locationId: 'invalid-id',
          severity: 'INVALID'
        })
        .expect(400);
    });
  });
});
```

### 12.4 E2E Tests (Playwright)

```typescript
// e2e/flow/critical-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical Flow: Day-H Operations', () => {
  test('Complete incident resolution flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'koordinator@casn.go.id');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to location
    await page.click('[data-testid="location-card"]');
    await expect(page).toHaveURL(/\/locations\/.+/);

    // Create incident ticket
    await page.click('[data-testid="create-ticket-btn"]');
    await page.selectOption('[name="severity"]', 'HIGH');
    await page.selectOption('[name="category"]', 'IT_HARDWARE');
    await page.fill('[name="title"]', 'Server Down');
    await page.fill('[name="description"]', 'Detail masalah...');
    await page.click('button[type="submit"]');

    // Verify ticket created
    await expect(page.locator('[data-testid="ticket-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-number"]')).toContainText('INC-');

    // Simulate technician assignment (via WebSocket event handled)
    // ... additional flow steps
  });
});
```

### 12.5 Load Testing (Katalog)

Karena sistem ini akan mengalami **peak load di hari-H**, lakukan load testing:

```typescript
// load-tests/incidents-load.test.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at peak (simulasi jam sibuk)
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.05'],   // Error rate < 5%
  },
};

export default function () {
  const payload = JSON.stringify({
    locationId: 'test-location',
    severity: 'MEDIUM',
    category: 'IT_SOFTWARE',
    title: 'Test ticket',
    description: 'Load test ticket'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  };

  const res = http.post('http://api:4000/incidents/tickets', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 13. Error Handling & Logging Strategy

### 13.1 Standard Error Response Format

```typescript
// common/dto/error-response.dto.ts
export class ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  errors?: ValidationError[];
  requestId: string;
  timestamp: string;
  path: string;
}

interface ValidationError {
  field: string;
  message: string;
  constraint?: string;
}

// Example response:
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "field": "locationId",
      "message": "Location not found",
      "constraint": "exists"
    }
  ],
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-06-15T10:30:00Z",
  "path": "/api/incidents/tickets"
}
```

### 13.2 Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
      errors: (message as any).errors || undefined,
      requestId: request.id || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error
    this.logError(errorResponse, exception, request);

    response.status(status).json(errorResponse);
  }

  private logError(response: any, exception: any, request: Request) {
    const logger = new Logger('HttpException');
    logger.error({
      ...response,
      stack: exception instanceof Error ? exception.stack : undefined,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
  }

  private generateRequestId(): string {
    return uuidv4();
  }
}
```

### 13.3 Business Exception Handling

```typescript
// common/exceptions/business.exception.ts
export class BusinessRuleException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message,
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

// Usage example
export class IncidentsService {
  async assignTicket(ticketId: string, technicianId: string) {
    const ticket = await this.prisma.incidentTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BusinessRuleException(
        'Ticket cannot be assigned',
        { currentStatus: ticket.status }
      );
    }

    if (ticket.slaExpiresAt < new Date()) {
      throw new BusinessRuleException(
        'Ticket SLA has expired, escalation required'
      );
    }

    // ... proceed with assignment
  }
}
```

### 13.4 Structured Logging

```typescript
// common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const transports = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return `${timestamp} [${context}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          })
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ];

    this.logger = winston.createLogger({ transports });
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context, ...meta });
  }
}
```

### 13.5 Request Logging Middleware

```typescript
// common/middleware/logging.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip}`
      );
    });

    next();
  }
}
```

---

## 14. Performance & Caching Strategy

### 14.1 Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    L1: In-Memory (Per Request)               │
│                    - Request-scoped data                     │
│                    - Computed aggregates                     │
├─────────────────────────────────────────────────────────────┤
│                    L2: Redis (Shared)                        │
│                    - Session data                            │
│                    - API responses                           │
│                    - Real-time counters                      │
├─────────────────────────────────────────────────────────────┤
│                    L3: Database Query Cache                   │
│                    - Repeated queries                        │
│                    - Materialized views                      │
├─────────────────────────────────────────────────────────────┤
│                    L4: CDN (Static Assets)                   │
│                    - Images                                  │
│                    - Documents                               │
│                    - Frontend bundles                        │
└─────────────────────────────────────────────────────────────┘
```

### 14.2 Redis Cache Implementation

```typescript
// common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cacheKey';
export const CACHE_TTL = 'cacheTTL';

export const Cache = (key: string, ttl: number = 300) =>
  SetMetadata(CACHE_KEY, { key, ttl });

// common/interceptors/cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Skip cache for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.getCacheKey(request);
    
    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.setex(cacheKey, 300, JSON.stringify(data));
      })
    );
  }

  private getCacheKey(request: Request): string {
    return `cache:${request.url}:${JSON.stringify(request.query)}`;
  }
}
```

### 14.3 Cache Usage Examples

```typescript
// locations.controller.ts
@Controller('locations')
export class LocationsController {
  @Get()
  @Cache('locations:list', 60) // Cache for 60 seconds
  async findAll(@Query() query: LocationQuery) {
    return this.locationsService.findAll(query);
  }

  @Get('stats/summary')
  @Cache('locations:stats:summary', 30) // Cache for 30 seconds
  async getNationalSummary() {
    return this.locationsService.getNationalSummary();
  }

  @Get(':id')
  @Cache('location:detail', 300) // Cache for 5 minutes
  async findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }
}
```

### 14.4 Database Query Optimization

```typescript
// locations.service.ts
export class LocationsService {
  // ❌ BAD: N+1 query problem
  async getLocationsWithIncidentsBad() {
    const locations = await this.prisma.location.findMany();
    for (const loc of locations) {
      loc.incidents = await this.prisma.incidentTicket.findMany({
        where: { locationId: loc.id }
      });
    }
    return locations;
  }

  // ✅ GOOD: Single query with include
  async getLocationsWithIncidentsGood() {
    return this.prisma.location.findMany({
      include: {
        incidentTickets: {
          where: { status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED] } }
        },
        installationProgress: true,
        coordinator: {
          select: { id: true, name: true, phone: true }
        }
      }
    });
  }

  // ✅ BETTER: Select only needed fields
  async getLocationsForMap() {
    return this.prisma.location.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        province: true
      }
    });
  }
}
```

### 14.5 Pagination Strategy

```typescript
// common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// Usage in controller
@Get()
async findAll(@Query() pagination: PaginationDto) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.location.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    this.prisma.location.count()
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

---

## 15. Offline Sync Strategy (Mobile)

### 15.1 Sync Conflict Resolution Rules

| Entity Type | Conflict Resolution | Rationale |
|-------------|---------------------|------------|
| Installation Progress | Last-Write-Wins | Updates are incremental |
| Incident Tickets | Server-Wins | Critical data, no overwrite |
| Attendance Check-in | Server-Wins | Cannot duplicate check-in |
| Inventory Checklist | Last-Write-Wins | Updates can be merged |
| Location Status | Server-Wins | Authority is central |

### 15.2 Sync Queue Implementation

```typescript
// mobile/stores/syncStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncOperation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

interface SyncStore {
  queue: SyncOperation[];
  isSyncing: boolean;
  lastSyncAt: number | null;
  
  addOperation: (op: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>) => void;
  removeOperation: (id: string) => void;
  incrementRetry: (id: string, error: string) => void;
  setSyncing: (isSyncing: boolean) => void;
  updateLastSync: (timestamp: number) => void;
  clearQueue: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  queue: [],
  isSyncing: false,
  lastSyncAt: null,

  addOperation: (op) => {
    const operation: SyncOperation = {
      ...op,
      id: `${Date.now()}-${Math.random()}`,
      createdAt: Date.now(),
      retryCount: 0
    };
    set((state) => ({ queue: [...state.queue, operation] }));
    AsyncStorage.setItem('syncQueue', JSON.stringify(get().queue));
  },

  removeOperation: (id) => {
    set((state) => ({
      queue: state.queue.filter((op) => op.id !== id)
    }));
    AsyncStorage.setItem('syncQueue', JSON.stringify(get().queue));
  },

  incrementRetry: (id, error) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.id === id
          ? { ...op, retryCount: op.retryCount + 1, lastError: error }
          : op
      )
    }));
    AsyncStorage.setItem('syncQueue', JSON.stringify(get().queue));
  },

  setSyncing: (isSyncing) => set({ isSyncing: isSyncing }),
  
  updateLastSync: (timestamp) => set({ lastSyncAt: timestamp }),
  
  clearQueue: () => {
    set({ queue: [] });
    AsyncStorage.removeItem('syncQueue');
  }
}));
```

### 15.3 Sync Manager

```typescript
// mobile/services/syncManager.ts
import NetInfo from '@react-native-community/netinfo';
import { useSyncStore } from '../stores/syncStore';
import { apiClient } from './apiClient';

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  startAutoSync(intervalMs: number = 30000) { // 30 seconds
    this.stopAutoSync();
    
    this.syncInterval = setInterval(async () => {
      const isConnected = await NetInfo.fetch().then(
        (state) => state.isConnected
      );
      
      if (isConnected && !this.isProcessing) {
        await this.processQueue();
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    useSyncStore.getState().setSyncing(true);

    try {
      const queue = [...useSyncStore.getState().queue];
      
      for (const operation of queue) {
        if (operation.retryCount >= 3) {
          // Skip after 3 retries
          useSyncStore.getState().removeOperation(operation.id);
          continue;
        }

        try {
          await this.executeOperation(operation);
          useSyncStore.getState().removeOperation(operation.id);
        } catch (error) {
          useSyncStore.getState().incrementRetry(
            operation.id,
            (error as any).message
          );
        }
      }

      // Fetch server changes
      await this.syncFromServer();
      
      useSyncStore.getState().updateLastSync(Date.now());
    } finally {
      this.isProcessing = false;
      useSyncStore.getState().setSyncing(false);
    }
  }

  private async executeOperation(op: SyncOperation) {
    switch (op.method) {
      case 'POST':
        return apiClient.post(op.endpoint, op.payload);
      case 'PATCH':
        return apiClient.patch(op.endpoint, op.payload);
      case 'DELETE':
        return apiClient.delete(op.endpoint);
    }
  }

  private async syncFromServer() {
    const lastSync = useSyncStore.getState().lastSyncAt || 0;
    
    const response = await apiClient.get('/sync/changes', {
      params: { since: lastSync }
    });

    // Apply changes to local database
    for (const change of response.data.changes) {
      await this.applyChange(change);
    }
  }

  private async applyChange(change: any) {
    // Implementation depends on local database
    // This would update Realm/SQLite with server changes
  }
}

export const syncManager = new SyncManager();
```

### 15.4 Offline-First Component

```typescript
// mobile/components/OfflineBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSyncStore } from '../stores/syncStore';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(false);
  const { queue, isSyncing } = useSyncStore();

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (!isOffline && queue.length === 0) return null;

  return (
    <View style={[
      styles.banner,
      isOffline ? styles.offline : styles.syncing
    ]}>
      <Text style={styles.text}>
        {isOffline
          ? '🔴 Offline Mode - Data akan disinkronkan saat online'
          : `🔄 Syncing ${queue.length} items...`
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  syncing: {
    backgroundColor: '#f59e0b',
  },
  text: {
    color: 'white',
    fontWeight: '600',
  },
});
```

---

## 16. Environment Management

### 16.1 Environment Configuration

```bash
# Directory structure
apps/api/
├── .env.development       # Local development
├── .env.staging           # Staging/UAT
├── .env.production        # Production
└── .env.example           # Template for developers
```

### 16.2 Environment Variables Template

```bash
# .env.example

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:3000,http://localhost:19006

# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://casn_user:password@localhost:5432/casn_db"
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=

# ============================================
# JWT
# ============================================
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# ============================================
# MINIO / S3
# ============================================
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="casn-uploads"
MINIO_USE_SSL=false

# ============================================
# FCM / PUSH NOTIFICATIONS
# ============================================
FCM_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# ============================================
# SMTP (Email)
# ============================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_ENABLE_MAPS=true
FEATURE_ENABLE_PUSH_NOTIFICATIONS=true
FEATURE_ENABLE_OFFLINE_SYNC=true
FEATURE_NEW_REPORTING=false

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=debug
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# ============================================
# RATE LIMITING
# ============================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 16.3 Configuration Service

```typescript
// common/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private config: NestConfigService) {}

  // Application
  get nodeEnv(): string {
    return this.config.get('NODE_ENV', 'development');
  }

  get port(): number {
    return this.config.get('PORT', 4000);
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database
  get databaseUrl(): string {
    return this.config.get('DATABASE_URL');
  }

  // JWT
  get jwtSecret(): string {
    return this.config.get('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.config.get('JWT_EXPIRES_IN', '1h');
  }

  // Feature Flags
  get featureFlags(): Record<string, boolean> {
    return {
      enableMaps: this.config.get('FEATURE_ENABLE_MAPS', 'true') === 'true',
      enablePushNotifications: this.config.get('FEATURE_ENABLE_PUSH_NOTIFICATIONS', 'true') === 'true',
      enableOfflineSync: this.config.get('FEATURE_ENABLE_OFFLINE_SYNC', 'true') === 'true',
      newReporting: this.config.get('FEATURE_NEW_REPORTING', 'false') === 'true',
    };
  }
}
```

### 16.4 Environment-Specific Configurations

```typescript
// config/configuration.ts
export default () => ({
  // ... existing config

  // Development overrides
  development: {
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/casn_dev',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    logging: {
      level: 'debug',
    },
  },

  // Staging overrides
  staging: {
    database: {
      url: process.env.DATABASE_URL,
      poolMin: 5,
      poolMax: 20,
    },
    logging: {
      level: 'info',
    },
  },

  // Production overrides
  production: {
    database: {
      url: process.env.DATABASE_URL,
      poolMin: 10,
      poolMax: 50,
    },
    logging: {
      level: 'warn',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: 'production',
    },
  },
});
```

---

## 17. Backup & Recovery Strategy

### 17.1 Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

# Configuration
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="casn_db_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Perform backup
docker-compose exec -T postgres pg_dump -U casn_user casn_db | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

# Upload to S3 (optional)
aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://casn-backups/database/

# Clean old backups
find ${BACKUP_DIR} -name "casn_db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### 17.2 Automated Backup Schedule

```yaml
# Add to docker-compose.yml
services:
  backup-scheduler:
    image: docker:24-dind
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./scripts:/scripts
      - backup_data:/backups
    environment:
      - BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
      - RETENTION_DAYS=30
    command: >
      sh -c "
        apk add --no-cache dcron &&
        echo '${BACKUP_SCHEDULE} /scripts/backup-database.sh >> /var/log/backup.log 2>&1' | crontab -
      "
```

### 17.3 Point-in-Time Recovery

```sql
-- PostgreSQL allows point-in-time recovery (PITR)
-- Configure in postgresql.conf:

wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
max_wal_senders = 3
```

### 17.4 Recovery Procedure

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-database.sh <backup_file>"
  exit 1
fi

# Stop application
docker-compose stop api

# Drop existing database
docker-compose exec -T postgres psql -U casn_user -c "DROP DATABASE IF EXISTS casn_db;"

# Create new database
docker-compose exec -T postgres psql -U casn_user -c "CREATE DATABASE casn_db;"

# Restore from backup
gunzip -c ${BACKUP_FILE} | docker-compose exec -T postgres psql -U casn_user casn_db

# Restart application
docker-compose start api

echo "Restore completed from: ${BACKUP_FILE}"
```

---

## 18. Mobile App Distribution Strategy

### 18.1 Android Distribution

```yaml
# Google Play Console - Internal Testing Track
# Untuk testing internal sebelum production

apps/android/
├── app/
│   ├── build.gradle           # Configure build variants
│   └── src/
│       ├── debug/            # Debug config (dev API)
│       └── release/          # Release config (prod API)

# Build Variants:
# - debug: Development build dengan logging verbose
# - staging: Staging build untuk UAT
# - release: Production build
```

### 18.2 iOS Distribution

```yaml
# App Store Connect - TestFlight
# Untuk internal dan external testing sebelum App Store

apps/ios/
├── CasnApp.xcodeproj
├── CasnApp.xcworkspace
└── fastlane/                  # Automated deployment
    ├── Appfile
    └── Fastfile

# fastlane/Fastfile:
lane :beta do
  build_app(
    scheme: "CASNApp",
    export_method: "app-store",
    output_directory: "./builds"
  )
  
  upload_to_testflight(
    skip_waiting_for_build_processing: true
  )
end
```

### 18.3 Over-the-Air (OTA) Distribution

Untuk perangkat khusus di lokasi ujian tanpa akses Play Store/App Store:

```bash
# Alternative: APK distribution via website
# Host APK di server internal dan download langsung

https://casn-internal.bkn.go.id/mobile-app/
├── casn-android-v1.0.0.apk     # Android APK
├── casn-ios-v1.0.0.ipa         # iOS IPA (requires enterprise cert)
└── manifest.json                # Update manifest
```

### 18.4 Version Management

```typescript
// mobile/config/version.ts
export const APP_VERSION = {
  current: '1.0.0',
  minimumSupported: '1.0.0',  // Minimum version that still works
  forceUpdate: '1.0.0',      // Version that triggers force update
};

// Check for updates on app start
async function checkForUpdates() {
  const response = await fetch('https://api.casn.go.id/mobile/version');
  const { latest, minimum, forceUpdate } = await response.json();
  
  if (compareVersions(latest, APP_VERSION.current) > 0) {
    if (compareVersions(latest, forceUpdate) >= 0) {
      // Force update required
      showForceUpdateAlert();
    } else if (compareVersions(minimum, APP_VERSION.current) > 0) {
      // Update recommended but not required
      showUpdateRecommendedAlert();
    }
  }
}
```

---

## 19. Monitoring & Observability

### 11.1 Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| API Response Time | Histogram | > 500ms (p95) |
| Error Rate | Counter | > 1% |
| Active WebSocket Connections | Gauge | > 1000 |
| Offline Sync Queue Size | Gauge | > 1000 |
| SLA Overdue Tickets | Counter | Any |
| Location Status Updates | Counter | Frequency < 1/hour |

### 11.2 Logging Strategy

```typescript
// common/logger.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }
  
  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }
  
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }
  
  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }
}
```

---

## 20. Appendices

### A. Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/casn_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# MinIO/S3
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="casn-uploads"

# FCM
FCM_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# WebSocket
WS_PORT=3001
WS_PATH=/socket.io

# CORS
CORS_ORIGINS="http://localhost:3000,https://casn.bkn.go.id"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### B. API Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate) |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### C. Mobile App Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

```xml
<!-- iOS Info.plist -->
<key>NSCameraUsageDescription</key>
<string>Required for photo evidence capture</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Required for geotagging photos</string>
```

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Development Team
