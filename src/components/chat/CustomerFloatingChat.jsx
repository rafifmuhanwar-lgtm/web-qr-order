import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    MessageCircle,
    X,
    Send,
    Store,
    CheckCheck,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { getStore } from '../../services/storeService';
import { supabase } from '../../config/supabase';
import { sendOrderChatMessage, broadcastOrderChange } from '../../services/orderService';
import { isChatExpired, chatSyncChannel } from '../../services/chatService';
import toast from 'react-hot-toast';

export default function CustomerFloatingChat() {
    const { storeId: paramStoreId, orderId: paramOrderId } = useParams();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [store, setStore] = useState(null);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [order, setOrder] = useState(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [hasCartBar, setHasCartBar] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. Determine active order ID (from URL param or from current session)
    useEffect(() => {
        if (paramOrderId) {
            setActiveOrderId(paramOrderId);
        } else if (paramStoreId) {
            const savedOrderId = sessionStorage.getItem(`emakan_active_order_${paramStoreId}`);
            if (savedOrderId) {
                setActiveOrderId(savedOrderId);
            }
        }
    }, [paramOrderId, paramStoreId, location.pathname]);

    // 2. Fetch Store Information
    useEffect(() => {
        let isMounted = true;
        const currentStoreId = paramStoreId || order?.storeId;

        if (currentStoreId) {
            getStore(currentStoreId).then((storeData) => {
                if (isMounted && storeData) {
                    setStore(storeData);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [paramStoreId, order?.storeId]);

    // 3. Fetch Order data and listen via Realtime WebSocket & Smart Polling (Anti-Refresh)
    useEffect(() => {
        if (!activeOrderId) return;

        let isMounted = true;

        const fetchOrderData = async () => {
            if (!activeOrderId || !isMounted) return;
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', activeOrderId)
                    .single();
                if (isMounted && data) {
                    setOrder(data);
                }
            } catch {
                // non-blocking
            }
        };

        // Initial fetch
        fetchOrderData();

        // A. Smart fast-polling every 2.5s so customer NEVER needs to refresh
        const pollInterval = setInterval(fetchOrderData, 2500);

        // B. Window focus / visibility change trigger
        const handleFocus = () => {
            if (!document.hidden) fetchOrderData();
        };
        document.addEventListener('visibilitychange', handleFocus);
        window.addEventListener('focus', handleFocus);

        // C. Dedicated instant WebSocket Broadcast
        chatSyncChannel.on('broadcast', { event: 'new_chat_message' }, (e) => {
            if (!e.payload?.orderId || e.payload.orderId === activeOrderId) {
                fetchOrderData();
            }
        });

        // D. Subscribe to CDC Postgres changes
        const channel = supabase
            .channel(`order-chat-live-${activeOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${activeOrderId}`,
                },
                (payload) => {
                    if (isMounted && payload.new) {
                        setOrder(payload.new);
                    } else {
                        fetchOrderData();
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleFocus);
            window.removeEventListener('focus', handleFocus);
            supabase.removeChannel(channel);
        };
    }, [activeOrderId]);

    // 4. Detect if floating cart bar is on screen to prevent overlap
    useEffect(() => {
        const checkCartBar = () => {
            const bar = document.querySelector('[data-floating-cart="true"]');
            setHasCartBar(Boolean(bar));
        };

        checkCartBar();
        const interval = setInterval(checkCartBar, 600);
        return () => clearInterval(interval);
    }, [location.pathname]);

    // 5. Parse Chats from Order Notes JSON (Auto-filter > 6 hours old)
    const chats = useMemo(() => {
        if (!order?.notes) return [];
        if (typeof order.notes === 'string' && order.notes.startsWith('{')) {
            try {
                const parsed = JSON.parse(order.notes);
                return Array.isArray(parsed.chats)
                    ? parsed.chats.filter((c) => !isChatExpired(c.timestamp))
                    : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [order?.notes]);

    // Auto reset expired standalone chat sessions (> 6 hours)
    useEffect(() => {
        if (order && (order.orderType === 'inquiry' || order.orderType === 'customer_chat')) {
            const ageMs = Date.now() - new Date(order.createdAt).getTime();
            if (ageMs > 6 * 60 * 60 * 1000) {
                if (paramStoreId) {
                    sessionStorage.removeItem(`emakan_active_order_${paramStoreId}`);
                }
                setActiveOrderId(null);
                setOrder(null);
            }
        }
    }, [order, paramStoreId]);

    // Scroll to latest message
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chats.length, isOpen]);

    const storeName = store?.name || 'Resto';

    // 6. Send message: 100% In-App via Database & WebSocket
    const handleSend = async (textToSend) => {
        const text = (textToSend || input).trim();
        if (!text) return;

        setSending(true);

        try {
            let targetId = activeOrderId;

            // Jika belum ada order aktif (masih browsing menu), buat in-app chat thread di database
            if (!targetId) {
                const initialPayload = {
                    storeId: paramStoreId,
                    orderType: 'customer_chat',
                    status: 'inquiry',
                    paymentStatus: 'unpaid',
                    paymentMethod: 'qris',
                    items: [],
                    totalPrice: 0,
                    customerName: 'Pelanggan',
                    notes: JSON.stringify({
                        chats: [
                            {
                                id: Date.now().toString(),
                                sender: 'customer',
                                senderName: 'Pelanggan',
                                text,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    }),
                };

                const { data: newOrder, error: createErr } = await supabase
                    .from('orders')
                    .insert([initialPayload])
                    .select()
                    .single();

                if (createErr) throw createErr;

                targetId = newOrder.id;
                setActiveOrderId(newOrder.id);
                setOrder(newOrder);

                if (paramStoreId) {
                    sessionStorage.setItem(`emakan_active_order_${paramStoreId}`, newOrder.id);
                }

                broadcastOrderChange({
                    orderId: newOrder.id,
                    storeId: paramStoreId,
                    chatUpdated: true,
                });

                setInput('');
                return;
            }

            // Optimistic instant UI update in 0ms so customer sees message immediately!
            const optimisticChat = {
                id: Date.now().toString(),
                sender: 'customer',
                senderName: order?.customerName || 'Pelanggan',
                text,
                timestamp: new Date().toISOString(),
            };

            setOrder((prev) => {
                if (!prev) return prev;
                let parsed = {};
                try {
                    parsed = prev.notes && prev.notes.startsWith('{') ? JSON.parse(prev.notes) : {};
                } catch {
                    parsed = {};
                }
                parsed.chats = [...(parsed.chats || []), optimisticChat];
                return { ...prev, notes: JSON.stringify(parsed) };
            });

            setInput('');

            // Send to database and broadcast
            await sendOrderChatMessage(targetId, order?.notes, {
                sender: 'customer',
                senderName: order?.customerName || 'Pelanggan',
                text,
            });
        } catch (err) {
            console.error('Chat send error:', err);
            toast.error('Gagal mengirim pesan');
        } finally {
            setSending(false);
        }
    };

    const quickTemplates = [
        'Pesanan sudah sampai mana kak? 🛵',
        'Jangan lupa sendok garpu ya kak 🙏',
        'Resto buka sampai jam berapa? ⏰',
        'Bisa tolong cek pesanan saya? 👨‍🍳',
    ];

    return (
        <>
            {/* Pop-up Live Chat Drawer */}
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
                                    Live Chat • Terhubung Realtime
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

                    {/* Sub-header status bar */}
                    <div className="bg-slate-50 border-b border-slate-200/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-orange-500" />
                            <span>Obrolan Langsung In-App</span>
                        </span>
                        {activeOrderId && (
                            <span className="font-mono text-[10px] text-slate-400">
                                #{activeOrderId.slice(0, 8)}
                            </span>
                        )}
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50">
                        {chats.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center mb-2">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">Obrolan Langsung dengan Resto</p>
                                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                                    Ketik pertanyaan atau catatan khusus Anda di bawah. Pesan akan langsung diterima kasir/dapur secara real-time.
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
                            placeholder="Tulis pesan ke resto..."
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

            {/* Persistent Floating CTA "Pesan" Button in Bottom Right */}
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
                    title="Obrolan Langsung dengan Resto"
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