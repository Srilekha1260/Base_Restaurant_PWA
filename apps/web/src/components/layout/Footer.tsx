export default function Footer() {
  return (
    <footer className="bg-stone-950 border-t border-stone-800 py-12 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold text-xl mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Demo Restaurant
          </h3>
          <p className="text-stone-500 text-sm">
            Fine dining in the heart of Auckland.
            <br />All prices include GST.
          </p>
        </div>
        <div>
          <h4 className="text-stone-300 font-semibold mb-4">Hours</h4>
          <ul className="text-stone-500 text-sm space-y-1">
            <li>Mon–Thu: 5:00 PM – 10:00 PM</li>
            <li>Fri–Sat: 5:00 PM – 11:00 PM</li>
            <li>Sunday: 5:00 PM – 9:00 PM</li>
          </ul>
        </div>
        <div>
          <h4 className="text-stone-300 font-semibold mb-4">Contact</h4>
          <ul className="text-stone-500 text-sm space-y-1">
            <li>1 Queen St, Auckland CBD</li>
            <li>Auckland 1010, New Zealand</li>
            <li>+64 9 000 0000</li>
            <li>hello@demorestaurant.nz</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-stone-800 text-center text-stone-600 text-xs">
        © {new Date().getFullYear()} Demo Restaurant. All rights reserved.
      </div>
    </footer>
  )
}
