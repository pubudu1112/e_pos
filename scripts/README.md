# Database Scripts & Setup Guide (Pubudu POS)

මෙම folder එක තුළ අලුතින් එකතු කරන ලද Warranty, Service Sub-costs, Service Categories, සහ POS changes ඇතුළුව සම්පූර්ණ Database scripts අඩංගු වේ.

---

## 📁 ගොනු විස්තරය (File Overview)

1. **`01_full_database_schema.sql`**
   - **කවදාද run කරන්නේ:** අලුත්ම පරිගණකයක හෝ Database එක මුල සිටම හදන අවස්ථාවකදී (Fresh Database setup).
   - **විස්තරය:** `pubudu_pos` database එක create කර සියලුම Tables (`User`, `Role`, `Permission`, `Product`, `Service`, `Warranty`, `WarrantyClaim`, `Sale`, `Stock`, ආදී සියල්ල) සහ Foreign Keys එකවර සාදයි.

2. **`02_update_existing_database.sql`**
   - **කවදාද run කරන්නේ:** දැනටමත් Database එක run වෙන පරිගණකයක අලුත් features වලට update කර ගැනීමට (Update existing DB without data loss).
   - **විස්තරය:** 
     - `Product` table එකට `warrantyMonths` column එක එකතු කරයි.
     - `Service` table එකට `paperCost`, `tonerCost`, `machineCost` columns එකතු කරයි.
     - `Warranty` සහ `WarrantyClaim` tables සාදයි.
     - අලුත් Service Categories (`Photocopy`, `Color printing`, `Binding`, `Laminating`, `Scanning`, `Mobile accessories`, `Stationary`) සහ sample services / products upsert කරයි.
     - කිසිදු පැරණි දත්තයක් මකා නොදමයි (Safe incremental migration).

3. **`03_initial_seed_data.sql`**
   - **කවදාද run කරන්නේ:** `01_full_database_schema.sql` run කළ පසු මුලික දත්ත ඇතුළත් කිරීමට.
   - **විස්තරය:**
     - පෙරනිමි Super Admin පරිශීලකයා: 
       - **Username:** `admin`
       - **Password:** `pubuduPS@97`
     - Roles 4 (SUPER_ADMIN, ADMIN, CASHIER, INVENTORY_MANAGER).
     - System Permissions 62.
     - Categories, Unit of Measurements, Payment Methods.
     - සියලුම Photocopy, Printing, Binding, Laminating, Scanning සේවා ඒකක වියදම් (Paper, Toner, Machine wear) සහිතව.
     - Warranty සහිත Mobile accessories සාම්පල නිෂ්පාදන.

---

## 🚀 පියවරෙන් පියවර Setup කරන ආකාරය (How to Setup)

### ක්‍රමය 1: SQL Scripts මඟින් (phpMyAdmin / HeidiSQL / MySQL Workbench / CLI)

#### නව පරිගණකයක (Brand New Setup):
1. MySQL / MariaDB server එක Start කරන්න (e.g. XAMPP හෝ standalone MySQL).
2. phpMyAdmin හෝ MySQL Workbench විවෘත කරන්න.
3. මුලින්ම **`01_full_database_schema.sql`** run / import කරන්න.
4. ඉන්පසු **`03_initial_seed_data.sql`** run / import කරන්න.
5. Project root එකේ Terminal එකෙන්:
   ```bash
   npm install
   npx prisma generate
   npm run dev
   ```

#### දැනට දත්ත ඇති පරිගණකයක (Updating Existing DB):
1. **`02_update_existing_database.sql`** run / import කරන්න.
2. Terminal එකෙන්:
   ```bash
   npx prisma generate
   npm run dev
   ```

---

### ක්‍රමය 2: Prisma CLI මඟින්

1. `.env` ගොනුවේ `DATABASE_URL` එක නිවැරදිදැයි පරීක්ෂා කරන්න:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/pubudu_pos"
   ```
2. Terminal එකෙන් පහත විධාන run කරන්න:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```
3. Initial seed data සඳහා:
   - phpMyAdmin වෙතින් `03_initial_seed_data.sql` import කරන්න.

