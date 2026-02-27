import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-4xl font-bold tracking-tight">AgendaLink</h1>
        </div>

        <h2 className="text-5xl font-extrabold mb-6 leading-tight">
          Générez des liens d'invitation <span className="text-blue-500">intelligents</span>.
        </h2>

        <p className="text-xl text-gray-400 mb-10 leading-relaxed">
          Synchronisez vos rendez-vous directement avec Google Agenda et gérez vos disponibilités en toute simplicité.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin"
            className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all text-lg"
          >
            Accéder à l'Admin
          </Link>
          <a
            href="#features"
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-lg"
          >
            En savoir plus
          </a>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="p-8 bg-[#111] border border-white/10 rounded-2xl">
          <h3 className="text-xl font-bold mb-3">OAuth Google</h3>
          <p className="text-gray-500">Connexion sécurisée et accès direct à vos agendas.</p>
        </div>
        <div className="p-8 bg-[#111] border border-white/10 rounded-2xl">
          <h3 className="text-xl font-bold mb-3">Liens Uniques</h3>
          <p className="text-gray-500">Partagez des liens personnalisés pour vos réunions.</p>
        </div>
        <div className="p-8 bg-[#111] border border-white/10 rounded-2xl">
          <h3 className="text-xl font-bold mb-3">Google Meet</h3>
          <p className="text-gray-500">Génération automatique de liens visioconférence.</p>
        </div>
      </div>

      <footer className="mt-20 text-gray-600 text-sm font-medium">
        AgendaLink &copy; 2026
      </footer>
    </div>
  );
}
