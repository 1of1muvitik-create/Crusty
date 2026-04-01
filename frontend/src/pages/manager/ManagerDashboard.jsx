import React, { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button, Card } from '../../components/ui'
import { managerAPI } from '../../services/api'
import { formatCurrency } from '../../utils/formatting'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { LogOut, LayoutDashboard, BarChart3, Users, TrendingUp, DollarSign, ShoppingCart, Activity } from 'lucide-react'
import { toast } from 'sonner'

// Main Manager Dashboard Layout
export const ManagerDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/manager', label: 'Overview', icon: LayoutDashboard, end: true },
    { path: '/manager/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/manager/performance', label: 'Sales Performance', icon: TrendingUp },
    { path: '/manager/users', label: 'Users', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">Crusties</h1>
          <p className="text-sm text-gray-500">Manager Panel</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'M'}
            </div>
            <div>
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route index element={<ManagerOverview />} />
          <Route path="analytics" element={<ManagerAnalytics />} />
          <Route path="performance" element={<ManagerSalesPerformance />} />
          <Route path="users" element={<ManagerUsers />} />
        </Routes>
      </main>
    </div>
  )
}

// Overview Dashboard with Line Graphs
const ManagerOverview = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await managerAPI.getDashboard()
      setStats(res.data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<DollarSign className="text-green-500" />}
          label="Total Revenue"
          value={formatCurrency(stats?.total_revenue || 0)}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          icon={<ShoppingCart className="text-blue-500" />}
          label="Total Sales"
          value={stats?.total_sales || 0}
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          icon={<Users className="text-purple-500" />}
          label="Active Users"
          value={stats?.total_users || 0}
          trend="+3"
          trendUp={true}
        />
        <StatCard
          icon={<Activity className="text-orange-500" />}
          label="Avg Sale Value"
          value={formatCurrency(stats?.total_sales ? stats.total_revenue / stats.total_sales : 0)}
          trend="+5%"
          trendUp={true}
        />
      </div>

      {/* Sales Trend Line Graph */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sales Trend</h2>
            <p className="text-sm text-gray-500">Revenue over the last 30 days</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp size={16} />
            <span>+12% from last month</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={stats?.sales_trend || []}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5722" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF5722" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FF5722"
              strokeWidth={3}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Selling Products</h2>
          <div className="space-y-4">
            {(stats?.top_products || []).slice(0, 5).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-gray-500">{product.quantity_sold} units sold</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
            {(!stats?.top_products || stats.top_products.length === 0) && (
              <p className="text-center text-gray-500 py-4">No sales data yet</p>
            )}
          </div>
        </Card>

        {/* Top Sellers */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Sellers</h2>
          <div className="space-y-4">
            {(stats?.top_sellers || []).slice(0, 5).map((seller, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{seller.user_name}</p>
                  <p className="text-sm text-gray-500">{seller.total_sales} sales</p>
                </div>
                <p className="font-bold text-green-600">{formatCurrency(seller.total_revenue)}</p>
              </div>
            ))}
            {(!stats?.top_sellers || stats.top_sellers.length === 0) && (
              <p className="text-center text-gray-500 py-4">No top sellers yet</p>
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Summary</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Daily Average</span>
                <span className="text-2xl font-bold text-blue-700">
                  {formatCurrency((stats?.total_revenue || 0) / 30)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-700">Best Day Revenue</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(Math.max(...(stats?.sales_trend?.map(d => d.revenue) || [0])))}
                </span>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-purple-700">Active Products</span>
                <span className="text-2xl font-bold text-purple-700">
                  {stats?.top_products?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Analytics Page with Multiple Line Graphs
const ManagerAnalytics = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await managerAPI.getDashboard()
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Detailed sales and revenue analytics</p>
      </div>

      {/* Revenue Line Graph */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Revenue Trend (30 Days)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={stats?.sales_trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#FF5722"
              strokeWidth={3}
              dot={{ fill: '#FF5722', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#FF5722', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <h3 className="text-lg opacity-90">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">{formatCurrency(stats?.total_revenue || 0)}</p>
          <p className="text-sm opacity-75 mt-2">All time earnings</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <h3 className="text-lg opacity-90">Total Sales</h3>
          <p className="text-4xl font-bold mt-2">{stats?.total_sales || 0}</p>
          <p className="text-sm opacity-75 mt-2">Completed transactions</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <h3 className="text-lg opacity-90">Active Users</h3>
          <p className="text-4xl font-bold mt-2">{stats?.total_users || 0}</p>
          <p className="text-sm opacity-75 mt-2">Approved accounts</p>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Product Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Rank</th>
                <th className="text-left py-3 px-4 font-semibold">Product</th>
                <th className="text-right py-3 px-4 font-semibold">Units Sold</th>
                <th className="text-right py-3 px-4 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.top_products || []).map((product, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-primary">#{idx + 1}</td>
                  <td className="py-3 px-4">{product.product_name}</td>
                  <td className="py-3 px-4 text-right">{product.quantity_sold}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">
                    {formatCurrency(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.top_products || stats.top_products.length === 0) && (
            <p className="text-center text-gray-500 py-8">No product data available</p>
          )}
        </div>
      </Card>
    </div>
  )
}

// Sales Performance Page
const ManagerUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await managerAPI.getUsers()
      setUsers(res.data)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">List of system users available to the manager.</p>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Phone</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-gray-600">{user.phone || '—'}</td>
                  <td className="py-3 px-4 text-sm">
                    {user.suspended ? (
                      <span className="inline-flex px-2 py-1 rounded-full bg-red-100 text-red-700">Suspended</span>
                    ) : user.approved ? (
                      <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-gray-500 py-8">No users found</p>
          )}
        </div>
      </Card>
    </div>
  )
}

const ManagerSalesPerformance = () => {
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchPerformance()
  }, [days])

  const fetchPerformance = async () => {
    try {
      setLoading(true)
      const res = await managerAPI.getSalesPerformance(days)
      setSalesData(res.data)
    } catch (error) {
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = salesData.reduce((sum, item) => sum + item.total_revenue, 0)

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
          <h1 className="text-3xl font-bold text-gray-900">Sales Performance</h1>
          <p className="text-gray-500 mt-1">Track user sales performance</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Active Sellers</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{salesData.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Top Performer</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {salesData.length > 0 ? salesData[0].user_name : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">User Performance Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="user_name" 
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="total_revenue"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Performance Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Detailed Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Rank</th>
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-right py-3 px-4 font-semibold">Sales Count</th>
                <th className="text-right py-3 px-4 font-semibold">Total Revenue</th>
                <th className="text-right py-3 px-4 font-semibold">Avg Sale</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((user, idx) => (
                <tr key={user.user_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{user.user_name}</td>
                  <td className="py-3 px-4 text-right">{user.total_sales}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">
                    {formatCurrency(user.total_revenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(user.total_sales ? user.total_revenue / user.total_sales : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesData.length === 0 && (
            <p className="text-center text-gray-500 py-8">No performance data available</p>
          )}
        </div>
      </Card>
    </div>
  )
}

// Reusable Stat Card Component
const StatCard = ({ icon, label, value, trend, trendUp }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  </Card>
)
