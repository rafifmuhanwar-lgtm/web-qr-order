import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    MessageCircle,
    Phone,
    X,
    Send,
    Store,
    CheckCheck,
    MessageSquare,
    ExternalLink,
} from 'lucide-react';
import { getStore } from '../../services/storeService';
import { supabase } from '../../config/supabase';
import { buildWhatsAppChatUrl } from '../../utils/deliveryUtils';
import { sendOrderChatMessage } from '../../services/orderService';
import toast from 'react-hot-toast';

export default function CustomerFloatingChat() {
    const { storeId: paramStoreId, orderId } = useParams();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [store, setStore] = useState(null);
    const [order, setOrder] = useState(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [hasCartBar, setHasCartBar] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. Resolve Store and Order data based on route
    useEffect(() => {
        let isMounted = true;

        const loadContextData = async () => {
            try {
                if (orderId) {
                    const { data: orderData } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single();

                    if (orderData && isMounted) {
                        setOrder(orderData);
                        if (orderData.storeId) {
                            const storeData = await getStore(orderData.storeId);
                            if (isMounted) setStore(storeData);
                        }
                    }
                } else if (paramStoreId) {
                    const storeData = await getStore(paramStoreId);
                    if (isMounted) setStore(storeData);
                }
            } catch {
                // non-blocking
            }
        };

        loadContextData();

        return () => {
            isMounted = false;
        };
    }, [paramStoreId, orderId, location.pathname]);

    // 2. Realtime listener for Order changes if orderId exists
    useEffect(() => {
        if (!orderId) return;

        const channel = supabase
            .channel(`order-chat-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`,
                },
                (payload) => {
                    if (payload.new) {
                        setOrder(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    // 3. Detect if floating cart bar is currently present on screen
    useEffect(() => {
        const checkCartBar = () => {
            const bar = document.querySelector('[data-floating-cart="true"]');
            setHasCartBar(Boolean(bar));
        };

        checkCartBar();
        const interval = setInterval(checkCartBar, 600);
        return () => clearInterval(interval);
    }, [location.pathname]);

    // Parse chats from order.notes if exists, or local state for general inquiries
    let parsedNotes = {};
    if (order?.notes && typeof order.notes === 'string' && order.notes.startsWith('{')) {
        try {
            parsedNotes = JSON.parse(order.notes);
        } catch {
            parsedNotes = {};
        }
    }
    const chats = Array.isArray(parsedNotes.chats) ? parsedNotes.chats : [];

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats.length, isOpen]);

    const storeWhatsapp = store?.whatsapp || store?.whatsappNumber || '';
    const storeName = store?.name || 'Resto';

    const defaultWaMessage = orderId
        ? `Halo ${storeName}, saya ingin menanyakan pesanan #${orderId.slice(0, 8)} di eMakan.`
        : `Halo ${storeName}, saya sedang melihat menu di eMakan dan ingin bertanya...`;

    const waUrl = storeWhatsapp
        ? buildWhatsAppChatUrl(storeWhatsapp, defaultWaMessage)
        : null;

    const handleSend = async (textToSend) => {
        const text = (textToSend || input).trim();
        if (!text) return;

        if (orderId && order) {
            setSending(true);
            try {
                await sendOrderChatMessage(orderId, order.notes, {
                    sender: 'customer',
                    senderName: order.customerName || 'Pelanggan',
                    text,
                });
                setInput('');
            } catch {
                toast.error('Gagal mengirim pesan');
            } finally {
                setSending(false);
            }
        } else {
            // Jika belum buat pesanan, arahkan langsung ke WhatsApp
            if (waUrl) {
                window.open(waUrl, '_blank', 'noopener,noreferrer');
                setInput('');
                setIsOpen(false);
            } else {
                toast('Nomor WhatsApp resto belum diatur oleh pemilik toko', { icon: 'ℹ️' });
            }
        }
    };

    const quickTemplates = orderId
        ? [
              'Pesanan sudah sampai mana kak? 🛵',
              'Jangan lupa alat makan ya kak 🙏',
              'Saya sudah di depan lokasi 👍',
          ]
        : [
              'Halo kak, resto buka sampai jam berapa? ⏰',
              'Menu ini bisa request pedas/tidak? 🌶️',
              'Estimasi waktu penyiapan berapa lama? 👨‍🍳',
          ];

    return (
        <>
            {/* Pop-up Drawer Chat */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[350px] max-w-[calc(100vw-2rem)] h-[470px] max-h-[calc(100vh-6.5rem)] rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-150">
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                                <Store className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold leading-tight">{storeName}</h4>
                                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    {storeWhatsapp ? 'WhatsApp Aktif' : 'Obrolan Langsung'}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Tutup Obrolan"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* WhatsApp Direct Banner if configured */}
                    {waUrl && (
                        <div className="p-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2 text-emerald-800 text-xs">
                                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-medium text-[11px] leading-tight">
                                    Terhubung ke WhatsApp resmi {storeName}
                                </span>
                            </div>
                            <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                            >
                                <span>Buka WA</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}

                    {/* Messages Body */}
                    <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50">
                        {orderId ? (
                            chats.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">Belum ada obrolan</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                                        Kirim pesan langsung ke pihak resto mengenai pesanan Anda.
                                    </p>
                                </div>
                            ) : (
                                chats.map((chat) => {
                                    const isMe = chat.sender === 'customer';
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                        >
                                            <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                                                {chat.sender === 'resto' ? storeName : 'Saya'}
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
                            )
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-200">
                                    <MessageCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Ada yang bisa dibantu?</h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                                        Punya pertanyaan seputar menu, ketersediaan porsi, atau cara pemesanan?
                                    </p>
                                </div>
                                {waUrl && (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                                    >
                                        <Phone className="w-4 h-4" />
                                        <span>Chat via WhatsApp Resto</span>
                                    </a>
                                )}
                            </div>
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
                            placeholder={orderId ? 'Tulis pesan...' : 'Ketik pertanyaan...'}
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
            )}

            {/* Floating Persistent CTA "Pesan" Button in Bottom Right */}
            <div
                className={`fixed right-4 sm:right-6 z-40 transition-all duration-300 ${
                    hasCartBar ? 'bottom-22' : 'bottom-5'
                }`}
            >
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                        isOpen
                            ? 'bg-slate-800 hover:bg-slate-900 border border-slate-700'
                            : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    title="Obrolan / Kirim Pesan"
                >
                    <div className="relative">
                        {isOpen ? (
                            <X className="w-4 h-4" />
                        ) : (
                            <MessageCircle className="w-4 h-4" />
                        )}
                        {!isOpen && chats.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-orange-500">
                                {chats.length}
                            </span>
                        )}
                    </div>
                    <span>{isOpen ? 'Tutup' : 'Pesan'}</span>
                </button>
            </div>
        </>
    );
}