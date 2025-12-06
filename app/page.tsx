import Link from "next/link";

export default function Home() {
  const views = [
    {
      title: "Owner Dashboard",
      description: "Configure upsells and manage your storefront display settings",
      href: "/dashboard/demo-company",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "from-purple-500/20 to-blue-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "Intercept Modal",
      description: "Post-purchase upsell page with one-time offer",
      href: "/intercept",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
    },
    {
      title: "Storefront Grid",
      description: "Browse and purchase products in the shop experience",
      href: "/experience",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      color: "from-orange-500/20 to-pink-500/20",
      iconColor: "text-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm font-medium">UI Skeleton Ready</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Stacker
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Maximize revenue with intelligent post-purchase upsells for your Whop business
          </p>
        </div>

        {/* View Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {views.map((view) => (
            <Link
              key={view.href}
              href={view.href}
              className="group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-900/50"
            >
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${view.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <span className={view.iconColor}>{view.icon}</span>
              </div>
              <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-green-400 transition-colors">
                {view.title}
              </h2>
              <p className="text-zinc-400 text-sm">
                {view.description}
              </p>
              <div className="mt-4 flex items-center text-zinc-500 text-sm group-hover:text-green-400 transition-colors">
                <span>View</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-zinc-800">
          <p className="text-zinc-500 text-sm">
            Built with Next.js 14 + @whop/frosted-ui
          </p>
        </div>
      </div>
    </div>
  );
}
