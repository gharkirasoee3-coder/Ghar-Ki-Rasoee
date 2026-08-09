import HeroSection from './HeroSection';
import PlansSection from './PlansSection';
import TestimonialsSection from './TestimonialsSection';
import PageContainer from '../../../components/layout/PageContainer';
import { Heart, RefreshCw, MapPin } from 'lucide-react';
import { 
  PizzaIcon, 
  DrinkIcon, 
  HeartBeatIcon, 
  HappyEmojiIcon
} from 'react-doodle-icons';

const sneakPeekItems = [
  { name: 'Paneer Butter Masala', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { name: 'Dal Makhani', image: 'https://images.unsplash.com/photo-1697155406121-85aac6236000?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8RGFsJTIwTWFraGFuaXxlbnwwfHwwfHx8MA%3D%3D' },
  { name: 'Chole Bhature', image: 'https://madhurasrecipe.com/wp-content/uploads/2025/09/MR-Chole-Bhature-featured.jpg' },
  { name: 'Palak Paneer', image: 'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];

const Home: React.FC = () => {
  return (
    <div className="flex flex-col bg-surface overflow-hidden">
      <HeroSection />
      
      {/* Menu Sneak Peek Section */}
      <section className="py-12 lg:py-16 bg-gradient-to-b from-white via-orange-50/30 to-rose-50/20 relative overflow-hidden">
        {/* Soft Pattern Overlay (Faded at the top so it doesn't create a hard line against the Hero wave) */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: 'radial-gradient(#d97706 2px, transparent 2px)', 
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)'
        }}></div>
        
        {/* Colorful Blurred Blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[10%] left-[-10%] w-[40%] sm:w-[30%] h-[60%] bg-orange-200/40 rounded-[100%] blur-[80px] mix-blend-multiply animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] sm:w-[30%] h-[60%] bg-rose-200/40 rounded-[100%] blur-[80px] mix-blend-multiply animate-blob animation-delay-2000"></div>
          <div className="absolute top-[20%] right-[30%] w-[30%] sm:w-[20%] h-[40%] bg-yellow-200/30 rounded-[100%] blur-[60px] mix-blend-multiply animate-blob animation-delay-4000"></div>
          
          {/* Floating Doodles */}
          <div className="hidden sm:block absolute top-6 right-12 opacity-50 animate-[wiggle_4s_ease-in-out_infinite] transform rotate-12"><PizzaIcon size={45} className="text-orange-400" /></div>
          <div className="hidden sm:block absolute bottom-6 left-12 opacity-50 animate-[wiggle_5s_ease-in-out_infinite_reverse] transform -rotate-12"><DrinkIcon size={40} className="text-rose-400" /></div>
          <div className="absolute top-1/2 left-4 sm:left-10 opacity-40 animate-[wiggle_3s_ease-in-out_infinite] transform rotate-45"><HappyEmojiIcon size={35} className="text-yellow-500" /></div>
          <div className="absolute top-1/4 right-1/4 opacity-40 animate-[wiggle_6s_ease-in-out_infinite] transform -rotate-12"><HeartBeatIcon size={30} className="text-red-400" /></div>
        </div>

        <PageContainer className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
            
            <div className="text-center md:text-left shrink-0 md:max-w-[250px]">
              <h2 className="text-xs font-bold text-orange-500 tracking-widest uppercase mb-2">Sneak Peek</h2>
              <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">Taste of Home</h3>
              <p className="text-sm text-gray-600 mt-2 font-medium">Included in our premium tiffins.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full place-items-center">
              {sneakPeekItems.map((item, idx) => (
                <div key={idx} className="group flex flex-col items-center gap-2 sm:gap-3 cursor-pointer w-full max-w-[140px]">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500 border-4 border-white/80 group-hover:border-orange-300 transform group-hover:-translate-y-2">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-800 text-center leading-tight px-2">{item.name}</h4>
                </div>
              ))}
            </div>

          </div>
        </PageContainer>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-surface relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 rounded-l-[100px] z-0"></div>
        
        {/* Doodles */}
        <div className="absolute top-1/2 left-10 opacity-40 animate-[wiggle_3s_ease-in-out_infinite] transform -rotate-12 pointer-events-none">
          <HeartBeatIcon size={60} className="text-primary-400" />
        </div>
        <div className="absolute bottom-20 right-20 opacity-50 animate-[wiggle_4.5s_ease-in-out_infinite_reverse] transform rotate-12 pointer-events-none">
          <HappyEmojiIcon size={50} className="text-yellow-500" />
        </div>

        <PageContainer className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left Image Side */}
            <div className="relative max-w-md mx-auto lg:max-w-none">
              <div className="relative rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl border-6 lg:border-8 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Daily Menu Preparation" 
                  className="w-full h-[350px] sm:h-[450px] lg:h-[600px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-2 sm:-bottom-8 sm:-right-8 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 animate-[bounce_4s_ease-in-out_infinite]">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">🌱</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-text-secondary font-medium">Ingredients</p>
                    <p className="text-sm sm:text-xl font-bold text-text-primary">100% Fresh Daily</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content Side */}
            <div>
              <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">Why Us</h2>
              <h3 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-12 leading-tight">
                More Than Just Food. <br /> It's an Emotion.
              </h3>
              
              <div className="space-y-10">
                
                {/* Feature 1 */}
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:shadow-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                    <Heart className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl text-text-primary mb-2 group-hover:text-primary transition-colors">Authentic Taste</h4>
                    <p className="text-text-secondary text-lg leading-relaxed">Secret family recipes passed down through generations, cooked with pure love and zero preservatives.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:shadow-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                    <RefreshCw className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl text-text-primary mb-2 group-hover:text-primary transition-colors">Total Flexibility</h4>
                    <p className="text-text-secondary text-lg leading-relaxed">Going out? Pause your subscription for the day with a single tap. Resume anytime. You are in complete control.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:shadow-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                    <MapPin className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl text-text-primary mb-2 group-hover:text-primary transition-colors">Live Delivery Tracking</h4>
                    <p className="text-text-secondary text-lg leading-relaxed">Track your food's journey from our kitchen directly to your dining table in real-time.</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </PageContainer>
      </section>

      <PlansSection />
      <TestimonialsSection />
    </div>
  );
};

export default Home;
