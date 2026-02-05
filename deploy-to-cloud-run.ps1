param(
    [string]$ProjectId = "gen-lang-client-0650902409",
    [string]$ProxyUrl = $(Read-Host "Enter PROXY_URL"),
    [string]$Region = "us-central1",
    [string]$ServiceName = "mr-scraper"
)

Write-Host "Deploying to Google Cloud Run" -ForegroundColor Green
Write-Host "Project: $ProjectId"
Write-Host "Service: $ServiceName"
Write-Host "Region: $Region"

gcloud config set project $ProjectId

Write-Host "`nEnabling APIs"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

Write-Host "`nDeploying"
gcloud run deploy $ServiceName `
    --source . `
    --project=$ProjectId `
    --platform managed `
    --region $Region `
    --memory 1Gi `
    --cpu 2 `
    --timeout 300 `
    --set-env-vars "PROXY_URL=$ProxyUrl" `
    --allow-unauthenticated

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

$ServiceUrl = gcloud run services describe $ServiceName `
    --project=$ProjectId `
    --region=$Region `
    --format='value(status.url)'

Write-Host "`nService URL: $ServiceUrl" -ForegroundColor Green
Write-Host "Health: $ServiceUrl/health"

try {
    $response = Invoke-RestMethod -Uri "$ServiceUrl/health" -TimeoutSec 5
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "Health check failed, wait 30s and retry"
}
