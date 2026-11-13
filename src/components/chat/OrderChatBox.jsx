import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Store, User, Phone, CheckCheck } from 'lucide-react';
import { sendOrderChatMessage } from '../../services/orderService';
import { buildWhatsAppChatUrl } from '../../utils/deliveryUtils';
import toast from 'react-hot-toast';

export default function OrderChatBox({
    orderId,
    currentNotes,
    role = 'customer', // 'customer' | 'resto'
    senderName = 'Pelanggan',
    targetWhatsapp = '',
    onMessageSent,
}) {
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    let parsed = {};
    try {
        parsed = typeof currentNotes === 'string' && currentNotes.startsWith('{')
            ? JSON.parse(currentNotes)
            : {};
    } catch {
        parsed = {};
    }

    const chats = Array.isArray(parsed.chats) ? parsed.chats : [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats.length]);

    const handleSend = async (textToSend) => {
        const text = (textToSend || input).trim();
        if (!text) return;

        setSending(true);
        try {
            await sendOrderChatMessage(orderId, currentNotes, {
                sender: role,
                senderName,
                text,
            });
            setInput('');
            if (onMessageSent) onMessageSent();
        } catch {
            toast.error('Gagal mengirim pesan');
        } finally {
            setSending(false);
        }
    };

    const quickTemplates = role === 'customer'
        ? ['Pesanan sudah sampai mana kak? 🛵', 'Jangan lupa alat makan ya kak 🙏', 'Saya sudah di depan pagar 👍']
        : ['Pesanan sedang dimasak di dapur 👨‍🍳', 'Kurir kami sudah menuju lokasi 🛵', 'Mohon ditunggu sebentar ya kak 🙏'];

    const waUrl = targetWhatsapp
        ? buildWhatsAppChatUrl(
              targetWhatsapp,
              `Halo, saya ingin menanyakan pesanan #${orderId.slice(0, 8)} di eMakan.`
          )
        : null;

    return (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-[380px]">
            {/* Chat Header */}
            <div className="bg-slate-50 border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-secondary">
                            {role === 'customer' ? 'Obrolan dengan Resto' : `Obrolan dengan ${senderName}`}
                        </h4>
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Terhubung Realtime
                        </span>
                    </div>
                </div>

                {waUrl && (
                    <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors"
                    >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                    </a>
                )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50/50">
                {chats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <MessageCircle className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs font-medium text-slate-500">Belum ada percakapan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Kirim pesan langsung ke {role === 'customer' ? 'pihak resto / kurir' : 'pelanggan'}.
                        </p>
                    </div>
                ) : (
                    chats.map((chat) => {
                        const isMe = chat.sender === role;
                        return (
                            <div
                                key={chat.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-[10px] font-semibold text-slate-500">
                                        {chat.sender === 'resto' ? (
                                            <span className="inline-flex items-center gap-0.5 text-primary">
                                                <Store className="w-2.5 h-2.5 inline" /> Resto
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-0.5 text-slate-600">
                                                <User className="w-2.5 h-2.5 inline" /> Pelanggan
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                                        isMe
                                            ? 'bg-primary text-white rounded-br-xs'
                                            : 'bg-white text-secondary border border-border rounded-bl-xs'
                                    }`}
                                >
                                    <p className="leading-relaxed break-words">{chat.text}</p>
                                    <div
                                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                            isMe ? 'text-white/80' : 'text-slate-400'
                                        }`}
                                    >
                                        <span>
                                            {chat.timestamp
                                                ? new Date(chat.timestamp).toLocaleTimeString('id-ID', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : ''}
                                        </span>
                                        {isMe && <CheckCheck className="w-2.5 h-2.5" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Templates */}
            <div className="px-2 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickTemplates.map((tmpl, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(tmpl)}
                        disabled={sending}
                        className="text-[10px] whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-600 rounded-full font-medium transition-colors cursor-pointer"
                    >
                        {tmpl}
                    </button>
                ))}
            </div>

            {/* Input Bar */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                className="p-2 bg-white border-t border-border flex items-center gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ketik pesan..."
                    disabled={sending}
                    className="flex-1 bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs text-secondary outline-none focus:border-primary focus:bg-white transition-all"
                />
                <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="w-8 h-8 rounded-xl bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}

