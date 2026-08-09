import React from 'react';
import { Plus } from 'lucide-react';

interface MenuCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    image: string;
    type: 'veg' | 'non-veg'; // Though we are pure veg, good for scalability
    price?: number;
    tags?: string[];
  };
  onAdd?: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd }) => {
  return (
    <div className="bg-white rounded-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-green-700 border border-green-200 uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600"></span> Veg
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-text-primary line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
          {item.price && <span className="text-sm font-semibold text-text-primary">${item.price}</span>}
        </div>
        
        <p className="text-text-secondary text-sm line-clamp-2 mb-4 h-10">{item.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {item.tags?.map(tag => (
              <span key={tag} className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          
          <button 
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-surface hover:bg-primary hover:text-white flex items-center justify-center text-primary transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
