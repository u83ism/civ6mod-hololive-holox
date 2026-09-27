# Sets up (or re-checks) the local Civ6 modding environment for this repository on a new PC.
# Idempotent: safe to run any number of times. Existing things that look wrong are reported,
# never overwritten or deleted.
#
#   pwsh tools/setup-dev-env.ps1               # junction + logging + npm ci + prerequisite checks
#   pwsh tools/setup-dev-env.ps1 -EnableTuner  # additionally turn on FireTuner
#
# Steam tools (Development Tools / SDK Assets) and Art/Source/ cannot be installed from here;
# they are only checked and reported.
param(
    [switch]$EnableTuner
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$modName = Split-Path -Leaf $repositoryRoot
$steamCommon = 'C:\Program Files (x86)\Steam\steamapps\common'
$modsDirectory = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "My Games\Sid Meier's Civilization VI\Mods"
$appOptionsPath = Join-Path $env:LOCALAPPDATA "Firaxis Games\Sid Meier's Civilization VI\AppOptions.txt"

$warnings = New-Object System.Collections.Generic.List[string]

# --- 1. Junction: Mods\<repo name> -> repository root -------------------------------------
$junctionPath = Join-Path $modsDirectory $modName
if (-not (Test-Path $modsDirectory)) {
    New-Item -ItemType Directory -Force -Path $modsDirectory | Out-Null
}
if (Test-Path $junctionPath) {
    $existing = Get-Item $junctionPath -Force
    $existingTarget = @($existing.Target)[0]
    if ($existing.LinkType -eq 'Junction' -and $existingTarget -and
        ((Resolve-Path $existingTarget).Path.TrimEnd('\') -eq $repositoryRoot.TrimEnd('\'))) {
        Write-Host "[ok]   Junction already points here: $junctionPath"
    }
    else {
        $warnings.Add("$junctionPath already exists but is not a junction to $repositoryRoot. Check it manually (not touched).")
    }
}
else {
    New-Item -ItemType Junction -Path $junctionPath -Target $repositoryRoot | Out-Null
    Write-Host "[done] Created junction: $junctionPath -> $repositoryRoot"
}

# --- 2. AppOptions.txt: LoggingEnabled (and optionally EnableTuner) ------------------------
$setAppOption = {
    param([string]$text, [string]$key, [string]$value)
    $pattern = "(?m)^$key[ \t]+\S+"
    if ($text -match $pattern) {
        return [regex]::Replace($text, $pattern, "$key $value")
    }
    $separator = if ($text.EndsWith("`n")) { '' } else { "`r`n" }
    return "$text$separator$key $value`r`n"
}

if (Test-Path $appOptionsPath) {
    $original = [IO.File]::ReadAllText($appOptionsPath)
    $updated = & $setAppOption $original 'LoggingEnabled' '1'
    if ($EnableTuner) {
        $updated = & $setAppOption $updated 'EnableTuner' '1'
    }
    if ($updated -ne $original) {
        [IO.File]::WriteAllText($appOptionsPath, $updated, (New-Object System.Text.UTF8Encoding $false))
        Write-Host "[done] Updated AppOptions.txt (LoggingEnabled 1$(if ($EnableTuner) { ', EnableTuner 1' }))"
    }
    else {
        Write-Host '[ok]   AppOptions.txt already configured'
    }
}
else {
    $warnings.Add("AppOptions.txt not found ($appOptionsPath). Launch Civ6 once, then re-run this script.")
}

# --- 3. Node tooling ------------------------------------------------------------------------
if (Get-Command npm -ErrorAction SilentlyContinue) {
    foreach ($toolDirectory in @('png2dds', 'loc-lookup')) {
        Push-Location (Join-Path $repositoryRoot "tools\$toolDirectory")
        try {
            npm ci
            if ($LASTEXITCODE -ne 0) { $warnings.Add("npm ci failed in tools/$toolDirectory.") }
            else { Write-Host "[done] npm ci in tools/$toolDirectory" }
        }
        finally { Pop-Location }
    }
}
else {
    $warnings.Add('npm not found. Install Node.js, then re-run this script.')
}

# --- 4. Prerequisites that can only be checked --------------------------------------------
$prerequisites = @(
    @{ Path = Join-Path $steamCommon "Sid Meier's Civilization VI SDK"; Hint = 'Install "Sid Meier''s Civilization VI Development Tools" from Steam Library > Tools (ModBuddy / FireTuner).' },
    @{ Path = Join-Path $steamCommon "Sid Meier's Civilization VI SDK Assets"; Hint = 'Install "Sid Meier''s Civilization VI SDK Assets" from Steam Library > Tools (steam://install/597260). gen-tex / gen-moment-illustration read templates from here.' },
    @{ Path = Join-Path $repositoryRoot 'Art\Source'; Hint = 'Art/Source/ is not tracked by git. Copy it from the previous PC / backup.' }
)
foreach ($prerequisite in $prerequisites) {
    if (Test-Path $prerequisite.Path) {
        Write-Host "[ok]   Found: $($prerequisite.Path)"
    }
    else {
        $warnings.Add("Missing: $($prerequisite.Path)`n         $($prerequisite.Hint)")
    }
}

# --- Summary --------------------------------------------------------------------------------
if ($warnings.Count -eq 0) {
    Write-Host "`nAll set."
}
else {
    Write-Host "`nNeeds attention:" -ForegroundColor Yellow
    foreach ($warning in $warnings) { Write-Host "  - $warning" -ForegroundColor Yellow }
}
