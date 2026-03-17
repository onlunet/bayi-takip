$productId = "D:\codex\prisma\schema.prisma"
$content = Get-Content -Raw -Path $productId
$content = $content -replace "sku\s+String\?\\r\\n\s+imageUrl\s+String\?\\r\\n\s+unit", "sku            String?`r`n  imageUrl       String?`r`n  unit"
$content = $content -replace "sku\s+String\?\\r\\n\s+imageUrl\s+String\?\\r\\n\s+unit", "sku            String?`r`n  imageUrl       String?`r`n  unit"
Set-Content -Path $productId -Value $content
