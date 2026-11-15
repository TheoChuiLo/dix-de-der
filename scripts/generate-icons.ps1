# Renders the PNG app icons (felt background, cream card, spade) with System.Drawing.
# Usage: powershell -File scripts/generate-icons.ps1

Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'

function New-RoundedRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Icon([int]$size, [string]$name) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $bounds = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $felt = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bounds, `
        ([System.Drawing.ColorTranslator]::FromHtml('#1c7048')), `
        ([System.Drawing.ColorTranslator]::FromHtml('#072a1b')), 90
    $graphics.FillRectangle($felt, $bounds)

    # Card kept inside the maskable safe zone (central 80 %).
    $cardW = $size * 0.43
    $cardH = $size * 0.625
    $cardX = ($size - $cardW) / 2
    $cardY = ($size - $cardH) / 2
    $card = New-RoundedRect $cardX $cardY $cardW $cardH ($size * 0.055)
    $graphics.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#fbf5e4'))), $card)
    $border = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#f0cd6e')), ($size * 0.02)
    $graphics.DrawPath($border, $card)

    $font = New-Object System.Drawing.Font 'Segoe UI Symbol', ($size * 0.42), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#17241c'))
    $area = New-Object System.Drawing.RectangleF 0, (-$size * 0.035), $size, $size
    $graphics.DrawString([string][char]0x2660, $font, $ink, $area, $format)

    $bitmap.Save((Join-Path $iconDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
New-Icon 180 'apple-touch-icon.png'
Write-Output "Icons written to $iconDir"
