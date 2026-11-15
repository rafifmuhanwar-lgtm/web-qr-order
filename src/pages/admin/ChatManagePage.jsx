import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import {
    getActiveStoreChats,
    sendChatMessage,
    purgeExpiredChats,
    isChatExpired,
    chatSyncChannel,
} from '../../services/chatService';
import {
    MessageSquare,
    Send,
    Clock,
    RefreshCw,
    Search,
    CheckCheck,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function ChatManagePage() {
    const { storeId, storeData } = useAuth();
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [mobileShowRoom, setMobileShowRoom] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Fetch and sync active chats
    const fetchChats = useCallback(async () => {
        if (!storeId) return;
        try {
            setRefreshing(true);
            const data = await getActiveStoreChats(storeId);
            setThreads(data);

            // On desktop (screen >= 768px), auto-select first thread if none selected or current is gone
            if (data.length > 0) {
                setActiveThreadId((prev) => {
                    const exists = data.some((t) => t.id === prev);
                    if (exists) return prev;
                    // Only auto-select on desktop, so mobile users stay on list view
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                        return data[0].id;
                    }
                    return null;
                });
            } else {
                setActiveThreadId(null);
                setMobileShowRoom(false);
            }
        } catch (err) {
            console.error('Failed to load chats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [storeId]);

    // Fast smart-polling (every 2.5s) & auto-purge every 60s
    useEffect(() => {
        fetchChats();

        // 1. Fast polling every 2.5s so messages pop up in real-time without user refreshing
        const pollInterval = setInterval(() => {
            if (storeId) {
                fetchChats();
            }
        }, 2500);

        // 2. Tab focus / visibility change trigger
        const handleFocus = () => {
            if (!document.hidden && storeId) fetchChats();
        };
        document.addEventListener('visibilitychange', handleFocus);
        window.addEventListener('focus', handleFocus);

        // 3. Database purge interval every 60 seconds
        const purgeInterval = setInterval(() => {
            if (storeId) {
                purgeExpiredChats(storeId);
            }
        }, 60000);

        return () => {
            clearInterval(pollInterval);
            clearInterval(purgeInterval);
            document.removeEventListener('visibilitychange', handleFocus);
            window.removeEventListener('focus', handleFocus);
        };
    }, [storeId, fetchChats]);

    // WebSocket Realtime Listener for instant messages (Broadcast + Postgres CDC)
    useEffect(() => {
        if (!storeId) return;

        // A. Listen to dedicated instant WebSocket Broadcast
        chatSyncChannel.on('broadcast', { event: 'new_chat_message' }, () => {
            fetchChats();
        });

        // B. Listen to global order sync
        const syncChannel = supabase.channel('admin-chat-sync-global')
            .on('broadcast', { event: 'order_change' }, () => {
                fetchChats();
            })
            .subscribe();

        // C. Postgres CDC Changes
        const cdcChannel = supabase
            .channel('admin-chat-live-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `storeId=eq.${storeId}`,
                },
                () => {
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(syncChannel);
            supabase.removeChannel(cdcChannel);
        };
    }, [storeId, fetchChats]);

    // Active thread object
    const activeThread = useMemo(() => {
        return threads.find((t) => t.id === activeThreadId) || null;
    }, [threads, activeThreadId]);

    const activeChats = useMemo(() => {
        if (!activeThread?.chats) return [];
        return activeThread.chats.filter((c) => !isChatExpired(c.timestamp));
    }, [activeThread]);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChats.length, activeThreadId, mobileShowRoom]);

    // Select thread handler (supports mobile navigation)
    const handleSelectThread = (threadId) => {
        setActiveThreadId(threadId);
        setMobileShowRoom(true);
    };

    // Send response with Instant Optimistic UI Update
    const handleSend = async (textToSend) => {
        const text = (textToSend || inputText).trim();
        if (!text || !activeThread) return;

        const optimisticChat = {
            id: Date.now().toString(),
            sender: 'resto',
            senderName: storeData?.name || 'Pihak Resto',
            text,
            timestamp: new Date().toISOString(),
        };

        // 1. Instantly update active thread in local memory so message shows in 0ms!
        setThreads((prev) =>
            prev.map((t) => {
                if (t.id === activeThread.id) {
                    const newChats = [...(t.chats || []), optimisticChat];
                    return { ...t, chats: newChats, latestChat: optimisticChat };
                }
                return t;
            })
        );
        setInputText('');

        setSending(true);
        try {
            await sendChatMessage(activeThread.id, activeThread.notes, {
                sender: 'resto',
                senderName: storeData?.name || 'Pihak Resto',
                text,
            });
            fetchChats();
        } catch (err) {
            console.error('Send message error:', err);
            toast.error('Gagal mengirim pesan');
        } finally {
            setSending(false);
        }
    };

    const filteredThreads = useMemo(() => {
        if (!search.trim()) return threads;
        const q = search.toLowerCase();
        return threads.filter(
            (t) =>
                t.customerName?.toLowerCase().includes(q) ||
                t.id?.toLowerCase().includes(q) ||
                t.latestChat?.text?.toLowerCase().includes(q)
        );
    }, [threads, search]);

    const quickTemplates = [
        'Pesanan sedang disiapkan di dapur',
        'Kurir kami sudah jalan mengantar',
        'Siap kak, catatan sudah kami terima',
        'Mohon ditunggu sebentar ya kak',
        'Ada yang bisa kami bantu lagi?',
    ];

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Spinner text="Memuat percakapan pelanggan..." />
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Header Page */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-secondary">Live Chat Pelanggan</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 border border-orange-200">
                            {threads.length} Aktif
                        </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5 sm:mt-1">
                        Obrolan langsung in-app dengan pelanggan (Pesan otomatis terhapus dari sistem & database setelah 6 jam)
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        onClick={fetchChats}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                        title="Perbarui daftar chat"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
                        <span>Segarkan</span>
                    </button>
                </div>
            </div>

            {/* Main Chat Interface (Responsive: Stack on Mobile, Side-by-Side on Desktop) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:grid md:grid-cols-12 h-[calc(100dvh-12.5rem)] md:h-[calc(100vh-14rem)] min-h-[480px]">
                {/* Left Panel: Conversation Threads List (Full width on mobile when !mobileShowRoom, 4 cols on desktop) */}
                <div
                    className={`md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 ${
                        mobileShowRoom ? 'hidden md:flex' : 'flex'
                    }`}
                >
                    {/* Search & Info */}
                    <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Cari percakapan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>Pesan otomatis hangus dalam 6 jam</span>
                        </div>
                    </div>

                    {/* Threads Scroll List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {filteredThreads.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                                <p className="text-xs font-semibold text-slate-600">Tidak ada obrolan aktif</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Pesan pelanggan akan otomatis masuk ke sini secara real-time.
                                </p>
                            </div>
                        ) : (
                            filteredThreads.map((thread) => {
                                const isSelected = thread.id === activeThreadId;
                                const lastChat = thread.latestChat;
                                const isFromCustomer = lastChat?.sender === 'customer';

                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => handleSelectThread(thread.id)}
                                        className={`w-full p-3 sm:p-3.5 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                                            isSelected
                                                ? 'bg-orange-50/80 md:border-l-4 md:border-orange-500'
                                                : 'hover:bg-slate-100/70 bg-white'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                            {thread.customerName?.slice(0, 2).toUpperCase() || 'PL'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                                    {thread.customerName || 'Pelanggan'}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                                                    {lastChat?.timestamp
                                                        ? new Date(lastChat.timestamp).toLocaleTimeString('id-ID', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : ''}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                                        thread.orderType === 'inquiry' || thread.orderType === 'customer_chat'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}
                                                >
                                                    {thread.orderType === 'inquiry' || thread.orderType === 'customer_chat'
                                                        ? 'Tanya Menu'
                                                        : `Order #${thread.id.slice(0, 6)}`}
                                                </span>
                                                {thread.tableNumber && (
                                                    <span className="text-[10px] text-slate-500">
                                                        Meja #{thread.tableNumber}
                                                    </span>
                                                )}
                                            </div>

                                            <p
                                                className={`text-xs mt-1 truncate ${
                                                    isFromCustomer ? 'font-semibold text-slate-800' : 'text-slate-500'
                                                }`}
                                            >
                                                {lastChat?.text || 'Mulai percakapan...'}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Active Chat Room (Full width on mobile when mobileShowRoom, 8 cols on desktop) */}
                <div
                    className={`md:col-span-8 flex flex-col h-full bg-white ${
                        !mobileShowRoom ? 'hidden md:flex' : 'flex'
                    }`}
                >
                    {activeThread ? (
                        <>
                            {/* Chat Room Header */}
                            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Mobile Back Button to Thread List */}
                                    <button
                                        type="button"
                                        onClick={() => setMobileShowRoom(false)}
                                        className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer shrink-0"
                                        aria-label="Kembali ke daftar percakapan"
                                        title="Kembali"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        {activeThread.customerName?.slice(0, 2).toUpperCase() || 'PL'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                                {activeThread.customerName || 'Pelanggan'}
                                            </h3>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-100 text-emerald-800 shrink-0">
                                                Online
                                            </span>
                                        </div>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                                            {activeThread.orderType === 'inquiry' || activeThread.orderType === 'customer_chat'
                                                ? 'Tanya Menu (Pra-Pesan)'
                                                : `Order #${activeThread.id.slice(0, 8)}`}
                                            {activeThread.tableNumber && ` • Meja #${activeThread.tableNumber}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0 pl-2">
                                    TTL 6 Jam
                                </div>
                            </div>

                            {/* Chat Messages Body */}
                            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 sm:space-y-3 bg-slate-50/40">
                                {activeChats.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-xs font-semibold text-slate-600">Belum ada percakapan</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Ketik pesan di bawah untuk membalas pelanggan.
                                        </p>
                                    </div>
                                ) : (
                                    activeChats.map((chat) => {
                                        const isResto = chat.sender === 'resto';
                                        return (
                                            <div
                                                key={chat.id}
                                                className={`flex flex-col ${isResto ? 'items-end' : 'items-start'}`}
                                            >
                                                <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                                                    {isResto ? 'Pihak Resto (Saya)' : (chat.senderName || 'Pelanggan')}
                                                </span>
                                                <div
                                                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                                                        isResto
                                                            ? 'bg-slate-900 text-white rounded-br-xs'
                                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                                                    }`}
                                                >
                                                    <p className="leading-relaxed break-words">{chat.text}</p>
                                                    <div
                                                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                                            isResto ? 'text-slate-300' : 'text-slate-400'
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
                                                        {isResto && <CheckCheck className="w-2.5 h-2.5" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Response Chips */}
                            <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                                {quickTemplates.map((tmpl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSend(tmpl)}
                                        disabled={sending}
                                        className="text-[10px] sm:text-[11px] whitespace-nowrap px-2.5 sm:px-3 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100 text-slate-600 rounded-full font-medium transition-colors cursor-pointer shrink-0"
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
                                className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
                            >
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Ketik balasan ke pelanggan..."
                                    disabled={sending}
                                    className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-orange-500 transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !inputText.trim()}
                                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Kirim</span>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                            <h3 className="text-sm font-bold text-slate-700">Pilih Percakapan Pelanggan</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Pilih salah satu obrolan di sebelah kiri untuk melihat pesan dan membalas secara real-time.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
