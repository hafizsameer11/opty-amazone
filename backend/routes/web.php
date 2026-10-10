<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/optical/authorize', [App\Http\Controllers\Optical\AuthorizationController::class, 'show'])->middleware('throttle:30,1')->name('optical.authorize');
Route::post('/optical/authorize', [App\Http\Controllers\Optical\AuthorizationController::class, 'approve'])->middleware('throttle:5,1')->name('optical.authorize.approve');
