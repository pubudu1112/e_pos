import { spawnSync } from "node:child_process";
import { prisma } from "../lib/prisma";

const migrationName = "20261110110000_add_smart_forecast_models";

type TableRow = { tableName: string };
type MigrationRow = { finishedAt: Date | null };
type ColumnRow = {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
  characterMaximumLength: number | bigint | null;
  datetimePrecision: number | bigint | null;
  extra: string | null;
};
type IndexRow = {
  tableName: string;
  indexName: string;
  nonUnique: number | bigint;
  sequence: number | bigint;
  columnName: string;
};

const expectedColumns: Record<
  string,
  Array<{
    name: string;
    type: string;
    nullable: "YES" | "NO";
    length?: number;
    precision?: number;
    autoIncrement?: boolean;
  }>
> = {
  BusinessEvent: [
    { name: "id", type: "int", nullable: "NO", autoIncrement: true },
    { name: "title", type: "varchar", nullable: "NO", length: 150 },
    { name: "description", type: "varchar", nullable: "YES", length: 500 },
    { name: "eventType", type: "varchar", nullable: "NO", length: 50 },
    { name: "startDate", type: "datetime", nullable: "NO", precision: 3 },
    { name: "endDate", type: "datetime", nullable: "NO", precision: 3 },
    { name: "isActive", type: "tinyint", nullable: "NO" },
    { name: "createdAt", type: "datetime", nullable: "NO", precision: 3 },
    { name: "updatedAt", type: "datetime", nullable: "NO", precision: 3 },
  ],
  ForecastAlert: [
    { name: "id", type: "int", nullable: "NO", autoIncrement: true },
    { name: "dedupeKey", type: "varchar", nullable: "NO", length: 191 },
    { name: "title", type: "varchar", nullable: "NO", length: 200 },
    { name: "message", type: "varchar", nullable: "NO", length: 1000 },
    { name: "alertType", type: "varchar", nullable: "NO", length: 50 },
    { name: "priority", type: "varchar", nullable: "NO", length: 20 },
    {
      name: "recommendedAction",
      type: "varchar",
      nullable: "YES",
      length: 500,
    },
    { name: "productId", type: "int", nullable: "YES" },
    { name: "categoryId", type: "int", nullable: "YES" },
    { name: "forecastStart", type: "datetime", nullable: "YES", precision: 3 },
    { name: "forecastEnd", type: "datetime", nullable: "YES", precision: 3 },
    { name: "isRead", type: "tinyint", nullable: "NO" },
    { name: "isActive", type: "tinyint", nullable: "NO" },
    { name: "createdAt", type: "datetime", nullable: "NO", precision: 3 },
    { name: "updatedAt", type: "datetime", nullable: "NO", precision: 3 },
  ],
};

const expectedIndexes = [
  { table: "BusinessEvent", name: "PRIMARY", columns: ["id"], unique: true },
  {
    table: "BusinessEvent",
    name: "BusinessEvent_startDate_endDate_isActive_idx",
    columns: ["startDate", "endDate", "isActive"],
    unique: false,
  },
  { table: "ForecastAlert", name: "PRIMARY", columns: ["id"], unique: true },
  {
    table: "ForecastAlert",
    name: "ForecastAlert_dedupeKey_key",
    columns: ["dedupeKey"],
    unique: true,
  },
  {
    table: "ForecastAlert",
    name: "ForecastAlert_isActive_isRead_priority_idx",
    columns: ["isActive", "isRead", "priority"],
    unique: false,
  },
  {
    table: "ForecastAlert",
    name: "ForecastAlert_alertType_createdAt_idx",
    columns: ["alertType", "createdAt"],
    unique: false,
  },
];

async function main() {
  const tables = await prisma.$queryRaw<TableRow[]>`
    SELECT TABLE_NAME AS tableName
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('_prisma_migrations', 'BusinessEvent', 'ForecastAlert')
  `;
  const tableNames = new Set(tables.map((table) => table.tableName));

  if (!tableNames.has("_prisma_migrations")) {
    console.info("No Prisma migration history exists yet; skipping recovery.");
    return;
  }

  const migrationRows = await prisma.$queryRaw<MigrationRow[]>`
    SELECT finished_at AS finishedAt
    FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
    ORDER BY started_at DESC
    LIMIT 1
  `;

  if (migrationRows[0]?.finishedAt) {
    console.info(`${migrationName} is already applied; no recovery is needed.`);
    return;
  }

  if (!tableNames.has("BusinessEvent")) {
    console.info("BusinessEvent does not exist; Prisma can apply the migration normally.");
    return;
  }

  const columns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT
      TABLE_NAME AS tableName,
      COLUMN_NAME AS columnName,
      DATA_TYPE AS dataType,
      IS_NULLABLE AS isNullable,
      CHARACTER_MAXIMUM_LENGTH AS characterMaximumLength,
      DATETIME_PRECISION AS datetimePrecision,
      EXTRA AS extra
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('BusinessEvent', 'ForecastAlert')
  `;

  const existingColumnTables = new Set(columns.map((column) => column.tableName));
  if (!existingColumnTables.has("ForecastAlert")) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`ForecastAlert\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`dedupeKey\` VARCHAR(191) NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`message\` VARCHAR(1000) NOT NULL,
        \`alertType\` VARCHAR(50) NOT NULL,
        \`priority\` VARCHAR(20) NOT NULL,
        \`recommendedAction\` VARCHAR(500) NULL,
        \`productId\` INTEGER NULL,
        \`categoryId\` INTEGER NULL,
        \`forecastStart\` DATETIME(3) NULL,
        \`forecastEnd\` DATETIME(3) NULL,
        \`isRead\` BOOLEAN NOT NULL DEFAULT false,
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`ForecastAlert_dedupeKey_key\` (\`dedupeKey\`),
        INDEX \`ForecastAlert_isActive_isRead_priority_idx\` (\`isActive\`, \`isRead\`, \`priority\`),
        INDEX \`ForecastAlert_alertType_createdAt_idx\` (\`alertType\`, \`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB
    `);
  }

  const refreshedColumns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT
      TABLE_NAME AS tableName,
      COLUMN_NAME AS columnName,
      DATA_TYPE AS dataType,
      IS_NULLABLE AS isNullable,
      CHARACTER_MAXIMUM_LENGTH AS characterMaximumLength,
      DATETIME_PRECISION AS datetimePrecision,
      EXTRA AS extra
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('BusinessEvent', 'ForecastAlert')
  `;

  const mismatches: string[] = [];
  for (const [tableName, expected] of Object.entries(expectedColumns)) {
    const actualForTable = refreshedColumns.filter(
      (column) => column.tableName === tableName,
    );
    if (actualForTable.length === 0) {
      mismatches.push(`${tableName} table is missing`);
      continue;
    }

    for (const expectedColumn of expected) {
      const actual = actualForTable.find(
        (column) => column.columnName === expectedColumn.name,
      );
      if (!actual) {
        mismatches.push(`${tableName}.${expectedColumn.name} is missing`);
        continue;
      }

      if (
        actual.dataType.toLowerCase() !== expectedColumn.type ||
        actual.isNullable !== expectedColumn.nullable ||
        (expectedColumn.length !== undefined &&
          Number(actual.characterMaximumLength) !== expectedColumn.length) ||
        (expectedColumn.precision !== undefined &&
          Number(actual.datetimePrecision) !== expectedColumn.precision) ||
        (expectedColumn.autoIncrement &&
          !actual.extra?.toLowerCase().includes("auto_increment"))
      ) {
        mismatches.push(`${tableName}.${expectedColumn.name} does not match the migration`);
      }
    }
  }

  const indexes = await prisma.$queryRaw<IndexRow[]>`
    SELECT
      TABLE_NAME AS tableName,
      INDEX_NAME AS indexName,
      NON_UNIQUE AS nonUnique,
      SEQ_IN_INDEX AS sequence,
      COLUMN_NAME AS columnName
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('BusinessEvent', 'ForecastAlert')
  `;

  for (const expected of expectedIndexes) {
    const actual = indexes
      .filter(
        (index) =>
          index.tableName === expected.table && index.indexName === expected.name,
      )
      .sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const actualColumns = actual.map((index) => index.columnName);
    const actualIsUnique = actual.length > 0 && Number(actual[0].nonUnique) === 0;

    if (
      actualColumns.join(",") !== expected.columns.join(",") ||
      actualIsUnique !== expected.unique
    ) {
      mismatches.push(`${expected.table}.${expected.name} does not match the migration`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Existing forecast schema was not marked as applied because it differs from the migration: ${mismatches.join("; ")}`,
    );
  }

  console.info(
    "Existing forecast tables match the migration. Marking only this schema migration as applied; no existing rows will be changed.",
  );

  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    command,
    ["prisma", "migrate", "resolve", "--applied", migrationName],
    { stdio: "inherit", shell: process.platform === "win32" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Prisma could not resolve ${migrationName} as applied.`);
  }
}

main()
  .catch((error) => {
    console.error("Forecast migration recovery stopped safely:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
