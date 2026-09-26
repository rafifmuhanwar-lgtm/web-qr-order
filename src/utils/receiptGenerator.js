/**
 * Generate and download a professional receipt as PNG using Canvas API.
 */
export async function downloadReceiptPNG(order, storeName, orderId, storeAddress, receiptFooter, logoUrl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const W = 420;
    const PAD = 30;
    const CONTENT_W = W - PAD * 2;
    const LINE_H = 24;
    const GAP = 14;

    // Pre-calculate height
    const itemCount = order.items?.length || 0;
    const notesLines = order.items?.filter((i) => i.notes).length || 0;
    const hasOrderNotes = !!order.notes;
    const hasCashPayment = order.paymentMethod === 'cash' && order.amountPaid;

    let H = PAD; // top padding

    // Load logo if available
    let logoImg = null;
    const LOGO_SIZE = 50;
    if (logoUrl) {
        try {
            logoImg = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = logoUrl;
            });
        } catch { logoImg = null; }
    }
    if (logoImg) H += LOGO_SIZE + 10; // logo + gap

    H += 28;     // store name
    if (storeAddress) H += 18; // address
    H += 16;     // "STRUK PESANAN"
    H += GAP + 6; // dashed line
    H += LINE_H * 3; // order info (ID, Meja, Waktu)
    if (order.orderType) H += LINE_H; // order type row
    H += GAP + 6; // dashed line
    H += LINE_H; // items header
    H += itemCount * LINE_H + notesLines * 18;
    H += GAP + 6; // dashed line
    H += LINE_H; // subtotal
    H += LINE_H; // payment method
    if (hasCashPayment) H += LINE_H * 2; // bayar + kembali
    H += 14; // double line
    H += LINE_H + 20; // TOTAL (extra space)
    if (hasOrderNotes) H += LINE_H + GAP;
    H += GAP + 6; // dashed line
    H += LINE_H + 18; // footer
    if (receiptFooter) H += 18; // custom footer
    H += PAD; // bottom padding

    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let y = PAD;

    // --- Helper functions ---
    const text = (str, x, _y, opts = {}) => {
        const { font = '13px sans-serif', color = '#333', align = 'left', maxW } = opts;
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        const xPos = align === 'right' ? W - PAD : align === 'center' ? W / 2 : x;
        ctx.fillText(str, xPos, _y, maxW || undefined);
        ctx.textAlign = 'left';
    };

    const dashedLine = (_y) => {
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(PAD, _y);
        ctx.lineTo(W - PAD, _y);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const doubleLine = (_y) => {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(PAD, _y);
        ctx.lineTo(W - PAD, _y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(PAD, _y + 4);
        ctx.lineTo(W - PAD, _y + 4);
        ctx.stroke();
    };

    const fmtPrice = (price) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

    const fmtDate = (ts) => {
        const d = ts?.toDate?.() || new Date();
        return d.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    // ========== LOGO ==========
    if (logoImg) {
        const logoX = (W - LOGO_SIZE) / 2;
        // Draw rounded logo
        ctx.save();
        ctx.beginPath();
        const r = 10;
        ctx.moveTo(logoX + r, y);
        ctx.lineTo(logoX + LOGO_SIZE - r, y);
        ctx.quadraticCurveTo(logoX + LOGO_SIZE, y, logoX + LOGO_SIZE, y + r);
        ctx.lineTo(logoX + LOGO_SIZE, y + LOGO_SIZE - r);
        ctx.quadraticCurveTo(logoX + LOGO_SIZE, y + LOGO_SIZE, logoX + LOGO_SIZE - r, y + LOGO_SIZE);
        ctx.lineTo(logoX + r, y + LOGO_SIZE);
        ctx.quadraticCurveTo(logoX, y + LOGO_SIZE, logoX, y + LOGO_SIZE - r);
        ctx.lineTo(logoX, y + r);
        ctx.quadraticCurveTo(logoX, y, logoX + r, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, logoX, y, LOGO_SIZE, LOGO_SIZE);
        ctx.restore();
        y += LOGO_SIZE + 10;
    }

    // ========== HEADER ==========
    text(storeName || 'Struk Pesanan', W / 2, y, { font: 'bold 20px sans-serif', color: '#111', align: 'center' });
    y += 24;
    if (storeAddress) {
        text(storeAddress, W / 2, y, { font: '11px sans-serif', color: '#888', align: 'center', maxW: CONTENT_W });
        y += 18;
    }
    text('STRUK PESANAN', W / 2, y, { font: 'bold 11px sans-serif', color: '#999', align: 'center' });
    y += GAP + 6;
    dashedLine(y); y += GAP + 6;

    // ========== ORDER INFO ==========
    const shortId = orderId?.slice(0, 8).toUpperCase() || '-';

    text('No. Pesanan', PAD, y, { font: '12px sans-serif', color: '#888' });
    text(`#${shortId}`, W - PAD, y, { font: 'bold 13px monospace', color: '#333', align: 'right' });
    y += LINE_H;

    text('Meja', PAD, y, { font: '12px sans-serif', color: '#888' });
    text(`#${order.tableNumber || '?'}`, W - PAD, y, { font: 'bold 13px sans-serif', color: '#333', align: 'right' });
    y += LINE_H;

    text('Waktu', PAD, y, { font: '12px sans-serif', color: '#888' });
    text(fmtDate(order.createdAt), W - PAD, y, { font: '12px sans-serif', color: '#555', align: 'right' });
    y += LINE_H;

    // Order Type (Dine In / Take Away)
    if (order.orderType) {
        const typeLabel = order.orderType === 'dine_in' ? 'Dine In' : order.orderType === 'take_away' ? 'Take Away' : '-';
        text('Tipe', PAD, y, { font: '12px sans-serif', color: '#888' });
        text(typeLabel, W - PAD, y, { font: 'bold 13px sans-serif', color: '#333', align: 'right' });
        y += LINE_H;
    }

    dashedLine(y); y += GAP + 6;

    // ========== ITEMS HEADER ==========
    text('Item', PAD, y, { font: 'bold 11px sans-serif', color: '#999' });
    text('Qty', PAD + CONTENT_W * 0.6, y, { font: 'bold 11px sans-serif', color: '#999' });
    text('Harga', W - PAD, y, { font: 'bold 11px sans-serif', color: '#999', align: 'right' });
    y += LINE_H;

    // ========== ITEMS ==========
    let subtotal = 0;
    order.items?.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        text(item.name, PAD, y, { font: '13px sans-serif', color: '#333', maxW: CONTENT_W * 0.55 });
        text(`×${item.quantity}`, PAD + CONTENT_W * 0.6, y, { font: '13px sans-serif', color: '#666' });
        text(fmtPrice(itemTotal), W - PAD, y, { font: '13px sans-serif', color: '#333', align: 'right' });
        y += LINE_H;

        if (item.notes) {
            text(`  📝 ${item.notes}`, PAD, y, { font: 'italic 10px sans-serif', color: '#b45309' });
            y += 18;
        }
    });

    dashedLine(y); y += GAP + 6;

    // ========== SUBTOTAL ==========
    text('Subtotal', PAD, y, { font: '13px sans-serif', color: '#666' });
    text(fmtPrice(subtotal), W - PAD, y, { font: '13px sans-serif', color: '#333', align: 'right' });
    y += LINE_H;

    // ========== PAYMENT METHOD ==========
    const methodLabel = order.paymentMethod === 'qris' ? 'QRIS' : order.paymentMethod === 'cash' ? 'Tunai (Kasir)' : '-';
    text('Pembayaran', PAD, y, { font: '13px sans-serif', color: '#666' });
    text(methodLabel, W - PAD, y, { font: 'bold 13px sans-serif', color: '#333', align: 'right' });
    y += LINE_H;

    // ========== BAYAR & KEMBALI (cash only) ==========
    if (hasCashPayment) {
        text('Bayar', PAD, y, { font: '13px sans-serif', color: '#666' });
        text(fmtPrice(order.amountPaid), W - PAD, y, { font: '13px sans-serif', color: '#333', align: 'right' });
        y += LINE_H;

        const change = (order.amountPaid || 0) - (order.totalPrice || 0);
        text('Kembali', PAD, y, { font: '13px sans-serif', color: '#666' });
        text(fmtPrice(change >= 0 ? change : 0), W - PAD, y, { font: 'bold 13px sans-serif', color: '#16a34a', align: 'right' });
        y += LINE_H;
    }

    y += 8;
    doubleLine(y); y += 22;

    // ========== TOTAL ==========
    // Background highlight box
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(PAD - 4, y - 16, CONTENT_W + 8, 30);

    text('TOTAL', PAD, y, { font: 'bold 16px sans-serif', color: '#111' });
    text(fmtPrice(order.totalPrice), W - PAD, y, { font: 'bold 16px sans-serif', color: '#111', align: 'right' });
    y += LINE_H + 12;

    // ========== ORDER NOTES ==========
    if (hasOrderNotes) {
        text(`Catatan: ${order.notes}`, PAD, y, { font: 'italic 11px sans-serif', color: '#666', maxW: CONTENT_W });
        y += LINE_H;
    }

    dashedLine(y); y += GAP + 6;
    text(receiptFooter || 'Terima kasih atas pesanan Anda!', W / 2, y, { font: '12px sans-serif', color: '#888', align: 'center', maxW: CONTENT_W });
    y += 18;
    if (receiptFooter) {
        text('Terima kasih!', W / 2, y, { font: '11px sans-serif', color: '#aaa', align: 'center' });
        y += 18;
    }
    text(fmtDate(order.createdAt), W / 2, y, { font: '10px sans-serif', color: '#bbb', align: 'center' });

    // ========== DOWNLOAD ==========
    const link = document.createElement('a');
    link.download = `struk-${shortId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
