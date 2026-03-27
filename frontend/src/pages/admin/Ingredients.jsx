import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Dialog } from '../../components/ui'
import { ingredientsAPI } from '../../services/api'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

export const AdminIngredients = () => {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    quantity: ''
  })

  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      setLoading(true)
      const res = await ingredientsAPI.getAll()
      setIngredients(res.data)
    } catch (error) {
      toast.error('Failed to load ingredients')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.quantity) {
      toast.error('Please fill all fields')
      return
    }

    try {
      if (editingId) {
        await ingredientsAPI.update(editingId, {
          name: formData.name,
          unit: formData.unit,
          quantity: parseFloat(formData.quantity)
        })
        toast.success('Ingredient updated')
      } else {
        await ingredientsAPI.create({
          name: formData.name,
          unit: formData.unit,
          quantity: parseFloat(formData.quantity)
        })
        toast.success('Ingredient created')
      }
      setFormData({ name: '', unit: 'kg', quantity: '' })
      setEditingId(null)
      setDialogOpen(false)
      fetchIngredients()
    } catch (error) {
      toast.error('Failed to save ingredient')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ingredient?')) return
    try {
      await ingredientsAPI.delete(id)
      toast.success('Ingredient deleted')
      fetchIngredients()
    } catch (error) {
      toast.error('Failed to delete ingredient')
    }
  }

  const openEdit = (ingredient) => {
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: ingredient.quantity.toString()
    })
    setEditingId(ingredient.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ingredients</h2>
        <Button
          variant="primary"
          onClick={() => {
            setFormData({ name: '', unit: 'kg', quantity: '' })
            setEditingId(null)
            setDialogOpen(true)
          }}
        >
          <Plus size={18} />
          Add Ingredient
        </Button>
      </div>

      {/* Ingredients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading ingredients...</p>
        ) : ingredients.length === 0 ? (
          <p>No ingredients found</p>
        ) : (
          ingredients.map(ingredient => (
            <Card key={ingredient.id}>
              <h3 className="font-bold text-lg mb-2">{ingredient.name}</h3>
              <p className="text-gray-600 mb-4">
                {ingredient.quantity} {ingredient.unit}
                {ingredient.quantity < 5 && ' ⚠️'}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(ingredient)}>
                  <Edit2 size={16} />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(ingredient.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Edit Ingredient' : 'Add Ingredient'}>
        <div className="space-y-4">
          <Input
            label="Ingredient Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Rice"
          />
          <div className="flex gap-2">
            <Input
              label="Quantity"
              type="number"
              step="0.1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="10"
              className="flex-1"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
                <option value="pieces">pieces</option>
                <option value="grams">grams</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} className="flex-1">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
