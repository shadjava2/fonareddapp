# push.ps1 — Commit les changements si besoin, puis push vers GitHub
# Usage:
#   .\scripts\push.ps1
#   .\scripts\push.ps1 "Message de commit"
#
# Pourquoi "Everything up-to-date" ? Soit aucun nouveau commit (rien n'a été commité),
# soit tout est déjà poussé. Ce script committe d'abord les changements puis push.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

Write-Host "[PUSH] Depot: $RepoRoot" -ForegroundColor Cyan
Write-Host ""

# 1. Statut
$status = git status --porcelain
$branch = git rev-parse --abbrev-ref HEAD
$upstream = git rev-parse --abbrev-ref "@{upstream}" 2>$null

Write-Host "[PUSH] Branche: $branch" -ForegroundColor Cyan
if ($upstream) { Write-Host "[PUSH] Remote: $upstream" -ForegroundColor Cyan }
Write-Host ""

# 2. Y a-t-il des fichiers modifiés ou non suivis ?
$hasChanges = $status -match "\S"
if ($hasChanges) {
    Write-Host "[PUSH] Fichiers modifies ou non suivis:" -ForegroundColor Yellow
    git status -s
    Write-Host ""
    $msg = $args[0]
    if (-not $msg) { $msg = "Update" }
    Write-Host "[PUSH] Ajout de tous les fichiers et commit: $msg" -ForegroundColor Green
    git add -A
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[PUSH] Commit annule ou rien a committer." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "[PUSH] Push vers GitHub..." -ForegroundColor Green
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[PUSH] ERREUR: git push a echoue." -ForegroundColor Red
        exit 1
    }
    Write-Host "[PUSH] Termine: changements committes et pousses." -ForegroundColor Green
    exit 0
}

# 3. Pas de changements locaux — y a-t-il des commits a pousser ?
$local = git rev-parse HEAD 2>$null
$remote = git rev-parse "@{upstream}" 2>$null
if (-not $remote) {
    Write-Host "[PUSH] Aucun upstream configure. Premier push ? Faites: git push -u origin $branch" -ForegroundColor Yellow
    git push -u origin $branch 2>$null
    if ($LASTEXITCODE -ne 0) { git push }
    exit $LASTEXITCODE
}
$base = git merge-base HEAD "@{upstream}" 2>$null
if ($local -eq $remote) {
    Write-Host "[PUSH] Rien a committer et rien a pousser (deja a jour)." -ForegroundColor Gray
    Write-Host "[PUSH] Pour pousser, modifiez des fichiers puis relancez ce script, ou faites un commit a la main." -ForegroundColor Gray
    exit 0
}
if ($local -eq $base) {
    Write-Host "[PUSH] Le remote a des commits que vous n'avez pas. Faites: git pull puis relancez." -ForegroundColor Yellow
    exit 0
}

Write-Host "[PUSH] Push des commits existants..." -ForegroundColor Green
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[PUSH] ERREUR: git push a echoue." -ForegroundColor Red
    exit 1
}
Write-Host "[PUSH] Termine: commits pousses." -ForegroundColor Green
