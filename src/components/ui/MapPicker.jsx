import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom SVG Pin Marker
const pinIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; bottom: 0; width: 14px; height: 6px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(2px);"></div>
            <div style="width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: #f97316; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(249,115,22,0.4); border: 2.5px solid #ffffff;">
                <div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
});

export default function MapPicker({
    initialLat = -6.2088,
    initialLng = 106.8456,
    onLocationSelect,
    readOnly = false,
    height = '240px',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [loadingGps, setLoadingGps] = useState(false);
    const [fetchingAddress, setFetchingAddress] = useState(false);
    const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });

    // Reverse geocode via Nominatim
    const reverseGeocode = useCallback(async (lat, lng) => {
        setFetchingAddress(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
                { headers: { 'User-Agent': 'eMakan-App/1.0' } }
            );
            const data = await res.json();
            const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            if (onLocationSelect) {
                onLocationSelect({ lat, lng, address });
            }
        } catch {
            if (onLocationSelect) {
                onLocationSelect({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
            }
        } finally {
            setFetchingAddress(false);
        }
    }, [onLocationSelect]);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const startLat = initialLat || -6.2088;
        const startLng = initialLng || 106.8456;

        const map = L.map(mapContainerRef.current, {
            center: [startLat, startLng],
            zoom: 15,
            zoomControl: !readOnly,
            scrollWheelZoom: !readOnly,
            dragging: !readOnly,
        });

        // CartoDB Voyager tiles (Google Maps style)
        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap, &copy; CARTO',
            }
        ).addTo(map);

        const marker = L.marker([startLat, startLng], {
            icon: pinIcon,
            draggable: !readOnly,
        }).addTo(map);

        if (!readOnly) {
            marker.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                setCoords({ lat: pos.lat, lng: pos.lng });
                reverseGeocode(pos.lat, pos.lng);
            });

            map.on('click', (e) => {
                marker.setLatLng(e.latlng);
                setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
                reverseGeocode(e.latlng.lat, e.latlng.lng);
            });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [initialLat, initialLng, readOnly, reverseGeocode]);

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Browser tidak mendukung deteksi lokasi GPS');
            return;
        }

        setLoadingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCoords({ lat: latitude, lng: longitude });

                if (mapInstanceRef.current && markerRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 16);
                    markerRef.current.setLatLng([latitude, longitude]);
                }

                reverseGeocode(latitude, longitude);
                setLoadingGps(false);
                toast.success('Lokasi GPS berhasil dideteksi!');
            },
            (err) => {
                setLoadingGps(false);
                console.error(err);
                toast.error('Gagal mendeteksi lokasi GPS. Pastikan izin lokasi aktif.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="relative rounded-2xl overflow-hidden border border-border shadow-inner bg-slate-100">
            <div ref={mapContainerRef} style={{ height, width: '100%', zIndex: 10 }} />

            {/* GPS Locate Button */}
            {!readOnly && (
                <div className="absolute top-3 right-3 z-20">
                    <button
                        type="button"
                        onClick={handleCurrentLocation}
                        disabled={loadingGps}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md text-secondary hover:text-primary rounded-xl shadow-md border border-slate-200 text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        title="Gunakan Lokasi GPS Saya"
                    >
                        {loadingGps ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                            <Navigation className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>{loadingGps ? 'Mendeteksi...' : 'Lokasi Saya'}</span>
                    </button>
                </div>
            )}

            {/* Geocoding indicator / instructions badge */}
            <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none">
                <div className="bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">
                            {fetchingAddress
                                ? 'Mengambil nama jalan...'
                                : readOnly
                                ? 'Titik Pengantaran'
                                : 'Geser pin atau klik di peta'}
                        </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-300 ml-2 flex-shrink-0">
                        {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </span>
                </div>
            </div>
        </div>
    );
}
