/**
 * Delivery & Distance calculation utilities
 */

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Earth radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.round(dist * 10) / 10; // e.g. 3.4 km
}

export function calculateShippingFee(distanceKm, config) {
    const freeDistance = Number(config?.freeDistanceKm ?? 5);
    const feePerKm = Number(config?.feePerKm ?? 2500);
    const maxDistance = Number(config?.maxDistanceKm ?? 15);

    if (distanceKm > maxDistance) {
        return {
            allowed: false,
            fee: 0,
            isFree: false,
            distanceKm,
            message: `Jarak pengantaran (${distanceKm} km) melebihi jangkauan maksimal resto (${maxDistance} km)`,
        };
    }

    if (distanceKm <= freeDistance) {
        return {
            allowed: true,
            fee: 0,
            isFree: true,
            distanceKm,
            message: `Gratis Ongkir (Jarak di bawah ${freeDistance} km)`,
        };
    }

    const billableKm = Math.ceil(distanceKm - freeDistance);
    const fee = billableKm * feePerKm;
    return {
        allowed: true,
        fee,
        isFree: false,
        distanceKm,
        billableKm,
        message: `${billableKm} km x Rp ${feePerKm.toLocaleString('id-ID')}`,
    };
}

export function parseStoreConfig(store) {
    if (!store) return { address: '', freeDistanceKm: 5, feePerKm: 2500, maxDistanceKm: 15 };
    if (store.deliverySettings && typeof store.deliverySettings === 'object') {
        return {
            address: store.address || '',
            ...store.deliverySettings,
        };
    }
    // Try parse from address if stored as JSON
    if (store.address && typeof store.address === 'string' && store.address.startsWith('{')) {
        try {
            const parsed = JSON.parse(store.address);
            return {
                address: parsed.address || '',
                lat: parsed.lat || null,
                lng: parsed.lng || null,
                freeDistanceKm: Number(parsed.freeDistanceKm ?? 5),
                feePerKm: Number(parsed.feePerKm ?? 2500),
                maxDistanceKm: Number(parsed.maxDistanceKm ?? 15),
                whatsapp: parsed.whatsapp || '',
            };
        } catch {
            // fallback
        }
    }
    return {
        address: store.address || '',
        lat: null,
        lng: null,
        freeDistanceKm: 5,
        feePerKm: 2500,
        maxDistanceKm: 15,
        whatsapp: '',
    };
}

export function parseOrderDelivery(order) {
    if (!order) return {};
    let delivery = {};
    if (order.notes && typeof order.notes === 'string') {
        if (order.notes.startsWith('{') && order.notes.endsWith('}')) {
            try {
                delivery = JSON.parse(order.notes);
            } catch {
                delivery = { notes: order.notes };
            }
        } else {
            delivery = { notes: order.notes };
        }
    } else if (order.notes && typeof order.notes === 'object') {
        delivery = order.notes;
    }

    return {
        phone: order.customerPhone || delivery.phone || '',
        address: order.deliveryAddress || delivery.address || '',
        lat: delivery.lat || order.customerCoordinates?.lat || null,
        lng: delivery.lng || order.customerCoordinates?.lng || null,
        distanceKm: order.distanceKm || delivery.distanceKm || 0,
        shippingFee: order.shippingFee || delivery.shippingFee || 0,
        courierTip: order.courierTip || delivery.courierTip || 0,
        userNotes: delivery.userNotes || delivery.notes || '',
    };
}

export function buildGoogleMapsRouteUrl(lat, lng) {
    if (!lat || !lng) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function buildWhatsAppChatUrl(phone, message) {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

