"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardHome() {
  const params = useParams();
  const companyId = params.companyId as string;

  const views = [
    {
      title: "Dashboard & Analytics",
      description: "Configure upsells and view performance",
      href: `/dashboard/${companyId}/settings`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Offer Page Editor",
      description: "Customize your upsell and downsell pages",
      href: `/dashboard/${companyId}/editor`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      iconColor: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Store Preview",
      description: "See how your products look to users",
      href: `/dashboard/${companyId}/preview`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Billing Portal",
      description: "View your bill, payment history, and manage billing",
      href: `/dashboard/${companyId}/billing`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      iconColor: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Customer buys your product",
      description: "Any product you choose as a trigger",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      number: "2",
      title: "We send them an instant notification",
      description: "Push notification with your upsell offer",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      number: "3",
      title: "They upgrade with one tap",
      description: "Seamless checkout, instant revenue",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <DashboardNav companyId={companyId} />
      <div className="flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm font-medium">Add 20% to your monthly recurring revenue</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Stacker
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Post-purchase upsells for Whop
          </p>
        </div>

        {/* How It Works Section */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-purple-500/10 to-orange-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-center text-zinc-400 text-sm font-medium uppercase tracking-wider mb-8">
              How it works
            </h2>

            <div className="grid grid-cols-3 gap-6">
              {steps.map((step, index) => (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  {/* Step number badge */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold shadow-lg shadow-green-500/30">
                      {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="h-16 w-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 mt-2">
                    <span className="text-green-400">{step.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-semibold text-base mb-2 leading-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Arrow connector */}
                  {index < steps.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden md:block">
                      <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal View Cards */}
        <div className="space-y-3">
          {views.map((view) => (
            <Link
              key={view.href}
              href={view.href}
              className="group flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all hover:bg-zinc-900/80"
            >
              <div className={`flex-shrink-0 h-12 w-12 rounded-xl ${view.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <span className={view.iconColor}>{view.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-white font-semibold group-hover:text-green-400 transition-colors">
                  {view.title}
                </h2>
                <p className="text-zinc-500 text-sm">
                  {view.description}
                </p>
              </div>

              <div className="flex-shrink-0 text-zinc-600 group-hover:text-green-400 transition-colors">
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        </div>
      </div>
    </div>
  );
}
