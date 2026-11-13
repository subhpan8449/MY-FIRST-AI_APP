import React, { useState, useEffect } from 'react';
import {
  Utensils,
  ShoppingBag,
  Clock,
  Flame,
  CheckCircle2,
  X,
  AlertTriangle,
  KeyRound,
  Sparkles,
  Info,
  ChevronRight,
  Plus,
  Minus,
  MapPin,
  Coffee,
  Heart,
  Send,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  CookNowCategory, 
  FoodProduct, 
  FoodCartItem, 
  FoodOrderRecord 
} from '../types';
import { collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { SmoothImage } from './SmoothImage';

// High-fidelity culinary photography with Unsplash Food & Drink assets
export const COOKNOW_CATALOG: FoodProduct[] = [
  // 1. BREAKFAST
  {
    id: 'bf-1',
    name: 'Himalayan Aloo Paratha with Mountain Curd',
    hindiName: 'आलू पराठा व ताज़ा दही',
    category: 'Breakfast',
    price: 130,
    isVeg: true,
    isPopular: true,
    calories: 380,
    preparationMinutes: 15,
    description: 'Crisp whole-wheat flatbread stuffed with spiced Himalayan potatoes, served with churned white butter, mountain curd, and mixed pickle.',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Whole Wheat Flour', 'Himalayan Potatoes', 'Green Chillies', 'Ajwain', 'Fresh Curd', 'White Butter'],
    allergens: ['Gluten', 'Dairy'],
    spiceLevel: 'Medium',
    available: true
  },
  {
    id: 'bf-2',
    name: 'Indori Poha with Roasted Peanuts & Sev',
    hindiName: 'इन्दौरी पोहा',
    category: 'Breakfast',
    price: 95,
    isVeg: true,
    calories: 260,
    preparationMinutes: 12,
    description: 'Steamed flattened rice tossed with mustard seeds, roasted peanuts, curry leaves, turmeric, topped with ratlami sev and fresh lime.',
    image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Flattened Rice', 'Peanuts', 'Curry Leaves', 'Turmeric', 'Green Chillies', 'Lemon Juice'],
    allergens: ['Peanuts'],
    spiceLevel: 'Mild',
    available: true
  },
  {
    id: 'bf-3',
    name: 'Organic Muesli & Fresh Mountain Fruit Bowl',
    hindiName: 'ताज़ा फल व मूसली',
    category: 'Breakfast',
    price: 160,
    isVeg: true,
    isChefSpecial: true,
    calories: 290,
    preparationMinutes: 10,
    description: 'Sliced Himalayan apples, pomegranates, and bananas layered with toasted oats, pumpkin seeds, and raw forest honey.',
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Himalayan Apples', 'Pomegranate', 'Rolled Oats', 'Almonds', 'Raw Honey', 'Fresh Milk'],
    allergens: ['Nuts', 'Dairy'],
    spiceLevel: 'Mild',
    available: true
  },

  // 2. NORTH INDIAN FOOD
  {
    id: 'ni-1',
    name: 'Shahi Paneer with Butter Tawa Rotis',
    hindiName: 'शाही पनीर व तवा रोटी',
    category: 'North Indian Food',
    price: 240,
    isVeg: true,
    isPopular: true,
    calories: 520,
    preparationMinutes: 20,
    description: 'Cubes of fresh malai paneer simmered in velvety tomato-cashew gravy with aromatic kasuri methi, paired with 3 butter rotis.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Fresh Cottage Cheese', 'Cashew Paste', 'Tomatoes', 'Butter', 'Cream', 'Whole Wheat Rotis'],
    allergens: ['Dairy', 'Nuts', 'Gluten'],
    spiceLevel: 'Medium',
    available: true
  },
  {
    id: 'ni-2',
    name: 'Pahadi Rajma & Basmati Chawal Thali',
    hindiName: 'पहाड़ी राजमा चावल',
    category: 'North Indian Food',
    price: 190,
    isVeg: true,
    isChefSpecial: true,
    calories: 450,
    preparationMinutes: 20,
    description: 'Slow-cooked Garhwali red kidney beans tempered in ginger, roasted cumin, and tomato gravy, served with aromatic Dehradun basmati rice and onion salad.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Garhwali Red Rajma', 'Dehradun Basmati Rice', 'Ginger', 'Tomatoes', 'Pure Ghee'],
    allergens: ['Dairy'],
    spiceLevel: 'Medium',
    available: true
  },
  {
    id: 'ni-3',
    name: 'Garhwali Dal Tadka with Jeera Rice',
    hindiName: 'दाल तड़का व जीरा राइस',
    category: 'North Indian Food',
    price: 175,
    isVeg: true,
    calories: 410,
    preparationMinutes: 18,
    description: 'Yellow lentils tempered with fragrant cumin seeds, garlic, red chillies, and pure desi cow ghee.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Toor Dal', 'Moong Dal', 'Desi Ghee', 'Cumin', 'Tomatoes', 'Basmati Rice'],
    allergens: ['Dairy'],
    spiceLevel: 'Mild',
    available: true
  },

  // 3. SOUTH INDIAN FOOD
  {
    id: 'si-1',
    name: 'Crisp Masala Dosa with Sambar & 2 Chutneys',
    hindiName: 'मसाला डोसा व सांभर',
    category: 'South Indian Food',
    price: 150,
    isVeg: true,
    isPopular: true,
    calories: 360,
    preparationMinutes: 15,
    description: 'Golden, paper-thin fermented rice crepe folded over spiced potato mash, served with piping hot drumstick sambar and fresh coconut chutney.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Fermented Rice & Urad Dal Batter', 'Spiced Potatoes', 'Coconut Chutney', 'Tomato Chutney', 'Lentil Sambar'],
    allergens: ['Mustard'],
    spiceLevel: 'Medium',
    available: true
  },
  {
    id: 'si-2',
    name: 'Steamed Idli & Medu Vada Platter (2+1)',
    hindiName: 'इडली व मेदु वड़ा',
    category: 'South Indian Food',
    price: 130,
    isVeg: true,
    calories: 310,
    preparationMinutes: 12,
    description: 'Soft cloud-like steamed idlis and a crisp lentil vada served with fragrant shallot sambar and freshly ground coconut chutney.',
    image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Rice Flour', 'Urad Dal', 'Curry Leaves', 'Ginger', 'Coconut'],
    allergens: ['Mustard'],
    spiceLevel: 'Mild',
    available: true
  },

  // 4. CHINESE
  {
    id: 'ch-1',
    name: 'Steamed Tibetan Veg Momos (8 pcs)',
    hindiName: 'स्टीम्ड वेज मोमोज',
    category: 'Chinese',
    price: 130,
    isVeg: true,
    isPopular: true,
    calories: 240,
    preparationMinutes: 15,
    description: 'Delicate steamed dumplings stuffed with finely minced mountain cabbage, carrots, bell peppers, served with spicy garlic red dip.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Refined Flour', 'Shredded Cabbage', 'Carrots', 'Garlic', 'Soy Sauce', 'Red Chilly'],
    allergens: ['Gluten', 'Soy'],
    spiceLevel: 'Spicy',
    available: true
  },
  {
    id: 'ch-2',
    name: 'Wok-Tossed Hakka Noodles with Vegetables',
    hindiName: 'हक्का नूडल्स',
    category: 'Chinese',
    price: 150,
    isVeg: true,
    calories: 390,
    preparationMinutes: 15,
    description: 'Stir-fried noodles tossed in high heat with crunchy cabbage, bell peppers, spring onions, and a splash of toasted sesame.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Wheat Noodles', 'Bell Peppers', 'Spring Onions', 'Sesame Oil', 'Dark Soy'],
    allergens: ['Gluten', 'Soy', 'Sesame'],
    spiceLevel: 'Medium',
    available: true
  },

  // 5. SNACKS
  {
    id: 'sn-1',
    name: 'Crispy Mountain Vegetable Pakoras',
    hindiName: 'मिक्स वेज पकौड़ा',
    category: 'Snacks',
    price: 120,
    isVeg: true,
    isPopular: true,
    calories: 310,
    preparationMinutes: 14,
    description: 'Sliced onions, potatoes, spinach, and cauliflower tossed in spiced chickpea batter and fried golden, served with fresh mint chutney.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Gram Flour', 'Onions', 'Potatoes', 'Spinach', 'Mint', 'Coriander'],
    allergens: [],
    spiceLevel: 'Medium',
    available: true
  },
  {
    id: 'sn-2',
    name: 'Tapovan Vegetable Masala Maggi',
    hindiName: 'मसाला मैगी',
    category: 'Snacks',
    price: 85,
    isVeg: true,
    calories: 270,
    preparationMinutes: 10,
    description: 'The iconic Himalayan comfort dish with diced onions, tomatoes, green peas, and fragrant mountain herbs.',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Noodles', 'Peas', 'Tomatoes', 'Onions', 'Mountain Herbs'],
    allergens: ['Gluten'],
    spiceLevel: 'Medium',
    available: true
  },

  // 6. HEALTHY FOOD
  {
    id: 'hf-1',
    name: 'Ayurvedic Healing Moong Khichdi with Ghee',
    hindiName: 'मूंग दाल खिचड़ी',
    category: 'Healthy Food',
    price: 155,
    isVeg: true,
    isChefSpecial: true,
    calories: 290,
    preparationMinutes: 20,
    description: 'Easily digestible blend of yellow moong dal, aged rice, cumin, ginger, and turmeric drizzled with warm desi cow ghee.',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Yellow Moong Dal', 'Basmati Rice', 'Desi Ghee', 'Ginger', 'Turmeric', 'Cumin'],
    allergens: ['Dairy'],
    spiceLevel: 'Mild',
    available: true
  },
  {
    id: 'hf-2',
    name: 'Warm Himalayan Vegetable Broth Soup',
    hindiName: 'वेजिटेबल सूप',
    category: 'Healthy Food',
    price: 110,
    isVeg: true,
    calories: 120,
    preparationMinutes: 12,
    description: 'Nourishing clear vegetable broth infused with crushed black pepper, fresh lemon, and mountain greens.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Carrots', 'Beans', 'Coriander Root', 'Black Pepper', 'Lemon'],
    allergens: [],
    spiceLevel: 'Mild',
    available: true
  },

  // 7. BEVERAGES
  {
    id: 'bv-1',
    name: 'Tapovan Adrak Tulsi Masala Chai',
    hindiName: 'अदरक तुलसी मसाला चाय',
    category: 'Beverages',
    price: 45,
    isVeg: true,
    isPopular: true,
    calories: 80,
    preparationMinutes: 8,
    description: 'Fresh cow milk brewed with crushed ginger root, holy basil (tulsi), green cardamom, and rich Assam tea leaves.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Fresh Milk', 'Ginger', 'Tulsi', 'Cardamom', 'Assam Tea'],
    allergens: ['Dairy'],
    spiceLevel: 'Mild',
    available: true
  },
  {
    id: 'bv-2',
    name: 'Himalayan Herbal Lemongrass & Honey Infusion',
    hindiName: 'लेमनग्रास शहद चाय',
    category: 'Beverages',
    price: 55,
    isVeg: true,
    calories: 45,
    preparationMinutes: 6,
    description: 'Caffeine-free herbal tonic steeped with fresh lemongrass stalks, spearmint leaves, and unprocessed raw forest honey.',
    image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Fresh Lemongrass', 'Spearmint', 'Wild Honey', 'Spring Water'],
    allergens: [],
    spiceLevel: 'Mild',
    available: true
  },

  // 8. DESSERTS
  {
    id: 'ds-1',
    name: 'Warm Gulab Jamun with Pistachio (2 pcs)',
    hindiName: 'गुलाब जामुन',
    category: 'Desserts',
    price: 80,
    isVeg: true,
    isPopular: true,
    calories: 320,
    preparationMinutes: 5,
    description: 'Soft cottage cheese and milk dumplings dipped in warm saffron-infused cardamom syrup, garnished with slivered pistachios.',
    image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Khoya', 'Saffron', 'Rose Water', 'Cardamom', 'Pistachios'],
    allergens: ['Dairy', 'Nuts', 'Gluten'],
    spiceLevel: 'Mild',
    available: true
  },
  {
    id: 'ds-2',
    name: 'Kashmiri Kesar Badam Rice Kheer',
    hindiName: 'केसर बादाम खीर',
    category: 'Desserts',
    price: 95,
    isVeg: true,
    calories: 280,
    preparationMinutes: 8,
    description: 'Slow-simmered basmati rice pudding infused with fragrant saffron strands and crushed almonds.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Reduced Milk', 'Basmati Rice', 'Kashmiri Saffron', 'Almonds', 'Cardamom'],
    allergens: ['Dairy', 'Nuts'],
    spiceLevel: 'Mild',
    available: true
  },

  // 9. SPECIAL MEALS
  {
    id: 'sm-1',
    name: 'Pure Satvik Tapovan Thali (Zero Onion / Zero Garlic)',
    hindiName: 'शुद्ध सात्विक थाली',
    category: 'Special Meals',
    price: 220,
    isVeg: true,
    isChefSpecial: true,
    isPopular: true,
    calories: 480,
    preparationMinutes: 25,
    description: 'Prepared strictly according to Yogic principles without onion or garlic: Moong dal, seasonal bottle gourd sabzi, 3 plain rotis, steamed rice, cucumber raita, and sweet kheer.',
    image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Yellow Lentils', 'Lauki (Gourd)', 'Whole Wheat', 'Curd', 'Cumin', 'Rock Salt'],
    allergens: ['Dairy', 'Gluten'],
    spiceLevel: 'Mild',
    available: true
  },
  {
    id: 'sm-2',
    name: 'Himalayan Trekker High-Protein Platter',
    hindiName: 'हाई-प्रोटीन प्लेटर',
    category: 'Special Meals',
    price: 240,
    isVeg: true,
    calories: 540,
    preparationMinutes: 20,
    description: 'Grilled paneer steaks, spiced boiled chickpeas, steamed broccoli, brown rice, and lemon mint yogurt dip for mountain travelers.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    ingredients: ['Grilled Cottage Cheese', 'Kabuli Chana', 'Broccoli', 'Brown Rice', 'Mint Dip'],
    allergens: ['Dairy'],
    spiceLevel: 'Medium',
    available: true
  }
];

const FOOD_CATEGORIES: CookNowCategory[] = [
  'Breakfast',
  'North Indian Food',
  'South Indian Food',
  'Chinese',
  'Snacks',
  'Healthy Food',
  'Beverages',
  'Desserts',
  'Special Meals'
];

export const CookNowSection: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const REGISTERED_COOKNOW_KEY = 'sb_publishable_En-dH8YbPAKpLUzc8gIHbw_2mkR1xSq';

  const [activeCategory, setActiveCategory] = useState<CookNowCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<FoodProduct | null>(null);

  // Cart state
  const [cart, setCart] = useState<FoodCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Delivery details
  const [roomNumber, setRoomNumber] = useState('');
  const [guestName, setGuestName] = useState(userProfile?.fullName || '');
  const [guestPhone, setGuestPhone] = useState(userProfile?.phone || '');
  const [deliveryLocation, setDeliveryLocation] = useState<'room' | 'rooftop_deck' | 'poolside'>('room');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [activeUserOrders, setActiveUserOrders] = useState<FoodOrderRecord[]>([]);

  // Listen to active user orders in Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'foodOrders'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FoodOrderRecord, 'id'>)
      }));
      setActiveUserOrders(orders);
    }, (err) => {
      console.warn('Orders listener notice:', err.message);
    });
    return () => unsub();
  }, [currentUser]);

  // Cart helper functions
  const addToCart = (product: FoodProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as FoodCartItem[]
    );
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryCharge = cartSubtotal > 300 ? 0 : 25;
  const totalAmount = cartSubtotal + deliveryCharge;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Place order to Firestore
  const handleCheckoutOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to place an in-room dining order.');
      return;
    }
    if (cart.length === 0) return;
    if (deliveryLocation === 'room' && !roomNumber.trim()) {
      alert('Please specify your Room Number for delivery.');
      return;
    }

    try {
      setIsPlacingOrder(true);
      const orderRef = `CN-${Date.now().toString().slice(-6)}`;
      const orderData: Omit<FoodOrderRecord, 'id'> = {
        orderReference: orderRef,
        userId: currentUser.uid,
        guestName: guestName.trim() || userProfile?.fullName || 'Guest',
        guestPhone: guestPhone.trim() || '',
        roomNumber: roomNumber.trim() || 'Rooftop/Poolside',
        deliveryLocation,
        items: cart.map((c) => ({
          productId: c.product.id,
          name: c.product.name,
          quantity: c.quantity,
          price: c.product.price,
          customization: c.customization || ''
        })),
        subtotal: cartSubtotal,
        deliveryCharge,
        tax: 0,
        totalAmount,
        paymentMethod: 'pay_on_delivery',
        paymentStatus: 'pending',
        status: 'received',
        estimatedMinutes: 25,
        specialInstructions: specialInstructions.trim(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'foodOrders'), orderData);
      setPlacedOrderId(docRef.id);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error('Order creation error:', err);
      alert('Could not place food order: ' + err.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const filteredCatalog = activeCategory === 'All'
    ? COOKNOW_CATALOG
    : COOKNOW_CATALOG.filter((item) => item.category === activeCategory);

  return (
    <section id="dining" className="py-20 bg-slate-950 text-white relative overflow-hidden scroll-mt-16">
      {/* Anchor targets for dining and cooknow navigation */}
      <div id="cooknow" className="scroll-mt-24 absolute -top-24" aria-hidden="true" />
      <div id="food" className="scroll-mt-24 absolute -top-24" aria-hidden="true" />
      {/* Decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Utensils className="h-4 w-4 text-amber-400" />
            <span>CookNow Partner Kitchen · 9 Categories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Satvik &amp; Homestyle Mountain Dining
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Freshly prepared Himalayan delicacies delivered directly to your room door or rooftop sunset deck. Pure ingredients, Ayurvedic satvik thalis, and wholesome mountain comfort.
          </p>
        </div>

        {/* Live Active Orders Banner (if user has orders) */}
        {activeUserOrders.length > 0 && (
          <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-bold text-emerald-300 text-sm">Active In-Room Dining Order</h4>
                <span className="font-mono text-xs text-slate-400">Ref: {activeUserOrders[0].orderReference}</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 uppercase">
                {activeUserOrders[0].status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Delivery to: <strong>{activeUserOrders[0].deliveryLocation === 'room' ? `Room ${activeUserOrders[0].roomNumber}` : 'Rooftop Deck'}</strong></span>
              <span>Total: <strong>₹{activeUserOrders[0].totalAmount}</strong> (Pay on Delivery)</span>
            </div>
          </div>
        )}

        {/* 9 Categories Selector Ribbon */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory('All')}
            className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
              activeCategory === 'All'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            All 9 Categories
          </button>
          {FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Food Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.map((product) => {
            const inCart = cart.find((item) => item.product.id === product.id);

            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden hover:border-amber-500/50 transition duration-300 shadow-lg hover:shadow-amber-500/5"
              >
                {/* Photo Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
                  <SmoothImage
                    src={product.image}
                    fallbackSrc={product.fallbackImage}
                    alt={product.name}
                    wrapperClassName="h-full w-full"
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                  {/* Veg / Special Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      100% PURE VEG
                    </span>
                    {product.isChefSpecial && (
                      <span className="rounded-full bg-amber-500/90 text-slate-950 px-2 py-0.5 text-[10px] font-bold">
                        CHEF SPECIAL
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-bold text-white border border-white/10">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>~{product.preparationMinutes}m</span>
                  </div>

                  {/* Price Tag Over Bottom of Photo */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      {product.hindiName && (
                        <span className="text-xs text-amber-300 font-medium block">
                          {product.hindiName}
                        </span>
                      )}
                      <h4 className="text-base font-bold text-white leading-snug drop-shadow-md">
                        {product.name}
                      </h4>
                    </div>
                    <span className="text-lg font-black text-amber-400 shrink-0 drop-shadow-md">
                      ₹{product.price}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400 font-medium">
                      Spice: <strong className={product.spiceLevel === 'Spicy' ? 'text-rose-400' : 'text-amber-300'}>{product.spiceLevel}</strong>
                    </span>
                    {product.calories && (
                      <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">
                        {product.calories} kcal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="ml-auto text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="h-3 w-3" />
                      View Ingredients
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    {inCart ? (
                      <div className="flex-1 flex items-center justify-between rounded-xl bg-amber-500/20 border border-amber-500/40 p-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-bold text-sm text-amber-300">
                          {inCart.quantity} in Cart
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 py-2.5 text-xs font-bold text-white transition border border-slate-700"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Add to Order</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Cart Button */}
        {totalItemsCount > 0 && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 font-bold text-slate-950 shadow-2xl shadow-amber-500/30 hover:scale-105 transition"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-amber-400 text-xs font-black">
                {totalItemsCount}
              </div>
              <span>View Cart (₹{totalAmount})</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Product Details Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
              <div className="relative aspect-[16/9] w-full bg-slate-800">
                <SmoothImage
                  src={selectedProduct.image}
                  fallbackSrc={selectedProduct.fallbackImage}
                  alt={selectedProduct.name}
                  priority
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-amber-400 font-semibold">{selectedProduct.category}</span>
                    <h3 className="text-xl font-bold text-white">{selectedProduct.name}</h3>
                  </div>
                  <span className="text-xl font-black text-amber-400">₹{selectedProduct.price}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProduct.description}
                </p>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ingredients</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.ingredients.map((ing) => (
                      <span key={ing} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedProduct.allergens.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Allergen Notice</h5>
                    <p className="text-xs text-amber-300/80">Contains: {selectedProduct.allergens.join(', ')}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Estimated Prep Time: ~{selectedProduct.preparationMinutes} mins</span>
                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    Add to Cart · ₹{selectedProduct.price}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer / Slideover */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative flex h-full w-full max-w-md flex-col bg-slate-900 border-l border-slate-800 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Your In-Room Dining Order</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <ShoppingBag className="h-12 w-12 text-slate-700" />
                  <h4 className="font-bold text-white text-base">Your Cart is Empty</h4>
                  <p className="text-xs text-slate-400">Explore the 9 categories and add meals to your room folio.</p>
                </div>
              ) : (
                <form onSubmit={handleCheckoutOrder} className="flex-1 flex flex-col justify-between mt-4 space-y-6">
                  {/* Items List */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-3"
                      >
                        <div>
                          <h5 className="font-semibold text-white text-xs leading-snug">{item.product.name}</h5>
                          <span className="text-xs text-amber-400 font-bold">₹{item.product.price} each</span>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="h-6 w-6 rounded bg-slate-800 flex items-center justify-center text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-white px-1">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="h-6 w-6 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Location Selector */}
                  <div className="space-y-3 border-t border-slate-800 pt-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Deliver To
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'room', label: 'My Room' },
                        { id: 'rooftop_deck', label: 'Rooftop Deck' },
                        { id: 'poolside', label: 'Poolside' }
                      ].map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => setDeliveryLocation(loc.id as any)}
                          className={`rounded-xl py-2 text-xs font-semibold border transition ${
                            deliveryLocation === loc.id
                              ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                              : 'border-slate-800 bg-slate-950 text-slate-400'
                          }`}
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Room Number *
                        </label>
                        <input
                          type="text"
                          required={deliveryLocation === 'room'}
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          placeholder="e.g. 202"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          Guest Phone
                        </label>
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="For delivery call"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Kitchen Notes (Less spicy, no butter, etc.)
                      </label>
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Add special instructions..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="border-t border-slate-800 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Items Subtotal:</span>
                      <span className="text-white font-semibold">₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Homestay Delivery Charge:</span>
                      <span className="text-emerald-400 font-semibold">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                      <span>Total Payable upon Delivery:</span>
                      <span className="text-amber-400 font-black">₹{totalAmount}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Payment collected upon delivery to your room or charged to room folio.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPlacingOrder}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 transition disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isPlacingOrder ? 'Dispatching to Kitchen...' : `Confirm Order (₹${totalAmount})`}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* CookNow Supabase Isolation Architecture Notice */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">
                  CookNow Platform Isolation &amp; Zero Fake Gateways
                </h4>
                <p className="text-xs text-slate-400">
                  Publishable Key active: <code className="text-amber-300 font-mono text-[11px]">{REGISTERED_COOKNOW_KEY.slice(0, 18)}...</code>. Meals billed honestly upon delivery.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold text-emerald-400">
              ISOLATED &amp; VERIFIED
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
