-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 03, 2026 at 01:27 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `optyshop`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_activity_logs`
--

CREATE TABLE `admin_activity_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 1,
  `details` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analytics_events`
--

CREATE TABLE `analytics_events` (
  `id` int(11) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `device` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_error_logs`
--

CREATE TABLE `api_error_logs` (
  `id` int(11) NOT NULL,
  `path` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `status_code` int(11) NOT NULL,
  `error_message` text DEFAULT NULL,
  `request_id` varchar(100) DEFAULT NULL,
  `meta` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `astigmatism_configurations`
--

CREATE TABLE `astigmatism_configurations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `sub_category_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `right_qty` longtext DEFAULT NULL,
  `right_base_curve` longtext DEFAULT NULL,
  `right_diameter` longtext DEFAULT NULL,
  `right_power` longtext DEFAULT NULL,
  `right_cylinder` longtext DEFAULT NULL,
  `right_axis` longtext DEFAULT NULL,
  `left_qty` longtext DEFAULT NULL,
  `left_base_curve` longtext DEFAULT NULL,
  `left_diameter` longtext DEFAULT NULL,
  `left_power` longtext DEFAULT NULL,
  `left_cylinder` longtext DEFAULT NULL,
  `left_axis` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `productId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `astigmatism_dropdown_values`
--

CREATE TABLE `astigmatism_dropdown_values` (
  `id` int(11) NOT NULL,
  `field_type` enum('qty','base_curve','diameter','power','cylinder','axis') NOT NULL,
  `value` varchar(50) NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `eye_type` enum('left','right','both') DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `position` varchar(50) DEFAULT NULL,
  `page_type` enum('home','category','subcategory','sub_subcategory') NOT NULL DEFAULT 'home',
  `category_id` int(11) DEFAULT NULL,
  `sub_category_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `meta` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blog_articles`
--

CREATE TABLE `blog_articles` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `snippet` varchar(500) DEFAULT NULL,
  `summary` varchar(1000) DEFAULT NULL,
  `content` text NOT NULL,
  `read_time` int(11) DEFAULT NULL,
  `header_image` varchar(500) DEFAULT NULL,
  `key_points` longtext DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blog_posts`
--

CREATE TABLE `blog_posts` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `excerpt` varchar(500) DEFAULT NULL,
  `content` text NOT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `tags` longtext DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `published_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `logo_image` varchar(500) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `carts`
--

CREATE TABLE `carts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `coupon_code` varchar(50) DEFAULT NULL,
  `payment_info` longtext DEFAULT NULL,
  `shipping_info` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` int(11) NOT NULL,
  `cart_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `lens_index` decimal(3,2) DEFAULT NULL,
  `lens_coatings` longtext DEFAULT NULL,
  `frame_size_id` int(11) DEFAULT NULL,
  `customization` longtext DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `prescription_id` int(11) DEFAULT NULL,
  `lens_thickness_material_id` int(11) DEFAULT NULL,
  `lens_thickness_option_id` int(11) DEFAULT NULL,
  `lens_type` varchar(50) DEFAULT NULL,
  `photochromic_color_id` int(11) DEFAULT NULL,
  `prescription_data` longtext DEFAULT NULL,
  `prescription_sun_color_id` int(11) DEFAULT NULL,
  `progressive_variant_id` int(11) DEFAULT NULL,
  `treatment_ids` longtext DEFAULT NULL,
  `contact_lens_left_base_curve` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_diameter` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_power` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_qty` int(11) DEFAULT NULL,
  `contact_lens_right_base_curve` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_diameter` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_power` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_qty` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `case_studies`
--

CREATE TABLE `case_studies` (
  `id` int(11) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `title` varchar(255) NOT NULL,
  `hero_title` varchar(255) NOT NULL,
  `hero_subtitle` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `person` longtext DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `tags` longtext DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Test Category', 'test-category', NULL, NULL, 1, 0, '2026-01-26 20:33:27.461', '2026-01-26 20:33:27.461');

-- --------------------------------------------------------

--
-- Table structure for table `contact_lens_configurations`
--

CREATE TABLE `contact_lens_configurations` (
  `id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `sub_category_id` int(11) DEFAULT NULL,
  `configuration_type` enum('spherical','astigmatism') NOT NULL,
  `lens_type` varchar(255) DEFAULT NULL,
  `right_qty` longtext DEFAULT NULL,
  `right_base_curve` longtext DEFAULT NULL,
  `right_diameter` longtext DEFAULT NULL,
  `right_power` longtext DEFAULT NULL,
  `right_cylinder` longtext DEFAULT NULL,
  `right_axis` longtext DEFAULT NULL,
  `left_qty` longtext DEFAULT NULL,
  `left_base_curve` longtext DEFAULT NULL,
  `left_diameter` longtext DEFAULT NULL,
  `left_power` longtext DEFAULT NULL,
  `left_cylinder` longtext DEFAULT NULL,
  `left_axis` longtext DEFAULT NULL,
  `display_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `color_images` longtext DEFAULT NULL,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `images` longtext DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `stock_status` enum('in_stock','out_of_stock','backorder') NOT NULL DEFAULT 'in_stock',
  `category_id` int(11) DEFAULT NULL,
  `frame_color` varchar(100) DEFAULT NULL,
  `frame_material` varchar(255) DEFAULT NULL,
  `frame_shape` varchar(255) DEFAULT NULL,
  `gender` enum('men','women','unisex','kids') NOT NULL DEFAULT 'unisex',
  `spherical_lens_type` varchar(100) DEFAULT NULL,
  `unit_images` longtext DEFAULT NULL,
  `unit_prices` longtext DEFAULT NULL,
  `available_units` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contact_requests`
--

CREATE TABLE `contact_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `country` varchar(100) NOT NULL,
  `company_name` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount','free_shipping','bogo') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `min_order_amount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `usage_per_user` int(11) DEFAULT NULL,
  `starts_at` datetime(3) DEFAULT NULL,
  `ends_at` datetime(3) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `applicable_to` varchar(50) DEFAULT NULL,
  `conditions` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `credentials_requests`
--

CREATE TABLE `credentials_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone_number` varchar(50) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `demo_requests`
--

CREATE TABLE `demo_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `surname` varchar(100) NOT NULL,
  `village` varchar(100) NOT NULL,
  `company_name` varchar(150) NOT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `frames_in_catalog` varchar(50) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `eye_hygiene_variants`
--

CREATE TABLE `eye_hygiene_variants` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `faqs`
--

CREATE TABLE `faqs` (
  `id` int(11) NOT NULL,
  `question` varchar(500) NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `flash_offers`
--

CREATE TABLE `flash_offers` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `product_ids` longtext DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount','free_shipping','bogo') DEFAULT NULL,
  `discount_value` decimal(10,2) DEFAULT NULL,
  `starts_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `ends_at` datetime(3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `image_url` varchar(500) DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `form_configs`
--

CREATE TABLE `form_configs` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `fields` longtext NOT NULL,
  `cta_text` varchar(150) DEFAULT NULL,
  `meta` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `form_submissions`
--

CREATE TABLE `form_submissions` (
  `id` int(11) NOT NULL,
  `form_name` varchar(100) NOT NULL,
  `form_config_id` int(11) DEFAULT NULL,
  `payload` longtext NOT NULL,
  `meta` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `frame_sizes`
--

CREATE TABLE `frame_sizes` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `lens_width` decimal(5,2) NOT NULL,
  `bridge_width` decimal(5,2) NOT NULL,
  `temple_length` decimal(5,2) NOT NULL,
  `frame_width` decimal(5,2) DEFAULT NULL,
  `frame_height` decimal(5,2) DEFAULT NULL,
  `size_label` varchar(50) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` int(11) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `requirements` longtext DEFAULT NULL,
  `apply_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_applications`
--

CREATE TABLE `job_applications` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(50) NOT NULL,
  `linkedin_profile` varchar(500) DEFAULT NULL,
  `portfolio_website` varchar(500) DEFAULT NULL,
  `resume_cv` varchar(500) NOT NULL,
  `cover_letter_file` varchar(500) DEFAULT NULL,
  `why_join_message` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `notes` text DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_coatings`
--

CREATE TABLE `lens_coatings` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `type` enum('ar','blue_light','uv','scratch','photochromic','polarized') NOT NULL,
  `description` text DEFAULT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_colors`
--

CREATE TABLE `lens_colors` (
  `id` int(11) NOT NULL,
  `lens_option_id` int(11) DEFAULT NULL,
  `lens_finish_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `color_code` varchar(50) NOT NULL,
  `hex_code` varchar(7) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `prescription_lens_type_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_finishes`
--

CREATE TABLE `lens_finishes` (
  `id` int(11) NOT NULL,
  `lens_option_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_options`
--

CREATE TABLE `lens_options` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `type` enum('classic','mirror','gradient','polarized','photochromic','transitions','eyeqlenz','standard','blokz_photochromic') NOT NULL,
  `description` text DEFAULT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_packages`
--

CREATE TABLE `lens_packages` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `base_index` decimal(3,2) NOT NULL,
  `lens_type_id` int(11) DEFAULT NULL,
  `coatings` longtext DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `price_rules` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_thickness_materials`
--

CREATE TABLE `lens_thickness_materials` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_thickness_options`
--

CREATE TABLE `lens_thickness_options` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `thickness_value` decimal(5,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_treatments`
--

CREATE TABLE `lens_treatments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `type` enum('scratch_proof','anti_glare','blue_light_anti_glare','uv_protection','photochromic','polarized','anti_reflective') NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `icon` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lens_types`
--

CREATE TABLE `lens_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `index` decimal(3,2) NOT NULL,
  `thickness_factor` decimal(5,2) DEFAULT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketing_campaigns`
--

CREATE TABLE `marketing_campaigns` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `campaign_type` varchar(50) DEFAULT NULL,
  `config` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `starts_at` datetime(3) DEFAULT NULL,
  `ends_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `prescription_id` int(11) DEFAULT NULL,
  `status` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `payment_method` enum('stripe','paypal','cod') DEFAULT NULL,
  `payment_id` varchar(255) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_address` longtext NOT NULL,
  `billing_address` longtext DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `shipped_at` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_sku` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `lens_index` decimal(3,2) DEFAULT NULL,
  `lens_coatings` longtext DEFAULT NULL,
  `frame_size_id` int(11) DEFAULT NULL,
  `customization` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `contact_lens_left_base_curve` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_diameter` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_power` decimal(5,2) DEFAULT NULL,
  `contact_lens_left_qty` int(11) DEFAULT NULL,
  `contact_lens_right_base_curve` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_diameter` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_power` decimal(5,2) DEFAULT NULL,
  `contact_lens_right_qty` int(11) DEFAULT NULL,
  `lens_thickness_material_id` int(11) DEFAULT NULL,
  `lens_thickness_option_id` int(11) DEFAULT NULL,
  `lens_type` varchar(50) DEFAULT NULL,
  `photochromic_color_id` int(11) DEFAULT NULL,
  `prescription_data` longtext DEFAULT NULL,
  `prescription_id` int(11) DEFAULT NULL,
  `prescription_sun_color_id` int(11) DEFAULT NULL,
  `progressive_variant_id` int(11) DEFAULT NULL,
  `treatment_ids` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `page_type` varchar(50) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `prescription_type` enum('single_vision','bifocal','trifocal','progressive') NOT NULL DEFAULT 'single_vision',
  `od_sphere` decimal(5,2) DEFAULT NULL,
  `od_cylinder` decimal(5,2) DEFAULT NULL,
  `od_axis` int(11) DEFAULT NULL,
  `od_add` decimal(5,2) DEFAULT NULL,
  `os_sphere` decimal(5,2) DEFAULT NULL,
  `os_cylinder` decimal(5,2) DEFAULT NULL,
  `os_axis` int(11) DEFAULT NULL,
  `os_add` decimal(5,2) DEFAULT NULL,
  `pd_binocular` decimal(5,2) DEFAULT NULL,
  `pd_monocular_od` decimal(5,2) DEFAULT NULL,
  `pd_monocular_os` decimal(5,2) DEFAULT NULL,
  `pd_near` decimal(5,2) DEFAULT NULL,
  `ph_od` decimal(5,2) DEFAULT NULL,
  `ph_os` decimal(5,2) DEFAULT NULL,
  `doctor_name` varchar(255) DEFAULT NULL,
  `doctor_license` varchar(100) DEFAULT NULL,
  `prescription_date` datetime(3) DEFAULT NULL,
  `expiry_date` datetime(3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_form_dropdown_values`
--

CREATE TABLE `prescription_form_dropdown_values` (
  `id` int(11) NOT NULL,
  `field_type` enum('pd','sph','cyl','axis','h','year_of_birth','select_option') NOT NULL,
  `value` varchar(50) NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `eye_type` enum('left','right','both') DEFAULT NULL,
  `form_type` enum('progressive','near_vision','distance_vision') DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_lens_types`
--

CREATE TABLE `prescription_lens_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prescription_type` enum('single_vision','bifocal','trifocal','progressive') NOT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT 60.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_lens_variants`
--

CREATE TABLE `prescription_lens_variants` (
  `id` int(11) NOT NULL,
  `prescription_lens_type_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `viewing_range` varchar(100) DEFAULT NULL,
  `use_cases` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `stock_status` enum('in_stock','out_of_stock','backorder') NOT NULL DEFAULT 'in_stock',
  `images` longtext DEFAULT NULL,
  `frame_shape` varchar(255) DEFAULT NULL,
  `frame_material` varchar(255) DEFAULT NULL,
  `frame_color` varchar(100) DEFAULT NULL,
  `gender` enum('men','women','unisex','kids') NOT NULL DEFAULT 'unisex',
  `lens_type` varchar(255) DEFAULT NULL,
  `lens_index_options` longtext DEFAULT NULL,
  `treatment_options` longtext DEFAULT NULL,
  `model_3d_url` varchar(500) DEFAULT NULL,
  `try_on_image` varchar(500) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `review_count` int(11) NOT NULL DEFAULT 0,
  `view_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `meta_keywords` varchar(255) DEFAULT NULL,
  `product_type` enum('frame','sunglasses','contact_lens','eye_hygiene','accessory') NOT NULL DEFAULT 'frame',
  `sub_category_id` int(11) DEFAULT NULL,
  `base_curve_options` longtext DEFAULT NULL,
  `can_sleep_with` tinyint(1) DEFAULT 0,
  `contact_lens_brand` varchar(100) DEFAULT NULL,
  `contact_lens_color` varchar(100) DEFAULT NULL,
  `contact_lens_material` varchar(100) DEFAULT NULL,
  `contact_lens_type` varchar(50) DEFAULT NULL,
  `diameter_options` longtext DEFAULT NULL,
  `has_uv_filter` tinyint(1) DEFAULT 0,
  `is_medical_device` tinyint(1) DEFAULT 1,
  `powers_range` text DEFAULT NULL,
  `replacement_frequency` varchar(50) DEFAULT NULL,
  `water_content` varchar(50) DEFAULT NULL,
  `color_images` longtext DEFAULT NULL,
  `expiry_date` datetime(3) DEFAULT NULL,
  `pack_type` varchar(50) DEFAULT NULL,
  `size_volume` varchar(50) DEFAULT NULL,
  `mm_calibers` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `slug`, `sku`, `description`, `short_description`, `category_id`, `price`, `compare_at_price`, `cost_price`, `stock_quantity`, `stock_status`, `images`, `frame_shape`, `frame_material`, `frame_color`, `gender`, `lens_type`, `lens_index_options`, `treatment_options`, `model_3d_url`, `try_on_image`, `is_featured`, `is_active`, `meta_title`, `meta_description`, `rating`, `review_count`, `view_count`, `created_at`, `updated_at`, `meta_keywords`, `product_type`, `sub_category_id`, `base_curve_options`, `can_sleep_with`, `contact_lens_brand`, `contact_lens_color`, `contact_lens_material`, `contact_lens_type`, `diameter_options`, `has_uv_filter`, `is_medical_device`, `powers_range`, `replacement_frequency`, `water_content`, `color_images`, `expiry_date`, `pack_type`, `size_volume`, `mm_calibers`) VALUES
(2, 'Test Product', 'test-product', 'TEST-001', NULL, NULL, 1, 100.00, NULL, NULL, 0, 'in_stock', NULL, NULL, NULL, NULL, 'unisex', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, NULL, 0.00, 0, 0, '2026-01-26 20:33:27.478', '2026-01-26 20:42:27.126', NULL, 'frame', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[{\"mm\":\"58\",\"image_url\":\"https://example.com/58mm.jpg\"},{\"mm\":\"62\",\"image_url\":\"https://example.com/62mm.jpg\"}]'),
(4, 'Test Product 2', 'test-product-2', 'TEST-002', NULL, NULL, 1, 100.00, NULL, NULL, 0, 'in_stock', NULL, NULL, NULL, NULL, 'unisex', NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, NULL, 0.00, 0, 0, '2026-01-26 20:38:12.421', '2026-01-26 20:38:12.421', NULL, 'frame', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_gifts`
--

CREATE TABLE `product_gifts` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `gift_product_id` int(11) NOT NULL,
  `min_quantity` int(11) NOT NULL DEFAULT 1,
  `max_quantity` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_lens_coatings`
--

CREATE TABLE `product_lens_coatings` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `lens_coating_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_lens_types`
--

CREATE TABLE `product_lens_types` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `lens_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_size_volumes`
--

CREATE TABLE `product_size_volumes` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `size_volume` varchar(50) NOT NULL,
  `pack_type` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `stock_status` enum('in_stock','out_of_stock','backorder') NOT NULL DEFAULT 'in_stock',
  `sku` varchar(100) DEFAULT NULL,
  `expiry_date` datetime(3) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `size_label` varchar(50) DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `additional_data` longtext DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `price` decimal(10,2) DEFAULT NULL,
  `images` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `images` longtext DEFAULT NULL,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `helpful_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shipping_methods`
--

CREATE TABLE `shipping_methods` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `type` enum('standard','express','overnight','international','free') NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estimated_days` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `icon` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `simulation_configs`
--

CREATE TABLE `simulation_configs` (
  `id` int(11) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` longtext NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spherical_configurations`
--

CREATE TABLE `spherical_configurations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `sub_category_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `right_qty` longtext DEFAULT NULL,
  `right_base_curve` longtext DEFAULT NULL,
  `right_diameter` longtext DEFAULT NULL,
  `right_power` longtext DEFAULT NULL,
  `left_qty` longtext DEFAULT NULL,
  `left_base_curve` longtext DEFAULT NULL,
  `left_diameter` longtext DEFAULT NULL,
  `left_power` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `productId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcategories`
--

CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `parent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_requests`
--

CREATE TABLE `support_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
  `solutions_concerned` longtext DEFAULT NULL,
  `message` text NOT NULL,
  `attachments` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `testimonials`
--

CREATE TABLE `testimonials` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `text` text NOT NULL,
  `rating` int(11) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `transaction_number` varchar(50) NOT NULL,
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('payment','refund','partial_refund','chargeback','reversal') NOT NULL DEFAULT 'payment',
  `status` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_method` enum('stripe','paypal','cod') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `gateway_transaction_id` varchar(255) DEFAULT NULL,
  `gateway_response` longtext DEFAULT NULL,
  `gateway_fee` decimal(10,2) DEFAULT NULL,
  `net_amount` decimal(10,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `processed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('customer','admin','staff') NOT NULL DEFAULT 'customer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `avatar` varchar(500) DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone`, `role`, `is_active`, `email_verified`, `avatar`, `refresh_token`, `reset_password_token`, `reset_password_expires`, `created_at`, `updated_at`) VALUES
(1, 'admin@test.com', '$2a$10$3Ru9fP9SwvnDDuT.V.MRzOeaGTpddQQY7SyRyEaYZeBbmsqXInZ7C', 'Admin', 'User', NULL, 'admin', 1, 1, NULL, NULL, NULL, NULL, '2026-01-26 20:36:50.934', '2026-01-26 20:36:50.934');

-- --------------------------------------------------------

--
-- Table structure for table `vto_assets`
--

CREATE TABLE `vto_assets` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `asset_type` enum('frame_3d','face_mesh','occlusion_mask','environment_map') NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vto_configs`
--

CREATE TABLE `vto_configs` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `settings` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('9c44e380-3750-4947-a5fb-c5afeb066112', '4835e445c136c8351b21aca6b00f9b5f8acb6485cc5b561c36edb9e4eb74852f', '2026-01-26 20:32:00.989', '20260126202552_init', NULL, NULL, '2026-01-26 20:31:53.895', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_activity_logs_admin_id_idx` (`admin_id`),
  ADD KEY `admin_activity_logs_resource_type_resource_id_idx` (`resource_type`,`resource_id`);

--
-- Indexes for table `analytics_events`
--
ALTER TABLE `analytics_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `analytics_events_event_type_idx` (`event_type`),
  ADD KEY `analytics_events_created_at_idx` (`created_at`),
  ADD KEY `analytics_events_user_id_fkey` (`user_id`);

--
-- Indexes for table `api_error_logs`
--
ALTER TABLE `api_error_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_error_logs_path_idx` (`path`),
  ADD KEY `api_error_logs_status_code_idx` (`status_code`);

--
-- Indexes for table `astigmatism_configurations`
--
ALTER TABLE `astigmatism_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `astigmatism_configurations_category_id_fkey` (`category_id`),
  ADD KEY `astigmatism_configurations_productId_fkey` (`productId`),
  ADD KEY `astigmatism_configurations_sub_category_id_fkey` (`sub_category_id`);

--
-- Indexes for table `astigmatism_dropdown_values`
--
ALTER TABLE `astigmatism_dropdown_values`
  ADD PRIMARY KEY (`id`),
  ADD KEY `astigmatism_dropdown_values_field_type_idx` (`field_type`),
  ADD KEY `astigmatism_dropdown_values_eye_type_idx` (`eye_type`),
  ADD KEY `astigmatism_dropdown_values_is_active_idx` (`is_active`),
  ADD KEY `astigmatism_dropdown_values_field_type_is_active_idx` (`field_type`,`is_active`);

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `banners_position_idx` (`position`),
  ADD KEY `banners_page_type_idx` (`page_type`),
  ADD KEY `banners_category_id_idx` (`category_id`),
  ADD KEY `banners_sub_category_id_idx` (`sub_category_id`),
  ADD KEY `banners_page_type_category_id_sub_category_id_idx` (`page_type`,`category_id`,`sub_category_id`);

--
-- Indexes for table `blog_articles`
--
ALTER TABLE `blog_articles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `blog_articles_slug_key` (`slug`),
  ADD KEY `blog_articles_slug_idx` (`slug`),
  ADD KEY `blog_articles_is_published_published_at_idx` (`is_published`,`published_at`);

--
-- Indexes for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `blog_posts_slug_key` (`slug`),
  ADD KEY `blog_posts_slug_idx` (`slug`),
  ADD KEY `blog_posts_is_published_published_at_idx` (`is_published`,`published_at`);

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `brands_name_key` (`name`),
  ADD UNIQUE KEY `brands_slug_key` (`slug`);

--
-- Indexes for table `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `carts_user_id_key` (`user_id`),
  ADD KEY `carts_user_id_idx` (`user_id`),
  ADD KEY `carts_coupon_code_idx` (`coupon_code`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cart_items_cart_id_product_id_lens_index_frame_size_id_key` (`cart_id`,`product_id`,`lens_index`,`frame_size_id`),
  ADD KEY `cart_items_cart_id_idx` (`cart_id`),
  ADD KEY `cart_items_product_id_idx` (`product_id`),
  ADD KEY `cart_items_prescription_id_idx` (`prescription_id`),
  ADD KEY `cart_items_progressive_variant_id_idx` (`progressive_variant_id`),
  ADD KEY `cart_items_lens_thickness_material_id_idx` (`lens_thickness_material_id`),
  ADD KEY `cart_items_lens_thickness_option_id_idx` (`lens_thickness_option_id`),
  ADD KEY `cart_items_photochromic_color_id_idx` (`photochromic_color_id`),
  ADD KEY `cart_items_prescription_sun_color_id_idx` (`prescription_sun_color_id`);

--
-- Indexes for table `case_studies`
--
ALTER TABLE `case_studies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `case_studies_slug_key` (`slug`),
  ADD KEY `case_studies_is_published_idx` (`is_published`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_name_key` (`name`),
  ADD UNIQUE KEY `categories_slug_key` (`slug`);

--
-- Indexes for table `contact_lens_configurations`
--
ALTER TABLE `contact_lens_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `contact_lens_configurations_product_id_idx` (`product_id`),
  ADD KEY `contact_lens_configurations_category_id_idx` (`category_id`),
  ADD KEY `contact_lens_configurations_sub_category_id_idx` (`sub_category_id`),
  ADD KEY `contact_lens_configurations_configuration_type_idx` (`configuration_type`),
  ADD KEY `contact_lens_configurations_is_active_idx` (`is_active`),
  ADD KEY `contact_lens_configurations_slug_idx` (`slug`),
  ADD KEY `contact_lens_configurations_sku_idx` (`sku`),
  ADD KEY `contact_lens_configurations_configuration_type_is_active_idx` (`configuration_type`,`is_active`),
  ADD KEY `contact_lens_configurations_sub_category_id_configuration_ty_idx` (`sub_category_id`,`configuration_type`,`is_active`),
  ADD KEY `contact_lens_configurations_category_id_is_active_idx` (`category_id`,`is_active`);

--
-- Indexes for table `contact_requests`
--
ALTER TABLE `contact_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `coupons_code_key` (`code`),
  ADD KEY `coupons_code_idx` (`code`),
  ADD KEY `coupons_is_active_idx` (`is_active`);

--
-- Indexes for table `credentials_requests`
--
ALTER TABLE `credentials_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `demo_requests`
--
ALTER TABLE `demo_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `eye_hygiene_variants`
--
ALTER TABLE `eye_hygiene_variants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `eye_hygiene_variants_product_id_idx` (`product_id`),
  ADD KEY `eye_hygiene_variants_is_active_idx` (`is_active`);

--
-- Indexes for table `faqs`
--
ALTER TABLE `faqs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `faqs_category_idx` (`category`);

--
-- Indexes for table `flash_offers`
--
ALTER TABLE `flash_offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `flash_offers_is_active_idx` (`is_active`),
  ADD KEY `flash_offers_ends_at_idx` (`ends_at`),
  ADD KEY `flash_offers_starts_at_ends_at_idx` (`starts_at`,`ends_at`);

--
-- Indexes for table `form_configs`
--
ALTER TABLE `form_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `form_configs_name_key` (`name`);

--
-- Indexes for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `form_submissions_form_config_id_idx` (`form_config_id`),
  ADD KEY `form_submissions_form_name_idx` (`form_name`);

--
-- Indexes for table `frame_sizes`
--
ALTER TABLE `frame_sizes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `frame_sizes_product_id_idx` (`product_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `jobs_slug_key` (`slug`),
  ADD KEY `jobs_is_active_idx` (`is_active`);

--
-- Indexes for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_applications_job_id_idx` (`job_id`),
  ADD KEY `job_applications_email_idx` (`email`),
  ADD KEY `job_applications_status_idx` (`status`);

--
-- Indexes for table `lens_coatings`
--
ALTER TABLE `lens_coatings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_coatings_name_key` (`name`),
  ADD UNIQUE KEY `lens_coatings_slug_key` (`slug`);

--
-- Indexes for table `lens_colors`
--
ALTER TABLE `lens_colors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lens_colors_lens_option_id_idx` (`lens_option_id`),
  ADD KEY `lens_colors_lens_finish_id_idx` (`lens_finish_id`),
  ADD KEY `lens_colors_prescription_lens_type_id_idx` (`prescription_lens_type_id`),
  ADD KEY `lens_colors_is_active_idx` (`is_active`);

--
-- Indexes for table `lens_finishes`
--
ALTER TABLE `lens_finishes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_finishes_lens_option_id_slug_key` (`lens_option_id`,`slug`),
  ADD KEY `lens_finishes_lens_option_id_idx` (`lens_option_id`),
  ADD KEY `lens_finishes_is_active_idx` (`is_active`);

--
-- Indexes for table `lens_options`
--
ALTER TABLE `lens_options`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_options_slug_key` (`slug`),
  ADD KEY `lens_options_is_active_idx` (`is_active`),
  ADD KEY `lens_options_type_idx` (`type`);

--
-- Indexes for table `lens_packages`
--
ALTER TABLE `lens_packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_packages_slug_key` (`slug`),
  ADD KEY `lens_packages_lens_type_id_idx` (`lens_type_id`);

--
-- Indexes for table `lens_thickness_materials`
--
ALTER TABLE `lens_thickness_materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_thickness_materials_name_key` (`name`),
  ADD UNIQUE KEY `lens_thickness_materials_slug_key` (`slug`),
  ADD KEY `lens_thickness_materials_is_active_idx` (`is_active`);

--
-- Indexes for table `lens_thickness_options`
--
ALTER TABLE `lens_thickness_options`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_thickness_options_name_key` (`name`),
  ADD UNIQUE KEY `lens_thickness_options_slug_key` (`slug`),
  ADD KEY `lens_thickness_options_is_active_idx` (`is_active`);

--
-- Indexes for table `lens_treatments`
--
ALTER TABLE `lens_treatments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_treatments_name_key` (`name`),
  ADD UNIQUE KEY `lens_treatments_slug_key` (`slug`),
  ADD KEY `lens_treatments_is_active_idx` (`is_active`),
  ADD KEY `lens_treatments_type_idx` (`type`);

--
-- Indexes for table `lens_types`
--
ALTER TABLE `lens_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lens_types_name_key` (`name`),
  ADD UNIQUE KEY `lens_types_slug_key` (`slug`);

--
-- Indexes for table `marketing_campaigns`
--
ALTER TABLE `marketing_campaigns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `marketing_campaigns_slug_key` (`slug`),
  ADD KEY `marketing_campaigns_slug_idx` (`slug`),
  ADD KEY `marketing_campaigns_is_active_idx` (`is_active`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `orders_order_number_key` (`order_number`),
  ADD KEY `orders_user_id_idx` (`user_id`),
  ADD KEY `orders_order_number_idx` (`order_number`),
  ADD KEY `orders_status_idx` (`status`),
  ADD KEY `orders_payment_status_idx` (`payment_status`),
  ADD KEY `orders_prescription_id_fkey` (`prescription_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_order_id_idx` (`order_id`),
  ADD KEY `order_items_product_id_idx` (`product_id`),
  ADD KEY `order_items_prescription_id_idx` (`prescription_id`),
  ADD KEY `order_items_progressive_variant_id_idx` (`progressive_variant_id`),
  ADD KEY `order_items_lens_thickness_material_id_idx` (`lens_thickness_material_id`),
  ADD KEY `order_items_lens_thickness_option_id_idx` (`lens_thickness_option_id`),
  ADD KEY `order_items_photochromic_color_id_idx` (`photochromic_color_id`),
  ADD KEY `order_items_prescription_sun_color_id_idx` (`prescription_sun_color_id`);

--
-- Indexes for table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pages_slug_key` (`slug`),
  ADD KEY `pages_slug_idx` (`slug`);

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prescriptions_user_id_idx` (`user_id`),
  ADD KEY `prescriptions_is_active_idx` (`is_active`);

--
-- Indexes for table `prescription_form_dropdown_values`
--
ALTER TABLE `prescription_form_dropdown_values`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prescription_form_dropdown_values_field_type_idx` (`field_type`),
  ADD KEY `prescription_form_dropdown_values_eye_type_idx` (`eye_type`),
  ADD KEY `prescription_form_dropdown_values_form_type_idx` (`form_type`),
  ADD KEY `prescription_form_dropdown_values_is_active_idx` (`is_active`);

--
-- Indexes for table `prescription_lens_types`
--
ALTER TABLE `prescription_lens_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `prescription_lens_types_name_key` (`name`),
  ADD UNIQUE KEY `prescription_lens_types_slug_key` (`slug`),
  ADD KEY `prescription_lens_types_is_active_idx` (`is_active`),
  ADD KEY `prescription_lens_types_prescription_type_idx` (`prescription_type`);

--
-- Indexes for table `prescription_lens_variants`
--
ALTER TABLE `prescription_lens_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `prescription_lens_variants_prescription_lens_type_id_slug_key` (`prescription_lens_type_id`,`slug`),
  ADD KEY `prescription_lens_variants_prescription_lens_type_id_idx` (`prescription_lens_type_id`),
  ADD KEY `prescription_lens_variants_is_active_idx` (`is_active`),
  ADD KEY `prescription_lens_variants_is_recommended_idx` (`is_recommended`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `products_slug_key` (`slug`),
  ADD UNIQUE KEY `products_sku_key` (`sku`),
  ADD KEY `products_category_id_idx` (`category_id`),
  ADD KEY `products_sub_category_id_idx` (`sub_category_id`),
  ADD KEY `products_slug_idx` (`slug`),
  ADD KEY `products_sku_idx` (`sku`),
  ADD KEY `products_frame_shape_idx` (`frame_shape`),
  ADD KEY `products_frame_material_idx` (`frame_material`),
  ADD KEY `products_is_active_is_featured_idx` (`is_active`,`is_featured`),
  ADD KEY `products_category_id_is_active_idx` (`category_id`,`is_active`),
  ADD KEY `products_sub_category_id_is_active_idx` (`sub_category_id`,`is_active`);

--
-- Indexes for table `product_gifts`
--
ALTER TABLE `product_gifts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_gifts_product_id_gift_product_id_key` (`product_id`,`gift_product_id`),
  ADD KEY `product_gifts_product_id_idx` (`product_id`),
  ADD KEY `product_gifts_gift_product_id_idx` (`gift_product_id`),
  ADD KEY `product_gifts_is_active_idx` (`is_active`);

--
-- Indexes for table `product_lens_coatings`
--
ALTER TABLE `product_lens_coatings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_lens_coatings_product_id_lens_coating_id_key` (`product_id`,`lens_coating_id`),
  ADD KEY `product_lens_coatings_lens_coating_id_fkey` (`lens_coating_id`);

--
-- Indexes for table `product_lens_types`
--
ALTER TABLE `product_lens_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_lens_types_product_id_lens_type_id_key` (`product_id`,`lens_type_id`),
  ADD KEY `product_lens_types_lens_type_id_fkey` (`lens_type_id`);

--
-- Indexes for table `product_size_volumes`
--
ALTER TABLE `product_size_volumes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_size_volumes_product_id_size_volume_pack_type_key` (`product_id`,`size_volume`,`pack_type`),
  ADD KEY `product_size_volumes_product_id_idx` (`product_id`),
  ADD KEY `product_size_volumes_is_active_idx` (`is_active`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_variants_product_id_idx` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviews_user_id_idx` (`user_id`),
  ADD KEY `reviews_product_id_idx` (`product_id`),
  ADD KEY `reviews_rating_idx` (`rating`),
  ADD KEY `reviews_is_approved_idx` (`is_approved`);

--
-- Indexes for table `shipping_methods`
--
ALTER TABLE `shipping_methods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `shipping_methods_slug_key` (`slug`),
  ADD KEY `shipping_methods_is_active_idx` (`is_active`),
  ADD KEY `shipping_methods_type_idx` (`type`);

--
-- Indexes for table `simulation_configs`
--
ALTER TABLE `simulation_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `simulation_configs_config_key_key` (`config_key`),
  ADD KEY `simulation_configs_config_key_idx` (`config_key`),
  ADD KEY `simulation_configs_category_idx` (`category`);

--
-- Indexes for table `spherical_configurations`
--
ALTER TABLE `spherical_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `spherical_configurations_category_id_fkey` (`category_id`),
  ADD KEY `spherical_configurations_productId_fkey` (`productId`),
  ADD KEY `spherical_configurations_sub_category_id_fkey` (`sub_category_id`);

--
-- Indexes for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subcategories_name_parent_id_key` (`name`,`parent_id`),
  ADD KEY `subcategories_category_id_idx` (`category_id`),
  ADD KEY `subcategories_parent_id_idx` (`parent_id`);

--
-- Indexes for table `support_requests`
--
ALTER TABLE `support_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `testimonials`
--
ALTER TABLE `testimonials`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transactions_transaction_number_key` (`transaction_number`),
  ADD KEY `transactions_order_id_idx` (`order_id`),
  ADD KEY `transactions_user_id_idx` (`user_id`),
  ADD KEY `transactions_transaction_number_idx` (`transaction_number`),
  ADD KEY `transactions_status_idx` (`status`),
  ADD KEY `transactions_type_idx` (`type`),
  ADD KEY `transactions_gateway_transaction_id_idx` (`gateway_transaction_id`),
  ADD KEY `transactions_created_at_idx` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_key` (`email`);

--
-- Indexes for table `vto_assets`
--
ALTER TABLE `vto_assets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vto_assets_asset_type_idx` (`asset_type`);

--
-- Indexes for table `vto_configs`
--
ALTER TABLE `vto_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vto_configs_slug_key` (`slug`),
  ADD KEY `vto_configs_slug_idx` (`slug`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `analytics_events`
--
ALTER TABLE `analytics_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_error_logs`
--
ALTER TABLE `api_error_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `astigmatism_configurations`
--
ALTER TABLE `astigmatism_configurations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `astigmatism_dropdown_values`
--
ALTER TABLE `astigmatism_dropdown_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blog_articles`
--
ALTER TABLE `blog_articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blog_posts`
--
ALTER TABLE `blog_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `case_studies`
--
ALTER TABLE `case_studies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `contact_lens_configurations`
--
ALTER TABLE `contact_lens_configurations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contact_requests`
--
ALTER TABLE `contact_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `credentials_requests`
--
ALTER TABLE `credentials_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `demo_requests`
--
ALTER TABLE `demo_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `eye_hygiene_variants`
--
ALTER TABLE `eye_hygiene_variants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faqs`
--
ALTER TABLE `faqs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `flash_offers`
--
ALTER TABLE `flash_offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_configs`
--
ALTER TABLE `form_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_submissions`
--
ALTER TABLE `form_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `frame_sizes`
--
ALTER TABLE `frame_sizes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_applications`
--
ALTER TABLE `job_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_coatings`
--
ALTER TABLE `lens_coatings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_colors`
--
ALTER TABLE `lens_colors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_finishes`
--
ALTER TABLE `lens_finishes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_options`
--
ALTER TABLE `lens_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_packages`
--
ALTER TABLE `lens_packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_thickness_materials`
--
ALTER TABLE `lens_thickness_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_thickness_options`
--
ALTER TABLE `lens_thickness_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_treatments`
--
ALTER TABLE `lens_treatments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lens_types`
--
ALTER TABLE `lens_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketing_campaigns`
--
ALTER TABLE `marketing_campaigns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pages`
--
ALTER TABLE `pages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescriptions`
--
ALTER TABLE `prescriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescription_form_dropdown_values`
--
ALTER TABLE `prescription_form_dropdown_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescription_lens_types`
--
ALTER TABLE `prescription_lens_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prescription_lens_variants`
--
ALTER TABLE `prescription_lens_variants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `product_gifts`
--
ALTER TABLE `product_gifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_lens_coatings`
--
ALTER TABLE `product_lens_coatings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_lens_types`
--
ALTER TABLE `product_lens_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_size_volumes`
--
ALTER TABLE `product_size_volumes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shipping_methods`
--
ALTER TABLE `shipping_methods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `simulation_configs`
--
ALTER TABLE `simulation_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spherical_configurations`
--
ALTER TABLE `spherical_configurations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subcategories`
--
ALTER TABLE `subcategories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_requests`
--
ALTER TABLE `support_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `testimonials`
--
ALTER TABLE `testimonials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `vto_assets`
--
ALTER TABLE `vto_assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vto_configs`
--
ALTER TABLE `vto_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD CONSTRAINT `admin_activity_logs_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `analytics_events`
--
ALTER TABLE `analytics_events`
  ADD CONSTRAINT `analytics_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `astigmatism_configurations`
--
ALTER TABLE `astigmatism_configurations`
  ADD CONSTRAINT `astigmatism_configurations_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `astigmatism_configurations_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `astigmatism_configurations_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `banners`
--
ALTER TABLE `banners`
  ADD CONSTRAINT `banners_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `banners_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `carts`
--
ALTER TABLE `carts`
  ADD CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_lens_thickness_material_id_fkey` FOREIGN KEY (`lens_thickness_material_id`) REFERENCES `lens_thickness_materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_lens_thickness_option_id_fkey` FOREIGN KEY (`lens_thickness_option_id`) REFERENCES `lens_thickness_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_photochromic_color_id_fkey` FOREIGN KEY (`photochromic_color_id`) REFERENCES `lens_colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_prescription_id_fkey` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_prescription_sun_color_id_fkey` FOREIGN KEY (`prescription_sun_color_id`) REFERENCES `lens_colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cart_items_progressive_variant_id_fkey` FOREIGN KEY (`progressive_variant_id`) REFERENCES `prescription_lens_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `contact_lens_configurations`
--
ALTER TABLE `contact_lens_configurations`
  ADD CONSTRAINT `contact_lens_configurations_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `contact_lens_configurations_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `contact_lens_configurations_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `eye_hygiene_variants`
--
ALTER TABLE `eye_hygiene_variants`
  ADD CONSTRAINT `eye_hygiene_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD CONSTRAINT `form_submissions_form_config_id_fkey` FOREIGN KEY (`form_config_id`) REFERENCES `form_configs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `frame_sizes`
--
ALTER TABLE `frame_sizes`
  ADD CONSTRAINT `frame_sizes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD CONSTRAINT `job_applications_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `lens_colors`
--
ALTER TABLE `lens_colors`
  ADD CONSTRAINT `lens_colors_lens_finish_id_fkey` FOREIGN KEY (`lens_finish_id`) REFERENCES `lens_finishes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lens_colors_lens_option_id_fkey` FOREIGN KEY (`lens_option_id`) REFERENCES `lens_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lens_colors_prescription_lens_type_id_fkey` FOREIGN KEY (`prescription_lens_type_id`) REFERENCES `prescription_lens_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lens_finishes`
--
ALTER TABLE `lens_finishes`
  ADD CONSTRAINT `lens_finishes_lens_option_id_fkey` FOREIGN KEY (`lens_option_id`) REFERENCES `lens_options` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lens_packages`
--
ALTER TABLE `lens_packages`
  ADD CONSTRAINT `lens_packages_lens_type_id_fkey` FOREIGN KEY (`lens_type_id`) REFERENCES `lens_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_prescription_id_fkey` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_lens_thickness_material_id_fkey` FOREIGN KEY (`lens_thickness_material_id`) REFERENCES `lens_thickness_materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_lens_thickness_option_id_fkey` FOREIGN KEY (`lens_thickness_option_id`) REFERENCES `lens_thickness_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_photochromic_color_id_fkey` FOREIGN KEY (`photochromic_color_id`) REFERENCES `lens_colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_prescription_id_fkey` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_prescription_sun_color_id_fkey` FOREIGN KEY (`prescription_sun_color_id`) REFERENCES `lens_colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_progressive_variant_id_fkey` FOREIGN KEY (`progressive_variant_id`) REFERENCES `prescription_lens_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `prescriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `prescription_lens_variants`
--
ALTER TABLE `prescription_lens_variants`
  ADD CONSTRAINT `prescription_lens_variants_prescription_lens_type_id_fkey` FOREIGN KEY (`prescription_lens_type_id`) REFERENCES `prescription_lens_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `products_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product_gifts`
--
ALTER TABLE `product_gifts`
  ADD CONSTRAINT `product_gifts_gift_product_id_fkey` FOREIGN KEY (`gift_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_gifts_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_lens_coatings`
--
ALTER TABLE `product_lens_coatings`
  ADD CONSTRAINT `product_lens_coatings_lens_coating_id_fkey` FOREIGN KEY (`lens_coating_id`) REFERENCES `lens_coatings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_lens_coatings_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_lens_types`
--
ALTER TABLE `product_lens_types`
  ADD CONSTRAINT `product_lens_types_lens_type_id_fkey` FOREIGN KEY (`lens_type_id`) REFERENCES `lens_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_lens_types_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_size_volumes`
--
ALTER TABLE `product_size_volumes`
  ADD CONSTRAINT `product_size_volumes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `spherical_configurations`
--
ALTER TABLE `spherical_configurations`
  ADD CONSTRAINT `spherical_configurations_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `spherical_configurations_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `spherical_configurations_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD CONSTRAINT `subcategories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `subcategories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
