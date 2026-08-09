// Menu data types
export interface PlanInfo {
  name: string;
  price: number;
  roti: number;
  sabziChoices: number;
  raitaDays: string[];
  features: string[];
}

export interface DayMenu {
  sabziOptions?: string[];
  sabziSet1?: string[];
  sabziSet2?: string[];
  roti: number;
  raita?: boolean;
  raitaType?: string;
  dessert?: boolean;
  isSaturdaySpecial?: boolean;
  specialFoodOptions?: string[];
  dessertOptions?: string[];
}

export interface WeeklyMenu {
  monday: DayMenu;
  tuesday: DayMenu;
  wednesday: DayMenu;
  thursday: DayMenu;
  friday: DayMenu;
  saturday: DayMenu;
}

export interface Plans {
  basic: PlanInfo;
  standard: PlanInfo;
  premium: PlanInfo;
}

export interface MenuData {
  plans: Plans;
  weeklyMenus: {
    basic: WeeklyMenu;
    standard: WeeklyMenu;
    premium: WeeklyMenu;
  };
  serviceInfo: {
    type: string;
    quality: string;
    daysPerWeek: number;
    deliveryDays: string[];
    areas: string[];
    rotationPolicy: string;
  };
}

// Main menu data (imported from backend JSON structure)
export const menuData: MenuData = {
  plans: {
    basic: {
      name: "Basic",
      price: 150,
      roti: 4,
      sabziChoices: 1,
     raitaDays: ["monday", "wednesday", "friday"],
      features: [
        "4 Tawa Roti",
        "1 Sabzi (Choose from daily options)",
        "Raita or Salad 3 times a week",
        "6 Days delivery"
      ]
    },
    standard: {
      name: "Standard",
      price: 190,
      roti: 8,
      sabziChoices: 2,
      raitaDays: ["monday", "wednesday", "friday"],
      features: [
        "8 Tawa Roti",
        "2 Sabzi (Choose from daily options)",
        "Raita or Salad 3 times a week",
        "6 Days delivery"
      ]
    },
    premium: {
      name: "Premium",
      price: 220,
      roti: 8,
      sabziChoices: 2,
      raitaDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      features: [
        "8 Tawa Roti",
        "2 Sabzi (Choose from daily options)",
        "Daily Raita or Salad",
        "Wednesday Dessert",
        "Saturday Special Food + Dessert",
        "6 Days delivery"
      ]
    }
  },
  weeklyMenus: {
    basic: {
      monday: {
        sabziOptions: ["Chole Masala", "Kali Dal", "Kale Chane"],
        roti: 4,
        raita: true
      },
      tuesday: {
        sabziOptions: ["Mushroom", "Tofu", "Chana Dal"],
        roti: 4,
        raita: false
      },
      wednesday: {
        sabziOptions: ["Rajma", "Aloo Matar", "Kofta"],
        roti: 4,
        raita: true
      },
      thursday: {
        sabziOptions: ["White Rajma", "Mix Dal", "Shahi Paneer"],
        roti: 4,
        raita: false
      },
      friday: {
        sabziOptions: ["Palak Paneer", "Kadhi", "Soya Badi"],
        roti: 4,
        raita: true
      },
      saturday: {
        sabziOptions: ["Sambhar", "Arhar Dal", "Aloo Jeera"],
        roti: 4,
        raita: false
      }
    },
    standard: {
      monday: {
        sabziSet1: ["Mix Veg", "Paneer Bhurji", "Dry Aloo Matar"],
        sabziSet2: ["Chole Masala", "Kali Dal", "Kale Chane"],
        roti: 8,
        raita: true
      },
      tuesday: {
        sabziSet1: ["Aloo Bhindi", "Dry Gobhi", "Tofu Bhurji"],
        sabziSet2: ["Mushroom", "Tofu", "Chana Dal"],
        roti: 8,
        raita: false
      },
      wednesday: {
        sabziSet1: ["Peeli Dal", "Dal Makhni", "Kofta"],
        sabziSet2: ["Rajma", "Aloo Matar", "Aloo Gobhi"],
        roti: 8,
        raita: true
      },
      thursday: {
        sabziSet1: ["Shimla Paneer", "Aloo Methi", "Beans"],
        sabziSet2: ["White Rajma", "Mix Dal", "Shahi Paneer"],
        roti: 8,
        raita: false
      },
      friday: {
        sabziSet1: ["Bhindi Masala", "Shimla ki Sabzi", "Soya Nutri"],
        sabziSet2: ["Palak Paneer", "Kadhi", "Soya Badi"],
        roti: 8,
        raita: true
      },
      saturday: {
        sabziSet1: ["Chana Dry", "Aloo Matar", "Masoor Dal"],
        sabziSet2: ["Sambhar", "Arhar Dal", "Aloo Jeera"],
        roti: 8,
        raita: false
      }
    },
    premium: {
      monday: {
        sabziSet1: ["Mix Veg", "Paneer Bhurji", "Dry Aloo Matar"],
        sabziSet2: ["Chole Masala", "Kali Dal", "Kale Chane"],
        roti: 8,
        raitaType: "Boondi Raita"
      },
      tuesday: {
        sabziSet1: ["Aloo Bhindi", "Dry Gobhi", "Tofu Bhurji"],
        sabziSet2: ["Mushroom", "Tofu", "Chana Dal"],
        roti: 8,
        raitaType: "Kheera Raita"
      },
      wednesday: {
        sabziSet1: ["Peeli Dal", "Dal Makhni", "Kofta"],
        sabziSet2: ["Rajma", "Aloo Matar", "Aloo Gobhi"],
        roti: 8,
        raitaType: "Salad Raita",
        dessert: true
      },
      thursday: {
        sabziSet1: ["Shimla Paneer", "Aloo Methi", "Beans"],
        sabziSet2: ["White Rajma", "Mix Dal", "Shahi Paneer"],
        roti: 8,
        raitaType: "Plain Raita"
      },
      friday: {
        sabziSet1: ["Bhindi Masala", "Shimla ki Sabzi", "Soya Nutri"],
        sabziSet2: ["Palak Paneer", "Kadhi", "Soya Badi"],
        roti: 8,
        raitaType: "Fruits Raita"
      },
      saturday: {
        isSaturdaySpecial: true,
        roti: 0,
        specialFoodOptions: [
          "Chole Puri",
          "Noodles",
          "Fried Rice",
          "Pav Bhaji",
          "Pasta",
          "Macroni",
          "Veg Biryani",
          "Fry Maggi"
        ],
        dessertOptions: [
          "Halwa",
          "Custard",
          "Kheer",
          "Meetha Chawal",
          "Fruits",
          "Sevaiyan",
          "Kada Prasad",
          "Rasgulla"
        ]
      }
    }
  },
  serviceInfo: {
    type: "Pure Veg Tiffin Service",
    quality: "100% Fresh Ingredients",
    daysPerWeek: 6,
    deliveryDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    areas: [
      "Surrey",
      "Delta",
      "Langley",
      "Newton",
      "Scottsdale",
      "Coquitlam",
      "Richmond",
      "Vancouver"
    ],
    rotationPolicy: "Sabji will not be repeated in 3-4 weeks"
  }
};

// Helper functions
export const getPlanByType = (planType: string): PlanInfo | null => {
  const type = planType.toLowerCase() as keyof Plans;
  return menuData.plans[type] || null;
};

export const getWeeklyMenuByPlan = (planType: string): WeeklyMenu | null => {
  const type = planType.toLowerCase() as keyof Plans;
  return menuData.weeklyMenus[type] || null;
};

export const getDayOptions = (planType: string, day: string): DayMenu | null => {
  const weeklyMenu = getWeeklyMenuByPlan(planType);
  if (!weeklyMenu) return null;
  const dayKey = day.toLowerCase() as keyof WeeklyMenu;
  return weeklyMenu[dayKey] || null;
};
