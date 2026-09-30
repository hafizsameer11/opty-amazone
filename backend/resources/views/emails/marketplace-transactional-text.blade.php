VistaExpress · Mercato Ottico

{{ $recipientName ? "Ciao {$recipientName}," : 'Ciao,' }}

{{ $heading }}

{{ $intro }}

@if($code)
Codice di verifica: {{ $code }}
@endif

@foreach($details as $label => $value)
@if($value !== null && $value !== '')
{{ $label }}: {{ $value }}
@endif
@endforeach

@if(count($items))
Articoli dell'ordine:
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

Questa è una notifica automatica di VistaExpress.
