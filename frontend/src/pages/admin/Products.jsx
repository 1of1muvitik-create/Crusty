import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Dialog, Table, Select } from '../../components/ui'
import { formatCurrency } from '../../utils/formatting'
import { productsAPI, recipesAPI, ingredientsAPI } from '../../services/api'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

export const AdminProducts = () => {
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [recipe, setRecipe] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image_url: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, ingredientsRes] = await Promise.all([
        productsAPI.getAll(),
        ingredientsAPI.getAll()
      ])
      setProducts(productsRes.data)
      setIngredients(ingredientsRes.data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill all fields')
      return
    }

    try {
      await productsAPI.create({
        name: formData.name,
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        recipe: []
      })
      toast.success('Product created successfully')
      setFormData({ name: '', price: '', image_url: '' })
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to create product')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await productsAPI.delete(id)
      toast.success('Product deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete product')
    }
  }

  const handleViewRecipe = async (product) => {
    setSelectedProduct(product)
    try {
      const res = await recipesAPI.getByProduct(product.id)
      if (res.data.ingredients) {
        setRecipe(res.data.ingredients)
      } else {
        setRecipe([])
      }
    } catch (error) {
      setRecipe([])
    }
    setRecipeDialogOpen(true)
  }

  const handleAddIngredient = () => {
    setRecipe([...recipe, { ingredient_id: '', quantity: 0 }])
  }

  const handleSaveRecipe = async () => {
    const selectedIngredients = recipe.filter(ing => ing.ingredient_id)
    if (!selectedProduct || selectedIngredients.length === 0) {
      toast.error('Add at least one ingredient')
      return
    }

    try {
      await recipesAPI.create({
        product_id: selectedProduct.id,
        ingredients: selectedIngredients
      })
      toast.success('Recipe saved')
      setRecipeDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to save recipe')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button
          variant="primary"
          onClick={() => {
            setFormData({ name: '', price: '', image_url: '' })
            setDialogOpen(true)
          }}
        >
          <Plus size={18} />
          Add Product
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          products.map(product => (
            <Card key={product.id} className="flex flex-col">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <p className="text-primary font-bold text-lg mb-2">{formatCurrency(product.price)}</p>
              <p className={`text-sm mb-2 ${product.available_quantity <= 0 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                {product.available_quantity <= 0 ? 'Unavailable' : `Available: ${product.available_quantity}`}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Recipe: {product.recipe?.length || 0} ingredient{product.recipe?.length === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2 mt-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewRecipe(product)}
                >
                  Recipe
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add Product"
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Chicken Burger"
          />
          <Input
            label="Price (KES)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="250"
          />
          <Input
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
        title={`Recipe for ${selectedProduct?.name}`}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {recipe.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  options={ingredients.map(i => ({ value: i.id, label: i.name }))}
                  value={ing.ingredient_id}
                  onChange={(e) => {
                    const newRecipe = [...recipe]
                    newRecipe[idx].ingredient_id = e.target.value
                    setRecipe(newRecipe)
                  }}
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  step="0.1"
                  value={ing.quantity}
                  onChange={(e) => {
                    const newRecipe = [...recipe]
                    newRecipe[idx].quantity = parseFloat(e.target.value) || 0
                    setRecipe(newRecipe)
                  }}
                  placeholder="Qty"
                  className="w-full"
                />
              </div>
              <Button variant="ghost" onClick={() => setRecipe(recipe.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={handleAddIngredient} className="w-full">
            + Add Ingredient
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setRecipeDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRecipe} className="flex-1">
              Save Recipe
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
