import Link from 'next/link'

const Navbar = () => {
  return (
    <div className='flex justify-center'>
    <nav className="fixed z-[9999] w-[70%] border border-white/15 top-5 backdrop-blur-md bg-black/30 px-4 py-3 rounded-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-[#ff0] text-2xl font-bold hover:text-yellow-400 transition-colors duration-200 glow">
          MusicBass
        </Link>
        
        <div className="flex gap-6">
          <Link href="/guitar" className="text-white/70 hover:text-white transition-colors duration-200">
            Guitar
          </Link>
          <Link href="/piano" className="text-white/70 hover:text-white transition-colors duration-200">
            Piano
          </Link>
        </div>
      </div>
    </nav>
    </div>
  )
}

export default Navbar
