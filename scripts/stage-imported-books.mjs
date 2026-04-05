import fs from "node:fs/promises"
import path from "node:path"

const sourceDir = path.resolve("raw/imports/obsidian-books")
const stagedDir = path.resolve("raw/imports/obsidian-books-ready")
const completedProgressThreshold = 95

function stripQuotes(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function matchField(content, pattern) {
  const match = content.match(pattern)
  return match ? stripQuotes(match[1]) : null
}

function parseProgressNumber(progress) {
  if (!progress) return Number.NaN
  const normalized = progress.trim()
  if (normalized.endsWith("%")) {
    return Number(normalized.slice(0, -1))
  }

  return Number(normalized)
}

async function main() {
  await fs.mkdir(stagedDir, { recursive: true })

  const sourceEntries = (await fs.readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))

  const records = []
  for (const entry of sourceEntries) {
    const fullPath = path.join(sourceDir, entry.name)
    const content = await fs.readFile(fullPath, "utf8")
    const progress = matchField(content, /^progress:\s*(.+)$/m) ?? ""

    records.push({
      progress,
      fullPath,
      fileName: entry.name,
    })
  }

  const keptRecords = records.filter((record) => {
    const progressNumber = parseProgressNumber(record.progress)
    return !Number.isNaN(progressNumber) && progressNumber >= completedProgressThreshold
  })

  const stagedPaths = new Set(keptRecords.map((record) => path.join(stagedDir, record.fileName)))
  for (const record of keptRecords) {
    const targetPath = path.join(stagedDir, record.fileName)
    await fs.copyFile(record.fullPath, targetPath)
  }

  const stagedEntries = await fs.readdir(stagedDir, { withFileTypes: true })
  for (const entry of stagedEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue
    }

    const fullPath = path.join(stagedDir, entry.name)
    if (!stagedPaths.has(fullPath)) {
      await fs.rm(fullPath, { force: true })
    }
  }

  console.log(`Imported markdown files scanned: ${records.length}`)
  console.log(`Ready-for-ingest files kept in raw/imports/obsidian-books-ready (>=${completedProgressThreshold}%): ${keptRecords.length}`)
  console.log("No wiki files were created or modified.")
}

await main()
