[CmdletBinding()]
param([string]$CacheDirectory = (Join-Path ([IO.Path]::GetTempPath()) 'sampo-sdk-v1.0.0-beta.3'))
$ErrorActionPreference = 'Stop'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is required and must be authenticated for the Sampo release.' }
$assets = [ordered]@{
    'sampo-client-0.2.0-alpha.20261102.5.tgz' = '7e71d13dfccd10c4745661364e96d35976aed0371f2e555b817e128f6ef19e71'
    'sampo-contracts-0.2.0-alpha.20261102.5.tgz' = '0350c73ea4f7e30685619047c0fa4c3976edec7771bb32e9f2847b48d1220d9c'
    'sampo-design-tokens-0.1.0.tgz' = '714ba7eea14bc5b7bb419fc7abfd6dc75c03a4145d24ceca09f6090a69919859'
    'sampo-runtime-0.2.0-alpha.20261102.5.tgz' = 'cc2417d95400d4f7d9d2aee227a06b5c7c4a7f749c24a91f08e6cf1c1dcd448d'
    'sampo-sdk-react-0.2.0-alpha.20261102.5.tgz' = '756bd3c0a995f9400efdcc5cbfe5a6acaab3c0ce9c809e4cbbdf7d88cb47217a'
    'sampo-tooling-0.2.0-alpha.20261102.5.tgz' = '65706279a8643abce5a67dcd5ceaad739266cd913cf0ed43b90102b58eebb06d'
}
$directory = [IO.Path]::GetFullPath($CacheDirectory)
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\') + '\'
if (($directory.TrimEnd('\') + '\').StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) { throw 'CacheDirectory must be outside the source tree.' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
foreach ($name in $assets.Keys) {
    $file = Join-Path $directory $name
    if (-not (Test-Path -LiteralPath $file)) {
        gh release download v1.0.0-beta.3 --repo sgadyne/sampo --pattern $name --dir $directory
        if ($LASTEXITCODE -ne 0) { throw "GitHub download failed: $name" }
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant() -ne $assets[$name]) { throw "SDK checksum mismatch: $name" }
    npm cache add $file
    if ($LASTEXITCODE -ne 0) { throw "npm cache add failed: $name" }
}
Write-Host 'Verified SDK assets are cached. Run npm ci --prefer-offline.'
