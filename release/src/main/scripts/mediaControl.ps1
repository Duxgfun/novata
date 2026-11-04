param(
    [string]$Action = "get"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$csharpSource = @"
using System;
using System.Runtime.InteropServices;
public class WinMediaFallback {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void SendKey(byte key) {
        keybd_event(key, 0, 0, UIntPtr.Zero);
        keybd_event(key, 0, 2, UIntPtr.Zero);
    }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'WinMediaFallback').Type) {
    Add-Type -TypeDefinition $csharpSource
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
})[0]

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime] | Out-Null
$mgr = $null
try {
    $op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $task = $asTask.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($op))
    $mgr = $task.Result
} catch {
    $mgr = $null
}

$session = $null
if ($mgr) {
    try {
        $session = $mgr.GetCurrentSession()
    } catch {
        $session = $null
    }
}

switch ($Action.ToLower()) {
    "play_pause" {
        $handled = $false
        if ($session) {
            try {
                $pTask = $session.TryTogglePlayPauseAsync()
                $handled = $true
            } catch {
                $handled = $false
            }
        }
        if (-not $handled) {
            [WinMediaFallback]::SendKey(179)
        }
        [PSCustomObject]@{ success = $true; action = "play_pause" } | ConvertTo-Json -Compress
        exit 0
    }
    "next" {
        $handled = $false
        if ($session) {
            try {
                $pTask = $session.TrySkipNextAsync()
                $handled = $true
            } catch {
                $handled = $false
            }
        }
        if (-not $handled) {
            [WinMediaFallback]::SendKey(176)
        }
        [PSCustomObject]@{ success = $true; action = "next" } | ConvertTo-Json -Compress
        exit 0
    }
    "prev" {
        $handled = $false
        if ($session) {
            try {
                $pTask = $session.TrySkipPreviousAsync()
                $handled = $true
            } catch {
                $handled = $false
            }
        }
        if (-not $handled) {
            [WinMediaFallback]::SendKey(177)
        }
        [PSCustomObject]@{ success = $true; action = "prev" } | ConvertTo-Json -Compress
        exit 0
    }
    "toggle_repeat" {
        $handled = $false
        if ($session) {
            try {
                $playbackInfo = $session.GetPlaybackInfo()
                $newRepeat = 1
                if ($playbackInfo -and $playbackInfo.AutoRepeatMode) {
                    $curr = [int]$playbackInfo.AutoRepeatMode
                    if ($curr -eq 1) { $newRepeat = 2 }
                    elseif ($curr -eq 2) { $newRepeat = 0 }
                    else { $newRepeat = 1 }
                }
                $rOp = $session.TryChangeAutoRepeatModeAsync($newRepeat)
                $handled = $true
            } catch {
                $handled = $false
            }
        }
        [PSCustomObject]@{ success = $handled; action = "toggle_repeat" } | ConvertTo-Json -Compress
        exit 0
    }
    "toggle_shuffle" {
        $handled = $false
        if ($session) {
            try {
                $playbackInfo = $session.GetPlaybackInfo()
                $newShuffle = $true
                if ($playbackInfo -and $playbackInfo.IsShuffleActive -ne $null) {
                    $newShuffle = -not $playbackInfo.IsShuffleActive
                }
                $sOp = $session.TryChangeShuffleActiveAsync($newShuffle)
                $handled = $true
            } catch {
                $handled = $false
            }
        }
        [PSCustomObject]@{ success = $handled; action = "toggle_shuffle" } | ConvertTo-Json -Compress
        exit 0
    }
    default {
        if ($session) {
            try {
                $propOp = $session.TryGetMediaPropertiesAsync()
                $propTask = $asTask.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]).Invoke($null, @($propOp))
                $info = $propTask.Result
                $playbackInfo = $session.GetPlaybackInfo()

                $statusStr = "Playing"
                if ($playbackInfo -and $playbackInfo.PlaybackStatus) {
                    $statusStr = $playbackInfo.PlaybackStatus.ToString()
                }

                $sourceName = "System Audio"
                $src = $session.SourceAppId
                if ($src) {
                    if ($src -match "Spotify") { $sourceName = "Spotify" }
                    elseif ($src -match "Chrome") { $sourceName = "YouTube / Web" }
                    elseif ($src -match "Edge") { $sourceName = "Edge / Web" }
                    elseif ($src -match "Firefox") { $sourceName = "Firefox / Web" }
                    elseif ($src -match "SoundCloud") { $sourceName = "SoundCloud" }
                    else { $sourceName = $src }
                }

                $repeatMode = "None"
                $shuffleActive = $false
                if ($playbackInfo) {
                    if ($playbackInfo.AutoRepeatMode) { $repeatMode = $playbackInfo.AutoRepeatMode.ToString() }
                    if ($playbackInfo.IsShuffleActive) { $shuffleActive = [bool]$playbackInfo.IsShuffleActive }
                }

                [PSCustomObject]@{
                    Active = $true
                    Title = if ($info.Title) { $info.Title } else { "Active Audio" }
                    Artist = if ($info.Artist) { $info.Artist } else { "System Audio Source" }
                    Album = if ($info.AlbumTitle) { $info.AlbumTitle } else { "" }
                    Source = $sourceName
                    Status = $statusStr
                    Repeat = $repeatMode
                    Shuffle = $shuffleActive
                } | ConvertTo-Json -Compress
                exit 0
            } catch {
            }
        }

        [PSCustomObject]@{
            Active = $false
            Title = "Ready to listen"
            Artist = "Play music on Spotify, YouTube, or SoundCloud..."
            Album = ""
            Source = "System Audio"
            Status = "Stopped"
            Repeat = "None"
            Shuffle = $false
        } | ConvertTo-Json -Compress
    }
}
