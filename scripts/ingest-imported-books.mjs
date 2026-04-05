import fs from "node:fs/promises"
import path from "node:path"

const sourceDir = path.resolve("raw/imports/obsidian-books")
const booksDir = path.resolve("wiki/books")
const indexPath = path.resolve("wiki/index.md")
const today = new Date().toISOString().slice(0, 10)

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

function sanitizeFileComponent(value) {
  return value
    .replace(/</g, "＜")
    .replace(/>/g, "＞")
    .replace(/:/g, "：")
    .replace(/"/g, "＂")
    .replace(/\//g, "／")
    .replace(/\\/g, "＼")
    .replace(/\|/g, "｜")
    .replace(/\?/g, "？")
    .replace(/\*/g, "＊")
    .trim()
}

function summarizeIntro(intro) {
  const singleLine = intro.replace(/\s+/g, " ").trim()
  if (singleLine.length <= 48) {
    return singleLine
  }

  return `${singleLine.slice(0, 48).trimEnd()}...`
}

function matchField(content, pattern) {
  const match = content.match(pattern)
  return match ? stripQuotes(match[1]) : null
}

function parseBookIntro(content) {
  const match = content.match(/^> - 简介：\s*(.+)$/m)
  return match ? match[1].trim() : "（暂无简介）"
}

function parseBookPage(content, filePath) {
  const title = content.match(/^#\s+(.+)\s*$/m)?.[1]?.trim() ?? path.parse(filePath).name
  const updated = content.match(/\*\*来源\*\*：书籍\s+\*\*最后更新\*\*：(\d{4}-\d{2}-\d{2})/)?.[1] ?? today
  let intro = "（暂无简介）"
  const introMarker = "## 简介"
  const introStart = content.indexOf(introMarker)
  if (introStart >= 0) {
    const afterIntro = content.slice(introStart + introMarker.length).trim()
    const nextHeaderIndex = afterIntro.search(/\n## /)
    intro = (nextHeaderIndex >= 0 ? afterIntro.slice(0, nextHeaderIndex) : afterIntro).trim()
    if (!intro) {
      intro = "（暂无简介）"
    }
  }

  return {
    fileStem: path.parse(filePath).name,
    title,
    updated,
    intro,
  }
}

async function main() {
  await fs.mkdir(booksDir, { recursive: true })

  const sourceEntries = (await fs.readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))

  const records = []
  for (const entry of sourceEntries) {
    const fullPath = path.join(sourceDir, entry.name)
    const content = await fs.readFile(fullPath, "utf8")
    const title = matchField(content, /^title:\s*(.+)$/m) ?? path.parse(entry.name).name
    const bookId = matchField(content, /^bookId:\s*"?([^"\r\n]+)"?\s*$/m)
    const intro = parseBookIntro(content)

    records.push({
      sourceName: entry.name,
      sourceStem: path.parse(entry.name).name,
      title,
      bookId,
      intro,
    })
  }

  const duplicateCounts = new Map()
  for (const record of records) {
    duplicateCounts.set(record.title, (duplicateCounts.get(record.title) ?? 0) + 1)
  }

  let importedCount = 0
  for (const record of records) {
    const displayTitle =
      duplicateCounts.get(record.title) > 1
        ? `${record.title}（${record.bookId ?? record.sourceStem}）`
        : record.title

    const safeTitle = sanitizeFileComponent(displayTitle)
    const targetPath = path.join(booksDir, `${safeTitle}.md`)
    const pageContent = [
      `# ${displayTitle}`,
      "",
      `**来源**：书籍  **最后更新**：${today}`,
      "",
      "## 简介",
      record.intro,
      "",
    ].join("\n")

    await fs.writeFile(targetPath, pageContent, "utf8")
    importedCount += 1
  }

  const bookEntries = (await fs.readdir(booksDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))

  const bookPages = []
  for (const entry of bookEntries) {
    const fullPath = path.join(booksDir, entry.name)
    const content = await fs.readFile(fullPath, "utf8")
    bookPages.push(parseBookPage(content, fullPath))
  }

  const bookSection = [
    "## Books",
    ...bookPages.map(
      (page) => `- [[${page.fileStem}]] | ${summarizeIntro(page.intro)} | ${page.updated}`,
    ),
  ].join("\n")

  const indexContent = await fs.readFile(indexPath, "utf8")
  const wikiRoot = path.dirname(indexPath)

  let wikiPageCount = 0
  async function countWikiPages(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === ".obsidian") {
        continue
      }

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await countWikiPages(fullPath)
        continue
      }

      if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md") {
        wikiPageCount += 1
      }
    }
  }

  await countWikiPages(wikiRoot)

  const refreshedIndex = indexContent
    .replace(/^最后更新：.*$/m, `最后更新：${today} | 共 ${wikiPageCount} 个页面`)
    .replace(/## Books[\s\S]*?(?=\n## |\Z)/m, bookSection)

  await fs.writeFile(indexPath, `${refreshedIndex.trimEnd()}\n`, "utf8")

  console.log(`Imported pages written: ${importedCount}`)
  console.log(`Books in wiki/books: ${bookPages.length}`)
  console.log(`Wiki page count: ${wikiPageCount}`)
}

await main()
