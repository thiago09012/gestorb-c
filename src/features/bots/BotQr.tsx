import { QRCodeSVG } from 'qrcode.react';
import { formatDateTimeBR } from '../../lib/dates';
import type { Bot } from '../../types/database';

// Mostra o QR do WhatsApp dentro do site.
// O robô manda o texto do QR pro banco, aqui a gente desenha.
// QR expira rápido (uns 20s), por isso o site atualiza sozinho.
export default function BotQr({ bot }: { bot: Bot }) {
  if (bot.qr_code) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-semibold">📱 Escaneie pra logar o WhatsApp</p>
        <p className="mt-0.5 text-xs text-slate-600">
          WhatsApp no celular &gt; Configurações &gt; Aparelhos conectados &gt; Conectar aparelho. Vale só o último QR.
          {bot.qr_updated_at ? ` Gerado em ${formatDateTimeBR(bot.qr_updated_at)}.` : ''}
        </p>
        <div className="mt-2 flex justify-center bg-white p-3 rounded-lg">
          <QRCodeSVG value={bot.qr_code} size={220} />
        </div>
        <p className="mt-1 text-center text-xs text-slate-500">Se expirar, espera 20s que aparece outro sozinho.</p>
      </div>
    );
  }
  if (bot.connection_status === 'conectado') {
    return <p className="mt-2 text-xs text-green-700">✅ WhatsApp conectado. Sem QR pendente.</p>;
  }
  return <p className="mt-2 text-xs text-slate-500">Sem QR agora. Liga o robô com npm start que o QR aparece aqui.</p>;
}
