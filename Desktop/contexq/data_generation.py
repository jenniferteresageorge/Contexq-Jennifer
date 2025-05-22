# data_generation.py
import pandas as pd
from faker import Faker
import random
from datetime import datetime, timedelta
import numpy as np

fake = Faker()

# Configuration
NUM_CUSTOMERS = 100
NUM_PRODUCTS = 30
NUM_TRANSACTIONS = 1000
NUM_TICKETS = 500
NUM_SUPPLIERS = 15

# Helper functions
def random_date(start_date, end_date):
    return start_date + timedelta(
        seconds=random.randint(0, int((end_date - start_date).total_seconds())))
    
def generate_customers(num):
    customers = []
    for i in range(num):
        join_date = random_date(datetime(2018, 1, 1), datetime(2022, 12, 31))
        customers.append({
            "customer_id": i + 1,
            "customer_name": fake.company(),
            "industry": random.choice(['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education']),
            "region": random.choice(['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania']),
            "join_date": join_date.strftime('%Y-%m-%d')
        })
    return pd.DataFrame(customers)

def generate_products(num):
    categories = ['Electronics', 'Clothing', 'Home Goods', 'Software', 'Food', 'Office Supplies']
    products = []
    for i in range(num):
        cost = round(random.uniform(10, 500), 2)
        products.append({
            "product_id": i + 1,
            "product_name": fake.catch_phrase(),
            "category": random.choice(categories),
            "cost_price": cost,
            "sales_price": round(cost * random.uniform(1.2, 3.0), 2)
        })
    return pd.DataFrame(products)

def generate_sales(customers, products, num):
    sales = []
    for i in range(num):
        customer = random.choice(customers['customer_id'].values)
        product = random.choice(products['product_id'].values)
        product_data = products[products['product_id'] == product].iloc[0]
        quantity = random.randint(1, 10)
        sale_amount = round(quantity * product_data['sales_price'], 2)
        
        # Get customer join date to ensure sale is after join
        join_date = datetime.strptime(
            customers[customers['customer_id'] == customer].iloc[0]['join_date'], 
            '%Y-%m-%d'
        )
        transaction_date = random_date(join_date, datetime(2023, 6, 30))
        
        sales.append({
            "transaction_id": i + 1,
            "customer_id": customer,
            "product_id": product,
            "quantity": quantity,
            "sale_amount": sale_amount,
            "transaction_date": transaction_date.strftime('%Y-%m-%d')
        })
    return pd.DataFrame(sales)

def generate_support_tickets(customers, products, num):
    issues = ['Billing', 'Technical', 'Shipping', 'Quality', 'Returns', 'General']
    statuses = ['Open', 'Closed', 'In Progress', 'Resolved']
    sentiments = [round(random.uniform(0, 1), 2) for _ in range(num)]
    
    tickets = []
    for i in range(num):
        customer = random.choice(customers['customer_id'].values)
        product = random.choice(products['product_id'].values)
        creation_date = random_date(datetime(2020, 1, 1), datetime(2023, 6, 30))
        
        # 80% chance ticket is resolved
        if random.random() < 0.8:
            resolution_date = random_date(creation_date, creation_date + timedelta(days=30))
            status = random.choice(['Closed', 'Resolved'])
        else:
            resolution_date = None
            status = random.choice(['Open', 'In Progress'])
            
        tickets.append({
            "ticket_id": i + 1,
            "customer_id": customer,
            "product_id": product,
            "issue_type": random.choice(issues),
            "status": status,
            "creation_date": creation_date.strftime('%Y-%m-%d'),
            "resolution_date": resolution_date.strftime('%Y-%m-%d') if resolution_date else None,
            "sentiment_score": sentiments[i]
        })
    return pd.DataFrame(tickets)

def generate_suppliers(products, num):
    suppliers = []
    product_ids = products['product_id'].unique()
    assigned_products = set()
    
    for i in range(num):
        supplier_id = i + 1
        supplier_name = fake.company()
        
        # Each supplier provides 1-3 products
        num_provided = random.randint(1, 3)
        provided_products = random.sample(list(product_ids), min(num_provided, len(product_ids)))
        
        for product_id in provided_products:
            suppliers.append({
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "product_id": product_id,
                "lead_time_days": random.randint(1, 30),
                "reliability_score": round(random.uniform(0.7, 1.0), 2)
            })
            assigned_products.add(product_id)
    
    # Ensure all products have at least one supplier
    remaining_products = set(product_ids) - assigned_products
    for product_id in remaining_products:
        suppliers.append({
            "supplier_id": num + 1,
            "supplier_name": fake.company(),
            "product_id": product_id,
            "lead_time_days": random.randint(1, 30),
            "reliability_score": round(random.uniform(0.7, 1.0), 2)
        })
    
    return pd.DataFrame(suppliers)

def main():
    print("Generating customers...")
    customers = generate_customers(NUM_CUSTOMERS)
    
    print("Generating products...")
    products = generate_products(NUM_PRODUCTS)
    
    print("Generating sales transactions...")
    sales = generate_sales(customers, products, NUM_TRANSACTIONS)
    
    print("Generating support tickets...")
    tickets = generate_support_tickets(customers, products, NUM_TICKETS)
    
    print("Generating suppliers...")
    suppliers = generate_suppliers(products, NUM_SUPPLIERS)
    
    # Save to CSV
    print("Saving data to CSV files...")
    customers.to_csv('backend/data/customers.csv', index=False)
    products.to_csv('backend/data/products.csv', index=False)
    sales.to_csv('backend/data/sales_transactions.csv', index=False)
    tickets.to_csv('backend/data/support_tickets.csv', index=False)
    suppliers.to_csv('backend/data/supplier_data.csv', index=False)
    
    print("Data generation complete!")

if __name__ == "__main__":
    main()