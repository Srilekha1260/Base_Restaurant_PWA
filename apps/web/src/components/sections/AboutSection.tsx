export default function AboutSection() {
  return (
    <section id="about" className="py-24 px-6 bg-stone-950">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-red-400 text-sm uppercase tracking-widest mb-4">Our Story</p>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          A Passion for Food
        </h2>
        <p className="text-stone-400 text-lg leading-relaxed mb-6">
          Founded in the heart of Auckland, Demo Restaurant brings together the finest local ingredients
          with culinary traditions from around the world. Our team of passionate chefs crafts every dish
          with care, ensuring each visit is a memorable experience.
        </p>
        <p className="text-stone-400 text-lg leading-relaxed">
          From intimate dinners to special celebrations, we provide a warm and welcoming atmosphere
          that makes every guest feel at home.
        </p>
        <div className="grid grid-cols-3 gap-8 mt-16">
          {[
            { number: '10+', label: 'Years of Experience' },
            { number: '500+', label: 'Happy Guests Daily' },
            { number: '4.8★', label: 'Average Rating' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-4xl font-bold text-red-500 mb-2">{stat.number}</div>
              <div className="text-stone-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
