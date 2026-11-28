import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenusByStore } from '../../services/menuService';
import { getCategoriesByStore } from '../../services/categoryService';
import { getStore } from '../../services/storeService';
import { applyThemeColor } from '../../utils/themeUtils';
import { ShoppingCart, Plus, Minus, Search, StickyNote, ChefHat, ChevronRight, ArrowLeft, Clock, Store, MapPin, Phone, ExternalLink, Share2, X } from 'lucide-react';
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
    const [storeName, setStoreName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [operationalHours, setOperationalHours] = useState(null);
    const [storeAddress, setStoreAddress] = useState('');
    const [storeWhatsapp, setStoreWhatsapp] = useState('');
    const [storeLat, setStoreLat] = useState(null);
    const [storeLng, setStoreLng] = useState(null);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [menuLayout, setMenuLayout] = useState('banner');
    const [categoryBanners, setCategoryBanners] = useState({});
    const [storeLocked, setStoreLocked] = useState(false);
    const [infoModalOpen, setInfoModalOpen] = useState(false);

    // State untuk Food Detail Modal (Foto 1)
    const [detailModalMenu, setDetailModalMenu] = useState(null);
    const [detailQty, setDetailQty] = useState(1);
    const [detailNotes, setDetailNotes] = useState('');

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
                    setBannerUrl(storeData.bannerUrl || '');
                    setOperationalHours(
                        storeData.operationalHours || {
                            open24: true,
                            openTime: '00:00',
                            closeTime: '23:59',
                            days: 'Setiap Hari',
                        }
                    );
                    setStoreAddress(storeData.address || '');
                    setStoreWhatsapp(storeData.whatsapp || '');
                    setStoreLat(storeData.lat);
                    setStoreLng(storeData.lng);
                    setWelcomeMessage(storeData.welcomeMessage || '');
                    setMenuLayout(storeData.menuLayout || 'banner');
                    setCategoryBanners(storeData.categoryBanners || {});
                    if (storeData.subscriptionStatus === 'expired' || storeData.subscriptionStatus === 'suspended') {
                        setStoreLocked(true);
                    }
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

    const updateQuantity = (id, delta) => {
        setCart((prev) => {
            return prev
                .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0);
        });
    };

    const getCartItem = (id) => cart.find((i) => i.id === id);

    // Buka Modal Detail Makanan (Foto 1)
    const openDetailModal = (menu) => {
        const cartItem = getCartItem(menu.id);
        setDetailModalMenu(menu);
        setDetailQty(cartItem ? cartItem.quantity : 1);
        setDetailNotes(cartItem?.notes || '');
    };

    // Handler Tambah ke Keranjang dari Modal Detail Makanan
    const handleDetailAddToCart = () => {
        if (!detailModalMenu) return;
        setCart((prev) => {
            const existing = prev.find((i) => i.id === detailModalMenu.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === detailModalMenu.id
                        ? { ...i, quantity: detailQty, notes: detailNotes }
                        : i
                );
            }
            return [
                ...prev,
                {
                    id: detailModalMenu.id,
                    name: detailModalMenu.name,
                    price: detailModalMenu.price,
                    quantity: detailQty,
                    notes: detailNotes,
                    imageUrl: detailModalMenu.imageUrl,
                },
            ];
        });
        toast.success(`${detailModalMenu.name} (${detailQty}x) berhasil ditambahkan`);
        setDetailModalMenu(null);
    };

    const detailCategoryName = useMemo(() => {
        if (!detailModalMenu?.categoryId) return '';
        const cat = categories.find((c) => c.id === detailModalMenu.categoryId);
        return cat ? cat.name : '';
    }, [detailModalMenu, categories]);

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

    const DAYS_OF_WEEK = useMemo(() => [
        { key: 'monday', label: 'MONDAY' },
        { key: 'tuesday', label: 'TUESDAY' },
        { key: 'wednesday', label: 'WEDNESDAY' },
        { key: 'thursday', label: 'THURSDAY' },
        { key: 'friday', label: 'FRIDAY' },
        { key: 'saturday', label: 'SATURDAY' },
        { key: 'sunday', label: 'SUNDAY' },
    ], []);

    // Index hari: Senin = 0, ..., Minggu = 6
    const currentDayIdx = (new Date().getDay() + 6) % 7;

    const operationalSummary = useMemo(() => {
        if (!operationalHours || operationalHours.open24) {
            return 'Open today, 00:00-23:59';
        }
        return `Open today, ${operationalHours.openTime || '08:00'}-${operationalHours.closeTime || '22:00'}`;
    }, [operationalHours]);

    const handleShareStore = () => {
        if (navigator.share) {
            navigator.share({
                title: storeName,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Tautan restoran disalin!');
        }
    };

    const getCategoryImageUrl = (catId) => {
        if (categoryBanners && categoryBanners[catId]) {
            return categoryBanners[catId];
        }
        const menuWithImage = menus.find((m) => m.categoryId === catId && m.imageUrl);
        return menuWithImage ? menuWithImage.imageUrl : null;
    };

    const getCategoryMenus = (catId) => {
        return menus.filter((m) => m.categoryId === catId && m.isAvailable !== false);
    };

    const activeCategoryData = useMemo(() => {
        return categories.find((c) => c.id === activeCategory);
    }, [categories, activeCategory]);

    if (loading) return <Spinner text="Memuat menu..." />;

    if (storeLocked) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-6 text-center animate-fade-in">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-secondary mb-2">Restoran Sedang Pembaruan Sistem</h2>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        Layanan pemesanan QR digital untuk <strong>{storeName || 'restoran ini'}</strong> saat ini sedang dalam jadwal pemeliharaan operasional berkala. Silakan melakukan pemesanan langsung melalui kasir atau staf resto yang bertugas.
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-400">
                        Terima kasih atas pengertian dan kunjungan Anda.
                    </div>
                </div>
            </div>
        );
    }

    const isBannerMode = menuLayout === 'banner';
    const isShowingCategoryShowcase = isBannerMode && activeCategory === 'all' && search.trim() === '' && categories.length > 0;

    return (
        <>
            <div className="animate-fade-in pb-20">
                {/* 1. Header Banner / Cover Area */}
                <div className="relative w-full h-44 sm:h-52 bg-slate-100 overflow-hidden">
                    {bannerUrl ? (
                        <img
                            src={bannerUrl}
                            alt={storeName}
                            className="w-full h-full object-cover"
                        />
                    ) : logoUrl ? (
                        <div className="w-full h-full bg-slate-100/80 flex items-center justify-center p-6">
                            <img
                                src={logoUrl}
                                alt={storeName}
                                className="w-20 h-20 rounded-2xl object-cover shadow-xs border border-slate-200 bg-white"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Store className="w-16 h-16 stroke-1 text-slate-400/50" />
                        </div>
                    )}
                </div>

                {/* 2. Floating Cards Container */}
                <div className="px-4 -mt-6 space-y-3 relative z-10">
                    {/* Kartu Profil Toko (Klik untuk melihat Outlet Info) */}
                    <div
                        onClick={() => setInfoModalOpen(true)}
                        className="bg-white rounded-2xl border border-border p-4 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="w-11 h-11 rounded-xl object-cover border border-slate-100 shrink-0 shadow-2xs"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                                    <Store className="w-5 h-5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-lg font-bold text-secondary truncate group-hover:text-primary transition-colors">
                                    {storeName || 'Menu'}
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse"></span>
                                    <span>{operationalSummary}</span>
                                </p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-secondary transition-colors shrink-0">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Kartu Nomor Meja */}
                    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 font-mono tracking-wide">
                            {tableId ? `Meja Nomer : ${tableId}` : 'Pesan Online & Delivery'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/80 uppercase">
                            {tableId ? 'Dine In' : 'Takeaway'}
                        </span>
                    </div>

                    {welcomeMessage && (
                        <p className="text-xs text-slate-500 italic px-1 pt-0.5">{welcomeMessage}</p>
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

                {/* Category Pills (Hanya tampil jika BUKAN mode banner / saat Mode Grid Standar) */}
                {!isBannerMode && (
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
                )}

                {/* MODE 1: SHOWCASE BANNER KATEGORI (Mengikuti Desain Foto 2) */}
                {isShowingCategoryShowcase ? (
                    <div className="px-4 space-y-3.5 mb-6">
                        <div className="flex items-center justify-between pb-1">
                            <h2 className="text-sm font-bold text-neutral-800">Kategori Menu</h2>
                            <span className="text-xs text-neutral-400">{categories.length} Kategori</span>
                        </div>

                        {categories.map((cat, idx) => {
                            const catMenus = getCategoryMenus(cat.id);
                            const catImage = getCategoryImageUrl(cat.id);

                            // Palet gradien lembut hangat bernuansa kuliner
                            const gradients = [
                                'from-orange-500/10 via-amber-500/5 to-white',
                                'from-amber-500/10 via-orange-500/5 to-white',
                                'from-rose-500/10 via-orange-500/5 to-white',
                                'from-orange-600/10 via-yellow-500/5 to-white',
                            ];
                            const bgGradient = gradients[idx % gradients.length];

                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`group relative overflow-hidden rounded-3xl bg-gradient-to-r ${bgGradient} border border-neutral-200/90 hover:border-primary/50 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer min-h-[120px] sm:min-h-[135px] flex items-center justify-between active:scale-[0.99]`}
                                >
                                    {/* Sisi Kiri: Judul, Subtitle & Tombol Aksi */}
                                    <div className="w-3/5 sm:w-2/3 p-5 sm:p-6 z-10 relative flex flex-col justify-between h-full">
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-black text-neutral-900 group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                                                {cat.name}
                                            </h3>
                                            <p className="text-xs text-neutral-500 mt-1 font-medium">
                                                {catMenus.length} Pilihan Menu
                                            </p>
                                        </div>

                                        <div className="mt-3.5 sm:mt-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-neutral-200/80 text-[11px] font-bold text-neutral-800 shadow-2xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                <span>Pilih Menu</span>
                                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sisi Kanan: Foto Makanan Frameless / Cutout Bleeding ke Tepi (Gaya Foto 2) */}
                                    <div className="absolute -right-3 -bottom-3 sm:-right-4 sm:-bottom-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full sm:rounded-3xl overflow-hidden shadow-xl group-hover:scale-105 group-hover:-rotate-2 transition-all duration-300 pointer-events-none bg-orange-100/50">
                                        {catImage ? (
                                            <img
                                                src={catImage}
                                                alt={cat.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-orange-400 bg-orange-50">
                                                <ChefHat className="w-10 h-10" />
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
                        {/* Banner Header Kategori Aktif (Frameless Gaya Foto 2) */}
                        {isBannerMode && activeCategoryData && search.trim() === '' && (
                            <div className="px-4 mb-5">
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-600 text-white p-5 sm:p-6 shadow-md min-h-[120px] flex items-center justify-between">
                                    <div className="w-3/5 sm:w-2/3 z-10 relative">
                                        <button
                                            onClick={() => setActiveCategory('all')}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/95 hover:text-white mb-2 cursor-pointer bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full backdrop-blur-xs transition-colors"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Semua Kategori</span>
                                        </button>
                                        <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                                            {activeCategoryData.name}
                                        </h2>
                                        <p className="text-xs text-white/85 mt-0.5">
                                            {filteredMenus.length} Menu Tersedia
                                        </p>
                                    </div>

                                    {/* Foto Makanan Frameless */}
                                    <div className="absolute -right-4 -bottom-4 w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-xl border-4 border-white/20 bg-white/20 pointer-events-none">
                                        {getCategoryImageUrl(activeCategoryData.id) ? (
                                            <img
                                                src={getCategoryImageUrl(activeCategoryData.id)}
                                                alt={activeCategoryData.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/80">
                                                <ChefHat className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Menu Grid (2 Kolom) */}
                        <div className="px-4 grid grid-cols-2 gap-3">
                            {filteredMenus.map((menu) => {
                                const cartItem = getCartItem(menu.id);
                                return (
                                    <div
                                        key={menu.id}
                                        className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        {/* Area Foto & Info yang Dapat Diklik untuk Buka Detail (Foto 1) */}
                                        <div
                                            onClick={() => openDetailModal(menu)}
                                            className="cursor-pointer group"
                                        >
                                            <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                                {menu.imageUrl ? (
                                                    <img
                                                        src={menu.imageUrl}
                                                        alt={menu.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
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
                                            <div className="p-3 pb-1">
                                                <h3 className="font-bold text-sm text-secondary truncate group-hover:text-primary transition-colors">
                                                    {menu.name}
                                                </h3>
                                                <p className="text-primary font-black text-sm mt-0.5">
                                                    {formatPrice(menu.price)}
                                                </p>
                                                {menu.description && (
                                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                                                        {menu.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Aksi Tambah / Stepper Cepat */}
                                        <div className="p-3 pt-2">
                                            {cartItem ? (
                                                <div className="flex items-center gap-1.5 w-full">
                                                    <button
                                                        onClick={() => updateQuantity(menu.id, -1)}
                                                        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer active:scale-95"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="flex-1 text-center font-bold text-sm">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(menu.id, 1)}
                                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer active:scale-95"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openDetailModal(menu)}
                                                    className="w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer active:scale-98"
                                                >
                                                    + Tambah
                                                </button>
                                            )}
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

            {/* FOOD DETAIL MODAL / BOTTOM SHEET (Mengikuti Desain Foto 1) */}
            {detailModalMenu && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setDetailModalMenu(null)}
                    />

                    {/* Modal Dialog Card */}
                    <div className="relative bg-white w-full max-w-sm sm:max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col z-10 animate-fade-in">
                        {/* Top Curved Wave Header */}
                        <div className="relative w-full bg-gradient-to-br from-primary to-primary-dark pt-4 pb-12 px-4 overflow-hidden shrink-0">
                            {/* Top Close / Back Button */}
                            <div className="flex items-center justify-between relative z-20">
                                <button
                                    onClick={() => setDetailModalMenu(null)}
                                    className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/35 text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Tutup"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                {detailCategoryName && (
                                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs">
                                        {detailCategoryName}
                                    </span>
                                )}
                            </div>

                            {/* Floating Circular Dish Plate (Piring Makanan Melayang di Tengah) */}
                            <div className="flex justify-center -mb-20 mt-2 z-20 relative">
                                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white relative">
                                    {detailModalMenu.imageUrl ? (
                                        <img
                                            src={detailModalMenu.imageUrl}
                                            alt={detailModalMenu.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-400">
                                            <ChefHat className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Wave Curve Shape (Sesuai Desain Foto 1) */}
                            <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none z-10">
                                <svg
                                    className="w-full h-12 text-white fill-current block"
                                    viewBox="0 0 375 50"
                                    preserveAspectRatio="none"
                                >
                                    <path d="M0,25 C120,55 240,0 375,10 L375,50 L0,50 Z" />
                                </svg>
                            </div>
                        </div>

                        {/* Card Body (Scrollable) */}
                        <div className="pt-24 px-6 pb-4 overflow-y-auto space-y-4 flex-1">
                            {/* Title & Price */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900 leading-snug">
                                        {detailModalMenu.name}
                                    </h2>
                                    {detailCategoryName && (
                                        <p className="text-xs font-semibold text-primary mt-0.5">
                                            Kategori: {detailCategoryName}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xl sm:text-2xl font-black text-primary">
                                        {formatPrice(detailModalMenu.price)}
                                    </span>
                                </div>
                            </div>

                            {/* Deskripsi & Komposisi (Ingredients) */}
                            <div className="pt-3 border-t border-neutral-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
                                    Deskripsi & Komposisi
                                </h4>
                                <p className="text-xs text-neutral-600 leading-relaxed">
                                    {detailModalMenu.description ||
                                        'Dibuat dengan bahan-bahan pilihan berkualitas, diolah secara higienis dan disajikan hangat langsung dari dapur.'}
                                </p>
                            </div>

                            {/* Catatan Khusus Pesanan (Opsional) */}
                            <div className="pt-3 border-t border-neutral-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-800 mb-1.5 flex items-center gap-1.5">
                                    <StickyNote className="w-3.5 h-3.5 text-primary" />
                                    <span>Catatan Khusus (Opsional)</span>
                                </label>
                                <textarea
                                    value={detailNotes}
                                    onChange={(e) => setDetailNotes(e.target.value)}
                                    placeholder="Contoh: jangan pedas, kuah dipisah, sendok plastik..."
                                    className="w-full p-3 rounded-xl border border-neutral-200 text-xs resize-none h-18 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-neutral-50/50"
                                    maxLength={150}
                                />
                            </div>
                        </div>

                        {/* Bottom Action Bar (Sticky di Bawah) */}
                        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white flex items-center gap-3 shrink-0 shadow-lg">
                            {/* Stepper Jumlah Porsi: [ - ] qty [ + ] */}
                            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-2xl shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setDetailQty((prev) => Math.max(1, prev - 1))}
                                    disabled={detailQty <= 1}
                                    className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-sm shadow-2xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-black text-sm text-neutral-900 min-w-[24px] text-center">
                                    {detailQty}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDetailQty((prev) => prev + 1)}
                                    className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-dark text-white flex items-center justify-center font-bold text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Tombol Utama: Tambah ke Keranjang */}
                            <button
                                type="button"
                                onClick={handleDetailAddToCart}
                                className="flex-1 py-3 px-4 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-98 cursor-pointer"
                            >
                                <ShoppingCart className="w-4 h-4 shrink-0" />
                                <span>Pesan</span>
                                <span className="opacity-70">•</span>
                                <span>{formatPrice(detailModalMenu.price * detailQty)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Outlet Info (Foto 2) */}
            {infoModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-border overflow-hidden my-auto animate-enter">
                        {/* Header Modal: ← Outlet Info */}
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-white">
                            <button
                                onClick={() => setInfoModalOpen(false)}
                                className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Outlet Info</span>
                            </button>
                            <button
                                onClick={() => setInfoModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            {/* Nama Outlet & Alamat */}
                            <div>
                                <h2 className="text-xl font-bold text-secondary">{storeName}</h2>
                                <div className="flex items-start gap-2 text-xs text-slate-600 mt-2.5 leading-relaxed">
                                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <span className="flex-1">{storeAddress || 'Alamat restoran belum diatur.'}</span>
                                    <button
                                        type="button"
                                        onClick={handleShareStore}
                                        className="p-1.5 rounded-xl border border-border hover:bg-slate-50 text-slate-500 hover:text-secondary transition-colors cursor-pointer shrink-0"
                                        title="Bagikan Tautan"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Tombol Contact us & Visit us */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                {storeWhatsapp ? (
                                    <a
                                        href={`https://wa.me/${storeWhatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-secondary transition-colors shadow-2xs"
                                    >
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Contact us</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-slate-50 text-xs font-semibold text-slate-400 cursor-not-allowed">
                                        <Phone className="w-3.5 h-3.5 text-slate-300" />
                                        <span>Contact us</span>
                                    </div>
                                )}

                                {storeLat && storeLng ? (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${storeLat},${storeLng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-secondary transition-colors shadow-2xs"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                        <span>Visit us</span>
                                    </a>
                                ) : storeAddress ? (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-secondary transition-colors shadow-2xs"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                        <span>Visit us</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-slate-50 text-xs font-semibold text-slate-400 cursor-not-allowed">
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                                        <span>Visit us</span>
                                    </div>
                                )}
                            </div>

                            {/* Daftar Operational Hours */}
                            <div className="pt-3 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
                                    Operational Hours
                                </h3>
                                <div className="divide-y divide-slate-100 text-xs">
                                    {DAYS_OF_WEEK.map((d, index) => {
                                        const isToday = index === currentDayIdx;
                                        const hoursText = operationalHours?.open24
                                            ? 'Open 24 hours'
                                            : `${operationalHours?.openTime || '08:00'} - ${operationalHours?.closeTime || '22:00'}`;
                                        return (
                                            <div
                                                key={d.key}
                                                className={`py-3 flex items-center justify-between ${
                                                    isToday
                                                        ? 'font-extrabold text-secondary'
                                                        : 'text-slate-500 font-medium'
                                                }`}
                                            >
                                                <span className="tracking-wider text-[11px]">{d.label}</span>
                                                <span className={isToday ? 'text-primary font-bold' : ''}>{hoursText}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
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
