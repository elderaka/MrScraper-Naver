gcloud auth login

$PROJECT_ID = "gen-lang-client-0650902409"
gcloud config set project $PROJECT_ID

gcloud services enable cloudbuild.googleapis.com run.googleapis.com

gcloud run deploy mr-scraper `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 2 `
    --timeout 300 `
    --set-env-vars "PROXY_URL=YOUR_PROXY_URL"
