# Swagger/OpenAPI Documentation Setup

## Current Status

✅ **L5-Swagger Package**: Installed (`darkaonline/l5-swagger`)
✅ **Swagger Annotations**: All controllers have proper `@OA` annotations
✅ **Security Scheme**: Sanctum bearer token configured
✅ **Routes**: Swagger UI route available at `/api/documentation`

## Configuration

### Files Configured:
1. **`config/l5-swagger.php`** - Main Swagger configuration
2. **`app/Http/Controllers/SwaggerSchemas.php`** - Global Swagger schemas and info
3. **All Controllers** - Have proper `@OA` annotations for all endpoints

### Controllers with Swagger Documentation:
- ✅ `BuyerAuthController` - All 5 methods documented
- ✅ `SellerAuthController` - All 4 methods documented  
- ✅ `AdminAuthController` - All 2 methods documented
- ✅ `GeographicController` - All 4 methods documented

## Generating Swagger Documentation

### Command:
```bash
php artisan l5-swagger:generate
```

### Access Swagger UI:
```
http://localhost:8000/api/documentation
```

## Current Issue

There's a known issue with swagger-php generating documentation that shows:
```
Required @OA\PathItem() not found
```

This is typically a warning that can be ignored if using OpenAPI 3.0 (which we are). The documentation should still be accessible.

## Troubleshooting

1. **Clear caches**:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

2. **Check annotations**: Ensure all controller methods have `@OA\Get`, `@OA\Post`, etc.

3. **Verify OpenAPI version**: Set in `config/l5-swagger.php`:
   ```php
   'open_api_spec_version' => '3.0.0',
   ```

4. **Check server URL**: In `SwaggerSchemas.php`, ensure server URL is correct:
   ```php
   @OA\Server(
       url="http://localhost:8000/api",
       description="API Server"
   )
   ```

## Next Steps

1. Try accessing `/api/documentation` directly in browser
2. If error persists, check Laravel logs: `storage/logs/laravel.log`
3. Verify all annotations are syntactically correct
4. Consider updating l5-swagger package if needed

## Environment Variables (Optional)

Add to `.env` if needed:
```env
L5_SWAGGER_BASE_PATH=/api
L5_SWAGGER_GENERATE_ALWAYS=false
L5_SWAGGER_OPEN_API_SPEC_VERSION=3.0.0
```
