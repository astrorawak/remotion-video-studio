# TODO — Trading Insight Studio Enhancement

## Fase 1: Audit Mendalam
- [x] Ambil schema lengkap semua 27 tool (parameter, required, enum)
- [x] Identifikasi tool yang relevan untuk trading/ekonomi/news/AI
- [x] Identifikasi gap: format portrait belum didukung + butuh tool trading khusus
- [x] Tambah dukungan format dinamis (portrait/landscape/square) GLOBAL ke semua tool

## Fase 2: Tool Baru
- [x] render_stock_ticker (ticker saham berjalan ala Bloomberg) - PASS
- [x] render_candlestick_chart (chart candlestick trading animasi) - PASS
- [x] render_breaking_news (banner breaking news TV) - PASS
- [x] render_market_dashboard (counter angka multi-metrik) - PASS
- [x] Deploy Railway: 31 tools aktif, semua test PASS, format portrait terbukti
- [ ] render_breaking_news (banner breaking news ala TV)
- [ ] render_number_counter (counter angka besar animasi untuk statistik)
- [ ] Register semua komponen baru di index.tsx
- [ ] Tambah definisi + handler tool baru di server.js

## Fase 3: Deploy & Test 100%
- [ ] Validasi sintaks server.js
- [ ] Deploy ke Railway (railway up)
- [ ] Verifikasi semua tool muncul di MCP list
- [ ] Test render aktual minimal 1 tool baru sampai status done
- [ ] Pastikan semua tool callable dari endpoint

## Fase 4: MD Instruksi Final
- [ ] Tulis MD super detail dengan strategi, workflow, contoh
- [ ] Sertakan semua tool baru + parameter
- [ ] Panduan CapCut, musik, branding

## Fase 5: Deliver
- [ ] Kirim MD + ringkasan ke user
