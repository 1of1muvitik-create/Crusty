import React, { useState, useEffect } from 'react'
import { Card, Button, Dialog, Input } from '../../components/ui'
import { formatCurrency } from '../../utils/formatting'
import { productsAPI, salesAPI } from '../../services/api'
import { ShoppingCart, Plus, Minus, X, Check } from 'lucide-react'
import { toast } from 'sonner'

export const UserPOS = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await productsAPI.getAll()
      setProducts(res.data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product) => {
    if ((product.available_quantity ?? 0) <= 0) {
      toast.error('Out of stock')
      return
    }

    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity < (product.available_quantity ?? 0)) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      } else {
        toast.error('Cannot exceed available quantity')
      }
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }])
    }
    toast.success(`${product.name} added to cart`)
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      const product = products.find(p => p.id === productId)
      if (quantity <= (product.available_quantity ?? 0)) {
        setCart(cart.map(item =>
          item.id === productId
            ? { ...item, quantity }
            : item
        ))
      } else {
        toast.error('Cannot exceed available quantity')
      }
    }
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first')
      return
    }

    setCheckoutLoading(true)
    try {
      const items = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }))

      await salesAPI.create({ items })
      toast.success('Sale recorded successfully!')
      setCart([])
      setCartOpen(false)
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete sale')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No products available</p>
        ) : (
          products.map(product => (
            <Card key={product.id} className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-3" />
              )}
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <p className="text-primary font-bold text-xl mb-2">{formatCurrency(product.price)}</p>
              <p className={`text-sm mb-4 ${((product.available_quantity ?? 0) <= 0) ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                {(product.available_quantity ?? 0) <= 0 ? 'Out of Stock' : `Available: ${product.available_quantity}`}
              </p>
              <Button
                variant={(product.available_quantity ?? 0) <= 0 ? 'ghost' : 'primary'}
                onClick={() => addToCart(product)}
                disabled={(product.available_quantity ?? 0) <= 0}
                className="w-full"
              >
                <Plus size={18} />
                Add to Cart
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            variant="primary"
            onClick={() => setCartOpen(true)}
            className="rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen} title="Shopping Cart" className="max-w-md">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Cart is empty</p>
          ) : (
            <>
              {cart.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus size={16} />
                    </Button>
                    <span className="flex-1 text-center font-bold">{item.quantity}</span>
                    <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus size={16} />
                    </Button>
                  </div>
                  <p className="mt-2 text-right font-bold text-primary">{formatCurrency(item.price * item.quantity)}</p>
                </Card>
              ))}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(getTotalPrice())}</span>
                </div>

                {/* Checkout Buttons */}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setCartOpen(false)} className="flex-1">
                    Continue Shopping
                  </Button>
                  <Button variant="primary" onClick={handleCheckout} disabled={checkoutLoading} className="flex-1">
                    {checkoutLoading ? 'Processing...' : (
                      <>
                        <Check size={18} />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  )
}
