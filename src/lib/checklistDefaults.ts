// Default daily tasks per business — these mirror the lists each module
// historically used so existing behaviour stays exactly the same, and new
// modules get sensible operations checklists out of the box.
export type TaskSeed = { taskKey: string; taskLabel: string; category: string };

const POULTRY_TASKS: TaskSeed[] = [
  { taskKey: "FEED_MORNING", taskLabel: "Morning feeding (all houses)", category: "FEEDING" },
  { taskKey: "WATER_CHECK", taskLabel: "Check & refill drinkers", category: "WATER" },
  { taskKey: "EGG_COLLECT_AM", taskLabel: "Morning egg collection", category: "PRODUCTION" },
  { taskKey: "MORTALITY_CHECK", taskLabel: "Remove & record mortalities", category: "HEALTH" },
  { taskKey: "FEED_EVENING", taskLabel: "Evening feeding (all houses)", category: "FEEDING" },
  { taskKey: "EGG_COLLECT_PM", taskLabel: "Afternoon egg collection", category: "PRODUCTION" },
  { taskKey: "HOUSE_CLEAN", taskLabel: "Clean houses & remove litter", category: "CLEANING" },
  { taskKey: "BIOSECURITY", taskLabel: "Footbath refresh & gate check", category: "SECURITY" },
];

const BLOCK_TASKS: TaskSeed[] = [
  { taskKey: "MACHINE_STARTUP", taskLabel: "Start up & warm block molding machine", category: "MACHINERY" },
  { taskKey: "MIXER_INSPECTION", taskLabel: "Inspect mixer blades, belts & pallets", category: "MACHINERY" },
  { taskKey: "MATERIAL_COUNT", taskLabel: "Count cement, sand, quarry & water stock", category: "MATERIALS" },
  { taskKey: "FIRST_BATCH", taskLabel: "Start first production batch of the day", category: "PRODUCTION" },
  { taskKey: "QUALITY_SPOT_CHECK", taskLabel: "Quality spot-check on fresh blocks", category: "QUALITY" },
  { taskKey: "CURING_WATERING", taskLabel: "Water the curing yard & stacks", category: "PRODUCTION" },
  { taskKey: "DISPATCH_CONFIRM", taskLabel: "Confirm today's delivery dispatch plan", category: "DELIVERIES" },
  { taskKey: "YARD_CLEANING", taskLabel: "Clean yard & clear broken blocks", category: "CLEANING" },
  { taskKey: "GENERATOR_CHECK", taskLabel: "Generator fuel & oil level check", category: "MACHINERY" },
  { taskKey: "SITE_LOCKDOWN", taskLabel: "End-of-day store & site security lockdown", category: "SECURITY" },
];

const AQUA_TASKS: TaskSeed[] = [
  { taskKey: "AERATION_CHECK", taskLabel: "Check aerators and oxygen meters", category: "WATER" },
  { taskKey: "DO_PH_TEST", taskLabel: "Test DO/pH in all ponds and cages", category: "WATER" },
  { taskKey: "FEED_MORNING", taskLabel: "Morning feeding (all ponds and cages)", category: "FEEDING" },
  { taskKey: "MORTALITY_CHECK", taskLabel: "Count and log mortalities", category: "HEALTH" },
  { taskKey: "FILTER_CLEAN", taskLabel: "Clean water filters", category: "CLEANING" },
  { taskKey: "SECURITY_CHECK", taskLabel: "Inspect moorings and biosecurity", category: "SECURITY" },
];

const LIVESTOCK_TASKS: TaskSeed[] = [
  { taskKey: "HERD_COUNT", taskLabel: "Morning herd count & head check", category: "PRODUCTION" },
  { taskKey: "WATER_TROUGHS", taskLabel: "Fill & clean water troughs", category: "WATER" },
  { taskKey: "FEED_CONCENTRATE", taskLabel: "Feed concentrate & mineral licks", category: "FEEDING" },
  { taskKey: "HEALTH_SPOT", taskLabel: "Spot-check animals for illness/injury", category: "HEALTH" },
  { taskKey: "KRAAL_CLEAN", taskLabel: "Clean kraal & milking shed", category: "CLEANING" },
  { taskKey: "PASTURE_MOVE", taskLabel: "Move herds to pasture / grazing plan", category: "PRODUCTION" },
  { taskKey: "VACCINE_CHECK", taskLabel: "Check vaccination & deworming schedule", category: "HEALTH" },
  { taskKey: "NIGHT_PEN", taskLabel: "Pen & secure animals for the night", category: "SECURITY" },
];

const FOOD_TASKS: TaskSeed[] = [
  { taskKey: "KITCHEN_SANITIZE", taskLabel: "Sanitize kitchen surfaces & utensils", category: "HYGIENE" },
  { taskKey: "FRIDGE_TEMPS", taskLabel: "Record fridge & freezer temperatures", category: "HEALTH" },
  { taskKey: "STOCK_CHECK", taskLabel: "Check ingredient stock & flag shortages", category: "STOCK" },
  { taskKey: "PREP_STATIONS", taskLabel: "Set up prep stations for service", category: "PRODUCTION" },
  { taskKey: "GAS_FIRE_CHECK", taskLabel: "Gas, burner & fire-safety check", category: "SECURITY" },
  { taskKey: "WASTE_DISPOSAL", taskLabel: "Dispose of waste & clean bins", category: "CLEANING" },
  { taskKey: "CASH_RECONCILE", taskLabel: "Reconcile cash & MoMo till", category: "FINANCE" },
  { taskKey: "CLOSING_CLEAN", taskLabel: "Closing deep clean & equipment shutdown", category: "CLEANING" },
];

const TECH_TASKS: TaskSeed[] = [
  { taskKey: "SHOP_OPEN", taskLabel: "Open shop & switch on displays", category: "ADMIN" },
  { taskKey: "POS_FLOAT", taskLabel: "Verify POS & cash/MoMo float", category: "FINANCE" },
  { taskKey: "REPAIR_QUEUE", taskLabel: "Review repair queue & update customers", category: "PRODUCTION" },
  { taskKey: "PICKUP_FOLLOWUP", taskLabel: "Follow up pending customer pickups", category: "SALES" },
  { taskKey: "STOCK_FAST_MOVERS", taskLabel: "Count fast-moving stock (phones, accessories)", category: "STOCK" },
  { taskKey: "DEMO_WIPE", taskLabel: "Wipe & charge demo units", category: "CLEANING" },
  { taskKey: "ALARM_LOCKUP", taskLabel: "Activate alarm & lock up at close", category: "SECURITY" },
];

const WASH_TASKS: TaskSeed[] = [
  { taskKey: "EQUIPMENT_CHECK", taskLabel: "Check pressure washers & vacuum units", category: "MACHINERY" },
  { taskKey: "CHEMICAL_STOCK", taskLabel: "Check shampoo, wax & chemical stock", category: "MATERIALS" },
  { taskKey: "WATER_TANK", taskLabel: "Verify water tank level & pump", category: "WATER" },
  { taskKey: "BAY_SETUP", taskLabel: "Set up & clean washing bays", category: "CLEANING" },
  { taskKey: "MOMO_FLOAT", taskLabel: "Record cash & MoMo opening float", category: "FINANCE" },
  { taskKey: "QC_FINISH", taskLabel: "Quality check finished vehicles before handover", category: "QUALITY" },
  { taskKey: "YARD_CLOSING", taskLabel: "Close bays, drain lines & store equipment", category: "SECURITY" },
];

export const GENERIC_TASKS: TaskSeed[] = [
  { taskKey: "OPEN_SITE", taskLabel: "Open site & equipment check", category: "ADMIN" },
  { taskKey: "STOCK_CHECK", taskLabel: "Stock & materials count", category: "STOCK" },
  { taskKey: "SALES_RECON", taskLabel: "Reconcile sales & payments", category: "FINANCE" },
  { taskKey: "CLEAN_CLOSE", taskLabel: "Clean & secure site at close", category: "CLEANING" },
];

const DEFAULT_TASKS_BY_BUSINESS: Record<string, TaskSeed[]> = {
  "POULTRY-01": POULTRY_TASKS,
  "BLOCK-01": BLOCK_TASKS,
  "AQUA-01": AQUA_TASKS,
  "LIVESTOCK-01": LIVESTOCK_TASKS,
  "FOOD-01": FOOD_TASKS,
  "TECH-01": TECH_TASKS,
  "WASH-01": WASH_TASKS,
};

// Business-type → specialized task set, so any NEW business unit created in a
// known category instantly gets the full specialized checklist (not just the
// 4-task generic fallback).
const DEFAULT_TASKS_BY_CATEGORY: Record<string, TaskSeed[]> = {
  "Poultry Farm": POULTRY_TASKS,
  "Block Factory": BLOCK_TASKS,
  Aquaculture: AQUA_TASKS,
  Livestock: LIVESTOCK_TASKS,
  "Restaurant & Food": FOOD_TASKS,
  "Electronic Shop": TECH_TASKS,
  "Car Wash": WASH_TASKS,
};

/** Pick the best task set for a business: exact code → category → generic. */
export function tasksForBusiness(bizCode?: string | null, category?: string | null): TaskSeed[] {
  if (bizCode && DEFAULT_TASKS_BY_BUSINESS[bizCode]) return DEFAULT_TASKS_BY_BUSINESS[bizCode];
  if (category && DEFAULT_TASKS_BY_CATEGORY[category]) return DEFAULT_TASKS_BY_CATEGORY[category];
  return GENERIC_TASKS;
}
