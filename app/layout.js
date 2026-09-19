import "./globals.css";

export const metadata = {
  title: "NFL Pick'em",
  description: "NFL weekly pick'em pool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
