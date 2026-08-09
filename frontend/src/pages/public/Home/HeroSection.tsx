import React from 'react';
import { ChevronRight, Truck, Star as LucideStar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BurgerIcon, 
  PizzaIcon, 
  CakeIcon, 
  CoffeeCup1Icon, 
  HeartIcon, 
  StarIcon 
} from 'react-doodle-icons';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center bg-[#fffbf5] overflow-hidden pt-28 pb-32 lg:py-0">
      {/* Background Blobs & Overlays */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Soft SVG Pattern Overlay (Faded at the bottom to prevent hard lines) */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: 'radial-gradient(#d97706 2px, transparent 2px)', 
          backgroundSize: '30px 30px',
          WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)',
          maskImage: 'linear-gradient(to top, transparent 0%, black 15%)'
        }}></div>
        
        {/* Colorful Blurred Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] lg:w-[40%] h-[60%] lg:h-[40%] bg-orange-300/30 rounded-[100%] blur-[80px] lg:blur-[100px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] lg:w-[35%] h-[50%] lg:h-[35%] bg-yellow-300/30 rounded-[100%] blur-[80px] lg:blur-[100px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[10%] left-[20%] w-[60%] lg:w-[40%] h-[60%] lg:h-[40%] bg-rose-300/30 rounded-[100%] blur-[80px] lg:blur-[100px] mix-blend-multiply animate-blob animation-delay-4000"></div>
        
        {/* Floating Multicolor Doodles (hidden on tiny screens to reduce clutter, visible on md+) */}
        <div className="hidden sm:block absolute top-20 left-10 opacity-70 animate-[wiggle_4s_ease-in-out_infinite] transform -rotate-12"><BurgerIcon size={48} className="text-orange-500" /></div>
        <div className="hidden sm:block absolute top-40 right-20 opacity-70 animate-[wiggle_5s_ease-in-out_infinite_reverse] transform rotate-12"><PizzaIcon size={56} className="text-red-500" /></div>
        <div className="hidden sm:block absolute bottom-32 left-1/4 opacity-60 animate-[wiggle_6s_ease-in-out_infinite] transform -rotate-6"><CoffeeCup1Icon size={42} className="text-amber-700" /></div>
        <div className="hidden sm:block absolute top-1/3 left-1/3 opacity-50 animate-[wiggle_3s_ease-in-out_infinite] transform rotate-45"><StarIcon size={32} className="text-yellow-500" /></div>
        <div className="hidden md:block absolute bottom-40 right-1/4 opacity-70 animate-[wiggle_4.5s_ease-in-out_infinite_reverse] transform -rotate-12"><CakeIcon size={50} className="text-pink-500" /></div>
        <div className="hidden md:block absolute top-1/4 right-1/3 opacity-50 animate-[wiggle_3.5s_ease-in-out_infinite] transform rotate-12"><HeartIcon size={36} className="text-rose-500" /></div>
      </div>

      <div className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 lg:mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Content Column */}
          <div className="text-center lg:text-left relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-orange-100 text-orange-700 font-bold text-xs sm:text-sm mb-6 sm:mb-8 shadow-[0_4px_14px_0_rgba(234,88,12,0.15)] border border-orange-200 backdrop-blur-sm">
              <LucideStar className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-orange-500 text-orange-500" />
              <span>#1 Rated Tiffin Service in Canada</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.1] relative">
              Ghar Ki Rasoee, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-rose-500 to-amber-500 relative inline-block mt-2">
                Away From Home
                <svg className="absolute w-full h-3 sm:h-4 -bottom-1 sm:-bottom-2 left-0 text-orange-400 opacity-70" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 Q50,20 100,10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium px-4 lg:px-0">
              Fresh, home-style Indian tiffins delivered straight to your doorstep. 
              Taste the tradition, feel the comfort.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-5 mb-12 px-4 sm:px-0">
              <button 
                onClick={() => navigate('/menu')}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-rose-500 hover:from-rose-500 hover:to-orange-500 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(249,115,22,0.3)] hover:shadow-[0_8px_30px_rgb(243,78,104,0.5)] transform hover:-translate-y-1 group"
              >
                Explore Menu
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto bg-white hover:bg-orange-50 text-gray-900 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 border-2 border-orange-100 shadow-sm hover:shadow-md hover:border-orange-300"
              >
                View Plans
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-gray-700 text-sm sm:text-base font-bold bg-white/60 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 rounded-2xl inline-flex border border-white/40 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-xs sm:text-sm">🥬</span>
                </div>
                <span>Pure Veg</span>
              </div>
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <span>Free Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Image Column (Now visible on Mobile) */}
          <div className="relative h-[350px] sm:h-[450px] lg:h-full lg:min-h-[500px] w-full mt-8 lg:mt-0 z-10 flex justify-center lg:block">
            
            {/* Centered Wrapper for Image and Badges */}
            <div className="relative w-[60%] sm:w-[60%] lg:w-[80%] xl:w-[90%] h-full flex items-center lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2">
              
              {/* Main Image */}
              <div className="w-full z-10 transform lg:rotate-3 hover:rotate-0 transition-transform duration-700">
                <img
                  src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Premium Indian Thali"
                  className="w-full h-auto object-cover rounded-[2rem] lg:rounded-[3rem] shadow-2xl border-[6px] sm:border-[8px] lg:border-[12px] border-white/80 backdrop-blur-sm"
                />
              </div>

              {/* Floating Glassmorphism Badge 1 */}
              <div className="absolute -left-12 sm:-left-16 lg:-left-16 top-10 sm:top-16 lg:top-1/4 z-20 bg-white/95 backdrop-blur-xl p-3 sm:p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-white flex items-center gap-3 lg:gap-5 animate-[bounce_4s_ease-in-out_infinite]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center shadow-inner">
                  <LucideStar className="w-5 h-5 lg:w-7 lg:h-7 fill-yellow-600 text-yellow-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase tracking-wider">Customer Rating</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900">4.9/5</p>
                </div>
              </div>

              {/* Floating Glassmorphism Badge 2 */}
              <div className="absolute -right-12 sm:-right-16 lg:-right-12 bottom-10 sm:bottom-16 lg:bottom-10 z-20 bg-white/95 backdrop-blur-xl p-3 sm:p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-white flex items-center gap-3 lg:gap-5 animate-[bounce_5s_ease-in-out_infinite_reverse]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-orange-100 to-rose-200 flex items-center justify-center shadow-inner">
                  <Clock className="w-5 h-5 lg:w-7 lg:h-7 text-rose-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase tracking-wider">Delivery</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900">On Time</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
      
      {/* SVG Wave Divider (Merges seamlessly into the next pure white section) */}
      <div className="absolute bottom-0 left-0 w-full leading-none z-30 transform rotate-180 translate-y-[1px]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" className="relative block w-full h-[40px] sm:h-[60px] md:h-[120px]" preserveAspectRatio="none">
          <g fill="#ffffff">
            <path d="M1000 0H0v52C62.5 28 125 4 250 4c250 0 250 96 500 96 125 0 187.5-24 250-48V0Z"></path>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default HeroSection;
