import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenusByStore } from '../../services/menuService';
import { getCategoriesByStore } from '../../services/categoryService';
import { getStore } from '../../services/storeService';
import { applyThemeColor } from '../../utils/themeUtils';
import { ShoppingCart, Plus, Minus, Search, StickyNote, ChefHat, ChevronRight, ArrowLeft } from 'lucide-react';
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
    const cartKey = `cart_${storeId}_${tableId || 'online'}`;
    const [cart, setCart] = useState(() => {
        const saved = sessionStorage.getItem(cartKey);
        return saved ? JSON.parse(saved) : [];
    });
    const [noteModal, setNoteModal] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [storeName, setStoreName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [menuLayout, setMenuLayout] = useState('banner');
    const [categoryBanners, setCategoryBanners] = useState({});

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
                    setMenuLayout(storeData.menuLayout || 'banner');
                    setCategoryBanners(storeData.categoryBanners || {});
                    if (storeData.themeColor) {
                        applyThemeColor(storeData.themeColor, storeData.customColor);
                    }
                }
            } catch {
                toast.error('Gagal memuat menu');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [storeId]);

    useEffect(() => {
        sessionStorage.setItem(`cart_${storeId}_${tableId || 'online'}`, JSON.stringify(cart));
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
        const cartPath = tableId ? `/order/${storeId}/${tableId}/cart` : `/order/${storeId}/cart`;
        navigate(cartPath, { state: { cart } });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    // Helper: Mendapatkan gambar banner kategori (dari setting toko atau fallback ke foto menu pertama di kategori itu)
    const getCategoryImageUrl = (catId) => {
        if (categoryBanners && categoryBanners[catId]) {
            return categoryBanners[catId];
        }
        const menuWithImage = menus.find((m) => m.categoryId === catId && m.imageUrl);
        return menuWithImage ? menuWithImage.imageUrl : null;
    };

    // Helper: Mendapatkan menu di dalam kategori tertentu
    const getCategoryMenus = (catId) => {
        return menus.filter((m) => m.categoryId === catId && m.isAvailable !== false);
    };

    const activeCategoryData = useMemo(() => {
        return categories.find((c) => c.id === activeCategory);
    }, [categories, activeCategory]);

    if (loading) return <Spinner text="Memuat menu..." />;

    // Cek apakah sedang menampilkan mode showcase banner kategori (Foto 2)
    const isBannerMode = menuLayout === 'banner';
    const isShowingCategoryShowcase = isBannerMode && activeCategory === 'all' && search.trim() === '' && categories.length > 0;

    return (
        <>
            <div className="animate-fade-in pb-20">
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
                    {tableId ? (
                        <p className="text-white/80 text-sm">Meja #{String(tableId).padStart(3, '0')}</p>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
                            <span>Pesan Online</span>
                        </div>
                    )}
                    {welcomeMessage && (
                        <p className="text-white/70 text-sm mt-2 italic">{welcomeMessage}</p>
                    )}
                </div>

                {/* Search Bar */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari menu makanan atau minuman..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                </div>

                {/* Category Pills (Navigasi Cepat Horizontal) */}
                <div className="px-4 mb-4 overflow-x-auto">
                    <div className="flex gap-2 pb-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                                activeCategory === 'all'
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
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                                    activeCategory === cat.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-white text-slate-600 border border-border hover:border-primary/30'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MODE 1: SHOWCASE BANNER KATEGORI (Mengikuti Desain Foto 2) */}
                {isShowingCategoryShowcase ? (
                    <div className="px-4 space-y-3 mb-6">
                        <div className="flex items-center justify-between pb-1">
                            <h2 className="text-sm font-bold text-neutral-800">Kategori Menu</h2>
                            <span className="text-xs text-neutral-400">{categories.length} Kategori</span>
                        </div>

                        {categories.map((cat) => {
                            const catMenus = getCategoryMenus(cat.id);
                            const catImage = getCategoryImageUrl(cat.id);

                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className="group relative overflow-hidden rounded-2xl bg-white border border-neutral-200/90 hover:border-primary/50 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 active:scale-[0.99]"
                                >
                                    {/* Sisi Kiri: Judul, Subtitle & Tombol Aksi */}
                                    <div className="flex-1 min-w-0 pr-1">
                                        <h3 className="text-base sm:text-lg font-bold text-neutral-900 group-hover:text-primary transition-colors truncate">
                                            {cat.name}
                                        </h3>
                                        <p className="text-xs text-neutral-500 mt-1 font-medium">
                                            {catMenus.length} Pilihan Menu
                                        </p>
                                        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                                            <span>Lihat Menu</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    {/* Sisi Kanan: Foto Makanan Visual */}
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-orange-50 border border-neutral-100 shadow-xs relative">
                                        {catImage ? (
                                            <img
                                                src={catImage}
                                                alt={cat.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-orange-400">
                                                <ChefHat className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* MODE 2 / FILTER CATEGORY: DAFTAR MENU GRID */
                    <div>
                        {/* Banner Header Kategori Aktif (Jika Mode Banner aktif dan sedang melihat kategori tertentu) */}
                        {isBannerMode && activeCategoryData && search.trim() === '' && (
                            <div className="px-4 mb-4">
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4.5 sm:p-5 shadow-sm flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => setActiveCategory('all')}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white mb-2 cursor-pointer bg-white/15 hover:bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs transition-colors"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Semua Kategori</span>
                                        </button>
                                        <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                                            {activeCategoryData.name}
                                        </h2>
                                        <p className="text-xs text-white/80 mt-0.5">
                                            {filteredMenus.length} Menu Tersedia
                                        </p>
                                    </div>

                                    {/* Foto Makanan Kategori */}
                                    <div className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-white/20 border border-white/30 shadow-xs">
                                        {getCategoryImageUrl(activeCategoryData.id) ? (
                                            <img
                                                src={getCategoryImageUrl(activeCategoryData.id)}
                                                alt={activeCategoryData.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/80">
                                                <ChefHat className="w-7 h-7" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Menu Grid (2 Kolom Standar eMakan) */}
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
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                                                                cartItem.notes ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            <StickyNote className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addToCart(menu)}
                                                        className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
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
                )}
            </div>

            {/* Note Modal */}
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

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div data-floating-cart="true" className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto z-30">
                    <button
                        onClick={goToCart}
                        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-between px-5 shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all cursor-pointer"
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
