from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import sqlite3
from datetime import datetime, timedelta
import numpy as np
from contextlib import contextmanager
import json
import os

app = FastAPI(title="Business Insights Dashboard API")


origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup - using file-based SQLite for persistence
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'business_data.db')
#DATABASE_PATH = "data/business_data.db"

# Create a global connection pool
def init_db():
    # Create tables and load data if they don't exist
    with get_db_connection() as conn:
        # Check if tables exist
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
        if not cursor.fetchone():
            load_data(conn)

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    try:
        yield conn
    finally:
        conn.close()

def load_data(conn):
    # Load data from CSV files into SQLite
    customers = pd.read_csv(os.path.join(BASE_DIR, 'customers.csv'))
    products = pd.read_csv(os.path.join(BASE_DIR, 'products.csv'))
    sales = pd.read_csv(os.path.join(BASE_DIR, 'sales_transactions.csv'))
    tickets = pd.read_csv(os.path.join(BASE_DIR, 'support_tickets.csv'))
    suppliers = pd.read_csv(os.path.join(BASE_DIR, 'supplier_data.csv'))

    sales['transaction_date'] = pd.to_datetime(sales['transaction_date'], errors='coerce').dt.strftime('%Y-%m-%d')

    customers.to_sql('customers', conn, index=False, if_exists='replace')
    products.to_sql('products', conn, index=False, if_exists='replace')
    sales.to_sql('sales', conn, index=False, if_exists='replace')
    tickets.to_sql('tickets', conn, index=False, if_exists='replace')
    suppliers.to_sql('suppliers', conn, index=False, if_exists='replace')
    


    # Initialize database on startup
init_db()

# Pydantic models for request/response validation
class Customer(BaseModel):
    customer_id: int
    customer_name: str
    industry: str
    region: str
    join_date: str

class Product(BaseModel):
    product_id: int
    product_name: str
    category: str
    cost_price: float
    sales_price: float

class Sale(BaseModel):
    transaction_id: int
    customer_id: int
    product_id: int
    quantity: int
    sale_amount: float
    transaction_date: str

class Ticket(BaseModel):
    ticket_id: int
    customer_id: int
    product_id: int
    issue_type: str
    status: str
    creation_date: str
    resolution_date: Optional[str]
    sentiment_score: float

class Supplier(BaseModel):
    supplier_id: int
    supplier_name: str
    product_id: int
    lead_time_days: int
    reliability_score: float

class CustomerSummary(BaseModel):
    customer: Customer
    total_spent: float
    total_transactions: int
    open_tickets: int
    avg_sentiment: float
    favorite_category: str

class ProductSummary(BaseModel):
    product: Product
    total_sales: float
    total_quantity: int
    profit: float
    avg_sentiment: float
    common_issues: List[str]

class Recommendation(BaseModel):
    product_id: int
    product_name: str
    confidence: float

# API Endpoints - Updated to use the connection manager
@app.get("/customers", response_model=List[Customer])
def get_customers(
    limit: int = 100,
    offset: int = 0,
    industry: Optional[str] = None,
    region: Optional[str] = None
):
    with get_db_connection() as conn:
        query = "SELECT * FROM customers"
        conditions = []
        params = {}
        
        if industry:
            conditions.append("industry = :industry")
            params['industry'] = industry
        if region:
            conditions.append("region = :region")
            params['region'] = region
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += f" LIMIT {limit} OFFSET {offset}"
        
        df = pd.read_sql(query, conn, params=params)
        return df.to_dict('records')

@app.get("/products", response_model=List[Product])
def get_products(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    with get_db_connection() as conn:
        query = "SELECT * FROM products"
        conditions = []
        params = {}
        
        if category:
            conditions.append("category = :category")
            params['category'] = category
        if min_price is not None:
            conditions.append("sales_price >= :min_price")
            params['min_price'] = min_price
        if max_price is not None:
            conditions.append("sales_price <= :max_price")
            params['max_price'] = max_price
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += f" LIMIT {limit} OFFSET {offset}"
        
        df = pd.read_sql(query, conn, params=params)
        return df.to_dict('records')


@app.get("/customers/{customer_id}", response_model=CustomerSummary)

def get_customer_summary(customer_id: int):
    with get_db_connection() as conn:
        # Get customer info
        customer_df = pd.read_sql(f"SELECT * FROM customers WHERE customer_id = {customer_id}", conn)
        if customer_df.empty:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        customer = customer_df.iloc[0].to_dict()
        
        # Get sales data
        sales_df = pd.read_sql(f"""
            SELECT SUM(sale_amount) as total_spent, COUNT(*) as total_transactions 
            FROM sales 
            WHERE customer_id = {customer_id}
        """, conn)
        
        # Get ticket data
        tickets_df = pd.read_sql(f"""
            SELECT COUNT(*) as open_tickets, AVG(sentiment_score) as avg_sentiment
            FROM tickets 
            WHERE customer_id = {customer_id} AND status IN ('Open', 'In Progress')
        """, conn)
        
        # Get favorite category
        category_df = pd.read_sql(f"""
            SELECT p.category, COUNT(*) as count
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            WHERE s.customer_id = {customer_id}
            GROUP BY p.category
            ORDER BY count DESC
            LIMIT 1
        """, conn)
    
    favorite_category = category_df.iloc[0]['category'] if not category_df.empty else "N/A"
    
    return {
        "customer": customer,
        "total_spent": sales_df.iloc[0]['total_spent'] or 0,
        "total_transactions": sales_df.iloc[0]['total_transactions'] or 0,
        "open_tickets": tickets_df.iloc[0]['open_tickets'] or 0,
        "avg_sentiment": round(tickets_df.iloc[0]['avg_sentiment'] or 0, 2),
        "favorite_category": favorite_category
    }
'''
@app.get("/products", response_model=List[Product])
def get_products(limit: int = 50, offset: int = 0):
    query = f"SELECT * FROM products LIMIT {limit} OFFSET {offset}"
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn)
    return df.to_dict('records')

@app.get("/products/{product_id}", response_model=ProductSummary)
def get_product_summary(product_id: int):
    with get_db_connection() as conn:
    # Get product info
        product_df = pd.read_sql(f"SELECT * FROM products WHERE product_id = {product_id}", conn)
        if product_df.empty:
            raise HTTPException(status_code=404, detail="Product not found")
    
        product = product_df.iloc[0].to_dict()
    
    # Get sales data
        sales_df = pd.read_sql(f"""
            SELECT SUM(sale_amount) as total_sales, SUM(quantity) as total_quantity,
                SUM(sale_amount) - SUM(quantity * (SELECT cost_price FROM products WHERE product_id = {product_id})) as profit
            FROM sales 
            WHERE product_id = {product_id}
        """, conn)
    
    # Get ticket data
        ticket_df = pd.read_sql(f"""
            SELECT AVG(sentiment_score) as avg_sentiment, issue_type, COUNT(*) as count
            FROM tickets 
            WHERE product_id = {product_id}
            GROUP BY issue_type
            ORDER BY count DESC
            LIMIT 3
        """, conn)
    
    common_issues = ticket_df['issue_type'].tolist() if not ticket_df.empty else []
    avg_sentiment = round(ticket_df.iloc[0]['avg_sentiment'], 2) if not ticket_df.empty else 0
    
    return {
        "product": product,
        "total_sales": sales_df.iloc[0]['total_sales'] or 0,
        "total_quantity": sales_df.iloc[0]['total_quantity'] or 0,
        "profit": sales_df.iloc[0]['profit'] or 0,
        "avg_sentiment": avg_sentiment,
        "common_issues": common_issues
    }
'''

@app.get("/products/{product_id}", response_model=ProductSummary)

def get_product_summary(product_id: int):
    with get_db_connection() as conn:
        # Verify product exists first
        product_exists = pd.read_sql(f"""
            SELECT 1 FROM products WHERE product_id = {product_id}
        """, conn)
        if product_exists.empty:
            raise HTTPException(status_code=404, detail="Product not found")

        # Get main product data
        product = pd.read_sql(f"""
            SELECT * FROM products WHERE product_id = {product_id}
        """, conn).iloc[0]

        # Get sales and ticket data in single query
        stats = pd.read_sql(f"""
            SELECT 
                SUM(s.quantity) as total_quantity,
                SUM(s.sale_amount) as total_sales,
                SUM(s.sale_amount) - SUM(s.quantity * p.cost_price) as profit,
                (SELECT GROUP_CONCAT(issue_type) 
                 FROM (SELECT issue_type 
                       FROM tickets 
                       WHERE product_id = {product_id}
                       GROUP BY issue_type ORDER BY COUNT(*) DESC LIMIT 3)) as common_issues,
                (SELECT AVG(sentiment_score) FROM tickets WHERE product_id = {product_id}) as avg_sentiment
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            WHERE s.product_id = {product_id}
        """, conn).iloc[0]

        return ProductSummary(
            product=Product(**product),
            total_sales=stats['total_sales'] or 0,
            total_quantity=stats['total_quantity'] or 0,
            profit=stats['profit'] or 0,
            avg_sentiment=round(stats['avg_sentiment'] or 0, 2),
            common_issues=stats['common_issues'].split(',') if stats['common_issues'] else []
        )

@app.get("/sales", response_model=List[Sale])
def get_sales(limit: int = 100, offset: int = 0):
    query = f"SELECT * FROM sales LIMIT {limit} OFFSET {offset}"
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn)
    return df.to_dict('records')

@app.get("/tickets", response_model=List[Ticket])
def get_tickets(limit: int = 100, offset: int = 0):
    query = f"SELECT * FROM tickets LIMIT {limit} OFFSET {offset}"
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn)
    return df.to_dict('records')

@app.get("/suppliers", response_model=List[Supplier])
def get_suppliers(limit: int = 50, offset: int = 0):
    query = f"SELECT * FROM suppliers LIMIT {limit} OFFSET {offset}"
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn)
    return df.to_dict('records')

# AI/ML Feature: Product Recommendations
@app.get("/recommendations/{product_id}", response_model=List[Recommendation])
def get_recommendations(product_id: int, limit: int = 5):
    with get_db_connection() as conn:
        # First verify the product exists
        product_check = pd.read_sql(f"""
            SELECT product_id FROM products WHERE product_id = {product_id}
        """, conn)
        if product_check.empty:
            raise HTTPException(status_code=404, detail="Product not found")

        # Get transactions containing the target product
        target_transactions = pd.read_sql(f"""
            SELECT DISTINCT transaction_id 
            FROM sales 
            WHERE product_id = {product_id}
        """, conn)
        
        if target_transactions.empty:
            # Product exists but has no sales - recommend popular products
            return get_popular_products(conn, product_id, limit)
        
        # Convert transaction IDs to comma-separated string safely
        transaction_ids = ",".join([str(tid) for tid in target_transactions['transaction_id']])
        
        # Get co-purchased products
        related_products = pd.read_sql(f"""
            SELECT s.product_id, p.product_name, COUNT(*) as co_occurrence
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            WHERE s.transaction_id IN ({transaction_ids})
              AND s.product_id != {product_id}
            GROUP BY s.product_id, p.product_name
            ORDER BY co_occurrence DESC
            LIMIT {limit}
        """, conn)
        
        if not related_products.empty:
            # Calculate confidence scores
            max_co = related_products['co_occurrence'].max()
            return [
                {
                    "product_id": row['product_id'],
                    "product_name": row['product_name'],
                    "confidence": round(row['co_occurrence'] / max_co, 2)
                }
                for _, row in related_products.iterrows()
            ]
        else:
            # No co-purchased products found - fallback to popular products
            return get_popular_products(conn, product_id, limit)

def get_popular_products(conn, exclude_product_id: int, limit: int):
    """Fallback to recommend generally popular products"""
    popular = pd.read_sql(f"""
        SELECT p.product_id, p.product_name, 0.5 as confidence
        FROM products p
        LEFT JOIN sales s ON p.product_id = s.product_id
        WHERE p.product_id != {exclude_product_id}
        GROUP BY p.product_id, p.product_name
        ORDER BY COUNT(s.product_id) DESC
        LIMIT {limit}
    """, conn)
    return popular.to_dict('records')
    
# Dashboard Statistics
@app.get("/dashboard/stats")
def get_dashboard_stats():
    with get_db_connection() as conn:
        # Get basic stats
        stats = pd.read_sql("""
            SELECT 
                (SELECT COUNT(*) FROM customers) as total_customers,
                (SELECT SUM(sale_amount) FROM sales) as total_sales,
                (SELECT COUNT(*) FROM tickets WHERE status IN ('Open', 'In Progress')) as open_tickets
        """, conn).iloc[0]

        # Get top products
        top_products = pd.read_sql("""
            SELECT p.product_id, p.product_name, SUM(s.sale_amount) as total_sales
            FROM sales s 
            JOIN products p ON s.product_id = p.product_id
            GROUP BY p.product_id, p.product_name
            ORDER BY total_sales DESC
            LIMIT 5
        """, conn).to_dict('records')

        # Get sales by region
        sales_by_region = pd.read_sql("""
            SELECT c.region, SUM(s.sale_amount) as total_sales
            FROM sales s 
            JOIN customers c ON s.customer_id = c.customer_id
            GROUP BY c.region
        """, conn).to_dict('records')

        # Get sales trend (last 12 months)
        sales_trend = pd.read_sql("""
            SELECT 
                strftime('%Y-%m', transaction_date) as month,
                SUM(sale_amount) as total_sales
            FROM sales
            
            -- TEMPORARY: remove this line to test
            --WHERE transaction_date >= date('now', '-12 months')

            GROUP BY month
            ORDER BY month
        """, conn).to_dict('records')

        return {
            "total_customers": int(stats['total_customers']),
            "total_sales": float(stats['total_sales'] or 0),
            "open_tickets": int(stats['open_tickets'] or 0),
            "top_products": top_products,
            "sales_by_region": sales_by_region,
            "sales_trend": sales_trend
        }
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)