import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Prevent mobile browsers from keeping or restoring scroll positions mid-page on SPA navigations
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If a hash target exists (e.g., #section-1), scroll to it if element exists
    if (hash) {
      try {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } catch {
        // Fall through to top scroll if invalid selector
      }
    }

    // Immediately reset scroll position to top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });

    // Ensure documentElement and body scroll positions are reset across mobile browsers
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
