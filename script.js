const API_ALL_PRODUCTS = "https://api.escuelajs.co/api/v1/products";
const API_FEATURED_PRODUCT = "https://api.escuelajs.co/api/v1/products/4";

const productContainer = document.getElementById("product-container");
const loadingElement = document.getElementById("loading");
const cartCountElement = document.getElementById("cart-count");
const searchInput = document.getElementById("search-input");
const featuredSection = document.getElementById("featured-section");
const featuredContainer = document.getElementById("featured-container");
const productModal = document.getElementById("product-modal");
const modalContent = document.getElementById("modal-content");

// Elemen Baru untuk Keranjang & Kategori
const cartSidebar = document.getElementById("cart-sidebar");
const cartPanel = document.getElementById("cart-panel");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotalElement = document.getElementById("cart-total");

let allProducts = []; 
let filteredProductsList = []; // Untuk kebutuhan search & filter kombinasi
let cart = []; // Menyimpan item keranjang [{product, quantity}]
let currentCategory = 'all';

// Fungsi konversi harga ke Rupiah fiktif agar menarik ($1 = Rp 15.000)
function formatRupiah(priceInDollar) {
    const rupiah = priceInDollar * 15000;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rupiah);
}

function cleanImageUrl(url) {
    if (!url) return 'https://placehold.co/600x400?text=No+Image';
    if (url.startsWith('["') || url.startsWith('[')) {
        return url.replace(/[\[\]"]/g, '');
    }
    return url;
}

// 1. Ambil Data API Utama
async function loadStoreData() {
    try {
        const resAll = await fetch(API_ALL_PRODUCTS);
        if (!resAll.ok) throw new Error("Gagal memuat API Utama");
        const products = await resAll.json();

        // Ambil kategori pakaian (Clothes) DAN Sepatu (Shoes) agar variasi produk lebih seru!
        if (Array.isArray(products)) {
            allProducts = products.filter(product => 
                product.category && product.category.name && 
                (product.category.name.toLowerCase().includes("clot") || 
                 product.category.name.toLowerCase().includes("shoe"))
            );
        }

        filteredProductsList = allProducts;
        displayProducts(filteredProductsList);

        // Ambil data produk unggulan dengan aman
        try {
            const resFeatured = await fetch(API_FEATURED_PRODUCT);
            if (resFeatured.ok) {
                const featuredProduct = await resFeatured.json();
                displayFeaturedProduct(featuredProduct);
            } else if (allProducts.length > 0) {
                displayFeaturedProduct(allProducts[0]);
            }
        } catch (e) {
            if (allProducts.length > 0) displayFeaturedProduct(allProducts[0]);
        }

    } catch (error) {
        loadingElement.innerHTML = `<p class='text-red-500 font-bold py-12'>Gagal memuat data toko: ${error.message}</p>`;
    }
}

// 2. Tampilkan Produk Unggulan
function displayFeaturedProduct(product) {
    featuredSection.classList.remove("hidden");
    const imgUrl = cleanImageUrl(product.images[0]);

    featuredContainer.innerHTML = `
        <img class="w-full md:w-64 h-64 object-cover rounded-xl shadow-md bg-white" src="${imgUrl}" alt="${product.title}">
        <div class="flex-1">
            <h4 class="text-2xl font-bold mb-2">${product.title}</h4>
            <p class="text-indigo-100 text-sm mb-4 line-clamp-3">${product.description}</p>
            <div class="flex items-center gap-4">
                <span class="text-3xl font-extrabold text-yellow-300">${formatRupiah(product.price)}</span>
                <button onclick="openModal(${product.id})" class="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-5 py-2.5 rounded-lg shadow-md transition-all cursor-pointer">
                    Lihat Detail Baju
                </button>
            </div>
        </div>
    `;
}

// 3. Tampilkan Grid Semua Produk
function displayProducts(products) {
    loadingElement.classList.add("hidden");
    productContainer.classList.remove("hidden");
    productContainer.innerHTML = "";

    if (products.length === 0) {
        productContainer.innerHTML = "<p class='text-center col-span-full text-gray-500 py-12'>Produk tidak ditemukan 😢</p>";
        return;
    }

    products.forEach(product => {
        const imgUrl = cleanImageUrl(product.images[0]);
        const productCard = document.createElement("div");
        productCard.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer";
        productCard.onclick = (e) => {
            if(!e.target.closest('button')) openModal(product.id);
        };

        productCard.innerHTML = `
            <div>
                <img class="w-full h-56 object-cover" src="${imgUrl}" alt="${product.title}" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                <div class="p-4">
                    <span class="text-[10px] font-bold tracking-widest uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">${product.category.name}</span>
                    <h3 class="text-gray-900 font-bold mt-2 line-clamp-1">${product.title}</h3>
                    <p class="text-gray-500 text-xs mt-1 line-clamp-2">${product.description}</p>
                </div>
            </div>
            <div class="p-4 pt-0">
                <div class="flex items-center justify-between mt-4">
                    <span class="text-base font-black text-gray-900">${formatRupiah(product.price)}</span>
                    <button onclick="addToCartById(${product.id}, event)" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
                        + Keranjang
                    </button>
                </div>
            </div>
        `;
        productContainer.appendChild(productCard);
    });
}

// 4. Fitur Filter Kategori Tabs
function filterCategory(category) {
    currentCategory = category;
    
    // Perbarui Desain Tombol Aktif
    document.querySelectorAll("#filter-buttons button").forEach(btn => {
        btn.className = "bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium px-4 py-2 rounded-full transition-colors shrink-0";
    });
    document.getElementById(`btn-${category}`).className = "bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors shrink-0";

    applyFilterAndSearch();
}

// Fitur Pencarian Real-time
searchInput.addEventListener("input", applyFilterAndSearch);

// Gabungkan fungsi filter & pencarian supaya tidak bentrok
function applyFilterAndSearch() {
    const keyword = searchInput.value.toLowerCase();
    
    filteredProductsList = allProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(keyword) || product.description.toLowerCase().includes(keyword);
        
        if (currentCategory === 'all') return matchesSearch;
        if (currentCategory === 'clothes') return matchesSearch && product.category.name.toLowerCase().includes('clot');
        if (currentCategory === 'shoes') return matchesSearch && product.category.name.toLowerCase().includes('shoe');
    });

    displayProducts(filteredProductsList);
}

// 5. MANAJEMEN KERANJANG BELANJA (Riil)
function toggleCartSidebar() {
    const isOpened = !cartSidebar.classList.contains("opacity-0");
    if (isOpened) {
        cartPanel.classList.add("translate-x-full");
        cartSidebar.classList.add("opacity-0", "pointer-events-none");
    } else {
        cartSidebar.classList.remove("opacity-0", "pointer-events-none");
        cartPanel.classList.remove("translate-x-full");
    }
}

function addToCartById(id, event) {
    if (event) event.stopPropagation();
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ product: product, quantity: 1 });
    }

    updateCartUI();
}

function changeQuantity(id, amount) {
    const cartItem = cart.find(item => item.product.id === id);
    if (!cartItem) return;

    cartItem.quantity += amount;
    if (cartItem.quantity <= 0) {
        cart = cart.filter(item => item.product.id !== id);
    }
    updateCartUI();
}

function updateCartUI() {
    // Hitung total item & total harga
    let totalItems = 0;
    let totalPrice = 0;
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p class='text-center text-gray-400 py-12 text-sm'>Keranjang belanja Anda kosong 🛒</p>";
    } else {
        cart.forEach(item => {
            totalItems += item.quantity;
            totalPrice += item.product.price * item.quantity;

            const itemElement = document.createElement("div");
            itemElement.className = "flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-100";
            itemElement.innerHTML = `
                <img class="w-16 h-16 object-cover rounded" src="${cleanImageUrl(item.product.images[0])}">
                <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-bold text-gray-800 truncate">${item.product.title}</h5>
                    <p class="text-xs text-indigo-600 font-semibold mt-0.5">${formatRupiah(item.product.price)}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <button onclick="changeQuantity(${item.product.id}, -1)" class="bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded text-xs font-bold">-</button>
                        <span class="text-xs font-bold">${item.quantity}</span>
                        <button onclick="changeQuantity(${item.product.id}, 1)" class="bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded text-xs font-bold">+</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }

    cartCountElement.innerText = totalItems;
    cartTotalElement.innerText = formatRupiah(totalPrice);
}

// 6. Fungsi Modal Pop-up Detail
async function openModal(id) {
    productModal.classList.remove("hidden");
    modalContent.innerHTML = "<p class='text-center w-full py-12 animate-pulse text-gray-400'>Sedang memuat detail baju...</p>";

    try {
        const response = await fetch(`https://api.escuelajs.co/api/v1/products/${id}`);
        const product = await response.json();
        const imgUrl = cleanImageUrl(product.images[0]);

        modalContent.innerHTML = `
            <div class="w-full md:w-1/2">
                <img class="w-full h-72 md:h-96 object-cover rounded-xl" src="${imgUrl}" alt="${product.title}">
            </div>
            <div class="w-full md:w-1/2 flex flex-col justify-between">
                <div>
                    <span class="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">${product.category.name}</span>
                    <h2 class="text-2xl font-extrabold text-gray-900 mt-3 mb-4">${product.title}</h2>
                    <p class="text-gray-600 text-sm leading-relaxed">${product.description}</p>
                </div>
                <div class="mt-6 border-t pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-sm text-gray-500 font-medium">Harga Resmi:</span>
                        <span class="text-2xl font-black text-indigo-600">${formatRupiah(product.price)}</span>
                    </div>
                    <button onclick="addToCartById(${product.id}); closeModal(); toggleCartSidebar();" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transition-colors cursor-pointer text-center">
                        Masukkan Ke Keranjang 🛒
                    </button>
                </div>
            </div>
        `;
    } catch (e) {
        modalContent.innerHTML = "<p class='text-red-500 text-center w-full font-bold'>Gagal memuat detail baju.</p>";
    }
}

function closeModal() { productModal.classList.add("hidden"); }
window.onclick = function(e) { if (e.target == productModal) closeModal(); }

document.addEventListener("DOMContentLoaded", loadStoreData);
// AMBIL ELEMEN HTML UNTUK STRUKTUR PEMBAYARAN BARU
const sidebarTitle = document.getElementById("sidebar-title");
const cartView = document.getElementById("cart-view");
const checkoutView = document.getElementById("checkout-view");
const cartTotalRenderElements = document.querySelectorAll(".cart-total-render");

// Fungsi berpindah dari halaman Keranjang ke halaman Formulir Pembayaran
function goToCheckoutView() {
    if (cart.length === 0) {
        alert("Keranjang Anda masih kosong, silakan pilih baju terlebih dahulu!");
        return;
    }
    sidebarTitle.innerText = "Formulir Pembayaran 💳";
    cartView.classList.add("hidden");
    checkoutView.classList.remove("hidden");
}

// Fungsi kembali dari Formulir Pembayaran ke halaman Keranjang biasa
function goToCartView() {
    sidebarTitle.innerText = "Keranjang Belanja 🛒";
    checkoutView.classList.add("hidden");
    cartView.classList.remove("hidden");
}

// FUNGSI UTAMA: PROSES & KONFIRMASI PEMBAYARAN (MEMBUAT NOTA)
function processPayment(event) {
    event.preventDefault(); // Mencegah reload halaman saat submit form

    // Ambil data yang dimasukkan pembeli
    const name = document.getElementById("pay-name").value;
    const phone = document.getElementById("pay-phone").value;
    const address = document.getElementById("pay-address").value;
    const method = document.querySelector('input[name="payment-method"]:checked').value;

    // Hitung total harga riil dari variabel cart
    let totalPrice = 0;
    let listBajuHtml = "";
    cart.forEach(item => {
        totalPrice += item.product.price * item.quantity;
        listBajuHtml += `<li>• ${item.product.title} (${item.quantity}x)</li>`;
    });

    // Buat nomor invoice acak fiktif
    const invoiceNumber = "INV-" + Math.floor(100000 + Math.random() * 900000);

    // Ubah tampilan modal konten menjadi bentuk STRUK NOTA RESMI
    productModal.classList.remove("hidden");
    modalContent.innerHTML = `
        <div class="w-full text-gray-800 p-2">
            <div class="text-center border-b border-dashed pb-4 mb-4">
                <h2 class="text-2xl font-black text-indigo-600 tracking-wider">OLLSHOP STORE</h2>
                <p class="text-xs text-gray-400 mt-1">Nota Pembelian Resmi</p>
                <p class="text-xs font-mono text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded inline-block">${invoiceNumber}</p>
            </div>
            
            <div class="text-sm space-y-2 mb-6">
                <div class="flex justify-between"><span class="text-gray-400">Nama Pembeli:</span><span class="font-semibold text-gray-800">${name}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">No. WhatsApp:</span><span class="font-semibold text-gray-800">${phone}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Metode Bayar:</span><span class="font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">${method}</span></div>
                <div class="flex flex-col"><span class="text-gray-400">Alamat Tujuan:</span><p class="font-normal text-gray-700 text-xs mt-1 bg-gray-50 p-2 rounded border border-gray-100">${address}</p></div>
            </div>

            <div class="border-t border-b border-dashed py-3 my-4">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Daftar Produk:</span>
                <ul class="text-xs text-gray-700 space-y-1.5 font-medium pl-1">
                    ${listBajuHtml}
                </ul>
            </div>

            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-lg mt-4">
                <span class="text-sm font-bold text-indigo-900">Total Pembayaran:</span>
                <span class="text-xl font-black text-indigo-600">${formatRupiah(totalPrice)}</span>
            </div>

            <div class="mt-6 text-center">
                <p class="text-xs text-gray-400 mb-4">Silakan screenshot nota ini untuk disimpan atau dikirim ke admin toko.</p>
                <button onclick="closeModal(); resetTokoSetelahBeli();" class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 rounded-lg text-sm transition-all cursor-pointer">
                    Selesai & Tutup Halaman
                </button>
            </div>
        </div>
    `;
// Jalur WhatsApp: Otomatis menyusun teks pesanan untuk dikirim ke nomor WA Anda
const nomorWA = "628xxxxxxxxxx"; // GANTI dengan nomor WhatsApp Anda (awali dengan 62, bukan 0)
    
let teksPesanan = `Halo Admin Ollshop Store, saya ingin memesan:\n\n`;
cart.forEach(item => {
    teksPesanan += `- ${item.product.title} (${item.quantity}x)\n`;
});
teksPesanan += `\n*Total:* ${formatRupiah(totalPrice)}\n`;
teksPesanan += `*Metode Bayar:* ${method}\n\n`;
teksPesanan += `*Data Pengiriman:*\nNama: ${name}\nNo.HP: ${phone}\nAlamat: ${address}`;

// Encode teks agar aman di URL
const urlWA = `https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(teksPesanan)}`;

// Buka tab baru menuju WhatsApp
window.open(urlWA, '_blank');

// Tutup jendela sidebar pembayaran
toggleCartSidebar();
    // Tutup jendela sidebar pembayaran
    toggleCartSidebar();
}

// Fungsi membersihkan keranjang setelah belanja berhasil dilakukan
function resetTokoSetelahBeli() {
    cart = [];
    updateCartUI();
    goToCartView(); // Kembalikan setelan internal sidebar ke halaman awal keranjang
    document.getElementById("checkout-view").reset(); // Bersihkan isi teks input form
}

// PERBARUI FUNGSI updateCartUI YANG SUDAH ADA SEBELUMNYA
// (Cari fungsi updateCartUI lama Anda dan tambahkan kode di bawah ini pada baris paling akhir di dalam fungsinya)
const oldUpdateCartUI = updateCartUI;
updateCartUI = function() {
    oldUpdateCartUI();
    
    // Sinkronisasi render harga total ke dua tempat (halaman keranjang dan halaman bayar)
    let totalPrice = 0;
    cart.forEach(item => {
        totalPrice += item.product.price * item.quantity;
    });
    
    cartTotalRenderElements.forEach(elem => {
        elem.innerText = formatRupiah(totalPrice);
    });
}
// Jalur WhatsApp: Otomatis menyusun teks pesanan untuk dikirim ke nomor WA Anda
const nomorWA = "085789650048"; // GANTI dengan nomor WhatsApp Anda (awali dengan 62, bukan 0)
    
let teksPesanan = `Halo Admin Ollshop Store, saya ingin memesan:\n\n`;
cart.forEach(item => {
    teksPesanan += `- ${item.product.title} (${item.quantity}x)\n`;
});
teksPesanan += `\n*Total:* ${formatRupiah(totalPrice)}\n`;
teksPesanan += `*Metode Bayar:* ${method}\n\n`;
teksPesanan += `*Data Pengiriman:*\nNama: ${name}\nNo.HP: ${phone}\nAlamat: ${address}`;

// Encode teks agar aman di URL
const urlWA = `https://api.whatsapp.com/send?phone=${nomorWA}&text=${encodeURIComponent(teksPesanan)}`;

// Buka tab baru menuju WhatsApp
window.open(urlWA, '_blank');

// Tutup jendela sidebar pembayaran
toggleCartSidebar();