// --- 1. Dashboard Summaries & KPIs ---
export interface Allocation {
  id?: string;
  name: string;
  budget: number;
}

export interface SummaryKPIs {
  overall_metrics: {
    total_projected_revenue: number;
    total_projected_expenses: number;
    y1_budget_revenue: number;
    y1_actuals_revenue: number;
    y1_budget_expenses: number;
    y1_actuals_expenses: number;
  };
  allocations_by_area: Allocation[];
  allocations_by_grantee: Allocation[];
}

// --- 2. Investment Areas (Programmatic Budgets) ---
export interface LineItem {
  role?: string;
  category?: string;
  grantee: string;
  amount: number;
  description: string;
}

export interface ExpenseCategory {
  total: number;
  line_items: LineItem[];
}

export interface InvestmentArea {
  id: string;
  title: string;
  total_budget_2023_2029: number;
  y1_actuals: number;
  y1_budget: number;
  personnel_expenses: ExpenseCategory;
  non_personnel_expenses: ExpenseCategory;
}

// --- 3. Grants ---
export interface Grant {
  id: string;
  funder: string;
  grantee: string;
  restriction: string;
  grant_total: number;
  grant_years: number;
  payout_2023_2024: number;
  payout_2024_2025: number;
  payout_2025_2026: number;
  payout_2026_2027: number;
  payout_2027_2028: number;
  payout_2028_2029: number;
}

// --- 4. Financial Statements ---
export interface FinancialRow {
  line_item: string;
  BCZ: number;
  Roots: number;
  EOYDC: number;
  BOEN: number;
}

export interface FinancialStatements {
  fiscal_year: string;
  statement_of_financial_position: {
    assets: FinancialRow[];
    liabilities: FinancialRow[];
    net_assets: FinancialRow[];
  };
  statement_of_activities: {
    revenue: FinancialRow[];
    expenses_by_function: FinancialRow[];
  };
  statement_of_functional_expenses: FinancialRow[];
}