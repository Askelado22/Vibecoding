-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productUrl" TEXT NOT NULL,
    "assigneeName" TEXT,
    "moveStatus" TEXT,
    "moveStatusSetBy" TEXT,
    "moveStatusSetAt" DATETIME,
    "finalBreadcrumbs" TEXT,
    "breadcrumbsSetBy" TEXT,
    "breadcrumbsSetAt" DATETIME,
    "priorityRaw" TEXT NOT NULL DEFAULT '',
    "completedBy" TEXT,
    "completedAt" DATETIME,
    "movedFlagRaw" TEXT,
    "comment" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleMatch" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sync_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" DATETIME,
    "lastPushCursor" DATETIME,
    "lastPullCursor" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Item_productUrl_key" ON "Item"("productUrl");
