import { PropsWithChildren } from "react";

interface AuthLayoutProps extends PropsWithChildren {
  title?: string;
  description?: string;
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="h-screen flex">
      {/* Left - Form */}
      <div className="w-full lg:w-[480px] xl:w-[520px] relative flex items-center justify-center overflow-hidden shrink-0">
        {/* Background - same as landing hero */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/60 to-white" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow effects */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-sm px-8 sm:px-12 space-y-5">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Legal</span>
            <span className="text-xs text-slate-500 mt-0.5">Sistema</span>
          </div>

          <div>
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {children}
        </div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="/images/login-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right-bottom"
        />
        {/* Light smoked glass */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Branding content */}
        <div className="absolute inset-0 flex flex-col items-center justify-between p-12">
          {/* Top - tagline */}
          <div className="text-center max-w-lg">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">
              Software de Gestión para Firmas de Abogados
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 drop-shadow-sm">
              La plataforma integral para gestionar tu firma, organizar casos, facturar electrónicamente y administrar tu despacho desde cualquier lugar.
            </p>
          </div>

          {/* Bottom - feature pills + copyright */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {['Gestión de Casos', 'Agenda Legal', 'Facturación DIAN', 'Expedientes', 'Contabilidad', 'Multi-Sede'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-1 text-xs font-medium text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Legal Sistema. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Left edge accent */}
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-400/20 to-transparent" />
      </div>
    </div>
  );
}
