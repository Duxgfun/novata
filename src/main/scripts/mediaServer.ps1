param()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$csharpSource = @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class WinMediaFallback {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void SendKey(byte key) {
        keybd_event(key, 0, 0, UIntPtr.Zero);
        keybd_event(key, 0, 2, UIntPtr.Zero);
    }
}

public class WinMemoryTrimmer {
    [DllImport("psapi.dll")]
    public static extern bool EmptyWorkingSet(IntPtr hProcess);

    public static void TrimProcesses(string[] names) {
        foreach (string name in names) {
            try {
                Process[] procs = Process.GetProcessesByName(name);
                foreach (Process p in procs) {
                    try {
                        EmptyWorkingSet(p.Handle);
                    } catch {}
                    finally {
                        p.Dispose();
                    }
                }
            } catch {}
        }
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

function Get-MediaManagerInstance {
    try {
        $op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
        $task = $asTask.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]).Invoke($null, @($op))
        return $task.Result
    } catch {
        return $null
    }
}

$mgr = Get-MediaManagerInstance
Write-Output "READY"

$targetNames = @("Novata", "electron")

while ($cmd = [Console]::In.ReadLine()) {
    if (-not $cmd) { continue }
    $cmd = $cmd.Trim().ToLower()

    if ($cmd -eq "exit") {
        break
    }

    if ($cmd -eq "trim") {
        [WinMemoryTrimmer]::TrimProcesses($targetNames)
        Write-Output '{"success":true,"action":"trim"}'
        continue
    }

    if (-not $mgr) {
        $mgr = Get-MediaManagerInstance
    }

    $session = $null
    if ($mgr) {
        try {
            $session = $mgr.GetCurrentSession()
            if ($session) {
                $srcId = $session.SourceAppId
                # Bo qua phien phat nhac cua chinh Novata de tranh doc nham nhac In-App lam nhac he thong ngoai
                if ($srcId -and ($srcId -match "Novata" -or $srcId -match "electron")) {
                    $session = $null
                }
            }
        } catch {
            $session = $null
        }
    }

    switch ($cmd) {
        "trim" {
            try {
                [WinMemoryTrimmer]::TrimProcesses(@("Novata", "electron", "powershell"))
            } catch {}
            Write-Output '{"success":true,"action":"trim"}'
        }
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
            Write-Output '{"success":true,"action":"play_pause"}'
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
            Write-Output '{"success":true,"action":"next"}'
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
            Write-Output '{"success":true,"action":"prev"}'
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
            $repSuccess = if ($handled) { 'true' } else { 'false' }
            Write-Output ('{"success":' + $repSuccess + ',"action":"toggle_repeat"}')
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
            $shufSuccess = if ($handled) { 'true' } else { 'false' }
            Write-Output ('{"success":' + $shufSuccess + ',"action":"toggle_shuffle"}')
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
                    continue
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
}
