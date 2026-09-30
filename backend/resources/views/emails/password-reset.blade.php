<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>{{ __('passwords.reset') }}</title></head>
<body style="margin:0;padding:0;background:#f3f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(20,53,94,.09);">
      <tr><td style="padding:26px 34px;background:linear-gradient(135deg,#075fc5,#00a28b);color:#ffffff;"><div style="font-size:12px;letter-spacing:2px;font-weight:700;opacity:.86;">MERCATO OTTICO</div><div style="margin-top:7px;font-size:25px;font-weight:800;">VistaExpress</div></td></tr>
      <tr><td style="padding:34px;">
        @if($recipientName)<p style="margin:0 0 12px;font-size:16px;color:#536177;">Ciao {{ $recipientName }},</p>@endif
        <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#10213d;">Reimposta la tua password</h1>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#4d5b71;">Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account {{ $appName }}. Premi il pulsante qui sotto per scegliere una nuova password.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;"><tr><td style="border-radius:10px;background:#075fc5;"><a href="{{ $url }}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Reimposta la password</a></td></tr></table>
        <p style="margin:0 0 22px;padding:12px 14px;border-radius:10px;background:#fff7e6;color:#825b13;font-size:13px;line-height:1.5;">Il link è valido per {{ $minutes }} minuti. Se non hai richiesto la reimpostazione, puoi ignorare questa email: la tua password attuale resterà valida.</p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#64748b;">Se il pulsante non funziona, copia e incolla questo indirizzo nel tuo browser:</p>
        <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#075fc5;word-break:break-all;"><a href="{{ $url }}" style="color:#075fc5;">{{ $url }}</a></p>
      </td></tr>
      <tr><td style="padding:20px 34px;background:#f8fafc;border-top:1px solid #e8edf4;font-size:12px;line-height:1.55;color:#718096;">Questa è una notifica automatica di VistaExpress. Se non ti aspettavi questa email, ignorala e non condividere il link con nessuno.<br><span style="color:#9aa7b8;">© {{ now()->year }} VistaExpress · Mercato Ottico</span></td></tr>
    </table>
  </td></tr></table>
</body></html>
