<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *     title="Optical Marketplace API",
 *     version="1.0.0",
 *     description="API documentation for Optical Marketplace Platform"
 * )
 *
 * @OA\Server(
 *     url="http://localhost:8000/api",
 *     description="API Server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter your bearer token in the format: Bearer {token}"
 * )
 */
abstract class Controller
{
    //
}
