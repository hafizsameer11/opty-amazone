# Vista Express self-hosted product-image processor

This private FastAPI service receives Seller product and variant images from the
Laravel backend, removes their backgrounds with local `rembg` +
`birefnet-general`, centres the subject on a pure-white canvas, and returns a
WebP. It does not accept traffic from mobile apps or browsers.

## Production setup with Docker

1. Copy `.env.example` to `.env` in this directory and set a long random
   `IMAGE_PROCESSOR_TOKEN`:

   ```bash
   cp services/image-processor/.env.example services/image-processor/.env
   openssl rand -hex 32
   ```

2. Put the same token in `backend/.env` and enable the Laravel integration:

   ```env
   PRODUCT_IMAGE_PROCESSOR_ENABLED=true
   PRODUCT_IMAGE_PROCESSOR_URL=http://127.0.0.1:8030
   PRODUCT_IMAGE_PROCESSOR_TOKEN=the-same-long-random-secret
   PRODUCT_IMAGE_PROCESSOR_TIMEOUT=90
   ```

3. Build and start it from the repository root:

   ```bash
   docker compose -f docker-compose.image-processor.yml up -d --build
   curl http://127.0.0.1:8030/health
   cd backend && php artisan config:clear && php artisan config:cache
   ```

The initial boot downloads the selected model into the persistent Docker volume
and may take a few minutes. Subsequent starts reuse it.

## Operational rules

- Keep port `8030` bound to `127.0.0.1`; do not proxy it publicly.
- Keep the two tokens identical and never expose either token to a web or app
  build.
- Begin with `MAX_CONCURRENT_JOBS=1` on CPU. Add capacity only after measuring
  actual processing times and memory use.
- `birefnet-general` is selected instead of BRIA RMBG. The upstream BiRefNet
  model card currently lists an MIT licence; retain a licence check whenever
  changing the model or upgrading its weights.
- Laravel retains its safe original-upload fallback if the processor is disabled
  or unavailable, so a processing outage cannot prevent product creation.
