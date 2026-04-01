import React, { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button, Card, Input, Dialog } from '../../components/ui'
import { LogOut, LayoutDashboard, Users, Settings, UserX, Trash2, UserCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { AdminProducts } from './Products'
import { AdminIngredients } from './Ingredients'
import { usersAPI } from '../../services/api'

// Main Admin Dashboard Layout
export const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/admin/users', label: 'Users', icon: Users, end: true },
    { path: '/admin/products', label: 'Products', icon: LayoutDashboard },
    { path: '/admin/ingredients', label: 'Ingredients', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">Crusties</h1>
          <p className="text-sm text-gray-500">Admin Panel</p>
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
              {user?.name?.charAt(0) || 'A'}
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
          <Route index element={<AdminUsers />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="ingredients" element={<AdminIngredients />} />
        </Routes>
      </main>
    </div>
  )
}

// ── Confirmation Modal ────────────────────────────────────────────────
const ConfirmModal = ({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Admin Users Management ────────────────────────────────────────────
const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'active' | 'suspended'
  const [modal, setModal] = useState(null) // { type, userId, userName }
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserLoading, setNewUserLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await usersAPI.getAll()
      setUsers(res.data)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId) => {
    try {
      await usersAPI.approve(userId)
      toast.success('User approved successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to approve user')
    }
  }

  const handleReject = async (userId) => {
    try {
      await usersAPI.reject(userId)
      toast.success('User rejected')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to reject user')
    }
    setModal(null)
  }

  const handleSuspend = async (userId) => {
    try {
      await usersAPI.suspend(userId)
      toast.success('User suspended')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to suspend user')
    }
    setModal(null)
  }

  const handleUnsuspend = async (userId) => {
    try {
      await usersAPI.unsuspend(userId)
      toast.success('User reactivated')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to reactivate user')
    }
  }

  const handleDelete = async (userId) => {
    try {
      await usersAPI.delete(userId)
      toast.success('User permanently deleted')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
    setModal(null)
  }

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast.error('Please provide name, email, and password for the new user')
      return
    }
    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    setNewUserLoading(true)
    try {
      await usersAPI.create({
        email: newUserEmail,
        name: newUserName,
        phone: newUserPhone,
        password: newUserPassword
      })
      toast.success('User created successfully')
      setCreateUserOpen(false)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPhone('')
      setNewUserPassword('')
      fetchUsers()
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to create user')
    } finally {
      setNewUserLoading(false)
    }
  }

  // Filter users by tab
  const pendingUsers = users.filter((u) => !u.approved && !u.suspended)
  const activeUsers = users.filter((u) => u.approved && !u.suspended)
  const suspendedUsers = users.filter((u) => u.suspended)

  const tabUsers = activeTab === 'pending' ? pendingUsers : activeTab === 'active' ? activeUsers : suspendedUsers

  const tabs = [
    { key: 'pending', label: 'Pending', count: pendingUsers.length, color: 'text-yellow-600' },
    { key: 'active', label: 'Active', count: activeUsers.length, color: 'text-green-600' },
    { key: 'suspended', label: 'Suspended', count: suspendedUsers.length, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Approve, suspend, or permanently remove users</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs font-bold ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setCreateUserOpen(true)}>
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold">Joined</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tabUsers.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3 px-4 text-gray-600">{u.phone || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">

                        {/* PENDING tab actions */}
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              <UserCheck size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => setModal({ type: 'reject', userId: u.id, userName: u.name })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* ACTIVE tab actions */}
                        {activeTab === 'active' && (
                          <button
                            onClick={() => setModal({ type: 'suspend', userId: u.id, userName: u.name })}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
                          >
                            <ShieldOff size={14} />
                            Suspend
                          </button>
                        )}

                        {/* SUSPENDED tab actions */}
                        {activeTab === 'suspended' && (
                          <button
                            onClick={() => handleUnsuspend(u.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            <UserCheck size={14} />
                            Reactivate
                          </button>
                        )}

                        {/* DELETE — always visible for non-admin users */}
                        <button
                          onClick={() => setModal({ type: 'delete', userId: u.id, userName: u.name })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tabUsers.length === 0 && (
              <div className="text-center py-12">
                <UserX size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {activeTab === 'pending' && 'No pending users'}
                  {activeTab === 'active' && 'No active users'}
                  {activeTab === 'suspended' && 'No suspended users'}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Confirm: Suspend */}
      <ConfirmModal
        open={modal?.type === 'suspend'}
        title="Suspend User"
        message={`Temporarily suspend ${modal?.userName}? They won't be able to log in until reactivated.`}
        confirmLabel="Suspend"
        confirmClass="bg-orange-500 hover:bg-orange-600"
        onConfirm={() => handleSuspend(modal.userId)}
        onCancel={() => setModal(null)}
      />

      {/* Confirm: Delete */}
      <ConfirmModal
        open={modal?.type === 'delete'}
        title="Permanently Delete User"
        message={`This will permanently delete ${modal?.userName} and all their data. This cannot be undone.`}
        confirmLabel="Yes, Delete Permanently"
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={() => handleDelete(modal.userId)}
        onCancel={() => setModal(null)}
      />

      {/* Confirm: Reject */}
      <ConfirmModal
        open={modal?.type === 'reject'}
        title="Reject User"
        message={`Reject ${modal?.userName}'s registration request? This will remove their account.`}
        confirmLabel="Reject"
        confirmClass="bg-yellow-500 hover:bg-yellow-600"
        onConfirm={() => handleReject(modal.userId)}
        onCancel={() => setModal(null)}
      />

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen} title="Create New User" className="max-w-lg">
        <div className="space-y-4">
          <Input
            label="Full name"
            placeholder="Jane Doe"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Input
            type="email"
            label="Email address"
            placeholder="jane@example.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <Input
            type="tel"
            label="Phone number"
            placeholder="+254712345678"
            value={newUserPhone}
            onChange={(e) => setNewUserPhone(e.target.value)}
          />
          <Input
            type="password"
            label="Password"
            placeholder="Choose a secure password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
          <p className="text-xs text-gray-500">Password must be unique across accounts and at least 6 characters.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCreateUserOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreateUser}
              disabled={newUserLoading}
            >
              {newUserLoading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

// ── Admin Settings ────────────────────────────────────────────────────
const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure system-wide settings</p>
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">General Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
            <input type="text" defaultValue="Crusties" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
            <input type="email" defaultValue="support@crusties.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input type="tel" defaultValue="+254712345678" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <Button className="w-full">Save Settings</Button>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Security Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
            </div>
            <input type="checkbox" className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">IP Whitelist</p>
              <p className="text-sm text-gray-500">Restrict admin access to specific IPs</p>
            </div>
            <input type="checkbox" className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </div>
  )
}

const StatCard = ({ icon, label, value }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  </Card>
)


