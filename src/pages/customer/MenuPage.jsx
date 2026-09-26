import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenusByStore } from '../../services/menuService';
import { getCategoriesByStore } from '../../services/categoryService';
import { getStore } from '../../services/storeService';
import { applyThemeColor } from '../../utils/themeUtils';
import { ShoppingCart, Plus, Minus, Search, StickyNote, ChefHat } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function MenuPage() {
    const { storeId, tableId } = useParams();
    const navigate = useNavigate();
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState(() => {
        const saved = sessionStorage.getItem(`cart_${storeId}_${tableId}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [noteModal, setNoteModal] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [storeName, setStoreName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [menuData, catData, storeData] = await Promise.all([
                    getMenusByStore(storeId),
                    getCategoriesByStore(storeId),
                    getStore(storeId),
                ]);
                setMenus(menuData);
                setCategories(catData);
                if (storeData) {
                    setStoreName(storeData.name || '');
                    setLogoUrl(storeData.logoUrl || '');
                    setWelcomeMessage(storeData.welcomeMessage || '');
                    if (storeData.themeColor) {
                        applyThemeColor(storeData.themeColor, storeData.customColor);
                    }
                }
            } catch (err) {
                toast.error('Gagal memuat menu');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [storeId]);

    useEffect(() => {
        sessionStorage.setItem(`cart_${storeId}_${tableId}`, JSON.stringify(cart));
    }, [cart, storeId, tableId]);

    const filteredMenus = useMemo(() => {
        return menus.filter((menu) => {
            const matchCategory = activeCategory === 'all' || menu.categoryId === activeCategory;
            const matchSearch = menu.name.toLowerCase().includes(search.toLowerCase());
            return matchCategory && matchSearch && menu.isAvailable !== false;
        });
    }, [menus, activeCategory, search]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    const cartCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    const addToCart = (menu) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === menu.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === menu.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { id: menu.id, name: menu.name, price: menu.price, quantity: 1, notes: '', imageUrl: menu.imageUrl }];
        });
        toast.success(`${menu.name} ditambahkan`);
    };

    const updateQuantity = (id, delta) => {
        setCart((prev) => {
            return prev
                .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0);
        });
    };

    const getCartItem = (id) => cart.find((i) => i.id === id);

    const saveNote = () => {
        if (noteModal) {
            setCart((prev) =>
                prev.map((i) => (i.id === noteModal ? { ...i, notes: noteText } : i))
            );
            setNoteModal(null);
            setNoteText('');
        }
    };

    const goToCart = () => {
        navigate(`/order/${storeId}/${tableId}/cart`, { state: { cart } });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    if (loading) return <Spinner text="Memuat menu..." />;

    return (
        <>
            <div className="animate-fade-in">
                {/* Store Header */}
                <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-5 -mx-0">
                    <div className="flex items-center gap-3 mb-1">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border-2 border-white/30" />
                        ) : (
                            <ChefHat className="w-6 h-6" />
                        )}
                        <h1 className="text-xl font-bold">{storeName || 'Menu'}</h1>
                    </div>
                    <p className="text-white/80 text-sm">Meja #{String(tableId).padStart(3, '0')}</p>
                    {welcomeMessage && (
                        <p className="text-white/70 text-sm mt-2 italic">{welcomeMessage}</p>
                    )}
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari menu..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white
              text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="px-4 mb-4 overflow-x-auto">
                    <div className="flex gap-2 pb-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer
              ${activeCategory === 'all'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'bg-white text-slate-600 border border-border hover:border-primary/30'
                                }`}
                        >
                            Semua
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer
                ${activeCategory === cat.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-white text-slate-600 border border-border hover:border-primary/30'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="px-4 grid grid-cols-2 gap-3">
                    {filteredMenus.map((menu) => {
                        const cartItem = getCartItem(menu.id);
                        return (
                            <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
                                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                    {menu.imageUrl ? (
                                        <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ChefHat className="w-10 h-10 text-slate-300" />
                                        </div>
                                    )}
                                    {cartItem && (
                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg">
                                            {cartItem.quantity}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-sm text-secondary truncate">{menu.name}</h3>
                                    <p className="text-primary font-bold text-sm mt-1">{formatPrice(menu.price)}</p>
                                    {menu.description && (
                                        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{menu.description}</p>
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                        {cartItem ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <button
                                                    onClick={() => updateQuantity(menu.id, -1)}
                                                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="flex-1 text-center font-semibold text-sm">{cartItem.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(menu.id, 1)}
                                                    className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setNoteModal(menu.id);
                                                        setNoteText(cartItem.notes || '');
                                                    }}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer
                          ${cartItem.notes ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    <StickyNote className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(menu)}
                                                className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold
                        hover:bg-primary hover:text-white transition-all cursor-pointer"
                                            >
                                                + Tambah
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredMenus.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Menu tidak ditemukan</p>
                    </div>
                )}
            </div>

            {/* Note Modal - outside animated div */}
            {noteModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setNoteModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
                        <h3 className="font-bold text-secondary mb-3">Catatan Pesanan</h3>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Contoh: less sugar, no ice..."
                            className="w-full p-3 rounded-xl border border-border text-sm resize-none h-24 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setNoteModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-border text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={saveNote}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark cursor-pointer"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Cart Button - outside animated div */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto z-30">
                    <button
                        onClick={goToCart}
                        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm
              flex items-center justify-between px-5
              shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                            <span>{cartCount} item</span>
                        </div>
                        <span className="text-base">{formatPrice(cartTotal)}</span>
                    </button>
                </div>
            )}
        </>
    );
}
