import { prisma } from "../lib/prisma";

async function main() {
  console.log("Starting POS Categories and Sample Products Seeding in Sri Lankan Rupees (Rs.)...");

  // 1. Units
  const unitsData = [
    { name: "Pages", shortName: "Pages", description: "Document pages" },
    { name: "Copies", shortName: "Copies", description: "Photocopy or print copies" },
    { name: "Pieces", shortName: "Pcs", description: "Individual item or unit" },
    { name: "Books", shortName: "Books", description: "Bound books or notebooks" },
    { name: "Sheets", shortName: "Sheets", description: "Laminated or printed sheets" },
    { name: "Sets", shortName: "Sets", description: "Set of items or photos" },
    { name: "Packs", shortName: "Packs", description: "Paper or supply packs" },
    { name: "Boxes", shortName: "Boxes", description: "Item boxes" },
    { name: "Photos", shortName: "Photos", description: "Scanned or printed photos" },
    { name: "Jobs", shortName: "Jobs", description: "Service jobs" },
    { name: "Cards", shortName: "Cards", description: "ID or license cards" },
  ];

  const unitMap = new Map<string, number>();
  for (const u of unitsData) {
    const record = await prisma.unit.upsert({
      where: { shortName: u.shortName },
      update: { name: u.name, description: u.description, isActive: true },
      create: { name: u.name, shortName: u.shortName, description: u.description, isActive: true },
    });
    unitMap.set(u.shortName, record.id);
  }
  console.log(`✓ Units configured (${unitsData.length})`);

  // 2. Payment Methods
  const paymentMethodsData: Array<{ name: string; type: "CASH" | "CARD" | "BANK_TRANSFER" | "ONLINE" | "CREDIT" | "OTHER" }> = [
    { name: "Cash", type: "CASH" },
    { name: "Card", type: "CARD" },
    { name: "Bank Transfer", type: "BANK_TRANSFER" },
    { name: "Online QR", type: "ONLINE" },
    { name: "Credit", type: "CREDIT" },
  ];

  for (const pm of paymentMethodsData) {
    await prisma.paymentmethod.upsert({
      where: { name: pm.name },
      update: { type: pm.type, isActive: true, updatedAt: new Date() },
      create: { name: pm.name, type: pm.type, isActive: true, updatedAt: new Date() },
    });
  }
  console.log(`✓ Payment methods configured (${paymentMethodsData.length})`);

  // 3. Customers
  const customersData = [
    { code: "CUST-001", name: "Walk-in Customer", phone: "", email: "", address: "In Store" },
    { code: "CUST-002", name: "Kamal Perera", phone: "0771234567", email: "kamal@gmail.com", address: "Colombo 03" },
    { code: "CUST-003", name: "Nimal Silva", phone: "0719876543", email: "nimal.s@yahoo.com", address: "Kandy" },
    { code: "CUST-004", name: "Dilshan Jayawardena", phone: "0755554321", email: "dilshan.j@gmail.com", address: "Galle" },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, phone: c.phone || null, email: c.email || null, address: c.address, isActive: true, updatedAt: new Date() },
      create: { code: c.code, name: c.name, phone: c.phone || null, email: c.email || null, address: c.address, isActive: true, updatedAt: new Date() },
    });
  }
  console.log(`✓ Default customers configured (${customersData.length})`);

  // 4. Brands
  const brandsData = ["Atlas", "Double A", "Kangaro", "Remax", "Pubudu Hub", "Generic"];
  const brandMap = new Map<string, number>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { name: b },
      update: { isActive: true },
      create: { name: b, description: `${b} Brand Products`, isActive: true },
    });
    brandMap.set(b, brand.id);
  }
  console.log(`✓ Brands configured (${brandsData.length})`);

  // 5. The 7 Requested Categories
  const targetCategories = [
    { name: "Photocopy", description: "B&W and standard document photocopies" },
    { name: "Color printing", description: "High-quality color documents, photos, and posters" },
    { name: "Stationary", description: "Pens, books, papers, office & school stationery" },
    { name: "Mobile accessories", description: "Cables, chargers, earphones, covers & accessories" },
    { name: "Binding", description: "Spiral, hard cover, ring and tape binding services" },
    { name: "Laminating", description: "ID, A4, A3 document and certificate laminations" },
    { name: "Scanning", description: "Document scanning, photo scanning, and PDF conversion" },
  ];

  const categoryMap = new Map<string, number>();
  for (const cat of targetCategories) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, isActive: true, updatedAt: new Date() },
      create: { name: cat.name, description: cat.description, isActive: true, updatedAt: new Date() },
    });
    categoryMap.set(cat.name, record.id);
  }
  console.log(`✓ 7 Target Categories created/updated in DB`);

  // 6. Products for Each Category (Prices in Sri Lankan Rupees - Rs.)
  const productsData = [
    // Photocopy
    {
      code: "PC-001",
      barcode: "PC001",
      name: "A4 B&W Photocopy (Single Side)",
      description: "Standard A4 black & white photocopy single-sided",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 4.0,
      sellingPrice: 15.0,
      stock: 5000,
    },
    {
      code: "PC-002",
      barcode: "PC002",
      name: "A4 B&W Photocopy (Double Side)",
      description: "Standard A4 black & white photocopy double-sided",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 7.0,
      sellingPrice: 25.0,
      stock: 4000,
    },
    {
      code: "PC-003",
      barcode: "PC003",
      name: "A3 B&W Photocopy (Single Side)",
      description: "A3 large format black & white single-sided photocopy",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 12.0,
      sellingPrice: 35.0,
      stock: 1500,
    },
    {
      code: "PC-004",
      barcode: "PC004",
      name: "A3 B&W Photocopy (Double Side)",
      description: "A3 large format black & white double-sided photocopy",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 20.0,
      sellingPrice: 60.0,
      stock: 1000,
    },
    {
      code: "PC-005",
      barcode: "PC005",
      name: "Legal Size B&W Photocopy",
      description: "Legal / Folio size black & white photocopy",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 6.0,
      sellingPrice: 20.0,
      stock: 2000,
    },
    {
      code: "PC-006",
      barcode: "PC006",
      name: "NIC / License Copy (Both Sides)",
      description: "National ID Card or Driving License photocopy on single page",
      category: "Photocopy",
      unit: "Copies",
      brand: "Pubudu Hub",
      purchasePrice: 8.0,
      sellingPrice: 30.0,
      stock: 2500,
    },
    {
      code: "PC-007",
      barcode: "PC007",
      name: "Book Photocopy (Per Page B&W)",
      description: "Book photocopy with edge correction per page",
      category: "Photocopy",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 3.5,
      sellingPrice: 12.0,
      stock: 10000,
    },

    // Color printing
    {
      code: "CP-001",
      barcode: "CP001",
      name: "A4 Color Print (Text & Documents)",
      description: "A4 laser color print for text documents, letters, charts",
      category: "Color printing",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 15.0,
      sellingPrice: 50.0,
      stock: 3000,
    },
    {
      code: "CP-002",
      barcode: "CP002",
      name: "A4 Full Color Presentation Print",
      description: "A4 high coverage color graphics, slides, and flyers",
      category: "Color printing",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 25.0,
      sellingPrice: 90.0,
      stock: 2000,
    },
    {
      code: "CP-003",
      barcode: "CP003",
      name: "A4 Glossy Photo Print (High Res)",
      description: "Premium glossy 230gsm photo print with vivid colors",
      category: "Color printing",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 50.0,
      sellingPrice: 180.0,
      stock: 500,
    },
    {
      code: "CP-004",
      barcode: "CP004",
      name: "A3 Full Color Laser Print",
      description: "A3 large format color poster or architectural drawing",
      category: "Color printing",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 60.0,
      sellingPrice: 200.0,
      stock: 800,
    },
    {
      code: "CP-005",
      barcode: "CP005",
      name: "Passport Size Photo (Set of 4)",
      description: "Official visa / passport photo set with white or blue background",
      category: "Color printing",
      unit: "Sets",
      brand: "Pubudu Hub",
      purchasePrice: 80.0,
      sellingPrice: 350.0,
      stock: 300,
    },
    {
      code: "CP-006",
      barcode: "CP006",
      name: "Stamp Size Photo (Set of 8)",
      description: "Official stamp size photos printed on glossy paper",
      category: "Color printing",
      unit: "Sets",
      brand: "Pubudu Hub",
      purchasePrice: 70.0,
      sellingPrice: 300.0,
      stock: 300,
    },
    {
      code: "CP-007",
      barcode: "CP007",
      name: "Matte Art Board Color Print A4 (260gsm)",
      description: "Heavyweight matte board printing for certificates and cards",
      category: "Color printing",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 40.0,
      sellingPrice: 150.0,
      stock: 600,
    },

    // Stationary
    {
      code: "ST-001",
      barcode: "ST001",
      name: "Atlas Chooty Ballpoint Pen (Blue)",
      description: "Smooth 0.7mm fine blue ink ballpoint pen",
      category: "Stationary",
      unit: "Pcs",
      brand: "Atlas",
      purchasePrice: 25.0,
      sellingPrice: 35.0,
      stock: 250,
    },
    {
      code: "ST-002",
      barcode: "ST002",
      name: "Atlas Chooty Ballpoint Pen (Black)",
      description: "Smooth 0.7mm fine black ink ballpoint pen",
      category: "Stationary",
      unit: "Pcs",
      brand: "Atlas",
      purchasePrice: 25.0,
      sellingPrice: 35.0,
      stock: 200,
    },
    {
      code: "ST-003",
      barcode: "ST003",
      name: "Atlas CR Single Rule Book 80 Pages",
      description: "Hardcover single ruled exercise book 80 pgs",
      category: "Stationary",
      unit: "Books",
      brand: "Atlas",
      purchasePrice: 130.0,
      sellingPrice: 180.0,
      stock: 120,
    },
    {
      code: "ST-004",
      barcode: "ST004",
      name: "Atlas CR Single Rule Book 120 Pages",
      description: "Hardcover single ruled exercise book 120 pgs",
      category: "Stationary",
      unit: "Books",
      brand: "Atlas",
      purchasePrice: 190.0,
      sellingPrice: 260.0,
      stock: 90,
    },
    {
      code: "ST-005",
      barcode: "ST005",
      name: "Double A 70gsm A4 Copier Paper (500 Sheets)",
      description: "Premium high brightness multi-purpose copier paper ream",
      category: "Stationary",
      unit: "Packs",
      brand: "Double A",
      purchasePrice: 1550.0,
      sellingPrice: 1850.0,
      stock: 50,
    },
    {
      code: "ST-006",
      barcode: "ST006",
      name: "Nataraj 2B Pencils (Pack of 10)",
      description: "Dark drawing and writing pencils pack",
      category: "Stationary",
      unit: "Boxes",
      brand: "Generic",
      purchasePrice: 220.0,
      sellingPrice: 300.0,
      stock: 45,
    },
    {
      code: "ST-007",
      barcode: "ST007",
      name: "Maped Dust Free Eraser",
      description: "Clean erasing dust-free soft eraser",
      category: "Stationary",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 25.0,
      sellingPrice: 40.0,
      stock: 80,
    },
    {
      code: "ST-008",
      barcode: "ST008",
      name: "A4 Clear Document Sleeve Folder",
      description: "Transparent L-shaped plastic document protector",
      category: "Stationary",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 75.0,
      sellingPrice: 120.0,
      stock: 150,
    },
    {
      code: "ST-009",
      barcode: "ST009",
      name: "Whiteboard Marker (Blue)",
      description: "Dry-erase bullet tip whiteboard marker",
      category: "Stationary",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 110.0,
      sellingPrice: 160.0,
      stock: 60,
    },
    {
      code: "ST-010",
      barcode: "ST010",
      name: "UHU Glue Stick 21g",
      description: "Non-toxic quick sticking glue stick",
      category: "Stationary",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 190.0,
      sellingPrice: 280.0,
      stock: 40,
    },
    {
      code: "ST-011",
      barcode: "ST011",
      name: "Kangaro No. 10 Stapler",
      description: "Durable metal body desk stapler",
      category: "Stationary",
      unit: "Pcs",
      brand: "Kangaro",
      purchasePrice: 320.0,
      sellingPrice: 450.0,
      stock: 25,
    },
    {
      code: "ST-012",
      barcode: "ST012",
      name: "Kangaro No. 10 Staples Box (1000 Pins)",
      description: "High quality steel staples pack",
      category: "Stationary",
      unit: "Boxes",
      brand: "Kangaro",
      purchasePrice: 60.0,
      sellingPrice: 90.0,
      stock: 100,
    },

    // Mobile accessories
    {
      code: "MA-001",
      barcode: "MA001",
      name: "USB Type-C Fast Charging Cable (1.2m, 3A)",
      description: "Braided 3A fast charging data cable Type-C",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Remax",
      purchasePrice: 350.0,
      sellingPrice: 650.0,
      stock: 35,
    },
    {
      code: "MA-002",
      barcode: "MA002",
      name: "Lightning Cable for iPhone (1m Braided)",
      description: "Heavy duty iOS lightning sync and charging cable",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Remax",
      purchasePrice: 450.0,
      sellingPrice: 850.0,
      stock: 25,
    },
    {
      code: "MA-003",
      barcode: "MA003",
      name: "Micro USB Fast Charging Cable (1m)",
      description: "Durable high-speed micro-USB cable for Android phones",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 220.0,
      sellingPrice: 450.0,
      stock: 30,
    },
    {
      code: "MA-004",
      barcode: "MA004",
      name: "20W PD Dual Port Fast Wall Charger",
      description: "USB-C + USB-A 20W power delivery wall adapter",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Remax",
      purchasePrice: 1100.0,
      sellingPrice: 1750.0,
      stock: 20,
    },
    {
      code: "MA-005",
      barcode: "MA005",
      name: "3.5mm Stereo In-Ear Earphones with Mic",
      description: "Universal bass stereo wired headset with in-line microphone",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Remax",
      purchasePrice: 450.0,
      sellingPrice: 850.0,
      stock: 30,
    },
    {
      code: "MA-006",
      barcode: "MA006",
      name: "Type-C Digital Audio Earphones (Hi-Fi)",
      description: "Type-C connector digital DAC handsfree with mic",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 750.0,
      sellingPrice: 1250.0,
      stock: 18,
    },
    {
      code: "MA-007",
      barcode: "MA007",
      name: "9D Tempered Glass Screen Guard",
      description: "Curved full coverage edge-to-edge tempered glass",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 180.0,
      sellingPrice: 450.0,
      stock: 60,
    },
    {
      code: "MA-008",
      barcode: "MA008",
      name: "Universal Transparent Shockproof Back Cover",
      description: "Anti-yellowing crystal clear protective TPU phone case",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 250.0,
      sellingPrice: 550.0,
      stock: 40,
    },
    {
      code: "MA-009",
      barcode: "MA009",
      name: "Remax 10,000mAh Dual USB Power Bank",
      description: "Slim portable power bank with LED battery display",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Remax",
      purchasePrice: 2600.0,
      sellingPrice: 3850.0,
      stock: 12,
    },
    {
      code: "MA-010",
      barcode: "MA010",
      name: "OTG Adapter (Type-C to USB 3.0)",
      description: "Plug & play high speed USB flash drive adapter",
      category: "Mobile accessories",
      unit: "Pcs",
      brand: "Generic",
      purchasePrice: 160.0,
      sellingPrice: 350.0,
      stock: 50,
    },

    // Binding
    {
      code: "BD-001",
      barcode: "BD001",
      name: "Spiral Binding Small (Up to 50 Pages)",
      description: "Plastic spiral coil binding with clear cover & leather-look card back",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 50.0,
      sellingPrice: 150.0,
      stock: 400,
    },
    {
      code: "BD-002",
      barcode: "BD002",
      name: "Spiral Binding Medium (51 - 150 Pages)",
      description: "Medium spiral coil binding for assignments and notes",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 80.0,
      sellingPrice: 250.0,
      stock: 300,
    },
    {
      code: "BD-003",
      barcode: "BD003",
      name: "Spiral Binding Large (151 - 300 Pages)",
      description: "Large diameter spiral coil binding with sturdy backing",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 120.0,
      sellingPrice: 380.0,
      stock: 200,
    },
    {
      code: "BD-004",
      barcode: "BD004",
      name: "Comb / Ring Binding A4 with Clear Sheets",
      description: "21-ring plastic comb binding with clear plastic cover",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 70.0,
      sellingPrice: 200.0,
      stock: 250,
    },
    {
      code: "BD-005",
      barcode: "BD005",
      name: "Hard Cover Project Binding (Gold Foil)",
      description: "Deluxe hardcover thesis binding with gold foil lettering",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 650.0,
      sellingPrice: 1850.0,
      stock: 80,
    },
    {
      code: "BD-006",
      barcode: "BD006",
      name: "Soft Cover Tape Binding A4",
      description: "Spine cloth tape binding with front clear cover",
      category: "Binding",
      unit: "Books",
      brand: "Pubudu Hub",
      purchasePrice: 40.0,
      sellingPrice: 120.0,
      stock: 350,
    },
    {
      code: "BD-007",
      barcode: "BD007",
      name: "Plastic Report Cover & Slide Binder Bar",
      description: "Instant slide binder spine with clear A4 folder",
      category: "Binding",
      unit: "Sets",
      brand: "Generic",
      purchasePrice: 35.0,
      sellingPrice: 80.0,
      stock: 150,
    },

    // Laminating
    {
      code: "LM-001",
      barcode: "LM001",
      name: "NIC / License Laminating (Card Size)",
      description: "Heavy duty thermal pouch lamination for ID cards",
      category: "Laminating",
      unit: "Cards",
      brand: "Pubudu Hub",
      purchasePrice: 20.0,
      sellingPrice: 60.0,
      stock: 800,
    },
    {
      code: "LM-002",
      barcode: "LM002",
      name: "A4 Document Laminating (Glossy 100 Mic)",
      description: "Standard crystal clear 100-micron thermal pouch lamination",
      category: "Laminating",
      unit: "Sheets",
      brand: "Pubudu Hub",
      purchasePrice: 35.0,
      sellingPrice: 100.0,
      stock: 600,
    },
    {
      code: "LM-003",
      barcode: "LM003",
      name: "A4 Heavy Duty Matte Laminating (150 Mic)",
      description: "Non-reflective anti-glare heavy duty 150-micron lamination",
      category: "Laminating",
      unit: "Sheets",
      brand: "Pubudu Hub",
      purchasePrice: 55.0,
      sellingPrice: 150.0,
      stock: 400,
    },
    {
      code: "LM-004",
      barcode: "LM004",
      name: "A3 Certificate / Poster Laminating",
      description: "Large A3 thermal gloss lamination for diplomas & posters",
      category: "Laminating",
      unit: "Sheets",
      brand: "Pubudu Hub",
      purchasePrice: 80.0,
      sellingPrice: 220.0,
      stock: 300,
    },
    {
      code: "LM-005",
      barcode: "LM005",
      name: "Menu / Custom Bookmark Laminating",
      description: "Waterproof protective lamination for restaurant menus and cards",
      category: "Laminating",
      unit: "Sheets",
      brand: "Pubudu Hub",
      purchasePrice: 30.0,
      sellingPrice: 80.0,
      stock: 250,
    },

    // Scanning
    {
      code: "SC-001",
      barcode: "SC001",
      name: "A4 Document Scan to PDF (Per Page)",
      description: "Clean 300dpi scan to searchable PDF",
      category: "Scanning",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 5.0,
      sellingPrice: 30.0,
      stock: 5000,
    },
    {
      code: "SC-002",
      barcode: "SC002",
      name: "Bulk Document Scan (10+ Pgs, Per Page)",
      description: "Automatic document feeder fast scan to single PDF file",
      category: "Scanning",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 4.0,
      sellingPrice: 20.0,
      stock: 10000,
    },
    {
      code: "SC-003",
      barcode: "SC003",
      name: "A3 Document / Blueprint High-Res Scan",
      description: "Large format flatbed scan 600dpi to PDF / TIFF",
      category: "Scanning",
      unit: "Pages",
      brand: "Pubudu Hub",
      purchasePrice: 15.0,
      sellingPrice: 60.0,
      stock: 2000,
    },
    {
      code: "SC-004",
      barcode: "SC004",
      name: "Color Photo Scan 600dpi (Per Photo)",
      description: "High resolution photo restoration & scan to JPEG",
      category: "Scanning",
      unit: "Photos",
      brand: "Pubudu Hub",
      purchasePrice: 20.0,
      sellingPrice: 80.0,
      stock: 1500,
    },
    {
      code: "SC-005",
      barcode: "SC005",
      name: "Scan, PDF & Email / WhatsApp Service",
      description: "Instant document digitizing and direct forwarding service",
      category: "Scanning",
      unit: "Jobs",
      brand: "Pubudu Hub",
      purchasePrice: 10.0,
      sellingPrice: 50.0,
      stock: 3000,
    },
  ];

  let insertedCount = 0;
  for (const item of productsData) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) {
      console.warn(`Category not found: ${item.category}`);
      continue;
    }

    const unitId = unitMap.get(item.unit) ?? unitMap.get("Pcs")!;
    const brandId = item.brand ? brandMap.get(item.brand) : null;

    const prod = await prisma.product.upsert({
      where: { code: item.code },
      update: {
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        categoryId,
        unitId,
        brandId,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      create: {
        code: item.code,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        categoryId,
        unitId,
        brandId,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        status: "ACTIVE",
        minimumStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Manage stock
    await prisma.stock.upsert({
      where: { productId: prod.id },
      update: {
        quantity: item.stock,
        updatedAt: new Date(),
      },
      create: {
        productId: prod.id,
        quantity: item.stock,
        reservedQuantity: 0,
        updatedAt: new Date(),
      },
    });

    insertedCount++;
  }

  console.log(`✓ Seeded ${insertedCount} products with stock and unit prices across all 7 categories!`);
  console.log("All unit prices are set in Sri Lankan Rupees (Rs.).");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

