<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>{{ $subjectLine }}</title></head>
<body style="margin:0;padding:0;background:#f3f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(20,53,94,.09);">
      <tr><td style="padding:26px 34px;background:linear-gradient(135deg,#075fc5,#00a28b);color:#ffffff;"><div style="font-size:12px;letter-spacing:2px;font-weight:700;opacity:.86;">OPTICAL MARKETPLACE</div><div style="margin-top:7px;font-size:25px;font-weight:800;">VistaExpress</div></td></tr>
      <tr><td style="padding:34px;">
        @if($recipientName)<p style="margin:0 0 12px;font-size:16px;color:#536177;">Hello {{ $recipientName }},</p>@endif
        <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#10213d;">{{ $heading }}</h1>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#4d5b71;">{{ $intro }}</p>
        @if($code)<div style="margin:0 0 24px;padding:17px;border:1px dashed #6aa7ed;border-radius:14px;background:#eef7ff;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#4d6e93;">YOUR VERIFICATION CODE</div><div style="margin-top:7px;font-size:30px;font-weight:800;letter-spacing:7px;color:#075fc5;">{{ $code }}</div></div>@endif
        @if(count(array_filter($details, fn($value) => $value !== null && $value !== '')))
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e4eaf3;border-radius:12px;overflow:hidden;">
            @foreach($details as $label => $value) @if($value !== null && $value !== '')<tr><td style="padding:11px 14px;border-bottom:1px solid #edf1f6;font-size:13px;color:#64748b;">{{ $label }}</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:700;color:#1e293b;">{{ $value }}</td></tr>@endif @endforeach
          </table>
        @endif
        @if(count($items))
          <h2 style="margin:0 0 10px;font-size:16px;color:#1e293b;">Order items</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-collapse:collapse;">@foreach($items as $item)<tr><td style="padding:10px 0;border-bottom:1px solid #e8edf4;"><strong style="font-size:14px;color:#1e293b;">{{ $item['name'] }}</strong>@if($item['sku'])<br><span style="font-size:12px;color:#718096;">{{ $item['sku'] }}</span>@endif</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e8edf4;font-size:13px;color:#536177;">× {{ $item['quantity'] }}<br><strong style="color:#1e293b;">{{ $item['total'] }}</strong></td></tr>@endforeach</table>
        @endif
        @if($notice)<p style="margin:0 0 22px;padding:12px 14px;border-radius:10px;background:#fff7e6;color:#825b13;font-size:13px;line-height:1.5;">{{ $notice }}</p>@endif
        @if($ctaLabel && $ctaUrl)<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#075fc5;"><a href="{{ $ctaUrl }}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">{{ $ctaLabel }}</a></td></tr></table>@endif
      </td></tr>
      <tr><td style="padding:20px 34px;background:#f8fafc;border-top:1px solid #e8edf4;font-size:12px;line-height:1.55;color:#718096;">This is an automated VistaExpress notification. If you did not expect this email, please contact platform support.<br><span style="color:#9aa7b8;">© {{ now()->year }} VistaExpress · Optical Marketplace</span></td></tr>
    </table>
  </td></tr></table>
</body></html>
