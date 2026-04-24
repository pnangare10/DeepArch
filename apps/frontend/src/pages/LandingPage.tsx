import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  Users,
  Database,
  Server,
  Shield,
  Radio,
  ChevronRight,
  Check,
  Lock,
  Download,
  ArrowRight,
  GitBranch,
  LayoutGrid,
} from 'lucide-react';

// ─── Canvas mock data ─────────────────────────────────────────────────────────
type Col = 'purple' | 'blue' | 'green' | 'orange';

const COL_MAP: Record<Col, { border: string; bg: string; icon: string; dot: string }> = {
  purple: { border: 'border-purple-500/60', bg: 'bg-purple-950/50', icon: 'text-purple-400', dot: 'bg-purple-400' },
  blue:   { border: 'border-blue-500/60',   bg: 'bg-blue-950/50',   icon: 'text-blue-400',   dot: 'bg-blue-400'   },
  green:  { border: 'border-green-500/60',  bg: 'bg-green-950/50',  icon: 'text-green-400',  dot: 'bg-green-400'  },
  orange: { border: 'border-orange-500/60', bg: 'bg-orange-950/50', icon: 'text-orange-400', dot: 'bg-orange-400' },
};

const CANVAS_NODES = [
  { id: 'gw',  label: 'API Gateway',     Icon: Shield,   col: 'purple' as Col, lx: 14, ly: 44, hasKids: false },
  { id: 'ord', label: 'Order Service',   Icon: Server,   col: 'blue'   as Col, lx: 38, ly: 17, hasKids: true  },
  { id: 'pay', label: 'Payment Service', Icon: Server,   col: 'blue'   as Col, lx: 62, ly: 44, hasKids: false },
  { id: 'usr', label: 'User Service',    Icon: Server,   col: 'blue'   as Col, lx: 83, ly: 17, hasKids: true  },
  { id: 'odb', label: 'Orders DB',       Icon: Database, col: 'green'  as Col, lx: 38, ly: 75, hasKids: false },
  { id: 'evq', label: 'Event Queue',     Icon: Radio,    col: 'orange' as Col, lx: 62, ly: 75, hasKids: false },
];

// [fx, fy, tx, ty] as percentages
const CANVAS_EDGES = [
  [14, 44, 38, 17],
  [14, 44, 62, 44],
  [14, 44, 83, 17],
  [38, 17, 38, 75],
  [38, 17, 62, 75],
  [62, 44, 62, 75],
];

// ─── AI demo data ─────────────────────────────────────────────────────────────
const AI_PROMPT = 'Microservices e-commerce platform with API gateway, order and payment services';
const AI_OUTPUT: { text: string; cls: string }[] = [
  { text: '✓  node: API Gateway (gateway)',          cls: 'text-green-400' },
  { text: '✓  node: Order Service (service)',        cls: 'text-green-400' },
  { text: '✓  node: Payment Service (service)',      cls: 'text-green-400' },
  { text: '✓  node: Orders DB (database)',           cls: 'text-green-400' },
  { text: '✓  edge: API Gateway → Order Service',   cls: 'text-green-400' },
  { text: '✓  edge: Order Service → Orders DB',     cls: 'text-green-400' },
  { text: '✦  Generated — 6 nodes · 5 edges · 2 layers', cls: 'text-blue-400 font-semibold' },
];

// ─── MockCanvas ───────────────────────────────────────────────────────────────
function MockCanvas() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl shadow-blue-950/40">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex items-center gap-1.5 ml-2 text-xs text-gray-500">
          <Layers className="w-3 h-3 text-blue-400" />
          <span className="text-gray-400 font-medium">DeepArch</span>
          <ChevronRight className="w-3 h-3" />
          <span>E-Commerce Platform</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-medium">Services</span>
        </div>
      </div>

      {/* Canvas with dot grid */}
      <div
        className="relative h-72 bg-gray-950"
        style={{
          backgroundImage: 'radial-gradient(circle, #1f2937 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* SVG edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {CANVAS_EDGES.map(([fx, fy, tx, ty], i) => (
            <line
              key={i}
              x1={`${fx}%`} y1={`${fy}%`}
              x2={`${tx}%`} y2={`${ty}%`}
              stroke="#374151"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          ))}
        </svg>

        {/* Nodes */}
        {CANVAS_NODES.map(({ id, label, Icon, col, lx, ly, hasKids }) => {
          const c = COL_MAP[col];
          return (
            <div
              key={id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[128px] border
                          ${c.border} ${c.bg} rounded-lg px-2.5 py-2 select-none`}
              style={{ left: `${lx}%`, top: `${ly}%` }}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${c.icon} shrink-0`} />
                <span className="text-[11px] font-medium text-gray-200 truncate">{label}</span>
              </div>
              {hasKids && (
                <div className="mt-1 flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  <span className="text-[9px] text-gray-500">drill in →</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Keyboard hint */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">⌘ click</span>
          <span>to drill in</span>
        </div>
      </div>
    </div>
  );
}

// ─── AIDemo (animated generation) ────────────────────────────────────────────
function AIDemo() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  // phases: 0=idle, 1=prompt, 2=generating, 3=output
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function runCycle() {
      if (cancelled) return;
      setPhaseIdx(0);
      setVisibleLines(0);

      const timers: ReturnType<typeof setTimeout>[] = [];

      timers.push(setTimeout(() => { if (!cancelled) setPhaseIdx(1); }, 800));
      timers.push(setTimeout(() => { if (!cancelled) setPhaseIdx(2); }, 2200));
      timers.push(setTimeout(() => { if (!cancelled) setPhaseIdx(3); }, 3400));

      AI_OUTPUT.forEach((_, i) => {
        timers.push(
          setTimeout(() => { if (!cancelled) setVisibleLines(i + 1); }, 3600 + i * 320)
        );
      });

      const loopDelay = 3600 + AI_OUTPUT.length * 320 + 3800;
      timers.push(setTimeout(() => { if (!cancelled) runCycle(); }, loopDelay));

      return timers;
    }

    const allTimers = runCycle();
    return () => {
      cancelled = true;
      allTimers?.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-gray-300">AI Generation</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-500">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            phaseIdx >= 1 && phaseIdx <= 3 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
          }`} />
          {phaseIdx === 0 ? 'Ready' : phaseIdx === 2 ? 'Analyzing…' : phaseIdx === 3 ? 'Streaming' : 'Active'}
        </div>
      </div>

      <div className="p-4 font-mono text-xs min-h-[210px] bg-gray-950/80 space-y-1.5">
        <div className="text-gray-600 mb-3">$ deeparch generate --provider claude</div>

        <div className="flex items-start gap-2">
          <span className="text-blue-400 mt-0.5">›</span>
          <span className={`text-gray-300 transition-opacity duration-500 ${phaseIdx >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            {AI_PROMPT}
          </span>
        </div>

        {phaseIdx === 2 && (
          <div className="pl-4 text-gray-500 animate-pulse">Analyzing system description…</div>
        )}

        {phaseIdx >= 3 && AI_OUTPUT.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`pl-4 ${line.cls}`}>{line.text}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">DeepArch</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare</a>
            <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              Get Started Free →
            </Link>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <div className="w-4 h-3 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-950 px-6 py-4 flex flex-col gap-4 text-sm text-gray-400">
            <a href="#features"    onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">How It Works</a>
            <a href="#compare"     onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Compare</a>
            <a href="#use-cases"   onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Use Cases</a>
            <Link to="/login"      onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Sign In</Link>
          </div>
        )}
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="pt-32 pb-20 px-6 relative">
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
            }}
          />

          <div className="max-w-6xl mx-auto relative">
            <div className="max-w-2xl mb-14">
              <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 mb-6">
                <Sparkles className="w-3 h-3" />
                Architecture Visualization Platform
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-white mb-5">
                Navigate Your Architecture.
                <br />
                <span className="text-blue-400">Layer by Layer.</span>
              </h1>

              <p className="text-gray-400 text-xl leading-relaxed mb-4">
                DeepArch lets you build hierarchical system diagrams you can actually drill into — from
                cloud topology down to individual service internals.
              </p>
              <p className="text-base text-gray-500 mb-8">
                AI gives you a working skeleton in 2 minutes. You refine from there.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Start Mapping Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  See How It Works
                </a>
              </div>

              <p className="text-sm text-gray-600">
                Free to start · No credit card required · Works with Claude, GPT-4, or local Ollama
              </p>
            </div>

            {/* Canvas mock */}
            <MockCanvas />
          </div>
        </section>

        {/* ── Trust bar ── */}
        <section className="border-y border-gray-800/60 bg-gray-900/30 py-5 px-6">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-500">Built for teams who architect complex systems</p>
            <div className="flex flex-wrap gap-2">
              {['Solution Architects', 'Platform Engineers', 'Technical Consultants', 'Staff Engineers'].map(r => (
                <span
                  key={r}
                  className="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-400"
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              Role-based access control — clients see only what you share
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-4xl font-bold text-white mb-3">
                Everything you need to document complex systems
              </h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto">
                Built around the way architects actually think — top-down, layered, collaborative.
              </p>
            </div>

            {/* Primary feature cards */}
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[
                {
                  icon: <Layers className="w-6 h-6 text-blue-400" />,
                  title: 'Infinite Depth',
                  badge: 'Core',
                  body: 'Drill into any component to reveal its internals. Navigate back up with a click. Every subsystem lives in its own canvas — no flat diagram will capture your system\'s true complexity.',
                },
                {
                  icon: <Sparkles className="w-6 h-6 text-purple-400" />,
                  title: 'AI-Powered Generation',
                  badge: 'Claude · GPT-4 · Ollama',
                  body: 'Describe your system in plain English and DeepArch generates a structured diagram with nodes, edges, and auto-layout. AI gives you the skeleton — you make it accurate.',
                },
                {
                  icon: <Users className="w-6 h-6 text-green-400" />,
                  title: 'Real-Time Collaboration',
                  badge: 'Live cursors · Comments · RBAC',
                  body: 'See teammates\' cursors live. Comment on individual nodes. Share read-only views with stakeholders. Control which layers each role can drill into.',
                },
              ].map(({ icon, title, badge, body }) => (
                <div
                  key={title}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-colors"
                >
                  <div className="mb-4">{icon}</div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <span className="text-xs text-gray-500 shrink-0 mt-0.5">{badge}</span>
                  </div>
                  <p className="text-base text-gray-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            {/* Secondary feature pills */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <LayoutGrid className="w-4 h-4 text-cyan-400" />,
                  title: 'Extensible Node Types',
                  body: 'Service, database, queue, gateway, load-balancer, frontend, environment, infrastructure — and custom types for your domain.',
                },
                {
                  icon: <GitBranch className="w-4 h-4 text-amber-400" />,
                  title: 'Smart Auto-Layout',
                  body: 'Cross-layer edges route cleanly. Same-layer edges use vertical flow. No manual position wrestling after AI generation.',
                },
                {
                  icon: <Download className="w-4 h-4 text-pink-400" />,
                  title: 'Export & Import',
                  body: 'Full JSON export for backup, version control, or sharing across teams. Import to spin up a project in seconds.',
                },
              ].map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex gap-3"
                >
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-1">{title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-24 px-6 bg-gray-900/30 border-y border-gray-800/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-4xl font-bold text-white mb-3">How it works</h2>
              <p className="text-lg text-gray-400">From blank canvas to multi-layer architecture in minutes.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  step: '01',
                  title: 'Start at the top',
                  body: 'Create a project and drop your high-level components — services, gateways, environments. Think of it as your first whiteboard sketch, but persistent.',
                  hint: '+ drag to connect',
                },
                {
                  step: '02',
                  title: 'Drill into any component',
                  body: 'Double-click a node to enter its internal architecture. Build as many layers deep as your system demands. A breadcrumb keeps you oriented.',
                  hint: '⌘ click or double-click',
                },
                {
                  step: '03',
                  title: 'Let AI accelerate',
                  body: 'Describe a subsystem and hit Generate. The AI creates nodes, edges, and layout. You refine positions, add missing links, and annotate metadata.',
                  hint: '⌘ K to open generation',
                },
              ].map(({ step, title, body, hint }) => (
                <div key={step} className="relative">
                  <div className="text-6xl font-bold text-gray-800 mb-4 select-none">{step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                  <p className="text-base text-gray-400 leading-relaxed mb-3">{body}</p>
                  <div className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-800 rounded px-2 py-1">
                    <span className="text-gray-500">{hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI Demo ── */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 mb-6">
                <Sparkles className="w-3 h-3" />
                AI Generation
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Describe it. <br />Watch it appear.
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-5">
                Type a plain-English description of your system. DeepArch generates structured nodes,
                edges, and a smart layout — powered by Claude, GPT-4, or a local Ollama instance for
                air-gapped environments.
              </p>
              <ul className="space-y-2.5 text-base text-gray-400">
                {[
                  'Works with Claude, GPT-4, or local Ollama — no lock-in',
                  'Auto-layout runs after generation — no manual positioning',
                  'AI gives you 70% of the diagram; you make it accurate',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <AIDemo />
          </div>
        </section>

        {/* ── Comparison ── */}
        <section id="compare" className="py-24 px-6 bg-gray-900/30 border-y border-gray-800/40">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-3">Why not just use Lucidchart?</h2>
              <p className="text-gray-400 text-base">
                Flat diagrams don't scale. DeepArch is built for systems that have depth.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 pr-6 text-gray-500 font-medium w-48">Feature</th>
                    <th className="py-3 px-4 text-blue-400 font-semibold text-center">DeepArch</th>
                    <th className="py-3 px-4 text-gray-500 font-medium text-center">Lucidchart</th>
                    <th className="py-3 px-4 text-gray-500 font-medium text-center">Structurizr</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Hierarchical drill-down',    true,     false,    false  ],
                    ['AI diagram generation',       true,     'Limited',false  ],
                    ['Local / air-gapped AI (Ollama)', true,  false,    false  ],
                    ['Real-time collaboration',     true,     true,     false  ],
                    ['Node-level access control',   true,     true,     true   ],
                    ['Code / DSL-native',           false,    false,    true   ],
                    ['Free tier',                   true,     'Limited',true   ],
                    ['Smart auto-layout',           true,     'Manual', 'Limited'],
                  ].map(([feature, da, lc, st]) => (
                    <tr key={String(feature)} className="border-b border-gray-800/50">
                      <td className="py-3 pr-6 text-gray-300">{feature}</td>
                      <td className="py-3 px-4 text-center">
                        {da === true  ? <Check className="w-4 h-4 text-green-400 mx-auto" />
                         : da === false ? <span className="text-gray-700">—</span>
                         : <span className="text-yellow-600 text-xs">{da}</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {lc === true  ? <Check className="w-4 h-4 text-gray-500 mx-auto" />
                         : lc === false ? <span className="text-gray-700">—</span>
                         : <span className="text-gray-600 text-xs">{lc}</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {st === true  ? <Check className="w-4 h-4 text-gray-500 mx-auto" />
                         : st === false ? <span className="text-gray-700">—</span>
                         : <span className="text-gray-600 text-xs">{st}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Persona cards ── */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-4xl font-bold text-white mb-3">Built for your role</h2>
              <p className="text-lg text-gray-400">Different jobs, same problem: documentation that doesn't survive contact with reality.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  role: 'Solution Architects',
                  pain: 'Stop exporting to PowerPoint.',
                  body: 'Design end-to-end blueprints across cloud, on-prem, and hybrid. Drill into every subsystem without losing context. Share a link — not a stale PDF — with stakeholders.',
                  actions: [
                    'Present live diagrams in meetings',
                    'Lock layers so devs can\'t break your high-level view',
                    'Export to JSON for version control',
                  ],
                },
                {
                  role: 'Technical Consultants',
                  pain: 'Document client work without leaking it.',
                  body: 'Generate a skeleton diagram from a 10-minute client conversation. Share read-only views for sign-off. RBAC ensures each stakeholder sees only their layer.',
                  actions: [
                    'Generate from meeting notes',
                    'Share read-only links per client',
                    'Export for deliverables and audits',
                  ],
                },
                {
                  role: 'Individual Developers',
                  pain: 'Onboard a new teammate in 5 minutes, not 2 weeks.',
                  body: 'Map your microservices before you build them. Paste a system description and let AI bootstrap the diagram. Keep it updated as the system grows.',
                  actions: [
                    'AI bootstrap from a one-liner',
                    'Drill from API contract to DB schema',
                    'Free tier — no team required',
                  ],
                },
              ].map(({ role, pain, body, actions }) => (
                <div
                  key={role}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-colors flex flex-col"
                >
                  <h3 className="text-lg font-semibold text-white mb-1">{role}</h3>
                  <p className="text-sm font-medium text-blue-400 mb-3">{pain}</p>
                  <p className="text-base text-gray-400 leading-relaxed mb-5">{body}</p>
                  <ul className="space-y-2 mt-auto">
                    {actions.map(a => (
                      <li key={a} className="flex items-start gap-2 text-sm text-gray-500">
                        <Check className="w-3.5 h-3.5 text-blue-400/60 mt-0.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section id="use-cases" className="py-24 px-6 bg-gray-900/30 border-y border-gray-800/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-3">Common use cases</h2>
              <p className="text-gray-400 text-base">Real problems architects bring to DeepArch.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  title: 'Modernize a legacy monolith',
                  body: 'Map the existing monolith at the top level. Drill into each bounded context. Design the target microservices architecture layer by layer. Track the migration side-by-side.',
                },
                {
                  title: 'Accelerate new-hire onboarding',
                  body: 'Generate a full system map with AI. Annotate each node with ownership, runbooks, and relevant links. New engineers navigate at their own pace — no 2-hour architecture walkthrough required.',
                },
                {
                  title: 'Produce compliance documentation',
                  body: 'Diagram system boundaries, data flows, and trust zones for SOC 2, ISO 27001, or GDPR. Assign access control per layer so auditors see exactly what they\'re scoped to.',
                },
              ].map(({ title, body }) => (
                <div
                  key={title}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6"
                >
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="py-28 px-6 text-center relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(59,130,246,0.07) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Ship documentation that actually reflects your system.
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Free to start. No credit card required. Works on the browser you already have.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-lg font-medium transition-colors text-sm"
            >
              Start Mapping Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-base text-gray-500">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-gray-300">DeepArch</span>
            <span className="text-gray-700">·</span>
            <span>Google Maps for Software Architecture</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            <span className="text-gray-700">© 2026 DeepArch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
