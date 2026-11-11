import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1b1c1e] font-sans selection:bg-[#d8bd96] selection:text-[#1b1c1e] flex flex-col justify-between">
      {/* Decorative ambient background accents */}
      <div className="fixed top-0 right-0 w-[550px] h-[550px] bg-[#e9ded0]/45 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40 -z-10" />
      <div className="fixed bottom-0 left-0 w-[650px] h-[650px] bg-[#f3ece3]/80 rounded-full blur-3xl pointer-events-none -ml-40 -mb-40 -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e7ded3] bg-[#fffdf9]/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Academy Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1b1c1e] text-[#faf7f2] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden p-1">
              <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1b1c1e] font-serif leading-none">
                  Dudex Smart Academy
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#f3ece3] text-[#9c7449] border border-[#e7ded3]">
                  Faculty Portal
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#8c857d] uppercase tracking-wider mt-0.5">
                Faculty Management & Assessment Platform
              </p>
            </div>
          </Link>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-20">
        
        {/* HERO SECTION */}
        <section className="relative text-center max-w-4xl mx-auto">
          
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fffdf9] border border-[#e7ded3] text-xs font-semibold text-[#554b42] shadow-xs mb-6">
            <Sparkles className="w-4 h-4 text-[#b08e67]" />
            <span>Intelligent Academic Operating System • Dudex Smart Academy</span>
          </div>

          {/* Main Headline */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1b1c1e] font-serif leading-[1.15]">
            Empowering Faculty with{' '}
            <span className="text-[#9c7449] underline decoration-[#ddc39e] decoration-2 underline-offset-8">
              Intelligent Tools
            </span>{' '}
            & Seamless Assessments.
          </h2>

          {/* Subtitle */}
          <p className="mt-6 text-sm sm:text-lg text-[#554b42] max-w-2xl mx-auto leading-relaxed">
            Welcome to Dudex Smart Academy Teacher Portal. Built specifically for faculty members to conduct adaptive MCQ tests, automate grading, monitor student attendance, and manage courses effortlessly.
          </p>

          {/* CTA Action Buttons */}
          <div className="mt-8 sm:mt-10 flex items-center justify-center">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#1b1c1e] text-[#faf7f2] hover:bg-[#242527] text-sm font-semibold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Sign In to Teacher Portal</span>
              <ArrowRight className="w-4 h-4 text-[#b08e67]" />
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e7ded3] bg-[#fffdf9] px-4 sm:px-8 py-5 text-center text-xs text-[#8c857d]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-serif font-bold text-[#1b1c1e]">
            <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-4 h-4 object-contain inline-block" />
            <span>Dudex Smart Academy</span>
          </div>
          <p>© {new Date().getFullYear()} Dudex Smart Academy. Faculty Management and Academic Assessment Platform.</p>
          <div className="flex items-center gap-4 text-[11px] text-[#8c857d]">
            <span>Faculty Security Policy</span>
            <span>•</span>
            <span>Academic Support</span>
            <span>•</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

