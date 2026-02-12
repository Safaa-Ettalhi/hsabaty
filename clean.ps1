Write-Host "Nettoyage des conteneurs et volumes..." -ForegroundColor Yellow

docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v

Write-Host " Nettoyage terminé!" -ForegroundColor Green
