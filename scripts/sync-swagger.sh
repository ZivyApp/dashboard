#!/usr/bin/env bash
# Sincroniza swagger.json do Core para src/api/openapi.json e regenera tipos.
# O Core expõe Swagger 2.x; o script converte para OpenAPI 3.x via swagger2openapi.
# Uso:
#   bash scripts/sync-swagger.sh                  # baixa do Core local (:8080)
#   CORE_SWAGGER_URL=https://host/swagger/doc.json bash scripts/sync-swagger.sh  # outro host
set -euo pipefail

URL="${CORE_SWAGGER_URL:-http://localhost:8080/swagger/doc.json}"
RAW="src/api/openapi-v2.json"
OUT="src/api/openapi.json"

echo "→ baixando $URL"
curl -fsS "$URL" -o "$RAW"

echo "→ convertendo Swagger 2.x → OpenAPI 3.x"
npx swagger2openapi --outfile "$OUT" --patch "$RAW"

echo "→ gerando tipos"
npm run gen:api

echo "→ limpando arquivo temporário"
rm "$RAW"

echo "✓ swagger sincronizado"
