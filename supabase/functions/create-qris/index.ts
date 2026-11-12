import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request (Penting agar tidak diblokir Browser)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Ambil data pesanan yang dikirim dari Frontend (React)
    const { amount, description } = await req.json()

    if (!amount) {
      throw new Error('Jumlah pembayaran (amount) wajib diisi')
    }

    // 2. Ambil Kunci Rahasia BuatQris dari server Supabase
    // (Ini aman karena tidak akan pernah bocor ke sisi browser)
    const account_id = Deno.env.get('BUATQRIS_ACCOUNT_ID')
    const secret_token = Deno.env.get('BUATQRIS_SECRET_TOKEN')

    if (!account_id || !secret_token) {
      throw new Error('Kredensial BuatQris belum dikonfigurasi di server')
    }

    // 3. Susun parameter sesuai format "application/x-www-form-urlencoded"
    const bodyParams = new URLSearchParams()
    bodyParams.append('action', 'api_create_qris')
    bodyParams.append('account_id', account_id)
    bodyParams.append('secret_token', secret_token)
    bodyParams.append('amount', String(amount))
    
    if (description) {
        bodyParams.append('description', description)
    }

    // CATATAN: Hapus tanda "//" di bawah ini jika ingin menguji dengan mode Sandbox (tanpa uang asli)
    // bodyParams.append('test', '1')

    // 4. Kirim perintah ke server BuatQris
    const response = await fetch('https://api.buatqris.site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    })

    const data = await response.json()

    // 5. Kembalikan gambar QR dan data lainnya ke Web React
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
