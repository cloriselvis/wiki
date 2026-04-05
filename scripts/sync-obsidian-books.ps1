param(
  [string]$SourceVault = "C:\Users\zsc\Documents\Obsidian Vault",
  [string]$DestinationRoot = "C:\Users\zsc\my-wiki\raw\imports\obsidian-books",
  [switch]$Prune
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$Path
  )

  $resolvedBasePath = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $resolvedBasePath.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $resolvedBasePath += [System.IO.Path]::DirectorySeparatorChar
  }

  $baseUri = New-Object System.Uri($resolvedBasePath)
  $pathUri = New-Object System.Uri([System.IO.Path]::GetFullPath($Path))

  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString()).Replace("/", "\")
}

$sourceRoot = [System.IO.Path]::GetFullPath($SourceVault)
$destinationRoot = [System.IO.Path]::GetFullPath($DestinationRoot)

if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
  throw "Source vault not found: $sourceRoot"
}

New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null

$excludedDirectories = @(
  ".obsidian",
  ".git",
  "node_modules"
)

$excludedFilePrefixes = @(
  ([string]([char]0x672A) + [char]0x547D + [char]0x540D)
)

$sourceFiles = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Filter *.md |
  Where-Object {
    $currentFile = $_
    $relativePath = Get-RelativePath -BasePath $sourceRoot -Path $currentFile.FullName
    $segments = $relativePath -split "[\\/]"
    $shouldInclude = $true

    foreach ($segment in $segments) {
      if ($excludedDirectories -contains $segment) {
        $shouldInclude = $false
        break
      }
    }

    if ($shouldInclude) {
      $baseName = [System.IO.Path]::GetFileNameWithoutExtension($currentFile.Name)
      foreach ($prefix in $excludedFilePrefixes) {
        if ($baseName.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
          $shouldInclude = $false
          break
        }
      }
    }

    $shouldInclude
  }

$copiedCount = 0
$seenRelativePaths = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)

foreach ($file in $sourceFiles) {
  $relativePath = Get-RelativePath -BasePath $sourceRoot -Path $file.FullName
  [void]$seenRelativePaths.Add($relativePath)

  $targetPath = Join-Path $destinationRoot $relativePath
  $targetDirectory = Split-Path -Parent $targetPath
  if ($targetDirectory) {
    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
  }

  Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
  (Get-Item -LiteralPath $targetPath).LastWriteTime = $file.LastWriteTime
  $copiedCount++
}

$removedCount = 0

if ($Prune) {
  $destinationFiles = Get-ChildItem -LiteralPath $destinationRoot -Recurse -File -Filter *.md
  foreach ($file in $destinationFiles) {
    $relativePath = Get-RelativePath -BasePath $destinationRoot -Path $file.FullName
    if (-not $seenRelativePaths.Contains($relativePath)) {
      Remove-Item -LiteralPath $file.FullName -Force
      $removedCount++
    }
  }
}

Write-Host "Source: $sourceRoot"
Write-Host "Destination: $destinationRoot"
Write-Host "Copied: $copiedCount markdown files"
if ($Prune) {
  Write-Host "Removed: $removedCount stale markdown files"
}
