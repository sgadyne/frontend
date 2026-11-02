[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$Message = 'feat: add reusable frontend components')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $repo
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
    if (-not (Test-Path -LiteralPath '.git')) {
        if ($WhatIfPreference) { Write-Host 'Would initialize this directory on main.' }
        else { git init -b main; if ($LASTEXITCODE -ne 0) { throw 'Git initialization failed.' } }
    }
    git rev-parse --verify --quiet HEAD *> $null
    if ($LASTEXITCODE -eq 0) { throw 'This helper is only for an initial commit; this repository already has history.' }
    $items = @('.gitignore','AGENTS.md','LICENSE','README.md','package.json','package-lock.json','apps','assets','packages','scripts')
    if ($WhatIfPreference) {
        Write-Host 'Would run npm run check, stage only the public source roots, validate staged paths, and create the first commit on main.'
        Write-Host 'No remote would be added and nothing would be pushed.'
        return
    }
    $authorName = git config user.name
    $authorEmail = git config user.email
    if (-not $authorName -or -not $authorEmail) { throw 'Configure Git user.name and user.email before creating the commit.' }
    npm run check
    if ($LASTEXITCODE -ne 0) { throw 'Public source checks failed; nothing was staged.' }
    if (-not $PSCmdlet.ShouldProcess($repo, 'Create initial public-source commit on main')) { return }
    git symbolic-ref HEAD refs/heads/main
    if ($LASTEXITCODE -ne 0) { throw 'Could not select the unborn main branch.' }
    git add -- $items
    if ($LASTEXITCODE -ne 0) { throw 'Staging failed.' }
    $staged = @(git diff --cached --name-only --diff-filter=ACMR)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -eq 0) { throw 'No source files are staged.' }
    foreach ($file in $staged) {
        if ($file -match '(^|/)(node_modules|dist|\.runtime|\.review|\.venv|__pycache__|secrets?|credentials?)(/|$)' -or
            $file -match '(^|/)\.env($|\.)|\.(key|pem|keytab|p12|pfx|lic|sqlite.*|parquet|log)$' -or
            $file -match '\.(tgz|zip)$') {
            throw "Refusing generated/private staged path: $file"
        }
        $top = ($file -split '/')[0]
        if ($top -notin $items) { throw "Unexpected staged root: $top" }
    }
    git diff --cached --check
    if ($LASTEXITCODE -ne 0) { throw 'Staged whitespace checks failed.' }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
    Write-Host 'Initial commit created. No remote was added and nothing was pushed.'
} finally {
    Pop-Location
}
