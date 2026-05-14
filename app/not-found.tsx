import Link from "next/link";
export default function NotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-paper text-plum p-6">
        <div className="text-center">
          <h1 className="font-display text-5xl italic">Off the menu.</h1>
          <p className="mt-4">That page isn’t here.</p>
          <Link href="/" className="mt-6 inline-block smallcaps text-xs text-rose underline">
            Back to the kitchen
          </Link>
        </div>
      </body>
    </html>
  );
}
