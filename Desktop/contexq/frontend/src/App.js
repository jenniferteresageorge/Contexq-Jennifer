// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const API_URL = 'http://localhost:8000';
const cardStyle = {
  boxShadow: '0 4px 20px rgba(27, 3, 50, 0.4)',
  borderRadius: 3,
  height: '100%',
  backgroundColor: '#FBFAFA'
};
function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/dashboard/stats`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        //console.log('Dashboard stats data:', data); // Add this for debugging
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return <Typography color="error">Failed to load dashboard statistics</Typography>;
  }

  //const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'];


  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} md={4}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h6" color="textSecondary">Total Customers</Typography>
            <Typography variant="h4">{stats.total_customers}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h6" color="textSecondary">Total Sales</Typography>
            <Typography variant="h4">${stats.total_sales.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h6" color="textSecondary">Open Tickets</Typography>
            <Typography variant="h4">{stats.open_tickets}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Sales by Region */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h7" gutterBottom>Sales by Region</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.sales_by_region}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip 
                formatter={(value, name) => [`$${parseFloat(value).toLocaleString()}`, 'Sales']} />
                <Legend />
                <Bar dataKey="total_sales" fill="#8884d8" name="Sales ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Products */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Top Products by Sales</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.top_products}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="total_sales"
                  nameKey="product_name"
                  //label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  label={({ name, value, percent }) => {
  const truncated = name.length > 20 ? name.slice(0, 14) + '…' : name;
  return `${truncated}: $${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`;
}}

                  //label={({ name, value, percent }) =>
                  //`${name}: $${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`
                //}
                >
                  {stats.top_products.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Sales Trend */}
      <Grid item xs={12}>
        <Card sx={cardStyle}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sales Trend (Last 12 Months)</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_sales" stroke="#8884d8" name="Sales ($)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${API_URL}/customers?limit=100`);
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter ? customer.industry === industryFilter : true;
    const matchesRegion = regionFilter ? customer.region === regionFilter : true;
    return matchesSearch && matchesIndustry && matchesRegion;
  });

  const industries = [...new Set(customers.map(c => c.industry))];
  const regions = [...new Set(customers.map(c => c.region))];

  return (
    <div>
      <Typography variant="h4" gutterBottom>Customers</Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Search Customers"
            variant="filled"
            InputProps={{ style: { backgroundColor: 'white' } }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Industry</InputLabel>
            <Select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              label="Industry"
              variant="filled"
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
            >
              <MenuItem value="">All Industries</MenuItem>
              {industries.map(industry => (
                <MenuItem key={industry} value={industry}>{industry}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Region</InputLabel>
            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              label="Region"
              variant="filled"
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
            >
              <MenuItem value="">All Regions</MenuItem>
              {regions.map(region => (
                <MenuItem key={region} value={region}>{region}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Join Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map(customer => (
                <TableRow key={customer.customer_id}>
                  <TableCell>{customer.customer_id}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>{customer.industry}</TableCell>
                  <TableCell>{customer.region}</TableCell>
                  <TableCell>{customer.join_date}</TableCell>
                  <TableCell>
                    <Link to={`/customers/${customer.customer_id}`} style={{ textDecoration: 'none' }}>
                      View Details
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </div>
  );
}
//import { useParams } from 'react-router-dom';

function CustomerDetail({  }) {
  const { customerId } = useParams(); 
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Correct URL format
        const response = await fetch(`${API_URL}/customers/${customerId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch customer data');
        }
        const data = await response.json();
        
        console.log("Customer API response:", data);
        
        // Adjust based on your actual API response format
        if (!data || (!data.customer && !data.id)) {
          throw new Error('Customer data not available in expected format');
        }
        
        // If your API returns customer directly (not nested)
        const customerData = data.customer ? data : { customer: data };
        
        setCustomer(customerData);
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!customer) {
    return <Typography color="error">Customer not found</Typography>;
  }

  // Safely access nested properties with fallbacks
  const customerInfo = customer.customer || {};
  const totalSpent = customer.total_spent || 0;
  const totalTransactions = customer.total_transactions || 0;
  const openTickets = customer.open_tickets || 0;
  const avgSentiment = customer.avg_sentiment || 0;
  const favoriteCategory = customer.favorite_category || 'N/A';

  return (
    <div>
      <Typography variant="h4" gutterBottom>{customerInfo.customer_name || 'Unknown Customer'}</Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Customer Information</Typography>
              <Typography>Industry: {customerInfo.industry || 'N/A'}</Typography>
              <Typography>Region: {customerInfo.region || 'N/A'}</Typography>
              <Typography>Member Since: {customerInfo.join_date || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Purchase Summary</Typography>
              <Typography>Total Spent: ${totalSpent.toLocaleString()}</Typography>
              <Typography>Transactions: {totalTransactions}</Typography>
              <Typography>Favorite Category: {favoriteCategory}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Support Summary</Typography>
              <Typography>Open Tickets: {openTickets}</Typography>
              <Typography>Average Sentiment: {avgSentiment.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Typography variant="h5" gutterBottom>Recent Transactions</Typography>
      <CustomerTransactions customerId={customerId} />
    </div>
  );
}

function CustomerTransactions({ customerId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${API_URL}/sales`);
        const allTransactions = await response.json();
        const customerTransactions = allTransactions.filter(
          t => t.customer_id === parseInt(customerId)
        ).slice(0, 10); // Limit to 10 most recent
        setTransactions(customerTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [customerId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Product ID</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map(transaction => (
            <TableRow key={transaction.transaction_id}>
              <TableCell>{transaction.transaction_date}</TableCell>
              <TableCell>{transaction.product_id}</TableCell>
              <TableCell>{transaction.quantity}</TableCell>
              <TableCell>${transaction.sale_amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products?limit=50`);
        
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div>
      <Typography variant="h4" gutterBottom>Products</Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search Products"
            variant="filled"
            InputProps={{ style: { backgroundColor: 'white' } }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
              variant="filled"
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Cost Price</TableCell>
                <TableCell>Sales Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.product_id}>
                  <TableCell>{product.product_id}</TableCell>
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>${product.cost_price.toFixed(2)}</TableCell>
                  <TableCell>${product.sales_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Link to={`/products/${product.product_id}`} style={{ textDecoration: 'none' }}>
                      View Details
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </div>
  );
}
//import { useParams } from 'react-router-dom';

function ProductDetail({  }) {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Correct URL format - use query parameter properly
        const response = await fetch(`${API_URL}/products/${productId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch product data');
        }
        const data = await response.json();
        
        // Debug the response
        console.log("Product API response:", data);
        
        // Adjust this check based on your actual API response format
        if (!data || (!data.product && !data.id)) {
          throw new Error('Product data not available in expected format');
        }
        
        // If your API returns the product directly (not nested in "product" property)
        // You may need to adjust this based on actual response
        const productData = data.product ? data : { product: data };
        
        setProduct(productData);
        
        // Fetch recommendations (also fix this URL)
        setRecLoading(true);
        const recResponse = await fetch(`${API_URL}/recommendations/${productId}`);

        if (recResponse.ok) {
          const recData = await recResponse.json();
          setRecommendations(recData);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setRecLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!product) {
    return <Typography color="error">Product not found</Typography>;
  }

  // Safely access nested properties with fallbacks
  const productInfo = product.product || {};
  const totalSales = product.total_sales || 0;
  const totalQuantity = product.total_quantity || 0;
  const profit = product.profit || 0;
  const avgSentiment = product.avg_sentiment || 0;
  const commonIssues = product.common_issues || [];

  return (
    <div>
      <Typography variant="h4" gutterBottom>{productInfo.product_name || 'Unknown Product'}</Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Product Information</Typography>
              <Typography>Category: {productInfo.category || 'N/A'}</Typography>
              <Typography>Cost Price: ${(productInfo.cost_price || 0).toFixed(2)}</Typography>
              <Typography>Sales Price: ${(productInfo.sales_price || 0).toFixed(2)}</Typography>
              <Typography>Profit Margin: {
                productInfo.cost_price && productInfo.sales_price ? 
                (((productInfo.sales_price - productInfo.cost_price) / productInfo.cost_price * 100).toFixed(1) + '%') : 
                'N/A'
              }</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Sales Performance</Typography>
              <Typography>Total Sales: ${totalSales.toLocaleString()}</Typography>
              <Typography>Total Quantity Sold: {totalQuantity}</Typography>
              <Typography>Total Profit: ${profit.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Customer Feedback</Typography>
              <Typography>Average Sentiment: {avgSentiment.toFixed(2)}</Typography>
              <Typography>Common Issues:</Typography>
              <ul>
                {commonIssues.length > 0 ? (
                  commonIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))
                ) : (
                  <li>No common issues reported</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h6">Frequently Bought Together</Typography>
              {recLoading ? (
                <CircularProgress size={24} />
              ) : recommendations.length > 0 ? (
                <ul>
                  {recommendations.map(rec => (
                    <li key={rec.product_id}>
                      {rec.product_name || 'Unknown Product'} (confidence: {rec.confidence || 0})
                    </li>
                  ))}
                </ul>
              ) : (
                <Typography>No recommendations available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
function App() {
  return (
    <Router>
      <AppBar position="fixed" sx={{ backgroundColor: '#07233F' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Business Insights Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2}}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none'}}>Dashboard</Link>
            <Link to="/customers" style={{ color: 'white', textDecoration: 'none' }}>Customers</Link>
            <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>Products</Link>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 8, mb: 0, backgroundColor: '#ededed', padding: 3, borderRadius: 2 }}>
        <Routes>
          <Route path="/" element={<DashboardStats />} />
          <Route path="/customers" element={<CustomersList />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;