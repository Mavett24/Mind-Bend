import Link from "next/link";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1 text-[16px] font-bold tracking-tight text-paper">
      mind_bend
      <span aria-hidden className="inline-block h-[1.05em] w-[0.55em] translate-y-[1px] animate-blink bg-ember" />
    </span>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-iron bg-void/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        <Link href="/" aria-label="Mind Bend home" className="rounded-sm">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-6 text-body text-fog">
          <Link href="/#games" className="transition-colors duration-[var(--dur-fast)] hover:text-paper">
            games
          </Link>
          <Link href="/#daily" className="transition-colors duration-[var(--dur-fast)] hover:text-paper">
            daily
          </Link>
        </nav>
      </div>
    </header>
  );
}
