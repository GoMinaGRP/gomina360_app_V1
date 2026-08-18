/**
 * GoMina AI Guide — content engine.
 *
 * Every business section carries its own step-by-step guide, written in
 * simple language and specific to the business TYPE (a poultry farm reads
 * about flocks and egg trays; a block factory reads about cement bags and
 * molded blocks). Guides are resolved by (moduleKey, section) with safe
 * fallbacks so no section ever shows an empty assistant.
 */

export interface GuideTask {
  name: string;
  steps: string[];
  tip?: string;
}

export interface GuideFaq {
  q: string; // chip label shown in the assistant
  match: string[]; // keywords that route a free-text question here
  answer: string;
}

export interface SectionGuide {
  title: string;
  intro: string;
  tasks: GuideTask[];
  faqs: GuideFaq[];
}

const CHECKLIST_TASKS: GuideTask[] = [
  {
    name: "Create today's checklist",
    steps: [
      "Open the Daily Checklist section.",
      "If today has no list yet, click “Create Checklist” — the standard tasks for this business type are generated for you.",
      "The list is dated, so you start fresh every day.",
    ],
    tip: "The list only needs to be created once per day — everyone on the branch then sees the same tasks.",
  },
  {
    name: "Complete and track tasks",
    steps: [
      "Read each task and click its round button when it is done.",
      "Watch the completion bar at the top move towards 100%.",
      "Head Office sees your completion on the Command Center, so finishing on time keeps the branch green.",
    ],
  },
  {
    name: "Manage the task list",
    steps: [
      "Click “Manage Items” to see the standing task list for this branch.",
      "Switch off tasks that do not apply, so tomorrow's list stays clean and relevant.",
    ],
  },
];

const CHECKLIST_FAQS: GuideFaq[] = [
  {
    q: "How do I get today's tasks?",
    match: ["create", "today", "tasks", "generate", "start"],
    answer:
      "Open Daily Checklist and click “Create Checklist”. Today's full task list for this business type appears instantly — then just tick items off as you work.",
  },
  {
    q: "Who sees my progress?",
    match: ["who", "progress", "command", "report", "owner"],
    answer:
      "Your completion percentage shows on the Command Center compliance rows, so the Owner and General Manager can see the branch is running its daily routine.",
  },
];

const COMMON: Record<string, SectionGuide> = {
  DASHBOARD: {
    title: "Dashboard",
    intro:
      "This is the live front page of {biz}. Every card updates by itself as sales, stock and expenses are recorded — you never type totals by hand.",
    tasks: [
      {
        name: "Read the health of the business",
        steps: [
          "Look at the top cards first: money in, money out, stock value and alerts.",
          "Cards with a red or amber colour need attention today; green cards are healthy.",
          "Scroll down for charts and lists — they all come from the same live records.",
        ],
      },
      {
        name: "Act on an alert",
        steps: [
          "Open the Alerts area and read the message — it says exactly what is wrong (for example low stock).",
          "Follow the suggested fix, usually restocking or recording the missing entry.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need to update anything here?",
        match: ["update", "manual", "edit", "refresh"],
        answer:
          "No — the dashboard updates itself from sales, restocks, production and expenses. Just record activities in the other sections and this page follows instantly.",
      },
      {
        q: "Something looks wrong, what do I check?",
        match: ["wrong", "error", "check", "alert"],
        answer:
          "Open the Alerts card first. It lists items that are low, out of stock, or entries missing for today. Fixing the listed item clears the alert.",
      },
    ],
  },
  CHECKLIST: {
    title: "Daily Checklist",
    intro:
      "This is the branch's daily routine list. It proves every morning that {biz} opened properly, and Head Office tracks it automatically.",
    tasks: CHECKLIST_TASKS,
    faqs: CHECKLIST_FAQS,
  },
  DEFAULT: {
    title: "This section",
    intro: "Here is how to use this part of {biz}.",
    tasks: [
      {
        name: "Find the main actions",
        steps: [
          "Look for the coloured buttons at the top of the section — they start every task.",
          "Fill the form that opens and confirm with the coloured button at the bottom.",
          "The record saves instantly and every connected card or table updates by itself.",
        ],
      },
    ],
    faqs: [
      {
        q: "Where is the save button?",
        match: ["save", "submit", "button"],
        answer:
          "Forms save with the coloured button at the bottom of the form. The section refreshes itself right after — no extra save is needed.",
      },
    ],
  },
};

export const GUIDES: Record<string, Record<string, SectionGuide>> = {
  /* ════════════════════════ POULTRY FARM ════════════════════════ */
  POULTRY: {
    DASHBOARD: {
      title: "Poultry Dashboard",
      intro:
        "This is the live picture of {biz}: birds alive, eggs collected, lay rate, feed stock, profit and health alerts — all in one glance.",
      tasks: [
        {
          name: "Read the farm's vital signs",
          steps: [
            "The small cards at the very top show Live Birds, Eggs (latest), Lay % and Checklist % for today.",
            "The bigger cards below show Active Flocks, Mortality Rate, Feed Stock, Water, Health Cost and Net Profit.",
            "Any card moving in a bad direction is your early warning — check the alerts strip below the cards.",
          ],
        },
        {
          name: "Use Smart Alerts & Warnings",
          steps: [
            "Each alert card says what is NORMAL, WARNING or CRITICAL for {biz} — mortality, feed intake, water, egg production and more.",
            "Read the “Recommendation” line in any WARNING or CRITICAL card: it tells you the exact action to take.",
            "After you fix the issue (for example log feed or water), the alert clears by itself.",
          ],
        },
        {
          name: "Filter what you see",
          steps: [
            "Use “Date Range” in Dashboard Filters to look at today, this week or all time.",
            "Use “Product Type” to focus on layers (eggs) or broilers (meat) only.",
          ],
          tip: "Filters only change the view — your records are never touched.",
        },
      ],
      faqs: [
        {
          q: "Why are my numbers zero?",
          match: ["zero", "empty", "nothing", "0 birds", "no data"],
          answer:
            "A new farm starts at zero on purpose. Register your first flock (Flock & Batch → New Flock), then log today's eggs (Production → Log Production). The cards fill in immediately.",
        },
        {
          q: "What does the health score mean?",
          match: ["score", "90", "performance"],
          answer:
            "The Poultry Health & Performance Score (out of 100) grades today's routine: mortality, feeding, water and production entries. Finishing the Daily Checklist and keeping alerts green keeps the score high.",
        },
      ],
    },
    FLOCKS: {
      title: "Flock & Batch",
      intro:
        "Every group of birds at {biz} is a flock (batch). Register it once and the farm tracks its birds, mortality and age from that day on.",
      tasks: [
        {
          name: "Register a new flock",
          steps: [
            "Click the green “New Flock” button on this tab.",
            "Give it a Batch Number (or leave it blank to auto-generate one) and a Flock Name.",
            "Choose the Bird Type (LAYERS for eggs, BROILERS for meat), the Breed, and the Initial Count of birds.",
            "Add Age in weeks, Arrival Date and Cost per Bird if you know them.",
            "Press the submit button — the flock appears in the table and Live Birds on the dashboard updates at once.",
          ],
          tip: "One batch per house/pen keeps mortality and lay-rate tracking accurate.",
        },
        {
          name: "Read the flock table",
          steps: [
            "PLACED is how many birds arrived; LIVE is how many are alive now.",
            "MORTALITY shows deaths so far with its percentage — a rising number needs a health check (Health & Vaccination tab).",
            "STATUS ACTIVE means the flock is still producing; sold-out broiler batches close automatically.",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I remove dead birds?",
          match: ["dead", "death", "mortality", "die"],
          answer:
            "Go to Health & Vaccination → Add Record, choose Record Type “MORTALITY”, pick the batch and enter the count. Live Birds drops automatically.",
        },
        {
          q: "Layers or broilers — which do I pick?",
          match: ["layers", "broilers", "type", "which"],
          answer:
            "Choose LAYERS if the birds stay long-term to lay eggs, BROILERS if they are raised for meat and sold off. The dashboard filters and production forms follow this choice.",
        },
      ],
    },
    FEED: {
      title: "Feed Management",
      intro:
        "Track every kilogram of feed at {biz}: what you buy, what the birds eat, and what it costs — so feed never runs out silently.",
      tasks: [
        {
          name: "Log feed the birds ate",
          steps: [
            "Click “Log Feed”.",
            "Entry Type: choose “Consumption (used)”.",
            "Pick the Feed Type (STARTER, GROWER, LAYER MASH…) and the flock batch.",
            "Enter Quantity in kg and the date, then submit — feed stock drops and the Feed Stock card updates.",
          ],
        },
        {
          name: "Record a feed purchase",
          steps: [
            "Click “Log Feed” and choose Entry Type “Purchase (stock in)”.",
            "Enter the Feed Type, kg bought and Cost per kg.",
            "Submit — purchased kg add to the feed stock figure shown on the dashboard.",
          ],
          tip: "Logging purchases with their cost keeps your real feed cost per bird accurate.",
        },
      ],
      faqs: [
        {
          q: "What is a good feed quantity per day?",
          match: ["how much", "quantity", "normal", "per bird"],
          answer:
            "Layers eat roughly 110–120 g per bird per day (about 110 kg per 1,000 birds). The dashboard's Feed Intake alert compares your entries against this and warns when birds are under- or over-fed.",
        },
      ],
    },
    WATER: {
      title: "Water Management",
      intro:
        "Birds drink about twice what they eat — this tab logs daily water so shortages never go unnoticed at {biz}.",
      tasks: [
        {
          name: "Log today's water",
          steps: [
            "Click “Log Water”.",
            "Choose the batch, enter Volume in Liters and pick the Source (BOREHOLE, PIPED…).",
            "Enter the pH if you test it (safe band: 6.5–7.5).",
            "Tick “Water was treated” if you added chlorine or vitamins, and name the treatment.",
            "Submit — the Water card on the dashboard refreshes.",
          ],
        },
      ],
      faqs: [
        {
          q: "How much water is normal?",
          match: ["how much", "normal", "litre", "liters"],
          answer:
            "Roughly 200 ml per laying bird per day in Ghana's heat, more in the dry season. If your logged liters per bird fall far below that, the dashboard water alert turns amber.",
        },
      ],
    },
    HEALTH: {
      title: "Health & Vaccination",
      intro:
        "All vaccinations, treatments, inspections and mortality for {biz} live here — your biosecurity diary with due-date reminders.",
      tasks: [
        {
          name: "Add a vaccination record",
          steps: [
            "Click “Add Record”.",
            "Record Type: choose VACCINATION.",
            "Pick the flock batch, write the Vaccine name (e.g. Lasota) and the dosage.",
            "Enter the cost and, importantly, the Next Due Date so the farm reminds you.",
            "Submit — the record lands in the table with its outcome status.",
          ],
        },
        {
          name: "Log mortality",
          steps: [
            "Click “Add Record”, choose Record Type MORTALITY and the batch.",
            "Enter the number of dead birds and any suspected cause under Disease / Condition.",
            "Submit — Live Birds and the mortality rate update everywhere instantly.",
          ],
          tip: "More than ~0.5% deaths in a day is a red flag: the dashboard alert will turn critical until it normalises.",
        },
      ],
      faqs: [
        {
          q: "How do reminders work?",
          match: ["remind", "due", "next", "vaccination"],
          answer:
            "Every record with a Next Due Date counts towards your health alerts, so a vaccine that is due shows up as a warning before it is overdue.",
        },
      ],
    },
    PRODUCTION: {
      title: "Egg & Bird Production",
      intro:
        "Log eggs collected or birds harvested — every entry stocks the sellable product into Inventory automatically and updates the farm's lay rate.",
      tasks: [
        {
          name: "Log today's eggs",
          steps: [
            "Click “Log Production” (or “Record Sale” area) — the Production tab's form is called Log Production.",
            "Production Type: Eggs. Pick the flock batch.",
            "Enter Eggs Collected — trays calculate automatically (30 eggs = 1 tray).",
            "Fill Grade A / B / Cracked counts if you grade, and Lay %. ",
            "Submit — the good trays are added to your egg stock in the Inventory tab at once.",
          ],
          tip: "Enter cracked eggs honestly: they are excluded from sellable stock but keep your lay % true.",
        },
        {
          name: "Harvest broilers",
          steps: [
            "In “Log Production”, switch Production Type to Broiler Harvest.",
            "Enter Birds Harvested and their total/average weight.",
            "Submit — dressed birds become sellable stock in Inventory.",
          ],
        },
        {
          name: "Add a brand-new product type",
          steps: [
            "Open “Log Production” and pick “＋ Add New Product Type…” in the Production Type list.",
            "Name the product (e.g. Duck Egg Crates), choose its Unit (Trays, Birds, Kg, Crates…) and set cost / selling prices.",
            "Enter the Quantity Produced and submit.",
            "The product is saved to the Master Product List (shown right on this tab) and its stock appears in Inventory at once.",
            "From now on the type appears in the Production Type list, the Record Sale stock picker, and all reports — just like Eggs and Broilers.",
          ],
          tip: "Custom products use their own unit — after production tops the stock up, “Record Sale” sells them exactly like egg trays.",
        },
        {
          name: "Sell eggs or birds",
          steps: [
            "Click “Record Sale” on this tab.",
            "Pick the product from live stock (it shows quantity available and price).",
            "Enter the Quantity — the total price and the stock-left figure show before you commit.",
            "Add the customer name/phone and payment method (Cash, MTN MoMo…).",
            "Submit — stock drops, revenue rises, and a receipt is issued automatically.",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I add a new product type?",
          match: ["new product", "add product", "product type", "master", "custom"],
          answer:
            "Log Production → Production Type → “＋ Add New Product Type…”. Name it, set unit and prices, enter the quantity and submit — it is saved to the Master Product List and becomes sellable stock linked across Production, Inventory, Sales and Reports.",
        },
        {
          q: "Where do my eggs go after I log them?",
          match: ["where", "eggs go", "stock", "inventory"],
          answer:
            "Production → stock is automatic: every 30 good eggs become 1 sellable tray in the Inventory tab. Sales then deduct from that stock, so you can never sell eggs you do not have.",
        },
        {
          q: "Can I sell straight from the farm gate?",
          match: ["farm gate", "direct", "immediately"],
          answer:
            "Yes — the fastest way is “Record Sale” on the Production tab. It deducts the trays or birds from live stock and books the income in one step.",
        },
      ],
    },
    INVENTORY: {
      title: "Farm Inventory",
      intro:
        "Everything sellable or consumable at {biz}: egg trays, dressed birds and feed materials, with live quantities and values.",
      tasks: [
        {
          name: "Understand the stock table",
          steps: [
            "QTY is what is physically on hand right now — sales and production change it automatically.",
            "STATUS colours: green IN_STOCK, amber LOW_STOCK (below its threshold), red OUT_OF_STOCK.",
            "STOCK VALUE shows what this row is worth at selling price.",
          ],
        },
        {
          name: "Top up stock",
          steps: [
            "Egg and bird stock grows from the Production tab — log collections or harvests there.",
            "Feed and material quantities grow when you log purchases (Feed tab, Entry Type “Purchase”).",
          ],
        },
      ],
      faqs: [
        {
          q: "Why did a number change by itself?",
          match: ["changed", "itself", "automatic", "drop"],
          answer:
            "Stock only moves when you record something: a sale (-), an egg collection (+trays), a harvest (+birds) or a feed purchase (+kg). Nothing changes without a matching record you can open in Finance.",
        },
      ],
    },
    FINANCE: {
      title: "Farm Finance",
      intro:
        "The money story of {biz}: every sale, every expense, profit or loss — shared live with the enterprise Transactions module.",
      tasks: [
        {
          name: "Record a daily expense",
          steps: [
            "Click “Record Daily Expense”.",
            "Choose the Expense Category (feed, labour, medication…) — or click “+ Add New” to create one.",
            "Enter the Amount (GH₵), payment method and a short description.",
            "You can attach receipt photos as proof, then press “Record Expense”.",
            "The expense appears in the records table and in the enterprise finance view immediately.",
          ],
        },
        {
          name: "Read the finance view",
          steps: [
            "Income rows come from your sales; expense rows from what you logged — newest on top.",
            "Net profit = income minus expenses, shown on the dashboard card and the Finance summary.",
          ],
        },
      ],
      faqs: [
        {
          q: "Do expenses I enter reach Head Office?",
          match: ["head office", "shared", "enterprise", "report"],
          answer:
            "Yes — every expense recorded here is written to the shared Transactions & MoMo module with your branch tagged, so enterprise reports include it automatically.",
        },
      ],
    },
    CHECKLIST: {
      title: "Daily Farm Checklist",
      intro:
        "The poultry morning routine for {biz}: water and feed checks, egg collection, house hygiene, health observation and closing counts.",
      tasks: CHECKLIST_TASKS,
      faqs: CHECKLIST_FAQS,
    },
    AI_KNOWLEDGE: {
      title: "Poultry AI Knowledge",
      intro:
        "A built-in poultry expert for {biz}: ask anything about layers, broilers, feed, diseases or housing and get a practical answer from the knowledge library.",
      tasks: [
        {
          name: "Ask a question",
          steps: [
            "Type your question in plain words — for example “why are my hens eating but laying less?”.",
            "Or choose a category first (feed, health, housing…) to narrow the search.",
            "Read the answer card: it gives the likely causes and the fix in simple steps.",
          ],
        },
      ],
      faqs: [
        {
          q: "What can I ask?",
          match: ["what", "ask", "examples"],
          answer:
            "Anything practical: vaccination schedules for Ghana, feed formulas, heat-stress signs, egg-drop causes, broiler weights by week, biosecurity basics. The library answers in plain language.",
        },
      ],
    },
  },

  /* ════════════════════════ BLOCK FACTORY ════════════════════════ */
  BLOCK: {
    DASHBOARD: {
      title: "Block Factory Dashboard",
      intro:
        "The control room of {biz}: block production, moulded vs broken, raw materials (cement, sand, water), sales, orders and cashflow — live.",
      tasks: [
        {
          name: "Record a production batch",
          steps: [
            "Click the blue “Production” button at the top.",
            "Choose the Block Type (e.g. 6-INCH-SOLID) — or add a new type from the same list.",
            "Enter Bags of Cement Used and Blocks Molded (plus Blocks Broken, if any).",
            "The preview line shows exactly how many good blocks will enter stock — confirm to save.",
            "Stock rises instantly and the batch appears under Recent Production Batches.",
          ],
          tip: "Only good blocks (molded minus broken) enter stock — record breakage honestly to keep quality grades truthful.",
        },
        {
          name: "Sell blocks",
          steps: [
            "Click “Sale” and pick the product — finished block types come first in the list.",
            "Enter the quantity; the total and the stock-left preview show before you save.",
            "Choose the payment method (Cash, MTN MoMo…) and submit — stock and revenue update together.",
          ],
        },
        {
          name: "Track orders & deliveries",
          steps: [
            "“Order” books a customer's request (type, quantity, price, due date) without touching stock yet.",
            "“Delivery” records the truck-out against stock so quantities fall only when blocks actually leave the yard.",
          ],
        },
      ],
      faqs: [
        {
          q: "How does production fill my stock?",
          match: ["production", "stock", "blocks", "molded", "moulded"],
          answer:
            "Every block type is linked to exactly one stock item. When you record production, good blocks (molded − broken) are added to that item — the preview in the form shows the before/after quantities.",
        },
        {
          q: "Where do I add a new block type?",
          match: ["new type", "add type", "4 inch", "interlocking"],
          answer:
            "Open Production or Restock and choose “➕ Add New Block Type…” in the Block Type list. Name it (e.g. 4-Inch Solid), set dimensions and price — it joins the Block Production Master List and gets its own stock row.",
        },
      ],
    },
    INVENTORY: {
      title: "Factory Inventory",
      intro:
        "All stock at {biz}: finished blocks by type and raw materials (cement, sand, water), with live values and low-stock warnings.",
      tasks: [
        {
          name: "Receive stock (Restock)",
          steps: [
            "Click “Restock” (top) or the “Restock” button on a product's row.",
            "The “Stock To Receive” list is the Block Production Master List: pick a block type or any raw material.",
            "Enter the Quantity and Unit Cost — the total shows immediately.",
            "Confirm; the purchase is added to stock, and can be booked as an expense in the same step.",
          ],
          tip: "Restocking a block type treats it as blocks bought from outside; prefer the Production button for blocks you moulded yourself.",
        },
        {
          name: "Add a brand-new item",
          steps: [
            "Click “New Item”, fill the name, category, quantity, cost and selling price.",
            "Save — it joins the stock table and becomes sellable in the Sale form.",
          ],
        },
        {
          name: "Read stock health",
          steps: [
            "The four cards up top count stock items, total units, cost value and low/out-of-stock rows.",
            "“Low / Out of Stock” above zero means restock before the yard runs dry — those rows glow amber or red in the table.",
          ],
        },
      ],
      faqs: [
        {
          q: "Cement keeps running out — what do I do?",
          match: ["cement", "sand", "raw", "material", "run out"],
          answer:
            "Use Restock → Portland Cement 50kg Bag each time bags arrive, and set its low-stock threshold realistically. The amber LOW_STOCK status and the Command Center alert then warn you days before a stock-out.",
        },
      ],
    },
    FINANCE: {
      title: "Factory Finance",
      intro:
        "Sales income versus expenses for {biz} — every cedi in or out, linked to the enterprise ledger.",
      tasks: [
        {
          name: "Record a sale or payment",
          steps: [
            "Click “Record Sale / Payment”.",
            "Pick the product from live stock, enter quantity and price.",
            "Choose payment method and submit — stock, revenue and the receipt are handled together.",
          ],
        },
        {
          name: "Record an expense",
          steps: [
            "Click “Record Expense”.",
            "Type the Category (Fuel & Diesel, Cement Purchase, Payroll… — suggestions appear as you type).",
            "Enter Amount (GH₵), payment method and date, then save — it lands in the expense table and the shared ledger.",
          ],
        },
      ],
      faqs: [
        {
          q: "Does restocking count as an expense?",
          match: ["restock", "purchase", "expense"],
          answer:
            "Only if you let it: the Restock form can book the purchase as an expense in one click. Otherwise use “Purchase Stock” / “Record Expense” here so finance stays exact.",
        },
      ],
    },
    CHECKLIST: {
      title: "Daily Factory Checklist",
      intro:
        "The daily yard routine for {biz}: machine checks, material stock verification, curing-yard watering, safety and production targets.",
      tasks: CHECKLIST_TASKS,
      faqs: CHECKLIST_FAQS,
    },
  },

  /* ════════════════════════ ELECTRONICS SHOP ════════════════════════ */
  TECH: {
    DASHBOARD: {
      title: "Shop Dashboard",
      intro:
        "The trading picture of {biz}: today's sales, open orders, warranty exposure and stock value for phones, inverters and accessories.",
      tasks: [
        {
          name: "Sell a device",
          steps: [
            "Click “Record Sale”.",
            "Pick the product from live stock — quantity available and price are shown in the list.",
            "Enter the quantity, confirm the total, add the customer and payment method.",
            "Submit — stock drops and the sale posts to finance with a receipt.",
          ],
        },
        {
          name: "Read the cards",
          steps: [
            "Revenue and profit cards summarise the period; low-stock and warranty cards flag what needs attention.",
            "Click any tab above (Products, Orders, Warranty & Serials) to act on what you see.",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I sell something not in stock?",
          match: ["not in stock", "no stock", "unavailable"],
          answer:
            "You cannot sell what is not in stock — the sale picker only lists available items. Take a deposit instead with “Create Customer Order” on the Orders tab, then restock.",
        },
      ],
    },
    PRODUCTS: {
      title: "Products & Stock",
      intro:
        "The shop's catalogue and shelf: every phone, inverter and accessory at {biz} with quantities, prices and status.",
      tasks: [
        {
          name: "Add a new product",
          steps: [
            "Click “Add Inventory Product”.",
            "Fill the name (brand + model), category, quantity, cost and selling price.",
            "Save — the product becomes sellable in the Record Sale form immediately.",
          ],
        },
        {
          name: "Keep shelves honest",
          steps: [
            "Quantities fall automatically with each sale; nothing should be edited by hand.",
            "Amber LOW_STOCK rows mean reorder via the Orders tab before you stock out.",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I restock a phone model?",
          match: ["restock", "reorder", "more stock"],
          answer:
            "Go to Orders & Purchases and record a supplier purchase — when the items are received, quantities rise here automatically and the purchase posts to finance.",
        },
      ],
    },
    ORDERS: {
      title: "Orders & Purchases",
      intro:
        "Customer orders and supplier purchases for {biz}: deposits taken, deliveries fulfilled, stock received.",
      tasks: [
        {
          name: "Take a customer order",
          steps: [
            "Click “Create Customer Order”.",
            "Enter the customer, the product, quantity and agreed price, plus a due date.",
            "Save — it shows as Open until you deliver.",
            "When you fulfil/deliver the order, stock is deducted automatically and the sale is finalised.",
          ],
        },
        {
          name: "Receive supplier stock",
          steps: [
            "Record the purchase on this tab with the items and their total cost.",
            "Receiving it tops up your Products & Stock quantities and books the expense to finance in one flow.",
          ],
        },
      ],
      faqs: [
        {
          q: "When does stock actually move?",
          match: ["when", "stock move", "deliver", "fulfil"],
          answer:
            "Stock moves at fulfilment time: taking the order only reserves the customer promise; delivering it deducts the items and books revenue. Supplier purchases top stock up when received.",
        },
      ],
    },
    SERVICE: {
      title: "Warranty & Serials",
      intro:
        "The anti-counterfeit and after-sales register of {biz}: serial numbers sold, warranty periods and returns.",
      tasks: [
        {
          name: "Register a serial",
          steps: [
            "Use the serial registration form on this tab.",
            "Enter the Serial Number, product name, brand, warranty months and retail price.",
            "Save — the unit joins the registry with its coverage period.",
          ],
        },
        {
          name: "Handle a warranty claim or return",
          steps: [
            "Find the unit by its serial in the registry.",
            "Log the claim against it so the service history stays attached to that exact device.",
          ],
        },
      ],
      faqs: [
        {
          q: "Why register serials?",
          match: ["why", "serial", "counterfeit"],
          answer:
            "Serials prove a device is genuine and track its warranty window. When a customer returns, you instantly see what they bought, for how much, and whether coverage is still valid.",
        },
      ],
    },
    STAFF: {
      title: "Staff & Operations",
      intro: "Who works at {biz} and the shop's operating notes in one place.",
      tasks: [
        {
          name: "Review staffing",
          steps: [
            "The staff list shows everyone assigned to this branch with their role.",
            "Staff changes themselves are made centrally in Employees & Payroll (shared enterprise module).",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I add a worker?",
          match: ["add", "worker", "staff"],
          answer:
            "Workers are created under Employees & Payroll (enterprise module). Once assigned to this branch and given a login, they see the worker workspace for this shop.",
        },
      ],
    },
    CHECKLIST: {
      title: "Daily Shop Checklist",
      intro:
        "Opening and closing routine for {biz}: display stock counts, MoMo float, generator/inverter check, security and cleanliness.",
      tasks: CHECKLIST_TASKS,
      faqs: CHECKLIST_FAQS,
    },
  },

  /* ════════════════════════ RESTAURANT & KITCHEN ════════════════════════ */
  FOOD: {
    DASHBOARD: {
      title: "Kitchen Dashboard",
      intro:
        "Today's service at {biz}: sales, top dishes, kitchen order rail, food-cost % and waste — the restaurant at a glance.",
      tasks: [
        {
          name: "Run the day from here",
          steps: [
            "Glance at revenue, orders and top dishes to plan prep quantities.",
            "Watch the Kitchen Order Status rail: move tickets along as orders cook and serve.",
            "At close, the Log Daily Shift entry (Staff tab) seals the day.",
          ],
        },
      ],
      faqs: [
        {
          q: "What is food cost %?",
          match: ["food cost", "percent", "cost %"],
          answer:
            "Food cost % = ingredient cost ÷ sales. Logged purchases and waste feed it; keeping it near ~30% means the kitchen is pricing and portioning well.",
        },
      ],
    },
    MENU: {
      title: "Menu Performance",
      intro:
        "Every dish sold at {biz}: price, popularity and performance — your guide on what to cook more of.",
      tasks: [
        {
          name: "Add a dish",
          steps: [
            "Click “Add Menu Dish”.",
            "Enter the dish name, category and price, then save.",
            "The dish appears in the sale/order picker instantly.",
          ],
        },
        {
          name: "Use performance data",
          steps: [
            "Sort by orders to see stars and slow movers.",
            "Push stars with staff, re-price or retire dishes that never sell.",
          ],
        },
      ],
      faqs: [
        {
          q: "Is the menu the same as stock?",
          match: ["stock", "inventory", "same"],
          answer:
            "No — the Menu is what you sell; Stock, Cost & Waste is what you cook with. Selling plates deducts the plate/product stock rows; ingredient top-ups happen through Purchases.",
        },
      ],
    },
    STOCK: {
      title: "Stock, Cost & Waste",
      intro:
        "Ingredients and sellable plates at {biz}: quantities, unit costs and the waste diary that protects your margins.",
      tasks: [
        {
          name: "Log food waste",
          steps: [
            "Click “Log Food Waste”.",
            "Choose the item, enter the quantity wasted and the reason (spoiled, over-production…).",
            "Save — the quantity is written off stock and the cedi value is tracked against food cost.",
          ],
        },
        {
          name: "Top up ingredients",
          steps: [
            "Ingredients arrive through the Purchases tab — receiving a purchase adds quantities here automatically.",
          ],
        },
      ],
      faqs: [
        {
          q: "Why log waste instead of just selling?",
          match: ["waste", "spoil", "why"],
          answer:
            "Waste is where restaurant profit leaks. Logging it keeps stock honest AND shows you the weekly cedi value of spoilage, so menus and prep quantities can be fixed.",
        },
      ],
    },
    ORDERS: {
      title: "Sales & Orders",
      intro:
        "The live ticket rail of {biz}: dine-in, takeaway and delivery orders from booking to serving, plus counter sales.",
      tasks: [
        {
          name: "Take an order / make a sale",
          steps: [
            "Start a new order or sale on this tab (dish/product, quantity, customer if known).",
            "The ticket joins the Kitchen Order Status rail as ORDERED.",
            "Advance it as it cooks and serves; completing it deducts stock and books the payment (Cash / MTN MoMo).",
          ],
        },
      ],
      faqs: [
        {
          q: "The rail is full of old tickets — what now?",
          match: ["old", "ticket", "rail", "clear"],
          answer:
            "Tickets waiting mean orders never closed. Open each and advance or complete it so stock and sales stay truthful.",
        },
      ],
    },
    PURCHASES: {
      title: "Purchases & Suppliers",
      intro:
        "Every ingredient purchase for {biz}: what was bought, from whom, at what cost — stock and expense booked in one step.",
      tasks: [
        {
          name: "Book a supplier purchase",
          steps: [
            "Start a new purchase on this tab.",
            "Enter the item bought, quantity and total cost (e.g. 25kg Jasmine rice — GH₵380).",
            "Save & receive — ingredient stock rises and the expense posts to finance linked to this purchase.",
          ],
        },
      ],
      faqs: [
        {
          q: "Does a purchase change my stock?",
          match: ["stock", "change", "receive"],
          answer:
            "Yes — receiving a purchase tops up the matching ingredient in Stock, Cost & Waste and books its cost as an expense at the same time, keeping kitchen and ledger in sync.",
        },
      ],
    },
    STAFF: {
      title: "Staff & Daily Shift",
      intro:
        "The shift diary of {biz}: orders served, best dish, food cost, waste and MoMo-vs-cash split — plus the daily checklist.",
      tasks: [
        {
          name: "Log the daily shift",
          steps: [
            "Click “Log Daily Shift”.",
            "Enter Total Orders served and the Most Popular Dish.",
            "Add Food Cost % and Waste % for the day.",
            "Enter MoMo receipts and Cash receipts (GH₵), then save — the shift joins the restaurant logbook and finance updates.",
          ],
        },
        {
          name: "Use the checklist",
          steps: CHECKLIST_TASKS[0].steps,
        },
      ],
      faqs: [
        {
          q: "Who fills the shift log?",
          match: ["who", "shift", "when"],
          answer:
            "The shift leader at closing time — it takes under a minute and gives the Owner a daily restaurants report without phone calls.",
        },
      ],
    },
  },

  /* ════════════════════════ AQUACULTURE ════════════════════════ */
  AQUA: {
    DASHBOARD: {
      title: "Fish Farm Dashboard",
      intro:
        "The farm overview of {biz}: ponds, fish batches, feed and FCR, water quality and harvest readiness in one screen.",
      tasks: [
        {
          name: "Start the farm in three moves",
          steps: [
            "Create your pond/cage/tank (Ponds tab → Add New Pond).",
            "Stock a batch (Fish Stock & Batches) with species, quantity and average weight.",
            "Feed daily (Feed tab → Log Feed) — the dashboard fills with growth and FCR from then on.",
          ],
        },
      ],
      faqs: [
        {
          q: "What is FCR?",
          match: ["fcr", "conversion"],
          answer:
            "Feed Conversion Ratio = kg of feed ÷ kg of fish growth. Around 1.3–1.6 is good for tilapia. The dashboard trends it from your feed and harvest entries — no maths needed.",
        },
      ],
    },
    STOCK: {
      title: "Fish Stock & Batches",
      intro:
        "Every group of fish at {biz}: species, fingerling count, average weight and which pond they live in.",
      tasks: [
        {
          name: "Stock a new batch",
          steps: [
            "Open the new-batch form on this tab.",
            "Enter the species (e.g. VOLTA_TILAPIA), quantity stocked, average weight and the pond.",
            "Save — the batch begins tracking growth and feeding.",
          ],
        },
      ],
      faqs: [
        {
          q: "When is a batch ready?",
          match: ["ready", "harvest", "weight"],
          answer:
            "Tilapia table size is ~600–800 g. Watch average weight on this tab; when a batch crosses your target, record it on the Harvest tab.",
        },
      ],
    },
    PONDS: {
      title: "Ponds / Tanks / Cages",
      intro: "The physical units of {biz}: each pond, tank or river cage with its capacity and status.",
      tasks: [
        {
          name: "Add a pond",
          steps: [
            "Click “Add New Pond”.",
            "Give it an ID/name (e.g. CAGE-01), type and capacity.",
            "Save — it becomes available when stocking batches and logging water quality.",
          ],
        },
      ],
      faqs: [
        { q: "Pond or cage?", match: ["pond", "cage", "tank", "which"], answer: "Use whatever physically holds the water: earthen pond, concrete/plastic tank, or river/lake cage. The type label just keeps your records clear — all features work the same." },
      ],
    },
    FEED: {
      title: "Feed Management",
      intro: "Daily feeding for {biz}: what each pond ate, at what cost — the raw material of your FCR.",
      tasks: [
        {
          name: "Log a feeding",
          steps: [
            "Click “Log Feed”.",
            "Pick the pond/batch and feed type, enter kg fed and cost.",
            "Submit — feed totals, cost and FCR update on the dashboard.",
          ],
        },
      ],
      faqs: [
        {
          q: "How much should I feed?",
          match: ["how much", "quantity", "rate"],
          answer: "Grow-out tilapia eat roughly 2–3% of their body weight daily, split morning/afternoon. As average weight rises (Stock tab), raise the ration — the FCR trend tells you if you are wasting feed.",
        },
      ],
    },
    WATER: {
      title: "Water Quality",
      intro: "pH and dissolved-oxygen readings per pond — the invisible lifeline of {biz}.",
      tasks: [
        {
          name: "Log today's readings",
          steps: [
            "Open the water form on this tab.",
            "Choose the pond, enter pH (safe: 6.5–8.5) and dissolved oxygen in mg/L (safe above 5).",
            "Save — readings outside the safe band raise alerts on the dashboard.",
          ],
        },
      ],
      faqs: [
        {
          q: "Oxygen is low — what do I do?",
          match: ["oxygen", "low", "do", "aerator"],
          answer: "Run aerators immediately and stop feeding for the day. Log the reading and the corrective action so tomorrow's comparison is honest.",
        },
      ],
    },
    HEALTH: {
      title: "Tasks & Activities",
      intro: "The work log of {biz}: pond cleaning, net repairs, treatments and any daily activity with its cost.",
      tasks: [
        {
          name: "Log an activity",
          steps: [
            "Start a new task/activity entry on this tab.",
            "Choose the type, the pond if relevant, and note the work done and any cost.",
            "Save — costs flow into finance, and the activity trail builds the farm's maintenance history.",
          ],
        },
      ],
      faqs: CHECKLIST_FAQS,
    },
    HARVEST: {
      title: "Harvest Status & Sales",
      intro: "From pond to cash at {biz}: record harvests, watch the harvest & revenue trend, and sell fish from stock.",
      tasks: [
        {
          name: "Record a harvest",
          steps: [
            "Open the harvest form on this tab.",
            "Pick the pond/batch, enter total weight harvested (kg) and date.",
            "Save — fresh fish (per Kg) is stocked into Inventory, ready for sale.",
          ],
        },
        {
          name: "Sell fish",
          steps: [
            "Use the sale action, pick the fish item from live stock, enter kg and price.",
            "Submit — stock drops and revenue posts with a receipt.",
          ],
        },
      ],
      faqs: [
        {
          q: "Partial harvests allowed?",
          match: ["partial", "some", "half"],
          answer: "Yes — harvest what you sell today. Each entry adds its kg to stock and the batch keeps tracking the remainder.",
        },
      ],
    },
    FINANCE: {
      title: "Farm Finance",
      intro: "Money in and out for {biz}: fish sales, feed purchases and farm expenses, shared with the enterprise ledger.",
      tasks: [
        {
          name: "Record an expense",
          steps: [
            "Use the expense action on this tab.",
            "Category (feed, fingerlings, labour…), amount, payment method, description.",
            "Save — it posts to finance instantly.",
          ],
        },
      ],
      faqs: [
        { q: "Where do I see profit?", match: ["profit", "loss"], answer: "Income minus expenses is shown on this tab and on the dashboard's profit card — it updates live with every sale or expense." },
      ],
    },
  },

  /* ═════════════════ SPECIALIZED OPS (CAR WASH / LIVESTOCK) ═════════════════ */
  WASH: {
    OPERATIONS: {
      title: "Car Wash Operations",
      intro:
        "The daily shift console of {biz}: log vehicles washed and revenue once — stock (shampoo), finance and reports update themselves.",
      tasks: [
        {
          name: "Log a wash shift",
          steps: [
            "Click the green “Log Daily Operations” button (top right).",
            "Enter Vehicles Washed, Chemical Used (liters), Total Revenue (GH₵) and Water Pressure (PSI).",
            "Save — three things happen automatically: the revenue posts to finance, shampoo stock is deducted, and the shift appears in the logbook below.",
          ],
          tip: "Log at the end of each shift; the Q1 revenue card and the Command Center update the moment you save.",
        },
        {
          name: "Sell a wash service or product",
          steps: [
            "Use the sales area to pick a service (e.g. Executive Wash & Wax) from live stock.",
            "Enter the quantity (jobs), customer if known, and payment method.",
            "Submit — the sale posts revenue with a receipt.",
          ],
        },
        {
          name: "Read the logbook",
          steps: [
            "The Daily Operations Logbook lists this unit's own shifts only — newest first.",
            "Chemical litres per vehicle tell you if shampoo is being wasted (rough guide: ~0.25–0.3 L per car).",
          ],
        },
        {
          name: "Run the daily checklist",
          steps: CHECKLIST_TASKS[0].steps,
        },
      ],
      faqs: [
        {
          q: "The shampoo deducted looks wrong?",
          match: ["shampoo", "chemical", "stock"],
          answer:
            "Chemicals deduct from your shampoo drum stock automatically (litres ÷ drum size). Restock with a new drum when the level nears the low-stock line so the alert stays green.",
        },
        {
          q: "Where does the revenue go?",
          match: ["revenue", "money", "finance"],
          answer:
            "Straight into Transactions & MoMo tagged to this branch — it counts in your unit's profit, the Command Center table and every export.",
        },
      ],
    },
  },
  LIVESTOCK: {
    OPERATIONS: {
      title: "Livestock Operations",
      intro:
        "The herd diary of {biz}: every animal record — weight, vaccination, pregnancy — logged once and tracked forever.",
      tasks: [
        {
          name: "Log an animal record",
          steps: [
            "Click “Log Daily Operations”.",
            "Enter the Tag Number, Animal Type (CATTLE, GOAT…), Breed and Weight (kg).",
            "Set Vaccination Status; tick Pregnant if applicable.",
            "Save — the record joins this unit's own logbook and today counters.",
          ],
        },
        {
          name: "Track the herd",
          steps: [
            "Read the logbook newest-first; rising weights mean healthy growth.",
            "Vaccination gaps are the first thing to fix — log them the day the vet visits.",
          ],
        },
        {
          name: "Run the daily checklist",
          steps: CHECKLIST_TASKS[0].steps,
        },
      ],
      faqs: [
        {
          q: "How do I sell an animal or meat?",
          match: ["sell", "sale", "meat", "beef"],
          answer:
            "Sell from your stock items (e.g. Fresh Beef per Kg) through the sale form — stock drops and revenue posts to finance with a receipt, just like any product.",
        },
      ],
    },
  },

  /* ════════════ GENERIC AUTO-PROVISIONED UNIT (OTHER TYPES) ════════════ */
  GENERIC: {
    DASHBOARD: {
      title: "Business Dashboard",
      intro:
        "Your command page for {biz}: revenue, expenses, profit, stock value, alerts and quick links — all fed by the Activity Log and sales you record here.",
      tasks: [
        {
          name: "Understand what is already set up",
          steps: [
            "Your business was auto-provisioned: a starter stock kit was funded from your initial capital (see the banner and the Inventory tab).",
            "The KPI cards show revenue, expenses, profit and stock value — they rise with every sale and restock you record.",
            "The Alerts card watches low stock and missing routines for you.",
          ],
        },
        {
          name: "Make your first sale",
          steps: [
            "Click “Sale”.",
            "Pick a product from live stock, enter quantity, customer and payment method.",
            "Submit — stock drops, revenue rises and a receipt is issued.",
          ],
        },
      ],
      faqs: [
        {
          q: "What is the starter kit?",
          match: ["starter", "kit", "already", "setup"],
          answer:
            "When this unit was created, GoMina stocked it with sensible opening products for its type and booked their cost against initial capital. Restock or add your own items any time in Inventory.",
        },
      ],
    },
    INVENTORY: {
      title: "Business Inventory",
      intro: "Live stock for {biz}: starter kit plus anything you add — quantities, prices, values and low-stock status.",
      tasks: [
        {
          name: "Restock a product",
          steps: [
            "Click “Restock” (or the button on the product's row).",
            "Enter the quantity received and unit cost — totals preview before saving.",
            "Confirm; stock rises and the purchase can book to expenses in the same step.",
          ],
        },
        {
          name: "Sell from stock",
          steps: [
            "Use the Sale action, pick the product — only in-stock items appear.",
            "Quantity, total and stock-left preview show before you commit.",
          ],
        },
      ],
      faqs: [
        {
          q: "How do I add a completely new product?",
          match: ["new", "add", "product"],
          answer: "Use the unit's Operations panel or Inventory actions to add an item with its price and quantity — it becomes sellable immediately across the unit.",
        },
      ],
    },
    FINANCE: {
      title: "Business Finance",
      intro: "Income, expenses and profit for {biz} — recorded here, visible everywhere.",
      tasks: [
        {
          name: "Record an expense",
          steps: [
            "Click the expense action.",
            "Enter category, amount, payment method and a short description.",
            "Save — it posts to the finance table and the enterprise ledger at once.",
          ],
        },
      ],
      faqs: [
        { q: "Where do sales show?", match: ["sale", "income", "show"], answer: "The income table lists every sale with its receipt reference; the profit card nets income against expenses live." },
      ],
    },
    CHECKLIST: {
      title: "Daily Checklist",
      intro: "The daily routine for {biz} — created from your business type and tracked by Head Office.",
      tasks: CHECKLIST_TASKS,
      faqs: CHECKLIST_FAQS,
    },
  },

  /* ═══════════════ SHARED ENTERPRISE MODULES ═══════════════ */
  SHARED: {
    CUSTOMERS: {
      title: "Customers & CRM",
      intro: "Every buyer across all GoMina businesses — with lifetime spend, loyalty points and contact details in one directory.",
      tasks: [
        {
          name: "Add a customer",
          steps: [
            "Click “Add New Customer”.",
            "Enter the name, phone and any notes (company, location).",
            "Save — the customer becomes selectable in every sale form across the group.",
          ],
        },
        {
          name: "Use the CRM data",
          steps: [
            "Total Spent and loyalty points grow automatically whenever that customer buys at any branch.",
            "Search by name or phone to find a customer's history instantly.",
          ],
        },
      ],
      faqs: [
        {
          q: "Are customers shared between businesses?",
          match: ["shared", "other", "branch"],
          answer: "Yes — one registry for the whole group. A customer created at any branch can buy everywhere, and their spend and loyalty total across all seven-plus businesses.",
        },
      ],
    },
    SUPPLIERS: {
      title: "Suppliers & Vendors",
      intro: "Everyone you buy from — feed mills, cement distributors, importers — with payment terms and reliability notes.",
      tasks: [
        {
          name: "Add a supplier",
          steps: [
            "Click “Add Supplier”.",
            "Enter the company, contact and what they supply (category).",
            "Save — purchases and payables can now be tagged to them.",
          ],
        },
      ],
      faqs: [
        { q: "Who can edit or delete records here?", match: ["delete", "edit", "permission", "who", "remove", "manage"], answer: "The OWNER always can. Managers only when the OWNER has granted them record-management permission via “Manage Access”. Deleting asks for a reason and is permanently logged in the Deletion Audit Trail at the bottom of this page with the user, date and time." },
        { q: "Why register suppliers?", match: ["why", "purpose"], answer: "Tagging purchases to suppliers shows pricing trends and reliability per vendor — and keeps the Purchases sections in the business modules tidy." },
      ],
    },
    EMPLOYEES: {
      title: "Employees & Payroll",
      intro: "The group's staff directory: roles, branch assignments, salaries in GH₵ and login permissions.",
      tasks: [
        {
          name: "Add an employee",
          steps: [
            "Click “Add Employee”.",
            "Enter name, role (Manager, Worker…), branch assignment and salary.",
            "Save — if they need app access, create their login from Users management.",
          ],
        },
      ],
      faqs: [
        { q: "Who can edit or delete records here?", match: ["delete", "edit", "permission", "who", "remove", "manage"], answer: "The OWNER always can. Managers only when the OWNER has granted them record-management permission via “Manage Access”. Deleting asks for a reason and is permanently logged in the Deletion Audit Trail at the bottom of this page with the user, date and time." },
        { q: "Worker vs Branch Manager?", match: ["role", "worker", "manager"], answer: "WORKERs record sales and expenses in their own branch only; BRANCH_MANAGERs also manage workers, assets and branch registers. Owners/GMs see everything." },
      ],
    },
    ASSETS: {
      title: "Assets & Machinery",
      intro: "The group's asset register: machines, vehicles, cages and equipment with purchase cost, current value and maintenance notes.",
      tasks: [
        {
          name: "Register an asset",
          steps: [
            "Click “Register Asset”.",
            "Enter the name, category, branch, purchase cost and date.",
            "Save — it starts depreciating on schedule and appears in branch reports.",
          ],
        },
        {
          name: "Download a filtered register",
          steps: [
            "Click “Filters”, narrow by branch or category, then download.",
            "The export matches what you filtered — handy for insurance or audits.",
          ],
        },
      ],
      faqs: [
        { q: "How is current value computed?", match: ["value", "depreciation"], answer: "Assets depreciate from purchase cost over their useful life; the register shows both figures so balance-sheet values stay realistic." },
      ],
    },
    INVENTORY: {
      title: "Enterprise Inventory",
      intro: "Every stock item in every GoMina business on one screen — the group-wide shelf with branch tags and statuses.",
      tasks: [
        {
          name: "Add an item (SKU)",
          steps: [
            "Click “Add SKU Item”.",
            "Choose the owning business, then name, category, quantity, cost and selling price.",
            "Save — it appears in that business's stock and sale pickers instantly.",
          ],
        },
        {
          name: "Read the group shelf",
          steps: [
            "Filter by business to focus on one branch, or scan statuses for group-wide low stock.",
            "Quantities here are the same live numbers the business modules show — sales update them in real time.",
          ],
        },
      ],
      faqs: [
        { q: "Why two inventory screens?", match: ["two", "difference", "module"], answer: "Each business module manages its own stock day-to-day; this enterprise view exists for Head Office to compare and audit all branches at once." },
      ],
    },
    TRANSACTIONS: {
      title: "Transactions & MoMo",
      intro: "The complete money ledger of the group: every sale, expense and transfer with branch, method (Cash, MTN MoMo…) and recorder.",
      tasks: [
        {
          name: "Record a transaction",
          steps: [
            "Click “New Transaction”.",
            "Choose INCOME or EXPENSE, the business/branch, category and amount (GH₵).",
            "Pick the payment method, add a description and save.",
          ],
        },
        {
          name: "Find anything fast",
          steps: [
            "Filter by business, type or method, and search the description.",
            "Every module across the app writes here — this is the audit trail Head Office trusts.",
          ],
        },
      ],
      faqs: [
        { q: "Who can edit or delete records here?", match: ["delete", "edit", "permission", "who", "remove", "manage"], answer: "The OWNER always can. Managers only when the OWNER has granted them record-management permission via “Manage Access”. Deleting asks for a reason and is permanently logged in the Deletion Audit Trail at the bottom of this page with the user, date and time." },
        { q: "Is MoMo separated from cash?", match: ["momo", "cash", "method"], answer: "Yes — each transaction carries its method, so MoMo vs cash vs bank totals can be reconciled separately at close of day." },
      ],
    },
  },

  /* ═══════════════ COMMAND CENTER / ROLES ═══════════════ */
  COMMAND_CENTER: {
    COMMAND_CENTER: {
      title: "Enterprise Command Center",
      intro:
        "360° headquarters: every business unit's revenue, profit, ROI, stock alerts and checklist compliance on one executive screen.",
      tasks: [
        {
          name: "Open any business",
          steps: [
            "Click a unit in the left sidebar list, or its row on this page.",
            "You land inside that unit's own full module — use the same sidebar to jump back.",
          ],
        },
        {
          name: "Create a new branch / unit",
          steps: [
            "Click “New Branch / Unit”.",
            "Enter the name, pick the business type, set the region/district/town and the manager.",
            "Set initial capital and monthly target, then Create.",
            "The unit gets the exact same module as the original of its type, a starter stock kit and its checklists — and opens ready for work.",
          ],
        },
        {
          name: "Watch group risk in seconds",
          steps: [
            "The stock-alerts strip lists every low/out-of-stock item across the group.",
            "The checklist compliance column shows which branches ran their morning routine.",
            "“Export / Audit” (top right) downloads any unit's full report.",
          ],
        },
        {
          name: "Manage any business unit (Owner)",
          steps: [
            "Click “Manage Units” (Owner only) to open the management console.",
            "Use the pencil to edit: rename, change location, change business type, change manager, targets or status.",
            "Use the power button to deactivate a unit — it is flagged INACTIVE everywhere but keeps ALL its data; click again to re-activate.",
            "Use the trash button to permanently delete — you must type the unit code to confirm, and every related record (stock, sales, orders, finance, checklists) is removed.",
            "Every change updates inventory, sales, finance, dashboards and reports automatically.",
          ],
        },
      ],
      faqs: [
        {
          q: "Where do the numbers come from?",
          match: ["number", "from", "source"],
          answer: "Every figure is the sum of the units' own recorded activity (sales, restocks, expenses, checklists). Head Office never types totals — the branches generate them.",
        },
        {
          q: "How do I add another business?",
          match: ["add", "new", "business", "branch"],
          answer: "“New Branch / Unit” — pick its type and it receives the same dashboard and features as the original business of that type, automatically provisioned and linked.",
        },
        {
          q: "How do I edit, rename, deactivate or delete a business?",
          match: ["edit", "rename", "deactivate", "delete", "remove", "manage", "type", "location"],
          answer: "Open “Manage Units” (Owner). The pencil edits name, location, business type, manager and targets — changing type auto-provisions the new module's starter stock and checklists. The power button deactivates/re-activates without losing data. The trash button deletes the unit and all its records — you must type the unit code to confirm.",
        },
      ],
    },
  },
  WORKER: {
    WORKER: {
      title: "My Worker Workspace",
      intro:
        "Your daily desk at {biz}: record sales and expenses for your branch and see your own results — nothing else is touched.",
      tasks: [
        {
          name: "Record a sale",
          steps: [
            "Click “Record Sale”.",
            "Pick the product from your branch's live stock.",
            "Enter quantity and customer, choose the payment method (Cash, MTN MoMo…).",
            "Submit — the receipt is issued and the sale counts towards your activity below.",
          ],
        },
        {
          name: "Record a daily expense",
          steps: [
            "Click “Record Daily Expense”.",
            "Category, amount, payment method, description — then save.",
          ],
        },
        {
          name: "Check my performance",
          steps: [
            "“My Sales Today” and “My Sales Activity” show your own records only.",
            "Managers and the Owner see your totals in the branch reports automatically.",
          ],
        },
      ],
      faqs: [
        { q: "Can I see other branches?", match: ["other", "branch", "see"], answer: "No — your workspace is strictly scoped to {biz}. That keeps every branch's figures clean and your activity personally credited." },
      ],
    },
  },
  SALES_CENTER: {
    SALES_CENTER: {
      title: "Sales & Payments Center",
      intro:
        "The till for {biz}: sell from live stock, take Cash/MoMo payments, issue receipts and invoices — stock and finance update instantly.",
      tasks: [
        {
          name: "Make a sale",
          steps: [
            "Click “New Sale”.",
            "Pick the product from live stock (only available items are listed).",
            "Enter the quantity, choose the customer (or Create Customer), and the payment method.",
            "Submit — stock deducts, an official receipt/reference is generated automatically.",
          ],
        },
        {
          name: "Create an invoice",
          steps: [
            "Click “New Invoice” and build the bill for the customer from stock items.",
            "Convert to a sale with “Convert to Invoice” flow when paid — fulfilment deducts stock and books the revenue.",
          ],
        },
        {
          name: "Handle returns",
          steps: [
            "Open the customer's sale from the activity list and start a customer return.",
            "Returned quantities go back into stock and the refund is booked against the day.",
          ],
        },
      ],
      faqs: [
        {
          q: "Which payment methods can I take?",
          match: ["payment", "momo", "cash", "methods"],
          answer: "Cash, MTN MoMo, Telecel Cash, bank transfer and card — the method rides on every transaction so daily reconciliation splits payment channels cleanly.",
        },
      ],
    },
  },
};

/** Resolve the guide for a module+section with graceful fallbacks. */
export function getGuide(
  moduleKey: string,
  section: string,
  biz?: { name?: string; code?: string; category?: string } | null,
): SectionGuide {
  const mod = GUIDES[moduleKey] || {};
  const found = mod[section] || mod.DEFAULT || COMMON[section] || COMMON.DEFAULT;
  const bizName = biz?.name || "this business";
  const sub = (s: string) => s.replaceAll("{biz}", bizName);
  return {
    title: found.title,
    intro: sub(found.intro),
    tasks: found.tasks.map((t) => ({
      ...t,
      steps: t.steps.map(sub),
      tip: t.tip ? sub(t.tip) : undefined,
    })),
    faqs: found.faqs.map((f) => ({ ...f, answer: sub(f.answer) })),
  };
}

/** Keyword-matched free-text answer scoped to the CURRENT section's guide. */
export function answerQuestion(guide: SectionGuide, question: string): string {
  const query = question.toLowerCase();
  const words = query.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

  let bestFaq: { score: number; answer: string } | null = null;
  for (const f of guide.faqs) {
    const score = f.match.reduce((s, kw) => (query.includes(kw.toLowerCase()) ? s + kw.split(" ").length : s), 0);
    if (score > 0 && score > (bestFaq?.score ?? 0)) bestFaq = { score, answer: f.answer };
  }
  if (bestFaq) return bestFaq.answer;

  let bestTask: { score: number; text: string } | null = null;
  for (const t of guide.tasks) {
    const nameWords = t.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
    const score = nameWords.filter((w) => words.includes(w)).length;
    if (score > 0 && score > (bestTask?.score ?? 0)) {
      bestTask = {
        score,
        text:
          `To ${t.name.charAt(0).toLowerCase() + t.name.slice(1)}:\n` +
          t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
          (t.tip ? `\n\nTip: ${t.tip}` : ""),
      };
    }
  }
  if (bestTask) return bestTask.text;

  return (
    `In this section you can: ${guide.tasks.map((t) => t.name.toLowerCase()).join("; ")}. ` +
    `Tap a task above for numbered steps, or try asking "${guide.faqs[0]?.q ?? "how do I start?"}".`
  );
}
