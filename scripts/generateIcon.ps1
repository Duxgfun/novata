Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 128, 128
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background glowing circle
$pt1 = New-Object System.Drawing.Point 0, 0
$pt2 = New-Object System.Drawing.Point 128, 128
$c1 = [System.Drawing.Color]::FromArgb(255, 0, 242, 254)
$c2 = [System.Drawing.Color]::FromArgb(255, 127, 0, 255)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $pt1, $pt2, $c1, $c2

$g.FillEllipse($brush, 8, 8, 112, 112)

# Glass border
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 255, 255, 255)), 4
$g.DrawEllipse($pen, 8, 8, 112, 112)

# Inner core
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 15, 23, 42))
$g.FillEllipse($darkBrush, 16, 16, 96, 96)

# Spectrum bars
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
$heights = @(20, 36, 56, 32, 64, 44, 52, 28, 16)
for ($i = 0; $i -lt $heights.Length; $i++) {
    $h = $heights[$i]
    $x = 28 + $i * 8
    $y = 64 - ($h / 2)
    $g.FillRectangle($whiteBrush, [int]$x, [int]$y, 5, [int]$h)
}

$g.Dispose()
$bmp.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "assets/icon.png generated successfully"
