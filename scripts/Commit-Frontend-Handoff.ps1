[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Message = 'feat: share themed workspace baseline',
    [switch]$Push
)
$ErrorActionPreference = 'Stop'
function Invoke-CheckedNative([scriptblock]$Command, [string]$Failure) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Command
        $nativeExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($nativeExit -ne 0) { throw $Failure }
}
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $repo
try {
    git rev-parse --verify --quiet HEAD *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Use this helper in the existing frontend repository.' }
    $branch = (& git branch --show-current).Trim()
    if (-not $branch) { throw 'Select a branch before creating the checkpoint.' }
    $stagedBefore = @(& git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the index.' }
    if ($stagedBefore.Count) { throw 'The index already contains changes. Review them before using this helper.' }
    $roots = @('.gitignore','AGENTS.md','LICENSE','README.md','package.json','package-lock.json','apps','assets','packages','scripts','docs')
    $trackedVendor = @(& git ls-files -- vendor)
    if (Test-Path -LiteralPath vendor) { throw 'Remove obsolete vendor artifacts before creating this cleaned checkpoint.' }
    if ($WhatIfPreference) {
        Write-Host "Would run npm run check and commit the public baseline plus theme handoff on $branch."
        Write-Host 'Includes completed SDK/group changes and tracked vendor deletions; excludes generated/private output.'
        if ($Push) { Write-Host "Would then push this branch to origin as refs/heads/$branch." }
        else { Write-Host 'No push requested.' }
        return
    }
    $authorName = & git config user.name
    $authorEmail = & git config user.email
    if (-not $authorName -or -not $authorEmail) { throw 'Configure Git user.name and user.email first.' }
    Invoke-CheckedNative { npm run check } 'Source checks failed; nothing was staged.'
    if (-not $PSCmdlet.ShouldProcess($repo, "Commit the reviewed public checkpoint on $branch")) { return }
    Invoke-CheckedNative { & git add -A -- $roots } 'Could not stage public source.'
    if ($trackedVendor.Count) {
        Invoke-CheckedNative { git add -u -- vendor } 'Could not stage obsolete vendor deletions.'
    }
    $all = @(& git diff --cached --name-only)
    if (-not $all.Count) { throw 'No changes to commit.' }
    foreach ($file in $all) {
        $top = ($file -split '/')[0]
        if ($top -notin ($roots + @('vendor'))) { throw "Unexpected staged root: $top" }
    }
    $written = @(& git diff --cached --name-only --diff-filter=ACMR)
    foreach ($file in $written) {
        if ($file -match '(^|/)(node_modules|dist|\.runtime|\.review|\.venv|__pycache__|secrets?|credentials?)(/|$)' -or
            $file -match '(^|/)\.env($|\.)|\.(key|pem|keytab|p12|pfx|lic|sqlite.*|db|parquet|log|tgz|zip)$' -or
            $file -match '^vendor/') {
            throw "Refusing generated/private staged path: $file"
        }
    }
    Invoke-CheckedNative { git diff --cached --check } 'Staged whitespace checks failed. Review the index.'
    git diff --cached --stat
    Invoke-CheckedNative { & git commit -m $Message } 'Commit failed; review the staged files.'
    if ($Push) {
        if ($PSCmdlet.ShouldProcess('origin', "Push $branch")) {
            Invoke-CheckedNative { & git push --set-upstream origin "HEAD:refs/heads/$branch" } 'Push failed; the local commit is preserved. No force push attempted.'
        }
    } else {
        Write-Host 'Checkpoint committed locally; nothing was pushed.'
    }
} finally {
    Pop-Location
}
