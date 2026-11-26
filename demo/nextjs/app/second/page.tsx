export default function SecondPage() {
  return (
    <>
      <h1>Second Page</h1>
      <p>
        The layout renders the sidebar, so it stays in place while Next.js swaps this page in. The sections you opened
        stay open, and the mark moves to this page's entry, without a reload.
      </p>
      <p>
        Reload, and the sections you left open are open again from the first paint. The sidebar sets{" "}
        <code>remember</code>, and the server render carries its script, which the browser runs as it reads the page.
      </p>
    </>
  );
}
