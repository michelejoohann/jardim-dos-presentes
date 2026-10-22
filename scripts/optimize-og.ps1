Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\miche\.gemini\antigravity-ide\brain\ecbedb56-ce09-4446-9d47-ce775514902a\jardim_og_welcome_1792701405073.jpg"
$destPath1 = (Resolve-Path "public\og-image.jpg").Path
$destPath2 = (Resolve-Path "public\images\og-image.jpg").Path

$img = [System.Drawing.Image]::FromFile($srcPath)
$newWidth = 1200
$newHeight = [int]($img.Height * ($newWidth / $img.Width))

$bitmap = New-Object System.Drawing.Bitmap $newWidth, $newHeight
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)
$graphics.Dispose()
$img.Dispose()

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq 'JPEG' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]78)

$bitmap.Save($destPath1, $encoder, $encoderParams)
$bitmap.Save($destPath2, $encoder, $encoderParams)
$bitmap.Dispose()

$size = (Get-Item $destPath1).Length
Write-Host "Success! New file size: $([math]::Round($size / 1024, 1)) KB"
