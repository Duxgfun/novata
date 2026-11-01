Add-Type -AssemblyName System.Drawing

$sourcePath = "assets/icon.png"
$icoPath = "assets/icon.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$fileStream = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()

$icon.Dispose()
$bmp.Dispose()
Write-Output "assets/icon.ico generated successfully"
