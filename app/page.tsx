export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">TestApp</span>
          <nav className="flex gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-24 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tight mb-6">
              Welcome to TestApp
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A simple landing page for testing purposes. Built with Next.js and Tailwind CSS.
            </p>
            <div className="flex gap-4 justify-center">
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Get Started
              </button>
              <button className="border border-input px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Fast", desc: "Built for speed and performance" },
                { title: "Modern", desc: "Using the latest technologies" },
                { title: "Simple", desc: "Easy to use and customize" },
              ].map((feature) => (
                <div key={feature.title} className="bg-card p-6 rounded-xl border">
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="py-24 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-6">About</h2>
            <p className="text-muted-foreground text-lg">
              This is a test project created for development and experimentation purposes. 
              Feel free to modify and extend it as needed.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-24 px-4 bg-muted/50">
          <div className="container mx-auto max-w-md text-center">
            <h2 className="text-3xl font-bold mb-6">Contact</h2>
            <p className="text-muted-foreground mb-8">Have questions? Reach out!</p>
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Contact Us
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2026 TestApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
