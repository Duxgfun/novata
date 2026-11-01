Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Outer glowing circle gradient
$pt1 = New-Object System.Drawing.Point 0, 0
$pt2 = New-Object System.Drawing.Point $size, $size
$c1 = [System.Drawing.Color]::FromArgb(255, 0, 242, 254)
$c2 = [System.Drawing.Color]::FromArgb(255, 127, 0, 255)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $pt1, $pt2, $c1, $c2

$g.FillEllipse($brush, 24, 24, 464, 464)

# Glass border highlight
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 255, 255, 255)), 12
$g.DrawEllipse($pen, 24, 24, 464, 464)

# Inner core
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 15, 23, 42))
$g.FillEllipse($darkBrush, 56, 56, 400, 400)

# Inner core border
$innerPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 0, 242, 254)), 4
$g.DrawEllipse($innerPen, 56, 56, 400, 400)

# Spectrum bars
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(250, 255, 255, 255))
$heights = @(70, 130, 210, 120, 260, 170, 220, 110, 60)
for ($i = 0; $i -lt $heights.Length; $i++) {
    $h = $heights[$i]
    $x = 105 + $i * 34
    $y = 256 - ($h / 2)
    $g.FillRectangle($whiteBrush, [int]$x, [int]$y, 18, [int]$h)
}

$g.Dispose()

# Save 512x512 PNG
$bmp.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Generate multi-size ICO (256x256)
$bmp256 = New-Object System.Drawing.Bitmap $bmp, 256, 256
$hIcon = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fileStream = New-Object System.IO.FileStream("assets/icon.ico", [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()

$icon.Dispose()
$bmp256.Dispose()
$bmp.Dispose()

Write-Output "512x512 icon.png and 256x256 icon.ico generated successfully"
