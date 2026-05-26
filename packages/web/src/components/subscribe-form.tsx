export function SubscribeForm() {
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sol-muted text-sm">
        Email subscriptions are paused. Follow updates via{' '}
        <a
          href="/feed.xml"
          className="text-sol-purple hover:underline"
        >
          RSS
        </a>{' '}
        or watch the{' '}
        <a
          href="https://github.com/RECTOR-LABS/solis"
          className="text-sol-purple hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repo
        </a>
        .
      </p>
    </div>
  );
}
