-- CreateTable
CREATE TABLE "MasterItem" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "ownership" "ItemOwnership" NOT NULL DEFAULT 'SEWA',
    "qty100" INTEGER NOT NULL,
    "qty200" INTEGER NOT NULL,
    "qty300" INTEGER NOT NULL,
    "qty400" INTEGER NOT NULL,
    "qty500" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterPersonnelRequirement" (
    "id" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "koordinator" INTEGER NOT NULL,
    "tenagaIt" INTEGER NOT NULL,
    "elektrikal" INTEGER NOT NULL,
    "sarpras" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPersonnelRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterItem_no_key" ON "MasterItem"("no");

-- CreateIndex
CREATE UNIQUE INDEX "MasterPersonnelRequirement_capacity_key" ON "MasterPersonnelRequirement"("capacity");
