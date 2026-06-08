param(
  [string]$RemoteUrl = "",
  [string]$CommitMessage = "Initial trade AI agent"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git command not found. Please install Git for Windows and restart PowerShell." -ForegroundColor Red
  exit 1
}

if (-not $RemoteUrl) {
  $RemoteUrl = Read-Host "Paste your GitHub repository URL, for example https://github.com/USERNAME/trade-ai-agent.git"
}

if (-not $RemoteUrl) {
  Write-Host "Remote URL is required." -ForegroundColor Red
  exit 1
}

git init
git branch -M main
git add .
git commit -m $CommitMessage

$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existingRemote) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

git push -u origin main

Write-Host ""
Write-Host "Published to GitHub: $RemoteUrl" -ForegroundColor Green
