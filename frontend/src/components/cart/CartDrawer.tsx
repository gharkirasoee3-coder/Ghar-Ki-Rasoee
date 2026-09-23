import React from 'react';
import { useCart } from '../../context/CartContext';
import { X, Plus, Minus, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const { items, isCartOpen, toggleCart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleCart} />
      
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 className="text-xl font-bold text-text-primary">Your Cart ({items.length})</h2>
          <button onClick={toggleCart} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <p className="text-lg">Your cart is empty</p>
              <button 
                onClick={toggleCart} 
                className="mt-4 text-primary font-medium hover:underline"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-md object-cover" />
                <div className="flex-grow">
                  <h3 className="font-semibold text-text-primary line-clamp-1">{item.name}</h3>
                  <p className="text-primary font-bold">${item.price}</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-md px-2 py-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="p-1 hover:text-primary transition"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="p-1 hover:text-primary transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-base">Subtotal</span>
              <span className="text-2xl font-bold text-text-primary">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Platform Service Fee:</strong> A 2.5% service fee + $0.30 platform fee applies to all online orders and will be added at checkout.
              </p>
            </div>

            <button 
              onClick={() => {
                toggleCart();
                navigate('/checkout');
              }}
              className="w-full bg-primary text-white py-3.5 rounded-lg font-bold text-lg hover:bg-primary-hover transition shadow-lg"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
