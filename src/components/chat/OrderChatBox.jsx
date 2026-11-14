import { useState, useRef, useEffect } from 'react';
import {
    Send,
    MessageCircle,
    Store,
    User,
    Phone,
    CheckCheck,
    X,
    ChevronDown,
    ChevronUp,
    MessageSquare,
} from 'lucide-react';
import { sendOrderChatMessage } from '../../services/orderService';
import { buildWhatsAppChatUrl } from '../../utils/deliveryUtils';
import toast from 'react-hot-toast';

export default function OrderChatBox({
    orderId,
    currentNotes,
    role = 'customer', // 'customer' | 'resto'
    senderName = 'Pelanggan',
    targetWhatsapp = '',
    variant = 'floating', // 'floating' | 'collapsible' | 'inline'
    onMessageSent,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    let parsed = {};
    try {
        parsed =
            typeof currentNotes === 'string' && currentNotes.startsWith('{')
                ? JSON.parse(currentNotes)
                : {};
    } catch {
        parsed = {};
    }

    const chats = Array.isArray(parsed.chats) ? parsed.chats : [];

    useEffect(() => {
        if (isOpen || variant === 'inline') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats.length, isOpen, variant]);

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

    const quickTemplates =
        role === 'customer'
            ? [
                  'Pesanan sudah sampai mana kak? 🛵',
                  'Jangan lupa alat makan ya kak 🙏',
                  'Saya sudah di depan lokasi 👍',
              ]
            : [
                  'Pesanan sedang disiapkan di dapur 👨‍🍳',
                  'Kurir kami sedang menuju lokasi 🛵',
                  'Mohon ditunggu sebentar ya kak 🙏',
              ];

    const waUrl = targetWhatsapp
        ? buildWhatsAppChatUrl(
              targetWhatsapp,
              `Halo, saya ingin menanyakan pesanan #${orderId?.slice(0, 8)} di eMakan.`
          )
        : null;

    // The core chat window content
    const chatContent = (
        <div className="flex flex-col h-full bg-white">
            {/* Chat Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                        {role === 'customer' ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                        <h4 className="text-xs font-bold leading-tight">
                            {role === 'customer' ? 'Obrolan dengan Resto' : `Obrolan: ${senderName}`}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Live Realtime
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {waUrl && (
                        <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm"
                            title="Lanjutkan ke WhatsApp"
                        >
                            <Phone className="w-3 h-3" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                    )}
                    {variant === 'floating' && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Tutup Chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50">
                {chats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Belum ada obrolan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                            Kirim pesan langsung ke {role === 'customer' ? 'resto' : 'pelanggan'}.
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
                                <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                                    {chat.sender === 'resto' ? 'Resto' : 'Pelanggan'}
                                </span>
                                <div
                                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                                        isMe
                                            ? 'bg-orange-500 text-white rounded-br-xs'
                                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
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
            <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {quickTemplates.map((tmpl, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(tmpl)}
                        disabled={sending}
                        className="text-[10px] whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 rounded-full font-medium transition-colors cursor-pointer shrink-0"
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
                className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pesan..."
                    disabled={sending}
                    className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
                    aria-label="Kirim Pesan"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );

    // 1. COLLAPSIBLE VARIANT (Ideal for inside modals or compact lists)
    if (variant === 'collapsible') {
        return (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-semibold text-slate-800">
                            {role === 'customer' ? 'Obrolan dengan Resto' : `Obrolan dengan ${senderName}`}
                        </span>
                        {chats.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                                {chats.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <span>{isOpen ? 'Tutup' : 'Buka'}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
                {isOpen && <div className="h-[320px]">{chatContent}</div>}
            </div>
        );
    }

    // 2. INLINE VARIANT (Old style if needed)
    if (variant === 'inline') {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs h-[380px]">
                {chatContent}
            </div>
        );
    }

    // 3. FLOATING VARIANT (Default: Sleek, non-intrusive bottom-right button + popup drawer)
    return (
        <>
            {/* Floating Pop-up Window */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[350px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[calc(100vh-6.5rem)] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-150">
                    {chatContent}
                </div>
            )}

            {/* Floating Trigger Button */}
            <div className="fixed bottom-5 right-4 sm:right-6 z-50">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full text-white font-semibold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                        isOpen
                            ? 'bg-slate-800 hover:bg-slate-900 border border-slate-700'
                            : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                >
                    <div className="relative">
                        {isOpen ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                        {!isOpen && chats.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-orange-500">
                                {chats.length}
                            </span>
                        )}
                    </div>
                    <span>
                        {isOpen ? 'Tutup Chat' : role === 'customer' ? 'Chat Resto' : 'Chat Pelanggan'}
                    </span>
                </button>
            </div>
        </>
    );
}