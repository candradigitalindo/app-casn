export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#070f1f] bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundImage: "url('/hero-login.webp')" }}
    >
      {/* Overlay tipis agar kartu login tetap kontras, peta tetap terang */}
      <div className="absolute inset-0 bg-[#070f1f]/15" />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
