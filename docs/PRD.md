# THEGATE

## Intelligent AI Cost Optimization Platform

**Product Requirements Document (PRD)**

| Metadata             | Detail                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Product Name         | TheGate                                                             |
| Product Category     | Intelligent LLM Routing & AI Cost Optimization                      |
| Document Version     | 2.0                                                                 |
| Status               | Proposed — Ready for Technical Planning                             |
| Initial Release      | MVP                                                                 |
| Product Model        | Open-source, self-hosted                                            |
| Primary Target Users | AI application developers, indie hackers, AI startups               |
| Initial Integration  | 9Router                                                             |
| Routing Engine       | Pluggable routing strategies, with RouteLLM as an initial candidate |
| Backend              | Python, FastAPI                                                     |
| Frontend             | Next.js, TypeScript, Tailwind CSS                                   |
| Database             | PostgreSQL                                                          |
| Deployment           | Docker Compose                                                      |
| Long-term Vision     | Provider-agnostic AI optimization platform                          |

---

# 1. EXECUTIVE SUMMARY

## 1.1 Product Overview

TheGate adalah platform open-source untuk mengoptimalkan penggunaan Large Language Models (LLM) melalui intelligent routing, cost intelligence, dan quality-aware optimization.

TheGate bertindak sebagai lapisan optimasi antara aplikasi pengguna dan infrastruktur penyedia model AI.

Platform menerima request melalui API yang kompatibel dengan OpenAI, menganalisis karakteristik request, mengevaluasi kebijakan routing, lalu memilih model yang paling sesuai berdasarkan kebutuhan aplikasi.

Tujuan utama TheGate bukan sekadar memilih model termurah, tetapi menemukan keseimbangan antara:

- Biaya penggunaan.
- Kualitas respons.
- Latency.
- Kemampuan model.
- Batasan dan preferensi pengguna.
- Keandalan provider.

Pada tahap awal, TheGate menggunakan 9Router sebagai backend integrasi model AI dan mengevaluasi RouteLLM sebagai salah satu komponen routing.

Namun, arsitektur internal harus memungkinkan penambahan adapter untuk gateway atau provider lain tanpa mengubah keseluruhan sistem.

## 1.2 Product Vision

**Make every AI request cost-efficient without sacrificing the quality users actually need.**

TheGate bertujuan membantu developer memahami, mengendalikan, dan mengoptimalkan pengeluaran AI melalui keputusan routing yang transparan dan dapat dievaluasi.

## 1.3 Product Mission

1. Menyederhanakan integrasi intelligent routing ke aplikasi AI.
2. Mengurangi biaya inferensi melalui pemilihan model yang sesuai.
3. Menyediakan pengukuran biaya dan penggunaan yang transparan.
4. Memungkinkan evaluasi kualitas model berdasarkan kebutuhan aplikasi.
5. Menjaga fleksibilitas melalui arsitektur yang tidak bergantung pada satu gateway.
6. Menyediakan fondasi untuk optimasi otomatis berdasarkan data penggunaan.

## 1.4 Core Value Proposition

TheGate memberikan tiga nilai utama.

**Intelligent Routing**

Memilih model berdasarkan karakteristik request, kemampuan model, serta kebijakan pengguna.

**Cost Intelligence**

Mengukur biaya, memperlihatkan distribusi penggunaan, dan membandingkan biaya aktual dengan baseline yang didefinisikan secara eksplisit.

**Quality-Aware Optimization**

Membantu pengguna mengidentifikasi model yang lebih ekonomis berdasarkan hasil evaluasi, tanpa mengasumsikan bahwa model murah selalu menghasilkan kualitas yang setara.

## 1.5 Prinsip Produk

Pengembangan TheGate harus mengikuti prinsip berikut:

1. **Measurement before optimization:** ukur kondisi awal sebelum mengklaim penghematan.
2. **Quality before cheapness:** biaya rendah tidak boleh menjadi satu-satunya faktor keputusan.
3. **Explicit over implicit:** setiap kebijakan routing harus memiliki perilaku yang dapat dipahami.
4. **Provider independence:** komponen inti tidak boleh bergantung pada API khusus satu gateway.
5. **Privacy by default:** konten prompt dan respons tidak disimpan secara default.
6. **Simple deployment:** pengguna harus dapat menjalankan MVP dengan Docker Compose.
7. **Progressive complexity:** fitur lanjutan ditambahkan setelah fondasi inti tervalidasi.

---

# 2. PROBLEM STATEMENT

## 2.1 Masalah Utama

Developer yang membangun aplikasi AI sering menggunakan beberapa model dengan karakteristik biaya, kualitas, kecepatan, dan kemampuan yang berbeda.

Pemilihan model umumnya dilakukan secara statis melalui konfigurasi aplikasi.

Pendekatan tersebut menimbulkan beberapa masalah:

- Request sederhana dapat menggunakan model yang lebih mahal daripada yang dibutuhkan.
- Developer sulit mengetahui model mana yang paling efisien untuk kategori tugas tertentu.
- Biaya AI tersebar di berbagai model dan provider.
- Penghematan biaya sulit diukur secara objektif.
- Perubahan harga atau performa model dapat membuat konfigurasi lama menjadi tidak optimal.
- Penggantian model memerlukan eksperimen dan perubahan konfigurasi manual.
- Mekanisme fallback belum tentu mempertimbangkan batas biaya dan kualitas.

## 2.2 Problem Statement

TheGate membantu developer mengurangi biaya penggunaan AI melalui pemilihan model berbasis kebijakan dan evaluasi performa, sekaligus menyediakan visibilitas terhadap biaya, latency, dan hasil optimasi.

## 2.3 Existing Alternatives

TheGate berada dalam ekosistem yang telah memiliki berbagai solusi.

| Kategori                     | Contoh   | Fokus                                                  |
| ---------------------------- | -------- | ------------------------------------------------------ |
| Model routing                | RouteLLM | Strategi pemilihan model                               |
| AI gateway dan SDK           | LiteLLM  | Integrasi multi-model dan routing                      |
| AI gateway dan observabilitas | Portkey  | Pengelolaan request dan observabilitas                 |
| Provider/gateway backend     | 9Router  | Akses dan pengelolaan model melalui satu lapisan       |
| Proposed product             | TheGate  | Cost optimization dengan routing dan evaluasi kualitas |

TheGate tidak bertujuan mereplikasi seluruh fitur produk tersebut.

Diferensiasi yang ditargetkan adalah mengintegrasikan routing, cost accounting, evaluasi kualitas, dan rekomendasi optimasi dalam pengalaman self-hosted yang sederhana.

Keberhasilan diferensiasi ini harus divalidasi melalui implementasi dan pengujian terhadap alternatif yang relevan.

---

# 3. TARGET USERS

## 3.1 Primary Persona — AI Application Developer

Developer yang membangun chatbot, AI assistant, document analyzer, coding assistant, atau aplikasi berbasis LLM.

Kebutuhan:

- Mengurangi biaya API.
- Menggunakan beberapa model melalui satu integrasi.
- Mengganti model tanpa mengubah banyak kode aplikasi.
- Memahami alasan pemilihan model.
- Mengukur biaya dan latency.

## 3.2 Secondary Persona — Indie Hacker dan AI Startup

Tim kecil yang membangun produk AI dengan anggaran terbatas.

Kebutuhan:

- Pengendalian biaya.
- Pengaturan kebijakan routing.
- Monitoring penggunaan.
- Pengujian alternatif model.
- Deployment mandiri.

## 3.3 Future Persona — AI Platform Team

Tim yang mengelola penggunaan AI pada beberapa aplikasi atau organisasi.

Kebutuhan masa depan:

- Multi-user dan multi-project.
- Role-based access control.
- Budget enforcement.
- Audit log.
- Governance.
- Pengelolaan kebijakan terpusat.

Fitur enterprise tidak menjadi bagian dari MVP kecuali diperlukan untuk menjaga keamanan dan integritas sistem inti.

---

# 4. PRODUCT SCOPE

## 4.1 MVP In Scope

MVP wajib mencakup:

1. OpenAI-compatible API endpoint untuk chat completions.
2. Integrasi awal dengan 9Router.
3. Provider adapter abstraction.
4. Routing policy engine.
5. Satu strategi routing awal yang dapat diuji.
6. Model registry dan konfigurasi harga.
7. Basic cost accounting.
8. Routing decision logging.
9. Streaming dan non-streaming responses.
10. PostgreSQL persistence.
11. Dashboard analitik minimum.
12. Konfigurasi routing yang dapat diubah pengguna.
13. Authentication dan rate limiting.
14. Metadata-only logging sebagai default.
15. Docker Compose deployment.
16. Automated tests dan benchmark dasar.

## 4.2 MVP Out of Scope

Fitur berikut tidak termasuk implementasi wajib MVP:

- Hosted SaaS.
- Billing dan subscription system.
- Multi-tenant enterprise management.
- Fine-tuning model.
- Training model routing dari nol.
- Autonomous policy modification.
- Automatic model benchmarking pada seluruh traffic produksi.
- Semantic caching.
- Kompleksitas workflow agent yang tidak diperlukan.
- Dukungan penuh untuk seluruh endpoint setiap provider.
- Klaim penghematan atau kualitas tanpa benchmark.
- Integrasi dengan seluruh gateway sejak hari pertama.

## 4.3 Future Scope

Setelah MVP tervalidasi:

- Benchmarking Lab.
- Quality-aware routing yang lebih matang.
- Budget alerts dan budget enforcement.
- Exact-match caching.
- Semantic caching opsional.
- Adaptive optimization.
- Recommendation engine.
- Provider adapters tambahan.
- Multi-user dan organization management.
- Hosted deployment.

---

# 5. PRODUCT ARCHITECTURE

## 5.1 High-Level Architecture

```text
                       AI APPLICATION
                             |
                             v
                    THEGATE API GATEWAY
                             |
                 Authentication / Rate Limit
                             |
                             v
                     REQUEST VALIDATION
                             |
                             v
                     REQUEST ANALYZER
                             |
                    Routing Features
                             |
                             v
                     POLICY EVALUATOR
                             |
                             v
                      ROUTING ENGINE
                             |
                 +-----------+-----------+
                 |                       |
                 v                       v
          Model Registry            Cost Catalog
                 |                       |
                 +-----------+-----------+
                             |
                             v
                     SELECTED MODEL
                             |
                             v
                     PROVIDER ADAPTER
                             |
                             v
                    INITIAL BACKEND
                          9Router
                             |
                             v
                      MODEL PROVIDER
                             |
                             v
                     RESPONSE HANDLER
                             |
                   +---------+---------+
                   |                   |
                   v                   v
             Client Response       Usage Metrics
                                       |
                                       v
                                 PostgreSQL
                                       |
                                       v
                               Analytics API
                                       |
                                       v
                                 Dashboard
```

Diagram tersebut menggambarkan arsitektur logis, bukan urutan seluruh operasi internal secara sinkron.

Logging dan analitik harus dirancang agar tidak memperlambat jalur respons secara berlebihan.

## 5.2 Architectural Components

### A. API Gateway

Tanggung jawab:

- Menerima request.
- Memvalidasi autentikasi.
- Memvalidasi format request.
- Menerapkan rate limiting.
- Menangani streaming.
- Mengembalikan response dalam format kompatibel.
- Menghasilkan request ID.

### B. Request Analyzer

Tanggung jawab:

- Menghitung karakteristik request yang diperlukan routing.
- Mengestimasi panjang context.
- Mengidentifikasi kebutuhan parameter dan output tertentu.
- Menghasilkan fitur untuk routing engine.

Analyzer tidak boleh mengirim request tambahan ke LLM secara default hanya untuk menentukan kompleksitas prompt.

### C. Routing Policy Engine

Tanggung jawab:

- Memuat kebijakan pengguna.
- Mengevaluasi kandidat model.
- Menerapkan batasan biaya dan kemampuan.
- Menjalankan strategi routing.
- Menghasilkan keputusan yang dapat diaudit.
- Menentukan perilaku ketika tidak ada kandidat yang memenuhi syarat.

### D. Model Registry

Menyimpan metadata model, meliputi:

- Identitas model internal.
- Identitas model pada backend.
- Status aktif.
- Kemampuan yang diketahui.
- Batas context jika tersedia.
- Dukungan streaming.
- Dukungan tools dan structured output jika diketahui.
- Referensi tarif model.
- Metadata kompatibilitas.

Informasi kemampuan model harus dapat diperbarui dan tidak boleh diasumsikan identik untuk semua provider.

### E. Cost Catalog

Menyimpan versi tarif yang berlaku.

Setiap entri tarif harus memiliki:

- Model dan provider.
- Harga input.
- Harga output.
- Satuan tarif.
- Mata uang.
- Waktu mulai berlaku.
- Sumber data tarif.
- Status validasi.
- Informasi diskon atau kategori token khusus jika relevan.

Tarif yang tidak diketahui tidak boleh diam-diam dianggap nol.

### F. Provider Adapter

Adapter menyediakan kontrak internal untuk mengirim request ke backend.

Tanggung jawab:

- Mengonversi request ke format backend.
- Memetakan identitas model.
- Mendukung streaming dan non-streaming.
- Memetakan error.
- Mengambil usage metadata.
- Menyampaikan informasi provider yang diperlukan.

Implementasi pertama menggunakan 9Router.

Arsitektur harus memungkinkan adapter lain ditambahkan tanpa mengubah routing policy engine.

### G. Response Handler

Tanggung jawab:

- Meneruskan response.
- Mempertahankan semantik streaming.
- Menangani error secara konsisten.
- Mengumpulkan metadata penggunaan yang tersedia.
- Mencatat status penyelesaian request.

### H. Analytics Service

Tanggung jawab:

- Mengagregasi penggunaan.
- Menghitung biaya.
- Menyediakan perbandingan baseline.
- Menghasilkan data untuk dashboard.
- Membedakan nilai aktual, estimasi, dan data yang tidak tersedia.

---

# 6. FUNCTIONAL REQUIREMENTS

## FR-001 — OpenAI-Compatible API

TheGate harus menyediakan endpoint awal:

`POST /v1/chat/completions`

Endpoint menerima request dalam format yang kompatibel dengan OpenAI Chat Completions untuk subset fitur yang secara eksplisit didukung MVP.

Persyaratan:

- Menerima daftar messages.
- Mendukung pemilihan routing policy.
- Mendukung parameter generasi yang kompatibel dengan backend.
- Mendukung streaming dan non-streaming.
- Mengembalikan response yang kompatibel dengan format yang didukung.
- Menghasilkan request ID.
- Mengembalikan error yang konsisten.
- Mendokumentasikan parameter yang belum didukung.

Jangan mengklaim kompatibilitas penuh dengan seluruh OpenAI API pada tahap MVP.

## FR-002 — Routing Policy Engine

Pengguna dapat menentukan strategi routing.

Mode awal:

**Economy**

Mengutamakan model berbiaya rendah yang memenuhi batasan dan kriteria kelayakan.

**Balanced**

Menyeimbangkan estimasi biaya, performa historis, dan batasan pengguna.

**Quality**

Mengutamakan performa kualitas yang didukung evaluasi, dengan tetap menghormati batasan keras pengguna.

Semua mode harus menggunakan konfigurasi dan kandidat model yang valid.

Mode tersebut tidak boleh menjadi label UI tanpa perbedaan perilaku yang nyata.

## FR-003 — Routing Strategy Interface

Routing engine harus menggunakan kontrak strategi yang dapat diperluas.

Contoh konsep internal:

```python
class RoutingStrategy:
    async def select_model(
        self,
        request_context,
        candidate_models,
        policy,
    ):
        raise NotImplementedError
```

Contoh tersebut merupakan ilustrasi kontrak, bukan spesifikasi final implementasi.

Strategi awal dapat menggunakan:

- Rule-based routing sebagai baseline.
- Integrasi RouteLLM jika kompatibilitas dan kebutuhan teknisnya tervalidasi.

RouteLLM bukan satu-satunya strategi yang diperbolehkan.

## FR-004 — Model Eligibility

Sebelum model dipilih, TheGate harus mengevaluasi kelayakannya.

Kriteria dapat mencakup:

- Model aktif.
- Model tersedia melalui adapter.
- Dukungan parameter yang dibutuhkan.
- Context limit.
- Kemampuan output yang dibutuhkan.
- Batas biaya.
- Preferensi dan model yang dikecualikan pengguna.

Model yang tidak memenuhi batasan keras tidak boleh dipilih hanya karena lebih murah.

## FR-005 — Routing Decision Record

Setiap request yang melewati routing engine harus menghasilkan catatan keputusan.

Metadata minimum:

- Request ID.
- Routing policy.
- Routing strategy dan versi.
- Kandidat yang dievaluasi jika tersedia.
- Model yang dipilih.
- Alasan keputusan.
- Estimasi biaya jika tersedia.
- Status evaluasi kandidat.
- Routing decision latency.

Pencatatan tidak boleh mewajibkan penyimpanan prompt asli.

## FR-006 — Provider Integration

Versi pertama menggunakan 9Router sebagai backend.

Persyaratan:

- Backend URL dikonfigurasi melalui environment variable.
- Secret backend tidak diekspos ke frontend.
- Model internal dipetakan ke identitas model yang tersedia di backend.
- Error backend dipetakan ke error internal.
- Timeout dan koneksi terputus ditangani dengan aman.
- Integrasi diuji menggunakan mock dan lingkungan backend yang sesuai.

Jangan mengasumsikan format identitas model, perilaku streaming, atau kontrak error tanpa memeriksa versi 9Router yang menjadi target.

## FR-007 — Cost Accounting

TheGate harus menghitung estimasi biaya setiap request berdasarkan metadata usage dan tarif model yang sesuai.

Formula dasar:

```text
input_cost =
    input_tokens * input_price_per_token

output_cost =
    output_tokens * output_price_per_token

estimated_total_cost =
    input_cost + output_cost
```

Harga dapat disimpan dalam satuan per token atau dinormalisasi dari tarif per satu juta token.

Persyaratan:

- Menyimpan versi tarif yang digunakan.
- Menyimpan mata uang.
- Membedakan biaya aktual yang dilaporkan provider dari estimasi internal.
- Menandai usage yang tidak tersedia.
- Tidak menganggap token yang tidak diketahui sebagai nol.
- Menghindari penghitungan ganda pada retry.
- Mendokumentasikan keterbatasan harga dan usage.

Jika provider memiliki tarif khusus untuk cached input, reasoning tokens, atau jenis token lain, struktur data harus dapat diperluas untuk mendukungnya.

## FR-008 — Baseline Comparison

Pengguna dapat membandingkan biaya routing dengan baseline yang ditentukan secara eksplisit.

Baseline awal dapat berupa:

- Model referensi pilihan pengguna.
- Model yang digunakan sebelum routing.
- Hasil pengujian replay yang terkontrol.

Dashboard harus membedakan:

- Biaya aktual melalui TheGate.
- Biaya baseline yang diobservasi.
- Estimasi biaya counterfactual.
- Penghematan terukur atau estimasi penghematan.

Rumus penghematan:

```text
savings_percent =
    ((baseline_cost - optimized_cost)
    / baseline_cost) * 100
```

Jika baseline cost nol atau tidak diketahui, persentase penghematan tidak boleh dihitung seolah-olah valid.

Perbandingan harus menjelaskan asumsi dan metode perhitungannya.

## FR-009 — Streaming

TheGate harus mendukung streaming response pada endpoint MVP.

Persyaratan:

- Meneruskan event stream sesuai format yang didukung.
- Menangani client disconnect.
- Menangani timeout.
- Mencatat status penyelesaian.
- Mengumpulkan usage jika tersedia.
- Tidak menganggap stream yang terputus sebagai request sukses penuh.
- Tidak melakukan retry otomatis setelah sebagian respons diterima kecuali mekanismenya memang aman dan didefinisikan secara eksplisit.

## FR-010 — Analytics Dashboard

Dashboard MVP menampilkan:

### Overview

- Total request.
- Total estimated cost.
- Provider-reported cost jika tersedia.
- Perbandingan baseline.
- Penghematan terukur atau estimasi.
- Distribusi model.
- Success dan error rate.
- Latency ringkas.

### Routing Analytics

- Distribusi strategi.
- Distribusi model terpilih.
- Alasan routing.
- Request yang menggunakan fallback.
- Request yang tidak dapat dirutekan.

### Cost Analytics

- Biaya berdasarkan model.
- Biaya berdasarkan rentang waktu.
- Penggunaan token.
- Model dengan biaya tertinggi.
- Estimasi biaya berdasarkan policy.

### Request Logs

- Request ID.
- Timestamp.
- Model terpilih.
- Policy.
- Status.
- Token usage.
- Biaya.
- Latency.

Filter awal:

- Rentang waktu.
- Model.
- Status request.
- Routing policy.

Konten prompt dan respons tidak ditampilkan karena tidak disimpan secara default.

## FR-011 — Configuration Management

Pengguna dapat mengatur:

- Default routing policy.
- Model yang diizinkan.
- Model yang dikecualikan.
- Batas biaya per request.
- Batasan kemampuan model.
- Perilaku fallback.
- Kebijakan penyimpanan log.
- Referensi tarif model.

Perubahan konfigurasi harus divalidasi.

Setiap keputusan routing harus dapat dihubungkan dengan versi kebijakan yang digunakan.

## FR-012 — Error Handling

TheGate harus membedakan setidaknya:

- Invalid request.
- Authentication failure.
- Rate limit exceeded.
- No eligible model.
- Backend unavailable.
- Backend timeout.
- Provider rate limit.
- Unsupported capability.
- Upstream error.
- Stream interruption.

Retry hanya boleh dilakukan ketika aman.

Request yang gagal tidak boleh secara otomatis memicu fallback tanpa batas.

---

# 7. ROUTING ALGORITHM

## 7.1 Initial Routing Pipeline

Urutan logis:

1. Validate request.
2. Resolve routing policy.
3. Extract routing features.
4. Retrieve eligible model candidates.
5. Apply hard constraints.
6. Estimate candidate costs.
7. Apply selected routing strategy.
8. Select model.
9. Record routing decision.
10. Forward request.
11. Collect response and usage metadata.
12. Calculate cost.
13. Persist analytics.
14. Return response.

Implementasi boleh melakukan beberapa operasi secara paralel jika aman.

## 7.2 Routing Principles

TheGate tidak boleh menggunakan kompleksitas prompt sebagai satu-satunya penentu model.

Sinyal yang dapat digunakan:

- Task type.
- Context length.
- Required output format.
- Tool requirements.
- Model capabilities.
- Historical evaluation results.
- Estimated input and output costs.
- User policy.
- Historical latency dan availability.

Tidak semua sinyal wajib tersedia pada MVP.

## 7.3 Fallback Rules

Fallback digunakan ketika request gagal atau jalur utama tidak tersedia.

Fallback bukan pengganti routing utama.

Persyaratan:

- Memiliki retry limit.
- Menghormati model exclusions.
- Memeriksa kemampuan model alternatif.
- Menghormati batasan biaya.
- Membedakan kegagalan sebelum dan sesudah response mulai dikirim.
- Tidak mengulang request secara membabi buta.
- Mencatat setiap percobaan.

## 7.4 Quality Evaluation

Kualitas tidak boleh dianggap dapat diketahui secara pasti hanya dari prompt.

Evaluasi awal harus memanfaatkan:

- Benchmark yang dapat direproduksi.
- Dataset tugas representatif.
- Validator deterministik jika tersedia.
- Human evaluation untuk tugas yang memerlukannya.
- LLM-as-a-judge hanya sebagai salah satu metode opsional yang harus divalidasi.

Sistem harus membedakan kualitas yang benar-benar dievaluasi dengan kemampuan model yang hanya diperkirakan.

---

# 8. NON-FUNCTIONAL REQUIREMENTS

## NFR-001 — Performance

Target awal:

- Routing decision latency p95 di bawah 100 ms pada environment benchmark yang didefinisikan.
- Routing overhead diukur terpisah dari provider latency.
- Dashboard tidak boleh berada pada jalur kritis pengembalian respons.
- Database writes tidak boleh menghambat streaming secara tidak terkendali.

Target harus diuji menggunakan beberapa tingkat concurrency dan karakteristik request.

Target ini merupakan sasaran rekayasa, bukan jaminan performa pada seluruh perangkat dan deployment.

## NFR-002 — Reliability

- Error tidak boleh menyebabkan proses backend berhenti secara tidak terduga.
- Request ID harus tersedia untuk penelusuran.
- Kegagalan database ditangani sesuai kebijakan persistence yang terdokumentasi.
- Timeout harus memiliki konfigurasi yang jelas.
- Retry harus dibatasi.
- Health check harus tersedia.

## NFR-003 — Security

- API key TheGate disimpan dalam bentuk hash jika dapat diverifikasi menggunakan pendekatan tersebut.
- Secret provider disimpan melalui konfigurasi server atau secret manager.
- Secret tidak boleh dikirim ke frontend.
- Semua input divalidasi.
- Request size dibatasi.
- Rate limiting tersedia.
- Error response tidak membocorkan secret atau detail internal.
- Dashboard membutuhkan autentikasi.
- CORS dikonfigurasi secara eksplisit.
- SQL query harus menggunakan parameterisasi atau ORM.
- Log tidak boleh mencatat Authorization header.
- Dependency harus diperiksa secara berkala.

## NFR-004 — Privacy

- Prompt dan respons tidak disimpan secara default.
- Metadata logging dapat dikonfigurasi.
- Retensi log harus terdokumentasi.
- Pengguna dapat menghapus data log sesuai kebijakan yang didukung.
- Informasi sensitif tidak boleh dimasukkan ke analytics secara tidak perlu.

## NFR-005 — Maintainability

- Routing strategy terpisah dari adapter.
- Business logic terpisah dari API handlers.
- Skema database menggunakan migration.
- Unit test dan integration test tersedia.
- Konfigurasi sensitif menggunakan environment variables.
- Error handling konsisten.
- Dokumentasi API diperbarui bersama implementasi.

## NFR-006 — Deployment

MVP harus dapat dijalankan menggunakan Docker Compose.

Komponen minimal:

- API backend.
- Dashboard frontend.
- PostgreSQL.

Konfigurasi tambahan untuk cache atau worker dapat diperkenalkan jika kebutuhan teknisnya terbukti.

Deployment harus memiliki health checks, volume persistence, dan petunjuk konfigurasi environment.

---

# 9. DATABASE DESIGN

Skema berikut merupakan rancangan awal yang dapat disempurnakan selama technical design.

## 9.1 api_keys

Menyimpan kredensial akses aplikasi ke TheGate.

Field:

- id: UUID.
- name: String.
- key_prefix: String.
- key_hash: String.
- status: Enum.
- created_at: DateTime.
- last_used_at: Nullable DateTime.
- revoked_at: Nullable DateTime.

Plaintext API key hanya ditampilkan ketika dibuat jika implementasi mendukungnya. Jangan menyimpannya dalam database.

## 9.2 routing_policies

Menyimpan kebijakan routing.

Field:

- id: UUID.
- name: String.
- mode: Enum.
- configuration: JSONB.
- version: Integer.
- is_active: Boolean.
- created_at: DateTime.
- updated_at: DateTime.

Perubahan konfigurasi menghasilkan versi baru atau mekanisme versioning yang setara.

## 9.3 models_registry

Menyimpan metadata model.

Field:

- id: UUID.
- internal_name: String.
- backend_model_id: String.
- provider_adapter: String.
- capabilities: JSONB.
- context_limit: Nullable Integer.
- enabled: Boolean.
- created_at: DateTime.
- updated_at: DateTime.

## 9.4 model_pricing

Menyimpan tarif model yang berversi.

Field:

- id: UUID.
- model_id: UUID.
- input_price_per_million: Nullable Decimal.
- output_price_per_million: Nullable Decimal.
- currency: String.
- effective_from: DateTime.
- effective_until: Nullable DateTime.
- source: Nullable String.
- validated_at: Nullable DateTime.

Struktur ini dapat diperluas untuk jenis token dan skema tarif tambahan.

## 9.5 requests

Menyimpan metadata request.

Field:

- id: UUID.
- api_key_id: Nullable UUID.
- routing_policy_id: Nullable UUID.
- routing_policy_version: Nullable Integer.
- timestamp: DateTime.
- status: Enum.
- selected_model_id: Nullable UUID.
- input_tokens: Nullable Integer.
- output_tokens: Nullable Integer.
- cost_amount: Nullable Decimal.
- cost_currency: Nullable String.
- cost_type: Enum.
- routing_latency_ms: Nullable Integer.
- provider_latency_ms: Nullable Integer.
- total_duration_ms: Nullable Integer.
- stream_enabled: Boolean.
- error_category: Nullable String.
- prompt_snippet: Tidak disimpan secara default.

Cost type membedakan estimasi internal, data yang dilaporkan provider, dan data yang belum diketahui.

## 9.6 routing_decisions

Menyimpan keputusan routing.

Field:

- id: UUID.
- request_id: UUID.
- strategy_name: String.
- strategy_version: String.
- selected_model_id: Nullable UUID.
- decision_reason: Nullable String.
- candidate_summary: Nullable JSONB.
- estimated_cost: Nullable Decimal.
- decision_latency_ms: Integer.
- created_at: DateTime.

Candidate summary harus dibatasi agar tidak menyimpan data sensitif yang tidak diperlukan.

## 9.7 request_attempts

Mencatat percobaan request dan fallback.

Field:

- id: UUID.
- request_id: UUID.
- attempt_number: Integer.
- model_id: UUID.
- status: Enum.
- error_category: Nullable String.
- started_at: DateTime.
- completed_at: Nullable DateTime.
- usage_metadata: Nullable JSONB.

Usage dan biaya setiap attempt harus ditangani secara konsisten untuk menghindari penghitungan ganda.

## 9.8 Design Constraints

- Gunakan UUID sebagai identifier utama.
- Gunakan Decimal untuk nilai finansial.
- Gunakan UTC untuk penyimpanan timestamp.
- Tambahkan index pada timestamp, status, dan model ID sesuai pola query.
- Jangan menyimpan prompt penuh secara default.
- Jangan menganggap metadata usage selalu tersedia.
- Tentukan retensi log.
- Gunakan migration yang dapat diuji.

---

# 10. API DESIGN

Endpoint berikut merupakan kontrak awal yang perlu difinalisasi pada tahap technical design.

## 10.1 Inference API

`POST /v1/chat/completions`

Digunakan aplikasi untuk mengirim request AI.

## 10.2 Health API

`GET /health`

Memeriksa status dasar aplikasi.

`GET /ready`

Memeriksa apakah komponen yang diperlukan telah siap menerima traffic.

## 10.3 Routing Configuration

`GET /api/v1/policies`

Mengambil daftar routing policy.

`POST /api/v1/policies`

Membuat routing policy.

`GET /api/v1/policies/{id}`

Mengambil detail policy.

`PATCH /api/v1/policies/{id}`

Memperbarui policy melalui validasi dan versioning.

## 10.4 Model Registry

`GET /api/v1/models`

Mengambil model yang terdaftar dan status ketersediaannya.

`GET /api/v1/models/{id}`

Mengambil detail model.

## 10.5 Analytics

`GET /api/v1/analytics/overview`

Mengambil metrik ringkasan.

`GET /api/v1/analytics/costs`

Mengambil data biaya berdasarkan filter.

`GET /api/v1/analytics/models`

Mengambil distribusi model.

`GET /api/v1/requests`

Mengambil request log dengan pagination dan filter.

`GET /api/v1/requests/{id}`

Mengambil detail metadata request.

Semua endpoint dashboard harus memiliki autentikasi dan otorisasi yang sesuai.

---

# 11. FRONTEND REQUIREMENTS

## 11.1 Product Experience

Dashboard TheGate harus terasa seperti developer tool yang profesional.

Prioritas desain:

- Informasi mudah dibaca.
- Navigasi jelas.
- Metrik biaya menonjol.
- Status dan error mudah dikenali.
- Tabel log mudah difilter.
- Konfigurasi routing mudah dipahami.
- Tidak menggunakan data demo sebagai data produksi tanpa label.

## 11.2 Main Navigation

Navigasi awal:

1. Overview.
2. Requests.
3. Routing Policies.
4. Models & Pricing.
5. Analytics.
6. Settings.

## 11.3 Overview Dashboard

Komponen:

- Total Requests.
- Estimated Cost.
- Provider-Reported Cost jika tersedia.
- Baseline Comparison.
- Routing Distribution.
- Latency Overview.
- Error Rate.
- Recent Requests.

Setiap metrik harus memiliki definisi dan rentang waktu yang jelas.

## 11.4 Requests Page

Fitur:

- Pagination.
- Search berdasarkan request ID.
- Filter model.
- Filter status.
- Filter tanggal.
- Detail routing decision.
- Informasi biaya dan usage.
- Error information yang aman.

## 11.5 Routing Policies Page

Fitur:

- Membuat policy.
- Mengedit policy.
- Memilih mode routing.
- Memilih model yang diizinkan.
- Mengatur batas biaya.
- Menyimpan versi policy.
- Melihat konfigurasi aktif.

## 11.6 Models & Pricing Page

Fitur:

- Daftar model.
- Status model.
- Capability metadata.
- Informasi tarif.
- Sumber dan waktu validasi tarif.
- Penanda tarif yang belum diketahui.

## 11.7 Dashboard States

Setiap halaman harus memiliki:

- Loading state.
- Empty state.
- Error state.
- Data state.
- Responsive layout.

Data demo harus dipisahkan dari data produksi.

---

# 12. TECHNOLOGY STACK

## 12.1 Backend

- Python.
- FastAPI.
- Pydantic.
- SQLAlchemy 2.x.
- Alembic.
- PostgreSQL.
- Async HTTP client yang sesuai.
- Pytest.
- Ruff atau tooling kualitas kode setara.

RouteLLM digunakan sebagai kandidat integrasi dan harus dievaluasi kompatibilitasnya sebelum dikunci sebagai dependency inti.

## 12.2 Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- Library visualisasi data yang sesuai kebutuhan.
- Validasi tipe dan kontrak API.

Frontend tidak boleh menyimpan secret provider.

## 12.3 Infrastructure

- Docker.
- Docker Compose.
- PostgreSQL.
- Environment-based configuration.
- Automated test workflow.
- Dependency scanning.

Redis, message broker, dan worker terpisah bukan dependency wajib MVP.

Tambahkan hanya jika pengujian menunjukkan kebutuhan yang jelas.

## 12.4 Architecture Principles

- Modular monolith untuk MVP.
- Separation of concerns.
- Provider adapter abstraction.
- Strategy pattern untuk routing.
- Explicit configuration.
- Versioned policies.
- Migration-based database management.
- API contract testing.

Microservices tidak diperlukan pada tahap awal.

---

# 13. SECURITY REQUIREMENTS

## 13.1 Authentication

Endpoint inference harus memerlukan API key TheGate.

Dashboard harus menggunakan mekanisme autentikasi yang sesuai untuk deployment yang didukung.

API key harus dapat dicabut.

## 13.2 Secret Management

- Provider credentials hanya tersedia pada backend.
- Jangan memasukkan secret ke source code.
- Jangan mengekspos secret melalui API response.
- Jangan mencatat header Authorization.
- Sediakan `.env.example` tanpa nilai rahasia.

## 13.3 Input Validation

- Batasi ukuran request.
- Validasi model dan parameter.
- Tolak konfigurasi yang tidak valid.
- Terapkan timeout.
- Hindari penerusan parameter yang tidak didukung secara diam-diam.

## 13.4 Abuse Prevention

- Rate limiting.
- Request size limit.
- Batas concurrency yang dapat dikonfigurasi.
- Retry limit.
- Timeout untuk upstream.
- Pengendalian request yang menghabiskan sumber daya berlebihan.

## 13.5 Logging Security

- Metadata-only logging sebagai default.
- Redaksi data sensitif jika content logging diaktifkan.
- Retensi log dapat dikonfigurasi.
- Akses dashboard dilindungi.
- Log error tidak boleh berisi secret.

---

# 14. OBSERVABILITY & METRICS

Metrik utama:

## 14.1 Routing Metrics

- Routing decision count.
- Routing decision latency.
- Model selection distribution.
- No-eligible-model rate.
- Fallback rate.

## 14.2 Cost Metrics

- Estimated total cost.
- Provider-reported cost jika tersedia.
- Cost per request.
- Cost per model.
- Cost per policy.
- Baseline cost.
- Measured atau estimated savings.

## 14.3 Performance Metrics

- Provider latency.
- Total request duration.
- Time to first token untuk streaming jika dapat diukur.
- Success rate.
- Error rate.
- Timeout rate.

## 14.4 Data Integrity

- Usage metadata availability.
- Pricing metadata availability.
- Cost calculation coverage.
- Requests dengan cost yang belum diketahui.

TheGate harus secara eksplisit menunjukkan keterbatasan data daripada menyajikan estimasi seolah-olah merupakan biaya aktual.

---

# 15. TESTING STRATEGY

## 15.1 Unit Tests

Menguji:

- Policy validation.
- Model eligibility.
- Routing strategy.
- Cost calculation.
- Pricing version selection.
- Error mapping.
- Retry limits.
- Fallback eligibility.

## 15.2 Integration Tests

Menguji:

- API gateway dengan provider adapter.
- Database persistence.
- Streaming behavior.
- Request cancellation.
- Backend timeout.
- Provider error.
- Usage metadata parsing.
- Analytics aggregation.

Gunakan mock backend untuk pengujian deterministik dan lingkungan integrasi yang sesuai untuk validasi kompatibilitas 9Router.

## 15.3 Security Tests

Menguji:

- Missing API key.
- Invalid API key.
- Revoked API key.
- Request size limit.
- Rate limiting.
- Secret leakage.
- SQL injection resistance.
- Unauthorized dashboard access.
- Invalid routing policy.

## 15.4 Performance Tests

Menguji:

- Routing decision latency.
- Concurrent requests.
- Streaming overhead.
- Database write overhead.
- Memory consumption.
- Request cancellation.
- Error recovery.

Pengujian harus mendokumentasikan hardware, concurrency, ukuran request, dan konfigurasi.

## 15.5 Cost Optimization Benchmark

Bandingkan setidaknya:

1. Fixed reference model.
2. Fixed economical model.
3. TheGate routing.

Gunakan kumpulan request yang sama jika memungkinkan.

Ukur:

- Total biaya.
- Biaya rata-rata.
- Latency.
- Error rate.
- Quality score jika evaluasi tersedia.

Hasil benchmark harus dapat direproduksi.

---

# 16. SUCCESS METRICS

Target berikut merupakan sasaran awal yang perlu divalidasi, bukan klaim performa yang sudah dicapai.

## 16.1 Functional Success

- Seluruh critical API tests lulus.
- Request non-streaming dapat diproses melalui backend yang dikonfigurasi.
- Streaming dapat diteruskan sesuai kontrak yang didukung.
- Routing decision tercatat.
- Error handling mengikuti spesifikasi.
- Cost accounting menangani data yang tidak lengkap dengan benar.

## 16.2 Performance Success

- Routing decision latency p95 di bawah 100 ms pada benchmark yang didefinisikan.
- Tidak ada retry tanpa batas.
- Streaming tidak harus menunggu seluruh respons selesai sebelum meneruskan data.
- Database dan dashboard tidak menimbulkan overhead yang tidak terkendali.

## 16.3 Optimization Success

- Penghematan dihitung terhadap baseline yang terdokumentasi.
- Model selection dapat dievaluasi.
- Kualitas diukur menggunakan benchmark yang sesuai.
- Tidak ada klaim kualitas setara tanpa bukti.
- Tarif dan usage yang tidak diketahui ditandai dengan benar.

## 16.4 Adoption Success

Target awal:

- Dokumentasi instalasi yang dapat diikuti.
- Pengguna dapat menjalankan deployment baru melalui Docker Compose.
- Pengguna dapat mengirim request pertama tanpa mengubah aplikasi secara besar-besaran.
- README menjelaskan batasan, integrasi, dan hasil benchmark.

Target GitHub Stars boleh ditentukan secara terpisah, tetapi bukan indikator utama validasi produk.

---

# 17. IMPLEMENTATION ROADMAP

## Phase 0 — Technical Discovery

Tujuan: memvalidasi fondasi teknis sebelum coding besar.

Tugas:

1. Memeriksa kontrak API 9Router.
2. Memastikan dukungan streaming.
3. Memetakan model ID dan error behavior.
4. Mengevaluasi integrasi RouteLLM.
5. Menetapkan subset OpenAI-compatible API.
6. Memvalidasi struktur harga dan usage.
7. Membuat technical design dan test plan.

Deliverable:

- Integration specification.
- Architecture decision records.
- Initial API contract.
- Dependency compatibility report.

## Phase 1 — Core Engine

Tugas:

1. FastAPI application.
2. Request validation.
3. API key authentication.
4. Provider adapter untuk 9Router.
5. Routing strategy interface.
6. Rule-based baseline strategy.
7. Routing decision logging.
8. Streaming dan non-streaming.
9. PostgreSQL schema dan migrations.
10. Docker Compose.

Deliverable:

TheGate dapat memproses request dan mengembalikan response melalui backend yang dikonfigurasi.

## Phase 2 — Cost Intelligence

Tugas:

1. Model registry.
2. Pricing catalog.
3. Usage parsing.
4. Cost accounting.
5. Request logs.
6. Analytics endpoints.
7. Baseline comparison.
8. Dashboard overview.

Deliverable:

Pengguna dapat memahami biaya dan hasil routing berdasarkan data yang tersedia.

## Phase 3 — Quality-Aware Routing

Tugas:

1. Integrasi strategi RouteLLM jika tervalidasi.
2. Benchmark dataset.
3. Model comparison.
4. Policy modes.
5. Quality evaluation.
6. Routing recommendation awal.

Deliverable:

TheGate dapat membandingkan strategi routing dan menunjukkan trade-off biaya, latency, serta kualitas.

## Phase 4 — Optimization Features

Tugas:

1. Budget warnings.
2. Exact-match caching.
3. Controlled experiments.
4. Cost anomaly detection.
5. Recommendation engine.
6. Adaptive policy suggestions.

Deliverable:

TheGate dapat mengidentifikasi peluang optimasi tambahan berdasarkan data penggunaan.

## Phase 5 — Expansion

Tugas berdasarkan validasi kebutuhan:

- Adapter backend tambahan.
- Multi-user management.
- Enterprise controls.
- Advanced observability.
- Hosted deployment.
- Semantic caching.
- Advanced budget enforcement.

---

# 18. ACCEPTANCE CRITERIA

MVP dianggap siap dirilis ketika seluruh kondisi berikut terpenuhi.

### API

- Request valid dapat diterima.
- Request invalid menghasilkan error yang konsisten.
- Streaming dan non-streaming berfungsi sesuai kontrak.
- API key wajib untuk endpoint inference.
- Request ID tersedia.

### Routing

- Policy dapat dimuat dan divalidasi.
- Kandidat yang tidak memenuhi hard constraints tidak dipilih.
- Strategi routing menghasilkan keputusan yang dapat dicatat.
- Model yang dipilih tersedia melalui adapter.
- Perilaku ketika tidak ada model yang memenuhi syarat terdokumentasi.

### Provider Integration

- Integrasi 9Router berhasil diuji.
- Timeout dan upstream errors ditangani.
- Streaming tidak di-buffer secara tidak sengaja.
- Secret tidak bocor ke client.
- Retry dibatasi dan mengikuti kebijakan.

### Cost Accounting

- Tarif yang digunakan dapat ditelusuri.
- Usage metadata diproses dengan benar.
- Data yang tidak tersedia ditandai.
- Biaya tidak dihitung menggunakan tarif yang tidak diketahui seolah-olah nol.
- Perbandingan baseline menjelaskan asumsi yang digunakan.

### Dashboard

- Data berasal dari backend.
- Filter dan pagination bekerja.
- Status loading, empty, dan error tersedia.
- Data simulasi tidak tercampur dengan data produksi.
- Konten prompt tidak disimpan secara default.

### Deployment

- Docker Compose dapat menjalankan komponen MVP.
- Database menggunakan persistent volume.
- Health check tersedia.
- Migration dapat dijalankan.
- Environment variables terdokumentasi.
- Test suite critical lulus.

### Documentation

- README menyediakan quick start.
- API usage didokumentasikan.
- Konfigurasi routing dijelaskan.
- Batasan kompatibilitas didokumentasikan.
- Metode penghitungan biaya dijelaskan.
- Benchmark tidak membuat klaim yang belum dibuktikan.

---

# 19. RISKS & MITIGATIONS

| Risiko                          | Dampak                           | Mitigasi                                                     |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| Integrasi 9Router berubah       | Adapter tidak kompatibel         | Isolasi adapter dan integration tests                        |
| RouteLLM tidak sesuai kebutuhan | Routing tidak efektif            | Pertahankan strategi baseline yang independen                |
| Kualitas menurun                | Respons tidak memenuhi kebutuhan | Benchmark dan quality guardrails                             |
| Tarif tidak akurat              | Estimasi biaya menyesatkan       | Versioned pricing catalog dan transparansi                   |
| Usage metadata tidak tersedia   | Cost accounting tidak lengkap    | Tandai sebagai unknown atau estimated                        |
| Routing overhead terlalu tinggi | Latency meningkat                | Classifier ringan, benchmark, optimasi                       |
| Scope MVP membesar              | Implementasi terlambat           | Fase dan acceptance criteria yang ketat                      |
| Prompt sensitif masuk log       | Risiko privasi                   | Metadata-only logging                                        |
| Fallback memicu biaya berulang  | Pengeluaran meningkat            | Retry limits dan attempt-level accounting                    |
| Produk sulit dibedakan          | Adopsi rendah                    | Fokus pada pengukuran manfaat dan quality-aware optimization |

---

# 20. LONG-TERM PRODUCT DIRECTION

TheGate akan berkembang melalui tiga kemampuan utama.

## Stage 1 — Route

Memilih model berdasarkan request, kebijakan, dan batasan pengguna.

## Stage 2 — Measure

Mengukur biaya, latency, penggunaan, serta hasil evaluasi.

## Stage 3 — Optimize

Mengidentifikasi peluang penghematan dan membantu pengguna menerapkan perubahan berdasarkan data.

Dalam jangka panjang, TheGate dapat berkembang menjadi platform optimasi AI yang mendukung banyak backend, kebijakan tingkat organisasi, evaluasi model, serta layanan terkelola.

Namun, perluasan produk harus mengikuti kebutuhan pengguna dan hasil validasi, bukan asumsi bahwa semua fitur tersebut wajib dibangun.

---

# FINAL PRODUCT DEFINITION

TheGate adalah platform open-source dan self-hosted untuk mengoptimalkan biaya penggunaan AI melalui intelligent routing, cost accounting, dan evaluasi kualitas yang transparan.

Produk dimulai dengan integrasi 9Router sebagai backend awal, menggunakan routing strategy yang dapat diganti, serta menyediakan dashboard untuk membantu developer memahami biaya dan performa.

TheGate tidak menjanjikan bahwa setiap request akan selalu diarahkan ke model termurah atau bahwa kualitas seluruh model setara.

Sebaliknya, TheGate menyediakan mekanisme untuk memilih model berdasarkan kebijakan, mengukur hasilnya, dan meningkatkan keputusan routing melalui data yang dapat dievaluasi.

**Product principle: Route intelligently. Measure accurately. Optimize continuously.**

---

# PART II: FRONTEND IMPLEMENTATION PRD — AI OPERATIONS CONTROL ROOM
**Version:** 1.0  
**Product Positioning:** The Control Plane for AI  
**Design Direction:** Obsidian Telemetry  
**Product Strategy:** Hybrid AI Operations Center → AI Workforce  

## 1. Executive Summary & Product Vision
TheGate is an open-source, self-hosted AI gateway and operations control plane designed to help engineering teams monitor, understand, control, and optimize AI workloads.
The frontend provides a unified operations interface for:
- AI request observability.
- Intelligent routing and routing policy management.
- Model and provider management.
- Workload-level usage analytics.
- AI expenditure and FinOps cost attribution.
- Provider health and operational diagnostics.
- Optimization recommendations.
- Advanced routing experiments (Canary, AST Breakpoint Diff, Replay Simulator, Rollback Incident).

## 2. Visual Design System — Obsidian Telemetry
- **Palette**: Background `#0B0D10`, Surface Low `#101318`, Surface Mid `#151920`, Surface High `#1B2028`, Border `#2A303A`, Brand Primary `#FFB71B`, Brand Hover `#EAA411`, Healthy `#36C98F`, Warning `#F5B942`, Fault `#F16D73`, Telemetry `#7AA7FF`.
- **Typography**: Inter / Geist Sans paired with JetBrains Mono / Geist Mono tabular numerals.
- **Micro-Interactions**: Radar pulse for live cluster connectivity, 1px crisp borders, restrained amber emphasis without excessive glow.

## 3. Screen Matrix
1. **Screen 01: Command Center** (`/`) — Operational KPI row, interactive routing topology (`Applications ➔ Ingress ➔ Policies ➔ Upstream Providers`), provider health matrix, and live activity waterfall.
2. **Screen 02: AI Workloads** (`/workloads`) — Multi-tenant workload registry, token burn rates, P95 TTFT metrics, error budgets, and AST cache breakpoint inspection.
3. **Screen 03: Live Activity** (`/requests`) — Sub-millisecond trace explorer, multi-parameter filters, execution waterfall, routing decision rationale, and zero prompt persistence compliance.
4. **Screen 04: Routing & Policies** (`/policies`) — Visual rule builder, objective-driven arbitrage (Economy, Balanced, Quality), fallback cascades, and synthetic simulation.
5. **Screen 05: Models & Providers** (`/providers`) — Provider connection manager, encrypted credential vault, latency heatmaps, and versioned pricing catalog.
6. **Screen 06: Cost Intelligence** (`/costs`) — Granular token tier consumption, counterfactual baseline savings (-84.1%), burn forecasts, and automated budget tripwires.
7. **Screen 07: Optimization Lab** (`/optimization`) — Advisory recommendations and 5 deep-dive verification sub-states:
   - Sub-State 7A: AST Breakpoint Diff Modal (`cache_control: {type: 'ephemeral'}`).
   - Sub-State 7B: 1,000-Trace Replay Simulator.
   - Sub-State 7C: 10% Canary Progressive Rollout Dialog.
   - Sub-State 7D: 25% Canary Soak & Promotion Cockpit.
   - Sub-State 7E: Automated Rollback Incident State.
8. **Interactive Testing: Playground** (`/playground`) — Real-time inference execution with Server-Sent Events (SSE) streaming and live latency/cost metrics.
