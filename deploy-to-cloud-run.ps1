
param(
    [string]$ProjectId = $(Read-Host "Enter GCP Project ID"),
    [string]$ProxyUrl = $(Read-Host "Enter PROXY_URL"),
    [string]$Region = "us-central1",
    [string]$ServiceName = "mr-scraper"
)

Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan

Write-Host "`n[1/3] Building and pushing Docker image..." -ForegroundColor Yellow
gcloud builds submit `
    --project=$ProjectId `
    --tag="gcr.io/$ProjectId/$ServiceName"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --project=$ProjectId `
    --image="gcr.io/$ProjectId/$ServiceName" `
    --platform managed `
    --region $Region `
    --memory 1Gi `
    --cpu 2 `
    --timeout 300 `
    --set-env-vars "PROXY_URL=$ProxyUrl" `
    --allow-unauthenticated

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Getting service URL..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName `
    --project=$ProjectId `
    --region=$Region `
    --format='value(status.url)'

Write-Host "`nDeployment successful" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host "Health check: $ServiceUrl/health" -ForegroundColor Cyan

Write-Host "`nTesting health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ServiceUrl/health" -TimeoutSec 5
    Write-Host "Health check response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Green
} catch {
    Write-Host "Note: Health check failed (may still be warming up - wait 30 seconds)" -ForegroundColor Yellow
}

Write-Host "`nView logs:" -ForegroundColor Cyan
Write-Host "gcloud run logs read $ServiceName --project=$ProjectId --limit 50" -ForegroundColor Gray
