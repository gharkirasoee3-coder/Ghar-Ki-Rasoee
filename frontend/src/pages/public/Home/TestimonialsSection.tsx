import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar: string;
}

const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Swipe animation states
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await axios.get(`${ENV.API_URL}/testimonials`);
        if (res.data.success) {
          setTestimonials(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const nextTestimonial = () => {
    if (testimonials.length === 0) return;
    setDirection(1);
    setMobileIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    if (testimonials.length === 0) return;
    setDirection(-1);
    setMobileIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Framer Motion slide variants
  const slideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (_e: any, { offset, velocity }: any) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      nextTestimonial();
    } else if (swipe > swipeConfidenceThreshold) {
      prevTestimonial();
    }
  };

  if (loading) {
    return (
      <section className="py-20 text-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm font-semibold">Loading what our food family says...</p>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  // Ensure we have at least 3 testimonials to show on web
  // If not, repeat them or handle safely
  const webTestimonials = testimonials.slice(0, 3);
  const currentMobile = testimonials[mobileIndex];

  return (
    <section className="py-20 bg-gradient-to-b from-surface via-orange-50/15 to-white relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-[30%] left-[-10%] w-[35%] h-[50%] bg-amber-100/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-[-10%] w-[35%] h-[50%] bg-orange-100/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Happy Customers</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            What The Food Family Says
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-3 max-w-md mx-auto">
            Real stories from people who chose healthy, fresh, and delicious home-style meals.
          </p>
        </div>

        {/* WEB VIEW: 3 side-by-side cards */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          {webTestimonials.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-[2rem] border border-slate-100/80 p-8 shadow-lg shadow-slate-100/60 relative overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <Quote className="absolute right-6 top-6 text-slate-100/60 w-16 h-16 -rotate-6 pointer-events-none" />
              
              <div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < item.rating 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-slate-700 text-sm font-semibold leading-relaxed mb-6 italic">
                  "{item.text}"
                </p>
              </div>

              {/* User identity */}
              <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-auto">
                <img 
                  src={item.avatar} 
                  alt={item.name} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-100"
                />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">{item.name}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{item.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE VIEW: Single card, swipable using Framer Motion library */}
        <div className="block lg:hidden relative max-w-md mx-auto">
          <div className="relative overflow-hidden min-h-[340px] px-2 py-4">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={mobileIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={handleDragEnd}
                className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/80 relative overflow-hidden select-none cursor-grab active:cursor-grabbing w-full min-h-[300px] flex flex-col justify-between"
              >
                <Quote className="absolute right-6 top-6 text-slate-100/60 w-16 h-16 -rotate-6 pointer-events-none" />

                <div>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < currentMobile.rating 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-slate-700 text-sm font-semibold leading-relaxed mb-6 italic">
                    "{currentMobile.text}"
                  </p>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-auto">
                  <img 
                    src={currentMobile.avatar} 
                    alt={currentMobile.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-100"
                  />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{currentMobile.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{currentMobile.role}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Chevrons for phone tap navigation */}
          <button
            onClick={prevTestimonial}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-slate-100 shadow-md flex items-center justify-center text-slate-500 hover:text-primary transition z-20"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-slate-100 shadow-md flex items-center justify-center text-slate-500 hover:text-primary transition z-20"
            aria-label="Next testimonial"
          >
            <ChevronRight size={16} />
          </button>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > mobileIndex ? 1 : -1);
                  setMobileIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  mobileIndex === index 
                    ? 'w-6 bg-primary shadow-sm' 
                    : 'w-2 bg-slate-200'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-4">
            Swipe card left/right or tap dots to browse
          </p>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
