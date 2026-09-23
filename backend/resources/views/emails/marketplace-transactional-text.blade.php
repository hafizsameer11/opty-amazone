VistaExpress · Optical Marketplace

{{ $recipientName ? "Hello {$recipientName}," : 'Hello,' }}

{{ $heading }}

{{ $intro }}

@if($code)
Verification code: {{ $code }}
@endif

@foreach($details as $label => $value)
@if($value !== null && $value !== '')
{{ $label }}: {{ $value }}
@endif
@endforeach

@if(count($items))
Order items:
@foreach($items as $item)
- {{ $item['name'] }} @if($item['sku'])({{ $item['sku'] }}) @endif × {{ $item['quantity'] }} — {{ $item['total'] }}
@endforeach
@endif

@if($notice)
{{ $notice }}
@endif

@if($ctaLabel && $ctaUrl)
{{ $ctaLabel }}: {{ $ctaUrl }}
@endif

This is an automated VistaExpress notification.
