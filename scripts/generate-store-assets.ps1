Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$promoDir = Join-Path $root "store-listing\chrome-web-store\media\promo"
New-Item -ItemType Directory -Force -Path $promoDir | Out-Null

function ConvertTo-Color {
  param([Parameter(Mandatory = $true)][string]$Hex)
  return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-SolidBrush {
  param([Parameter(Mandatory = $true)][string]$Hex)
  return [System.Drawing.SolidBrush]::new((ConvertTo-Color $Hex))
}

function New-Pen {
  param(
    [Parameter(Mandatory = $true)][string]$Hex,
    [Parameter(Mandatory = $true)][float]$Width
  )
  return [System.Drawing.Pen]::new((ConvertTo-Color $Hex), $Width)
}

function New-Font {
  param(
    [Parameter(Mandatory = $true)][float]$Size,
    [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
  )
  return [System.Drawing.Font]::new("Segoe UI", $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-RoundedRectanglePath {
  param(
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [Parameter(Mandatory = $true)][float]$Height,
    [Parameter(Mandatory = $true)][float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRectangle {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][System.Drawing.Brush]$Brush,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [Parameter(Mandatory = $true)][float]$Height,
    [Parameter(Mandatory = $true)][float]$Radius
  )

  $path = New-RoundedRectanglePath $X $Y $Width $Height $Radius
  try {
    $Graphics.FillPath($Brush, $path)
  } finally {
    $path.Dispose()
  }
}

function Draw-RoundedRectangle {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][System.Drawing.Pen]$Pen,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [Parameter(Mandatory = $true)][float]$Height,
    [Parameter(Mandatory = $true)][float]$Radius
  )

  $path = New-RoundedRectanglePath $X $Y $Width $Height $Radius
  try {
    $Graphics.DrawPath($Pen, $path)
  } finally {
    $path.Dispose()
  }
}

function Draw-Text {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][System.Drawing.Font]$Font,
    [Parameter(Mandatory = $true)][string]$Color,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [float]$Width = 0,
    [float]$Height = 0
  )

  $brush = New-SolidBrush $Color
  try {
    if ($Width -gt 0 -and $Height -gt 0) {
      $format = [System.Drawing.StringFormat]::new()
      try {
        $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
        $format.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
        $Graphics.DrawString($Text, $Font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height), $format)
      } finally {
        $format.Dispose()
      }
    } else {
      $Graphics.DrawString($Text, $Font, $brush, $X, $Y)
    }
  } finally {
    $brush.Dispose()
  }
}

function Draw-Chip {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [float]$FontSize = 18
  )

  $chipBrush = New-SolidBrush "#182438"
  $chipPen = New-Pen "#5aa9ff" 1.2
  $font = New-Font $FontSize
  try {
    Fill-RoundedRectangle $Graphics $chipBrush $X $Y $Width 38 10
    Draw-RoundedRectangle $Graphics $chipPen $X $Y $Width 38 10
    Draw-Text $Graphics $Text $font "#dcecff" ($X + 16) ($Y + 8) ($Width - 32) 24
  } finally {
    $font.Dispose()
    $chipPen.Dispose()
    $chipBrush.Dispose()
  }
}

function New-Canvas {
  param(
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height
  )

  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)][string]$Path
  )
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Draw-Panel {
  param(
    [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)][float]$X,
    [Parameter(Mandatory = $true)][float]$Y,
    [Parameter(Mandatory = $true)][float]$Width,
    [Parameter(Mandatory = $true)][float]$Height,
    [float]$Scale = 1
  )

  $panel = New-SolidBrush "#101827"
  $inner = New-SolidBrush "#172236"
  $blue = New-SolidBrush "#5aa9ff"
  $muted = New-SolidBrush "#22304a"
  $border = New-Pen "#5a6f91" (1.2 * $Scale)
  $titleFont = New-Font (24 * $Scale) ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Font (16 * $Scale)
  $codeFont = [System.Drawing.Font]::new("Consolas", 15 * $Scale, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  try {
    Fill-RoundedRectangle $Graphics $panel $X $Y $Width $Height (14 * $Scale)
    Draw-RoundedRectangle $Graphics $border $X $Y $Width $Height (14 * $Scale)

    Draw-Text $Graphics "Element Evidence" $titleFont "#ffffff" ($X + 26 * $Scale) ($Y + 24 * $Scale)
    Draw-Text $Graphics "Copy selected DevTools element" $bodyFont "#b7c7dd" ($X + 26 * $Scale) ($Y + 58 * $Scale)

    Fill-RoundedRectangle $Graphics $blue ($X + 26 * $Scale) ($Y + 94 * $Scale) ($Width - 52 * $Scale) (52 * $Scale) (10 * $Scale)
    Draw-Text $Graphics "Copy bundle" $bodyFont "#07111f" ($X + 46 * $Scale) ($Y + 110 * $Scale)

    Fill-RoundedRectangle $Graphics $inner ($X + 26 * $Scale) ($Y + 168 * $Scale) ($Width - 52 * $Scale) (86 * $Scale) (10 * $Scale)
    Draw-Text $Graphics "SELECTED ELEMENT" $bodyFont "#ffffff" ($X + 46 * $Scale) ($Y + 184 * $Scale)
    Draw-Text $Graphics "<a> .ytp-suggestion-set" $codeFont "#dcecff" ($X + 46 * $Scale) ($Y + 214 * $Scale)

    Fill-RoundedRectangle $Graphics $muted ($X + 26 * $Scale) ($Y + 276 * $Scale) ($Width - 52 * $Scale) ($Height - 302 * $Scale) (10 * $Scale)
    Draw-Text $Graphics "{`n  ""chromeCopyMenu"": {`n    ""copySelector"": ""a.ytp...""`n    ""copyJsPath"": ""document.query...""`n    ""copyFullXPath"": ""/html/body...""`n  },`n  ""automation"": { ""preferredLocator"": ""page.getByRole(...)"" }`n}" $codeFont "#e7f0ff" ($X + 46 * $Scale) ($Y + 298 * $Scale) ($Width - 92 * $Scale) ($Height - 328 * $Scale)
  } finally {
    $codeFont.Dispose()
    $bodyFont.Dispose()
    $titleFont.Dispose()
    $border.Dispose()
    $muted.Dispose()
    $blue.Dispose()
    $inner.Dispose()
    $panel.Dispose()
  }
}

function New-SmallPromo {
  $canvas = New-Canvas 440 280
  $bitmap = $canvas.Bitmap
  $graphics = $canvas.Graphics
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, 440, 280),
    (ConvertTo-Color "#0b1020"),
    (ConvertTo-Color "#17375f"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $titleFont = New-Font 30 ([System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Font 15
  $labelFont = New-Font 13 ([System.Drawing.FontStyle]::Bold)
  $linePen = New-Pen "#5aa9ff" 3
  try {
    $graphics.FillRectangle($background, 0, 0, 440, 280)
    Draw-Text $graphics "Element Evidence" $titleFont "#ffffff" 28 26
    Draw-Text $graphics "DOM, locators, styles. One click." $subtitleFont "#cfe5ff" 30 66

    Draw-Chip $graphics "CSS selector" 30 105 140 15
    Draw-Chip $graphics "JS path" 188 105 92 15
    Draw-Chip $graphics "XPath" 298 105 86 15

    $graphics.DrawLine($linePen, 220, 154, 220, 196)
    $graphics.DrawLine($linePen, 220, 196, 338, 196)

    $button = New-SolidBrush "#5aa9ff"
    Fill-RoundedRectangle $graphics $button 52 186 336 54 12
    Draw-Text $graphics "Copy bundle" $labelFont "#07111f" 174 205

    Draw-Text $graphics "Chrome DevTools sidebar" $subtitleFont "#a7bad4" 130 248
  } finally {
    $linePen.Dispose()
    $labelFont.Dispose()
    $subtitleFont.Dispose()
    $titleFont.Dispose()
    $background.Dispose()
    $graphics.Dispose()
    Save-Png $bitmap (Join-Path $promoDir "small-promo.png")
    $bitmap.Dispose()
  }
}

function New-MarqueePromo {
  $canvas = New-Canvas 1400 560
  $bitmap = $canvas.Bitmap
  $graphics = $canvas.Graphics
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, 1400, 560),
    (ConvertTo-Color "#08111f"),
    (ConvertTo-Color "#1d4e7a"),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
  )
  $titleFont = New-Font 68 ([System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Font 30
  $smallFont = New-Font 22
  $accentPen = New-Pen "#6cc4ff" 5
  try {
    $graphics.FillRectangle($background, 0, 0, 1400, 560)
    Draw-Text $graphics "Element Evidence" $titleFont "#ffffff" 78 84
    Draw-Text $graphics "Copy DOM, locators, styles, and automation hints from the selected DevTools element." $subtitleFont "#d3e8ff" 84 178 560 120
    Draw-Text $graphics "Built for blocker reports, QA handoffs, and browser automation work." $smallFont "#a8bfd9" 86 292 520 70

    Draw-Chip $graphics "outerHTML" 88 390 140
    Draw-Chip $graphics "CSS selector" 248 390 170
    Draw-Chip $graphics "JS path" 438 390 120
    Draw-Chip $graphics "XPath" 88 446 110
    Draw-Chip $graphics "Styles" 218 446 110
    Draw-Chip $graphics "Playwright" 348 446 160

    $graphics.DrawLine($accentPen, 674, 80, 674, 480)
    Draw-Panel $graphics 740 56 560 448 1
  } finally {
    $accentPen.Dispose()
    $smallFont.Dispose()
    $subtitleFont.Dispose()
    $titleFont.Dispose()
    $background.Dispose()
    $graphics.Dispose()
    Save-Png $bitmap (Join-Path $promoDir "marquee-promo.png")
    $bitmap.Dispose()
  }
}

New-SmallPromo
New-MarqueePromo

Write-Output "Generated store-listing/chrome-web-store/media/promo/small-promo.png (440x280)"
Write-Output "Generated store-listing/chrome-web-store/media/promo/marquee-promo.png (1400x560)"
