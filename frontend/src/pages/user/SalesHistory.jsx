import React, { useState, useEffect } from 'react'
import { Card, Table } from '../../components/ui'
import { salesAPI } from '../../services/api'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '../../utils/formatting'

export const UserSalesHistory = () => {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const res = await salesAPI.getAll()
      setSales(res.data)
    } catch (error) {
      toast.error('Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
    {
      key: 'items',
      label: 'Items',
      render: (items) => (
        <div className="text-sm">
          {items.map((item, idx) => (
            <div key={idx}>{item.product_name} x{item.quantity}</div>
          ))}
        </div>
      )
    },
    { key: 'total', label: 'Total', render: (v) => formatCurrency(v) }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sales History</h2>
      <Card>
        <Table columns={columns} data={sales} loading={loading} />
      </Card>
    </div>
  )
}
