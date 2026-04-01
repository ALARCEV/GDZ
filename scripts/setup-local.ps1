param(
  [switch]$SkipInstall,
  [switch]$SkipDb
)

$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Name)

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  if (-not (Test-Command -Name $Name)) {
    throw "Команда '$Name' не найдена. $InstallHint"
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Создан файл .env из .env.example'
}

Ensure-Command -Name 'node' -InstallHint 'Установите Node.js 20+.'
Ensure-Command -Name 'npm' -InstallHint 'Установите npm 10+ вместе с Node.js.'

if (-not $SkipDb) {
  Ensure-Command -Name 'docker' -InstallHint 'Установите Docker Desktop и убедитесь, что docker compose доступен.'
  docker compose up -d db
}

if (-not $SkipInstall) {
  npm install
}

npx prisma generate
npx prisma migrate deploy

Write-Host ''
Write-Host 'Локальная среда подготовлена.'
Write-Host 'Дальше запустите: npm run dev'
