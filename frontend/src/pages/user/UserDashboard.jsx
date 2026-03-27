import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button, Card, Input } from '../../components/ui'
import { 
  Menu, X, LogOut, ShoppingCart, Plus, TrendingUp, History, Clock, 
  CheckCircle 
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '../../utils/formatting'
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip 
} from 'recharts'

// User pages
import { UserPOS } from './POS'
import { UserSalesHistory } from './SalesHistory'

// Mock userAPI - replace with actual API when available
const userAPI = {
  getDashboard: async () => ({ data: { todays_revenue: 0, orders_today: 0 } }),
  getProfile: async () => ({ data: { user: {} } }),
  getSalesHistory: async () => ({ data: { sales: [] } })
}

export const UserDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-primary font-outfit">Crusties</h1>
          <p className="text-sm text-gray-600">Point of Sale</p>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            to="/user/pos"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isActive('/user/pos')
                ? 'bg-primary text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingCart size={20} />
            POS
          </Link>
          <Link
            to="/user/history"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              isActive('/user/history')
                ? 'bg-primary text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingCart size={20} />
            Sales History
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 className="text-xl font-bold flex-1 text-center md:text-left">
            {location.pathname === '/user/pos' && 'Point of Sale'}
            {location.pathname === '/user/history' && 'Sales History'}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route path="/pos" element={<UserPOS />} />
            <Route path="/history" element={<UserSalesHistory />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

// User Overview Dashboard
const UserOverview = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await userAPI.getMyStats()
      setStats(res.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
          <p className="text-gray-500 mt-1">Here's your sales overview</p>
        </div>
        <NavLink to="/user/pos" className="inline-flex">
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            New Sale
          </Button>
        </NavLink>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<ShoppingCart className="text-blue-500" />}
          label="Total Sales"
          value={stats?.total_sales || 0}
          trend="All time"
        />
        <StatCard
          icon={<TrendingUp className="text-green-500" />}
          label="Total Revenue"
          value={formatCurrency(stats?.total_revenue || 0)}
          trend="All time"
        />
        <StatCard
          icon={<Clock className="text-orange-500" />}
          label="Today's Sales"
          value={stats?.today_sales || 0}
          trend="Today"
        />
        <StatCard
          icon={<CheckCircle className="text-purple-500" />}
          label="Pending Approval"
          value={stats?.pending_approval || 0}
          trend="Awaiting admin"
        />
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Earnings */}
        <Card className="p-6 bg-gradient-to-br from-primary to-orange-500 text-white lg:col-span-2">
          <h2 className="text-lg opacity-90">Today's Earnings</h2>
          <p className="text-4xl font-bold mt-2">{formatCurrency(stats?.today_revenue || 0)}</p>
          <p className="text-sm opacity-75 mt-2">{stats?.today_sales || 0} sales completed</p>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <NavLink to="/user/pos" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-blue-900 font-medium">
              <ShoppingCart className="inline mr-2" size={18} />
              Make a Sale
            </NavLink>
            <NavLink to="/user/sales" className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-purple-900 font-medium">
              <History className="inline mr-2" size={18} />
              View History
            </NavLink>
            <NavLink to="/user/analytics" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition text-green-900 font-medium">
              <TrendingUp className="inline mr-2" size={18} />
              Analytics
            </NavLink>
          </div>
        </Card>
      </div>

      {/* Recent Sales Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-center py-3 px-4 font-semibold">Quantity</th>
                <th className="text-right py-3 px-4 font-semibold">Amount</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_sales || []).slice(0, 5).map((sale, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{sale.product_name}</td>
                  <td className="py-3 px-4 text-center">{sale.quantity}</td>
                  <td className="py-3 px-4 text-right font-bold">{formatCurrency(sale.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.recent_sales || stats.recent_sales.length === 0) && (
            <p className="text-center text-gray-500 py-8">No recent sales</p>
          )}
        </div>
      </Card>
    </div>
  )
}

// POS System Component
const POSSystem = () => {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])

  const products = [
    { id: 1, name: 'Samosa', price: 50 },
    { id: 2, name: 'Mandazi', price: 30 },
    { id: 3, name: 'Chapati', price: 40 },
    { id: 4, name: 'Nyama Choma', price: 150 },
    { id: 5, name: 'Ugali', price: 60 },
    { id: 6, name: 'Rice & Beans', price: 80 },
  ]

  const addToCart = () => {
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }
    const product = products.find(p => p.id === parseInt(selectedProduct))
    setCart([...cart, { ...product, quantity: parseInt(quantity) }])
    setSelectedProduct('')
    setQuantity(1)
    toast.success('Added to cart')
  }

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }
    toast.success('Sale recorded successfully!')
    setCart([])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">POS System</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Select Products</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choose a product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={addToCart} className="w-full">
              Add to Cart
            </Button>
          </div>

          {/* Product Grid */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Quick Select</h3>
            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(String(p.id))
                    setQuantity(1)
                  }}
                  className="p-4 bg-gray-100 rounded-lg hover:bg-primary hover:text-white transition text-center"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm">{formatCurrency(p.price)}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Cart Summary */}
        <Card className="p-6 h-fit">
          <h2 className="text-xl font-bold mb-4">Cart</h2>
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Cart is empty</p>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.price)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="text-red-600 hover:text-red-800 text-sm font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full">
              Checkout
            </Button>
            <Button
              variant="outline"
              onClick={() => setCart([])}
              className="w-full"
            >
              Clear Cart
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Sales History Component
const SalesHistory = () => {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalesHistory()
  }, [])

  const fetchSalesHistory = async () => {
    try {
      const res = await userAPI.getRecentSales()
      setSales(res.data)
    } catch (error) {
      toast.error('Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-center py-3 px-4 font-semibold">Qty</th>
                <th className="text-right py-3 px-4 font-semibold">Amount</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-8">
                    No sales recorded yet
                  </td>
                </tr>
              ) : (
                sales.map((sale, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDate(sale.date)}</td>
                    <td className="py-3 px-4">{sale.product_name}</td>
                    <td className="py-3 px-4 text-center">{sale.quantity}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(sale.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// User Analytics Component
const UserAnalytics = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await userAPI.getMyStats()
      setStats(res.data)
    } catch (error) {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const COLORS = ['#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800']

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <h3 className="text-lg opacity-90">Total Sales</h3>
          <p className="text-4xl font-bold mt-2">{stats?.total_sales || 0}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <h3 className="text-lg opacity-90">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">{formatCurrency(stats?.total_revenue || 0)}</p>
        </Card>
      </div>

      {/* Sales Breakdown */}
      {stats?.product_breakdown && stats.product_breakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Sales by Product</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.product_breakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.product_breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}

// Stat Card Component
const StatCard = ({ icon, label, value, trend }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      {trend && <p className="text-xs text-gray-500">{trend}</p>}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  </Card>
)
