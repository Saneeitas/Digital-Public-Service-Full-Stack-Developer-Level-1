cd ~/app
for name in JWT_SECRET SERVICE_TOKEN PGPASSWORD; do
  value=$(grep "^$name=" .env | cut -d= -f2)
  grep -r -l -F "$value" ~/evidence
done
