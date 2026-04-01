import { Head } from '@inertiajs/react';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ModulesSection } from '@/components/landing/modules-section';
import { StatsSection } from '@/components/landing/stats-section';
import { AdvantagesSection } from '@/components/landing/advantages-section';
import { ClientsCarousel } from '@/components/landing/clients-carousel';
import { ForWhoSection } from '@/components/landing/for-who-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { FaqSection } from '@/components/landing/faq-section';
import { ContactSection } from '@/components/landing/contact-section';
import { CtaSection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';
import { WhatsAppBubble } from '@/components/landing/whatsapp-bubble';

export default function Welcome() {
    return (
        <>
            <Head title="Legal Sistema - Software de Gestión para Firmas de Abogados en Colombia" />

            <div className="min-h-screen bg-white text-slate-900">
                <LandingNavbar />
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <ModulesSection />
                <StatsSection />
                <AdvantagesSection />
                <ClientsCarousel />
                <ForWhoSection />
                <TestimonialsSection />
                <PricingSection />
                <FaqSection />
                <ContactSection />
                <CtaSection />
                <LandingFooter />
                <WhatsAppBubble />
            </div>
        </>
    );
}
