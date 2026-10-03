use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: Option<i64>,
    pub sku: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub size: Option<String>,
    pub color: Option<String>,
    pub material: Option<String>,
    pub cost_price: f64,
    pub sale_price: f64,
    pub quantity: i64,
    pub reorder_level: i64,
    pub image_path: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Currency {
    pub code: String,
    pub name: String,
    pub symbol: String,
    pub exchange_rate: f64,
    pub is_base: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItemInput {
    pub product_id: i64,
    pub product_name: String,
    pub sku: String,
    pub unit_price: f64,
    pub quantity: i64,
    pub discount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub sku: String,
    pub unit_price: f64,
    pub unit_cost: f64,
    pub quantity: i64,
    pub discount: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewSale {
    pub customer_name: Option<String>,
    pub currency_code: String,
    pub exchange_rate: f64,
    pub discount: f64,
    pub tax_rate: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub items: Vec<SaleItemInput>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sale {
    pub id: i64,
    pub invoice_no: String,
    pub customer_name: Option<String>,
    pub currency_code: String,
    pub exchange_rate: f64,
    pub subtotal: f64,
    pub discount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total: f64,
    pub payment_method: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub items: Vec<SaleItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardStats {
    pub today_sales_total: f64,
    pub today_sales_count: i64,
    pub today_profit: f64,
    pub month_sales_total: f64,
    pub month_profit: f64,
    pub total_products: i64,
    pub low_stock_count: i64,
    pub base_currency: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LowStockItem {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub quantity: i64,
    pub reorder_level: i64,
}
