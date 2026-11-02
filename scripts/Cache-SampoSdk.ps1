[CmdletBinding()]
param([string]$CacheDirectory = (Join-Path ([IO.Path]::GetTempPath()) 'sampo-sdk-v1.0.0-beta.2'))
$ErrorActionPreference = 'Stop'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is required and must be authenticated for the Sampo release.' }
$assets = [ordered]@{
    'sampo-client-0.2.0-alpha.20261102.1.tgz' = '0894b30febbac601fe05e766f3290d4225f8ca23f1257418665e2bab89cb1a83'
    'sampo-contracts-0.2.0-alpha.20261102.1.tgz' = '7da57191d401d32026cc7fafef7961c090d2371cbf17551409b2382102762a64'
    'sampo-design-tokens-0.1.0.tgz' = '714ba7eea14bc5b7bb419fc7abfd6dc75c03a4145d24ceca09f6090a69919859'
    'sampo-runtime-0.2.0-alpha.20261102.1.tgz' = '807b0b2bf9a1b4d278410d2023aa9ff22edfb4fe1a4a5d14b1aba06ef729d415'
    'sampo-sdk-react-0.2.0-alpha.20261102.1.tgz' = '76c9474ba8afb0ba84a6b716ade371e7ad2dff4f4024624fcf586efa537e937c'
    'sampo-tooling-0.2.0-alpha.20261102.1.tgz' = '6bd322a90ad4e2403cee9ad1ea0d49c80100d3b2ceff61e22ab87ac8efc7b330'
}
$directory = [IO.Path]::GetFullPath($CacheDirectory)
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\') + '\'
if (($directory.TrimEnd('\') + '\').StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) { throw 'CacheDirectory must be outside the source tree.' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
foreach ($name in $assets.Keys) {
    $file = Join-Path $directory $name
    if (-not (Test-Path -LiteralPath $file)) {
        gh release download v1.0.0-beta.2 --repo sgadyne/sampo --pattern $name --dir $directory
        if ($LASTEXITCODE -ne 0) { throw "GitHub download failed: $name" }
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant() -ne $assets[$name]) { throw "SDK checksum mismatch: $name" }
    npm cache add $file
    if ($LASTEXITCODE -ne 0) { throw "npm cache add failed: $name" }
}
Write-Host 'Verified SDK assets are cached. Run npm ci --prefer-offline.'
