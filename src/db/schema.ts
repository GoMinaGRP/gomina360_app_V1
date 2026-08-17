import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// 1. Users & Role-Based Access Control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // 'OWNER', 'GENERAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'SUPERVISOR', 'WORKER'
  assignedBusinessId: integer("assigned_business_id"), // null = All businesses (Owner/Executive); required for WORKER & BRANCH_MANAGER
  phone: text("phone").notNull(),
  avatarUrl: text("avatar_url"),
  // Standardized Ghana location (Region → District/MMDA → Town)
  region: text("region"),
  district: text("district"),
  town: text("town"),
  isActive: boolean("is_active").default(true),
  isWorkerEnabled: boolean("is_worker_enabled").default(true), // BRANCH_MANAGER can enable/disable WORKER accounts
  createdByUserId: integer("created_by_user_id"), // which BRANCH_MANAGER created this WORKER
  canRecordSales: boolean("can_record_sales").default(true),
  canRecordExpenses: boolean("can_record_expenses").default(false), // requires BRANCH_MANAGER permission
  canManageStock: boolean("can_manage_stock").default(false),      // requires BRANCH_MANAGER permission
  canExportData: boolean("can_export_data").default(false),        // BRANCH_MANAGER & WORKER export permission toggle
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Businesses / Branches / Locations
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // e.g. POULTRY-01, BLOCK-01
  category: text("category").notNull(), // 'Poultry Farm', 'Block Factory', 'Aquaculture', 'Livestock', 'Restaurant & Food', 'Electronic Shop', 'Car Wash'
  branchLocation: text("branch_location").notNull(), // human-readable summary line
  // Standardized Ghana location (Region → District/MMDA → Town)
  region: text("region").notNull(), // one of the 16 official regions
  district: text("district"), // MMDA (dropdown or free text)
  town: text("town"), // town / community (free text)
  managerName: text("manager_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  status: text("status").default("ACTIVE"), // 'ACTIVE', 'EXPANDING', 'MAINTENANCE'
  initialCapitalGhs: doublePrecision("initial_capital_ghs").notNull(),
  monthlyTargetRevenueGhs: doublePrecision("monthly_target_revenue_ghs").notNull(),
  iconName: text("icon_name").default("Building2"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Overall Financial Performance & Performance Metrics per Business
export const businessMetrics = pgTable("business_metrics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  period: text("period").notNull(), // e.g. "2026-Q1", "2026-March"
  revenueGhs: doublePrecision("revenue_ghs").notNull(),
  expensesGhs: doublePrecision("expenses_ghs").notNull(),
  netProfitGhs: doublePrecision("net_profit_ghs").notNull(),
  roiPercent: doublePrecision("roi_percent").notNull(),
  cashFlowGhs: doublePrecision("cash_flow_ghs").notNull(),
  assetsValueGhs: doublePrecision("assets_value_ghs").notNull(),
  inventoryValueGhs: doublePrecision("inventory_value_ghs").notNull(),
  growthRatePercent: doublePrecision("growth_rate_percent").notNull(),
  riskScore: integer("risk_score").notNull(), // 1 to 100 (low is better)
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// 4. Customers & CRM across Businesses
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'WHOLESALE', 'RETAIL', 'CORPORATE', 'DISTRIBUTOR'
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  // Standardized Ghana location (Region → District/MMDA → Town)
  region: text("region"),
  district: text("district"),
  town: text("town"),
  totalSpentGhs: doublePrecision("total_spent_ghs").default(0),
  loyaltyPoints: integer("loyalty_points").default(0),
  businessId: integer("business_id"), // null if shared across multiple units
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Suppliers & Vendors
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g. 'Poultry Feed', 'Cement & Aggregates', 'Fish Fingerlings', 'Electronics Import'
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  paymentTerms: text("payment_terms").notNull(), // 'NET_14', 'NET_30', 'CASH_ON_DELIVERY', 'MOMO_INSTANT'
  // Standardized Ghana location (Region → District/MMDA → Town)
  region: text("region"),
  district: text("district"),
  town: text("town"),
  totalSuppliedGhs: doublePrecision("total_supplied_ghs").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Employees & Payroll (in GH₵)
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // e.g. "Farm Supervisor", "Cement Mixer Operator", "Head Chef", "Solar Specialist"
  businessId: integer("business_id").notNull(),
  branch: text("branch").notNull(),
  // Standardized Ghana location (Region → District/MMDA → Town)
  region: text("region"),
  district: text("district"),
  town: text("town"),
  salaryGhs: doublePrecision("salary_ghs").notNull(),
  phone: text("phone").notNull(),
  hireDate: text("hire_date").notNull(),
  status: text("status").default("ACTIVE"),
});

// 7. Enterprise Assets & Equipment
// Every asset MUST be linked to a Business and a Branch at registration.
// The pair (businessId, branchCode) is the enterprise reporting key that ties
// asset values into business + branch dashboards, reports and analytics.
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetCode: text("asset_code").notNull().unique().default(""), // unique enterprise asset code (required)
  name: text("name").notNull(),
  description: text("description"), // detailed notes/specs about the asset
  businessId: integer("business_id").notNull(), // parent business (required)
  branchCode: text("branch_code").notNull().default(""), // branch code within the business (required)
  branchName: text("branch_name"), // human-readable branch label captured at registration
  assetType: text("asset_type").notNull(), // 'MACHINERY', 'VEHICLE', 'GENERATOR', 'STRUCTURE', 'TECH'
  purchasePriceGhs: doublePrecision("purchase_price_ghs").notNull(),
  currentValueGhs: doublePrecision("current_value_ghs").notNull(),
  condition: text("condition").notNull(), // 'EXCELLENT', 'GOOD', 'NEEDS_MAINTENANCE', 'UNDER_REPAIR'
  location: text("location").notNull(), // on-site placement note (e.g. "Bay A")
  // Standardized Ghana location (Region → District/MMDA → Town) — auto-copied from the branch
  region: text("region"),
  district: text("district"),
  town: text("town"),
  nextMaintenanceDate: text("next_maintenance_date").notNull(),
  registeredByUserId: integer("registered_by_user_id"), // audit trail
  recorderName: text("recorder_name"), // name of the user who recorded the asset
  recordedAt: timestamp("recorded_at").defaultNow(), // automatic date/time stamp
  assetImages: jsonb("asset_images"), // array of uploaded image data URLs / URLs
  createdAt: timestamp("created_at").defaultNow(),
});

// 7b. Complete Asset & Equipment audit log + approval workflow
export const assetAuditLogs = pgTable("asset_audit_logs", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  assetCode: text("asset_code").notNull(),
  action: text("action").notNull(), // CREATE, EDIT, TRANSFER, DELETE, REQUEST_EDIT, REQUEST_TRANSFER, REQUEST_DELETE, APPROVE, REJECT
  status: text("status").notNull().default("COMPLETED"), // PENDING, APPROVED, REJECTED, COMPLETED
  requestedByUserId: integer("requested_by_user_id"),
  requestedByName: text("requested_by_name"),
  requestedByRole: text("requested_by_role"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByName: text("approved_by_name"),
  detailsJson: jsonb("details_json"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// 8. Inventory & Stock (Unified across units)
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  businessId: integer("business_id").notNull(),
  category: text("category").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unit: text("unit").notNull(), // 'Bags', 'Trays', 'Tons', 'Kg', 'Units', 'Vehicles'
  costPriceGhs: doublePrecision("cost_price_ghs").notNull(),
  sellingPriceGhs: doublePrecision("selling_price_ghs").notNull(),
  minStockThreshold: doublePrecision("min_stock_threshold").notNull(),
  status: text("status").default("IN_STOCK"), // 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'
});

// 8b. Inventory Downloads audit trail
export const inventoryDownloads = pgTable("inventory_downloads", {
  id: serial("id").primaryKey(),
  downloadId: text("download_id").notNull().unique(),
  downloaderUserId: integer("downloader_user_id").notNull(),
  downloaderName: text("downloader_name").notNull(),
  downloaderRole: text("downloader_role").notNull(),
  downloaderBusinessId: integer("downloader_business_id"),
  downloaderBranchCode: text("downloader_branch_code"),
  downloaderBranchName: text("downloader_branch_name"),
  format: text("format").notNull(),
  recordCount: integer("record_count").notNull(),
  qrCodeData: text("qr_code_data"),
  qrCodePayload: jsonb("qr_code_payload"),
  status: text("status").notNull().default("COMPLETED"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 8c. Universal dashboard/report exports and approval audit history
export const universalExports = pgTable("universal_exports", {
  id: serial("id").primaryKey(),
  exportId: text("export_id").notNull().unique(),
  moduleKey: text("module_key").notNull(),
  moduleLabel: text("module_label").notNull(),
  exportType: text("export_type").notNull(), // DASHBOARD or REPORT
  format: text("format").notNull(), // PDF, EXCEL, CSV
  status: text("status").notNull().default("COMPLETED"), // PENDING, APPROVED, REJECTED, COMPLETED
  requesterUserId: integer("requester_user_id").notNull(),
  requesterName: text("requester_name").notNull(),
  requesterRole: text("requester_role").notNull(),
  businessId: integer("business_id"),
  businessName: text("business_name"),
  branchCode: text("branch_code"),
  branchName: text("branch_name"),
  filtersJson: jsonb("filters_json"),
  recordCount: integer("record_count").default(0),
  qrCodeData: text("qr_code_data"),
  qrCodePayload: jsonb("qr_code_payload"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByName: text("approved_by_name"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
});

// 9. Financial Transactions (Sales, Purchases, Expenses, Payroll, MoMo)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  branchName: text("branch_name"),
  type: text("type").notNull(), // 'INCOME', 'EXPENSE', 'INVESTMENT', 'TRANSFER'
  category: text("category").notNull(), // e.g. 'Egg Wholesale', 'Cement Purchase', 'MoMo Sales', 'Payroll', 'Feed Expense'
  amountGhs: doublePrecision("amount_ghs").notNull(),
  paymentMethod: text("payment_method").notNull(), // 'MTN_MOMO', 'TELECEL_CASH', 'BANK_TRANSFER', 'CASH', 'POS_CARD'
  customerId: integer("customer_id"),
  supplierId: integer("supplier_id"),
  description: text("description").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(), // automatic date + time stamp
  status: text("status").default("COMPLETED"), // 'COMPLETED', 'PENDING_MOMO_VERIFICATION', 'OFFLINE_QUEUED'
  recordedBy: text("recorded_by").notNull(),
  recordedByRole: text("recorded_by_role"), // OWNER, GENERAL_MANAGER, BRANCH_MANAGER, WORKER
  recordedByUserId: integer("recorded_by_user_id"),
  receiptImage: text("receipt_image"), // base64 image or URL of receipt photo
  receiptImages: jsonb("receipt_images"), // array of receipt photo URLs/base64
});

// Custom expense categories
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  name: text("name").notNull().unique(), // e.g. "Generator Diesel", "Egg Tray Restock"
  icon: text("icon"), // emoji or icon name
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 9b. Sales Documents (Invoices, Quotations, Receipts)
export const salesDocuments = pgTable("sales_documents", {
  id: serial("id").primaryKey(),
  documentNumber: text("document_number").notNull().unique(), // e.g. INV-2026-4521, QT-2026-0089, RCP-2026-1102
  documentType: text("document_type").notNull(), // 'INVOICE', 'QUOTATION', 'RECEIPT'
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  branchName: text("branch_name"),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  lineItems: jsonb("line_items").notNull(), // [{description, quantity, unitPrice, total}]
  subtotalGhs: doublePrecision("subtotal_ghs").notNull(),
  taxRateGhs: doublePrecision("tax_rate_ghs").default(0),
  taxAmountGhs: doublePrecision("tax_amount_ghs").default(0),
  discountGhs: doublePrecision("discount_ghs").default(0),
  totalGhs: doublePrecision("total_ghs").notNull(),
  currency: text("currency").notNull().default("GHS"),
  status: text("status").notNull().default("DRAFT"), // 'DRAFT', 'SENT', 'PAID', 'PARTIAL', 'CANCELLED', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED'
  notes: text("notes"),
  terms: text("terms"),
  validUntil: text("valid_until"), // For quotations
  dueDate: text("due_date"), // For invoices
  paymentMethod: text("payment_method"), // Filled when paid
  linkedTransactionId: integer("linked_transaction_id"), // Link to transaction when invoice is paid
  linkedQuotationId: integer("linked_quotation_id"), // If invoice was converted from quotation
  createdByUserId: integer("created_by_user_id"),
  createdByName: text("created_by_name").notNull(),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- SPECIALIZED MODULE LOGS FOR EACH OF THE 7 BUSINESSES ---

// 10. Poultry Farm Log (Egg trays, feed kg, mortality, health)
export const poultryLogs = pgTable("poultry_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  batchNumber: text("batch_number").notNull(), // e.g. BATCH-2026-A
  birdType: text("bird_type").notNull(), // 'LAYERS', 'BROILERS'
  totalBirds: integer("total_birds").notNull(),
  dailyEggsTrays: integer("daily_eggs_trays").notNull(),
  feedConsumedKg: doublePrecision("feed_consumed_kg").notNull(),
  mortalityCount: integer("mortality_count").default(0),
  healthStatus: text("health_status").default("HEALTHY"), // 'HEALTHY', 'VET_CHECK_REQUIRED', 'VACCINATED'
  recordedDate: text("recorded_date").notNull(),
});

// ─── POULTRY FARM MANAGEMENT MODULE ───────────────────────────────────

// P1. Flock & Batch Management
export const poultryFlocks = pgTable("poultry_flocks", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  branchName: text("branch_name"),
  batchNumber: text("batch_number").notNull().unique(),
  flockName: text("flock_name"), // e.g. "Nsawam Isa Brown Flock 01"
  birdType: text("bird_type").notNull(), // LAYERS, BROILERS, COCKERELS, TURKEYS, GUINEA_FOWL
  breed: text("breed"), // e.g. "Isa Brown", "Cobb 500", "Lohmann"
  genetics: text("genetics"), // genetic line/strain, e.g. "SASSO T451", "Hy-Line W-36", "Ross 308 Pureline"
  supplier: text("supplier"), // chick/flock supplier, e.g. "Akate Farms Hatchery Ltd"
  houseName: text("house_name"), // Pen / House identifier
  initialCount: integer("initial_count").notNull(),
  currentCount: integer("current_count").notNull(),
  mortalityTotal: integer("mortality_total").default(0),
  arrivalDate: text("arrival_date").notNull(),
  ageWeeks: doublePrecision("age_weeks").default(0),
  sourceHatchery: text("source_hatchery"),
  costPerBirdGhs: doublePrecision("cost_per_bird_ghs").default(0),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, SOLD, CULLED, CLOSED
  notes: text("notes"),
  createdByName: text("created_by_name"),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// P2. Feed Management
export const poultryFeedLogs = pgTable("poultry_feed_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  flockId: integer("flock_id"),
  batchNumber: text("batch_number"),
  feedType: text("feed_type").notNull(), // STARTER, GROWER, FINISHER, LAYER_MASH, CONCENTRATE
  brandSupplier: text("brand_supplier"),
  quantityKg: doublePrecision("quantity_kg").notNull(),
  costPerKgGhs: doublePrecision("cost_per_kg_ghs").default(0),
  totalCostGhs: doublePrecision("total_cost_ghs").default(0),
  entryType: text("entry_type").notNull().default("CONSUMPTION"), // PURCHASE or CONSUMPTION
  recordedDate: text("recorded_date").notNull(),
  recordedByName: text("recorded_by_name"),
  recordedByRole: text("recorded_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// P3. Water Management
export const poultryWaterLogs = pgTable("poultry_water_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  flockId: integer("flock_id"),
  batchNumber: text("batch_number"),
  volumeLiters: doublePrecision("volume_liters").notNull(),
  sourceType: text("source_type"), // BOREHOLE, PIPED, TANKER, RAINWATER
  phLevel: doublePrecision("ph_level"),
  isTreated: boolean("is_treated").default(false),
  treatmentUsed: text("treatment_used"), // e.g. chlorine, vitamins
  recordedDate: text("recorded_date").notNull(),
  recordedByName: text("recorded_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// P4. Health & Vaccination
export const poultryHealthRecords = pgTable("poultry_health_records", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  flockId: integer("flock_id"),
  batchNumber: text("batch_number"),
  recordType: text("record_type").notNull(), // VACCINATION, TREATMENT, INSPECTION, MORTALITY, BIOSECURITY
  vaccineOrDrug: text("vaccine_or_drug"),
  diseaseOrCondition: text("disease_or_condition"),
  dosage: text("dosage"),
  administeredBy: text("administered_by"), // vet or staff name
  birdsAffected: integer("birds_affected").default(0),
  mortalityCount: integer("mortality_count").default(0),
  costGhs: doublePrecision("cost_ghs").default(0),
  nextDueDate: text("next_due_date"),
  outcome: text("outcome"), // RESOLVED, ONGOING, MONITORING
  notes: text("notes"),
  recordedDate: text("recorded_date").notNull(),
  recordedByName: text("recorded_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// P5. Egg / Broiler Production
export const poultryProduction = pgTable("poultry_production", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  flockId: integer("flock_id"),
  batchNumber: text("batch_number"),
  productionType: text("production_type").notNull(), // EGGS or BROILER_WEIGHT
  // Egg fields
  eggsCollected: integer("eggs_collected").default(0),
  traysProduced: doublePrecision("trays_produced").default(0),
  crackedEggs: integer("cracked_eggs").default(0),
  gradeA: integer("grade_a").default(0),
  gradeB: integer("grade_b").default(0),
  // Broiler fields
  birdsHarvested: integer("birds_harvested").default(0),
  totalWeightKg: doublePrecision("total_weight_kg").default(0),
  avgWeightKg: doublePrecision("avg_weight_kg").default(0),
  // Shared
  layPercentage: doublePrecision("lay_percentage").default(0),
  fcr: doublePrecision("fcr").default(0), // feed conversion ratio
  revenueGhs: doublePrecision("revenue_ghs").default(0), // auto-linked sales revenue
  recordedDate: text("recorded_date").notNull(),
  recordedByName: text("recorded_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// P6. Daily Activity Checklist
export const poultryChecklists = pgTable("poultry_checklists", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  checklistDate: text("checklist_date").notNull(),
  taskKey: text("task_key").notNull(), // e.g. FEED_MORNING, WATER_CHECK
  taskLabel: text("task_label").notNull(),
  category: text("category"), // FEEDING, WATER, HEALTH, CLEANING, SECURITY, PRODUCTION
  isCompleted: boolean("is_completed").default(false),
  completedByName: text("completed_by_name"),
  completedByRole: text("completed_by_role"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11. Block Factory Log (Blocks molded, bags cement used, breakage rate)
export const blockFactoryLogs = pgTable("block_factory_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  batchId: text("batch_id").notNull(),
  blockType: text("block_type").notNull(), // '6-INCH-SOLID', '6-INCH-HOLLOW', 'PAVING-BRICKS', '5-INCH-SOLID'
  bagsCementUsed: integer("bags_cement_used").notNull(),
  blocksMolded: integer("blocks_molded").notNull(),
  blocksBroken: integer("blocks_broken").default(0),
  qualityGrade: text("quality_grade").default("GRADE_A_STANDARD"),
  recordedDate: text("recorded_date").notNull(),
});

// 11b. Block Factory Orders
export const blockFactoryOrders = pgTable("block_factory_orders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  blockType: text("block_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceGhs: doublePrecision("unit_price_ghs").notNull(),
  totalGhs: doublePrecision("total_ghs").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  dueDate: text("due_date"),
  notes: text("notes"),
  createdByName: text("created_by_name"),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11c. Block Factory Deliveries
export const blockFactoryDeliveries = pgTable("block_factory_deliveries", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  deliveryNumber: text("delivery_number").notNull().unique(),
  orderNumber: text("order_number"),
  customerName: text("customer_name").notNull(),
  blockType: text("block_type"),
  quantity: integer("quantity").notNull(),
  vehicleNumber: text("vehicle_number"),
  driverName: text("driver_name"),
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED, IN_TRANSIT, DELIVERED, CANCELLED
  deliveryDate: text("delivery_date").notNull(),
  notes: text("notes"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11d. Block Factory Daily Activity Checklist
export const blockFactoryChecklists = pgTable("block_factory_checklists", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  checklistDate: text("checklist_date").notNull(),
  taskKey: text("task_key").notNull(), // e.g. MACHINE_STARTUP, MATERIAL_COUNT
  taskLabel: text("task_label").notNull(),
  category: text("category"), // PRODUCTION, MATERIALS, MACHINERY, QUALITY, CLEANING, SECURITY, DELIVERIES
  isCompleted: boolean("is_completed").default(false),
  completedByName: text("completed_by_name"),
  completedByRole: text("completed_by_role"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11e. Block Types Master List (production master data — user-extensible)
export const blockTypes = pgTable("block_types", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  typeKey: text("type_key").notNull(), // canonical key stored on production/orders/deliveries, e.g. "6-INCH-SOLID"
  name: text("name").notNull(), // display label, e.g. "6-Inch Solid Blocks"
  dimensions: text("dimensions"), // e.g. "6in x 9in x 18in"
  style: text("style").default("OTHER"), // SOLID, HOLLOW, PAVING, INTERLOCKING, OTHER
  defaultUnitPriceGhs: doublePrecision("default_unit_price_ghs"),
  sku: text("sku"), // linked finished-goods inventory SKU (auto-created for new types)
  isActive: boolean("is_active").default(true),
  createdByName: text("created_by_name"),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 12. Aquaculture Log (Tilapia/Catfish, water quality pH & dissolved O2, FCR)
export const aquacultureLogs = pgTable("aquaculture_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  pondId: text("pond_id").notNull(), // e.g. "POND-VOLTA-01", "CAGE-04"
  species: text("species").notNull(), // 'VOLTA_TILAPIA', 'AFRICAN_CATFISH'
  stockCount: integer("stock_count").notNull(),
  averageWeightGrams: doublePrecision("average_weight_grams").notNull(),
  phLevel: doublePrecision("ph_level").notNull(), // e.g. 7.2
  dissolvedOxygen: doublePrecision("dissolved_oxygen").notNull(), // mg/L e.g. 6.5
  fcr: doublePrecision("fcr").notNull(), // Feed conversion ratio e.g. 1.35
  recordedDate: text("recorded_date").notNull(),
});

// ─── AQUACULTURE (CONCEPTUAL FARM) MANAGEMENT ─────────────────────────

// A1. Ponds / Cages / Tanks
export const aquaculturePonds = pgTable("aquaculture_ponds", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  pondId: text("pond_id").notNull().unique(),
  name: text("name").notNull(), // e.g. "Cage 4 – Volta River"
  type: text("type").notNull(), // "POND","CAGE","TANK","BIOFLOC","EARTH_POND"
  capacityLiters: doublePrecision("capacity_liters").notNull(),
  currentBiomassKg: doublePrecision("current_biomass_kg").default(0),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, STOCKED, EMPTY, MAINTENANCE, PREPARE_NEXT_CYCLE
  phTargetMin: doublePrecision("ph_target_min").default(6.5),
  phTargetMax: doublePrecision("ph_target_max").default(8.5),
  doTargetMinMgL: doublePrecision("do_target_min_mg_l").default(5.0),
  doTargetMaxMgL: doublePrecision("do_target_max_mg_l").default(8.0),
  notes: text("notes"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A2. Stock / Batch Management
export const aquacultureBatches = pgTable("aquaculture_batches", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  batchNumber: text("batch_number").notNull().unique(),
  pondId: integer("pond_id"),
  species: text("species").notNull(), // VOLTA_TILAPIA, AFRICAN_CATFISH, RED_TILAPIA
  strainGenetics: text("strain_genetics"),
  hatchDate: text("hatch_date").notNull(),
  initialCount: integer("initial_count").notNull(),
  currentCount: integer("current_count").notNull(),
  mortalityTotal: integer("mortality_total").default(0),
  avgWeightGrams: doublePrecision("avg_weight_grams").default(0),
  targetHarvestDate: text("target_harvest_date"),
  status: text("status").notNull().default("GROWING"), // GROWING, HARVESTED, SOLD, CULLED
  notes: text("notes"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A3. Feed Management
export const aquacultureFeedLogs = pgTable("aquaculture_feed_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  batchId: integer("batch_id"),
  pondId: integer("pond_id"),
  feedType: text("feed_type").notNull(), // FLOATING, SINKING, STARTER, GROWER, FINISHER
  brandSupplier: text("brand_supplier"),
  quantityKg: doublePrecision("quantity_kg").notNull(),
  costPerKgGhs: doublePrecision("cost_per_kg_ghs").default(0),
  totalCostGhs: doublePrecision("total_cost_ghs").default(0),
  entryType: text("entry_type").notNull().default("CONSUMPTION"), // PURCHASE, CONSUMPTION
  recordedDate: text("recorded_date").notNull(),
  recordedByName: text("recorded_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A4. Water Quality Logs
export const aquacultureWaterQualityLogs = pgTable("aquaculture_water_quality_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  pondId: integer("pond_id"),
  sampleDate: text("sample_date").notNull(),
  waterLiters: doublePrecision("water_liters").default(0),
  phLevel: doublePrecision("ph_level").notNull(),
  dissolvedOxygenMgL: doublePrecision("dissolved_oxygen_mg_l").notNull(),
  temperatureC: doublePrecision("temperature_c"),
  ammoniaMgL: doublePrecision("ammonia_mg_l").default(0),
  turbidity: text("turbidity"), // CLEAR, MODERATE, HIGH
  nitrateMgL: doublePrecision("nitrate_mg_l").default(0),
  treatmentUsed: text("treatment_used"),
  publishedByName: text("published_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A5. Harvest Management
export const aquacultureHarvests = pgTable("aquaculture_harvests", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  batchId: integer("batch_id"),
  pondId: integer("pond_id").notNull(),
  species: text("species").notNull(),
  harvestedCount: integer("harvested_count").notNull(),
  totalWeightKg: doublePrecision("total_weight_kg").notNull(),
  avgWeightKg: doublePrecision("avg_weight_kg").default(0),
  revenueGhs: doublePrecision("revenue_ghs").default(0),
  saleDate: text("sale_date").notNull(),
  buyerName: text("buyer_name"),
  recordedByName: text("recorded_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// A6. Daily Tasks / Checklist for Aquaculture
export const aquacultureChecklists = pgTable("aquaculture_checklists", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  branchCode: text("branch_code"),
  checklistDate: text("checklist_date").notNull(),
  taskKey: text("task_key").notNull(), // e.g. AERATION_CHECK, DO_PH_TEST, FEED_MORNING, MORTALITY_CHECK, FILTER_CLEAN
  taskLabel: text("task_label").notNull(),
  category: text("category"), // WATER, FEEDING, HEALTH, CLEANING, SECURITY, PRODUCTION
  isCompleted: boolean("is_completed").default(false),
  completedByName: text("completed_by_name"),
  completedByRole: text("completed_by_role"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 13. Livestock Log (Cattle, Small Ruminants tags, vaccination, breeding)
export const livestockLogs = pgTable("livestock_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  tagNumber: text("tag_number").notNull(), // e.g. "GH-COW-104"
  animalType: text("animal_type").notNull(), // 'CATTLE', 'GOAT', 'SHEEP'
  breed: text("breed").notNull(), // 'SANGA', 'WEST_AFRICAN_DWARF', 'DJALLONKE'
  weightKg: doublePrecision("weight_kg").notNull(),
  vaccinationStatus: text("vaccination_status").notNull(), // 'UP_TO_DATE', 'DUE_THIS_MONTH', 'PENDING'
  pregnantStatus: boolean("pregnant_status").default(false),
  recordedDate: text("recorded_date").notNull(),
});

// 14. Restaurant & Food Log (Orders, popular dish, waste %, MoMo receipts)
export const restaurantLogs = pgTable("restaurant_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  shiftDate: text("shift_date").notNull(),
  totalOrders: integer("total_orders").notNull(),
  mostPopularDish: text("most_popular_dish").notNull(), // e.g. "Jollof Rice with Tilapia & Pepper Sauce"
  foodCostPercent: doublePrecision("food_cost_percent").notNull(), // e.g. 28.5%
  wastePercent: doublePrecision("waste_percent").notNull(), // e.g. 3.2%
  momoReceiptsGhs: doublePrecision("momo_receipts_ghs").notNull(),
  cashReceiptsGhs: doublePrecision("cash_receipts_ghs").notNull(),
});

// 15. Electronic Shop Log (Serial/IMEI warranty, products, retail stock)
export const electronicsLogs = pgTable("electronics_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  serialNumber: text("serial_number").notNull().unique(), // e.g. "SN-SOLAR-5KW-2026-991"
  productName: text("product_name").notNull(), // e.g. "5kVA Solar Hybrid Inverter"
  brand: text("brand").notNull(), // e.g. "Felicity", "Samsung", "LG"
  warrantyMonths: integer("warranty_months").notNull(), // e.g. 24
  inStock: boolean("in_stock").default(true),
  retailPriceGhs: doublePrecision("retail_price_ghs").notNull(),
  lastCheckedDate: text("last_checked_date").notNull(),
});

// 16. Car Wash Log (Vehicles washed, bay usage, water/chemical usage)
export const carWashLogs = pgTable("car_wash_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  shiftDate: text("shift_date").notNull(),
  vehiclesWashed: integer("vehicles_washed").notNull(),
  chemicalUsedLiters: doublePrecision("chemical_used_liters").notNull(),
  totalRevenueGhs: doublePrecision("total_revenue_ghs").notNull(),
  waterPressurePsi: integer("water_pressure_psi").default(3200),
  recordedDate: text("recorded_date").notNull(),
});

// 17. AI Strategic Insights & Risk Recommendations
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id"), // null = Enterprise-wide insight
  title: text("title").notNull(),
  category: text("category").notNull(), // 'OPPORTUNITY', 'RISK', 'EFFICIENCY', 'FORECAST', 'COMPLIANCE'
  impactLevel: text("impact_level").notNull(), // 'HIGH', 'MEDIUM', 'CRITICAL'
  recommendation: text("recommendation").notNull(),
  metricAffected: text("metric_affected").notNull(), // e.g. "Net Profit (+GH₵ 42,000)", "Breakage Rate (-4.5%)"
  projectedGainGhs: doublePrecision("projected_gain_ghs").default(0),
  status: text("status").default("NEW"), // 'NEW', 'ACTIONED', 'ARCHIVED'
  createdAt: timestamp("created_at").defaultNow(),
});

// 18. Scenario Planning & What-If Simulations
export const scenarioSimulations = pgTable("scenario_simulations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  targetBusinessId: integer("target_business_id"), // null = All businesses
  variableChanged: text("variable_changed").notNull(), // e.g. "Feed Price", "Cement Price", "Solar Demand", "New Kumasi Branch"
  percentChange: doublePrecision("percent_change").notNull(), // e.g. +15 or -10
  expectedRevenueImpactGhs: doublePrecision("expected_revenue_impact_ghs").notNull(),
  expectedProfitImpactGhs: doublePrecision("expected_profit_impact_ghs").notNull(),
  expectedRoiDelta: doublePrecision("expected_roi_delta").notNull(), // e.g. +3.4% or -1.8%
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 19. Future-Ready Integrations Hub (MoMo, Banking, POS, IoT, CCTV)
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'PAYMENTS', 'BANKING', 'ACCOUNTING', 'POS_HARDWARE', 'IOT_SENSORS', 'CCTV_SECURITY'
  provider: text("provider").notNull(), // e.g. "MTN MoMo API", "Ecobank Ghana API", "Xero Sync", "Hikvision CCTV Cloud"
  status: text("status").notNull(), // 'CONNECTED', 'READY_TO_CONNECT', 'OFFLINE_SYNCING'
  lastSync: text("last_sync").notNull(),
  configJson: jsonb("config_json"),
});

// 20. Asset Downloads Audit Trail
// Tracks every asset record download with unique ID, QR code, and downloader details
export const assetDownloads = pgTable("asset_downloads", {
  id: serial("id").primaryKey(),
  downloadId: text("download_id").notNull().unique(), // Unique download identifier (e.g., DL-2024-AST-001)
  downloaderUserId: integer("downloader_user_id").notNull(),
  downloaderName: text("downloader_name").notNull(),
  downloaderRole: text("downloader_role").notNull(),
  downloaderBusinessId: integer("downloader_business_id"),
  downloaderBranchCode: text("downloader_branch_code"),
  downloaderBranchName: text("downloader_branch_name"),
  format: text("format").notNull(), // 'EXCEL', 'PDF', 'CSV'
  recordCount: integer("record_count").notNull(),
  qrCodeData: text("qr_code_data").notNull(), // Base64 encoded QR code image
  qrCodePayload: jsonb("qr_code_payload"), // QR code content (download details)
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("COMPLETED"), // 'COMPLETED' or 'APPROVED'
});
