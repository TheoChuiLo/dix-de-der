# Renders the PNG app icons (violet gradient, white spade) with System.Drawing.
# Usage: powershell -File scripts/generate-icons.ps1

Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'

function New-Icon([int]$size, [string]$name) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Full-bleed background: the OS applies its own mask.
    $bounds = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bounds, `
        ([System.Drawing.ColorTranslator]::FromHtml('#8f80ff')), `
        ([System.Drawing.ColorTranslator]::FromHtml('#4a3ccf')), 45
    $graphics.FillRectangle($gradient, $bounds)

    # Spade kept inside the maskable safe zone (central 80 %).
    $font = New-Object System.Drawing.Font 'Segoe UI Symbol', ($size * 0.62), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $area = New-Object System.Drawing.RectangleF 0, (-$size * 0.05), $size, $size
    $graphics.DrawString([string][char]0x2660, $font, $white, $area, $format)

    $bitmap.Save((Join-Path $iconDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
New-Icon 180 'apple-touch-icon.png'
Write-Output "Icons written to $iconDir"
